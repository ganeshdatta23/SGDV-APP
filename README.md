# 🙏 Guru Digvandanam

A spiritual compass mobile application that helps devotees orient themselves toward Avadhoota Datta Peetham, offering prayers in the direction of Appaji (Sri Ganapathy Sachchidananda Swamiji).

## 📱 About the App

**Guru Digvandanam** is an Expo-based React Native application that combines location services, magnetometer sensors, and multimedia to create a devotional experience. The app provides:

- 🧭 **Real-time Compass**: Points toward the sacred location using GPS and device magnetometer
- 🎬 **Darshan Overlay**: Beautiful video and audio experience when aligned with the direction
- 📅 **Events View**: Stay updated with upcoming spiritual programs
- 🌅 **Sun Times**: Displays sunrise/sunset times for the sacred location
- ⏰ **Smart Alarms**: Optional notifications for sunrise and sunset times
- 🎨 **Multiple Themes**: Light, Dark, and Cosmic visual themes
- ⚙️ **Customizable Settings**: Audio controls, volume adjustment, and theme selection

## 📂 Repository Structure (Monorepo)

This repository contains **both** the mobile app and its backend API:

```
SGDV-APP/
├── (root)        # 📱 Expo / React Native mobile app (Guru Digvandanam)
└── backend/      # 🗄️ FastAPI backend (SGVD API) — see backend/README.md
```

- **Mobile app** (repo root) — the Expo app documented below.
- **Backend** (`backend/`) — the FastAPI service that powers locations, sun
  times, and events. The app talks to it at `https://sgvd-backend.vercel.app`
  (configured in `utils/sgvdApi.ts` and `constants.ts`). See the
  [🗄️ Backend section](#️-backend-sgvd-api) and [`backend/README.md`](backend/README.md).

> The `backend/` folder was merged in from the standalone `SGVD-Backend` repo.
> Only source files are tracked here — secrets (`.env*`), the virtualenv, and
> Python build artifacts are git-ignored via `backend/.gitignore`.

## 🚀 Quick Start

> The Quick Start below covers the **mobile app**. To run the API locally, see
> the [🗄️ Backend section](#️-backend-sgvd-api).

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 18
- **npm** or **yarn**
- **Expo CLI** (will be used via npx)
- **Mobile device** or **emulator** for testing

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd SGDV-APP
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npx expo start
```

4. **Run on your device**:
   - Install the **Expo Go** app on your mobile device
   - Scan the QR code displayed in the terminal and run it in expo-client app in ios/android
   - Or press `a` for Android emulator, `i` for iOS simulator
   - 📱 **New to Android emulators?** See [Android Emulator Quick Start](docs/ANDROID_EMULATOR_QUICKSTART.md)

## 📦 Tech Stack

### Core Technologies
- **React Native** (0.81.5)
- **Expo** (~54.0.0)
- **React** (19.1.0)
- **TypeScript** (~5.9.2)

### Key Dependencies

#### Sensors & Location
- `expo-sensors` - Magnetometer for compass functionality
- `expo-location` - GPS location services
- `expo-haptics` - Haptic feedback on alignment

#### Media & UI
- `expo-video` - Video playback for darshan overlay
- `expo-audio` - Background music and audio playback
- `expo-linear-gradient` - Beautiful gradient backgrounds
- `react-native-gradients` - Radial gradients for cosmic theme
- `react-native-svg` - Vector graphics for compass UI
- `expo-blur` - Blur effects for overlays

#### Animation & Performance
- `react-native-reanimated` - Smooth 60 FPS animations
- `react-native-worklets` - Background thread animations

#### Storage
- `@react-native-async-storage/async-storage` - Local data persistence

## 🏗️ Architecture

### Project Structure

```
SGDV-APP/
├── App.tsx                      # Main app component & navigation
├── components/                  # React components
│   ├── CompassView.tsx          # Main compass with magnetometer
│   ├── DarshanOverlay.tsx       # Video/audio darshan experience
│   ├── BottomNav.tsx            # Bottom navigation tabs
│   ├── EventsView.tsx           # Events listing view
│   ├── SettingsView.tsx         # App settings & preferences
│   ├── AartiAnimation.tsx       # Animated aarti lamp
│   ├── FlowerAnimation.tsx      # Flower offering animation
│   └── FlowerSvg.tsx            # SVG flower graphics
├── utils/                       # Utility functions
│   ├── locationUtils.ts         # GPS & bearing calculations
│   ├── sgvdApi.ts               # Backend API integration
│   └── alarmManager.ts          # Sunrise/sunset alarms
├── assets/                      # Media files
│   ├── audio/                   # Background music
│   ├── images/                  # Icons, images
│   └── videos/                  # Darshan videos
├── docs/                        # Documentation
│   ├── COMPASS_README.md        # Compass component docs
│   ├── COMPASS_CONFIG_GUIDE.md  # Configuration guide
│   └── COMPASS_SENSOR_GUIDE.md  # Sensor calibration
├── app.json                     # Expo configuration
└── backend/                     # 🗄️ FastAPI backend (SGVD API)
    ├── app/                     # API routes, models, schemas, services
    ├── migrations/              # SQL migrations
    ├── cloudflare/              # Edge reverse-proxy worker
    ├── benchmarks/              # Cold-start & latency reports
    ├── scripts/                 # Seed / smoke-test / deploy helpers
    ├── requirements.txt         # Python dependencies
    ├── vercel.json              # Vercel serverless config
    └── README.md                # Backend documentation
```

### Component Hierarchy

```
App.tsx (Main Container)
├── CompassView.tsx (Home Tab)
│   ├── Magnetometer sensor integration
│   ├── GPS location tracking
│   ├── Bearing calculations
│   └── Visual compass with SVG
├── EventsView.tsx (Programs Tab)
│   └── Fetch & display events from backend
├── SettingsView.tsx (Settings Tab)
│   ├── Theme selector
│   ├── Audio toggle
│   └── Volume control
├── DarshanOverlay.tsx (Modal)
│   ├── VideoView (darshan video)
│   ├── AudioPlayer (background music)
│   ├── AartiAnimation
│   └── FlowerAnimation
└── BottomNav.tsx (Navigation)
```

## ✨ Features

### 1. Smart Compass
- **Real-time Bearing**: Uses device magnetometer to calculate heading
- **GPS Integration**: Automatically fetches your location
- **Distance Display**: Shows distance to the sacred location
- **Turn Instructions**: Visual arrows and text guidance
- **Alignment Detection**: Haptic feedback when pointed correctly (±20° threshold)
- **Smooth Animation**: 60 FPS rotation with reanimated worklets

### 2. Darshan Overlay
When you align the compass with the target direction:
- **Video Background**: Plays a sacred darshan video at 0.3x speed
- **Background Music**: Devotional audio with volume control
- **Animated Elements**: 
  - Aarti lamp with flickering flame animation
  - Floating flower offerings
  - Golden aura glow effect
- **Manual Close**: Requires fresh alignment after closing (prevents accidental re-opening)

### 3. Events Management
- **Backend Integration**: Fetches events from Vercel-hosted API
- **Caching**: 10-minute cache to reduce API calls
- **Fallback Data**: Graceful degradation if API unavailable
- **Event Details**: Title, description, location, and date

### 4. Sun Times & Alarms
- **Dynamic Calculation**: Shows next sunrise/sunset for target location
- **Smart Display**: Shows "Today" or "Tomorrow" based on current time
- **Alarm Scheduling**: Optional notifications for sunrise/sunset times
- **Backend API**: Uses SGVD backend for accurate astronomical data

### 5. Theme System
Three beautiful themes with synchronized compass and app backgrounds:

#### Light Theme (Orange Sunrise)
- Warm orange/amber gradient
- High contrast for daytime use
- White text and UI elements

#### Dark Theme (Stone Night)
- Dark stone/black radial gradient
- Low light friendly
- Muted text colors

#### Cosmic Theme (Red-Black Space)
- Amber/rose/slate radial gradient
- Dramatic cosmic atmosphere
- Amber-gold accents

### 6. Settings & Customization
- **Theme Switching**: Live preview of all three themes
- **Audio Control**: Enable/disable background music
- **Volume Adjustment**: Slider for audio volume (0-100%)
- **Real-time Updates**: Changes apply immediately without restart

## 🔧 Configuration

### Compass Configuration

The compass is highly customizable via `components/CompassView.tsx`. Key parameters:

```typescript
export const DEFAULT_COMPASS_CONFIG: CompassConfig = {
  // Size & Layout
  compassSizeRatio: 0.67,              // 67% of screen size
  centerHubSizeRatio: 0.35,            // Center hub size
  
  // Alignment Detection
  facingThresholdDegrees: 20,          // ±20° alignment threshold
  
  // Sensor Settings
  compassRefreshInterval: 16,          // ~60 FPS updates
  smoothingAlpha: 0.8,                 // Sensor smoothing
  magnetometerSpringDamping: 15,       // Animation damping
  magnetometerSpringStiffness: 100,    // Animation spring
  
  // Visual Customization
  cardinalTickLength: 20,              // N/E/S/W tick marks
  glowRingOffset: 10,                  // Glow effect distance
  // ... and many more options
};
```

### Target Location

The app points toward **Avadhoota Datta Peetham** by default:
- **Latitude**: 12.308367
- **Longitude**: 76.645467
- **Location**: Mysore, Karnataka, India

To change the target location, modify the fallback in `utils/sgvdApi.ts`:

```typescript
const FALLBACK_LOCATION = {
  name: "Your Location Name",
  latitude: YOUR_LATITUDE,
  longitude: YOUR_LONGITUDE,
  googleMapsUrl: "https://www.google.com/maps/..."
};
```

### Backend API

The app connects to a Vercel-hosted backend (source now lives in [`backend/`](backend/README.md)):
- **Base URL**: `https://sgvd-backend.vercel.app` (set in `utils/sgvdApi.ts` / `constants.ts`)
- **Endpoints**:
  - `/sgvd/locations/` - Fetch sacred location data
  - `/sgvd/events/` - Fetch upcoming events

To point the app at a different backend (e.g. a local instance), change
`SGVD_API_BASE_URL` in `utils/sgvdApi.ts`.

### Asset Configuration

Media files are stored in:
- **Audio**: `assets/audio/background-music.mp3`
- **Video**: `assets/videos/darshan-background.mp4`
- **Images**: `assets/images/` (compass icon, darshan images, etc.)

## 📱 Permissions

The app requires the following permissions:

### Android
- `ACCESS_FINE_LOCATION` - GPS location
- `ACCESS_COARSE_LOCATION` - Network location
- `VIBRATE` - Haptic feedback
- `SCHEDULE_EXACT_ALARM` - Sunrise/sunset alarms
- `USE_EXACT_ALARM` - Exact alarm timing

### iOS
- `NSLocationWhenInUseUsageDescription` - Location access
- `NSMotionUsageDescription` - Magnetometer access

All permissions are configured in `app.json`.

## 🎨 Theming

### Changing the Default Theme

Edit `components/CompassView.tsx`:

```typescript
// Line 15
export const COMPASS_THEME: ThemeMode = 'cosmic'; // 'light' | 'dark' | 'cosmic'
```

The app background in `App.tsx` will automatically sync with the compass theme.

### Creating Custom Themes

Add your theme to `APP_BACKGROUNDS` in `App.tsx`:

```typescript
const APP_BACKGROUNDS = {
  myTheme: {
    gradientColors: ['#color1', '#color2'] as const,
    gradientLocations: [0, 1] as const,
    statusBarStyle: 'light-content' as const,
    headerTextColor: '#FFFFFF',
    // ... other theme properties
  },
};
```

## 🔍 Troubleshooting

### Compass Not Working
1. **Enable Location Services**: Go to device settings and enable location
2. **Calibrate Magnetometer**: Move device in a figure-8 pattern
3. **Check Permissions**: Ensure location and sensor permissions are granted
4. **Avoid Magnetic Interference**: Keep away from metal objects and electronics

### Video/Audio Not Playing
1. **Check Asset Paths**: Ensure files exist in `assets/` directory
2. **Restart App**: Kill and restart the app
3. **Check Audio Mode**: Ensure device is not in silent mode
4. **File Format**: Use MP4 for video, MP3 for audio

### Location Not Loading
1. **Internet Connection**: API requires network access
2. **Backend Status**: Check if `sgvd-backend.vercel.app` is accessible
3. **Cache**: App uses cached data if API fails
4. **Fallback**: Hardcoded fallback location always available

### Alignment Not Triggering
1. **Threshold Setting**: Default is ±20°, may be too strict/loose
2. **Sensor Calibration**: Recalibrate magnetometer
3. **Manual Close State**: If you closed the overlay, realign completely
4. **Check Logs**: Look for "Alignment changed" logs in console

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Debug Mode
```bash
# Enable verbose logging
npx expo start --clear
```

### Sensor Testing
```bash
# Check magnetometer values in real-time
# Look for console logs with "🧭" emoji
```

## 📱 Android Emulator Testing

> 🚀 **Quick Start**: See [Android Emulator Quick Start Guide](docs/ANDROID_EMULATOR_QUICKSTART.md) for step-by-step setup

### Helper Script

We've included a helper script to make testing easier:

```bash
# Interactive menu
./scripts/start-emulators.sh

# Quick start (starts first AVD + Expo)
./scripts/start-emulators.sh quick

# Start specific emulator
./scripts/start-emulators.sh start Pixel_8_API_34

# Start multiple emulators
./scripts/start-emulators.sh start Pixel_4a_API_34 Pixel_8_API_34 Pixel_Tablet

# List all available AVDs
./scripts/start-emulators.sh list

# Check what's running
./scripts/start-emulators.sh status

# Kill all emulators
./scripts/start-emulators.sh kill
```

### Prerequisites

Ensure you have Android Studio installed:

```bash
# Install via Homebrew (macOS)
brew install --cask android-studio

# Or download from: https://developer.android.com/studio
```

### Environment Setup

Add these to your `~/.zshrc` (macOS) or `~/.bashrc` (Linux):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Reload your shell
source ~/.zshrc  # or source ~/.bashrc
```

### Creating Multiple Virtual Devices

1. **Open Android Studio** and launch **AVD Manager**:
   - Click **"More Actions"** → **"Virtual Device Manager"**
   - Or use toolbar: **Tools** → **Device Manager**

2. **Recommended Test Devices** (for various screen sizes):

   | Device Type | Model | Screen Size | Resolution | Use Case |
   |------------|-------|-------------|------------|----------|
   | Small Phone | Pixel 4a | 5.8" | 1080×2340 | Budget phones |
   | Standard Phone | Pixel 8 | 6.2" | 1080×2400 | Most common |
   | Large Phone | Pixel 8 Pro | 6.7" | 1344×2992 | Premium devices |
   | Tablet | Pixel Tablet | 10.95" | 2560×1600 | Tablet experience |
   | Foldable | Pixel Fold | 7.6" | 1840×2208 | Foldable screens |

3. **Create Each Device**:
   - Click **"Create Virtual Device"**
   - Select device definition (e.g., **Pixel 8**)
   - Choose system image:
     - **For Apple Silicon Macs**: Select **arm64-v8a** (ARM) images
     - **For Intel Macs/PC**: Select **x86_64** images
     - Recommended: **Android 14 (API 34)** or **Android 13 (API 33)**
   - Click **"Download"** if the system image isn't installed
   - Click **"Next"** → Name your device → **"Finish"**

4. **Important for Apple Silicon Macs**:
   - ⚠️ Only use **ARM64 (arm64-v8a)** system images
   - x86/x86_64 images will **NOT work** on M1/M2/M3 Macs

### Running Your App on Emulators

#### Method 1: Using Expo CLI (Recommended)

1. **Start Expo development server**:
```bash
cd /path/to/SGDV-APP
npx expo start
```

2. **Launch emulator(s)**:
```bash
# Option A: Press 'a' in the Expo terminal
# This automatically starts an emulator and installs the app

# Option B: Manually start emulator(s) from command line
emulator -avd Pixel_8_API_34 &
emulator -avd Pixel_Tablet_API_34 &
emulator -avd Pixel_4a_API_34 &
```

3. **Install app on running emulators**:
   - Press **`a`** in the Expo terminal
   - Or scan the QR code using the **Expo Go** app in the emulator

4. **App will automatically reload** when you make code changes!

#### Method 2: Using Android Studio GUI

1. **Open AVD Manager** in Android Studio
2. **Click the ▶️ Play button** next to each device you want to test
3. **Start Expo** in your terminal: `npx expo start`
4. **Press `a`** in the Expo terminal to install on all running emulators

### Testing on Multiple Devices Simultaneously

#### Parallel Testing Setup

1. **Start multiple emulators**:
```bash
# Start 3 different screen sizes at once
emulator -avd Pixel_4a_API_34 &
sleep 10  # Wait for first to initialize
emulator -avd Pixel_8_Pro_API_34 &
sleep 10
emulator -avd Pixel_Tablet_API_34 &
```

2. **Verify all devices are connected**:
```bash
adb devices
# Output should show:
# List of devices attached
# emulator-5554    device
# emulator-5556    device
# emulator-5558    device
```

3. **Start Expo once** - it automatically detects all emulators:
```bash
npx expo start
# Press 'a' to install on all connected devices
```

4. **Test specific features** across all devices:
   - ✅ Compass orientation on different screen sizes
   - ✅ Video overlay responsiveness
   - ✅ UI layout and text scaling
   - ✅ Touch target sizes
   - ✅ Navigation and animations

#### Install on Specific Device

```bash
# List all devices with their IDs
adb devices

# Install on specific device
adb -s emulator-5554 install app.apk

# Or using Expo on specific device
npx expo start
# Then in Expo DevTools, select specific device
```

### Useful Emulator Commands

```bash
# List all available AVDs
emulator -list-avds

# Start specific emulator
emulator -avd <AVD_NAME> &

# Start with writable system (for testing permissions)
emulator -avd <AVD_NAME> -writable-system &

# Kill all running emulators
adb devices | grep emulator | cut -f1 | xargs -I {} adb -s {} emu kill

# Take screenshot from emulator
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Check emulator logs
adb logcat

# Clear app data (reset app state)
adb shell pm clear com.your.app.package
```

### Creating Custom Device Profiles

For testing edge cases or specific requirements:

1. **In AVD Manager** → **Create Virtual Device** → **New Hardware Profile**
2. **Configure custom specs**:
   - Screen size (e.g., 7.5" for unique tablet)
   - Resolution (e.g., 1200×2000)
   - RAM (e.g., 6GB)
   - Internal storage (e.g., 64GB)
3. **Save profile** and use it to create AVD

### Performance Optimization for Emulators

```bash
# Speed up emulator boot
emulator -avd <AVD_NAME> -no-boot-anim -no-snapshot &

# Increase RAM allocation (in AVD settings)
# Edit AVD → Show Advanced Settings → RAM: 4096 MB

# Use hardware acceleration (check if enabled)
emulator -accel-check
```

### Troubleshooting Emulators

#### Issue: "No system image found"
**Solution**: Install the correct system image
```bash
# Open Android Studio SDK Manager
# Go to: Tools → SDK Manager → SDK Platforms
# Check the box for Android 14.0 (API 34) or desired version
# Switch to "SDK Tools" tab
# Install: Android Emulator, Android SDK Platform-Tools
```

#### Issue: "PANIC: Avd's CPU Architecture not supported"
**Solution**: Apple Silicon Macs need ARM images
- Delete x86_64 AVDs
- Create new AVDs with **arm64-v8a** system images only

#### Issue: Emulator is very slow
**Solutions**:
```bash
# 1. Enable hardware acceleration (HAXM for Intel, Hypervisor for ARM)
# 2. Allocate more RAM in AVD settings (4GB recommended)
# 3. Use a lower API level (API 30 is faster than API 34)
# 4. Close other resource-heavy applications
```

#### Issue: Expo not detecting emulator
**Solutions**:
```bash
# 1. Restart adb server
adb kill-server && adb start-server

# 2. Check emulator is fully booted
adb devices  # Should show "device", not "offline"

# 3. Restart Expo
# Press 'ctrl+c' to stop, then 'npx expo start' again
```

#### Issue: App crashes on emulator but not on physical device
**Check**:
- Sensor availability (magnetometer may not work in emulator)
- Location services (use mock location in emulator)
- Memory constraints (emulators have limited RAM)

### Testing Compass & Sensors in Emulator

⚠️ **Note**: Magnetometer may not work reliably in emulators

**Workaround for testing**:
1. Use emulator's **Extended Controls** (⋮ icon)
2. Go to **Virtual Sensors** → **Magnetometer**
3. Manually adjust values to simulate compass rotation

**Mock Location for GPS Testing**:
```bash
# Enable mock locations in emulator
adb shell settings put secure mock_location 1

# Set a test location (Mysore, India - your target location)
adb shell "am start -a android.intent.action.VIEW \
  -d 'geo:12.308367,76.645467'"
```

### Screen Size Testing Matrix

Recommended test scenarios:

| Screen | Width | Height | Orientation | Test Focus |
|--------|-------|--------|-------------|------------|
| Small | 360dp | 640dp | Portrait | UI density, text readability |
| Medium | 375dp | 812dp | Portrait | Standard layout, navigation |
| Large | 414dp | 896dp | Portrait | Spacing, image quality |
| Tablet | 800dp | 1280dp | Portrait | Tablet-specific layout |
| Tablet | 1280dp | 800dp | Landscape | Landscape adaptations |

### Best Practices

1. **Always test on at least 3 screen sizes**: Small, Medium, Large
2. **Test both orientations**: Portrait and Landscape
3. **Use Expo Go** for rapid iteration during development
4. **Create production builds** (`eas build`) for final testing
5. **Test on physical devices** before release (sensors work better)
6. **Keep emulators updated** to latest Android versions

### Recommended Testing Workflow

```bash
# 1. Start your most-used test device
emulator -avd Pixel_8_API_34 &

# 2. Start Expo in another terminal
npx expo start

# 3. Make changes → Auto-reload happens

# 4. When ready for multi-device testing:
# Start additional emulators
emulator -avd Pixel_4a_API_34 &
emulator -avd Pixel_Tablet_API_34 &

# 5. Press 'a' in Expo terminal
# App installs on all devices automatically

# 6. Test feature on all screens simultaneously
```

## 📖 Documentation

Additional documentation available in `docs/` folder:
- **ANDROID_EMULATOR_QUICKSTART.md**: 🚀 Quick guide to set up Android emulators and test on multiple devices
- **COMPASS.md**: Detailed compass component documentation
- **VIDEO_OVERLAY.md**: Video overlay and darshan experience documentation

## 🔐 Build & Deployment

### Development Build
```bash
# Run on physical device
npx expo start
# Scan QR code with Expo Go app
```

### Production Build (EAS)

0. **For testing in android using apk file**:
```bash
eas build --platform android --profile preview   
```

1. **Install EAS CLI**:
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure build**:
```bash
eas build:configure
```

4. **Build for Android**:
```bash
eas build --platform android
```

5. **Build for iOS**:
```bash
eas build --platform ios
```

### Local APK Build

For Android without EAS:
```bash
# Generate development client
npx expo prebuild
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## 🗄️ Backend (SGVD API)

The `backend/` folder holds the **FastAPI** service that powers the app's
location, sun-times, events, spiritual-activity, and auth features. Full details
are in [`backend/README.md`](backend/README.md); a summary:

### Stack
- **Framework**: FastAPI (async end-to-end) on Uvicorn
- **Database**: dual backend selected by the `DB_BACKEND` env flag —
  **Postgres** (SQLAlchemy 2.0 + asyncpg) or **Turso / libSQL** (pure-Python
  `libsql-client`, used for Vercel serverless). See [`backend/TURSO.md`](backend/TURSO.md).
- **Auth**: JWT (python-jose) + bcrypt (passlib); optional Google OAuth
- **Deployment**: Vercel serverless (`backend/vercel.json`) with a Cloudflare
  edge reverse-proxy worker (`backend/cloudflare/`) for caching

### Run locally
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in DATABASE_URL / SECRET_KEY (or Turso vars)
uvicorn app.main:app --reload   # http://127.0.0.1:8000/docs
```

All API routes are served under the `/sgvd` prefix (e.g. `/sgvd/locations/`,
`/sgvd/events/`, `/sgvd/auth/login`).

## 🤝 Contributing

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Comments for complex logic
- Consistent formatting with Prettier

### Git Workflow
```bash
# Current branch: fb_expo_amar
git checkout -b feature/your-feature
git add .
git commit -m "Description of changes"
git push origin feature/your-feature
```

## 📜 Version History

- **v1.0.0** (Current)
  - Expo-based React Native app
  - Three theme system
  - Backend API integration
  - Alarm scheduling
  - Events management

## 📄 License

This is a devotional application for the followers of Sri Ganapathy Sachchidananda Swamiji.

## 🙏 Acknowledgments

- **Sri Ganapathy Sachchidananda Swamiji** - Spiritual inspiration
- **Avadhoota Datta Peetham** - Sacred location
- **Expo Team** - Excellent mobile development platform
- **React Native Community** - Amazing ecosystem

**Om Dram Dattaya Namaha** 🙏

Built with devotion by the spiritual tech community of Avadhoota Datta Peetham.