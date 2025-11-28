import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText, Line, Polygon, G, Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import { Coordinates, calculateBearing, calculateDistance } from '../utils/locationUtils';

const AnimatedG = Animated.createAnimatedComponent(G);
const { width, height } = Dimensions.get('window');

interface CardinalDirectionProps {
  dir: string;
  x: number;
  y: number;
  rotation: SharedValue<number>;
  color: string;
  fontSize: number;
  fontWeight: string;
}

const CardinalDirection = ({ dir, x, y, rotation, color, fontSize, fontWeight }: CardinalDirectionProps) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      rotation: -rotation.value,
    };
  });

  return (
    <AnimatedG
      animatedProps={animatedProps}
      originX={x}
      originY={y}
    >
      <SvgText
        x={x}
        y={y}
        fontSize={fontSize}
        fill={color}
        textAnchor="middle"
        fontWeight={fontWeight as any}
        alignmentBaseline="middle"
      >
        {dir}
      </SvgText>
    </AnimatedG>
  );
};

// ============================================================================
// TESTING CONFIGURATION
// ============================================================================
// Using only Magnetometer for compass heading
export const TEST_SENSOR_TYPE = 'magnetometer';

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
  smoothingAlpha: 1,
  magnetometerSpringDamping: 200, // Controls oscillation damping in spring animation (1 = critically damped, no oscillation)
  magnetometerSpringStiffness: 1000, // Controls spring stiffness/speed (very high = instant response, no spring effect)
  
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
    // For orange/yellow gradient backgrounds (Sunrise theme)
    // Medium-dark colors for balanced contrast against bright sunrise background
    dialBackground: 'rgba(95, 46, 22, 0.5)',    // Medium brown with moderate opacity
    dialStroke: 'rgba(183, 99, 4, 0.6)',       // Amber-600 border (medium gold)
    tickMajor: '#D97706',                        // Amber-600 cardinal ticks (medium gold)
    tickMinor: 'rgba(180, 83, 9, 0.5)',         // Amber-700 minor ticks (lighter)
    northColor: '#EF4444',                       // Red-500 for North (medium red)
    cardinalColor: '#FDE68A',                    // Amber-200 for E, S, W (lighter amber)
    centerHubBg: 'rgba(60, 30, 15, 0.7)',       // Medium brown-black center
    centerHubStroke: 'rgba(217, 119, 6, 0.5)',   // Amber-600 stroke
    headingLabel: 'rgba(251, 191, 36, 0.95)',   // Amber-400 label (bright gold)
    headingValue: '#FDE68A',                     // Amber-200 value (lighter gold)
    gold: '#F59E0B',                             // Amber-500 for target (medium gold)
    emerald: '#10b981',                          // Emerald-500 for aligned (medium green)
    emeraldGlow: '#34d399',                      // Emerald-400 glow
    turnContainerBg: 'rgba(80, 40, 20, 0.55)',   // Medium brown container
    turnContainerBorder: 'rgba(217, 119, 6, 0.5)',
    turnContainerAlignedBg: 'rgba(6, 78, 59, 0.5)',  // Emerald-800 aligned (lighter)
    turnContainerAlignedBorder: 'rgba(16, 185, 129, 0.6)',
    statusBg: 'rgba(60, 30, 15, 0.65)',         // Medium brown-black status
    statusBorder: 'rgba(217, 119, 6, 0.4)',
    statusText: '#FDE68A',                       // Amber-200 text (readable)
    phoneMarkerFill: '#FDE68A',                  // Amber-200 phone marker (lighter gold)
    phoneMarkerStroke: 'rgba(80, 40, 20, 0.6)', // Medium brown stroke
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
  /** Theme mode override - defaults to COMPASS_THEME global */
  theme?: ThemeMode;
  /** Compass configuration - customize sizes, fonts, spacing, etc. */
  config?: Partial<CompassConfig>;
}

// These constants are now moved to config, kept here for backward compatibility if needed

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
  theme = COMPASS_THEME,
  config: userConfig,
}: CompassViewProps) {
  // Merge user config with defaults
  const config = { ...DEFAULT_COMPASS_CONFIG, ...userConfig };
  
  // Get theme colors
  const colors = THEMES[theme];
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  
  // Track if we've already triggered haptics for current alignment
  const hasTriggeredHapticsRef = useRef(false);
  
  // Shared values for reanimated
  const heading = useSharedValue<number | null>(null);
  const dialRotation = useSharedValue(0);
  const targetHeadingSv = useSharedValue(0); // Target heading for pointer rotation
  
  // Magnetometer states
  const [magnetometerHeading, setMagnetometerHeading] = useState<number | null>(null);
  const prevHeadingRef = useRef<number | null>(null);
  const cumulativeMagRotation = useRef<number>(0); // Track cumulative rotation for magnetometer
  const lastUpdateTime = useRef<number>(0);

  // Magnetometer for compass heading
  useEffect(() => {
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
      // Standard formula: atan2(y, x) gives heading where 0° is North
      const angle = -Math.atan2(x, y) * (180 / Math.PI);
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
  }, [heading, dialRotation]);

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

  // Calculate distance to target
  const distanceToTarget = React.useMemo(() => {
    if (targetLocation && userLocation) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );
      // Format to 1 decimal place if < 10km, otherwise integer
      return dist < 10 ? dist.toFixed(1) : Math.round(dist).toString();
    }
    return null;
  }, [targetLocation, userLocation]);

  // Choose which heading to guide towards
  const effectiveTargetHeading = dynamicTargetHeading ?? propTargetHeading;

  // Update target heading shared value for pointer rotation
  useEffect(() => {
    if (effectiveTargetHeading !== null) {
      targetHeadingSv.value = withSpring(effectiveTargetHeading, {
        damping: config.magnetometerSpringDamping,
        stiffness: config.magnetometerSpringStiffness,
      });
    }
  }, [effectiveTargetHeading, targetHeadingSv]);

  // Get current heading value for calculations
  const currentHeading = magnetometerHeading;

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

  // Pointer rotation style (independent from dial)
  const pointerRotateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${dialRotation.value + targetHeadingSv.value}deg`,
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
  const getTurnInstruction = (): { text: string; icon: keyof typeof Ionicons.glyphMap | null } => {
    if (effectiveTargetHeading === null || currentHeading === null) {
      return { text: "--", icon: null };
    }
    let delta = ((effectiveTargetHeading - currentHeading + 540) % 360) - 180; // [-180,180]
    const absDelta = Math.abs(delta);
    if (absDelta <= config.facingThresholdDegrees) {
      return { text: "Aligned", icon: "checkmark-circle" };
    }
    if (delta > 0) {
      return { text: "TURN RIGHT", icon: "arrow-redo" };
    }
    return { text: "TURN LEFT", icon: "arrow-undo" };
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
        {instruction.icon && (
          <Ionicons 
            name={instruction.icon} 
            size={config.turnInstructionIconSize} 
            color={isFacingTarget ? colors.emerald : colors.gold} 
          />
        )}
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

        {/* Layer 1: Rotating Compass Dial (Background, Ticks, Cardinals) */}
        <Animated.View style={[styles.compassDial, dialRotateStyle]}>
          <Svg width={compassSize + 50} height={compassSize + 50} style={styles.compass}>
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
          </Svg>
        </Animated.View>

        {/* Layer 2: Target Pointer (Independent Rotation) */}
        {effectiveTargetHeading !== null && (
          <Animated.View style={[styles.pointerLayer, pointerRotateStyle]}>
            <Svg width={compassSize + 50} height={compassSize + 50} style={styles.compass}>
              <G transform={`translate(25, 25)`}>
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
            </Svg>
          </Animated.View>
        )}

        {/* Layer 3: Center Hub (Static - Always Upright) */}
        <View style={styles.centerHubLayer}>
          <Svg width={compassSize + 50} height={compassSize + 50} style={styles.compass}>
            {/* Center Hub Circle */}
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
        </View>
      </View>

      {/* Location Name Display */}
      {targetLocation?.address && (
        <View style={[
          styles.locationContainer,
          {
            backgroundColor: colors.turnContainerBg,
            borderColor: colors.turnContainerBorder,
            borderWidth: 1,
            paddingHorizontal: 25,
            paddingVertical: 12,
            borderRadius: config.turnContainerRadius,
            bottom: config.statusContainerBottom + 40,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }
        ]}>
          <Ionicons 
            name="location" 
            size={20} 
            color={colors.gold} 
          />
          <Text style={[
            styles.locationText,
            { 
              color: colors.statusText,
              fontSize: 18,
              fontWeight: '700',
              textTransform: 'none',
              letterSpacing: 0.5,
            }
          ]}>
            {targetLocation.address}
            {distanceToTarget && (
              <Text style={{ fontWeight: '400', fontSize: 16, textTransform: 'none', opacity: 0.9 }}>
                {` - ${distanceToTarget}km away`}
              </Text>
            )}
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
  pointerLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHubLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compass: {
    backgroundColor: 'transparent',
  },
  locationContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  locationText: {
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
}); 