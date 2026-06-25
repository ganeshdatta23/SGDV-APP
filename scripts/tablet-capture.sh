#!/usr/bin/env bash
# One-pass capture of the 4 tabs on the real Pixel Tablet AVD (emulator-5556,
# 2560x1600 landscape). The AVD's API-36 GPU/ANGLE path is flaky, so we: boot
# fresh, pre-grant POST_NOTIFICATIONS (avoids the runtime dialog), launch, then
# capture each tab via screencap-to-file+pull (more robust than exec-out pipe),
# tapping tabs by content-desc. No BACK presses (those wedged it before).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/android-env.sh"
PKG="$SGDV_APP_ID"
export ANDROID_SERIAL="${ANDROID_SERIAL:-emulator-5556}"
OUT=/tmp/sgdv-ui-tablet
DEV_URL="sgdv://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
mkdir -p "$OUT"

shot() {  # $1 = name
  adb shell screencap -p /sdcard/_c.png >/dev/null 2>&1
  adb pull /sdcard/_c.png "$OUT/$1.png" >/dev/null 2>&1
  local b; b=$(wc -c < "$OUT/$1.png" 2>/dev/null || echo 0)
  echo "      $1.png ($b b)"
}

tap_nav() {  # $1 = label
  adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/_ui.xml "$OUT/_ui.xml" >/dev/null 2>&1 || true
  local c; c=$(python3 "$HERE/_uia_tap_nav.py" "$OUT/_ui.xml" "$1" 2>/dev/null)
  [ -n "$c" ] && { adb shell input tap $c >/dev/null 2>&1; return 0; }
  return 1
}

echo ">>> pre-grant notifications + wire Metro"
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true

echo ">>> launch app"
adb shell am force-stop "$PKG" >/dev/null 2>&1
adb shell am start -a android.intent.action.VIEW -d "$DEV_URL" "$PKG" >/dev/null 2>&1
for i in $(seq 1 30); do adb shell pidof "$PKG" >/dev/null 2>&1 && break; sleep 2; done
sleep 16
shot "t-initial"

# If a notif dialog still shows, tap Allow once (no BACK).
if tap_nav "Allow"; then echo "   (tapped Allow)"; sleep 2; fi

for tab in Darshan Alarm Programs Settings; do
  if tap_nav "$tab"; then sleep 3; shot "t-$tab"; else echo "      !! tab not found: $tab"; fi
done
echo "DONE"
ls -1 "$OUT"/t-*.png 2>/dev/null | sed 's/^/  /'