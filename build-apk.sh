#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}"
ANDROID_DIR="${ROOT_DIR}/android"

usage() {
  cat <<'EOF'
Usage:
  ./build-apk.sh --mode dev|prod --out /path/to/dir|/path/to/file.apk [--device <id>] [--avd <name>]

Examples:
  ./build-apk.sh --mode dev --out ./builds
  ./build-apk.sh --mode prod --out /Users/me/Desktop/sgdv-prod.apk
  ./build-apk.sh --mode dev --out ./builds --device emulator-5554
  ./build-apk.sh --mode dev --out ./builds --avd Pixel_8_API_34
EOF
}

MODE=""
OUT_PATH=""
DEVICE_ID=""
AVD_NAME=""

get_running_emulator() {
  adb devices | awk '$2=="device" && $1 ~ /^emulator-/ {print $1; exit}'
}

wait_for_emulator() {
  echo "Waiting for emulator to connect..."
  for _ in {1..60}; do
    if [[ -n "$(get_running_emulator)" ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

start_emulator_and_wait() {
  local avd="$1"
  echo "Starting emulator: ${avd}"
  emulator -avd "${avd}" >/dev/null 2>&1 &
  if ! wait_for_emulator; then
    echo "Emulator did not appear within expected time."
    exit 1
  fi
}

if [[ $# -gt 0 ]]; then
  case "$1" in
    dev|development|prod|production)
      MODE="$1"
      shift
      ;;
  esac
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--mode)
      MODE="${2:-}"
      shift 2
      ;;
    -o|--out|--output|--out-dir)
      OUT_PATH="${2:-}"
      shift 2
      ;;
    -d|--device)
      DEVICE_ID="${2:-}"
      shift 2
      ;;
    --avd)
      AVD_NAME="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${MODE}" || -z "${OUT_PATH}" ]]; then
  usage
  exit 1
fi

case "${MODE}" in
  dev|development)
    MODE="dev"
    BUILD_TASK="assembleDebug"
    APK_SRC="${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  prod|production)
    MODE="prod"
    BUILD_TASK="assembleRelease"
    APK_SRC="${ANDROID_DIR}/app/build/outputs/apk/release/app-release.apk"
    ;;
  *)
    echo "Invalid mode: ${MODE} (use dev or prod)"
    exit 1
    ;;
esac

if ! command -v adb >/dev/null 2>&1; then
  echo "Error: adb not found. Add Android platform-tools to PATH."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx not found. Install Node.js and npm."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node not found. Install Node.js."
  exit 1
fi

PACKAGE_NAME="$(node -e "const app=require('${ROOT_DIR}/app.json'); const pkg=app?.expo?.android?.package; if(!pkg){process.exit(1)}; console.log(pkg);")"
if [[ -z "${PACKAGE_NAME}" ]]; then
  echo "Error: Android package not found in app.json."
  exit 1
fi

if [[ -n "${AVD_NAME}" ]]; then
  if ! command -v emulator >/dev/null 2>&1; then
    echo "Error: emulator not found. Add Android emulator to PATH."
    exit 1
  fi
  start_emulator_and_wait "${AVD_NAME}"
elif [[ -z "${DEVICE_ID}" ]]; then
  if [[ -z "$(get_running_emulator)" ]]; then
    if command -v emulator >/dev/null 2>&1; then
      FIRST_AVD="$(emulator -list-avds | head -1)"
      if [[ -n "${FIRST_AVD}" ]]; then
        echo "No emulator detected. Starting first AVD: ${FIRST_AVD}"
        start_emulator_and_wait "${FIRST_AVD}"
      fi
    fi
  fi
fi

if [[ ! -d "${ANDROID_DIR}" ]]; then
  echo "Android project not found. Running Expo prebuild..."
  (cd "${ROOT_DIR}" && npx expo prebuild --platform android)
fi

echo "Building APK (${MODE})..."
(cd "${ANDROID_DIR}" && ./gradlew "${BUILD_TASK}")

if [[ ! -f "${APK_SRC}" ]]; then
  echo "APK not found at: ${APK_SRC}"
  exit 1
fi

if [[ "${OUT_PATH}" == *.apk ]]; then
  APK_DEST="${OUT_PATH}"
  mkdir -p "$(dirname "${APK_DEST}")"
else
  mkdir -p "${OUT_PATH}"
  APK_DEST="${OUT_PATH}/sgdv-${MODE}-$(date +%Y%m%d-%H%M%S).apk"
fi

cp "${APK_SRC}" "${APK_DEST}"
echo "APK saved to: ${APK_DEST}"

if [[ -z "${DEVICE_ID}" ]]; then
  DEVICE_ID="$(get_running_emulator)"
fi

if [[ -z "${DEVICE_ID}" ]]; then
  echo "No emulator found. Start one, pass --avd, or use --device."
  exit 1
fi

adb -s "${DEVICE_ID}" wait-for-device
echo "Installing on device: ${DEVICE_ID}"
if ! adb -s "${DEVICE_ID}" install -r -d "${APK_DEST}"; then
  echo "Reinstall failed. Uninstalling and retrying..."
  adb -s "${DEVICE_ID}" uninstall "${PACKAGE_NAME}" || true
  adb -s "${DEVICE_ID}" install "${APK_DEST}"
fi

echo "Launching app: ${PACKAGE_NAME}"
adb -s "${DEVICE_ID}" shell monkey -p "${PACKAGE_NAME}" -c android.intent.category.LAUNCHER 1

if [[ "${MODE}" == "dev" ]]; then
  echo "Note: start Metro with 'npx expo start --dev-client' if not running."
fi
