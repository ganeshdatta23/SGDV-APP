#!/usr/bin/env bash
# Create (if missing) and boot the Android emulator used for the automated
# alarm test. Idempotent: safe to re-run; no-op if an emulator is already up.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/android-env.sh"

IMG="system-images;android-36;google_apis;arm64-v8a"
DEVICE="pixel_7"

# 1. Create the AVD if it doesn't exist yet.
if ! avdmanager list avd 2>/dev/null | grep -q "Name: ${SGDV_AVD}$"; then
  echo "==> Creating AVD '$SGDV_AVD' ($IMG)"
  echo "no" | avdmanager create avd -n "$SGDV_AVD" -k "$IMG" -d "$DEVICE" --force
else
  echo "==> AVD '$SGDV_AVD' already exists"
fi

# 2. Boot it (headful so the full-screen alarm UI is actually rendered).
if adb devices | grep -qE "emulator-[0-9]+\s+device"; then
  echo "==> An emulator is already running"
else
  echo "==> Booting '$SGDV_AVD' (log: /tmp/emulator.log)"
  nohup emulator -avd "$SGDV_AVD" \
    -no-snapshot-save -no-boot-anim -gpu auto -netdelay none -netspeed full \
    >/tmp/emulator.log 2>&1 &
fi

# 3. Wait for full boot.
echo "==> Waiting for device to come online..."
adb wait-for-device
echo "==> Waiting for sys.boot_completed..."
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
  sleep 2
done

# 4. Unlock the screen so the app (and alarm) is interactable.
adb shell input keyevent 82 >/dev/null 2>&1 || true   # MENU dismisses keyguard
adb shell wm dismiss-keyguard >/dev/null 2>&1 || true

echo "==> Emulator ready: $(adb devices | grep emulator | awk '{print $1}')"
