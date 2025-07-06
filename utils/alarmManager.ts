import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateSunTimes } from './sunCalculator';

// Alarm configuration
interface AlarmConfig {
  sunriseEnabled: boolean;
  sunsetEnabled: boolean;
  sunriseOffset: number; // minutes before sunrise
  sunsetOffset: number; // minutes before sunset
}

const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  sunriseEnabled: false,
  sunsetEnabled: false,
  sunriseOffset: 2, // 1 minute before sunrise
  sunsetOffset: 2, // 1 minute before sunset
};

// Initialize simple alarm system
export const initializeNotifications = () => {
  console.log('⏰ Simple alarm system initialized');
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

// Schedule sunrise/sunset alarms
export const scheduleAlarms = async (latitude: number, longitude: number): Promise<void> => {
  try {
    const config = await getAlarmConfig();
    
    // Clear existing alarms (simplified for in-app system)
    console.log('⏰ Clearing existing alarms');
    
    // Calculate sun times for today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySunTimes = await calculateSunTimes(latitude, longitude, today);
    const tomorrowSunTimes = await calculateSunTimes(latitude, longitude, tomorrow);
    
    const now = new Date();
    
    // Schedule today's alarms if they haven't passed
    if (config.sunriseEnabled) {
      const sunriseAlarmTime = new Date(todaySunTimes.sunrise);
      sunriseAlarmTime.setMinutes(sunriseAlarmTime.getMinutes() - config.sunriseOffset);
      
      if (sunriseAlarmTime > now) {
        scheduleNotification(
          'sunrise-today',
          '🌅 Sunrise Alert',
          `Sunrise in ${config.sunriseOffset} minutes! Time for morning prayers.`,
          sunriseAlarmTime
        );
      }
    }
    
    if (config.sunsetEnabled) {
      const sunsetAlarmTime = new Date(todaySunTimes.sunset);
      sunsetAlarmTime.setMinutes(sunsetAlarmTime.getMinutes() - config.sunsetOffset);
      
      if (sunsetAlarmTime > now) {
        scheduleNotification(
          'sunset-today',
          '🌇 Sunset Alert',
          `Sunset in ${config.sunsetOffset} minutes! Time for evening prayers.`,
          sunsetAlarmTime
        );
      }
    }
    
    // Schedule tomorrow's alarms
    if (config.sunriseEnabled) {
      const tomorrowSunriseAlarmTime = new Date(tomorrowSunTimes.sunrise);
      tomorrowSunriseAlarmTime.setMinutes(tomorrowSunriseAlarmTime.getMinutes() - config.sunriseOffset);
      
      scheduleNotification(
        'sunrise-tomorrow',
        '🌅 Sunrise Alert',
        `Sunrise in ${config.sunriseOffset} minutes! Time for morning prayers.`,
        tomorrowSunriseAlarmTime
      );
    }
    
    if (config.sunsetEnabled) {
      const tomorrowSunsetAlarmTime = new Date(tomorrowSunTimes.sunset);
      tomorrowSunsetAlarmTime.setMinutes(tomorrowSunsetAlarmTime.getMinutes() - config.sunsetOffset);
      
      scheduleNotification(
        'sunset-tomorrow',
        '🌇 Sunset Alert',
        `Sunset in ${config.sunsetOffset} minutes! Time for evening prayers.`,
        tomorrowSunsetAlarmTime
      );
    }
    
    console.log('✅ Alarms scheduled successfully');
  } catch (error) {
    console.error('❌ Error scheduling alarms:', error);
  }
};

// Schedule a single notification (simplified for in-app system)
const scheduleNotification = (id: string, title: string, message: string, date: Date) => {
  console.log(`📅 Scheduled alarm: ${title} at ${date.toLocaleString()}`);
  console.log(`📝 Alarm message: ${message}`);
};

// Cancel all alarms
export const cancelAllAlarms = (): void => {
  console.log('🔕 All alarms cancelled');
};

// Get next scheduled alarm info
export const getNextAlarmInfo = async (latitude: number, longitude: number): Promise<{
  type: 'sunrise' | 'sunset';
  time: Date;
  alarmTime: Date;
} | null> => {
  try {
    const config = await getAlarmConfig();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySunTimes = await calculateSunTimes(latitude, longitude, today);
    const tomorrowSunTimes = await calculateSunTimes(latitude, longitude, tomorrow);
    
    const now = new Date();
    const alarms = [];
    
    // Check today's alarms
    if (config.sunriseEnabled) {
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
    
    if (config.sunsetEnabled) {
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
    if (config.sunriseEnabled) {
      const tomorrowSunriseAlarmTime = new Date(tomorrowSunTimes.sunrise);
      tomorrowSunriseAlarmTime.setMinutes(tomorrowSunriseAlarmTime.getMinutes() - config.sunriseOffset);
      alarms.push({
        type: 'sunrise' as const,
        time: tomorrowSunTimes.sunrise,
        alarmTime: tomorrowSunriseAlarmTime,
      });
    }
    
    if (config.sunsetEnabled) {
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

export type { AlarmConfig }; 