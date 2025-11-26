import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Svg, { Circle, Text as SvgText, Line, Polygon, G, Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
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

// ============================================================================
// COMPASS CONFIGURATION
// ============================================================================

// Compass size and layout parameters
export interface CompassConfig {
  // Size & Layout
  compassSizeRatio: number;          // Ratio of screen size (0.72 = 72% of screen)
  centerHubSizeRatio: number;        // Ratio of compass radius (0.35 = 35% of radius)
  
  // Tick Marks
  cardinalTickLength: number;        // Length of N, E, S, W ticks (from edge)
  semiCardinalTickLength: number;    // Length of 30° ticks
  minorTickLength: number;           // Length of 5° ticks
  cardinalTickWidth: number;         // Stroke width for cardinal ticks
  minorTickWidth: number;            // Stroke width for minor ticks
  
  // Font Sizes
  cardinalNorthFontSize: number;     // North marker font size
  cardinalOtherFontSize: number;     // E, S, W font size
  centerLabelFontSize: number;       // "HEADING" label font size
  centerValueFontSize: number;       // Degree value font size
  targetBearingFontSize: number;     // Target arrow bearing font size
  turnInstructionIconSize: number;   // Turn arrow icon size
  turnInstructionTextSize: number;   // Turn instruction text size
  statusTextSize: number;            // Bottom status text size
  locationTextSize: number;          // Location name text size
  
  // Spacing & Padding
  turnContainerPaddingH: number;     // Horizontal padding for turn instruction
  turnContainerPaddingV: number;     // Vertical padding for turn instruction
  turnContainerMarginBottom: number; // Space below turn instruction
  compassMarginBottom: number;       // Space below compass
  statusContainerPaddingH: number;   // Horizontal padding for status
  statusContainerPaddingV: number;   // Vertical padding for status
  statusContainerMargin: number;     // Margin from edges
  statusContainerBottom: number;     // Distance from bottom
  
  // Glow Effects
  glowRingOffset: number;            // Distance of glow ring from compass edge
  glowRingWidth: number;             // Stroke width of glow effect
  
  // Sensor & Animation
  facingThresholdDegrees: number;    // Degrees to consider "aligned" (20 = ±20°)
  compassRefreshInterval: number;    // Milliseconds between updates
  smoothingAlpha: number;            // 0-1, smoothing factor (0.8 = 80% new, 20% old)
  rotationSpringDamping: number;     // Spring animation damping
  rotationSpringStiffness: number;   // Spring animation stiffness
  magnetometerSpringDamping: number; // Magnetometer spring damping
  magnetometerSpringStiffness: number; // Magnetometer spring stiffness
  
  // Border Radii
  turnContainerRadius: number;       // Border radius for turn instruction
  statusContainerRadius: number;     // Border radius for status container
}

// Default configuration
export const DEFAULT_COMPASS_CONFIG: CompassConfig = {
  // Size & Layout
  compassSizeRatio: 0.67,
  centerHubSizeRatio: 0.35,
  
  // Tick Marks
  cardinalTickLength: 20,
  semiCardinalTickLength: 12,
  minorTickLength: 6,
  cardinalTickWidth: 2.5,
  minorTickWidth: 0.8,
  
  // Font Sizes
  cardinalNorthFontSize: 18,
  cardinalOtherFontSize: 14,
  centerLabelFontSize: 8,
  centerValueFontSize: 28,
  targetBearingFontSize: 12,
  turnInstructionIconSize: 25,
  turnInstructionTextSize: 16,
  statusTextSize: 10,
  locationTextSize: 15,
  
  // Spacing & Padding
  turnContainerPaddingH: 22,
  turnContainerPaddingV: 12,
  turnContainerMarginBottom: 30,
  compassMarginBottom: 80,
  statusContainerPaddingH: 20,
  statusContainerPaddingV: 16,
  statusContainerMargin: 20,
  statusContainerBottom: 40,
  
  // Glow Effects
  glowRingOffset: 5,
  glowRingWidth: 3,
  
  // Sensor & Animation
  facingThresholdDegrees: 20,
  compassRefreshInterval: 30,
  smoothingAlpha: 0.8,
  rotationSpringDamping: 1000,
  rotationSpringStiffness: 1000,
  magnetometerSpringDamping: 20,
  magnetometerSpringStiffness: 100,
  
  // Border Radii
  turnContainerRadius: 50,
  statusContainerRadius: 30,
};

// ============================================================================
// THEME CONFIGURATION
// ============================================================================
// Set this to 'light' for orange/yellow gradient background (sunrise theme)
// Set this to 'dark' for dark stone/black background (night theme)
// Set this to 'cosmic' for red-black cosmic gradient (from archive demo_sgvd_ui_5)
export type ThemeMode = 'light' | 'dark' | 'cosmic';

export const COMPASS_THEME: ThemeMode = 'cosmic'; // Change this to switch themes

// Theme color palettes
export const THEMES = {
  light: {
    // For orange/yellow gradient backgrounds
    dialBackground: 'rgba(0, 0, 0, 0.15)',      // Semi-transparent dark
    dialStroke: 'rgba(255, 255, 255, 0.25)',    // Light border
    tickMajor: '#FFFFFF',                        // White cardinal ticks
    tickMinor: 'rgba(255, 255, 255, 0.35)',     // Semi-transparent minor ticks
    northColor: '#ef4444',                       // Red for North
    cardinalColor: '#FFFFFF',                    // White for E, S, W
    centerHubBg: 'rgba(0, 0, 0, 0.35)',         // Semi-transparent center
    centerHubStroke: 'rgba(255, 255, 255, 0.2)',
    headingLabel: 'rgba(255, 255, 255, 0.7)',
    headingValue: '#FFFFFF',
    gold: '#fbbf24',                             // Gold/amber for target
    emerald: '#34d399',                          // Emerald for aligned
    emeraldGlow: '#10b981',
    turnContainerBg: 'rgba(0, 0, 0, 0.25)',
    turnContainerBorder: 'rgba(255, 255, 255, 0.2)',
    turnContainerAlignedBg: 'rgba(6, 78, 59, 0.4)',
    turnContainerAlignedBorder: 'rgba(52, 211, 153, 0.5)',
    statusBg: 'rgba(0, 0, 0, 0.35)',
    statusBorder: 'rgba(255, 255, 255, 0.15)',
    statusText: 'rgba(255, 255, 255, 0.85)',
    phoneMarkerFill: '#FFFFFF',
    phoneMarkerStroke: 'rgba(0, 0, 0, 0.3)',
  },
  dark: {
    // For dark backgrounds (stone/black)
    dialBackground: 'rgba(28, 25, 23, 0.85)',    // Dark stone background
    dialStroke: '#444444',                        // Stone border
    tickMajor: '#FCD34D',                        // Gold cardinal ticks
    tickMinor: '#57534e',                        // Stone minor ticks
    northColor: '#ef4444',                       // Red for North
    cardinalColor: '#a8a29e',                    // Stone gray for E, S, W
    centerHubBg: 'rgba(10, 10, 10, 0.95)',      // Near-black center
    centerHubStroke: '#44403c',
    headingLabel: '#78716c',
    headingValue: '#FFFFFF',
    gold: '#fbbf24',
    emerald: '#34d399',
    emeraldGlow: '#10b981',
    turnContainerBg: 'rgba(28, 25, 23, 0.6)',
    turnContainerBorder: '#44403c',
    turnContainerAlignedBg: 'rgba(6, 78, 59, 0.3)',
    turnContainerAlignedBorder: 'rgba(16, 185, 129, 0.5)',
    statusBg: 'rgba(28, 25, 23, 0.8)',
    statusBorder: '#44403c',
    statusText: '#e7e5e4',
    phoneMarkerFill: '#FFFFFF',
    phoneMarkerStroke: '#78716c',
  },
  cosmic: {
    // For red-black cosmic gradient backgrounds (from archive demo_sgvd_ui_5)
    // Amber-700/90 → rose-950 → slate-950 gradient
    dialBackground: 'rgba(76, 5, 25, 0.7)',      // Rose-950 with transparency
    dialStroke: 'rgba(251, 191, 36, 0.4)',       // Amber-400 border
    tickMajor: '#fbbf24',                        // Amber-400 cardinal ticks
    tickMinor: 'rgba(251, 191, 36, 0.3)',        // Amber with opacity for minor ticks
    northColor: '#ef4444',                       // Red for North
    cardinalColor: '#fef3c7',                    // Amber-100 for E, S, W
    centerHubBg: 'rgba(2, 6, 23, 0.9)',          // Slate-950 center
    centerHubStroke: 'rgba(251, 191, 36, 0.3)',  // Amber border
    headingLabel: '#d97706',                     // Amber-600
    headingValue: '#FFFFFF',
    gold: '#fbbf24',                             // Amber-400
    emerald: '#34d399',
    emeraldGlow: '#10b981',
    turnContainerBg: 'rgba(76, 5, 25, 0.5)',     // Rose-950 bg
    turnContainerBorder: 'rgba(251, 191, 36, 0.4)',
    turnContainerAlignedBg: 'rgba(6, 78, 59, 0.4)',
    turnContainerAlignedBorder: 'rgba(52, 211, 153, 0.5)',
    statusBg: 'rgba(2, 6, 23, 0.8)',             // Slate-950 bg
    statusBorder: 'rgba(251, 191, 36, 0.3)',
    statusText: '#fef3c7',                       // Amber-100
    phoneMarkerFill: '#FFFFFF',
    phoneMarkerStroke: 'rgba(251, 191, 36, 0.5)',
  },
};

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
  /** Theme mode override - defaults to COMPASS_THEME global */
  theme?: ThemeMode;
  /** Compass configuration - customize sizes, fonts, spacing, etc. */
  config?: Partial<CompassConfig>;
}

// These constants are now moved to config, kept here for backward compatibility if needed

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

// Extract yaw (heading) from rotation matrix with tilt compensation
const extractYawFromMatrix = (matrix: number[]) => {
  'worklet';
  
  // Rotation matrix layout:
  // [m0  m1  m2]   [R00 R01 R02]
  // [m3  m4  m5] = [R10 R11 R12]
  // [m6  m7  m8]   [R20 R21 R22]
  
  // Extract pitch and roll first for proper tilt compensation
  const pitch = Math.asin(-matrix[6]); // -R20
  const roll = Math.atan2(matrix[7], matrix[8]); // R21 / R22
  
  // Tilt-compensated heading (yaw) calculation
  // Use a more robust formula that handles device orientation properly
  let yaw: number;
  
  // Check for gimbal lock (when pitch is close to ±90°)
  if (Math.abs(matrix[6]) > 0.998) {
    // Gimbal lock case: use alternative calculation
    yaw = Math.atan2(-matrix[1], matrix[4]);
  } else {
    // Normal case: standard tilt-compensated heading
    yaw = Math.atan2(matrix[3], matrix[0]);
  }
  
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
  sensorType = 'rotation',
  theme = COMPASS_THEME,
  config: userConfig,
}: CompassViewProps) {
  // Merge user config with defaults
  const config = { ...DEFAULT_COMPASS_CONFIG, ...userConfig };
  
  // Get theme colors
  const colors = THEMES[theme];
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isRotationSensorAvailable, setIsRotationSensorAvailable] = useState(true);
  const [currentSensorType, setCurrentSensorType] = useState<'rotation' | 'magnetometer'>(sensorType);
  
  // Track if we've already triggered haptics for current alignment
  const hasTriggeredHapticsRef = useRef(false);
  
  // Shared values for reanimated
  const heading = useSharedValue<number | null>(null);
  const dialRotation = useSharedValue(0);
  const smoothedHeading = useSharedValue<number | null>(null);
  const cumulativeRotation = useSharedValue(0); // Track total rotation (can exceed 360°)
  
  // Magnetometer fallback states
  const [magnetometerHeading, setMagnetometerHeading] = useState<number | null>(null);
  const [currentHeadingState, setCurrentHeadingState] = useState<number | null>(null);
  const prevHeadingRef = useRef<number | null>(null);
  const cumulativeMagRotation = useRef<number>(0); // Track cumulative rotation for magnetometer
  const lastUpdateTime = useRef<number>(0);

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
        // Initialize on first reading
        smoothedHeading.value = newHeading;
        cumulativeRotation.value = -newHeading;
      } else {
        // Store previous smoothed value
        const prevSmoothed = smoothedHeading.value;
        
        // Smooth the heading
        smoothedHeading.value = smoothAngle(smoothedHeading.value, newHeading, config.smoothingAlpha);
        
        // Calculate delta accounting for wraparound
        let delta = smoothedHeading.value - prevSmoothed;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        
        // Add delta to cumulative rotation (accumulates past 360°)
        cumulativeRotation.value -= delta;
      }
      
      heading.value = smoothedHeading.value;

      // dialRotation.value = cumulativeRotation.value;

      // Animate the compass dial rotation with spring physics
      // damping: Controls how quickly the oscillation settles (higher = less bouncy, more controlled)
      // stiffness: Controls how quickly the animation responds to changes (higher = faster response)
      // These values provide smooth, responsive rotation without excessive bounce
      dialRotation.value = withSpring(cumulativeRotation.value, {
        damping: config.rotationSpringDamping,
        stiffness: config.rotationSpringStiffness,
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
    Magnetometer.setUpdateInterval(config.compassRefreshInterval);

    const subscription = Magnetometer.addListener(({ x, y, z }) => {
      // Throttle updates to prevent excessive animations
      const now = Date.now();
      if (now - lastUpdateTime.current < config.compassRefreshInterval) {
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
        // Initialize on first reading
        smoothedMagHeading = rawHeading;
        cumulativeMagRotation.current = -rawHeading;
      } else {
        // Compute the shortest angular distance (-180..180] then apply smoothing.
        const difference = ((rawHeading - prev + 540) % 360) - 180;
        smoothedMagHeading = (prev + config.smoothingAlpha * difference + 360) % 360;
        
        // Calculate delta accounting for wraparound
        let delta = smoothedMagHeading - prev;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        
        // Add delta to cumulative rotation (accumulates past 360°)
        cumulativeMagRotation.current -= delta;
      }

      prevHeadingRef.current = smoothedMagHeading;
      setMagnetometerHeading(smoothedMagHeading);
      
      // Update reanimated values
      heading.value = smoothedMagHeading;
      dialRotation.value = withSpring(cumulativeMagRotation.current, {
        damping: config.magnetometerSpringDamping,
        stiffness: config.magnetometerSpringStiffness,
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
    ) <= config.facingThresholdDegrees;

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

  // Compass size based on config ratio
  const compassSize = Math.min(width, height) * config.compassSizeRatio;
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

  // Generate degree markings (72 ticks, every 5°)
  const renderDegreeMarkings = () => {
    const markings = [];
    
    for (let i = 0; i < 72; i++) {
      const angle = i * 5;
      const isCardinal = i % 18 === 0; // N, E, S, W (0°, 90°, 180°, 270°)
      const isSemi = i % 6 === 0 && !isCardinal; // Every 30° that's not cardinal
      
      // Tick lengths from outer edge
      const outerRadius = compassRadius - 2;
      const innerRadius = isCardinal 
        ? outerRadius - config.cardinalTickLength  // Cardinal ticks longest
        : isSemi 
          ? outerRadius - config.semiCardinalTickLength  // Semi ticks medium
          : outerRadius - config.minorTickLength;  // Minor ticks shortest
      
      const startX = centerX + outerRadius * Math.sin((angle * Math.PI) / 180);
      const startY = centerY - outerRadius * Math.cos((angle * Math.PI) / 180);
      const endX = centerX + innerRadius * Math.sin((angle * Math.PI) / 180);
      const endY = centerY - innerRadius * Math.cos((angle * Math.PI) / 180);
      
      // Colors - use theme colors
      const strokeColor = isCardinal ? colors.tickMajor : colors.tickMinor;
      const strokeWidth = isCardinal ? config.cardinalTickWidth : config.minorTickWidth;
      
      markings.push(
        <Line
          key={`mark-${i}`}
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      );
    }
    return markings;
  };

  // Compute align turn instruction
  const getTurnInstruction = (): { text: string; icon: string } => {
    if (effectiveTargetHeading === null || currentHeading === null) {
      return { text: "--", icon: "" };
    }
    let delta = ((effectiveTargetHeading - currentHeading + 540) % 360) - 180; // [-180,180]
    const absDelta = Math.abs(delta);
    if (absDelta <= config.facingThresholdDegrees) {
      return { text: "Aligned", icon: "↑" };
    }
    if (delta < 0) {
      return { text: "TURN RIGHT", icon: "→" };
    }
    return { text: "TURN LEFT", icon: "←" };
  };

  const instruction = getTurnInstruction();


  return (
    <View style={styles.container}>
      {/* Turn instruction above compass */}
      <View style={[
        styles.turnContainer,
        {
          backgroundColor: isFacingTarget ? colors.turnContainerAlignedBg : colors.turnContainerBg,
          borderColor: isFacingTarget ? colors.turnContainerAlignedBorder : colors.turnContainerBorder,
          paddingHorizontal: config.statusContainerPaddingH,
          paddingVertical: config.turnContainerPaddingV,
          marginBottom: config.turnContainerMarginBottom,
          borderRadius: config.turnContainerRadius,
        }
      ]}>
        <Text style={[
          styles.turnIcon,
          { 
            color: isFacingTarget ? colors.emerald : colors.gold,
            fontSize: config.turnInstructionIconSize,
          }
        ]}>
          {instruction.icon}
        </Text>
        <Text style={[
          styles.turnText,
          { 
            color: isFacingTarget ? colors.emerald : colors.gold,
            fontSize: config.turnInstructionTextSize,
          }
        ]}>
          {instruction.text}
        </Text>
      </View>

      {/* Compass Visual */}
      <View style={[styles.compassContainer, { marginBottom: config.compassMarginBottom }]}>
        {/* Fixed Phone Orientation Marker at Top */}
        <View style={styles.phoneMarker}>
          <Svg width="30" height="40">
            {/* Triangle pointing down into compass */}
            <Polygon
              points="15,35 5,10 25,10"
              fill={colors.phoneMarkerFill}
              stroke={colors.phoneMarkerStroke}
              strokeWidth="1"
            />
          </Svg>
        </View>

        {/* Rotating Compass Dial */}
        <Animated.View style={[styles.compassDial, dialRotateStyle]}>
          <Svg width={compassSize + 50} height={compassSize + 50} style={styles.compass}>
            <Defs>
              <LinearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={isFacingTarget ? colors.emerald : colors.gold} stopOpacity="0.6" />
                <Stop offset="100%" stopColor={isFacingTarget ? colors.emeraldGlow : colors.gold} stopOpacity="0.2" />
              </LinearGradient>
            </Defs>

            {/* Outer glow ring when aligned */}
            {isFacingTarget && (
              <Circle
                cx={(compassSize + 50) / 2}
                cy={(compassSize + 50) / 2}
                r={compassRadius + config.glowRingOffset}
                fill="none"
                stroke={colors.emerald}
                strokeWidth={config.glowRingWidth}
                opacity={0.5}
              />
            )}

            {/* Background Disc - Semi-transparent to show gradient behind */}
            <Circle
              cx={(compassSize + 50) / 2}
              cy={(compassSize + 50) / 2}
              r={compassRadius}
              fill={colors.dialBackground}
              stroke={colors.dialStroke}
              strokeWidth="1"
            />
            
            {/* Degree markings */}
            <G transform={`translate(25, 25)`}>
              {renderDegreeMarkings()}
            </G>

            {/* Cardinal directions */}
            <G transform={`translate(25, 25)`}>
              {/* N - Red with glow effect */}
              <SvgText
                x={centerX}
                y={centerY - compassRadius + 45}
                fontSize={config.cardinalNorthFontSize}
                fill={colors.northColor}
                textAnchor="middle"
                fontWeight="bold"
              >
                N
              </SvgText>
              {/* E */}
              <SvgText
                x={centerX + compassRadius - 40}
                y={centerY + 6}
                fontSize={config.cardinalOtherFontSize}
                fill={colors.cardinalColor}
                textAnchor="middle"
                fontWeight="600"
              >
                E
              </SvgText>
              {/* S */}
              <SvgText
                x={centerX}
                y={centerY + compassRadius - 30}
                fontSize={config.cardinalOtherFontSize}
                fill={colors.cardinalColor}
                textAnchor="middle"
                fontWeight="600"
              >
                S
              </SvgText>
              {/* W */}
              <SvgText
                x={centerX - compassRadius + 40}
                y={centerY + 6}
                fontSize={config.cardinalOtherFontSize}
                fill={colors.cardinalColor}
                textAnchor="middle"
                fontWeight="600"
              >
                W
              </SvgText>
            </G>

            {/* Target Pointer Arrow */}
            {effectiveTargetHeading !== null && (
              <G transform={`translate(25, 25)`}>
                <G transform={`rotate(${effectiveTargetHeading} ${centerX} ${centerY})`}>
                  {/* Arrow pointer */}
                  <Path
                    d={`M${centerX} ${centerY - compassRadius + 15} 
                        L${centerX + 12} ${centerY - compassRadius + 55} 
                        L${centerX} ${centerY - compassRadius + 45} 
                        L${centerX - 12} ${centerY - compassRadius + 55} Z`}
                    fill={isFacingTarget ? colors.emerald : colors.gold}
                    stroke={isFacingTarget ? '#a7f3d0' : colors.phoneMarkerFill}
                    strokeWidth="1.5"
                  />
                </G>
              </G>
            )}

            {/* Center Hub */}
            <Circle
              cx={(compassSize + 50) / 2}
              cy={(compassSize + 50) / 2}
              r={compassRadius * config.centerHubSizeRatio}
              fill={colors.centerHubBg}
              stroke={colors.centerHubStroke}
              strokeWidth="1"
              opacity={0.95}
            />

            {/* Center Hub Content */}
            <G transform={`translate(${(compassSize + 50) / 2}, ${(compassSize + 50) / 2})`}>
              {/* Heading Label */}
              <SvgText
                x={0}
                y={-25}
                fontSize={config.centerLabelFontSize}
                fill={colors.headingLabel}
                textAnchor="middle"
                letterSpacing={2}
              >
                HEADING
              </SvgText>
              {/* Heading Value */}
              <SvgText
                x={0}
                y={5}
                fontSize={config.centerValueFontSize}
                fill={colors.headingValue}
                textAnchor="middle"
                fontWeight="bold"
              >
                {currentHeading !== null ? `${Math.round(currentHeading)}°` : '--'}
              </SvgText>
              {/* Divider line */}
              <Line
                x1={-30}
                y1={15}
                x2={30}
                y2={15}
                stroke={colors.headingValue}
                strokeWidth="0.5"
                opacity={0.2}
              />
              {/* Target bearing */}
              <SvgText
                x={0}
                y={35}
                fontSize={config.targetBearingFontSize}
                fill={isFacingTarget ? colors.emerald : colors.gold}
                textAnchor="middle"
                fontWeight="bold"
              >
                {effectiveTargetHeading !== null ? `▲ ${Math.round(effectiveTargetHeading)}°` : '--'}
              </SvgText>
            </G>

          </Svg>
        </Animated.View>
      </View>

      {/* Status indicators */}
      {!(hideStatusWhenAligned && isFacingTarget) && (
        <View style={[
          styles.statusContainer,
          {
            backgroundColor: colors.statusBg,
            borderColor: colors.statusBorder,
            paddingHorizontal: config.statusContainerPaddingH,
            paddingVertical: config.statusContainerPaddingV,
            borderRadius: config.statusContainerRadius,
            bottom: config.statusContainerBottom,
            left: config.statusContainerMargin,
            right: config.statusContainerMargin,
          }
        ]}>
          <Text style={[
            styles.locationText, 
            { 
              color: colors.statusText,
              fontSize: config.locationTextSize,
            }
          ]}>
            {"📍 " + (targetLocation?.address || 'Datta Peetham, Mysore')}
          </Text>
          <Text style={[
            styles.statusText, 
            { 
              color: colors.statusText, 
              opacity: 0.8,
              fontSize: config.statusTextSize,
            }
          ]}>
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
  turnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    marginTop: -45,
    // Padding, margins, colors, and sizing applied dynamically via inline styles
  },
  turnIcon: {
    fontWeight: 'bold',
    // Font size and color applied dynamically
  },
  turnText: {
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
    // Font size and color applied dynamically
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    position: 'relative',
    // Margin bottom applied dynamically via inline styles
  },
  phoneMarker: {
    position: 'absolute',
    top: -25,
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
    alignItems: 'center',
    borderWidth: 1,
    // Padding, margins, colors, and sizing applied dynamically via inline styles
  },
  // location status text
  statusText: {
    textAlign: 'center',
    marginVertical: 0,
    fontWeight: '400',
    // Font size and color applied dynamically
  },
  locationText: {
    textAlign: 'center',
    marginVertical: 2,
    fontWeight: '500',
    // Font size and color applied dynamically
  },
}); 