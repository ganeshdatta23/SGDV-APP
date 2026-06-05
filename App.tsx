/**
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StatusBar, StyleSheet, Text, View, AppState, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { RadialGradient } from 'react-native-gradients';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import SimpleCompassView from './components/CompassView';
import { BottomNav } from './components/BottomNav';
import EventsView from './components/EventsView';
import SettingsView from './components/SettingsView';
import SunCycleView from './components/SunCycleView';
import DarshanOverlay from './components/DarshanOverlay';
import Walkthrough from './components/Walkthrough';
import { fetchLocationDirect, calculateSunTimes } from './utils/sgvdApi';
import { initializeNotifications, scheduleAlarms, addNotificationReceivedListener, addNotificationResponseReceivedListener, handleNotificationAction, scheduleTestNotificationIn, cancelAllAlarms, getAlarmConfig } from './utils/alarmManager';
import { stopAlarmNotification, scheduleSnoozeAlarm, scheduleNotifeeAlarm } from './utils/notifeeAlarmService';
import { ThemeMode, Tab, TargetLocation, SunEventInfo } from './types';
import {
  APP_BACKGROUNDS,
  COMPASS_THEME,
  ALARM_MAX_DURATION_MS,
  VIDEO_PLAYBACK_RATE,
  VIDEO_LOOP,
  VIDEO_MUTED,
  AUDIO_VOLUME_DEFAULT,
  TEXT_GURU_DIGVANDANAM,
  TEXT_OFFER_PRAYERS,
  TEXT_SUNRISE_SUNSET_ALARMS,
  TEXT_PROGRAMS,
  TEXT_STAY_UPDATED,
  TEXT_SETTINGS,
  TEXT_CUSTOMIZE_EXPERIENCE,
  TEXT_TIME_FOR_PRAYERS,
  TEXT_STOP_ALARM,
  WALKTHROUGH_STORAGE_KEY,
} from './constants';
import { appStyles } from './styles/AppStyles';

// ============================================================================
// APP BACKGROUND THEMES (synced with CompassView theme)
// ============================================================================
// Available themes: 'light' | 'dark' | 'cosmic'
// - light: Orange/amber sunrise gradient
// - dark: Dark stone/black night gradient  
// - cosmic: Red-black cosmic gradient (from archive demo_sgvd_ui_5)
// To switch themes, change COMPASS_THEME in constants.ts
// Both the compass and app background will automatically update

function App(): React.JSX.Element {
  // Dynamic location state
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);
  
  // Log targetLocation changes
  useEffect(() => {
    console.log('App.tsx: targetLocation state changed:', targetLocation);
  }, [targetLocation]);
  
  // Alignment state
  const [isAligned, setIsAligned] = useState(false);
  const [nextSunEvent, setNextSunEvent] = useState<SunEventInfo | null>(null);
  const [isClosedManually, setIsClosedManually] = useState(false);
  
  // Navigation state
  const [currentTab, setCurrentTab] = useState<Tab>('home');

  // First-run walkthrough: shown once, gated by an AsyncStorage flag.
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  
  // Theme state - allows dynamic theme switching
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(COMPASS_THEME);
  
  // Audio enabled state - can be toggled in settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Audio volume state (0-1 range)
  const [audioVolume, setAudioVolume] = useState(AUDIO_VOLUME_DEFAULT);
  
  // Get current background theme based on state
  const currentBgTheme = APP_BACKGROUNDS[currentTheme];

  // Video player setup for expo-video
  const videoSource = require('./assets/videos/darshan-background.mp4');
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = VIDEO_LOOP;
    player.muted = VIDEO_MUTED;
    player.playbackRate = VIDEO_PLAYBACK_RATE;
    // Don't auto-play on mount - will be controlled by alignment state
  });

  // Audio player setup for expo-audio
  const audioPlayer = useAudioPlayer(require('./assets/audio/background-music.mp3'));
  
  // Alarm audio player for sunrise/sunset alarms
  const alarmPlayer = useAudioPlayer(require('./assets/audio/custom_alert.wav'));
  
  // Track if alarm is currently playing
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // Track active notifee alarm notification ID (Android only)
  const [activeAlarmNotificationId, setActiveAlarmNotificationId] = useState<string | null>(null);

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

  // First-run walkthrough check: show the onboarding overlay only if the user
  // has not seen it yet. Runs once on mount; failures are non-fatal (we simply
  // don't show it rather than blocking the app).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(WALKTHROUGH_STORAGE_KEY);
        if (mounted && seen !== 'true') {
          setShowWalkthrough(true);
        }
      } catch (error) {
        console.log('Walkthrough flag read failed:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist that the walkthrough has been seen, then dismiss it. Called from
  // both "Get Started" (last step) and "Skip".
  const handleWalkthroughComplete = useCallback(async () => {
    setShowWalkthrough(false);
    try {
      await AsyncStorage.setItem(WALKTHROUGH_STORAGE_KEY, 'true');
    } catch (error) {
      console.log('Walkthrough flag write failed:', error);
    }
  }, []);

  // Fetch location on component mount
  useEffect(() => {
    const loadLocation = async () => {
      try {
        console.log('App.tsx: Starting location fetch process...');
        console.log('App.tsx: Calling fetchLocationDirect() with fallback chain (API -> Cache -> Hardcoded)');
        
        // fetchLocationDirect() always returns a valid location through its fallback chain:
        // 1. Try API first
        // 2. If API fails, check internal cache (in-memory + AsyncStorage)
        // 3. If cache fails, use hardcoded fallback location
        const location = await fetchLocationDirect();
        
        console.log('App.tsx: Target location loaded successfully:', {
          name: location.name,
          coords: `${location.latitude}, ${location.longitude}`,
          address: location.address,
        });
        setTargetLocation(location);
      } catch (error) {
        // This should never happen since fetchLocationDirect has complete fallback chain
        console.error('App.tsx: Unexpected error loading location:', error);
        if (error instanceof Error) {
          console.error('App.tsx: Error details:', error.message, error.stack);
        } else {
          console.error('App.tsx: Error details:', String(error));
        }
      }
    };

    console.log('App.tsx: Component mounted, starting location load...');
    
    // Initialize audio mode - enable background playback for alarms
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true, // Enable background audio for alarms
        });
        console.log('Audio mode configured with background playback');
      } catch (error) {
        console.log('Failed to configure audio mode', error);
      }
    };
    
    setupAudio();
    
    // Initialize notifications (async)
    const setupNotifications = async () => {
      try {
        const initialized = await initializeNotifications();
        if (initialized) {
          console.log('Notifications ready');
        } else {
          console.log('Notifications not available - permissions may be denied');
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };
    
    setupNotifications();
    
    loadLocation();
  }, []);
  
  // Notifee foreground event listener + initial notification check (Android only)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let unsubscribe: (() => void) | undefined;

    const setupNotifee = async () => {
      try {
        const notifee = (await import('@notifee/react-native')).default;
        const { EventType } = await import('@notifee/react-native');

        // Check if app was launched by a full-screen alarm notification
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification?.android?.asForegroundService) {
          setIsAlarmPlaying(true);
          setActiveAlarmNotificationId(initialNotification.notification.id || null);
        }

        // Listen for notifee events while app is in foreground
        unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
          const { notification, pressAction } = detail;

          if (type === EventType.DELIVERED) {
            // Alarm notification delivered while app is in foreground
            if (notification?.android?.asForegroundService) {
              setIsAlarmPlaying(true);
              setActiveAlarmNotificationId(notification.id || null);
            }
          }

          if (type === EventType.ACTION_PRESS) {
            if (pressAction?.id === 'stop') {
              setIsAlarmPlaying(false);
              setActiveAlarmNotificationId(null);
              // Tear down the foreground service (stops the looping sound),
              // then remove the notification.
              notifee.stopForegroundService();
              if (notification?.id) {
                notifee.cancelNotification(notification.id);
              }
            } else if (pressAction?.id === 'snooze') {
              setIsAlarmPlaying(false);
              setActiveAlarmNotificationId(null);
              notifee.stopForegroundService();
              if (notification?.id) {
                notifee.cancelNotification(notification.id);
              }
              // Reschedule using the configured snooze duration + sound
              // (matches the background handler in index.js).
              getAlarmConfig().then((cfg) => {
                scheduleSnoozeAlarm(
                  notification?.id || 'snooze',
                  cfg.alarmSound,
                  cfg.snoozeMinutes,
                );
              });
            }
          }

          if (type === EventType.DISMISSED) {
            setIsAlarmPlaying(false);
            setActiveAlarmNotificationId(null);
          }
        });
      } catch (error) {
        console.log('Notifee setup skipped (not available):', error);
      }
    };

    setupNotifee();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Dev-only deep links so an automated test can exercise the alarm without UI
  // navigation. e.g. schedule a near-future alarm, then kill the app, to verify
  // it still fires from a closed state:
  //   adb shell am start -a android.intent.action.VIEW -d "sgdv://schedule-test?secs=15"
  //   adb shell am start -a android.intent.action.VIEW -d "sgdv://cancel-all"
  // The whole block is stripped from production builds by the __DEV__ guard.
  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'android') return;

    const handleUrl = async (url: string | null) => {
      if (!url || !url.startsWith('sgdv://')) return;
      try {
        const action = url.replace('sgdv://', '').split('?')[0];
        const secsMatch = url.match(/[?&]secs=(\d+)/);
        const secs = secsMatch ? parseInt(secsMatch[1], 10) : 15;
        // ?sound=custom uses the bundled custom_alert sound; default otherwise.
        const sound: 'default' | 'custom' = /[?&]sound=custom/.test(url)
          ? 'custom'
          : 'default';

        if (action === 'schedule-test') {
          await scheduleNotifeeAlarm(
            'e2e-scheduled-alarm',
            'Scheduled Test Alarm',
            'Fired from a scheduled trigger while the app was closed.',
            Date.now() + secs * 1000,
            sound,
          );
        } else if (action === 'schedule-notif') {
          // Silent notification-mode path (expo-notifications), to verify
          // notifications also fire in the background / when the app is closed.
          await scheduleTestNotificationIn(secs);
        } else if (action === 'cancel-all') {
          await cancelAllAlarms();
        }
      } catch (error) {
        console.log('Deep-link handler error:', error);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Reference for alarm auto-stop timeout
  const alarmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to start playing the alarm
  // Note: Only plays the alarm sound, NOT the background music (which is controlled by DarshanOverlay)
  const startAlarm = useCallback(() => {
    if (alarmPlayer && !isAlarmPlaying) {
      try {
        alarmPlayer.loop = true;
        alarmPlayer.volume = 1.0;
        alarmPlayer.play();
        setIsAlarmPlaying(true);
        console.log('Alarm sound started');
        
        // Auto-stop after 1 minute
        alarmTimeoutRef.current = setTimeout(() => {
          console.log('Alarm auto-stopped after 1 minute');
          if (alarmPlayer) {
            try {
              alarmPlayer.pause();
              setIsAlarmPlaying(false);
            } catch (error) {
              console.log('Could not auto-stop alarm:', error);
            }
          }
        }, ALARM_MAX_DURATION_MS);
        
      } catch (error) {
        console.error('Failed to play alarm sound:', error);
      }
    }
  }, [alarmPlayer, isAlarmPlaying]);
  
  // Function to stop the alarm
  const stopAlarm = useCallback(() => {
    // Clear the auto-stop timeout
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }

    // On Android: stop the notifee foreground service notification
    if (Platform.OS === 'android' && activeAlarmNotificationId) {
      stopAlarmNotification(activeAlarmNotificationId);
      setActiveAlarmNotificationId(null);
      setIsAlarmPlaying(false);
      console.log('Android notifee alarm stopped');
      return;
    }

    // iOS / fallback: stop expo-audio player
    if (alarmPlayer && isAlarmPlaying) {
      try {
        alarmPlayer.pause();
        setIsAlarmPlaying(false);
        console.log('Alarm stopped');
      } catch (error) {
        console.log('Could not stop alarm:', error);
      }
    }
  }, [alarmPlayer, isAlarmPlaying, activeAlarmNotificationId]);
  
  // Listen for alarm notifications (when app is in foreground)
  useEffect(() => {
    const subscription = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      
      // Check if this is an alarm notification
      const data = notification.request.content.data;
      if (data && data.isAlarm && data.alarmSound !== 'default') {
        console.log('Alarm notification received - playing alarm sound!');
        startAlarm();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [startAlarm]);
  
  // Listen for notification taps (when user opens app from notification)
  useEffect(() => {
    const subscription = addNotificationResponseReceivedListener(async (response) => {
      console.log('Notification response received:', response);
      
      // Handle notification category actions (Stop, Snooze, etc.)
      await handleNotificationAction(response);
      
      // Check if this is an alarm notification and handle accordingly
      const data = response.notification.request.content.data;
      if (data && data.isAlarm) {
        // Only play alarm sound if it's the default action (not Stop or Snooze)
        if (response.actionIdentifier === 'com.apple.UNNotificationDefaultActionIdentifier' || 
            response.actionIdentifier === 'default') {
          if (data.alarmSound !== 'default') {
            console.log('Alarm notification tapped - playing alarm sound!');
            startAlarm();
          }
        } else if (response.actionIdentifier === 'STOP_ALARM') {
          console.log('Stop alarm action - stopping any playing alarm');
          stopAlarm();
        }
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [startAlarm, stopAlarm]);

  // Play / pause video depending on alignment and app state
  useEffect(() => {
    if (!videoPlayer) {
      return;
    }

    const playVideo = () => {
      try {
        // Only play if aligned AND app is in foreground
        if (isAligned && appStateVisible === 'active') {
          console.log('Playing darshan video...');
          videoPlayer.loop = true;
          videoPlayer.muted = true;
          // Reset to start to ensure video plays from beginning
          videoPlayer.currentTime = 0;
          videoPlayer.play();
          console.log('Video playback started');
        } else {
          // Pause video if not aligned or app is in background
          if (videoPlayer.playing) {
            videoPlayer.pause();
            if (appStateVisible !== 'active') {
              console.log('Video paused - app in background');
            } else {
              console.log('Video paused - not aligned');
            }
          }
        }
      } catch (error) {
        console.log('Video playback error:', error);
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
      console.log('Audio paused - app in background');
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
          console.log('Scheduling alarms for sunrise/sunset...');
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
    console.log('Alignment changed:', aligned);
    console.log('App state:', appStateVisible);
    console.log('Audio player exists:', !!audioPlayer);
    console.log('Is closed manually:', isClosedManually);
    console.log('Current isAligned state:', isAligned);
    
    // Only allow alignment if not manually closed
    if (aligned && !isClosedManually) {
      console.log('Setting aligned to TRUE - Video overlay will render');
      setIsAligned(true);
    } else if (!aligned) {
      console.log('Setting aligned to FALSE - Video overlay will hide');
      setIsAligned(false);
      // Stop audio when dealigned
      if (audioPlayer && audioPlayer.playing) {
        audioPlayer.pause();
        console.log('Audio stopped - dealigned');
      }
      // Reset manual close state when alignment is lost
      if (isClosedManually) {
        setIsClosedManually(false);
        console.log('Manual close state reset - ready for next alignment');
      }
    } else if (aligned && isClosedManually) {
      console.log('Alignment blocked - manually closed');
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
      <View style={appStyles.header}>
        <View style={appStyles.titleContainer}>
          <Text style={[appStyles.title, { color: currentBgTheme.headerTextColor }]}>
            {currentTab === 'home' 
              ? TEXT_GURU_DIGVANDANAM
              : currentTab === 'sun'
              ? TEXT_SUNRISE_SUNSET_ALARMS
              : currentTab === 'events' 
              ? TEXT_PROGRAMS
              : TEXT_SETTINGS}
          </Text>
          <Text style={[appStyles.subtitle, { color: currentBgTheme.subtitleColor }]}>
            {currentTab === 'home' 
              ? TEXT_OFFER_PRAYERS
              : currentTab === 'sun'
              ? ''
              : currentTab === 'events'
              ? TEXT_STAY_UPDATED
              : TEXT_CUSTOMIZE_EXPERIENCE}
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

      {currentTab === 'sun' && targetLocation && (
        <SunCycleView
          latitude={targetLocation.latitude}
          longitude={targetLocation.longitude}
        />
      )}

      {currentTab === 'events' && <EventsView theme={currentTheme} />}

      {currentTab === 'settings' && (
        <SettingsView 
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          audioEnabled={audioEnabled}
          onAudioToggle={setAudioEnabled}
          audioVolume={audioVolume}
          onVolumeChange={setAudioVolume}
          targetLocation={targetLocation}
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
          console.log('Close button pressed - stopping audio and requiring fresh alignment');
          setIsAligned(false);
          setIsClosedManually(true);
          // Pause audio when closing
          if (audioPlayer) {
            audioPlayer.pause();
          }
        }}
      />

      {/* Alarm Overlay - shows when alarm is playing */}
      <Modal
        visible={isAlarmPlaying}
        transparent={true}
        animationType="fade"
        onRequestClose={stopAlarm}
      >
        <View style={appStyles.alarmOverlay}>
          <View style={appStyles.alarmCard}>
            <Text style={appStyles.alarmIcon}>Alarm</Text>
            <Text style={appStyles.alarmTitle}>Alarm!</Text>
            <Text style={appStyles.alarmMessage}>{TEXT_TIME_FOR_PRAYERS}</Text>
            <TouchableOpacity style={appStyles.stopAlarmButton} onPress={stopAlarm}>
              <Text style={appStyles.stopAlarmText}>{TEXT_STOP_ALARM}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </>
  );

  // Single consistent render structure to prevent component remounting on theme change
  return (
    <View style={appStyles.container}>
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
          colors={currentBgTheme.gradientColors as any}
          locations={currentBgTheme.gradientLocations as any}
          style={StyleSheet.absoluteFill}
        />
      )}
      
      {/* Content Layer - always the same structure */}
      <SafeAreaView style={appStyles.safeArea}>
        {appContent}
      </SafeAreaView>

      {/* First-run onboarding overlay (renders above everything via its Modal) */}
      <Walkthrough
        visible={showWalkthrough}
        theme={currentTheme}
        onComplete={handleWalkthroughComplete}
      />
    </View>
  );
}

export default App;
