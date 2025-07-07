import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import { magnetometer, SensorData } from 'react-native-sensors';
import Svg, { Circle, Text as SvgText, Line, Polygon, G } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Animated, Easing } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
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
}

const FACING_THRESHOLD_DEGREES = 20; // Reasonable threshold for alignment
const COMPASS_REFRESH_INTERVAL = 50; // milliseconds

export default function CompassView({ targetHeading: propTargetHeading = 45, targetLocation = null, onAlignmentChange, hideStatusWhenAligned = false }: CompassViewProps) {
  const [heading, setHeading] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  // const [isCalibrating, setIsCalibrating] = useState(false);
  
  // Track if we've already triggered haptics for current alignment
  const hasTriggeredHapticsRef = useRef(false);

  /**
   * Low-pass filter coefficient. 0 → no smoothing, 1 → maximum smoothing.
   * 0.2–0.3 feels responsive yet stable on most phones.
   */
  const SMOOTHING_ALPHA = 0.5;

  // Store previous heading to apply exponential smoothing across readings.
  const prevHeadingRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);

  // Animated rotation for compass dial (rotates opposite to heading)
  const dialRotation = useRef(new Animated.Value(0)).current;
  const animationInProgress = useRef(false);

  // Request location permissions for Android
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location to show direction to target.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const subscription = magnetometer.subscribe(({ x, y, z }: SensorData) => {
      // Throttle updates to prevent excessive animations
      const now = Date.now();
      if (now - lastUpdateTime.current < COMPASS_REFRESH_INTERVAL) { // Update at most every 100ms
        return;
      }
      lastUpdateTime.current = now;

      // Calculate heading from magnetometer data
      // Fix coordinate system: atan2(-x, y) for correct magnetic north alignment
      const angle = Math.atan2(-x, y) * (180 / Math.PI);
      const rawHeading = (angle + 360) % 360;

      // --- Exponential smoothing to reduce noise & jitter ---
      const prev = prevHeadingRef.current;
      let smoothedHeading: number;

      if (prev === null) {
        smoothedHeading = rawHeading;
      } else {
        // Compute the shortest angular distance (-180..180] then apply smoothing.
        const difference = ((rawHeading - prev + 540) % 360) - 180;
        smoothedHeading = (prev + SMOOTHING_ALPHA * difference + 360) % 360;
      }

      prevHeadingRef.current = smoothedHeading;
      setHeading(smoothedHeading);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (heading !== null && !animationInProgress.current) {
      // Dial rotates opposite to heading (iOS style)
      animationInProgress.current = true;
      Animated.timing(dialRotation, {
        toValue: -heading,
        duration: 20,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        animationInProgress.current = false;
      });
    }
  }, [heading]);

  // Subscribe to user location if targetLocation is provided
  useEffect(() => {
    let watchId: number | null = null;

    const startLocationUpdates = async () => {
      if (!targetLocation) return; // No need to request location if we only have static heading
      
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        console.warn('Permission to access location was denied');
        return;
      }

      watchId = Geolocation.watchPosition(
        (position: any) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error: any) => {
          console.warn('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 1, // meters
          interval: 1000, // milliseconds
        }
      );
    };

    startLocationUpdates();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
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

  // Determine if facing target direction
  const isFacingTarget = 
    effectiveTargetHeading !== null && heading !== null &&
    Math.min(
      Math.abs(effectiveTargetHeading - heading),
      360 - Math.abs(effectiveTargetHeading - heading)
    ) <= FACING_THRESHOLD_DEGREES;

  // Notify parent when alignment state changes
  useEffect(() => {
    if (onAlignmentChange) {
      onAlignmentChange(isFacingTarget);
    }
    
    // Handle haptics - only trigger once when first becoming aligned
    if (isFacingTarget && !hasTriggeredHapticsRef.current) {
      // Trigger haptic feedback
      const options = {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      };
      
      ReactNativeHapticFeedback.trigger('notificationSuccess', options);
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

  // Dial rotation style (compass spins opposite to the phone heading)
  const dialRotateStyle = {
    transform: [
      {
        rotate: dialRotation.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

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
    if (effectiveTargetHeading === null || heading === null) return "--";
    let delta = ((effectiveTargetHeading - heading + 540) % 360) - 180; // [-180,180]
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

              const textCounterRotation = dialRotation.interpolate({
                inputRange: [-360, 360],
                outputRange: [360, -360],
              });
              const color = '#000000';
              const fontSize = dir === 'N' ? 24 : 24;

              return (
                <AnimatedG
                  key={dir}
                  rotation={textCounterRotation}
                  originX={labelX}
                  originY={labelY}
                >
                  <SvgText
                    x={labelX}
                    y={labelY}
                    fontSize={fontSize}
                    fill={color}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {dir}
                  </SvgText>
                </AnimatedG>
              );
            })}

          </Svg>
        </Animated.View>
      </View>

      {/* Status indicators */}
      {!(hideStatusWhenAligned && isFacingTarget) && (
        <View style={styles.statusContainer}>
          {/* <Text style={styles.locationText}>📍 {"Appaji's location"}</Text> */}
          <Text style={styles.locationText}> {"📍 "+ targetLocation?.address || "📍 "+ 'Datta Peetham, Mysore'}</Text>
          <Text style={styles.statusText}>
            Sunrise time: 05:00 AM
          </Text>
          {/* <Text style={styles.statusText}>
            Target bearing: {effectiveTargetHeading !== null ? Math.round(effectiveTargetHeading) : '--'}°
          </Text> */}
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