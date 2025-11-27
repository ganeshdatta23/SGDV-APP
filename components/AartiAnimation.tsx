import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';

interface AartiAnimationProps {
  centerX?: number;
  centerY?: number;
  /** Length of the flame (scaleY factor), default 1.0 */
  flameLength?: number;
  /** Intensity of the flicker (0.0 to 1.0), default 0.5 */
  flickerIntensity?: number;
  /** Size of the Diya container in pixels, default 60 */
  diyaSize?: number;
  /** Gap between flame and base in pixels (smaller = closer), default 5 */
  flameBaseGap?: number;
}

export interface AartiAnimationRef {
  trigger: () => void;
}

interface Diya {
  id: number;
  startAngle: number;
  radius: number;
  scale: number;
}

const ANIMATION_DURATION = 6000; // 6 seconds for 3 rotations
const DIYA_COUNT = 1; // Number of diyas in the circle
const BASE_RADIUS = 150; // Base radius around the image
const ROTATIONS = 3; // Number of complete rotations

/**
 * AartiAnimation component - displays a clockwise circular aarti animation
 * Uses react-native-reanimated for smooth 60fps animations
 * 
 * @param {AartiAnimationProps} props - The props for the component
 * @param {React.Ref} ref - Ref to expose trigger method
 * @returns {React.JSX.Element} - The rendered component
 */
export const AartiAnimation = forwardRef<AartiAnimationRef, AartiAnimationProps>(
  ({ 
    centerX = 0, 
    centerY = 0,
    flameLength = 0.7,
    flickerIntensity = 0.8,
    diyaSize = 60,
    flameBaseGap = 5
  }, ref) => {
    const [diyas, setDiyas] = React.useState<Diya[]>([]);

    // Expose trigger method via ref
    useImperativeHandle(ref, () => ({
      trigger: () => {
        triggerAnimation();
      },
    }));

    const triggerAnimation = () => {
      // Generate diya particles evenly distributed around the circle
      const newDiyas: Diya[] = Array.from({ length: DIYA_COUNT }, (_, i) => ({
        id: Date.now() + i,
        startAngle: (i / DIYA_COUNT) * 360, // Evenly distribute around circle
        radius: BASE_RADIUS, // Use fixed radius for cleaner single orbit
        scale: 1.0, 
      }));

      setDiyas(newDiyas);

      // Clear diyas after animation completes
      setTimeout(() => {
        setDiyas([]);
      }, ANIMATION_DURATION + 200);
    };

    return (
      <View style={styles.container} pointerEvents="none">
        {diyas.map((diya) => (
          <DiyaParticle 
            key={diya.id} 
            diya={diya} 
            centerX={centerX} 
            centerY={centerY} 
            flameLength={flameLength}
            flickerIntensity={flickerIntensity}
            diyaSize={diyaSize}
            flameBaseGap={flameBaseGap}
          />
        ))}
      </View>
    );
  }
);

AartiAnimation.displayName = 'AartiAnimation';

/**
 * Custom SVG Diya component with animated flame
 */
interface SvgDiyaProps {
  flameLength: number;
  flickerIntensity: number;
  diyaSize: number;
  flameBaseGap: number;
}

const SvgDiya: React.FC<SvgDiyaProps> = ({ flameLength, flickerIntensity, diyaSize, flameBaseGap }) => {
  // Flame animation values
  const flameScaleX = useSharedValue(1);
  const flameScaleY = useSharedValue(flameLength);
  const flameOpacity = useSharedValue(0.9);
  
  // Calculate flicker ranges based on intensity
  const baseScaleY = flameLength;
  const flickerRange = flickerIntensity * 0.2; // e.g. 0.5 * 0.2 = 0.1 (+/- 10%)
  
  useEffect(() => {
    // Flickering animation loop
    // Randomize slightly to feel more organic
    flameScaleX.value = withRepeat(
      withSequence(
        withTiming(1.0 + flickerRange, { duration: 100 }),
        withTiming(1.0 - flickerRange, { duration: 150 }),
        withTiming(1.0 + flickerRange * 0.5, { duration: 120 }),
        withTiming(1.0 - flickerRange * 0.8, { duration: 140 })
      ),
      -1,
      true
    );

    flameScaleY.value = withRepeat(
      withSequence(
        withTiming(baseScaleY + flickerRange, { duration: 120 }),
        withTiming(baseScaleY - flickerRange * 0.5, { duration: 180 }),
        withTiming(baseScaleY + flickerRange * 0.8, { duration: 150 })
      ),
      -1,
      true
    );
    
    flameOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 100 }),
        withTiming(0.8 - (flickerIntensity * 0.2), { duration: 200 }),
        withTiming(0.95, { duration: 150 })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(flameScaleX);
      cancelAnimation(flameScaleY);
      cancelAnimation(flameOpacity);
    };
  }, [baseScaleY, flickerRange, flickerIntensity]);

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: flameScaleX.value },
      { scaleY: flameScaleY.value },
      { translateY: (1 - flameScaleY.value) * 10 } // Adjust pivot to keep base steady
    ],
    opacity: flameOpacity.value,
  }));

  // Scale SVG contents based on diyaSize
  // Base SVG is roughly 100x100 coord system
  // We'll scale the View container instead of SVG internals for simplicity
  const sizeRatio = diyaSize / 60; // 60 is the base design size

  return (
    <View style={[styles.diyaContainer, { transform: [{ scale: sizeRatio }] }]}>
      {/* Flame Layer - Animated View holding SVG */}
      <Animated.View style={[styles.flameContainer, animatedFlameStyle]}>
        <Svg width="40" height="50" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="flameGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#FFFF00" stopOpacity="1" />
              <Stop offset="40%" stopColor="#FFA500" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
               <Stop offset="0%" stopColor="#FFA500" stopOpacity="0.6" />
               <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Outer Glow */}
          <Path
            d="M50 10 Q70 50 50 80 Q30 50 50 10"
            fill="url(#glowGrad)"
            transform="scale(1.5) translate(-17, -15)"
          />

          {/* Flame Core */}
          <Path
            d="M50 15 Q65 50 50 65 Q35 50 50 15"
            fill="url(#flameGrad)"
          />
        </Svg>
      </Animated.View>

      {/* Base Layer - Static SVG */}
      <View style={[styles.baseContainer, { bottom: flameBaseGap }]}>
        <Svg width="60" height="40" viewBox="0 0 100 60">
           {/* Diya Base (Clay Lamp) */}
          <Path
            d="M20 30 Q50 60 80 30 L75 30 Q50 50 25 30 Z"
            fill="#8B4513" // SaddleBrown
            stroke="#654321"
            strokeWidth="1"
          />
          {/* Rim */}
          <Path
            d="M20 30 Q50 40 80 30 Q50 20 20 30"
            fill="#A0522D" // Sienna
            stroke="#654321"
            strokeWidth="1"
          />
          {/* Wick */}
          <Path
            d="M48 30 L50 15 L52 30 Z" 
            fill="#2F2F2F"
          />
        </Svg>
      </View>
    </View>
  );
};

interface DiyaParticleProps {
  diya: Diya;
  centerX: number;
  centerY: number;
  flameLength: number;
  flickerIntensity: number;
  diyaSize: number;
  flameBaseGap: number;
}

/**
 * Individual diya particle component with circular motion
 */
const DiyaParticle: React.FC<DiyaParticleProps> = ({ 
  diya, 
  centerX, 
  centerY,
  flameLength,
  flickerIntensity,
  diyaSize,
  flameBaseGap
}) => {
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Circular motion animation
    const startTime = Date.now();
    let currentAngle = diya.startAngle;

    // Fade in at start
    opacity.value = withTiming(1, { duration: 300 });

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / ANIMATION_DURATION;

      if (progress >= 1) {
        // Fade out at end
        opacity.value = withTiming(0, { duration: 300 });
        return;
      }

      // Calculate current angle (clockwise = increasing angle)
      // Complete 3 full rotations (1080 degrees)
      const totalRotation = ROTATIONS * 360;
      
      // Start from -90 deg (top) or maintain relative start
      currentAngle = diya.startAngle + (progress * totalRotation);

      // Convert angle to radians for trigonometry
      const angleInRadians = (currentAngle * Math.PI) / 180;

      // Calculate position on circle (clockwise motion)
      const x = centerX + diya.radius * Math.cos(angleInRadians);
      const y = centerY + diya.radius * Math.sin(angleInRadians);

      // Update position
      translateX.value = x;
      translateY.value = y;

      // Continue animation
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [diya, centerX, centerY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        // IMPORTANT: No rotation here! The diya stays upright.
        { scale: diya.scale },
      ],
      opacity: opacity.value,
      // Dynamic centering based on size
      marginLeft: -diyaSize / 2,
      marginTop: -diyaSize / 2,
    };
  });

  return (
    <Animated.View style={[styles.diya, animatedStyle, { width: diyaSize, height: diyaSize }]}>
      <SvgDiya 
        flameLength={flameLength} 
        flickerIntensity={flickerIntensity} 
        diyaSize={diyaSize}
        flameBaseGap={flameBaseGap}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  diya: {
    position: 'absolute',
    // Center the element on its coordinate - dynamic sizing handled in render
    justifyContent: 'center',
    alignItems: 'center',
    // Margins are now dynamic
  },
  diyaContainer: {
    width: 60, // Base size
    height: 70, 
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  flameContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseContainer: {
    position: 'absolute',
    // bottom is now dynamic via inline style
    zIndex: 5,
  }
});

export default AartiAnimation;
