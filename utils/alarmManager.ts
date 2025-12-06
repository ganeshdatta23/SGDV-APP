import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculateSunTimes } from './sgvdApi';
import * as TaskManager from 'expo-task-manager';

// Background notification task name
const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Define the background task for handling notifications
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
  console.log('Background notification task received:', { data, error, executionInfo });
  
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }

  // Handle the notification data
  if (data) {
    const notificationData = data as any;
    console.log('Processing background notification:', notificationData);
    
    // You can perform background processing here
    // Note: This runs in a limited execution context
    // Heavy operations should be avoided
    
    // For alarm notifications, we can't play sounds directly in background
    // The system notification sound will play automatically
    if (notificationData.isAlarm) {
      console.log('Background alarm notification processed');
      
      // You could store alarm state or perform other lightweight operations
      try {
        await AsyncStorage.setItem('lastAlarmTriggered', JSON.stringify({
          time: new Date().toISOString(),
          type: notificationData.type || 'unknown'
        }));
      } catch (storageError) {
        console.error('Failed to store alarm state:', storageError);
      }
    }
  }
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
    // High priority channel for alarms
    await Notifications.setNotificationChannelAsync('sunrise-sunset-alarms', {
      name: 'Sunrise & Sunset Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // Bypass Do Not Disturb for alarms
    });
    
    // Regular priority channel for notifications
    await Notifications.setNotificationChannelAsync('sunrise-sunset-notifications', {
      name: 'Sunrise & Sunset Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150, 150, 150],
      lightColor: '#FF6B35',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    
    console.log('Android notification channels created');
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

  // Register background notification handler
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('Background notification task registered');
  } catch (error) {
    console.error('Failed to register background notification task:', error);
  }

  console.log('Notification system initialized');
  return true;
};

// Get alarm configuration
export const getAlarmConfig = async (): Promise<AlarmConfig> => {
  try {
    const config = await AsyncStorage.getItem('alarmConfig');
    return config ? JSON.parse(config) : DEFAULT_ALARM_CONFIG;
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
  isAlarm: boolean = false
): Promise<string | null> => {
  try {
    // Don't schedule if the date is in the past
    if (triggerDate <= new Date()) {
      console.log(`Skipping past notification: ${title} at ${triggerDate.toLocaleString()}`);
      return null;
    }

    // Cancel any existing notification with the same identifier
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Ignore if notification doesn't exist
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: isAlarm ? 'custom_alert.wav' : 'default', // Use custom sound for alarms
        priority: isAlarm ? 'max' : 'high',
        data: { type: identifier.includes('sunrise') ? 'sunrise' : 'sunset', isAlarm },
        categoryIdentifier: isAlarm ? 'ALARM_CATEGORY' : 'NOTIFICATION_CATEGORY',
        ...(Platform.OS === 'android' && {
          // Android-specific content
          sticky: isAlarm, // Make alarms sticky
          ongoing: isAlarm, // Make alarms ongoing until dismissed
        }),
        ...(Platform.OS === 'ios' && isAlarm && {
          // iOS-specific content for alarms
          criticalAlert: {
            name: 'custom_alert.wav',
            volume: 1.0,
          },
          interruptionLevel: 'critical', // This bypasses Do Not Disturb on iOS
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' 
          ? (isAlarm ? 'sunrise-sunset-alarms' : 'sunrise-sunset-notifications')
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

// Schedule sunrise/sunset alarms (legacy function - now uses scheduleAlarmsForNext3Days internally)
export const scheduleAlarms = async (latitude: number, longitude: number): Promise<void> => {
  // Use the unified scheduling function to avoid conflicts
  return scheduleAlarmsForNext3Days(latitude, longitude);
};

// Cancel all scheduled alarms
export const cancelAllAlarms = async (): Promise<void> => {
  try {
    // Cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    scheduledNotificationIds = [];
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
    // scheduleDaysAhead = 1 means: today (0) + tomorrow (1) = 2 days total
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
            isAlarm
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
            isAlarm
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
        const snoozeDate = new Date();
        snoozeDate.setMinutes(snoozeDate.getMinutes() + 5);
        
        await scheduleNotification(
          `${notification.request.identifier}-snooze`,
          'Snoozed Alarm',
          'Your snoozed alarm is now ringing!',
          snoozeDate,
          true
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

// Send a test alarm (scheduled for 5 seconds from now)
export const sendTestAlarm = async (): Promise<void> => {
  try {
    const triggerDate = new Date();
    triggerDate.setSeconds(triggerDate.getSeconds() + 5);
    
    await Notifications.scheduleNotificationAsync({
      identifier: 'test-alarm',
      content: {
        title: 'Test Alarm',
        body: 'This is a test alarm! The alarm sound should be playing.',
        sound: 'custom_alert.wav',
        priority: 'max',
        data: { type: 'test', isAlarm: true },
        categoryIdentifier: 'ALARM_CATEGORY',
        ...(Platform.OS === 'android' && {
          sticky: true,
          ongoing: true,
        }),
        ...(Platform.OS === 'ios' && {
          criticalAlert: {
            name: 'custom_alert.wav',
            volume: 1.0,
          },
          interruptionLevel: 'critical',
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'sunrise-sunset-alarms' : undefined,
      } as Notifications.DateTriggerInput,
    });
    console.log('Test alarm scheduled for 5 seconds from now');
  } catch (error) {
    console.error('Error scheduling test alarm:', error);
  }
};

// Send a test background notification (scheduled for 10 seconds from now)
export const sendTestBackgroundNotification = async (): Promise<void> => {
  try {
    const triggerDate = new Date();
    triggerDate.setSeconds(triggerDate.getSeconds() + 10);
    
    await Notifications.scheduleNotificationAsync({
      identifier: 'test-background-notification',
      content: {
        title: '🌅 Background Test',
        body: 'This notification should work even when the app is closed! Background task should process this.',
        sound: 'default',
        priority: 'high',
        data: { type: 'test', isAlarm: false, backgroundTest: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'sunrise-sunset-notifications' : undefined,
      } as Notifications.DateTriggerInput,
    });
    console.log('Test background notification scheduled for 10 seconds from now');
    console.log('📱 To test: Close the app completely and wait 10 seconds');
  } catch (error) {
    console.error('Error scheduling test background notification:', error);
  }
};

// Clean up background notification task
export const cleanupBackgroundTask = async (): Promise<void> => {
  try {
    await Notifications.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('Background notification task unregistered');
  } catch (error) {
    console.error('Failed to unregister background notification task:', error);
  }
};

// Check if background task is registered
export const isBackgroundTaskRegistered = async (): Promise<boolean> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('Background task registered:', isRegistered);
    return isRegistered;
  } catch (error) {
    console.error('Error checking background task registration:', error);
    return false;
  }
};

export type { AlarmConfig }; 
