#!/usr/bin/env bash
# Source this to get a working Android toolchain env on this Mac.
#   source scripts/android-env.sh
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
# Expo 54 / RN 0.81 Android (AGP 8.x + Gradle) builds with JDK 17+. JDK 21 is installed via brew.
export JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null)"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH"

# AVD used by the automated alarm test
export SGDV_AVD="sgdv_test"
export SGDV_APP_ID="com.darshanamcompassnative"
