import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface FlowerAnimationProps {
  startX?: number;
  startY?: number;
  groundY?: number;
}

export interface FlowerAnimationRef {
  trigger: () => void;
}

interface Flower {
  id: number;
  initialX: number;
  initialY: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  scale: number;
  landingOffset: number;
}

const GRAVITY = 0.7;
const ANIMATION_DURATION = 10000;
const FLOWER_COUNT = 40;
const INITIAL_VELOCITY_Y_MIN = -20;
const INITIAL_VELOCITY_Y_MAX = -30;
const INITIAL_VELOCITY_X_RANGE = 8;

/**
 * FlowerAnimation component - displays a physics-based flower shower animation
 * Uses react-native-reanimated for smooth 60fps animations
 * 
 * @param {FlowerAnimationProps} props - The props for the component
 * @param {React.Ref} ref - Ref to expose trigger method
 * @returns {React.JSX.Element} - The rendered component
 */
export const FlowerAnimation = forwardRef<FlowerAnimationRef, FlowerAnimationProps>(
  ({ startX = 0, startY = 0, groundY }, ref) => {
    const [flowers, setFlowers] = React.useState<Flower[]>([]);

    // Expose trigger method via ref
    useImperativeHandle(ref, () => ({
      trigger: () => {
        triggerAnimation();
      },
    }));

    const triggerAnimation = () => {
      // Generate flower particles with random properties
      const newFlowers: Flower[] = Array.from({ length: FLOWER_COUNT }, (_, i) => ({
        id: Date.now() + i,
        initialX: startX,
        initialY: startY,
        velocityX: (Math.random() - 0.5) * INITIAL_VELOCITY_X_RANGE * 2,
        velocityY: INITIAL_VELOCITY_Y_MIN + Math.random() * (INITIAL_VELOCITY_Y_MAX - INITIAL_VELOCITY_Y_MIN),
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 0.4, // Random scale between 0.8 and 1.2
        landingOffset: (Math.random() * 30) - 10, // Random offset for stacking effect
      }));

      setFlowers(newFlowers);

      // Clear flowers after animation completes
      setTimeout(() => {
        setFlowers([]);
      }, ANIMATION_DURATION + 100);
    };

    return (
      <View style={styles.container} pointerEvents="none">
        {flowers.map((flower) => (
          <FlowerParticle key={flower.id} flower={flower} groundY={groundY} />
        ))}
      </View>
    );
  }
);

FlowerAnimation.displayName = 'FlowerAnimation';

/**
 * Individual flower particle component with physics simulation
 */
const FlowerParticle: React.FC<{ flower: Flower; groundY?: number }> = ({ flower, groundY }) => {
  const translateX = useSharedValue(flower.initialX);
  const translateY = useSharedValue(flower.initialY);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(flower.rotation);

  useEffect(() => {
    // Physics simulation using frame-by-frame updates
    const startTime = Date.now();
    let velocityY = flower.velocityY;
    let velocityX = flower.velocityX;
    let currentY = flower.initialY;
    let currentX = flower.initialX;
    let currentRotation = flower.rotation;
    const peakY = flower.initialY; // Track the starting Y position
    const centerX = flower.initialX; // Center point to attract flowers to
    let isGrounded = false;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / ANIMATION_DURATION;

      if (progress >= 1) {
        opacity.value = withTiming(0, { duration: 200 });
        return;
      }

      if (!isGrounded) {
        // Apply gravity to velocity
        velocityY += GRAVITY;

        // Apply horizontal attraction force when falling (after reaching peak)
        if (velocityY > 0) {
          // Flower is falling down
          const distanceFromCenter = currentX - centerX;
          const attractionForce = -distanceFromCenter * 0.003; // Gentle pull toward center
          velocityX += attractionForce;
          
          // Add stronger damping when falling to reduce crossing
          velocityX *= 0.95;
        } else {
          // Less damping when rising
          velocityX *= 0.98;
        }

        // Update positions
        currentY += velocityY;
        currentX += velocityX;

        // Check for ground collision
        if (groundY !== undefined && velocityY > 0) {
          const targetY = groundY + flower.landingOffset;
          if (currentY >= targetY) {
            currentY = targetY;
            isGrounded = true;
            velocityY = 0;
            velocityX = 0;
          }
        }

        // Rotation continues while moving
        currentRotation += velocityX * 2;
      }

      // Update animated values
      translateY.value = currentY;
      translateX.value = currentX;
      rotation.value = currentRotation;

      // Fade out as flowers fall back down past starting point
      // But NOT if they are grounded (accumulating)
      if (!isGrounded && currentY > peakY) {
        const fallDistance = currentY - peakY;
        const fadeProgress = Math.min(fallDistance / 200, 1);
        opacity.value = 1 - fadeProgress;
      }

      // Continue animation
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [flower, groundY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: flower.scale },
    ],
    opacity: opacity.value,
  }));
  //🌻🌷🌹
  return (
    <Animated.View style={[styles.flower, animatedStyle]}>
      <Text style={styles.flowerEmoji}>🌹</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  flower: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowerEmoji: {
    fontSize: 24,
    textAlign: 'center',
  },
});

export default FlowerAnimation;
