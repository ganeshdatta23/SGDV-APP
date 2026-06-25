#!/usr/bin/env bash
# UI consistency capture across device form-factors.
# For each profile we reconfigure the emulator screen geometry (wm size/density),
# then walk the 4 bottom tabs (Darshan/Alarm/Programs/Settings) tapping each by
# its visible label (resolution-independent via _uia_center.py) and screenshot it.
# Settings is also scrolled to capture its lower half. Resets to native at the end.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/android-env.sh"
PKG="$SGDV_APP_ID"
OUT=/tmp/sgdv-ui
mkdir -p "$OUT"

# profile = "name WxH density widthdp"
PROFILES=(
  "compact 720x1520 320 360dp"
  "baseline 1080x2400 420 411dp"
  "large 1080x2400 360 480dp"
  "tablet 1600x2560 280 914dp"
)

NATIVE_SIZE="1080x2400"
NATIVE_DENSITY="420"
DEV_URL="sgdv://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"

launch_app() {
  adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
  adb shell am force-stop "$PKG" >/dev/null 2>&1
  adb shell am start -a android.intent.action.VIEW -d "$DEV_URL" "$PKG" >/dev/null 2>&1
  local i
  for i in $(seq 1 45); do adb shell pidof "$PKG" >/dev/null 2>&1 && break; sleep 1; done
  sleep 10   # let the JS bundle load + first render settle
}

shot() { adb exec-out screencap -p > "$OUT/$1.png" 2>/dev/null && echo "      saved $1.png ($(wc -c < "$OUT/$1.png") b)"; }

# tap a bottom-nav tab by label (nav-aware: clickable node, bottom-most).
tap_nav() {
  local label="$1"
  adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/_ui.xml "$OUT/_ui.xml" >/dev/null 2>&1 || true
  local c; c=$(python3 "$HERE/_uia_tap_nav.py" "$OUT/_ui.xml" "$label" 2>/dev/null)
  if [ -n "$c" ]; then adb shell input tap $c >/dev/null 2>&1; return 0; fi
  return 1
}
# tap any node by visible text (used for the Dismiss overlay button).
tap_text() {
  local label="$1"
  adb shell uiautomator dump /sdcard/_ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/_ui.xml "$OUT/_ui.xml" >/dev/null 2>&1 || true
  local c; c=$(python3 "$HERE/_uia_center.py" "$OUT/_ui.xml" "$label" 2>/dev/null)
  if [ -n "$c" ]; then adb shell input tap $c >/dev/null 2>&1; return 0; fi
  return 1
}

set_geometry() {
  local size="$1" density="$2"
  adb shell wm size "$size" >/dev/null 2>&1
  adb shell wm density "$density" >/dev/null 2>&1
  sleep 4   # let RN process the configuration change + re-layout
}

echo ">>> launching app (LogBox suppressed for clean automation)"
launch_app

for p in "${PROFILES[@]}"; do
  set -- $p
  name="$1"; size="$2"; density="$3"; wdp="$4"
  echo ">>> profile: $name  ($size @ ${density}dpi  ~$wdp wide)"
  set_geometry "$size" "$density"
  for tab in Darshan Alarm Programs Settings; do
    if tap_nav "$tab"; then
      sleep 3
      shot "${name}-${tab}"
    else
      echo "      !! could not find tab: $tab"
    fi
  done
  # capture lower half of Settings (scrollable)
  if tap_nav "Settings"; then
    sleep 1
    adb shell input swipe 500 1800 500 600 400 >/dev/null 2>&1
    sleep 2
    shot "${name}-Settings-scrolled"
  fi
done

echo ">>> restoring native geometry $NATIVE_SIZE @ ${NATIVE_DENSITY}"
adb shell wm size "$NATIVE_SIZE" >/dev/null 2>&1
adb shell wm density "$NATIVE_DENSITY" >/dev/null 2>&1
echo "DONE. screenshots in $OUT"
ls -1 "$OUT"/*.png | sed 's/^/  /'