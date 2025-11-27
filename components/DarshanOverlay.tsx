import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { VideoView, VideoPlayer } from 'expo-video';
import { AudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { FlowerAnimation, FlowerAnimationRef } from './FlowerAnimation';
import { AartiAnimation, AartiAnimationRef } from './AartiAnimation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IMAGE_WIDTH = 288; // w-72 in Tailwind (18rem = 288px)
const IMAGE_HEIGHT = 384; // 3:4 aspect ratio

/**
 * Interface defining the props for the DarshanOverlay component.
 * An interface in TypeScript is a way to define the structure of an object,
 * specifying what properties it should have and their types.
 * 
 * This interface describes the props that the DarshanOverlay component expects:
 * - visible: boolean - controls whether the overlay is shown or hidden
 * - videoPlayer: VideoPlayer - the video player instance for darshan video
 * - audioPlayer: AudioPlayer - the audio player instance for background audio
 * - onClose: () => void - callback function to close the overlay
 * - audioEnabled?: boolean - optional flag to enable/disable audio (defaults to true)
 * - audioVolume?: number - optional volume level for audio (defaults to 0.7)
 */
interface DarshanOverlayProps {
  visible: boolean;
  videoPlayer: VideoPlayer;
  audioPlayer: AudioPlayer;
  onClose: () => void;
  audioEnabled?: boolean;
  audioVolume?: number;
}

/**
 * DarshanOverlay component - displays a golden aura around the Swamiji image
 * and provides audio toggle functionality.
 * 
 * @param {DarshanOverlayProps} props - The props for the component
 * @returns {React.JSX.Element} - The rendered component
 */
export const DarshanOverlay: React.FC<DarshanOverlayProps> = ({
  visible,
  videoPlayer,
  audioPlayer,
  onClose,
  audioEnabled = true,
  audioVolume = 0.7,
}) => {
  const [isMuted, setIsMuted] = useState(!audioEnabled);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  
  // Animated values for golden aura pulse effect
  const pulseAnim1 = useRef(new Animated.Value(0.5)).current;
  const pulseAnim2 = useRef(new Animated.Value(0.3)).current;
  const pulseAnim3 = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Ref for flower animation
  const flowerAnimationRef = useRef<FlowerAnimationRef>(null);
  
  // Ref for aarti animation
  const aartiAnimationRef = useRef<AartiAnimationRef>(null);

  // Start pulse animations
  useEffect(() => {
    if (visible) {
      // Fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse animation for outer glow - slower, more ethereal
      const pulse1 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: 0.8,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, {
            toValue: 0.5,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      // Middle glow pulse - offset timing
      const pulse2 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim2, {
            toValue: 0.6,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim2, {
            toValue: 0.3,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      // Inner glow pulse
      const pulse3 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim3, {
            toValue: 0.7,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim3, {
            toValue: 0.4,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      pulse1.start();
      setTimeout(() => pulse2.start(), 500);
      setTimeout(() => pulse3.start(), 1000);

      return () => {
        pulse1.stop();
        pulse2.stop();
        pulse3.stop();
      };
    } else {
      // Reset animations when not visible
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  // Handle audio playback - plays once, then mutes
  useEffect(() => {
    if (visible && audioPlayer && audioEnabled) {
      if (!hasPlayedOnce && !isMuted) {
        // Play audio once
        audioPlayer.loop = false;
        audioPlayer.volume = audioVolume;
        audioPlayer.play();
        console.log(`🎵 Darshan audio started (will play once at volume ${audioVolume})`);
        setHasPlayedOnce(true);
      }
    }
  }, [visible, audioPlayer, hasPlayedOnce, isMuted, audioEnabled, audioVolume]);

  // Listen for audio completion
  useEffect(() => {
    if (audioPlayer && hasPlayedOnce) {
      const checkAudioStatus = setInterval(() => {
        if (!audioPlayer.playing && hasPlayedOnce && !isMuted) {
          // Audio finished playing
          setIsMuted(true);
          console.log('🔇 Audio finished, auto-muting');
          clearInterval(checkAudioStatus);
        }
      }, 500);

      return () => clearInterval(checkAudioStatus);
    }
  }, [audioPlayer, hasPlayedOnce, isMuted]);

  // Handle audio toggle
  const toggleAudio = async () => {
    if (!audioPlayer) return;

    if (isMuted) {
      // Unmute and play again
      setIsMuted(false);
      audioPlayer.loop = false;
      audioPlayer.volume = audioVolume;
      await audioPlayer.seekTo(0);
      audioPlayer.play();
      console.log(`🔊 Audio unmuted and playing at volume ${audioVolume}`);
    } else {
      // Mute
      setIsMuted(true);
      audioPlayer.pause();
      console.log('🔇 Audio muted');
    }
  };

  // Reset state when overlay becomes visible again
  useEffect(() => {
    const resetAudioState = async () => {
      if (visible) {
        setHasPlayedOnce(false);
        setIsMuted(!audioEnabled);
        // Always seek to beginning when overlay becomes visible
        if (audioPlayer) {
          await audioPlayer.seekTo(0);
          console.log('⏮️ Audio reset to position 0 - ready for fresh playback');
        }
      } else {
        // Stop audio when overlay is not visible (dealigned)
        if (audioPlayer && audioPlayer.playing) {
          audioPlayer.pause();
          console.log('🔇 Audio stopped - overlay dealigned');
        }
      }
    };
    
    resetAudioState();
  }, [visible, audioEnabled, audioPlayer]);

  // Update audio volume dynamically when it changes
  useEffect(() => {
    if (audioPlayer && visible && !isMuted) {
      audioPlayer.volume = audioVolume;
      console.log(`🔊 Audio volume updated to ${Math.round(audioVolume * 100)}%`);
    }
  }, [audioVolume, audioPlayer, visible, isMuted]);

  // Handle pooja button press - trigger flower animation
  const handlePoojaPress = () => {
    if (flowerAnimationRef.current) {
      flowerAnimationRef.current.trigger();
      console.log('🌹 Pooja flower animation triggered');
    }
  };

  // Handle aarti button press - trigger aarti animation
  const handleAartiPress = () => {
    if (aartiAnimationRef.current) {
      aartiAnimationRef.current.trigger();
      console.log('🪔 Aarti animation triggered');
    }
  };

  if (!visible) return null;

  // Animated Svg component for pulsing effect
  const AnimatedSvg = Animated.createAnimatedComponent(Svg);

  return (
    <View style={styles.overlay}>
      {/* Background Video */}
      <VideoView
        player={videoPlayer}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Dimming overlay for video */}
      <View style={styles.dimmingOverlay} />

      {/* Vignette effect - gradient from top and bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.25, 0.75, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Radial vignette simulation - corner darkening */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.6 }}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 0.6 }}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.6, y: 0.4 }}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.4, y: 0.4 }}
      />

      {/* Center content with golden aura */}
      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Golden Aura - SVG Radial Gradients */}
        <View style={styles.auraContainer}>
          {/* 
             We use absolute positioned SVGs for the glow layers.
             RadialGradient allows us to have a true center-out fade.
          */}
          
          {/* Outer soft glow - large amber/orange - INCREASED INTENSITY */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulseAnim1 }]}>
            <Svg height="100%" width="100%" viewBox="0 0 100 100">
              <Defs>
                <RadialGradient
                  id="grad1"
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                  fx="50%"
                  fy="50%"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0.2" stopColor="#fbbf24" stopOpacity="0.5" />
                  <Stop offset="0.7" stopColor="#b45309" stopOpacity="0.4" />
                  <Stop offset="1" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="100" fill="url(#grad1)" />
            </Svg>
          </Animated.View>

          {/* Middle warm glow - golden - INCREASED SPREAD */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulseAnim2 }]}>
            <Svg height="100%" width="100%" viewBox="0 0 100 100">
              <Defs>
                <RadialGradient
                  id="grad2"
                  cx="50%"
                  cy="50%"
                  rx="45%"
                  ry="45%"
                  fx="50%"
                  fy="50%"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0.1" stopColor="#fbbf24" stopOpacity="0.7" />
                  <Stop offset="0.6" stopColor="#f59e0b" stopOpacity="0.5" />
                  <Stop offset="1" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="100" fill="url(#grad2)" />
            </Svg>
          </Animated.View>

          {/* Inner bright glow - bright yellow - INCREASED BRIGHTNESS */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulseAnim3 }]}>
            <Svg height="100%" width="100%" viewBox="0 0 100 100">
              <Defs>
                <RadialGradient
                  id="grad3"
                  cx="50%"
                  cy="50%"
                  rx="35%"
                  ry="40%"
                  fx="50%"
                  fy="50%"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0.1" stopColor="#fcd34d" stopOpacity="0.8" />
                  <Stop offset="0.6" stopColor="#fbbf24" stopOpacity="0.4" />
                  <Stop offset="1" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="100" fill="url(#grad3)" />
            </Svg>
          </Animated.View>

          {/* Swamiji image */}
          <Image
            source={require('../assets/images/swamiji-darshan.png')}
            style={styles.darshanImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Control buttons - Audio toggle, Pooja, and Aarti */}
      <View style={styles.controlButtonsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleAudio}
          activeOpacity={0.7}
        >
          <View style={styles.controlButtonInner}>
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={24}
              color="#fbbf24"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePoojaPress}
          activeOpacity={0.7}
        >
          <View style={styles.controlButtonInner}>
            <Ionicons
              name="sparkles-outline"
              size={24}
              color="#fbbf24"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleAartiPress}
          activeOpacity={0.7}
        >
          <View style={styles.controlButtonInner}>
            <Ionicons
              name="flame"
              size={24}
              color="#fbbf24"
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Flower Animation */}
      <FlowerAnimation
        ref={flowerAnimationRef}
        startX={SCREEN_WIDTH / 2}
        startY={SCREEN_HEIGHT - 128}
        groundY={(SCREEN_HEIGHT + IMAGE_HEIGHT) / 2 - 20}
      />

      {/* Aarti Animation */}
      <AartiAnimation
        ref={aartiAnimationRef}
        centerX={SCREEN_WIDTH / 2}
        centerY={SCREEN_HEIGHT / 2}
        flameLength={0.8}        // Add this line
        flickerIntensity={0.8}    // Add this line
        diyaSize={80}             // Add this line     
        flameBaseGap={15}  // Add this line - smaller values = closer together 
      />

      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
        <Ionicons name="close" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backgroundColor: '#000',
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  auraContainer: {
    width: 600, // Increased size even further for massive glow spread
    height: 600,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  darshanImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    zIndex: 10,
    // Optional: subtle shadow on the image itself to separate it from the glow
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  controlButtonsContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 20,
  },
  controlButton: {
    padding: 4,
  },
  controlButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default DarshanOverlay;
