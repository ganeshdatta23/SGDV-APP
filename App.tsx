/**
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StatusBar, StyleSheet, Text, View, AppState, TouchableOpacity, Modal, Platform, Linking, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import ConnectivityPrompt from './components/ConnectivityPrompt';
import StreakCelebrationModal from './components/StreakCelebrationModal';
import StreakSharePrompt from './components/StreakSharePrompt';
import StreakBadge from './components/StreakBadge';
import StreakShareCard from './components/StreakShareCard';
import { fetchLocationDirect, calculateSunTimes, postSunriseCompletion } from './utils/sgvdApi';
import { getConnectivity, subscribeConnectivity, isOnline } from './utils/connectivity';
import {
  evaluateSyncOnOpen,
  handleCameOnline,
  shouldRefetchOnTransition,
  SyncPromptReason,
} from './utils/locationSync';
import { initializeNotifications, scheduleAlarms, addNotificationReceivedListener, addNotificationResponseReceivedListener, handleNotificationAction, scheduleTestNotificationIn, cancelAllAlarms, getAlarmConfig } from './utils/alarmManager';
import { stopAlarmNotification, scheduleSnoozeAlarm, scheduleNotifeeAlarm } from './utils/notifeeAlarmService';
import { getInstallId } from './utils/installId';
import {
  recordSunriseDarshanCompletion,
  reconcileWithBackend,
  getStreakState,
  getPendingSharePrompt,
  markMilestoneShared,
  dismissSharePrompt,
  localDateKey,
  resetStreakForTesting,
} from './utils/streakManager';
import { shareStreakCard } from './utils/shareStreak';
import { ThemeMode, Tab, TargetLocation, SunEventInfo, StreakState } from './types';
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
  TEXT_STOP_ALARM,
  WALKTHROUGH_STORAGE_KEY,
  SETTINGS_PREFS_KEY,
  CONNECTIVITY_DEBOUNCE_MS,
  LOCATION_LAST_SYNC_KEY,
  LOCATION_TIMESTAMP_KEY,
  SUNRISE_WINDOW_MINUTES,
} from './constants';
import { appStyles } from './styles/AppStyles';
import { streakStyles } from './styles/StreakStyles';

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

  // Sunrise darshan streak state (local-first; synced to backend on app open).
  const [streakState, setStreakState] = useState<StreakState | null>(null);
  // When set to a milestone (1/3/7), the celebration modal pops once.
  const [celebrationMilestone, setCelebrationMilestone] = useState<number | null>(null);
  // Today's sunrise time, captured from the sun-times fetch — used to decide
  // whether an alignment falls inside the sunrise window.
  const todaySunriseRef = useRef<Date | null>(null);
  // Session guard so the repeated onAlignmentChange storm records at most once/day.
  const recordedTodayRef = useRef<string | null>(null);
  // Off-screen card captured for sharing.
  const shareCardRef = useRef<View | null>(null);

  // First-run walkthrough: shown once, gated by an AsyncStorage flag.
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // "Turn on internet" prompt reason (null = hidden). Set on app open when
  // offline (first install or data unsynced > 1 week); cleared on sync/dismiss.
  const [syncPromptReason, setSyncPromptReason] = useState<SyncPromptReason>(null);
  
  // Theme state - allows dynamic theme switching
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(COMPASS_THEME);
  
  // Audio enabled state - can be toggled in settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Audio volume state (0-1 range)
  const [audioVolume, setAudioVolume] = useState(AUDIO_VOLUME_DEFAULT);

  // Becomes true once persisted UI prefs (theme/audio) have been read from
  // AsyncStorage. Guards the persist-on-change effect so it never writes the
  // initial defaults back before the saved values are loaded.
  const prefsHydratedRef = useRef(false);

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

  // Live clock shown on the full-screen alarm; ticks only while the alarm is up.
  const [alarmNow, setAlarmNow] = useState<Date>(() => new Date());
  // Gentle pulse for the alarm icon while ringing.
  const alarmPulse = useRef(new Animated.Value(1)).current;

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

  // Load persisted UI preferences (theme, audio on/off, audio volume) once on
  // mount and apply them. Previously these lived only in React state seeded from
  // constants, so every change was lost on app restart. Failures are non-fatal —
  // we just keep the defaults.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_PREFS_KEY);
        if (raw) {
          const prefs = JSON.parse(raw);
          if (
            prefs.theme === 'light' ||
            prefs.theme === 'dark' ||
            prefs.theme === 'cosmic'
          ) {
            setCurrentTheme(prefs.theme);
          }
          if (typeof prefs.audioEnabled === 'boolean') {
            setAudioEnabled(prefs.audioEnabled);
          }
          if (
            typeof prefs.audioVolume === 'number' &&
            prefs.audioVolume >= 0 &&
            prefs.audioVolume <= 1
          ) {
            setAudioVolume(prefs.audioVolume);
          }
        }
      } catch (error) {
        console.log('Settings prefs read failed (using defaults):', error);
      } finally {
        prefsHydratedRef.current = true;
      }
    })();
  }, []);

  // Persist UI preferences whenever they change, after the initial hydration so
  // we never clobber the saved values with the startup defaults.
  useEffect(() => {
    if (!prefsHydratedRef.current) return;
    AsyncStorage.setItem(
      SETTINGS_PREFS_KEY,
      JSON.stringify({ theme: currentTheme, audioEnabled, audioVolume }),
    ).catch((error) => console.log('Settings prefs write failed:', error));
  }, [currentTheme, audioEnabled, audioVolume]);

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

  // Re-launch the walkthrough on demand (Settings → "How to use the app").
  // Switch to the home tab first so the tour opens over a clean screen; the
  // Walkthrough resets to the first slide whenever it becomes visible.
  const handleShowWalkthrough = useCallback(() => {
    setCurrentTab('home');
    setShowWalkthrough(true);
  }, []);

  // Load + reconcile the streak on app open: pull the on-device state and merge
  // it with the backend (best-effort) so a reinstall recovers and the server
  // stays in sync. Fire-and-forget; never blocks the UI, never celebrates.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await reconcileWithBackend();
        if (mounted) setStreakState(state);
      } catch (error) {
        console.log('Streak reconcile failed, using local state:', error);
        try {
          const local = await getStreakState();
          if (mounted) setStreakState(local);
        } catch {
          /* leave null */
        }
      }
    })();
    return () => {
      mounted = false;
    };
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

  // On app open: purge a location cache older than 3 days and, if we are
  // offline, decide whether to nudge the user to turn on internet (first install,
  // or data not synced for over a week). Best-effort; never blocks the UI. The
  // prompt only ever appears while offline, so it never races with an online
  // sync. The actual location fetch is handled by loadLocation above.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const reason = await evaluateSyncOnOpen();
      if (mounted && reason) setSyncPromptReason(reason);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Background re-sync when internet returns. We seed the previous state with the
  // current connectivity (the initial fetch is already done on mount), then react
  // only to genuine offline->online transitions: force a fresh location fetch
  // (debounced against flapping) and update targetLocation — which makes the
  // alarm-refresh effect below reschedule sunrise/sunset alarms with fresh times.
  useEffect(() => {
    let active = true;
    let prevOnline: boolean | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: () => void = () => {};

    (async () => {
      const initial = await getConnectivity();
      if (!active) return;
      prevOnline = isOnline(initial);
      unsubscribe = subscribeConnectivity((state) => {
        const nextOnline = isOnline(state);
        if (shouldRefetchOnTransition(prevOnline, nextOnline)) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            const fresh = await handleCameOnline();
            if (fresh) {
              console.log('Connectivity restored — refreshed location, rescheduling alarms');
              setTargetLocation(fresh);
              setSyncPromptReason(null);
            }
          }, CONNECTIVITY_DEBOUNCE_MS);
        }
        prevOnline = nextOnline;
      });
    })();

    return () => {
      active = false;
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
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
        } else if (action === 'age-sync') {
          // Backdate the last-sync + cache write timestamps by ?days=N so the
          // 3-day cache purge and 1-week staleness prompt can be exercised in an
          // E2E run without waiting. e.g.:
          //   adb shell am start -a android.intent.action.VIEW -d "sgdv://age-sync?days=8"
          const daysMatch = url.match(/[?&]days=(\d+)/);
          const days = daysMatch ? parseInt(daysMatch[1], 10) : 8;
          const backdated = (Date.now() - days * 24 * 60 * 60 * 1000).toString();
          await AsyncStorage.multiSet([
            [LOCATION_LAST_SYNC_KEY, backdated],
            [LOCATION_TIMESTAMP_KEY, backdated],
          ]);
          console.log(`age-sync: backdated last-sync + cache by ${days} days`);
        } else if (action === 'record-darshan') {
          // E2E: record a sunrise darshan for an explicit date (bypasses the
          // sunrise-window check) so multi-day streaks/milestones are testable
          //   adb shell am start -a android.intent.action.VIEW -d "sgdv://record-darshan?date=2026-06-24"
          const dateMatch = url.match(/[?&]date=(\d{4}-\d{2}-\d{2})/);
          const when = dateMatch ? new Date(`${dateMatch[1]}T08:00:00`) : new Date();
          const { state, newlyReachedMilestone } = await recordSunriseDarshanCompletion(when);
          setStreakState(state);
          if (newlyReachedMilestone != null) setCelebrationMilestone(newlyReachedMilestone);
        } else if (action === 'reset-streak') {
          await resetStreakForTesting();
          setStreakState(await getStreakState());
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

  // Snooze the alarm from the full-screen overlay: stop the current ring and
  // reschedule it for the configured snooze interval (mirrors the notification's
  // "Snooze" action so both entry points behave identically).
  const snoozeAlarm = useCallback(async () => {
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }
    try {
      const cfg = await getAlarmConfig();
      if (Platform.OS === 'android' && activeAlarmNotificationId) {
        await stopAlarmNotification(activeAlarmNotificationId);
      } else if (alarmPlayer && isAlarmPlaying) {
        alarmPlayer.pause();
      }
      await scheduleSnoozeAlarm(
        activeAlarmNotificationId || 'snooze',
        cfg.alarmSound,
        cfg.snoozeMinutes,
      );
      console.log(`Alarm snoozed for ${cfg.snoozeMinutes} min`);
    } catch (error) {
      console.log('Could not snooze alarm:', error);
    } finally {
      setActiveAlarmNotificationId(null);
      setIsAlarmPlaying(false);
    }
  }, [alarmPlayer, isAlarmPlaying, activeAlarmNotificationId]);

  // While the alarm overlay is visible, tick the live clock once a second and
  // run a looping pulse on the icon. Both are torn down when it dismisses.
  useEffect(() => {
    if (!isAlarmPlaying) {
      alarmPulse.setValue(1);
      return;
    }
    setAlarmNow(new Date());
    const tick = setInterval(() => setAlarmNow(new Date()), 1000);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(alarmPulse, { toValue: 1.12, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(alarmPulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => {
      clearInterval(tick);
      pulse.stop();
    };
  }, [isAlarmPlaying]);

  // Warm, time-of-day-aware caption for the alarm overlay. Sunrise alarms fire in
  // the morning and sunset alarms in the evening, so the hour cleanly maps to the
  // right prayer caption without needing to thread the alarm type through.
  const alarmCaption = useMemo(() => {
    const hour = alarmNow.getHours();
    if (hour >= 4 && hour < 12) return { greeting: 'Good Morning', message: 'Time for your morning prayers' };
    if (hour >= 12 && hour < 17) return { greeting: 'Good Afternoon', message: 'Time for your afternoon prayers' };
    if (hour >= 17 && hour < 21) return { greeting: 'Good Evening', message: 'Time for your evening prayers' };
    return { greeting: 'Namaste', message: 'Time for your prayers' };
  }, [alarmNow]);
  
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
          // Remember today's sunrise so an alignment can be checked against the
          // sunrise window for the streak (no extra network call).
          todaySunriseRef.current = sunTimes.sunrise;
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
          
        } catch (error) {
          console.error('Error getting sun times:', error);
          // Fallback to show a generic message
          setNextSunEvent(null);
        }
      }
    };

    getSunEvent();
  }, [targetLocation]);

  // Keep the scheduled alarms fresh: (re)schedule whenever the app is in the
  // foreground and we have a location. This fires when the location is first
  // resolved, when it changes (a new location must replace stale alarms), and
  // every time the user re-opens the app — so a schedule built against an old
  // location or now in the past is always refreshed. scheduleAlarms cancels and
  // re-creates the alarms, so repeated calls are safe and idempotent.
  useEffect(() => {
    if (
      appStateVisible === 'active' &&
      targetLocation?.latitude &&
      targetLocation?.longitude
    ) {
      console.log('Refreshing scheduled alarms (app active + location available)');
      scheduleAlarms(targetLocation.latitude, targetLocation.longitude);
    }
  }, [appStateVisible, targetLocation]);

  // Record a sunrise darshan when this alignment falls within the sunrise
  // window, at most once per local day. Offline-first: updates the local streak
  // (which pops the milestone celebration), then best-effort mirrors to backend.
  const maybeRecordSunriseDarshan = useCallback(async () => {
    const sunrise = todaySunriseRef.current;
    if (!sunrise) return;
    const now = new Date();
    if (Math.abs(now.getTime() - sunrise.getTime()) > SUNRISE_WINDOW_MINUTES * 60 * 1000) return;
    const todayKey = localDateKey(now);
    if (recordedTodayRef.current === todayKey) return;
    recordedTodayRef.current = todayKey;
    try {
      const { state, newlyReachedMilestone } = await recordSunriseDarshanCompletion(now);
      setStreakState(state);
      if (newlyReachedMilestone != null) setCelebrationMilestone(newlyReachedMilestone);
      const installId = await getInstallId();
      postSunriseCompletion(installId, todayKey); // best-effort, not awaited
    } catch (error) {
      console.log('Streak record failed:', error);
    }
  }, []);

  // Share the streak card (image + prefilled caption). When sharing from a
  // milestone, mark it shared so its contextual pill clears.
  const handleShareStreak = useCallback(
    async (milestone?: number | null) => {
      const count = streakState?.currentStreak ?? 0;
      if (milestone != null) {
        try {
          setStreakState(await markMilestoneShared(milestone));
        } catch (error) {
          console.log('markMilestoneShared failed:', error);
        }
      }
      await shareStreakCard(shareCardRef, count);
    },
    [streakState],
  );

  const handleDismissSharePrompt = useCallback(async (milestone: number) => {
    try {
      setStreakState(await dismissSharePrompt(milestone));
    } catch (error) {
      console.log('dismissSharePrompt failed:', error);
    }
  }, []);

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
      // A genuine darshan — count it toward the sunrise streak if in-window.
      maybeRecordSunriseDarshan();
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

  // The highest milestone the user reached but hasn't shared/dismissed — drives
  // the contextual "Share your N-day streak" pill on the Darshan screen.
  const pendingShareMilestone = getPendingSharePrompt(streakState);

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
          {/* Streak badge (tap to share) - top right over the compass area */}
          <View style={streakStyles.badgeHost} pointerEvents="box-none">
            <StreakBadge
              count={streakState?.currentStreak ?? 0}
              theme={currentTheme}
              onPress={() => handleShareStreak(null)}
            />
          </View>

          {/* Contextual share prompt for an un-shared milestone */}
          <StreakSharePrompt
            milestone={pendingShareMilestone}
            theme={currentTheme}
            onShare={() => handleShareStreak(pendingShareMilestone)}
            onDismiss={() => {
              if (pendingShareMilestone != null) handleDismissSharePrompt(pendingShareMilestone);
            }}
          />

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
          onShowWalkthrough={handleShowWalkthrough}
          onShareStreak={() => handleShareStreak(null)}
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
        statusBarTranslucent={true}
      >
        <View style={appStyles.alarmOverlay}>
          <View style={appStyles.alarmCard}>
            {/* Pulsing alarm icon */}
            <Animated.View style={[appStyles.alarmIconOuter, { transform: [{ scale: alarmPulse }] }]}>
              <View style={appStyles.alarmIconInner}>
                <Ionicons name="alarm" size={52} color="#FF6B35" />
              </View>
            </Animated.View>

            {/* Live clock */}
            <Text style={appStyles.alarmTime}>
              {alarmNow.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <Text style={appStyles.alarmDate}>
              {alarmNow.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            <Text style={appStyles.alarmTitle}>{alarmCaption.greeting}</Text>
            <Text style={appStyles.alarmMessage}>{alarmCaption.message}</Text>

            {/* Snooze + Stop actions (mirror the notification actions) */}
            <View style={appStyles.alarmButtonRow}>
              <TouchableOpacity style={appStyles.snoozeButton} onPress={snoozeAlarm} activeOpacity={0.8}>
                <Ionicons name="time-outline" size={20} color="#FF6B35" />
                <Text style={appStyles.snoozeButtonText}>Snooze</Text>
              </TouchableOpacity>
              <TouchableOpacity style={appStyles.stopAlarmButton} onPress={stopAlarm} activeOpacity={0.8}>
                <Ionicons name="stop" size={20} color="#FFFFFF" />
                <Text style={appStyles.stopAlarmText}>{TEXT_STOP_ALARM}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Streak milestone celebration (auto-pops once at 1/3/7) */}
      <StreakCelebrationModal
        visible={celebrationMilestone != null}
        milestone={celebrationMilestone}
        currentStreak={streakState?.currentStreak ?? 0}
        theme={currentTheme}
        onShare={() => {
          const m = celebrationMilestone;
          setCelebrationMilestone(null);
          handleShareStreak(m);
        }}
        onClose={() => setCelebrationMilestone(null)}
      />

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
            colorList={currentBgTheme.radialColorList ?? []}
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

      {/* "Turn on internet" prompt: first-install modal / week-stale banner. */}
      <ConnectivityPrompt
        reason={syncPromptReason}
        theme={currentTheme}
        onOpenSettings={() => {
          // Nudge toward connectivity settings; we can't toggle the radio.
          if (Platform.OS === 'android') {
            Linking.sendIntent('android.settings.WIRELESS_SETTINGS').catch(() => {});
          } else {
            Linking.openSettings().catch(() => {});
          }
        }}
        onDismiss={() => setSyncPromptReason(null)}
      />

      {/* Hidden, laid-out share card — captured to a PNG by shareStreakCard.
          Kept mounted with opacity 0 (not display:none / off-window) so Android
          captures pixels instead of a blank image. */}
      <View style={streakStyles.hiddenCardHost} pointerEvents="none">
        <StreakShareCard
          ref={shareCardRef}
          currentStreak={streakState?.currentStreak ?? 0}
          milestone={celebrationMilestone}
        />
      </View>
    </View>
  );
}

export default App;
