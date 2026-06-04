#!/usr/bin/env bash
# Phase 4: deeper alarm behavior the 3-phase harness doesn't cover —
#   4a custom-sound routing   -> notifee-alarm-custom-v1 + raw/custom_alert
#   4b default-sound routing  -> notifee-alarm-default-v1 (system sound)
#   4c Snooze action          -> reschedules a "Snoozed Alarm" using config
#   4d Stop action            -> tears down the foreground service
#   4e timeout auto-stop      -> FGS stops itself after alarmTimeoutMs
#
# Drives the dev build with adb + dumpsys (no extra deps). Assumes the emulator
# is up, the app is installed, and Metro is running on :8081 (same preconditions
# as e2e-alarm-test.sh).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/android-env.sh"

PKG="$SGDV_APP_ID"
DEV_URL="sgdv://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
TMP="$(mktemp -d)"
ART=/tmp/sgdv-alarm-test
FAILED=0
mkdir -p "$ART"

pass() { echo "  ✅ PASS: $1"; }
fail() { echo "  ❌ FAIL: $1"; FAILED=1; }

deeplink() { adb shell am start -a android.intent.action.VIEW -d "$1" "$PKG" >/dev/null 2>&1; }
# Single-quote the URL so the device shell keeps the &-separated query together.
deeplink_q() { adb shell "am start -a android.intent.action.VIEW -d '$1' $PKG" >/dev/null 2>&1; }

launch_app() {
  adb shell am force-stop "$PKG"
  adb logcat -c || true
  deeplink "$DEV_URL"
  local i
  for i in $(seq 1 45); do adb shell pidof "$PKG" >/dev/null 2>&1 && break; sleep 1; done
}

wait_settle() {
  local i
  for i in $(seq 1 30); do
    adb logcat -d 2>/dev/null | grep -qiE "Alarms scheduled successfully|No alarms or notifications enabled|Notifications ready" && break
    sleep 2
  done
  sleep 8
}

# Schedule a notifee alarm via deep link, retrying if the app's startup
# reschedule wipes it. $1=seconds out, $2=sound (custom|default)
schedule_alarm_stable() {
  local secs="$1" sound="$2" attempt
  for attempt in 1 2 3 4 5; do
    adb logcat -c
    deeplink_q "sgdv://schedule-test?secs=${secs}&sound=${sound}"
    sleep 6
    if adb logcat -d 2>/dev/null | grep -qiE "All alarms cancelled|All notifee alarms cancelled"; then
      echo "    (attempt $attempt: wiped by app reschedule, retrying)"; sleep 4
    else
      return 0
    fi
  done
  return 1
}

wait_posted() {
  local title="$1" secs="${2:-44}" i
  for i in $(seq 1 $((secs/2))); do
    adb shell dumpsys notification --noredact 2>/dev/null | grep -q "$title" && return 0
    sleep 2
  done
  return 1
}

fgs_up()   { adb shell dumpsys activity services "$PKG" 2>/dev/null | grep -qiE "app.notifee.core.ForegroundService"; }

# Expand the shade and tap a notification action button by its visible text.
tap_action() {
  local label="$1"
  adb shell cmd statusbar expand-notifications >/dev/null 2>&1; sleep 2
  adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/_ui.xml "$TMP/ui.xml" >/dev/null 2>&1 || true
  local c; c=$(python3 "$HERE/_uia_center.py" "$TMP/ui.xml" "$label" 2>/dev/null)
  if [ -n "$c" ]; then adb shell input tap $c; return 0; fi
  return 1
}

setcfg() {  # $1 = JSON value for alarmConfig
  # Pipe the SQL via stdin from a file: putting the JSON (which contains
  # double-quotes) on the adb-shell command line gets the quotes stripped by the
  # nested zsh->adb->device-sh re-parsing, corrupting the JSON so JSON.parse
  # throws and the app silently falls back to defaults. stdin avoids all of that.
  printf "INSERT OR REPLACE INTO catalystLocalStorage (key,value) VALUES ('alarmConfig','%s');\n" "$1" > "$TMP/cfg.sql"
  cat "$TMP/cfg.sql" | adb shell run-as "$PKG" sqlite3 databases/RKStorage 2>&1
}
getcfg() { adb shell "run-as $PKG sqlite3 databases/RKStorage \"SELECT value FROM catalystLocalStorage WHERE key='alarmConfig';\"" 2>/dev/null; }

echo "=============================================="
echo " SGDV Phase 4: sound / snooze / stop / timeout"
echo "=============================================="

# ---- 4a custom sound routing -----------------------------------------------
echo; echo ">>> 4a: custom sound routes to the custom channel + custom_alert"
launch_app; wait_settle
schedule_alarm_stable 10 custom || fail "[4a] could not schedule custom alarm"
if wait_posted "Scheduled Test Alarm" 26; then
  adb shell dumpsys notification --noredact > "$ART/notif-4a-custom.txt" 2>&1
  rec=$(grep -A2 "pkg=$PKG" "$ART/notif-4a-custom.txt" | grep -m1 "channel=notifee-alarm")
  echo "    $rec"
  echo "$rec" | grep -q "channel=notifee-alarm-custom-v1" && pass "[4a] routed to custom channel" || fail "[4a] wrong channel (expected custom)"
  grep -iqE "raw/custom_alert|custom_alert" "$ART/notif-4a-custom.txt" && pass "[4a] custom_alert sound resource present" || fail "[4a] custom_alert sound not found"
else
  fail "[4a] custom alarm did not fire"
fi
deeplink "sgdv://cancel-all"; sleep 2
tap_action "Stop" >/dev/null 2>&1 || true
adb shell service call notification 1 >/dev/null 2>&1 || true

# ---- 4b default sound routing ----------------------------------------------
echo; echo ">>> 4b: default sound routes to the default channel"
launch_app; wait_settle
schedule_alarm_stable 10 default || fail "[4b] could not schedule default alarm"
if wait_posted "Scheduled Test Alarm" 26; then
  adb shell dumpsys notification --noredact > "$ART/notif-4b-default.txt" 2>&1
  rec=$(grep -A2 "pkg=$PKG" "$ART/notif-4b-default.txt" | grep -m1 "channel=notifee-alarm")
  echo "    $rec"
  echo "$rec" | grep -q "channel=notifee-alarm-default-v1" && pass "[4b] routed to default channel" || fail "[4b] wrong channel (expected default)"
else
  fail "[4b] default alarm did not fire"
fi
deeplink "sgdv://cancel-all"; sleep 2

# ---- 4c Snooze action reschedules ------------------------------------------
echo; echo ">>> 4c: Snooze action reschedules a 'Snoozed Alarm' (foreground)"
launch_app; wait_settle
schedule_alarm_stable 10 custom || fail "[4c] could not schedule alarm for snooze"
if wait_posted "Scheduled Test Alarm" 26; then
  adb logcat -c
  if tap_action "Snooze"; then
    sleep 4
    if adb logcat -d 2>/dev/null | grep -qiE "Notifee alarm scheduled: Snoozed Alarm"; then
      pass "[4c] Snooze rescheduled a Snoozed Alarm"
    else
      fail "[4c] Snooze did not reschedule (no 'Snoozed Alarm' log)"
    fi
  else
    fail "[4c] could not find/tap the Snooze action"
  fi
else
  fail "[4c] alarm to snooze did not fire"
fi
deeplink "sgdv://cancel-all"; sleep 2

# ---- 4d Stop action tears down the FGS -------------------------------------
echo; echo ">>> 4d: Stop action tears down the foreground service"
launch_app; wait_settle
schedule_alarm_stable 10 custom || fail "[4d] could not schedule alarm for stop"
if wait_posted "Scheduled Test Alarm" 26; then
  fgs_up && pass "[4d] FGS running before Stop" || fail "[4d] FGS not running before Stop (inconclusive)"
  if tap_action "Stop"; then
    sleep 4
    if fgs_up; then fail "[4d] FGS still running after Stop"; else pass "[4d] FGS torn down after Stop"; fi
  else
    fail "[4d] could not find/tap the Stop action"
  fi
else
  fail "[4d] alarm to stop did not fire"
fi
deeplink "sgdv://cancel-all"; sleep 2

# ---- 4e timeout auto-stop --------------------------------------------------
echo; echo ">>> 4e: alarm auto-stops after the configured timeout (killed app)"
ORIG_CFG="$(getcfg)"
echo "    original config: $ORIG_CFG"
# Inject a short 15s timeout so the test doesn't wait a full minute.
setcfg '{"sunriseEnabled":false,"sunsetEnabled":false,"alarmSound":"custom","alarmTimeoutMs":15000,"snoozeMinutes":5,"notificationsEnabled":true,"scheduleDaysAhead":1}' >/dev/null
echo "    injected alarmTimeoutMs=15000"
launch_app; wait_settle
schedule_alarm_stable 18 custom || fail "[4e] could not schedule alarm for timeout"
# kill the app so only the headless FGS runner (which reads the timeout) runs.
adb shell input keyevent KEYCODE_HOME >/dev/null 2>&1; sleep 2
adb shell am kill "$PKG" >/dev/null 2>&1; sleep 2
if wait_posted "Scheduled Test Alarm" 30; then
  fgs_up && pass "[4e] FGS started (killed app)" || fail "[4e] FGS did not start"
  echo "    waiting ~20s for the 15s auto-stop timeout..."
  stopped=0
  for i in $(seq 1 12); do
    sleep 2
    if ! fgs_up; then stopped=1; break; fi
  done
  [ "$stopped" -eq 1 ] && pass "[4e] FGS auto-stopped after timeout" || fail "[4e] FGS still up well past timeout"
else
  fail "[4e] timeout-test alarm did not fire"
fi
deeplink "sgdv://cancel-all"; sleep 1
# restore original config
[ -n "$ORIG_CFG" ] && setcfg "$ORIG_CFG" >/dev/null && echo "    restored original config"

adb shell am force-stop "$PKG"
rm -rf "$TMP"
echo "----------------------------------------------"
[ "$FAILED" -eq 0 ] && echo "RESULT: ✅ PHASE 4 ALL PASSED" || echo "RESULT: ❌ PHASE 4 SOME FAILED (see $ART/notif-4*.txt)"
echo "=============================================="
exit "$FAILED"
