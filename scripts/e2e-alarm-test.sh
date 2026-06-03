#!/usr/bin/env bash
# Fully automated, no-human alarm test for the notifee Android alarm.
#
# Drives the real app with adb + uiautomator (no Maestro / no extra deps) and
# verifies the alarm's observable system state with `dumpsys`. Two phases:
#
#   PHASE 1 (foreground)   tap "Test Alarm" in the UI -> assert the alarm posts
#                          with a full-screen intent, a running foreground
#                          service, and Stop/Snooze actions.
#
#   PHASE 2 (app closed)   via the __DEV__ deep link, schedule an alarm a few
#                          seconds out, send the app to the background and
#                          `am kill` its process (this mimics the OS reclaiming
#                          a backgrounded app WITHOUT cancelling its AlarmManager
#                          alarm -- unlike force-stop), then assert the alarm
#                          STILL fires and starts its foreground service. This is
#                          the real "works when the app is closed" proof.
#
# Exits 0 if every assertion passes, 1 otherwise. Saves dumps + a screenshot
# under /tmp/sgdv-alarm-test for debugging.
#
# Prereq: emulator booted (scripts/setup-emulator.sh) + dev build installed
# (npx expo run:android). Pass an APK path as $1 to auto-install.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/android-env.sh"

PKG="$SGDV_APP_ID"
TMP="$(mktemp -d)"
ART=/tmp/sgdv-alarm-test
FAILED=0
mkdir -p "$ART"

pass() { echo "  ✅ PASS: $1"; }
fail() { echo "  ❌ FAIL: $1"; FAILED=1; }

# Tap the first on-screen element whose text/desc contains $1.
tap_text() {
  local text="$1" tries="${2:-15}" coords
  for _ in $(seq 1 "$tries"); do
    adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1 || true
    adb pull /sdcard/_ui.xml "$TMP/ui.xml" >/dev/null 2>&1 || true
    if coords=$(python3 "$HERE/_uia_center.py" "$TMP/ui.xml" "$text" 2>/dev/null); then
      adb shell input tap $coords
      return 0
    fi
    sleep 1
  done
  return 1
}

# Assert the currently-posted alarm notification looks correct.
#   $1 = human label for the phase, $2 = expected notification title
assert_alarm_state() {
  local label="$1" title="$2"
  adb shell dumpsys notification --noredact > "$ART/notification-$label.txt" 2>&1
  adb shell dumpsys activity services "$PKG"  > "$ART/services-$label.txt"     2>&1
  adb exec-out screencap -p > "$ART/alarm-$label.png" 2>/dev/null || true

  local notif rec
  notif="$ART/notification-$label.txt"

  grep -q "$PKG" "$notif" \
    && pass "[$label] notification posted by $PKG" \
    || fail "[$label] no notification posted by $PKG"

  grep -q "$title" "$notif" \
    && pass "[$label] alarm title present ('$title')" \
    || fail "[$label] alarm title '$title' not found"

  grep -iqE "fullScreenIntent=PendingIntent|mFullScreenIntent|fullScreenIntent=Pending" "$notif" \
    && pass "[$label] full-screen intent attached" \
    || fail "[$label] no full-screen intent on the alarm"

  grep -iqE "notifee.*ForegroundService|ForegroundService.*notifee|isForeground=true|mediaPlayback" "$ART/services-$label.txt" \
    && pass "[$label] foreground service running" \
    || fail "[$label] notifee foreground service not detected"

  grep -iq "Stop" "$notif" && grep -iq "Snooze" "$notif" \
    && pass "[$label] Stop + Snooze actions attached" \
    || fail "[$label] Stop/Snooze actions not found"
}

deeplink() { adb shell am start -a android.intent.action.VIEW -d "$1" "$PKG" >/dev/null 2>&1; }

echo "=============================================="
echo " SGDV automated alarm test"
echo "=============================================="

# --- preconditions -----------------------------------------------------------
if ! adb devices | grep -qE "emulator-[0-9]+\s+device"; then
  echo "No emulator running. Start one with: scripts/setup-emulator.sh" >&2
  exit 1
fi
if [ "${1:-}" != "" ] && [ -f "${1:-}" ]; then
  echo "==> Installing $1"; adb install -r "$1" >/dev/null
fi
if ! adb shell pm list packages | grep -q "$PKG"; then
  echo "App '$PKG' not installed. Build it first: npx expo run:android" >&2
  exit 1
fi

echo "==> Resetting app state"
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS 2>/dev/null || true
adb shell am force-stop "$PKG"
adb shell input keyevent 82 >/dev/null 2>&1 || true   # unlock
adb logcat -c || true

# ========================== PHASE 1: foreground =============================
echo
echo ">>> PHASE 1: immediate alarm via the UI"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 6
echo "==> Navigating to the Alarm tab"
tap_text "Alarm" || fail "could not find the 'Alarm' tab"
sleep 2
echo "==> Tapping 'Test Alarm'"
tap_text "Test Alarm" || fail "could not find the 'Test Alarm' button"
sleep 4
assert_alarm_state "phase1-foreground" "Test Alarm"

# Clear the immediate alarm before phase 2.
deeplink "sgdv://cancel-all"; sleep 1
adb shell am force-stop "$PKG"

# ========================== PHASE 2: app closed =============================
echo
echo ">>> PHASE 2: scheduled alarm fires after the app is killed"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 6
echo "==> Scheduling an alarm 15s out via deep link"
deeplink "sgdv://schedule-test?secs=15"
sleep 2
echo "==> Backgrounding the app and killing its process (am kill, not force-stop)"
adb shell input keyevent KEYCODE_HOME >/dev/null 2>&1
sleep 2
adb shell am kill "$PKG" >/dev/null 2>&1
sleep 2
if [ -z "$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')" ]; then
  pass "[phase2-killed] app process is dead before the alarm fires"
else
  # Fall back to a harder kill if the gentle one didn't take.
  adb shell am kill-all >/dev/null 2>&1; sleep 2
  [ -z "$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')" ] \
    && pass "[phase2-killed] app process is dead before the alarm fires" \
    || fail "[phase2-killed] could not kill the app process (test inconclusive)"
fi

echo "==> Waiting for the scheduled alarm to fire (app stays closed)..."
fired=0
for _ in $(seq 1 30); do
  if adb shell dumpsys notification --noredact 2>/dev/null | grep -q "Scheduled Test Alarm"; then
    fired=1; break
  fi
  sleep 2
done
[ "$fired" -eq 1 ] \
  && pass "[phase2-killed] scheduled alarm fired while the app was closed" \
  || fail "[phase2-killed] scheduled alarm did NOT fire within the wait window"

assert_alarm_state "phase2-killed" "Scheduled Test Alarm"

# ===================== PHASE 3: notification, app closed =====================
# The silent notification-mode path (expo-notifications), as opposed to the loud
# notifee alarm. Verifies notifications also fire when the app is closed.
echo
echo ">>> PHASE 3: silent notification fires after the app is killed"
deeplink "sgdv://cancel-all"; sleep 1
adb shell am force-stop "$PKG"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 6
echo "==> Scheduling a notification 15s out via deep link"
deeplink "sgdv://schedule-notif?secs=15"
sleep 2
echo "==> Backgrounding the app and killing its process (am kill)"
adb shell input keyevent KEYCODE_HOME >/dev/null 2>&1
sleep 2
adb shell am kill "$PKG" >/dev/null 2>&1
sleep 2
if [ -z "$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')" ]; then
  pass "[phase3-notif] app process is dead before the notification fires"
else
  adb shell am kill-all >/dev/null 2>&1; sleep 2
  [ -z "$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')" ] \
    && pass "[phase3-notif] app process is dead before the notification fires" \
    || fail "[phase3-notif] could not kill app process (test inconclusive)"
fi

echo "==> Waiting for the scheduled notification to fire (app stays closed)..."
nfired=0
for _ in $(seq 1 30); do
  if adb shell dumpsys notification --noredact 2>/dev/null | grep -q "Scheduled Notification"; then
    nfired=1; break
  fi
  sleep 2
done
adb shell dumpsys notification --noredact > "$ART/notification-phase3.txt" 2>&1
adb exec-out screencap -p > "$ART/notification-phase3.png" 2>/dev/null || true
[ "$nfired" -eq 1 ] \
  && pass "[phase3-notif] notification fired while the app was closed" \
  || fail "[phase3-notif] notification did NOT fire within the wait window"

# --- cleanup -----------------------------------------------------------------
deeplink "sgdv://cancel-all" 2>/dev/null || true
adb shell am force-stop "$PKG"
rm -rf "$TMP"

echo "----------------------------------------------"
echo "Artifacts: $ART"
if [ "$FAILED" -eq 0 ]; then
  echo "RESULT: ✅ ALL ASSERTIONS PASSED — alarm AND notification work in foreground AND when the app is closed"
else
  echo "RESULT: ❌ SOME ASSERTIONS FAILED (see $ART/*.txt)"
fi
echo "=============================================="
exit "$FAILED"
