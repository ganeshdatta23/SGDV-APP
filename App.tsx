/**
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StatusBar, StyleSheet, Text, View, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RadialGradient } from 'react-native-gradients';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import SimpleCompassView, { COMPASS_THEME, ThemeMode } from './components/CompassView';
import { BottomNav, Tab } from './components/BottomNav';
import EventsView from './components/EventsView';
import SettingsView from './components/SettingsView';
import DarshanOverlay from './components/DarshanOverlay';
import { fetchLocationDirect, calculateSunTimes } from './utils/sgvdApi';
import { initializeNotifications, scheduleAlarms } from './utils/alarmManager';

// ============================================================================
// APP BACKGROUND THEMES (synced with CompassView theme)
// ============================================================================
// Available themes: 'light' | 'dark' | 'cosmic'
// - light: Orange/amber sunrise gradient
// - dark: Dark stone/black night gradient  
// - cosmic: Red-black cosmic gradient (from archive demo_sgvd_ui_5)
// To switch themes, change COMPASS_THEME in components/CompassView.tsx
// Both the compass and app background will automatically update

const APP_BACKGROUNDS = {
  light: {
    // Orange/amber gradient (sunrise theme)
    gradientColors: ['#FF6B35', '#F7931E'] as const,
    gradientLocations: [0, 1] as const,
    statusBarStyle: 'light-content' as const,
    headerTextColor: '#FFFFFF',
    subtitleColor: '#FFFFFF',
    buttonBg: 'rgba(255, 255, 255, 0.2)',
    buttonBorder: 'rgba(255, 255, 255, 0.5)',
    buttonText: '#FFFFFF',
    modalBg: 'rgba(0, 30, 60, 0.95)',
    modalBorder: 'rgba(255, 215, 0, 0.6)',
    modalTitle: '#FFD700',
    modalText: '#E6E6FA',
  },
  dark: {
    // Dark stone/black gradient (night theme from archive)
    // Converted from: bg-[radial-gradient(ellipse_at_top)] from-stone-900/80 via-stone-950 to-black
    gradientColors: ['#292524', '#1c1917', '#0c0a09', '#000000'] as const,
    gradientLocations: [0, 0.3, 0.6, 1] as const,
    statusBarStyle: 'light-content' as const,
    headerTextColor: '#e7e5e4',
    subtitleColor: '#a8a29e',
    buttonBg: 'rgba(28, 25, 23, 0.6)',
    buttonBorder: '#44403c',
    buttonText: '#e7e5e4',
    modalBg: 'rgba(12, 10, 9, 0.95)',
    modalBorder: '#44403c',
    modalTitle: '#FCD34D',
    modalText: '#a8a29e',
  },
  cosmic: {
    // Red-black cosmic gradient (from archive demo_sgvd_ui_5)
    // Using REAL radial gradient: bg-[radial-gradient(ellipse_at_top)] from-amber-700/90 via-rose-950 to-slate-950
    // amber-700: #b45309, rose-950: #4c0519, slate-950: #020617
    isRadial: true, // Flag to use RadialGradient instead of LinearGradient
    radialColorList: [
      { offset: '0%', color: '#b45309', opacity: '0.9' },   // amber-700/90 at center
      { offset: '40%', color: '#4c0519', opacity: '1' },    // rose-950
      { offset: '100%', color: '#020617', opacity: '1' },   // slate-950 at edges
    ],
    // Fallback linear gradient colors (not used when isRadial is true)
    gradientColors: ['#b45309', '#4c0519', '#020617'] as const,
    gradientLocations: [0, 0.4, 1] as const,
    statusBarStyle: 'light-content' as const,
    headerTextColor: '#FFFFFF',
    subtitleColor: '#fbbf24', // amber-400 for better contrast
    buttonBg: 'rgba(76, 5, 25, 0.6)', // rose-950 with opacity
    buttonBorder: 'rgba(251, 191, 36, 0.5)', // amber-400 border
    buttonText: '#FFFFFF',
    modalBg: 'rgba(2, 6, 23, 0.95)', // slate-950 with opacity
    modalBorder: 'rgba(251, 191, 36, 0.6)', // amber-400 border
    modalTitle: '#fbbf24', // amber-400
    modalText: '#fef3c7', // amber-100
  },
};

function App(): React.JSX.Element {
  // Dynamic location state
  const [targetLocation, setTargetLocation] = useState<{latitude: number; longitude: number; address: string; googleMapsUrl: string} | null>(null);
  
  // Log targetLocation changes
  useEffect(() => {
    console.log('🎯 App.tsx: targetLocation state changed:', targetLocation);
  }, [targetLocation]);
  
  // Alignment state
  const [isAligned, setIsAligned] = useState(false);
  const [nextSunEvent, setNextSunEvent] = useState<{ time: Date; type: 'sunrise' | 'sunset'; isToday: boolean } | null>(null);
  const [isClosedManually, setIsClosedManually] = useState(false);
  
  // Navigation state
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  
  // Theme state - allows dynamic theme switching
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(COMPASS_THEME);
  
  // Audio enabled state - can be toggled in settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Audio volume state (0-1 range)
  const [audioVolume, setAudioVolume] = useState(0.7);
  
  // Get current background theme based on state
  const currentBgTheme = APP_BACKGROUNDS[currentTheme];

  // Video player setup for expo-video
  const videoSource = require('./assets/videos/darshan-background.mp4');
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.muted = true;
    player.playbackRate = 0.6; // Play video at 0.5x speed
    // Don't auto-play on mount - will be controlled by alignment state
  });

  // Audio player setup for expo-audio
  const audioPlayer = useAudioPlayer(require('./assets/audio/background-music.mp3'));

  // App state tracking for background/foreground
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
      setAppStateVisible(nextAppState);
      console.log('App state changed:', nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  // Fetch location on component mount
  useEffect(() => {
    const loadLocation = async () => {
      try {
        console.log('🔍 App.tsx: Starting location fetch process...');
        console.log('🔍 App.tsx: About to call fetchLocationDirect()');
        const location = await fetchLocationDirect();
        console.log('🔍 App.tsx: fetchLocationDirect returned:', location);
        if (location) {
          console.log('✅ App.tsx: Target location loaded successfully:', location);
          setTargetLocation(location);
        } else {
          console.log('❌ App.tsx: fetchLocationDirect returned null/undefined');
        }
      } catch (error) {
        console.error('❌ App.tsx: Failed to load target location:', error);
        if (error instanceof Error) {
          console.error('❌ App.tsx: Error details:', error.message, error.stack);
        } else {
          console.error('❌ App.tsx: Error details:', String(error));
        }
      }
    };

    console.log('🚀 App.tsx: Component mounted, starting location load...');
    
    // Initialize audio mode
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
        console.log('✅ Audio mode configured');
      } catch (error) {
        console.log('❌ Failed to configure audio mode', error);
      }
    };
    
    setupAudio();
    
    // Initialize notifications
    initializeNotifications();
    
    loadLocation();
  }, []);

  // Play / pause video depending on alignment and app state
  useEffect(() => {
    if (!videoPlayer) {
      return;
    }

    const playVideo = () => {
      try {
        // Only play if aligned AND app is in foreground
        if (isAligned && appStateVisible === 'active') {
          console.log('🎬 Playing darshan video...');
          videoPlayer.loop = true;
          videoPlayer.muted = true;
          // Reset to start to ensure video plays from beginning
          videoPlayer.currentTime = 0;
          videoPlayer.play();
          console.log('✅ Video playback started');
        } else {
          // Pause video if not aligned or app is in background
          if (videoPlayer.playing) {
            videoPlayer.pause();
            if (appStateVisible !== 'active') {
              console.log('🎬 Video paused - app in background');
            } else {
              console.log('🎬 Video paused - not aligned');
            }
          }
        }
      } catch (error) {
        console.log('❌ Video playback error:', error);
      }
    };

    playVideo();
  }, [isAligned, appStateVisible, videoPlayer]);

  // Pause audio when app goes to background (DarshanOverlay handles playback)
  useEffect(() => {
    if (!audioPlayer) {
      return;
    }

    // Pause audio if app is in background
    if (appStateVisible !== 'active' && audioPlayer.playing) {
      audioPlayer.pause();
      console.log('🎵 Audio paused - app in background');
    }
  }, [appStateVisible, audioPlayer]);

  // Calculate and display next sunrise/sunset using new API
  useEffect(() => {
    const getSunEvent = async () => {
      if (targetLocation) {
        try {
          // Get today's sun times (cached after first call)
          const sunTimes = await calculateSunTimes(targetLocation.latitude, targetLocation.longitude);
          const now = new Date();
          
          // Determine next event
          if (now < sunTimes.sunrise) {
            setNextSunEvent({ time: sunTimes.sunrise, type: 'sunrise', isToday: true });
          } else if (now < sunTimes.sunset) {
            setNextSunEvent({ time: sunTimes.sunset, type: 'sunset', isToday: true });
          } else {
            // Tomorrow's sunrise
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowTimes = await calculateSunTimes(targetLocation.latitude, targetLocation.longitude, tomorrow);
            setNextSunEvent({ time: tomorrowTimes.sunrise, type: 'sunrise', isToday: false });
          }
          
          // Schedule alarms for sunrise/sunset
          console.log('⏰ Scheduling alarms for sunrise/sunset...');
          await scheduleAlarms(targetLocation.latitude, targetLocation.longitude);
        } catch (error) {
          console.error('Error getting sun times:', error);
          // Fallback to show a generic message
          setNextSunEvent(null);
        }
      }
    };
    
    getSunEvent();
  }, [targetLocation]);

  const handleAlignmentChange = (aligned: boolean) => {
    console.log('🧭 Alignment changed:', aligned);
    console.log('🎵 App state:', appStateVisible);
    console.log('🎵 Audio player exists:', !!audioPlayer);
    console.log('🔒 Is closed manually:', isClosedManually);
    console.log('🔒 Current isAligned state:', isAligned);
    
    // Only allow alignment if not manually closed
    if (aligned && !isClosedManually) {
      console.log('✅ Setting aligned to TRUE - Video overlay will render');
      setIsAligned(true);
    } else if (!aligned) {
      console.log('❌ Setting aligned to FALSE - Video overlay will hide');
      setIsAligned(false);
      // Stop audio when dealigned
      if (audioPlayer && audioPlayer.playing) {
        audioPlayer.pause();
        console.log('🔇 Audio stopped - dealigned');
      }
      // Reset manual close state when alignment is lost
      if (isClosedManually) {
        setIsClosedManually(false);
        console.log('🔓 Manual close state reset - ready for next alignment');
      }
    } else if (aligned && isClosedManually) {
      console.log('🚫 Alignment blocked - manually closed');
    }
  };

  // Determine if we should use radial gradient (for cosmic theme)
  const useRadialGradient = 'isRadial' in currentBgTheme && currentBgTheme.isRadial;

  // Shared content for both gradient types
  const appContent = (
    <>
      <StatusBar 
        barStyle={currentBgTheme.statusBarStyle}
        backgroundColor="transparent" 
        translucent={true}
      />
    
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: currentBgTheme.headerTextColor }]}>
            {currentTab === 'home' ? 'Guru Digvandanam' : currentTab === 'events' ? 'Programs' : 'Settings'}
          </Text>
          <Text style={[styles.subtitle, { color: currentBgTheme.subtitleColor }]}>
            {currentTab === 'home' 
              ? 'Offer your prayers to the direction of Appaji' 
              : currentTab === 'events'
              ? 'Stay updated with upcoming programs'
              : 'Customize your experience'}
          </Text>
        </View>
      </View>

      {/* Main Content Area - Conditional based on tab */}
      {currentTab === 'home' && (
        <>
          {/* Compass Component */}
          {targetLocation ? (
            <SimpleCompassView 
              targetLocation={targetLocation}
              onAlignmentChange={handleAlignmentChange}
              hideStatusWhenAligned={true}
              theme={currentTheme}
            />
          ) : (
            <SimpleCompassView 
              targetHeading={45}
              onAlignmentChange={handleAlignmentChange}
              hideStatusWhenAligned={true}
              theme={currentTheme}
            />
          )}
        </>
      )}

      {currentTab === 'events' && <EventsView />}

      {currentTab === 'settings' && (
        <SettingsView 
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          audioEnabled={audioEnabled}
          onAudioToggle={setAudioEnabled}
          audioVolume={audioVolume}
          onVolumeChange={setAudioVolume}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav 
        currentTab={currentTab} 
        onTabChange={setCurrentTab}
        currentTheme={currentTheme}
      />

      {/* Darshan overlay with golden aura */}
      <DarshanOverlay
        visible={isAligned}
        videoPlayer={videoPlayer}
        audioPlayer={audioPlayer}
        audioEnabled={audioEnabled}
        audioVolume={audioVolume}
        onClose={() => {
          console.log('🔴 Close button pressed - stopping audio and requiring fresh alignment');
          setIsAligned(false);
          setIsClosedManually(true);
          // Pause audio when closing
          if (audioPlayer) {
            audioPlayer.pause();
          }
        }}
      />

    </>
  );

  // Single consistent render structure to prevent component remounting on theme change
  return (
    <View style={styles.container}>
      {/* Background Layer - switches between RadialGradient and LinearGradient */}
      {useRadialGradient && 'radialColorList' in currentBgTheme ? (
        <View style={StyleSheet.absoluteFill}>
          <RadialGradient
            x="50%"
            y="60%"
            rx="100%"
            ry="100%"
            colorList={currentBgTheme.radialColorList}
          />
        </View>
      ) : (
        <LinearGradient
          colors={[...currentBgTheme.gradientColors]}
          locations={[...currentBgTheme.gradientLocations]}
          style={StyleSheet.absoluteFill}
        />
      )}
      
      {/* Content Layer - always the same structure */}
      <SafeAreaView style={styles.safeArea}>
        {appContent}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
    // Color applied dynamically via inline styles
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    // Color applied dynamically via inline styles
  },
  sunEventText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default App;
