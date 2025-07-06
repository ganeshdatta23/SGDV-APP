# Darshanam Compass Native App

A professional React Native compass application that helps devotees find the direction to Appaji's location with real-time updates, sunrise notifications, and spiritual features.

## 🌟 Features

### 🧭 Core Compass Functionality
- **Real-time Compass** - Accurate magnetic compass with smooth animations
- **Dynamic Target Location** - Fetches Appaji's location from Supabase database
- **Alignment Detection** - Haptic feedback when pointing toward target
- **Sunrise/Sunset Times** - Displays next sunrise/sunset at Appaji's location

### 🎵 Spiritual Features
- **Darshan Overlay** - Beautiful video and image overlay when aligned
- **Background Music** - Automatic music playback during alignment
- **Sunrise Alarm** - Daily notifications at sunrise based on Appaji's location
- **Location Updates** - Real-time location updates every 10 seconds

### 📱 Professional UI
- **iOS-style Interface** - Clean, modern design following iOS guidelines
- **Bottom Navigation** - 4-tab navigation (Home, Dashboard, Schedule, Settings)
- **Settings Screen** - Professional settings with toggles and controls
- **Error Handling** - Graceful fallbacks and retry mechanisms

## 🏗️ Architecture

### 📁 Project Structure
```
SGDV-APP/
├── components/
│   ├── CompassView.tsx          # Main compass component
│   ├── SettingsScreen.tsx       # Settings interface
│   └── BottomNavigation.tsx     # Tab navigation
├── utils/
│   ├── directApi.js             # Supabase API integration
│   ├── locationUtils.ts         # GPS and bearing calculations
│   ├── sunCalculator.ts         # Astronomical calculations
│   └── alarmService.js          # Sunrise notification service
├── assets/
│   ├── audio/                   # Background music files
│   ├── images/                  # Darshan images and icons
│   └── videos/                  # Background video for overlay
└── android/                     # Android-specific files
```

### 🔧 Core Components

#### CompassView.tsx
- Magnetometer integration for compass readings
- Smooth animations with exponential smoothing
- GPS location tracking
- Bearing calculations to target location
- Haptic feedback on alignment

#### SettingsScreen.tsx
- Music autoplay toggle
- Sunrise alarm configuration
- Location refresh controls
- Google Maps integration
- Professional iOS-style interface

#### DirectApi.js
- Supabase REST API integration
- Real-time location fetching
- Error handling and fallbacks
- Location name resolution

#### AlarmService.js
- Push notification scheduling
- Sunrise time calculations
- Daily recurring alarms
- Location-based updates

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** >= 18
- **React Native CLI** (`npm install -g @react-native-community/cli`)
- **Android Studio** (for Android development)
- **Java Development Kit (JDK)** 11 or 17

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd SGDV-APP
npm install
```

### 2. Android Setup
```bash
# Verify Android setup
npx react-native doctor

# List connected devices
adb devices
```

### 3. Install Additional Dependencies
```bash
npm install react-native-push-notification
```

### 4. Build and Run
```bash
# Debug build
npx react-native run-android

# Release build
cd android
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

## 📊 Database Configuration

### Supabase Setup
The app connects to Supabase database with the following table structure:

```sql
CREATE TABLE public.locations (
  id text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  googlemapsurl text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);
```

### API Configuration
- **URL**: `https://kpqwrcjtubmuxcegltty.supabase.co`
- **Table**: `locations`
- **Query**: Fetches record with `id='appaji'`
- **Fields**: `latitude`, `longitude`, `address`, `googleMapsUrl`

## ⚙️ Configuration Options

### Location Updates
- **Frequency**: Every 10 seconds
- **Fallback**: Default coordinates if API fails
- **Caching**: Sunrise/sunset times cached daily

### Audio Settings
- **Background Music**: `assets/audio/background-music.mp3`
- **Auto-play**: Configurable via settings
- **Volume**: 80% default

### Notifications
- **Sunrise Alarm**: Daily notifications at calculated sunrise
- **Permissions**: Automatic permission requests
- **Repeat**: Daily recurring notifications

## 🔧 Development

### Debug Console
```bash
# View real-time logs
adb logcat *:S ReactNative:V ReactNativeJS:V

# Filter specific logs
adb logcat | grep "ReactNativeJS"
```

### Wireless Debugging
```bash
# Enable wireless debugging on device
# Settings > Developer options > Wireless debugging

# Pair device
adb pair <IP>:<PORT>

# Connect
adb connect <IP>:<PORT>

# Install APK
adb install app-release.apk
```

### Build Commands
```bash
# Clean build
cd android && ./gradlew clean

# Debug APK
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease

# Install to device
./gradlew installRelease
```

## 📱 Usage

### Home Screen
1. **Compass Display** - Shows direction to Appaji's location
2. **Location Info** - Current target location and last update time
3. **Sun Times** - Next sunrise/sunset information
4. **Alignment** - Haptic feedback and darshan overlay when aligned

### Settings Screen
1. **Music Autoplay** - Toggle background music during alignment
2. **Sunrise Alarm** - Enable daily sunrise notifications
3. **Refresh Location** - Manually update Appaji's location
4. **Open Maps** - View location in Google Maps

### Navigation
- **Home Tab** - Main compass interface
- **Dashboard Tab** - (Future feature)
- **Schedule Tab** - (Future feature)
- **Settings Tab** - Configuration options

## 🔒 Security & Privacy

### Data Protection
- No personal data collection
- Location data fetched from public Supabase database
- No user tracking or analytics

### Permissions Required
- **Location** - For compass bearing calculations
- **Notifications** - For sunrise alarm feature
- **Internet** - For fetching Appaji's location updates

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm install
npx react-native run-android
```

#### Location Not Updating
- Check internet connection
- Verify Supabase database accessibility
- Check console logs for API errors

#### Compass Inaccuracy
- Calibrate device compass in device settings
- Ensure device is away from magnetic interference
- Check magnetometer permissions

#### Notifications Not Working
- Enable notification permissions in device settings
- Check if "Do Not Disturb" is enabled
- Verify alarm service initialization

### Debug Commands
```bash
# Check device connection
adb devices

# View app logs
adb logcat | grep "ReactNativeJS"

# Clear app data
adb shell pm clear com.darshanamcompassnative

# Restart app
adb shell am force-stop com.darshanamcompassnative
adb shell am start -n com.darshanamcompassnative/.MainActivity
```

## 📈 Performance Optimization

### Compass Smoothing
- Exponential smoothing with α=0.25
- 50ms update throttling
- Efficient animation handling

### Location Updates
- 10-second intervals for real-time updates
- Fallback mechanisms for offline scenarios
- Cached sunrise/sunset calculations

### Memory Management
- Proper cleanup of intervals and listeners
- Sound resource management
- Component lifecycle optimization

## 🔮 Future Enhancements

### Planned Features
- **Dashboard Tab** - Statistics and usage analytics
- **Schedule Tab** - Prayer times and spiritual calendar
- **Multiple Locations** - Support for different spiritual locations
- **Offline Mode** - Cached location data for offline use
- **Customization** - Themes and personalization options

### Technical Improvements
- **Background Location** - Updates when app is backgrounded
- **Widget Support** - Home screen compass widget
- **Apple Watch** - Companion watch app
- **Voice Guidance** - Audio direction instructions

## 📄 License

This project is developed for spiritual purposes and community use.

## 🙏 Acknowledgments

- **Supabase** - Database and API services
- **React Native Community** - Open source libraries
- **Phosphor Icons** - Beautiful icon set
- **SunCalc** - Astronomical calculations

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Platform**: Android (iOS support planned)