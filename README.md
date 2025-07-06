# Darshanam Compass Native App

## 📦 Dependencies

### Core React Native Libraries:

- `react-native` (0.73.8)
- `react-native-sensors` - Magnetometer data for compass functionality
- `react-native-geolocation-service` - GPS location services
- `react-native-haptic-feedback` - Haptic feedback on alignment
- `react-native-svg` - Vector graphics for compass UI
- `react-native-video` - Video playback for darshan overlay
- `react-native-sound` - Audio playback and background music

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 18
- **React Native CLI** (`npm install -g react-native-cli`)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)
- **Java Development Kit (JDK)** 11 or 17

### 0. Environment Setup Verification

```bash
# Check your development environment
npx react-native doctor

# Verify versions
node --version        # Should be >= 18
java -version        # Should be 11 or 17
npx react-native --version
```

## 📱 Android Development Setup

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Clean install (if needed)
rm -rf node_modules
npm install
```

### 2. Android Environment Setup

Make sure you have:

- Android Studio installed with Android SDK
- Android SDK Build-Tools
- Android SDK Platform-Tools

Turn on android debugging in your phone and connect via usb.

```bash
# Verify Android setup
npx react-native doctor

# List connected devices
adb devices

adb devices -l (Also get name of android device)
```

### 3. Generate Android Resources (First Time Setup)

The Android resources (icons, strings, styles) are excluded from git to avoid large commits. After cloning, run:

```bash
# Generate Android resources
./scripts/generate-android-resources.sh

# Or manually create resources if script fails
mkdir -p android/app/src/main/res/{values,drawable,mipmap-mdpi,mipmap-hdpi,mipmap-xhdpi,mipmap-xxhdpi,mipmap-xxxhdpi}
```

### 4. Running Debug Build (debug version - not sharable)

```bash
# Run on Android device/emulator (Recommended for testing USB-debugging mode)
npx react-native run-android

# Start Metro bundler (in separate terminal - Not recommended)
npx react-native start 

# Or run with cache reset
npx react-native start --reset-cache
npx react-native run-android
 APK location output in: android/app/build/outputs/apk/debug/app-debug.apk

```

### 5. Checking logs (Only available for Debug mode - usb debugging )

```bash

# Real time stream logs
adb -s device_id logcat | grep "ReactNativeJS"
get your device_id using adb devices -l

# Dump logs 
# use -d flag
adb -s device_id logcat -d| grep "ReactNativeJS"

```

## 🔧 6. Building APK Files (Release version - sharable)

### Debug APK Build

For testing and development:

```bash
# Clean previous builds
cd android
./gradlew clean
cd ..

# Build debug APK
cd android
./gradlew assembleDebug
cd ..

 APK location output in: android/app/build/outputs/apk/release/app-release.apk
```

### Release APK Build (Signed & Optimized)

#### Step 1: Keystore Setup (One-time)

The project is already configured with a release keystore. The signing configuration is in:

- `android/gradle.properties` - Contains keystore settings
- `android/app/build.gradle` - Contains signing configuration

#### Step 2: Build Signed Release APK

```bash
# Clean previous builds
cd android
./gradlew clean

# Build signed release APK 
./gradlew assembleRelease

# Back to project root
cd ..

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

#### Step 3: Install Release APK

```bash
# Install release APK on connected device
cd android
./gradlew installRelease
cd ..

# Or manually install
adb install android/app/build/outputs/apk/release/app-release.apk (Does not need keystore setup)
```

## ⚙️ Configuration

### Audio & Video Assets

Ensure these assets are properly placed:

- **Android**: `android/app/src/main/assets/` and `android/app/src/main/res/raw/`
- **iOS**: Added to Xcode project bundle

## 📚 Architecture Overview

### Component Structure

```
components/
├── CompassView.tsx      # Main compass component
utils/
├── locationUtils.ts     # GPS and bearing calculations
├── sunCalculator.ts     # Astronomical calculations
services/
└── notificationService.ts # Background notifications (empty now)
```