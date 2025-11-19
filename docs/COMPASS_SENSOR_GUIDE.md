# Compass Sensor Guide

This guide explains the enhanced CompassView component that supports both rotation vector and magnetometer sensors with automatic fallback functionality.

## Features

### Dual Sensor Support
- **Rotation Vector Sensor (Primary)**: Uses device's rotation vector sensor for more accurate and stable compass readings
- **Magnetometer Sensor (Fallback)**: Falls back to magnetometer when rotation vector is unavailable

### Automatic Fallback
- The component automatically detects if the rotation vector sensor is available
- If rotation vector fails or is unavailable, it seamlessly switches to magnetometer
- Visual indicator shows which sensor is currently active

### Smooth Animations
- Uses react-native-reanimated for smooth, performant animations
- Exponential smoothing reduces noise and jitter
- Spring animations for natural compass movement

## Usage

### Basic Usage
```typescript
import CompassView from './components/CompassView';

// Default behavior (rotation vector with magnetometer fallback)
<CompassView targetHeading={45} />
```

### Force Specific Sensor
```typescript
// Force magnetometer only
<CompassView 
  targetHeading={45} 
  sensorType="magnetometer" 
/>

// Force rotation vector only (no fallback)
<CompassView 
  targetHeading={45} 
  sensorType="rotation" 
/>
```

### With Location-Based Targeting
```typescript
const targetLocation = {
  latitude: 12.2958,
  longitude: 76.6394,
  address: "Datta Peetham, Mysore"
};

<CompassView 
  targetLocation={targetLocation}
  onAlignmentChange={(aligned) => {
    console.log('User is aligned:', aligned);
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `targetHeading` | `number \| null` | `45` | Static target heading in degrees (0-360) |
| `targetLocation` | `Coordinates & { address?: string } \| null` | `null` | Dynamic target location (overrides targetHeading) |
| `sensorType` | `'rotation' \| 'magnetometer'` | `'rotation'` | Preferred sensor type |
| `onAlignmentChange` | `(aligned: boolean) => void` | `undefined` | Callback when alignment status changes |
| `hideStatusWhenAligned` | `boolean` | `false` | Hide status container when aligned |

## Sensor Comparison

### Rotation Vector Sensor
**Advantages:**
- More accurate and stable readings
- Less affected by magnetic interference
- Smoother compass movement
- Better performance in buildings and around metal objects

**Disadvantages:**
- Not available on all devices
- May consume slightly more battery
- Requires device motion for initial calibration

### Magnetometer Sensor
**Advantages:**
- Available on virtually all devices
- Works immediately without calibration
- Lower battery consumption
- Reliable baseline functionality

**Disadvantages:**
- Affected by magnetic interference
- May require manual calibration
- Can be jittery in some environments
- Less accurate near metal objects

## Implementation Details

### Sensor Detection
The component automatically detects sensor availability:
```typescript
const rotationSensor = useAnimatedSensor(SensorType.ROTATION, {
  interval: 20,
});

// Auto-fallback on error
try {
  // Process rotation sensor data
} catch (error) {
  console.warn('Rotation sensor error:', error);
  setIsRotationSensorAvailable(false);
  setCurrentSensorType('magnetometer');
}
```

### Smooth Angle Transitions
Special handling for 0/360 degree wraparound:
```typescript
const smoothAngle = (currentAngle: number, targetAngle: number, alpha: number) => {
  'worklet';
  let delta = targetAngle - currentAngle;
  
  // Handle wraparound
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  
  return (currentAngle + alpha * delta + 360) % 360;
};
```

### Performance Optimizations
- Worklet functions for smooth animations
- Throttled updates to prevent excessive renders
- Spring animations with optimized damping and stiffness
- Minimal re-renders using shared values

## Testing

Use the `SensorTestView` component to test sensor switching:
```typescript
import SensorTestView from './components/SensorTestView';

// Provides buttons to switch sensors and change target headings
<SensorTestView />
```

## Troubleshooting

### Rotation Vector Not Working
- Ensure device supports rotation vector sensor
- Check if device has gyroscope and accelerometer
- Move device slightly to initialize sensor
- Check console for error messages

### Magnetometer Interference
- Move away from metal objects
- Calibrate compass by rotating device in figure-8 pattern
- Check for nearby magnetic fields
- Use rotation vector sensor if available

### Performance Issues
- Reduce update interval if needed
- Check for memory leaks in sensor subscriptions
- Verify proper cleanup in useEffect hooks
- Monitor battery usage during testing

## Dependencies

- `react-native-reanimated`: For smooth animations and sensor access
- `react-native-sensors`: For magnetometer fallback
- `react-native-svg`: For compass visualization
- `react-native-haptic-feedback`: For alignment feedback
- `react-native-geolocation-service`: For location-based targeting 