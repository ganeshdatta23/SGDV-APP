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

## 🚀 Quick Start

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
└── app.json                     # Expo configuration
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

The app connects to a Vercel-hosted backend:
- **Base URL**: `https://sgvd-backend.vercel.app`
- **Endpoints**:
  - `/sgvd/locations/` - Fetch sacred location data
  - `/sgvd/events/` - Fetch upcoming events

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

## 📖 Documentation

Additional documentation available in `docs/` folder:
- **COMPASS_README.md**: Detailed compass component documentation
- **COMPASS_CONFIG_GUIDE.md**: Full configuration options reference
- **COMPASS_SENSOR_GUIDE.md**: Sensor calibration and troubleshooting
- **EXPO_CLEANUP_GUIDE.md**: Migration guide from React Native CLI to Expo

## 🔐 Build & Deployment

### Development Build
```bash
# Run on physical device
npx expo start
# Scan QR code with Expo Go app
```

### Production Build (EAS)

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