# Compass Component Documentation

Complete guide to the `CompassView` component - a sophisticated compass implementation with dual sensor support, GPS-based targeting, and smooth animations.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Sensor Technologies](#sensor-technologies)
5. [Installation & Setup](#installation--setup)
6. [Basic Usage](#basic-usage)
7. [Configuration](#configuration)
8. [Themes](#themes)
9. [API Reference](#api-reference)
10. [Advanced Usage](#advanced-usage)
11. [Performance](#performance)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The `CompassView` component provides a visual compass interface that guides users to face a specific direction. It features:

- **Dual sensor system**: Primary rotation vector sensor with automatic magnetometer fallback
- **GPS-based targeting**: Dynamic heading calculation to any location
- **Smooth animations**: Spring-based dial rotation using React Native Reanimated
- **Alignment detection**: Haptic feedback when aligned with target direction
- **Highly customizable**: Extensive configuration options for styling and behavior
- **Multiple themes**: Light, dark, and cosmic themes

---

## Features

### Core Features

- ✅ **Dual Sensor Support**: Rotation vector (primary) with magnetometer fallback
- ✅ **Static & Dynamic Targeting**: Point to a fixed heading or GPS location
- ✅ **Real-time Updates**: High-frequency sensor updates (20ms intervals)
- ✅ **Smooth Animations**: Spring physics for natural compass movement
- ✅ **Alignment Detection**: Configurable threshold for "aligned" state
- ✅ **Haptic Feedback**: Vibration when alignment is achieved
- ✅ **Distance Calculation**: Shows distance to target location
- ✅ **Turn Instructions**: Visual guidance (TURN LEFT/RIGHT/ALIGNED)
- ✅ **Customizable UI**: Extensive configuration options

### Visual Elements

- Rotating compass dial with degree markings
- Fixed phone orientation marker
- Target direction pointer (independent rotation)
- Center hub with current heading and target bearing
- Turn instruction container
- Location name and distance display
- Alignment glow effect

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CompassView                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Rotation Vector │────▶│   Yaw Heading   │               │
│  │     Sensor      │     │   (0-360°)      │               │
│  └─────────────────┘     └────────┬────────┘               │
│         │                         │                         │
│         │ fallback                │                         │
│         ▼                         ▼                         │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │  Magnetometer   │────▶│   Smoothing     │               │
│  │    (backup)     │     │   Algorithm     │               │
│  └─────────────────┘     └────────┬────────┘               │
│                                   │                         │
│                                   ▼                         │
│                          ┌─────────────────┐               │
│                          │  Dial Rotation  │               │
│                          │  (Animated)     │               │
│                          └────────┬────────┘               │
│                                   │                         │
│                                   ▼                         │
│                          ┌─────────────────┐               │
│                          │   SVG Compass   │               │
│                          │   Rendering     │               │
│                          └─────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Layers

1. **Sensor Layer**: Reads rotation vector or magnetometer data
2. **Processing Layer**: Extracts heading, applies smoothing, handles wraparound
3. **Animation Layer**: Spring physics for smooth dial rotation
4. **Rendering Layer**: SVG-based compass visualization

---

## Sensor Technologies

### Rotation Vector Sensor (Primary)

The rotation vector sensor is a **software-based virtual sensor** that fuses data from multiple hardware sensors:

| Hardware Sensor | Purpose |
|-----------------|---------|
| Accelerometer | Measures gravity direction (down) |
| Gyroscope | Tracks rotation rate (angular velocity) |
| Magnetometer | Detects magnetic north |

**How it works:**

1. Device's sensor fusion algorithm (Kalman filter) combines all three sensor inputs
2. Outputs a **quaternion** (qx, qy, qz, qw) representing 3D orientation
3. Converts quaternion to rotation matrix
4. Extracts yaw (heading) with tilt compensation
5. Updates at high frequency (20ms intervals)

**Advantages:**
- ✅ More stable than raw magnetometer (±1-2° accuracy)
- ✅ Compensates for device tilt automatically
- ✅ Reduces noise and jitter
- ✅ Works reliably indoors
- ✅ No manual calibration required

### Magnetometer (Fallback)

The magnetometer is a **hardware sensor** that measures the Earth's magnetic field:

```
            Magnetic North
                  ↑
                  │
        ┌─────────┼─────────┐
        │         │         │
        │    ←────┼────→    │  ← Measures X, Y, Z
        │         │    (x,y) │    magnetic field
        │         │         │    components
        └─────────┴─────────┘
              Device
```

**Heading calculation:**
```typescript
const angle = Math.atan2(-x, y) * (180 / Math.PI);
const heading = (angle + 360) % 360;
```

**Advantages:**
- ✅ Available on all devices
- ✅ Lower battery consumption
- ✅ Works immediately

**Disadvantages:**
- ⚠️ Less accurate (±5-15°)
- ⚠️ Affected by magnetic interference
- ⚠️ May require calibration
- ⚠️ Jittery in some environments

### Sensor Comparison

| Aspect | Rotation Vector | Magnetometer |
|--------|-----------------|--------------|
| **Accuracy** | ±1-2° | ±5-15° |
| **Stability** | Very stable | Jittery, noisy |
| **Tilt compensation** | Yes (automatic) | No (needs manual) |
| **Indoor reliability** | Good | Poor (interference) |
| **Calibration** | Automatic | Often requires "figure-8" |
| **Update rate** | High (50Hz+) | Lower (20Hz typical) |
| **Battery usage** | Higher (3 sensors) | Lower (1 sensor) |
| **Availability** | Most modern phones | All phones |

### Automatic Fallback

The component automatically falls back to magnetometer when:
- Rotation sensor is unavailable (older devices)
- Gyroscope hardware is missing
- Sensor initialization fails
- Invalid quaternion data detected

---

## Installation & Setup

### Dependencies

```json
{
  "react-native-reanimated": "^3.x.x",
  "expo-sensors": "^12.x.x",
  "expo-haptics": "^12.x.x",
  "expo-location": "^16.x.x",
  "react-native-svg": "^13.x.x"
}
```

### Permissions

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow app to access your location for compass navigation."
        }
      ]
    ]
  }
}
```

---

## Basic Usage

### Static Heading

```tsx
import CompassView from './components/CompassView';

// Point to northeast (45°)
<CompassView targetHeading={45} />
```

### GPS-Based Targeting

```tsx
import CompassView from './components/CompassView';

const targetLocation = {
  latitude: 12.2958,
  longitude: 76.6394,
  address: "Datta Peetham, Mysore"
};

<CompassView 
  targetLocation={targetLocation}
  onAlignmentChange={(aligned) => {
    console.log('Aligned:', aligned);
  }}
/>
```

### With Alignment Callback

```tsx
<CompassView 
  targetHeading={90}
  onAlignmentChange={(aligned) => {
    if (aligned) {
      // Show video overlay, play audio, etc.
      showDarshanOverlay();
    }
  }}
/>
```

---

## Configuration

The compass supports extensive customization through a `config` prop:

```tsx
import CompassView, { CompassConfig, DEFAULT_COMPASS_CONFIG } from './components/CompassView';

const customConfig: Partial<CompassConfig> = {
  compassSizeRatio: 0.8,           // 80% of screen size
  facingThresholdDegrees: 15,       // ±15° alignment threshold
  turnInstructionTextSize: 20,      // Larger text
  rotationSpringDamping: 20,        // Faster response
  rotationSpringStiffness: 150,     // Stiffer spring
};

<CompassView 
  targetHeading={45}
  config={customConfig}
/>
```

### Configuration Parameters

#### Size & Layout

| Parameter | Default | Description |
|-----------|---------|-------------|
| `compassSizeRatio` | `0.67` | Ratio of screen size (0.67 = 67% of smaller dimension) |
| `centerHubSizeRatio` | `0.35` | Size of center hub as ratio of compass radius |

#### Tick Marks

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cardinalTickLength` | `20` | Length of N, E, S, W ticks (pixels from edge) |
| `semiCardinalTickLength` | `12` | Length of 30° ticks |
| `minorTickLength` | `6` | Length of 5° ticks |
| `cardinalTickWidth` | `2.5` | Stroke width for cardinal ticks |
| `minorTickWidth` | `0.8` | Stroke width for minor ticks |

#### Font Sizes

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cardinalNorthFontSize` | `18` | Font size for North marker |
| `cardinalOtherFontSize` | `14` | Font size for E, S, W markers |
| `centerLabelFontSize` | `8` | Font size for "HEADING" label |
| `centerValueFontSize` | `28` | Font size for degree value |
| `targetBearingFontSize` | `12` | Font size for target bearing |
| `turnInstructionIconSize` | `25` | Size of turn arrow icons |
| `turnInstructionTextSize` | `16` | Font size for turn instructions |
| `statusTextSize` | `10` | Font size for status text |
| `locationTextSize` | `15` | Font size for location name |

#### Spacing & Padding

| Parameter | Default | Description |
|-----------|---------|-------------|
| `turnContainerPaddingH` | `22` | Horizontal padding for turn instruction |
| `turnContainerPaddingV` | `12` | Vertical padding for turn instruction |
| `turnContainerMarginBottom` | `30` | Space below turn instruction |
| `compassMarginBottom` | `80` | Space below compass dial |
| `statusContainerPaddingH` | `20` | Horizontal padding for status |
| `statusContainerPaddingV` | `16` | Vertical padding for status |
| `statusContainerMargin` | `20` | Margin from edges |
| `statusContainerBottom` | `40` | Distance from bottom |

#### Sensor & Animation

| Parameter | Default | Description |
|-----------|---------|-------------|
| `facingThresholdDegrees` | `20` | Degrees to consider "aligned" (±20° = 40° total) |
| `compassRefreshInterval` | `30` | Milliseconds between magnetometer updates |
| `smoothingAlpha` | `0.8` | Smoothing factor (0.8 = 80% new, 20% old) |
| `rotationSpringDamping` | `1000` | Spring damping for rotation sensor |
| `rotationSpringStiffness` | `1000` | Spring stiffness for rotation sensor |
| `magnetometerSpringDamping` | `20` | Spring damping for magnetometer |
| `magnetometerSpringStiffness` | `100` | Spring stiffness for magnetometer |

#### Glow Effects

| Parameter | Default | Description |
|-----------|---------|-------------|
| `glowRingOffset` | `5` | Distance of glow ring from compass edge |
| `glowRingWidth` | `3` | Stroke width of glow ring |

#### Border Radii

| Parameter | Default | Description |
|-----------|---------|-------------|
| `turnContainerRadius` | `50` | Border radius for turn instruction |
| `statusContainerRadius` | `30` | Border radius for status container |

---

## Themes

The compass supports three built-in themes:

### Light Theme
Optimized for bright/orange backgrounds (sunrise theme):
- Medium-dark colors for balanced contrast
- Amber/gold accents
- Red North marker

### Dark Theme
Optimized for dark backgrounds (night theme):
- Dark stone colors
- Gold accents
- High contrast text

### Cosmic Theme
Red-black cosmic gradient (default):
- Rose-950 and slate-950 colors
- Amber-400 accents
- High contrast for dramatic effect

### Using Themes

```tsx
import CompassView, { ThemeMode } from './components/CompassView';

// Use a specific theme
<CompassView 
  targetHeading={45}
  theme="cosmic"
/>

// Theme can be combined with custom config
<CompassView 
  targetHeading={45}
  theme="dark"
  config={{
    glowRingWidth: 5,
    compassSizeRatio: 0.75,
  }}
/>
```

---

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `targetHeading` | `number \| null` | `45` | Static target direction (0-360°) |
| `targetLocation` | `Coordinates & { address?: string } \| null` | `null` | GPS coordinates (overrides targetHeading) |
| `onAlignmentChange` | `(aligned: boolean) => void` | `undefined` | Callback when alignment state changes |
| `hideStatusWhenAligned` | `boolean` | `false` | Hide status container when aligned |
| `sensorType` | `'rotation' \| 'magnetometer'` | `'rotation'` | Preferred sensor type |
| `theme` | `'light' \| 'dark' \| 'cosmic'` | `'cosmic'` | Theme mode |
| `config` | `Partial<CompassConfig>` | `DEFAULT_COMPASS_CONFIG` | Custom configuration |

### Types

```typescript
interface CompassViewProps {
  targetHeading?: number | null;
  targetLocation?: Coordinates & { address?: string } | null;
  onAlignmentChange?: (aligned: boolean) => void;
  hideStatusWhenAligned?: boolean;
  sensorType?: 'rotation' | 'magnetometer';
  theme?: ThemeMode;
  config?: Partial<CompassConfig>;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}
```

---

## Advanced Usage

### Custom Configuration Example

```tsx
import CompassView, { DEFAULT_COMPASS_CONFIG } from './components/CompassView';

const largeCompassConfig = {
  ...DEFAULT_COMPASS_CONFIG,
  compassSizeRatio: 0.85,
  centerValueFontSize: 32,
  cardinalNorthFontSize: 22,
  facingThresholdDegrees: 10,
};

<CompassView 
  targetLocation={destination}
  config={largeCompassConfig}
  theme="cosmic"
/>
```

### Integration with Video Overlay

```tsx
const [isAligned, setIsAligned] = useState(false);

<>
  <CompassView 
    targetLocation={targetLocation}
    onAlignmentChange={setIsAligned}
    hideStatusWhenAligned={true}
  />
  
  <DarshanOverlay
    visible={isAligned}
    videoPlayer={videoPlayer}
    audioPlayer={audioPlayer}
    onClose={() => setIsAligned(false)}
  />
</>
```

### Force Specific Sensor

```tsx
// Force magnetometer only (no fallback)
<CompassView 
  targetHeading={90}
  sensorType="magnetometer"
/>

// Force rotation vector only (no fallback)
<CompassView 
  targetHeading={90}
  sensorType="rotation"
/>
```

---

## Performance

### Optimizations

1. **UI Thread Processing**: Sensor data processed via Reanimated worklets
2. **Throttled Updates**: 20ms interval prevents excessive renders
3. **Memoized Calculations**: Distance and bearing calculations cached
4. **Conditional Location Tracking**: Only enabled when `targetLocation` is provided
5. **SVG Optimization**: Efficient rendering with minimal re-renders

### Performance Tips

- Use `hideStatusWhenAligned={true}` when showing video overlay
- Reduce `compassRefreshInterval` if experiencing lag (minimum: 16ms for 60fps)
- Increase `smoothingAlpha` for smoother but less responsive movement
- Adjust spring parameters for your device's performance

---

## Troubleshooting

### Compass Not Updating

**Symptoms**: Compass dial doesn't rotate or shows incorrect heading

**Solutions**:
1. Check sensor permissions in app settings
2. Try rotating device in figure-8 pattern to calibrate magnetometer
3. Move away from metal objects or electronics
4. Check console for sensor initialization errors
5. Verify device supports rotation vector sensor

### Jumpy or Noisy Readings

**Symptoms**: Compass jumps around erratically

**Solutions**:
- Component auto-switches to magnetometer if rotation sensor fails
- Increase `smoothingAlpha` (0.8 → 0.9) for more smoothing
- Ensure device is held relatively flat (not tilted)
- Move away from magnetic interference sources
- Check if magnetometer needs calibration

### Wrong Direction

**Symptoms**: Compass points in incorrect direction

**Solutions**:
- Magnetometer may need calibration (rotate device in figure-8)
- Check for magnetic interference nearby
- Verify `targetHeading` or `targetLocation` values are correct
- Ensure device orientation is correct (portrait mode)
- Try switching to rotation vector sensor if available

### Alignment Not Detecting

**Symptoms**: `onAlignmentChange` callback not firing

**Solutions**:
- Check `facingThresholdDegrees` value (default: 20°)
- Verify `targetHeading` or `targetLocation` is set correctly
- Ensure sensor is providing valid readings
- Check console logs for alignment state changes
- Increase threshold if alignment is too strict

### Performance Issues

**Symptoms**: Laggy animations or high battery usage

**Solutions**:
- Reduce update frequency (`compassRefreshInterval`)
- Increase spring damping for less bouncy animations
- Disable location tracking if not using `targetLocation`
- Check for memory leaks in sensor subscriptions
- Monitor battery usage during testing

### Location Not Updating

**Symptoms**: GPS-based targeting not working

**Solutions**:
- Verify location permissions are granted
- Check GPS is enabled on device
- Ensure `targetLocation` prop is provided
- Check location accuracy settings
- Verify internet connection for location services

---

## Summary

The `CompassView` component provides a robust, feature-rich compass implementation that:

1. **Prefers rotation vector sensor** for accuracy and stability
2. **Falls back to magnetometer** automatically when needed
3. **Supports both static and GPS-based targeting**
4. **Uses spring physics** for smooth, natural animations
5. **Highly customizable** through configuration object
6. **Multiple themes** for different visual styles
7. **Production-ready** with error handling and performance optimizations

For integration examples, see the main `App.tsx` file.

