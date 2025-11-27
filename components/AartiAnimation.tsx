import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface AartiAnimationProps {
  centerX?: number;
  centerY?: number;
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
  ({ centerX = 0, centerY = 0 }, ref) => {
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
        radius: BASE_RADIUS + (Math.random() * 20 - 10), // Slight radius variation
        scale: 0.9 + Math.random() * 0.3, // Random scale between 0.9 and 1.2
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
          <DiyaParticle key={diya.id} diya={diya} centerX={centerX} centerY={centerY} />
        ))}
      </View>
    );
  }
);

AartiAnimation.displayName = 'AartiAnimation';

/**
 * Individual diya particle component with circular motion
 */
const DiyaParticle: React.FC<{ diya: Diya; centerX: number; centerY: number }> = ({ 
  diya, 
  centerX, 
  centerY 
}) => {
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

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
      currentAngle = diya.startAngle + (progress * totalRotation);

      // Convert angle to radians for trigonometry
      const angleInRadians = (currentAngle * Math.PI) / 180;

      // Calculate position on circle (clockwise motion)
      const x = centerX + diya.radius * Math.cos(angleInRadians);
      const y = centerY + diya.radius * Math.sin(angleInRadians);

      // Update position
      translateX.value = x;
      translateY.value = y;

      // Rotate the diya itself slightly for visual effect
      rotation.value = currentAngle * 0.5;

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
        { rotate: `${rotation.value}deg` },
        { scale: diya.scale },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.diya, animatedStyle]}>
      <Text style={styles.diyaEmoji}>🪔</Text>
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
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diyaEmoji: {
    fontSize: 24,
    textAlign: 'center',
  },
});

export default AartiAnimation;

