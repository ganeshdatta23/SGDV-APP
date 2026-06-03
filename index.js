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

  // Foreground service runner. REQUIRED by notifee whenever a notification uses
  // `asForegroundService: true`. Without it, when the alarm fires (especially
  // from a backgrounded or fully-killed app) the foreground service has no task
  // to run, so the looping alarm sound and the ongoing notification do not
  // persist. The returned promise is intentionally kept pending: the service
  // stays alive until the Stop action calls stopForegroundService() or the
  // notification is cancelled.
  notifee.registerForegroundService(() => {
    return new Promise(() => {
      // Kept alive for the lifetime of the alarm. Teardown is driven by the
      // Stop/Snooze/Dismiss handling below (stopForegroundService).
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
        // Schedule snooze alarm 5 minutes from now
        const { scheduleSnoozeAlarm } = require('./utils/notifeeAlarmService');
        await scheduleSnoozeAlarm(notification?.id || 'snooze');
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
