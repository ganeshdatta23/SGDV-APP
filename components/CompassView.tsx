import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Svg, { Circle, Text as SvgText, Line, Polygon, G } from 'react-native-svg';
import Animated, {
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  SensorType,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Coordinates, calculateBearing } from '../utils/locationUtils';

const AnimatedG = Animated.createAnimatedComponent(G);
const { width, height } = Dimensions.get('window');

interface CompassViewProps {
  targetHeading?: number | null;
  /** If provided, the component will compute the bearing from the user's
   * current location to this destination and override targetHeading. */
  targetLocation?: Coordinates & { address?: string } | null;
  /** Notifies parent whenever alignment status toggles */
  onAlignmentChange?: (aligned: boolean) => void;
  /** Hide status container when aligned (for video overlay) */
  hideStatusWhenAligned?: boolean;
  /** Choose sensor type: 'rotation' (default) or 'magnetometer' */
  sensorType?: 'rotation' | 'magnetometer';
}

const FACING_THRESHOLD_DEGREES = 20; // Reasonable threshold for alignment
const COMPASS_REFRESH_INTERVAL = 50; // milliseconds

// Utility function to convert quaternion to rotation matrix
const quaternionToRotationMatrix = (qx: number, qy: number, qz: number, qw: number) => {
  'worklet';
  
  // Normalize quaternion
  const norm = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
  const x = qx / norm;
  const y = qy / norm;
  const z = qz / norm;
  const w = qw / norm;

  // Convert to 3x3 rotation matrix
  const matrix = [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)
  ];

  return matrix;
};

// Extract yaw (heading) from rotation matrix
const extractYawFromMatrix = (matrix: number[]) => {
  'worklet';
  // Extract yaw from rotation matrix (Z-axis rotation)
  const yaw = Math.atan2(matrix[3], matrix[0]);
  return (yaw * 180 / Math.PI + 360) % 360;
};

// Smooth angle transitions to handle 0/360 degree wraparound
const smoothAngle = (currentAngle: number, targetAngle: number, alpha: number) => {
  'worklet';
  let delta = targetAngle - currentAngle;
  
  // Handle wraparound
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  
  return (currentAngle + alpha * delta + 360) % 360;
};

export default function CompassView({ 
  targetHeading: propTargetHeading = 45, 
  targetLocation = null, 
  onAlignmentChange, 
  hideStatusWhenAligned = false,
  sensorType = 'rotation'
}: CompassViewProps) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isRotationSensorAvailable, setIsRotationSensorAvailable] = useState(true);
  const [currentSensorType, setCurrentSensorType] = useState<'rotation' | 'magnetometer'>(sensorType);
  
  // Track if we've already triggered haptics for current alignment
  const hasTriggeredHapticsRef = useRef(false);
  
  // Shared values for reanimated
  const heading = useSharedValue<number | null>(null);
  const dialRotation = useSharedValue(0);
  const smoothedHeading = useSharedValue<number | null>(null);
  
  // Magnetometer fallback states
  const [magnetometerHeading, setMagnetometerHeading] = useState<number | null>(null);
  const [currentHeadingState, setCurrentHeadingState] = useState<number | null>(null);
  const prevHeadingRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const SMOOTHING_ALPHA = 0.5;

  // Try to use rotation sensor first
  const rotationSensor = useAnimatedSensor(SensorType.ROTATION, {
    interval: 20,
  });

  // Process rotation sensor data
  const rotationHeading = useDerivedValue(() => {
    if (!isRotationSensorAvailable || currentSensorType !== 'rotation') {
      return null;
    }

    try {
      const sensorData = rotationSensor.sensor.value;
      const { qx, qy, qz, qw } = sensorData;
      
      // Check if we have valid quaternion data
      if (qx === 0 && qy === 0 && qz === 0 && qw === 0) {
        return null;
      }

      // Convert quaternion to rotation matrix
      const matrix = quaternionToRotationMatrix(qx, qy, qz, qw);
      
      // Extract yaw (heading) from rotation matrix
      const yaw = extractYawFromMatrix(matrix);
      
      return yaw;
    } catch (error) {
      console.warn('Rotation sensor error:', error);
      // Switch to magnetometer fallback
      runOnJS(setIsRotationSensorAvailable)(false);
      runOnJS(setCurrentSensorType)('magnetometer');
      return null;
    }
  }, [isRotationSensorAvailable, currentSensorType]);

  // Update heading and smooth it
  useDerivedValue(() => {
    const newHeading = rotationHeading.value;
    
    if (newHeading !== null && isRotationSensorAvailable && currentSensorType === 'rotation') {
      if (smoothedHeading.value === null) {
        smoothedHeading.value = newHeading;
      } else {
        smoothedHeading.value = smoothAngle(smoothedHeading.value, newHeading, SMOOTHING_ALPHA);
      }
      
      heading.value = smoothedHeading.value;
      dialRotation.value = withSpring(-smoothedHeading.value, {
        damping: 20,
        stiffness: 100,
      });
    }
  }, [rotationHeading, isRotationSensorAvailable, currentSensorType]);

  // Sync heading shared value to React state for render logic
  useAnimatedReaction(
    () => heading.value,
    (currentValue) => {
      if (currentValue !== null) {
        runOnJS(setCurrentHeadingState)(currentValue);
      }
    },
    [heading]
  );

  // Magnetometer fallback
  useEffect(() => {
    if (currentSensorType !== 'magnetometer') {
      return;
    }

    // Set update interval for magnetometer
    Magnetometer.setUpdateInterval(COMPASS_REFRESH_INTERVAL);

    const subscription = Magnetometer.addListener(({ x, y, z }) => {
      // Throttle updates to prevent excessive animations
      const now = Date.now();
      if (now - lastUpdateTime.current < COMPASS_REFRESH_INTERVAL) {
        return;
      }
      lastUpdateTime.current = now;

      // Calculate heading from magnetometer data
      // Fix coordinate system: atan2(-x, y) for correct magnetic north alignment
      const angle = Math.atan2(-x, y) * (180 / Math.PI);
      const rawHeading = (angle + 360) % 360;

      // --- Exponential smoothing to reduce noise & jitter ---
      const prev = prevHeadingRef.current;
      let smoothedMagHeading: number;

      if (prev === null) {
        smoothedMagHeading = rawHeading;
      } else {
        // Compute the shortest angular distance (-180..180] then apply smoothing.
        const difference = ((rawHeading - prev + 540) % 360) - 180;
        smoothedMagHeading = (prev + SMOOTHING_ALPHA * difference + 360) % 360;
      }

      prevHeadingRef.current = smoothedMagHeading;
      setMagnetometerHeading(smoothedMagHeading);
      
      // Update reanimated values
      heading.value = smoothedMagHeading;
      dialRotation.value = withSpring(-smoothedMagHeading, {
        damping: 20,
        stiffness: 100,
      });
    });

    return () => subscription.remove();
  }, [currentSensorType, heading, dialRotation]);

  // Auto-fallback mechanism: if rotation sensor fails, switch to magnetometer
  useEffect(() => {
    if (sensorType === 'rotation' && !isRotationSensorAvailable) {
      console.log('Rotation sensor unavailable, falling back to magnetometer');
      setCurrentSensorType('magnetometer');
    }
  }, [isRotationSensorAvailable, sensorType]);

  // Request location permissions using expo-location
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Subscribe to user location if targetLocation is provided
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startLocationUpdates = async () => {
      if (!targetLocation) return; // No need to request location if we only have static heading
      
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        console.warn('Permission to access location was denied');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1, // meters
          timeInterval: 1000, // milliseconds
        },
        (position: Location.LocationObject) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      );
    };

    startLocationUpdates();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [targetLocation]);

  // Compute dynamic target heading whenever either location updates
  const dynamicTargetHeading = React.useMemo(() => {
    if (targetLocation && userLocation) {
      return calculateBearing(
        userLocation.latitude,
        userLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );
    }
    return null;
  }, [targetLocation, userLocation]);

  // Choose which heading to guide towards
  const effectiveTargetHeading = dynamicTargetHeading ?? propTargetHeading;

  // Get current heading value for calculations - use state instead of shared value
  const currentHeading = currentSensorType === 'rotation' ? currentHeadingState : magnetometerHeading;

  // Determine if facing target direction
  const isFacingTarget = 
    effectiveTargetHeading !== null && currentHeading !== null &&
    Math.min(
      Math.abs(effectiveTargetHeading - currentHeading),
      360 - Math.abs(effectiveTargetHeading - currentHeading)
    ) <= FACING_THRESHOLD_DEGREES;

  // Notify parent when alignment state changes
  useEffect(() => {
    if (onAlignmentChange) {
      onAlignmentChange(isFacingTarget);
    }
    
    // Handle haptics - only trigger once when first becoming aligned
    if (isFacingTarget && !hasTriggeredHapticsRef.current) {
      // Trigger haptic feedback
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      hasTriggeredHapticsRef.current = true;
      
      // Reset haptics flag after 2 seconds
      setTimeout(() => {
        hasTriggeredHapticsRef.current = false;
      }, 2000);
    } else if (!isFacingTarget) {
      // Reset the haptics flag when no longer aligned
      hasTriggeredHapticsRef.current = false;
    }
  }, [isFacingTarget, onAlignmentChange]);

  // Larger dial: use 85% of the smaller screen dimension (previously 70%)
  const compassSize = Math.min(width, height) * 0.72;
  const compassRadius = compassSize / 2;
  const centerX = compassSize / 2;
  const centerY = compassSize / 2;

  // Reanimated dial rotation style
  const dialRotateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${dialRotation.value}deg`,
        },
      ],
    };
  });

  // Generate degree markings
  const renderDegreeMarkings = () => {
    const markings = [];
    
    // Tick marks every 5°
    for (let i = 0; i < 360; i += 5) {
      const isCardinal = i % 90 === 0;
      const isMajor = i % 30 === 0;
      const markLength = isCardinal ? 20 : isMajor ? 15 : 6; // minor tick shorter
      const strokeWidth = isCardinal ? 3 : isMajor ? 1.5 : 1;
      
      const startRadius = compassRadius - 10;
      const endRadius = startRadius - markLength;
      
      const startX = centerX + startRadius * Math.sin((i * Math.PI) / 180);
      const startY = centerY - startRadius * Math.cos((i * Math.PI) / 180);
      const endX = centerX + endRadius * Math.sin((i * Math.PI) / 180);
      const endY = centerY - endRadius * Math.cos((i * Math.PI) / 180);
      
      markings.push(
        <Line
          key={`mark-${i}`}
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#000000"
          strokeWidth={strokeWidth}
        />
      );
    }
    return markings;
  };

  // Compute align turn instruction
  const getTurnInstruction = () => {
    if (effectiveTargetHeading === null || currentHeading === null) return "--";
    let delta = ((effectiveTargetHeading - currentHeading + 540) % 360) - 180; // [-180,180]
    const absDelta = Math.abs(delta);
    if (absDelta <= FACING_THRESHOLD_DEGREES) return "Aligned ✓";
    const arrow = delta > 0 ? "→" : "←";
    const dirWord = delta > 0 ? "right" : "left";
    return `Turn ${arrow} ${dirWord} ${absDelta.toFixed(0)}°`;
  };



  return (
    <View style={styles.container}>
      {/* Turn instruction above compass */}
      <View style={styles.turnContainer}>
        <Text style={styles.turnText}>{getTurnInstruction()}</Text>
        {/* Sensor type indicator */}
        <Text style={styles.sensorText}>
          {currentSensorType === 'rotation' ? '🔄 Rotation Vector' : '🧭 Magnetometer'}
        </Text>
      </View>

      {/* Compass Visual */}
      <View style={styles.compassContainer}>
        {/* Fixed Phone Orientation Marker at Top */}
        <View style={styles.phoneMarker}>
          <Svg width="40" height="60">
            <Line
              x1="20"
              y1="15"
              x2="20"
              y2="43"
              stroke="#00ff00"
              strokeWidth="3"
            />
          </Svg>
        </View>

        {/* Rotating Compass Dial */}
        <Animated.View style={[styles.compassDial, dialRotateStyle]}>
          <Svg width={compassSize + 50} height={compassSize + 50} style={styles.compass}>
            {/* Outer circle (no fill for minimal look) */}
            <Circle
              cx={(compassSize + 50) / 2}
              cy={(compassSize + 50) / 2}
              r={compassRadius - 10}
              stroke="#000000"
              strokeWidth="2"
              fill="none"
            />

            {/* Center HUD dot */}
            <Circle
              cx={(compassSize + 50) / 2}
              cy={(compassSize + 50) / 2}
              r="6"
              fill="#000000"
            />
            
            {/* Degree markings and numbers */}
            <G transform={`translate(25, 25)`}>
              {renderDegreeMarkings()}
            </G>
            
            {/* Target direction indicator on perimeter */}
            {effectiveTargetHeading !== null && (
              <G transform={`translate(25, 25)`}>
                <G transform={`rotate(${effectiveTargetHeading} ${centerX} ${centerY})`}>
                  <Circle
                    cx={centerX}
                    cy={15}
                    r="8"
                    fill={isFacingTarget ? '#00ff00' : '#ffff00'}
                    stroke="#000000"
                    strokeWidth="2"
                  />
                </G>
              </G>
            )}

            {/* Cardinal directions – they orbit with the dial (since they are inside) but
                each label counter-rotates so text stays horizontal */}
            {['N','E','S','W'].map((dir, idx) => {
              // 0°=N, 90°=E, 180°=S, 270°=W
              const angle = idx * 90;
              // Place labels on an inner ring to avoid colliding with external UI
              const labelRadius = compassRadius - 53; // 50px inside the outer rim
              const labelX = (compassSize + 50) / 2 + labelRadius * Math.sin((angle * Math.PI) / 180);
              const labelY = (compassSize + 50) / 2 - labelRadius * Math.cos((angle * Math.PI) / 180) + (dir==='N'?0:8);

              const color = '#000000';
              const fontSize = dir === 'N' ? 24 : 24;

              return (
                <SvgText
                  key={dir}
                  x={labelX}
                  y={labelY}
                  fontSize={fontSize}
                  fill={color}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {dir}
                </SvgText>
              );
            })}

          </Svg>
        </Animated.View>
      </View>

      {/* Status indicators */}
      {!(hideStatusWhenAligned && isFacingTarget) && (
        <View style={styles.statusContainer}>
          <Text style={styles.locationText}>
            {"📍 " + (targetLocation?.address || 'Datta Peetham, Mysore')}
          </Text>
          <Text style={styles.statusText}>
            Sunrise time: 05:00 AM
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  turnText: {
    fontSize: 23,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 0
  },
  sensorText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 5,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    marginBottom: 120,
    position: 'relative',
  },
  turnContainer: {
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 0,
  },
  phoneMarker: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
  },
  compassDial: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compass: {
    backgroundColor: 'transparent',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 0,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  locationText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 1,
    fontWeight: '500',
    color: '#FFFFFF',
  },
}); 