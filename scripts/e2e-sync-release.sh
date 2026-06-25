#!/usr/bin/env bash
# Fully automated, no-human E2E for internet-aware location syncing, driven against
# a RELEASE build on the LOCAL Android emulator. A release APK embeds the JS bundle
# and ignores Metro, so it runs fully OFFLINE (a debug/dev build cannot — it needs
# Metro to fetch the bundle, which is impossible in airplane mode). State for the
# stale/purge phases is set by editing the app's AsyncStorage SQLite DB directly
# (needs `adb root`), since the dev-only sgdv://age-sync deep link is stripped in
# release (__DEV__ === false).
#
#   PHASE 1 (first install, offline) pm clear + airplane ON + launch ->
#            assert the first-run "Turn on internet" prompt shows and the app
#            still renders (no crash offline).
#   PHASE 2 (offline -> online)       airplane OFF (app still running) -> after the
#            debounce, assert the last-sync timestamp gets written (DB), the app
#            reschedules alarms (logcat), and the prompt clears.
#   PHASE 3 (data stale > 1 week)     backdate last-sync by 8d + relaunch offline ->
#            assert the stale-week banner ("over a week old") shows.
#   PHASE 4 (cache purge > 3 days)    backdate cache timestamp by 4d + relaunch
#            offline -> assert the >3-day cache is purged (logcat) + DB cleared.
#
# Exit 0 iff every assertion passes. Artifacts + screenshots in /tmp/sgdv-sync-test.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/android-env.sh"

# --- Pin to the emulator (NOT a physical device), per the test requirement. ---
SERIAL="${ANDROID_SERIAL:-emulator-5560}"
export ANDROID_SERIAL="$SERIAL"
adb() { command adb -s "$SERIAL" "$@"; }

PKG="$SGDV_APP_ID"
DB="/data/data/$PKG/databases/RKStorage"
LAST_SYNC_KEY="@sgvd_location_last_sync"
CACHE_TS_KEY="@sgvd_location_timestamp"
TMP="$(mktemp -d)"
ART=/tmp/sgdv-sync-test
FAILED=0
mkdir -p "$ART"

now_s="$(date +%s)"
days_ago_ms() { echo "$(( now_s - ($1 * 86400) ))000"; }   # epoch-ms, N days in the past

pass() { echo "  ✅ PASS: $1"; }
fail() { echo "  ❌ FAIL: $1"; FAILED=1; }

airplane_on()  { adb shell cmd connectivity airplane-mode enable  >/dev/null 2>&1; adb shell svc wifi disable >/dev/null 2>&1; adb shell svc data disable >/dev/null 2>&1; }
airplane_off() { adb shell cmd connectivity airplane-mode disable >/dev/null 2>&1; adb shell svc wifi enable  >/dev/null 2>&1; adb shell svc data enable  >/dev/null 2>&1; }

grant_perms() {
  adb shell pm grant "$PKG" android.permission.ACCESS_FINE_LOCATION   >/dev/null 2>&1 || true
  adb shell pm grant "$PKG" android.permission.ACCESS_COARSE_LOCATION >/dev/null 2>&1 || true
  adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS     >/dev/null 2>&1 || true
}

launch_app() {
  adb shell am force-stop "$PKG"
  adb logcat -c >/dev/null 2>&1 || true
  # `monkey -c LAUNCHER` returns -5 for this app; launch the activity explicitly.
  adb shell am start -n "$PKG/.MainActivity" >/dev/null 2>&1
  local i
  for i in $(seq 1 45); do adb shell pidof "$PKG" >/dev/null 2>&1 && break; sleep 1; done
}

# Wait for startup (re)scheduling / location load to settle.
wait_settle() {
  local i
  for i in $(seq 1 30); do
    adb logcat -d 2>/dev/null | grep -qiE "Alarms scheduled successfully|No alarms or notifications enabled|Target location loaded|Refreshing scheduled alarms" && break
    sleep 2
  done
  sleep 5
}

# Read one AsyncStorage value (empty string if absent).
kv_get() { adb shell "sqlite3 $DB \"select value from catalystLocalStorage where key='$1';\"" 2>/dev/null | tr -d '\r'; }
kv_has() { local n; n="$(adb shell "sqlite3 $DB \"select count(*) from catalystLocalStorage where key='$1';\"" 2>/dev/null | tr -d '\r')"; [[ "$n" == "1" ]]; }

# Force-stop the app, then upsert one AsyncStorage value (INSERT OR REPLACE so it
# works whether the key exists yet), fixing ownership so the app can reopen the
# DB cleanly on next launch.
kv_set() {
  local key="$1" val="$2"
  adb shell am force-stop "$PKG"
  local owner; owner="$(adb shell stat -c '%U' "$DB" 2>/dev/null | tr -d '\r')"
  adb shell "sqlite3 $DB \"INSERT OR REPLACE INTO catalystLocalStorage(key,value) VALUES('$key','$val');\"" >/dev/null 2>&1
  adb shell "rm -f $DB-journal $DB-wal $DB-shm" >/dev/null 2>&1 || true
  [[ -n "$owner" ]] && adb shell "chown $owner:$owner $DB" >/dev/null 2>&1 || true
}

dump_ui() {
  local i
  for i in 1 2 3 4 5; do
    if adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1; then
      adb pull /sdcard/_ui.xml "$TMP/ui.xml" >/dev/null 2>&1 && return 0
    fi
    sleep 1
  done
  : > "$TMP/ui.xml"
}
ui_has() { dump_ui; grep -qiF "$1" "$TMP/ui.xml"; }
shot() { adb shell screencap -p /sdcard/_s.png >/dev/null 2>&1 && adb pull /sdcard/_s.png "$ART/$1" >/dev/null 2>&1 || true; }

echo "=== SGDV location-sync E2E (release build) on $SERIAL ==="
adb get-state >/dev/null 2>&1 || { echo "Emulator $SERIAL not available"; exit 2; }
adb root >/dev/null 2>&1 || true   # needed to read/write the app's private SQLite DB
sleep 2

# ---------------------------------------------------------------------------
echo "--- PHASE 1: first install, offline -> first-run prompt ---"
adb shell pm clear "$PKG" >/dev/null 2>&1
grant_perms          # pm clear revokes grants; re-grant so dialogs don't block the UI
airplane_on
sleep 2
launch_app
wait_settle
shot phase1.png
if ui_has "Turn on internet"; then pass "first-run 'turn on internet' prompt shown offline"; else fail "first-run prompt NOT shown"; fi
if adb shell pidof "$PKG" >/dev/null 2>&1; then pass "app running offline (no crash)"; else fail "app not running offline"; fi

# ---------------------------------------------------------------------------
echo "--- PHASE 2: offline -> online auto-sync + alarm reschedule ---"
adb logcat -c >/dev/null 2>&1 || true
airplane_off
# Wait out CONNECTIVITY_DEBOUNCE_MS (3s) + network attach + fetch + reschedule.
sleep 18
shot phase2.png
if kv_has "$LAST_SYNC_KEY"; then pass "last-sync timestamp written after coming online (DB)"; else fail "last-sync NOT written after coming online"; fi
if adb logcat -d 2>/dev/null | grep -qiE "Connectivity restored|STEP 1 SUCCESS"; then
  pass "re-synced location after connectivity returned (logcat)"; else fail "no re-sync after connectivity returned"; fi
if adb logcat -d 2>/dev/null | grep -qiE "Refreshing scheduled alarms|Alarms scheduled successfully"; then
  pass "alarms rescheduled after sync (logcat)"; else fail "alarms not rescheduled after sync"; fi
if ui_has "over a week old" || ui_has "Turn on internet"; then fail "prompt still visible after coming online"; else pass "prompt cleared after coming online"; fi

# ---------------------------------------------------------------------------
echo "--- PHASE 3: data stale > 1 week -> stale banner ---"
# A week-stale user is a RETURNING user past onboarding; mark the walkthrough seen
# so its (modal) overlay doesn't cover the main screen where the banner renders.
kv_set "hasSeenWalkthrough_v2" "true"   # WALKTHROUGH_STORAGE_KEY in constants.ts
kv_set "$LAST_SYNC_KEY" "$(days_ago_ms 8)"   # backdate last successful sync to 8 days ago
airplane_on
sleep 2
launch_app
wait_settle
shot phase3.png
if ui_has "over a week old"; then pass "stale-week banner shown after backdating last-sync 8 days"; else fail "stale-week banner NOT shown"; fi

# ---------------------------------------------------------------------------
echo "--- PHASE 4: cache older than 3 days -> purge ---"
kv_set "$CACHE_TS_KEY" "$(days_ago_ms 4)"    # backdate the cache write time to 4 days ago
airplane_on
sleep 2
adb logcat -c >/dev/null 2>&1 || true
launch_app
wait_settle
shot phase4.png
if adb logcat -d 2>/dev/null | grep -qiE "older than max age|purg(e|ed|ing) location cache"; then
  pass "purged location cache older than 3 days (logcat)"; else fail "stale (>3d) cache not purged"; fi
if kv_has "$CACHE_TS_KEY"; then fail "cache timestamp still present after purge"; else pass "cache timestamp removed after purge (DB)"; fi

# ---------------------------------------------------------------------------
echo "--- Cleanup ---"
airplane_off
adb shell am force-stop "$PKG" >/dev/null 2>&1 || true

echo "=== Artifacts in $ART ==="
[[ "$FAILED" == "0" ]] && echo "ALL PASSED" || echo "SOME FAILED"
exit "$FAILED"
