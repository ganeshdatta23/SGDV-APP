/**
 * @format
 */

import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

// Register notifee background event handler for Android alarms.
// This MUST be at the top level (outside React components) so it executes
// even when the app is killed/backgrounded.
if (Platform.OS === 'android') {
  const notifee = require('@notifee/react-native').default;
  const { EventType } = require('@notifee/react-native');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  // Read the user's alarm config (timeout/snooze/sound) directly from storage so
  // it works in the headless background context where React state is unavailable.
  const readAlarmConfig = async () => {
    try {
      const raw = await AsyncStorage.getItem('alarmConfig');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  // Foreground service runner. REQUIRED by notifee whenever a notification uses
  // `asForegroundService: true`. Without it, when the alarm fires (especially
  // from a backgrounded or fully-killed app) the foreground service has no task
  // to run, so the looping alarm sound and the ongoing notification do not
  // persist. It also enforces the configurable auto-stop timeout: after
  // alarmTimeoutMs the alarm stops itself (0 = never -> ring until stopped).
  notifee.registerForegroundService((notification) => {
    return new Promise(async (resolve) => {
      const cfg = await readAlarmConfig();
      const timeoutMs =
        typeof cfg.alarmTimeoutMs === 'number' ? cfg.alarmTimeoutMs : 60000;
      if (timeoutMs > 0) {
        setTimeout(async () => {
          await notifee.stopForegroundService();
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
          resolve();
        }, timeoutMs);
      }
      // timeoutMs <= 0: keep the promise pending; the service stays alive until
      // the Stop action calls stopForegroundService() or the notification is
      // cancelled.
    });
  });

  // Stop the ringing alarm: tear down the foreground service (which stops the
  // looping sound) and remove its notification.
  const stopAlarm = async (notificationId) => {
    await notifee.stopForegroundService();
    if (notificationId) {
      await notifee.cancelNotification(notificationId);
    }
  };

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;

    if (type === EventType.ACTION_PRESS) {
      if (pressAction?.id === 'stop') {
        await stopAlarm(notification?.id);
      } else if (pressAction?.id === 'snooze') {
        await stopAlarm(notification?.id);
        // Schedule snooze alarm using the configured duration + sound.
        const cfg = await readAlarmConfig();
        const snoozeMinutes =
          typeof cfg.snoozeMinutes === 'number' ? cfg.snoozeMinutes : 5;
        const soundName = cfg.alarmSound === 'default' ? 'default' : 'custom';
        const { scheduleSnoozeAlarm } = require('./utils/notifeeAlarmService');
        await scheduleSnoozeAlarm(
          notification?.id || 'snooze',
          soundName,
          snoozeMinutes,
        );
      }
    }

    if (type === EventType.DISMISSED) {
      await stopAlarm(notification?.id);
    }
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
