#!/bin/bash

# Release APK Build Script for Darshanam Compass App
# This script builds and signs the release APK manually to avoid Gradle signing issues

set -e

echo "🚀 Starting release APK build process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean
rm -rf app/build

# Build unsigned APK
echo "📦 Building unsigned APK..."
# Temporarily disable signing in build.gradle
sed -i '' 's/signingConfig signingConfigs.release/\/\/ signingConfig signingConfigs.release/' app/build.gradle

# Build the unsigned APK with specific architecture if needed
echo "🏗️  Building for all architectures..."
./gradlew assembleRelease

# Restore signing configuration
sed -i '' 's/\/\/ signingConfig signingConfigs.release/signingConfig signingConfigs.release/' app/build.gradle

# Check if unsigned APK was created
if [ ! -f "app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
    echo "❌ Failed to create unsigned APK"
    exit 1
fi

echo "✅ Unsigned APK created successfully"

# First optimize with zipalign (before signing)
echo "⚡ Optimizing APK with zipalign..."
ZIPALIGN_PATH=$(find $ANDROID_HOME -name "zipalign" -type f 2>/dev/null | head -1)

if [ -z "$ZIPALIGN_PATH" ]; then
    echo "❌ zipalign not found in ANDROID_HOME"
    exit 1
fi

$ZIPALIGN_PATH -v 4 \
    app/build/outputs/apk/release/app-release-unsigned.apk \
    app/build/outputs/apk/release/app-release-aligned.apk

echo "✅ APK aligned successfully"

# Sign the APK using apksigner (newer and better than jarsigner)
echo "🔐 Signing the APK..."
APKSIGNER_PATH=$(find $ANDROID_HOME -name "apksigner" -type f 2>/dev/null | head -1)

if [ -z "$APKSIGNER_PATH" ]; then
    echo "⚠️  apksigner not found, falling back to jarsigner..."
    # Fallback to jarsigner
    cp app/build/outputs/apk/release/app-release-aligned.apk app/build/outputs/apk/release/app-release-final.apk
    
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
        -keystore app/darshanam-release-key.keystore \
        -storepass shivadatta9 \
        -keypass shivadatta9 \
        app/build/outputs/apk/release/app-release-final.apk \
        darshanam-key-alias
else
    # Use apksigner (recommended)
    $APKSIGNER_PATH sign \
        --ks app/darshanam-release-key.keystore \
        --ks-key-alias darshanam-key-alias \
        --ks-pass pass:shivadatta9 \
        --key-pass pass:shivadatta9 \
        --out app/build/outputs/apk/release/app-release-final.apk \
        app/build/outputs/apk/release/app-release-aligned.apk
fi

echo "✅ APK signed successfully"

# Verify the final APK
echo "🔍 Verifying final APK..."
if [ -n "$APKSIGNER_PATH" ]; then
    $APKSIGNER_PATH verify app/build/outputs/apk/release/app-release-final.apk
else
    jarsigner -verify app/build/outputs/apk/release/app-release-final.apk
fi

if [ $? -eq 0 ]; then
    echo "✅ APK verification successful"
    echo ""
    echo "🎉 Release APK build completed successfully!"
    echo "📱 Final APK: app/build/outputs/apk/release/app-release-final.apk"
    echo "📊 APK Size: $(ls -lh app/build/outputs/apk/release/app-release-final.apk | awk '{print $5}')"
    echo ""
    echo "🔧 To install on device, run:"
    echo "   adb install app/build/outputs/apk/release/app-release-final.apk"
    echo ""
    echo "📋 APK Info:"
    if command -v aapt >/dev/null 2>&1; then
        aapt dump badging app/build/outputs/apk/release/app-release-final.apk | head -5
    else
        echo "   aapt not available for detailed APK info"
    fi
else
    echo "❌ APK verification failed"
    exit 1
fi 