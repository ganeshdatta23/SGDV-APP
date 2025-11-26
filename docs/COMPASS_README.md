# Compass Component Documentation

This document explains the `CompassView` component implementation, the sensor technologies used, and the key differences between the Rotation Vector sensor and the Magnetometer.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Sensor Technologies](#sensor-technologies)
4. [Rotation Vector vs Magnetometer](#rotation-vector-vs-magnetometer)
5. [Code Walkthrough](#code-walkthrough)
6. [Props API](#props-api)
7. [Dependencies](#dependencies)

---

## Overview

The `CompassView` component provides a visual compass that guides users to face a specific direction. It features:

- **Dual sensor system**: Primary rotation vector sensor with magnetometer fallback
- **Smooth animations**: Spring-based dial rotation using Reanimated
- **Target guidance**: Shows direction to a static heading or dynamic GPS location
- **Haptic feedback**: Vibrates when aligned with target direction
- **Auto-fallback**: Seamlessly switches to magnetometer if rotation sensor fails

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

---

## Sensor Technologies

### Rotation Vector Sensor (Primary)

The rotation vector sensor is a **software-based "virtual" sensor** that fuses data from multiple hardware sensors:

| Hardware Sensor | Purpose |
|-----------------|---------|
| Accelerometer | Measures gravity direction (down) |
| Gyroscope | Tracks rotation rate (angular velocity) |
| Magnetometer | Detects magnetic north |

**How it works:**

1. The device's sensor fusion algorithm (Kalman filter or similar) combines all three sensor inputs
2. Outputs a **quaternion** (qx, qy, qz, qw) representing 3D orientation
3. Also provides **Euler angles** (pitch, roll, yaw) directly
4. Updates at high frequency (20ms intervals in our implementation)

**Why use the rotation vector?**

- More stable than raw magnetometer
- Compensates for device tilt
- Reduces noise and jitter
- Works reliably indoors
- No manual calibration required

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
// atan2(-x, y) gives angle from magnetic north
const heading = Math.atan2(-x, y) * (180 / Math.PI);
```

---

## Rotation Vector vs Magnetometer

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

### Visual Comparison

```
Rotation Vector Output (stable):
    ───────────────────────────────
    Heading: 45° → 45° → 46° → 45° → 45° → 46°
    
Magnetometer Output (noisy):
    ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
    Heading: 45° → 52° → 38° → 47° → 55° → 41°
```

### When Magnetometer is Used

The component automatically falls back to magnetometer when:

1. Rotation sensor is unavailable (older devices)
2. Gyroscope hardware is missing
3. Sensor initialization fails

---

## Code Walkthrough

### 1. Sensor Initialization

```typescript
// Primary: Rotation vector sensor via Reanimated
const rotationSensor = useAnimatedSensor(SensorType.ROTATION, { interval: 20 });
```

This hook:
- Registers the rotation sensor on the native side
- Provides real-time quaternion + Euler angle data
- Runs on the UI thread for smooth animations

### 2. Heading Extraction (Simplified)

**Old approach (complex):**
```typescript
// Quaternion → Rotation Matrix → Yaw (30+ lines)
const matrix = quaternionToRotationMatrix(qx, qy, qz, qw);
const yaw = extractYawFromMatrix(matrix);
```

**New approach (simple):**
```typescript
// Direct yaw access (1 line)
const heading = normalizeAngle(-sensorValue.yaw * (180 / Math.PI));
```

The rotation sensor already provides `yaw` in radians — no quaternion math needed!

### 3. Smoothing Algorithm

```typescript
const smoothAngle = (current: number, target: number, alpha: number): number => {
  'worklet';
  let delta = target - current;
  
  // Handle 0°/360° wraparound
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  
  return normalizeAngle(current + alpha * delta);
};
```

This exponential smoothing:
- Takes shortest path around the circle
- Handles the 359° → 1° transition smoothly
- `alpha = 0.5` balances responsiveness vs stability

### 4. Animation Pipeline

```typescript
useAnimatedReaction(
  () => {
    // Calculate heading on UI thread
    return normalizeAngle(-sensorValue.yaw * (180 / Math.PI));
  },
  (newHeading) => {
    // Smooth and animate
    smoothedHeading.value = smoothAngle(...);
    dialRotation.value = withSpring(-smoothedHeading.value, {
      damping: 20,
      stiffness: 100,
    });
  }
);
```

The dial rotation uses spring physics for natural movement.

### 5. Target Direction

Two modes are supported:

**Static heading:**
```typescript
<CompassView targetHeading={45} />  // Point northeast
```

**Dynamic GPS-based:**
```typescript
<CompassView 
  targetLocation={{ 
    latitude: 12.2958,
    longitude: 76.6394,
    address: "Datta Peetham, Mysore"
  }} 
/>
```

When `targetLocation` is provided, the component:
1. Requests location permission
2. Watches user's GPS position
3. Calculates bearing to target using the Haversine formula
4. Updates target heading dynamically as user moves

### 6. Alignment Detection

```typescript
const isFacingTarget = 
  effectiveTarget !== null &&
  currentHeading !== null &&
  getAngularDistance(effectiveTarget, currentHeading) <= FACING_THRESHOLD;
```

- `FACING_THRESHOLD = 20°` — considered aligned if within ±20°
- Triggers haptic feedback on first alignment
- Debounced to prevent repeated vibrations

---

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `targetHeading` | `number \| null` | `45` | Static target direction (0-360°) |
| `targetLocation` | `{ latitude, longitude, address? }` | `null` | GPS coordinates to calculate bearing |
| `onAlignmentChange` | `(aligned: boolean) => void` | - | Callback when alignment state changes |
| `hideStatusWhenAligned` | `boolean` | `false` | Hide status bar when facing target |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `react-native-reanimated` | Rotation sensor + animations |
| `expo-sensors` | Magnetometer fallback |
| `expo-haptics` | Vibration feedback |
| `expo-location` | GPS for dynamic targeting |
| `react-native-svg` | Compass dial rendering |

---

## Performance Optimizations

1. **Memoized tick marks**: 72 SVG elements cached with `useMemo`
2. **UI thread processing**: Sensor data processed via Reanimated worklets
3. **Throttled updates**: 20ms interval prevents excessive renders
4. **Conditional location tracking**: Only enabled when `targetLocation` is provided

---

## Troubleshooting

### Compass not updating?

1. Check sensor permissions in app settings
2. Try rotating device in figure-8 pattern to calibrate magnetometer
3. Move away from metal objects or electronics

### Jumpy readings?

- The component auto-switches to magnetometer if rotation sensor fails
- Increase `SMOOTHING_ALPHA` (0.5 → 0.3) for more smoothing
- Ensure device is held flat, not tilted

### Wrong direction?

- Magnetometer may need calibration
- Check for magnetic interference nearby
- Verify `targetHeading` or `targetLocation` values

---

## Summary

The `CompassView` component provides a robust compass implementation that:

1. **Prefers the rotation vector sensor** for accuracy and stability
2. **Falls back to magnetometer** when needed
3. **Uses direct yaw extraction** instead of complex quaternion math
4. **Animates smoothly** with spring physics
5. **Supports both static and GPS-based targeting**

This simplified implementation reduces code from ~580 lines to ~320 lines while maintaining all functionality.

