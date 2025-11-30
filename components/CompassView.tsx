import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText, Line, Polygon, G, Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useAnimatedProps,
} from 'react-native-reanimated';
import { calculateBearing, calculateDistance } from '../utils/locationUtils';
import { 
  CardinalDirectionProps, 
  CompassViewProps, 
  TurnInstruction,
} from '../types';
import {
  COMPASS_THEME,
  COMPASS_THEMES,
  DEFAULT_COMPASS_CONFIG,
  COMPASS_DEGREE_MARKINGS_COUNT,
  COMPASS_DEGREE_INCREMENT,
  COMPASS_CARDINAL_INTERVAL,
  COMPASS_SEMI_CARDINAL_INTERVAL,
  TEXT_ALIGNED,
  TEXT_TURN_RIGHT,
  TEXT_TURN_LEFT,
  TEXT_HEADING,
  HAPTICS_RESET_DELAY_MS,
} from '../constants';
import { compassViewStyles } from '../styles/CompassViewStyles';

const AnimatedG = Animated.createAnimatedComponent(G);
const { width, height } = Dimensions.get('window');

const CardinalDirection = ({ dir, x, y, rotation, color, fontSize, fontWeight }: CardinalDirectionProps) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${-rotation.value}deg` },
      ] as any,
    };
  }, [x, y]);

  return (
    <AnimatedG
      animatedProps={animatedProps}
    >
      <SvgText
        x={0}
        y={0}
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
  const colors = COMPASS_THEMES[theme];
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
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

  // Generate degree markings
  const renderDegreeMarkings = () => {
    const markings = [];
    
    for (let i = 0; i < COMPASS_DEGREE_MARKINGS_COUNT; i++) {
      const angle = i * COMPASS_DEGREE_INCREMENT;
      const isCardinal = i % COMPASS_CARDINAL_INTERVAL === 0; // N, E, S, W (0°, 90°, 180°, 270°)
      const isSemi = i % COMPASS_SEMI_CARDINAL_INTERVAL === 0 && !isCardinal; // Every 30° that's not cardinal
      
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
  const getTurnInstruction = (): TurnInstruction => {
    if (effectiveTargetHeading === null || currentHeading === null) {
      return { text: "--", icon: null };
    }
    let delta = ((effectiveTargetHeading - currentHeading + 540) % 360) - 180; // [-180,180]
    const absDelta = Math.abs(delta);
    if (absDelta <= config.facingThresholdDegrees) {
      return { text: TEXT_ALIGNED, icon: "checkmark-circle" };
    }
    if (delta > 0) {
      return { text: TEXT_TURN_RIGHT, icon: "refresh-outline", transform: [{ }] };
    }
    return { text: TEXT_TURN_LEFT, icon: "refresh-outline" , transform: [{ scaleX: -1 }]};
  };

  const instruction = getTurnInstruction();


  return (
    <View style={compassViewStyles.container}>
      <View style={
        [
        compassViewStyles.turnContainer,
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
            transform={instruction.transform}
          />
        )}
        <Text style={[
          compassViewStyles.turnText,
          { 
            color: isFacingTarget ? colors.emerald : colors.gold,
            fontSize: config.turnInstructionTextSize,
          }
        ]
        }>
          {instruction.text}
        </Text>
      </View>

      {/* Compass Visual */}
      <View style={[compassViewStyles.compassContainer, { marginBottom: config.compassMarginBottom }]}>
        {/* Fixed Phone Orientation Marker at Top */}
        <View style={compassViewStyles.phoneMarker}>
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
        <Animated.View style={[compassViewStyles.compassDial, dialRotateStyle]}>
          <Svg width={compassSize + 50} height={compassSize + 50} style={compassViewStyles.compass}>
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

            {/* Cardinal directions with counter-rotation to stay upright */}
            {(['N', 'E', 'S', 'W'] as const).map((dir) => {
              const svgCenter = (compassSize + 50) / 2;
              // Position each cardinal label on the compass ring
              const positions = {
                N: { x: svgCenter, y: svgCenter - compassRadius + 40 },
                E: { x: svgCenter + compassRadius - 40, y: svgCenter },
                S: { x: svgCenter, y: svgCenter + compassRadius - 40 },
                W: { x: svgCenter - compassRadius + 40, y: svgCenter },
              };
              const pos = positions[dir];
              
              return (
                <CardinalDirection
                  key={dir}
                  dir={dir}
                  x={pos.x}
                  y={pos.y}
                  rotation={dialRotation}
                  color={dir === 'N' ? colors.northColor : colors.cardinalColor}
                  fontSize={dir === 'N' ? config.cardinalNorthFontSize : config.cardinalOtherFontSize}
                  fontWeight={dir === 'N' ? 'bold' : '600'}
                />
              );
            })}
          </Svg>
        </Animated.View>

        {/* Layer 2: Target Pointer (Independent Rotation) */}
        {effectiveTargetHeading !== null && (
          <Animated.View style={[compassViewStyles.pointerLayer, pointerRotateStyle]}>
            <Svg width={compassSize + 50} height={compassSize + 50} style={compassViewStyles.compass}>
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
        <View style={compassViewStyles.centerHubLayer}>
          <Svg width={compassSize + 50} height={compassSize + 50} style={compassViewStyles.compass}>
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
                {TEXT_HEADING}
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
          compassViewStyles.locationContainer,
          {
            backgroundColor: colors.turnContainerBg,
            borderColor: colors.turnContainerBorder,
            borderWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: config.turnContainerRadius,
            bottom: config.statusContainerBottom + 40,
            maxWidth: width * 0.93,
            alignSelf: 'center',
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
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text 
              style={[
                compassViewStyles.locationText,
                { 
                  color: colors.statusText,
                  fontSize: 17,
                  fontWeight: '700',
                  textTransform: 'none',
                  letterSpacing: 0.5,
                }
              ]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {targetLocation.address}
            </Text>
            {distanceToTarget && (
              <Text 
                style={[
                  compassViewStyles.locationText,
                  { 
                    color: colors.statusText,
                    fontWeight: '400', 
                    fontSize: 15, 
                    textTransform: 'none', 
                    opacity: 0.9,
                    marginTop: 4,
                  }
                ]}
              >
                {`${distanceToTarget}km away`}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
} 