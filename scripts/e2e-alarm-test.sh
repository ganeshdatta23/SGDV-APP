#!/usr/bin/env bash
# Fully automated, no-human test that the notifee alarm AND the silent
# notification fire in the foreground AND when the app is closed.
#
# Drives the dev build with adb (no Maestro / no extra deps) and verifies the
# observable system state with `dumpsys`. Three phases:
#
#   PHASE 1 (foreground) schedule an alarm via the __DEV__ deep link -> assert
#                        it fires with a full-screen intent, a running
#                        foreground service, and Stop/Snooze actions.
#   PHASE 2 (app closed) schedule an alarm, send HOME + `am kill` the process
#                        (mimics the OS reclaiming a backgrounded app WITHOUT
#                        cancelling its setAlarmClock alarm, unlike force-stop),
#                        then assert the alarm STILL fires.
#   PHASE 3 (app closed) same for the silent expo-notifications notification.
#
# Notes learned the hard way:
#  * The dev build loads JS from Metro, so it must be launched with the
#    expo-development-client deep link (not `monkey`) and Metro must be running
#    (scripts/verify-alarm.sh / `npx expo start --dev-client` + adb reverse).
#  * The app re-schedules its sunrise/sunset alarms on startup and calls
#    cancelAllAlarms() each pass, which wipes a freshly deep-link-scheduled test
#    alarm. So we wait for startup to settle and retry until the alarm sticks.
#  * Location is pre-granted so the runtime dialog doesn't block the UI.
#
# Exit 0 iff every assertion passes. Artifacts + screenshots in /tmp/sgdv-alarm-test.
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

launch_app() {
  adb shell am force-stop "$PKG"
  adb logcat -c || true
  deeplink "$DEV_URL"
  local i
  for i in $(seq 1 45); do adb shell pidof "$PKG" >/dev/null 2>&1 && break; sleep 1; done
}

# Wait for the app's startup (re)scheduling to finish so it won't wipe our test
# alarm, then drain a little extra for slow location/API retries.
wait_settle() {
  local i
  for i in $(seq 1 30); do
    adb logcat -d 2>/dev/null | grep -qiE "Alarms scheduled successfully|No alarms or notifications enabled" && break
    sleep 2
  done
  sleep 10
}

# Best-effort: close the expo-dev-client developer-menu sheet for clean shots.
dismiss_dev_menu() {
  adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/_ui.xml "$TMP/ui.xml" >/dev/null 2>&1 || true
  local c; c=$(python3 "$HERE/_uia_center.py" "$TMP/ui.xml" "Close" 2>/dev/null) && adb shell input tap $c || true
}

# Schedule via deep link, retrying until the app's reschedule doesn't wipe it.
#   $1 = deep-link action (schedule-test | schedule-notif), $2 = seconds out
schedule_stable() {
  local action="$1" secs="$2" attempt
  for attempt in 1 2 3 4 5; do
    adb logcat -c
    deeplink "sgdv://${action}?secs=${secs}"
    sleep 6
    if adb logcat -d 2>/dev/null | grep -qiE "All alarms cancelled|All notifee alarms cancelled"; then
      echo "    (attempt $attempt: wiped by app reschedule, retrying)"; sleep 4
    else
      return 0
    fi
  done
  return 1
}

kill_app() {
  adb shell input keyevent KEYCODE_HOME >/dev/null 2>&1; sleep 2
  adb shell am kill "$PKG" >/dev/null 2>&1; sleep 3
  if [ -n "$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')" ]; then
    adb shell am kill-all >/dev/null 2>&1; sleep 2
  fi
  [ -z "$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')" ]
}

# Wait (up to ~$2 s) for a notification whose title contains $1 to be posted.
wait_posted() {
  local title="$1" secs="${2:-44}" i
  for i in $(seq 1 $((secs/2))); do
    adb shell dumpsys notification --noredact 2>/dev/null | grep -q "$title" && return 0
    sleep 2
  done
  return 1
}

echo "=============================================="
echo " SGDV automated alarm + notification test"
echo "=============================================="

# --- preconditions -----------------------------------------------------------
if ! adb devices | grep -qE "emulator-[0-9]+\s+device"; then
  echo "No emulator running. Start one with: scripts/setup-emulator.sh" >&2; exit 1
fi
if ! adb shell pm list packages 2>/dev/null | grep -q "$PKG"; then
  echo "App '$PKG' not installed. Build it first (scripts/verify-alarm.sh / npx expo run:android)." >&2; exit 1
fi
if ! curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; then
  echo "Metro is not running on :8081. Start it: npx expo start --dev-client" >&2; exit 1
fi
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
for p in POST_NOTIFICATIONS ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION; do
  adb shell pm grant "$PKG" android.permission.$p 2>/dev/null || true
done

# ========================== PHASE 1: foreground ==============================
echo
echo ">>> PHASE 1: alarm fires in the foreground"
launch_app
wait_settle
dismiss_dev_menu
schedule_stable schedule-test 12 || fail "[phase1] could not schedule a stable alarm"
if wait_posted "Scheduled Test Alarm" 24; then
  pass "[phase1] alarm fired (foreground)"
else
  fail "[phase1] alarm did not fire"
fi
adb shell dumpsys notification --noredact > "$ART/notif-phase1.txt" 2>&1
adb shell dumpsys activity services "$PKG" > "$ART/svc-phase1.txt" 2>&1
adb exec-out screencap -p > "$ART/alarm-phase1.png" 2>/dev/null || true
grep -iqE "fullscreenIntent=PendingIntent" "$ART/notif-phase1.txt" && pass "[phase1] full-screen intent attached" || fail "[phase1] no full-screen intent"
grep -iqE "app.notifee.core.ForegroundService" "$ART/svc-phase1.txt"  && pass "[phase1] foreground service running"  || fail "[phase1] no foreground service"
grep -iq "Stop" "$ART/notif-phase1.txt" && grep -iq "Snooze" "$ART/notif-phase1.txt" && pass "[phase1] Stop+Snooze actions" || fail "[phase1] missing Stop/Snooze actions"
grep -iqE "invalid channel|CannotPostForegroundService" "$ART/notif-phase1.txt" && fail "[phase1] foreground-service channel error" || pass "[phase1] no FGS channel error"
deeplink "sgdv://cancel-all"; sleep 1

# ========================== PHASE 2: app closed (alarm) ======================
echo
echo ">>> PHASE 2: alarm fires after the app is killed"
launch_app
wait_settle
schedule_stable schedule-test 40 || fail "[phase2] could not schedule a stable alarm"
if kill_app; then pass "[phase2] app process killed before fire"; else fail "[phase2] could not kill app (inconclusive)"; fi
if wait_posted "Scheduled Test Alarm" 44; then
  pass "[phase2] alarm fired while the app was CLOSED"
else
  fail "[phase2] alarm did NOT fire while closed"
fi
adb exec-out screencap -p > "$ART/alarm-phase2-killed.png" 2>/dev/null || true
adb shell dumpsys activity services "$PKG" 2>/dev/null | grep -iqE "app.notifee.core.ForegroundService" \
  && pass "[phase2] foreground service started from killed state" || fail "[phase2] no foreground service after wake"
deeplink "sgdv://cancel-all"; sleep 1

# ========================== PHASE 3: app closed (notification) ================
echo
echo ">>> PHASE 3: silent notification fires after the app is killed"
launch_app
wait_settle
schedule_stable schedule-notif 40 || fail "[phase3] could not schedule a stable notification"
if kill_app; then pass "[phase3] app process killed before fire"; else fail "[phase3] could not kill app (inconclusive)"; fi
if wait_posted "Scheduled Notification" 44; then
  pass "[phase3] notification fired while the app was CLOSED"
else
  fail "[phase3] notification did NOT fire while closed"
fi
adb exec-out screencap -p > "$ART/notif-phase3-killed.png" 2>/dev/null || true

# --- cleanup -----------------------------------------------------------------
deeplink "sgdv://cancel-all" 2>/dev/null || true
adb shell am force-stop "$PKG"
rm -rf "$TMP"

echo "----------------------------------------------"
echo "Artifacts + screenshots: $ART"
if [ "$FAILED" -eq 0 ]; then
  echo "RESULT: ✅ ALL PASSED — alarm AND notification fire in foreground AND when the app is closed"
else
  echo "RESULT: ❌ SOME ASSERTIONS FAILED (see $ART/*.txt)"
fi
echo "=============================================="
exit "$FAILED"
