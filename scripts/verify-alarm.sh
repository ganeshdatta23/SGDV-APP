#!/usr/bin/env bash
# One command, fully automated, no human: verify the notifee alarm on a local
# Android emulator.
#
#   ./scripts/verify-alarm.sh [--rebuild]
#
# Steps:
#   1. load the Android toolchain env (SDK + JDK 21)
#   2. boot the emulator (creates the AVD on first run)
#   3. build + install the debug dev client if it isn't installed (or --rebuild)
#   4. ensure Metro is serving the JS bundle (debug builds load JS from it)
#   5. run the two-phase alarm test (foreground + schedule-then-kill)
#
# Exit code is the test's: 0 = alarm verified in foreground AND when closed.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
source "$HERE/android-env.sh"
cd "$ROOT"

REBUILD=0
[ "${1:-}" = "--rebuild" ] && REBUILD=1

# 1 + 2 -----------------------------------------------------------------------
"$HERE/setup-emulator.sh"

# 3 --------------------------------------------------------------------------
APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [ "$REBUILD" = "1" ] || ! adb shell pm list packages 2>/dev/null | grep -q "$SGDV_APP_ID"; then
  if [ ! -d android ]; then
    echo "==> Generating native project (expo prebuild)"
    npx expo prebuild --platform android
  fi
  echo "==> Building debug APK (gradlew assembleDebug)"
  ( cd android && ./gradlew :app:assembleDebug -x lint -x test )
  echo "==> Installing $APK"
  adb install -r "$APK"
else
  echo "==> Dev client already installed (use --rebuild to force a rebuild)"
fi

# 4 --------------------------------------------------------------------------
# Debug builds fetch their JS bundle from Metro, so it must be running.
if ! curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; then
  echo "==> Starting Metro in the background (/tmp/metro.log)"
  nohup npx expo start --dev-client --port 8081 > /tmp/metro.log 2>&1 &
  for _ in $(seq 1 40); do
    curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running" && break
    sleep 1
  done
fi
# Let the emulator reach Metro on localhost.
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true

# 5 --------------------------------------------------------------------------
exec "$HERE/e2e-alarm-test.sh"
