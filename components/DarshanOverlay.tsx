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
import { VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { FlowerAnimation } from './FlowerAnimation';
import { AartiAnimation } from './AartiAnimation';
import { DarshanOverlayProps, FlowerAnimationRef, AartiAnimationRef } from '../types';
import {
  DARSHAN_IMAGE_WIDTH,
  DARSHAN_IMAGE_HEIGHT,
  DARSHAN_FADE_DURATION_MS,
  DARSHAN_SPRING_FRICTION,
  DARSHAN_SPRING_TENSION,
  DARSHAN_PULSE_1_DURATION_MS,
  DARSHAN_PULSE_2_DURATION_MS,
  DARSHAN_PULSE_3_DURATION_MS,
  DARSHAN_PULSE_1_MIN_OPACITY,
  DARSHAN_PULSE_1_MAX_OPACITY,
  DARSHAN_PULSE_2_MIN_OPACITY,
  DARSHAN_PULSE_2_MAX_OPACITY,
  DARSHAN_PULSE_3_MIN_OPACITY,
  DARSHAN_PULSE_3_MAX_OPACITY,
  DARSHAN_PULSE_2_START_DELAY_MS,
  DARSHAN_PULSE_3_START_DELAY_MS,
  DARSHAN_CONTROL_BUTTON_ICON_COLOR,
  DARSHAN_CLOSE_BUTTON_ICON_COLOR,
} from '../constants';
import { darshanOverlayStyles } from '../styles/DarshanOverlayStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  audioVolume = 1.0,
}) => {
  const [isMuted, setIsMuted] = useState(!audioEnabled);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  
  // Animated values for golden aura pulse effect
  const pulseAnim1 = useRef(new Animated.Value(DARSHAN_PULSE_1_MIN_OPACITY)).current;
  const pulseAnim2 = useRef(new Animated.Value(DARSHAN_PULSE_2_MIN_OPACITY)).current;
  const pulseAnim3 = useRef(new Animated.Value(DARSHAN_PULSE_3_MIN_OPACITY)).current;
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
          duration: DARSHAN_FADE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: DARSHAN_SPRING_FRICTION,
          tension: DARSHAN_SPRING_TENSION,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse animation for outer glow - slower, more ethereal
      const pulse1 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: DARSHAN_PULSE_1_MAX_OPACITY,
            duration: DARSHAN_PULSE_1_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, {
            toValue: DARSHAN_PULSE_1_MIN_OPACITY,
            duration: DARSHAN_PULSE_1_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      // Middle glow pulse - offset timing
      const pulse2 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim2, {
            toValue: DARSHAN_PULSE_2_MAX_OPACITY,
            duration: DARSHAN_PULSE_2_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim2, {
            toValue: DARSHAN_PULSE_2_MIN_OPACITY,
            duration: DARSHAN_PULSE_2_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      // Inner glow pulse
      const pulse3 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim3, {
            toValue: DARSHAN_PULSE_3_MAX_OPACITY,
            duration: DARSHAN_PULSE_3_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim3, {
            toValue: DARSHAN_PULSE_3_MIN_OPACITY,
            duration: DARSHAN_PULSE_3_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      pulse1.start();
      setTimeout(() => pulse2.start(), DARSHAN_PULSE_2_START_DELAY_MS);
      setTimeout(() => pulse3.start(), DARSHAN_PULSE_3_START_DELAY_MS);

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
        console.log(`Darshan audio started (will play once at volume ${audioVolume})`);
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
          console.log('Audio finished, auto-muting');
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
      console.log(`Audio unmuted and playing at volume ${audioVolume}`);
      
      // Also play the video when audio is manually turned on
      if (videoPlayer && visible) {
        try {
          videoPlayer.loop = true;
          videoPlayer.muted = true;
          videoPlayer.currentTime = 0;
          videoPlayer.play();
          console.log('Video playback started - audio manually enabled');
        } catch (error) {
          console.log('Video playback error when unmuting audio:', error);
        }
      }
    } else {
      // Mute
      setIsMuted(true);
      try {
        audioPlayer.pause();
        console.log('Audio muted');
      } catch (error) {
        console.log('Could not pause audio (player may be disposed)');
      }
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
          console.log('Audio reset to position 0 - ready for fresh playback');
        }
      } else {
        // Stop audio when overlay is not visible (dealigned)
        if (audioPlayer && audioPlayer.playing) {
          try {
            audioPlayer.pause();
            console.log('Audio stopped - overlay dealigned');
          } catch (error) {
            console.log('Could not pause audio (player may be disposed)');
          }
        }
      }
    };
    
    resetAudioState();
  }, [visible, audioEnabled, audioPlayer]);

  // Update audio volume dynamically when it changes
  useEffect(() => {
    if (audioPlayer && visible && !isMuted) {
      audioPlayer.volume = audioVolume;
      console.log(`Audio volume updated to ${Math.round(audioVolume * 100)}%`);
    }
  }, [audioVolume, audioPlayer, visible, isMuted]);

  // Handle pooja button press - trigger flower animation
  const handlePoojaPress = () => {
    if (flowerAnimationRef.current) {
      flowerAnimationRef.current.trigger();
      console.log('Pooja flower animation triggered');
    }
  };

  // Handle aarti button press - trigger aarti animation
  const handleAartiPress = () => {
    if (aartiAnimationRef.current) {
      aartiAnimationRef.current.trigger();
      console.log('Aarti animation triggered');
    }
  };

  if (!visible) return null;

  // Animated Svg component for pulsing effect
  const AnimatedSvg = Animated.createAnimatedComponent(Svg);

  return (
    <View style={darshanOverlayStyles.overlay}>
      {/* Background Video */}
      <VideoView
        player={videoPlayer}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Dimming overlay for video */}
      <View style={darshanOverlayStyles.dimmingOverlay} />

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
          darshanOverlayStyles.centerContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Golden Aura - SVG Radial Gradients */}
        <View style={darshanOverlayStyles.auraContainer}>
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
            style={darshanOverlayStyles.darshanImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Control buttons - Audio toggle, Pooja, and Aarti */}
      <View style={darshanOverlayStyles.controlButtonsContainer}>
        <TouchableOpacity
          style={darshanOverlayStyles.controlButton}
          onPress={toggleAudio}
          activeOpacity={0.7}
        >
          <View style={darshanOverlayStyles.controlButtonInner}>
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={24}
              color={DARSHAN_CONTROL_BUTTON_ICON_COLOR}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={darshanOverlayStyles.controlButton}
          onPress={handlePoojaPress}
          activeOpacity={0.7}
        >
          <View style={darshanOverlayStyles.controlButtonInner}>
            <Ionicons
              name="sparkles-outline"
              size={24}
              color={DARSHAN_CONTROL_BUTTON_ICON_COLOR}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={darshanOverlayStyles.controlButton}
          onPress={handleAartiPress}
          activeOpacity={0.7}
        >
          <View style={darshanOverlayStyles.controlButtonInner}>
            <Ionicons
              name="flame"
              size={24}
              color={DARSHAN_CONTROL_BUTTON_ICON_COLOR}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Flower Animation */}
      <FlowerAnimation
        ref={flowerAnimationRef}
        startX={SCREEN_WIDTH / 2}
        startY={SCREEN_HEIGHT - 128}
        groundY={(SCREEN_HEIGHT + DARSHAN_IMAGE_HEIGHT) / 2 - 20}
      />

      {/* Aarti Animation */}
      <AartiAnimation
        ref={aartiAnimationRef}
        centerX={SCREEN_WIDTH / 2}
        centerY={SCREEN_HEIGHT / 2 - 80}
        flameLength={0.8}
        flickerIntensity={0.8}
        diyaSize={80}
        flameBaseGap={15}
        radius={130}
      />

      {/* Close button */}
      <TouchableOpacity style={darshanOverlayStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
        <Ionicons name="close" size={24} color={DARSHAN_CLOSE_BUTTON_ICON_COLOR} />
      </TouchableOpacity>
    </View>
  );
};

export default DarshanOverlay;
