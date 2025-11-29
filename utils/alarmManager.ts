import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculateSunTimes } from './sgvdApi';

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
};

// Store notification IDs for cleanup
let scheduledNotificationIds: string[] = [];

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permissions not granted');
      return false;
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Initialize notification system
export const initializeNotifications = async (): Promise<boolean> => {
  console.log('⏰ Initializing notification system...');
  
  // Request permissions
  const hasPermission = await requestNotificationPermissions();
  
  if (!hasPermission) {
    console.log('⚠️ Notifications will not work without permissions');
    return false;
  }

  // Set notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sunrise-sunset-alarms', {
      name: 'Sunrise & Sunset Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });
    console.log('✅ Android notification channel created');
  }

  console.log('✅ Notification system initialized');
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
    console.log('✅ Alarm config saved:', config);
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
      console.log(`⏭️ Skipping past notification: ${title} at ${triggerDate.toLocaleString()}`);
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
        sound: isAlarm ? 'default' : undefined,
        priority: isAlarm ? 'max' : 'high',
        data: { type: identifier.includes('sunrise') ? 'sunrise' : 'sunset', isAlarm },
        categoryIdentifier: 'sunrise-sunset',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'sunrise-sunset-alarms' : undefined,
      } as Notifications.DateTriggerInput,
    });

    console.log(`📅 Scheduled notification: ${title} at ${triggerDate.toLocaleString()} (ID: ${notificationId})`);
    scheduledNotificationIds.push(notificationId);
    return notificationId;
  } catch (error) {
    console.error(`❌ Error scheduling notification: ${title}`, error);
    return null;
  }
};

// Schedule sunrise/sunset alarms
export const scheduleAlarms = async (latitude: number, longitude: number): Promise<void> => {
  try {
    const config = await getAlarmConfig();
    
    // Clear existing alarms first
    await cancelAllAlarms();
    
    // Determine if any sunrise/sunset alarms should be scheduled
    const shouldScheduleSunrise = (config.alarmEnabled && config.sunriseAlarmEnabled) || 
                                  (config.notificationsEnabled && config.sunriseNotificationEnabled);
    const shouldScheduleSunset = (config.alarmEnabled && config.sunsetAlarmEnabled) || 
                                (config.notificationsEnabled && config.sunsetNotificationEnabled);
    
    if (!shouldScheduleSunrise && !shouldScheduleSunset) {
      console.log('⏰ No alarms or notifications enabled, skipping scheduling');
      return;
    }

    // Determine if this should be a loud alarm or silent notification
    const isAlarm = config.alarmEnabled;
    
    // Calculate sun times for today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySunTimes = await calculateSunTimes(latitude, longitude, today);
    const tomorrowSunTimes = await calculateSunTimes(latitude, longitude, tomorrow);
    
    const now = new Date();
    
    // Schedule today's alarms if they haven't passed
    if (shouldScheduleSunrise) {
      const sunriseAlarmTime = new Date(todaySunTimes.sunrise);
      sunriseAlarmTime.setMinutes(sunriseAlarmTime.getMinutes() - config.sunriseOffset);
      
      if (sunriseAlarmTime > now) {
        await scheduleNotification(
          'sunrise-today',
          'Sunrise Alert',
          `Sunrise in ${config.sunriseOffset} minutes! Time for morning prayers.`,
          sunriseAlarmTime,
          isAlarm
        );
      }
    }
    
    if (shouldScheduleSunset) {
      const sunsetAlarmTime = new Date(todaySunTimes.sunset);
      sunsetAlarmTime.setMinutes(sunsetAlarmTime.getMinutes() - config.sunsetOffset);
      
      if (sunsetAlarmTime > now) {
        await scheduleNotification(
          'sunset-today',
          'Sunset Alert',
          `Sunset in ${config.sunsetOffset} minutes! Time for evening prayers.`,
          sunsetAlarmTime,
          isAlarm
        );
      }
    }
    
    // Schedule tomorrow's alarms
    if (shouldScheduleSunrise) {
      const tomorrowSunriseAlarmTime = new Date(tomorrowSunTimes.sunrise);
      tomorrowSunriseAlarmTime.setMinutes(tomorrowSunriseAlarmTime.getMinutes() - config.sunriseOffset);
      
      await scheduleNotification(
        'sunrise-tomorrow',
        'Sunrise Alert',
        `Sunrise in ${config.sunriseOffset} minutes! Time for morning prayers.`,
        tomorrowSunriseAlarmTime,
        isAlarm
      );
    }
    
    if (shouldScheduleSunset) {
      const tomorrowSunsetAlarmTime = new Date(tomorrowSunTimes.sunset);
      tomorrowSunsetAlarmTime.setMinutes(tomorrowSunsetAlarmTime.getMinutes() - config.sunsetOffset);
      
      await scheduleNotification(
        'sunset-tomorrow',
        'Sunset Alert',
        `Sunset in ${config.sunsetOffset} minutes! Time for evening prayers.`,
        tomorrowSunsetAlarmTime,
        isAlarm
      );
    }
    
    console.log('✅ Alarms scheduled successfully');
  } catch (error) {
    console.error('❌ Error scheduling alarms:', error);
  }
};

// Cancel all scheduled alarms
export const cancelAllAlarms = async (): Promise<void> => {
  try {
    // Cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    scheduledNotificationIds = [];
  console.log('🔕 All alarms cancelled');
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

// Schedule alarms for the next 3 days
export const scheduleAlarmsForNext3Days = async (latitude: number, longitude: number): Promise<void> => {
  try {
  console.log('📅 Scheduling alarms for next 3 days');
    
    const config = await getAlarmConfig();
    
    // Clear existing alarms first
    await cancelAllAlarms();
    
    // Determine if any sunrise/sunset alarms should be scheduled
    const shouldScheduleSunrise = (config.alarmEnabled && config.sunriseAlarmEnabled) || 
                                  (config.notificationsEnabled && config.sunriseNotificationEnabled);
    const shouldScheduleSunset = (config.alarmEnabled && config.sunsetAlarmEnabled) || 
                                (config.notificationsEnabled && config.sunsetNotificationEnabled);
    
    if (!shouldScheduleSunrise && !shouldScheduleSunset) {
      console.log('⏰ No alarms or notifications enabled, skipping scheduling');
      return;
    }

    const isAlarm = config.alarmEnabled;
    const now = new Date();
    
    // Schedule for today and next 2 days
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
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
    
    console.log('✅ Alarms for next 3 days scheduled successfully');
  } catch (error) {
    console.error('❌ Error scheduling alarms for 3 days:', error);
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
    console.log('✅ Test notification sent');
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
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
        title: '⏰ Test Alarm',
        body: 'This is a test alarm! The alarm sound should be playing.',
        sound: 'default',
        priority: 'max',
        data: { type: 'test', isAlarm: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'sunrise-sunset-alarms' : undefined,
      } as Notifications.DateTriggerInput,
    });
    console.log('✅ Test alarm scheduled for 5 seconds from now');
  } catch (error) {
    console.error('❌ Error scheduling test alarm:', error);
  }
};

export type { AlarmConfig }; 
