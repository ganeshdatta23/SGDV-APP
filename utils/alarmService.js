import PushNotification from 'react-native-push-notification';
import { calculateSunTimes } from './sunCalculator';

class AlarmService {
  constructor() {
    this.isInitialized = false;
    this.sunriseAlarmId = 'sunrise_alarm';
  }

  initialize() {
    if (this.isInitialized) return;

    PushNotification.configure({
      onNotification: function(notification) {
        console.log('Notification received:', notification);
      },
      requestPermissions: true,
    });

    this.isInitialized = true;
  }

  async scheduleSunriseAlarm(latitude, longitude) {
    try {
      this.initialize();
      
      // Cancel existing alarm
      this.cancelSunriseAlarm();

      // Calculate tomorrow's sunrise
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const sunTimes = await calculateSunTimes(latitude, longitude, tomorrow);
      const sunriseTime = sunTimes.sunrise;

      console.log('Scheduling sunrise alarm for:', sunriseTime);

      PushNotification.localNotificationSchedule({
        id: this.sunriseAlarmId,
        title: 'Sunrise at Appaji\'s Location',
        message: 'The sun is rising at Appaji\'s location. Time for morning prayers! 🌅',
        date: sunriseTime,
        repeatType: 'day',
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        playSound: true,
      });

      return true;
    } catch (error) {
      console.error('Error scheduling sunrise alarm:', error);
      return false;
    }
  }

  cancelSunriseAlarm() {
    try {
      PushNotification.cancelLocalNotifications({ id: this.sunriseAlarmId });
      console.log('Sunrise alarm cancelled');
    } catch (error) {
      console.error('Error cancelling sunrise alarm:', error);
    }
  }

  async updateSunriseAlarm(enabled, latitude, longitude) {
    if (enabled && latitude && longitude) {
      return await this.scheduleSunriseAlarm(latitude, longitude);
    } else {
      this.cancelSunriseAlarm();
      return true;
    }
  }
}

export default new AlarmService();