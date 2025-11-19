# Expo Managed Workflow - File/Folder Guide

This guide explains what each file and folder in your project does, and what can be safely deleted if you're using Expo managed workflow only.

---

## 📁 **FOLDERS & FILES EXPLANATION**

### ✅ **KEEP - Core Expo/React Native Files**

#### **Root Configuration Files**
- **`package.json`** - Node.js dependencies and scripts (KEEP, but update scripts)
- **`app.json`** - Expo configuration (app name, icons, permissions, etc.) - **KEEP**
- **`tsconfig.json`** - TypeScript configuration - **KEEP**
- **`babel.config.js`** - Babel transpiler config for Expo - **KEEP**
- **`metro.config.js`** - Metro bundler config (Expo's default) - **KEEP**
- **`index.js`** - App entry point - **KEEP**
- **`App.tsx`** - Main app component - **KEEP**
- **`global.d.ts`** - TypeScript global type definitions - **KEEP**

#### **Source Code**
- **`components/`** - Your React components - **KEEP**
- **`utils/`** - Utility functions - **KEEP**
- **`assets/`** - Images, audio, videos, fonts - **KEEP**
- **`__tests__/`** - Test files - **KEEP**

#### **Expo Files**
- **`.expo/`** - Expo cache/metadata (auto-generated) - **KEEP** (but can be regenerated)

---

### ❌ **DELETE - Native Code Folders (Expo Managed)**

#### **`android/`** - **DELETE** ✅
- Contains Android native code (Java/Kotlin, Gradle configs, AndroidManifest.xml)
- **Why delete**: Expo managed workflow generates this automatically during build
- **What it contains**:
  - `app/build.gradle` - Android build configuration
  - `app/src/main/` - Android source code, resources, manifest
  - `gradle/` - Gradle wrapper files
  - `settings.gradle` - Gradle project settings
  - Native Android code (MainActivity.kt, MainApplication.kt)

#### **`ios/`** - **DELETE** ✅
- Contains iOS native code (Swift, Xcode project, Podfile)
- **Why delete**: Expo managed workflow generates this automatically during build
- **What it contains**:
  - `DarshanamCompassNative.xcodeproj/` - Xcode project files
  - `DarshanamCompassNative.xcworkspace/` - Xcode workspace
  - `DarshanamCompassNative/` - iOS source code (AppDelegate.swift, Info.plist)
  - `Podfile` - CocoaPods dependencies
  - `Pods/` - Installed CocoaPods (can be regenerated)

---

### ⚠️ **UPDATE OR DELETE - React Native Specific**

#### **`react-native.config.js`** - **DELETE** ✅
- Configures React Native CLI for native builds
- References `android/` and `ios/` folders
- **Not needed** for Expo managed workflow

#### **`scripts/generate-android-resources.sh`** - **DELETE** ✅
- Script to generate Android resources (icons, strings.xml, etc.)
- **Not needed** - Expo handles this via `app.json`

#### **`Gemfile`** & **`Gemfile.lock`** - **DELETE** ✅
- Ruby dependencies for CocoaPods (iOS dependency manager)
- **Not needed** - Expo managed workflow handles iOS dependencies automatically

#### **`jest.config.js`** - **UPDATE** ⚠️
- Currently uses `preset: 'react-native'`
- **Should change to**: `preset: 'jest-expo'` for Expo projects
- Or keep as-is if tests work

---

### 📝 **DOCUMENTATION (Your Choice)**

#### **`README.md`** - **UPDATE** ⚠️
- Contains instructions for native development
- **Should update** to reflect Expo managed workflow instructions

#### **`COMPASS_SENSOR_GUIDE.md`** - **KEEP** ✅
- App-specific documentation

#### **`archive/`** - **DELETE** ✅ (if not needed)
- Appears to be old/unused files

---

## 🗑️ **SUMMARY: What to Delete**

### **Folders to Delete:**
```bash
android/          # Entire Android native folder
ios/              # Entire iOS native folder
archive/          # If not needed
```

### **Files to Delete:**
```bash
react-native.config.js
scripts/generate-android-resources.sh
Gemfile
Gemfile.lock
```

### **Files to Update:**
```bash
package.json      # Update scripts (remove expo run:android/ios)
jest.config.js    # Change preset to 'jest-expo' (optional)
README.md         # Update instructions for Expo managed workflow
```

---

## 🔄 **After Deletion - What Happens?**

1. **Development**: Use `expo start` → opens Expo Go app or development build
2. **Building**: Use EAS Build (`eas build`) → Expo generates native folders in the cloud
3. **No Local Native Code**: You won't need Android Studio or Xcode for most development
4. **Simpler Workflow**: Focus on JavaScript/TypeScript only

---

## ⚡ **Quick Cleanup Commands**

```bash
# Delete native folders
rm -rf android ios

# Delete React Native specific files
rm react-native.config.js
rm -rf scripts/
rm Gemfile Gemfile.lock

# Delete archive if not needed
rm -rf archive/
```

---

## 📋 **Updated package.json Scripts**

After cleanup, your scripts should be:
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",  // Opens in Expo Go
    "ios": "expo start --ios",          // Opens in Expo Go
    "web": "expo start --web",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

---

## ⚠️ **Important Notes**

1. **Backup First**: Make sure you have a git commit or backup before deleting
2. **Dependencies**: Some packages might need Expo alternatives:
   - `react-native-geolocation-service` → `expo-location`
   - `react-native-linear-gradient` → `expo-linear-gradient`
   - `react-native-vector-icons` → Consider Expo alternatives
3. **EAS Build**: You'll need to set up EAS Build for production builds
4. **Expo Go Limitations**: Some native modules might not work in Expo Go (need development build)

---

## ✅ **Verification**

After cleanup, verify:
- ✅ `expo start` works
- ✅ App runs in Expo Go (if using standard Expo modules)
- ✅ `app.json` has all necessary config
- ✅ No references to `android/` or `ios/` folders in code

