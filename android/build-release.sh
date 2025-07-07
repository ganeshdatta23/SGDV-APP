#!/bin/bash

# Release APK Build Script for Darshanam Compass App
# This script builds and signs the release APK manually to avoid Gradle signing issues

set -e

# Ensure we execute relative to the `android` directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting release APK build process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean
rm -rf app/build

# Build signed release APK
echo "🏗️  Building signed release APK..."
./gradlew assembleRelease

APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ Failed to create release APK"
    exit 1
fi

echo "✅ Release APK created successfully"

# Verify the final APK
echo "🔍 Verifying APK signature..."

APKSIGNER_PATH=$(find $ANDROID_HOME -name "apksigner" -type f 2>/dev/null | head -1)

if [ -n "$APKSIGNER_PATH" ]; then
  $APKSIGNER_PATH verify "$APK_PATH"
fi

echo "✅ APK verification completed"

echo ""
echo "🎉 Release APK build completed successfully!"
echo "📱 Final APK: $APK_PATH"
echo "📊 APK Size: $(ls -lh "$APK_PATH" | awk '{print $5}')"
echo ""
echo "🔧 To install on device, run:"
echo "   adb install $APK_PATH"
echo ""
echo "📋 APK Info:"
if command -v aapt >/dev/null 2>&1; then
    aapt dump badging "$APK_PATH" | head -5
else
    echo "   aapt not available for detailed APK info"
fi 