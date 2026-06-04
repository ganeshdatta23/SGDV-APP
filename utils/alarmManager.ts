import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { calculateSunTimes } from './sgvdApi';
import {
  initializeNotifeeChannels,
  scheduleNotifeeAlarm,
  cancelAllNotifeeAlarms,
  displayImmediateAlarm,
} from './notifeeAlarmService';

// Check if running in Expo Go (custom sounds don't work there)
const isExpoGo = Constants.appOwnership === 'expo';

// Android channels (immutable) - versioned to avoid cached settings
const ALARM_CHANNEL_DEFAULT_ID = 'sunrise-sunset-alarms-default-v1';
const ALARM_CHANNEL_CUSTOM_ID = 'sunrise-sunset-alarms-custom-v1';
const NOTIFICATION_CHANNEL_ID = 'sunrise-sunset-notifications-v1';

// Expo notifications expect the base filename (including extension)
const CUSTOM_ALARM_SOUND = 'custom_alert.wav';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Alarm configuration
interface AlarmConfig {
  sunriseEnabled: boolean;
  sunsetEnabled: boolean;
  sunriseOffset: number; // minutes before sunrise
  sunsetOffset: number; // minutes before sunset
  alarmEnabled: boolean; // Loud alarm mode
  sunriseAlarmEnabled: boolean; // Sunrise alarm
  sunsetAlarmEnabled: boolean; // Sunset alarm
  notificationsEnabled: boolean; // Silent notifications
  sunriseNotificationEnabled: boolean; // Sunrise notifications
  sunsetNotificationEnabled: boolean; // Sunset notifications
  alarmSound: 'default' | 'custom';
  scheduleDaysAhead: number; // Number of days ahead to schedule alarms (default: 1 = today + tomorrow)
}

const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  sunriseEnabled: false,
  sunsetEnabled: false,
  sunriseOffset: 2, // 2 minutes before sunrise
  sunsetOffset: 2, // 2 minutes before sunset
  alarmEnabled: false,
  sunriseAlarmEnabled: false,
  sunsetAlarmEnabled: false,
  notificationsEnabled: true, // Notifications enabled by default
  sunriseNotificationEnabled: true, // Sunrise notifications enabled by default
  sunsetNotificationEnabled: true, // Sunset notifications enabled by default
  alarmSound: 'custom',
  scheduleDaysAhead: 1, // Schedule for today + 1 day ahead (total 2 days) by default
};

// Store notification IDs for cleanup
let scheduledNotificationIds: string[] = [];

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      // Request permissions with specific options for background delivery
      const permissionRequest = Platform.OS === 'ios'
        ? {
            ios: {
              allowAlert: true,
              allowBadge: false,
              allowSound: true,
              allowDisplayInCarPlay: false,
              allowCriticalAlerts: true, // Required for alarm critical alerts
              provideAppNotificationSettings: false,
              allowProvisional: false,
              allowAnnouncements: false,
            },
          }
        : {};

      const { status } = await Notifications.requestPermissionsAsync(permissionRequest);
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    console.log('Notification permissions granted');
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Initialize notification system
export const initializeNotifications = async (): Promise<boolean> => {
  console.log('Initializing notification system...');

  // Request permissions
  const hasPermission = await requestNotificationPermissions();

  if (!hasPermission) {
    console.log('Notifications will not work without permissions');
    return false;
  }

  // Set notification channels for Android
  if (Platform.OS === 'android') {
    const oldChannelIds = [
      'sunrise-sunset-alarms',
      'sunrise-sunset-notifications',
      'alarm-channel',
      'alarm-channel-v2',
      'alarm-channel-v3',
      'notification-channel',
      'notification-channel-v2',
      'notification-channel-v3',
    ];
    for (const id of oldChannelIds) {
      await Notifications.deleteNotificationChannelAsync(id).catch(() => {});
    }

    const customAlarmSound = isExpoGo ? 'default' : CUSTOM_ALARM_SOUND;

    // Alarm channel (default sound) — used for iOS and Android notification-mode fallback
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_DEFAULT_ID, {
      name: 'Sunrise & Sunset Alarms (Default)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF6B35',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    // Alarm channel (custom sound)
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_CUSTOM_ID, {
      name: 'Sunrise & Sunset Alarms (Custom)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF6B35',
      sound: customAlarmSound,
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    // Regular notifications channel
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Sunrise & Sunset Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    console.log('Android notification channels created');

    // Initialize notifee channels for Android alarm mode
    await initializeNotifeeChannels();
  }

  // Set up iOS notification categories for better alarm handling
  if (Platform.OS === 'ios') {
    try {
      await Notifications.setNotificationCategoryAsync('ALARM_CATEGORY', [
        {
          identifier: 'STOP_ALARM',
          buttonTitle: 'Stop Alarm',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'SNOOZE_ALARM',
          buttonTitle: 'Snooze 5 min',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('NOTIFICATION_CATEGORY', [
        {
          identifier: 'OPEN_APP',
          buttonTitle: 'Open App',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      console.log('iOS notification categories created');
    } catch (error) {
      console.error('Failed to create iOS notification categories:', error);
    }
  }

  console.log('Notification system initialized');
  return true;
};

// Get alarm configuration
export const getAlarmConfig = async (): Promise<AlarmConfig> => {
  try {
    const config = await AsyncStorage.getItem('alarmConfig');
    return config ? { ...DEFAULT_ALARM_CONFIG, ...JSON.parse(config) } : DEFAULT_ALARM_CONFIG;
  } catch (error) {
    console.error('Error getting alarm config:', error);
    return DEFAULT_ALARM_CONFIG;
  }
};

// Save alarm configuration
export const saveAlarmConfig = async (config: AlarmConfig): Promise<void> => {
  try {
    await AsyncStorage.setItem('alarmConfig', JSON.stringify(config));
    console.log('Alarm config saved:', config);
  } catch (error) {
    console.error('Error saving alarm config:', error);
  }
};

// Schedule a single notification
const scheduleNotification = async (
  identifier: string,
  title: string,
  body: string,
  triggerDate: Date,
  isAlarm: boolean = false,
  alarmSound: AlarmConfig['alarmSound'] = 'custom'
): Promise<string | null> => {
  try {
    // Don't schedule if the date is in the past
    if (triggerDate <= new Date()) {
      console.log(`Skipping past notification: ${title} at ${triggerDate.toLocaleString()}`);
      return null;
    }

    // On Android alarm mode: use notifee for full-screen + foreground service
    if (isAlarm && Platform.OS === 'android') {
      return scheduleNotifeeAlarm(
        identifier,
        title,
        body,
        triggerDate.getTime(),
        alarmSound,
      );
    }

    // For iOS alarms and all notification-mode: use expo-notifications
    // Cancel any existing notification with the same identifier
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Ignore if notification doesn't exist
    }

    const selectedAlarmSound =
      alarmSound === 'custom' && !isExpoGo ? CUSTOM_ALARM_SOUND : 'default';
    const androidAlarmChannel =
      alarmSound === 'custom' && !isExpoGo ? ALARM_CHANNEL_CUSTOM_ID : ALARM_CHANNEL_DEFAULT_ID;

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: isAlarm ? selectedAlarmSound : 'default',
        priority: isAlarm ? 'max' : 'high',
        data: {
          type: identifier.includes('sunrise') ? 'sunrise' : 'sunset',
          isAlarm,
          alarmSound: isAlarm ? alarmSound : 'default',
        },
        categoryIdentifier: isAlarm ? 'ALARM_CATEGORY' : 'NOTIFICATION_CATEGORY',
        vibrate: isAlarm ? [0, 500, 200, 500] : [0, 250, 250, 250],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android'
          ? (isAlarm ? androidAlarmChannel : NOTIFICATION_CHANNEL_ID)
          : undefined,
      } as Notifications.DateTriggerInput,
    });

    console.log(`Scheduled notification: ${title} at ${triggerDate.toLocaleString()} (ID: ${notificationId})`);
    scheduledNotificationIds.push(notificationId);
    return notificationId;
  } catch (error) {
    console.error(`Error scheduling notification: ${title}`, error);
    return null;
  }
};

// Schedule a silent notification-mode alert N seconds from now. Used by the
// automated test to verify that notifications (not just the loud alarm) fire in
// the background / when the app is closed. isAlarm=false routes through
// expo-notifications, which schedules via AlarmManager and is delivered by the
// OS even if the app process is gone.
export const scheduleTestNotificationIn = async (
  seconds: number,
): Promise<string | null> => {
  const triggerDate = new Date(Date.now() + seconds * 1000);
  return scheduleNotification(
    'e2e-scheduled-notification',
    'Scheduled Notification',
    'This notification fired while the app was closed.',
    triggerDate,
    false,
    'default',
  );
};

// Schedule sunrise/sunset alarms (legacy function - now uses scheduleAlarmsForNext3Days internally)
export const scheduleAlarms = async (latitude: number, longitude: number): Promise<void> => {
  // Use the unified scheduling function to avoid conflicts
  return scheduleAlarmsForNext3Days(latitude, longitude);
};

// Cancel all scheduled alarms
export const cancelAllAlarms = async (): Promise<void> => {
  try {
    // Cancel all expo-notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    scheduledNotificationIds = [];

    // Also cancel all notifee alarms on Android
    if (Platform.OS === 'android') {
      await cancelAllNotifeeAlarms();
    }

    console.log('All alarms cancelled');
  } catch (error) {
    console.error('Error cancelling alarms:', error);
  }
};

// Get next scheduled alarm info
export const getNextAlarmInfo = async (latitude: number, longitude: number): Promise<{
  type: 'sunrise' | 'sunset';
  time: Date;
  alarmTime: Date;
} | null> => {
  try {
    const config = await getAlarmConfig();

    // Determine if any sunrise/sunset alarms should be scheduled
    const shouldScheduleSunrise = (config.alarmEnabled && config.sunriseAlarmEnabled) ||
                                  (config.notificationsEnabled && config.sunriseNotificationEnabled);
    const shouldScheduleSunset = (config.alarmEnabled && config.sunsetAlarmEnabled) ||
                                (config.notificationsEnabled && config.sunsetNotificationEnabled);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySunTimes = await calculateSunTimes(latitude, longitude, today);
    const tomorrowSunTimes = await calculateSunTimes(latitude, longitude, tomorrow);

    const now = new Date();
    const alarms = [];

    // Check today's alarms
    if (shouldScheduleSunrise) {
      const sunriseAlarmTime = new Date(todaySunTimes.sunrise);
      sunriseAlarmTime.setMinutes(sunriseAlarmTime.getMinutes() - config.sunriseOffset);
      if (sunriseAlarmTime > now) {
        alarms.push({
          type: 'sunrise' as const,
          time: todaySunTimes.sunrise,
          alarmTime: sunriseAlarmTime,
        });
      }
    }

    if (shouldScheduleSunset) {
      const sunsetAlarmTime = new Date(todaySunTimes.sunset);
      sunsetAlarmTime.setMinutes(sunsetAlarmTime.getMinutes() - config.sunsetOffset);
      if (sunsetAlarmTime > now) {
        alarms.push({
          type: 'sunset' as const,
          time: todaySunTimes.sunset,
          alarmTime: sunsetAlarmTime,
        });
      }
    }

    // Check tomorrow's alarms
    if (shouldScheduleSunrise) {
      const tomorrowSunriseAlarmTime = new Date(tomorrowSunTimes.sunrise);
      tomorrowSunriseAlarmTime.setMinutes(tomorrowSunriseAlarmTime.getMinutes() - config.sunriseOffset);
      alarms.push({
        type: 'sunrise' as const,
        time: tomorrowSunTimes.sunrise,
        alarmTime: tomorrowSunriseAlarmTime,
      });
    }

    if (shouldScheduleSunset) {
      const tomorrowSunsetAlarmTime = new Date(tomorrowSunTimes.sunset);
      tomorrowSunsetAlarmTime.setMinutes(tomorrowSunsetAlarmTime.getMinutes() - config.sunsetOffset);
      alarms.push({
        type: 'sunset' as const,
        time: tomorrowSunTimes.sunset,
        alarmTime: tomorrowSunsetAlarmTime,
      });
    }

    // Sort by alarm time and return the next one
    alarms.sort((a, b) => a.alarmTime.getTime() - b.alarmTime.getTime());
    return alarms.length > 0 ? alarms[0] : null;
  } catch (error) {
    console.error('Error getting next alarm info:', error);
    return null;
  }
};

// Schedule alarms for the configured number of days ahead
export const scheduleAlarmsForNext3Days = async (latitude: number, longitude: number): Promise<void> => {
  try {
    const config = await getAlarmConfig();
    const daysAhead = config.scheduleDaysAhead ?? 1; // Default to 1 day ahead (today + tomorrow)

    console.log(`Scheduling alarms for ${daysAhead + 1} days (today + ${daysAhead} day(s) ahead)`);

    // Clear existing alarms first
    await cancelAllAlarms();

    // Determine if any sunrise/sunset alarms should be scheduled
    const shouldScheduleSunrise = (config.alarmEnabled && config.sunriseAlarmEnabled) ||
                                  (config.notificationsEnabled && config.sunriseNotificationEnabled);
    const shouldScheduleSunset = (config.alarmEnabled && config.sunsetAlarmEnabled) ||
                                (config.notificationsEnabled && config.sunsetNotificationEnabled);

    if (!shouldScheduleSunrise && !shouldScheduleSunset) {
      console.log('No alarms or notifications enabled, skipping scheduling');
      return;
    }

    const isAlarm = config.alarmEnabled;
    const now = new Date();

    // Schedule for today and next N days (where N = scheduleDaysAhead)
    for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);

      const sunTimes = await calculateSunTimes(latitude, longitude, date);
      const dayLabel = dayOffset === 0 ? 'today' : dayOffset === 1 ? 'tomorrow' : `day${dayOffset}`;

      if (shouldScheduleSunrise) {
        const sunriseAlarmTime = new Date(sunTimes.sunrise);
        sunriseAlarmTime.setMinutes(sunriseAlarmTime.getMinutes() - config.sunriseOffset);

        if (sunriseAlarmTime > now) {
          await scheduleNotification(
            `sunrise-${dayLabel}`,
            'Sunrise Alert',
            `Sunrise in ${config.sunriseOffset} minutes! Time for morning prayers.`,
            sunriseAlarmTime,
            isAlarm,
            config.alarmSound
          );
        }
      }

      if (shouldScheduleSunset) {
        const sunsetAlarmTime = new Date(sunTimes.sunset);
        sunsetAlarmTime.setMinutes(sunsetAlarmTime.getMinutes() - config.sunsetOffset);

        if (sunsetAlarmTime > now) {
          await scheduleNotification(
            `sunset-${dayLabel}`,
            'Sunset Alert',
            `Sunset in ${config.sunsetOffset} minutes! Time for evening prayers.`,
            sunsetAlarmTime,
            isAlarm,
            config.alarmSound
          );
        }
      }
    }

    console.log(`Alarms scheduled successfully for ${daysAhead + 1} days`);
  } catch (error) {
    console.error('Error scheduling alarms:', error);
  }
};

// Get all scheduled notifications
export const getScheduledNotifications = async (): Promise<Array<{
  id: string;
  title: string;
  body: string;
  date: Date;
}>> => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();

    return notifications.map(notification => ({
      id: notification.identifier,
      title: notification.content.title || 'Alarm',
      body: notification.content.body || '',
      date: notification.trigger && 'date' in notification.trigger
        ? new Date(notification.trigger.date as number)
        : new Date(),
    }));
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

// Add notification listeners
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription => {
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseReceivedListener = (
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// Handle notification category actions (Stop Alarm, Snooze, etc.)
export const handleNotificationAction = async (response: Notifications.NotificationResponse): Promise<void> => {
  const { actionIdentifier, notification } = response;
  const data = notification.request.content.data;

  console.log('Notification action received:', actionIdentifier, data);

  // On Android alarm mode, actions are handled by notifee background handler
  if (Platform.OS === 'android' && data?.isAlarm) {
    console.log('Android alarm action - handled by notifee');
    return;
  }

  switch (actionIdentifier) {
    case 'STOP_ALARM':
      console.log('Stop alarm action triggered');
      // Cancel any ongoing alarm notifications
      try {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
        console.log('Alarm notification dismissed');
      } catch (error) {
        console.error('Error dismissing alarm notification:', error);
      }
      break;

    case 'SNOOZE_ALARM':
      console.log('Snooze alarm action triggered');
      // Schedule a new alarm 5 minutes from now
      try {
        const config = await getAlarmConfig();
        const snoozeDate = new Date();
        snoozeDate.setMinutes(snoozeDate.getMinutes() + 5);

        await scheduleNotification(
          `${notification.request.identifier}-snooze`,
          'Snoozed Alarm',
          'Your snoozed alarm is now ringing!',
          snoozeDate,
          true,
          config.alarmSound
        );

        // Dismiss the current notification
        await Notifications.dismissNotificationAsync(notification.request.identifier);
        console.log('Alarm snoozed for 5 minutes');
      } catch (error) {
        console.error('Error snoozing alarm:', error);
      }
      break;

    case 'OPEN_APP':
      console.log('Open app action triggered');
      // App will automatically open due to opensAppToForeground: true
      break;

    default:
      console.log('Default notification action - opening app');
      break;
  }
};

// Send an immediate test notification
export const sendTestNotification = async (): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Notification',
        body: 'Notifications are working correctly!',
        sound: 'default',
      },
      trigger: null, // Immediate notification
    });
    console.log('Test notification sent');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};

// Send a test alarm (scheduled for 10 seconds from now)
export const sendTestAlarm = async (): Promise<void> => {
  try {
    // Use the configured alarm sound (defaults to 'custom') so the Test Alarm
    // button plays the same sound as real alarms, not the system default.
    const config = await getAlarmConfig();

    // On Android: use notifee for full alarm experience
    if (Platform.OS === 'android') {
      await displayImmediateAlarm(
        'Test Alarm',
        'This is a test alarm! The alarm sound should be playing continuously.',
        config.alarmSound,
      );
      console.log(`Notifee test alarm displayed (sound: ${config.alarmSound})`);
      return;
    }

    // On iOS: use expo-notifications
    const triggerDate = new Date();
    triggerDate.setSeconds(triggerDate.getSeconds() + 10);

    await Notifications.scheduleNotificationAsync({
      identifier: 'test-alarm',
      content: {
        title: 'Test Alarm',
        body: 'This is a test alarm! The default alarm sound should be playing.',
        sound: 'default',
        priority: 'max',
        data: { type: 'test', isAlarm: true, alarmSound: 'default' },
        categoryIdentifier: 'ALARM_CATEGORY',
        vibrate: [0, 500, 200, 500],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? ALARM_CHANNEL_DEFAULT_ID : undefined,
      } as Notifications.DateTriggerInput,
    });
    console.log('Test alarm scheduled for 10 seconds from now');
  } catch (error) {
    console.error('Error scheduling test alarm:', error);
  }
};

export type { AlarmConfig };
