import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  AndroidForegroundServiceType,
  AlarmType,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';

const NOTIFEE_ALARM_CHANNEL_DEFAULT = 'notifee-alarm-default-v1';
const NOTIFEE_ALARM_CHANNEL_CUSTOM = 'notifee-alarm-custom-v1';

// Initialize notifee notification channels for Android
export const initializeNotifeeChannels = async (): Promise<void> => {
  try {
    // Alarm channel with default system alarm sound
    await notifee.createChannel({
      id: NOTIFEE_ALARM_CHANNEL_DEFAULT,
      name: 'Sunrise & Sunset Alarms (Default)',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lights: true,
      lightColor: '#FF6B35',
      bypassDnd: true,
      visibility: AndroidVisibility.PUBLIC,
    });

    // Alarm channel with custom sound
    await notifee.createChannel({
      id: NOTIFEE_ALARM_CHANNEL_CUSTOM,
      name: 'Sunrise & Sunset Alarms (Custom)',
      importance: AndroidImportance.HIGH,
      sound: 'custom_alert',
      vibration: true,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lights: true,
      lightColor: '#FF6B35',
      bypassDnd: true,
      visibility: AndroidVisibility.PUBLIC,
    });

    console.log('Notifee alarm channels created');
  } catch (error) {
    console.error('Failed to create notifee channels:', error);
  }
};

// Schedule an alarm notification via notifee
export const scheduleNotifeeAlarm = async (
  id: string,
  title: string,
  body: string,
  triggerTimestamp: number,
  soundName: 'default' | 'custom' = 'custom',
): Promise<string | null> => {
  try {
    // Don't schedule if in the past
    if (triggerTimestamp <= Date.now()) {
      console.log(`Skipping past notifee alarm: ${title}`);
      return null;
    }

    // Ensure the alarm channels exist. Creating a channel is idempotent and
    // needs no notification permission. Without this, scheduling before app
    // init (or before POST_NOTIFICATIONS is granted) leaves the channel
    // missing, and when the alarm fires the foreground service crashes with
    // "invalid channel for service notification". The channel persists, so it
    // is still present when the trigger fires from a killed app.
    await initializeNotifeeChannels();

    // Cancel any existing alarm with same ID
    try {
      await notifee.cancelNotification(id);
    } catch {
      // Ignore if doesn't exist
    }

    const channelId =
      soundName === 'custom'
        ? NOTIFEE_ALARM_CHANNEL_CUSTOM
        : NOTIFEE_ALARM_CHANNEL_DEFAULT;

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTimestamp,
      // SET_ALARM_CLOCK uses AlarmManager.setAlarmClock(): exact firing that is
      // exempt from Doze/battery deferral, so the alarm rings at the right time
      // even when the device is idle and the app is fully closed. (The previous
      // deprecated `allowWhileIdle: true` mapped to SET_AND_ALLOW_WHILE_IDLE,
      // which is inexact and gets batched/delayed in Doze.)
      alarmManager: {
        type: AlarmType.SET_ALARM_CLOCK,
      },
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        id,
        title,
        body,
        android: {
          channelId,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          sound: soundName === 'custom' ? 'custom_alert' : 'default',
          loopSound: true,
          ongoing: true,
          autoCancel: false,
          visibility: AndroidVisibility.PUBLIC,
          fullScreenAction: {
            id: 'default',
          },
          asForegroundService: true,
          // Android 14+ requires an explicit FGS type that matches the manifest
          // (overridden to mediaPlayback in plugins/withAndroidAlarm.js).
          foregroundServiceTypes: [
            AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
          ],
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: 'Stop',
              pressAction: { id: 'stop' },
            },
            {
              title: 'Snooze 5min',
              pressAction: { id: 'snooze' },
            },
          ],
        },
      },
      trigger,
    );

    console.log(
      `Notifee alarm scheduled: ${title} at ${new Date(triggerTimestamp).toLocaleString()} (ID: ${notificationId})`,
    );
    return notificationId;
  } catch (error) {
    console.error(`Error scheduling notifee alarm: ${title}`, error);
    return null;
  }
};

// Display an immediate alarm (for testing)
export const displayImmediateAlarm = async (
  title: string = 'Test Alarm',
  body: string = 'This is a test alarm!',
  soundName: 'default' | 'custom' = 'default',
): Promise<void> => {
  try {
    // Ensure the alarm channels exist before posting (see scheduleNotifeeAlarm).
    await initializeNotifeeChannels();

    const channelId =
      soundName === 'custom'
        ? NOTIFEE_ALARM_CHANNEL_CUSTOM
        : NOTIFEE_ALARM_CHANNEL_DEFAULT;

    await notifee.displayNotification({
      id: 'test-alarm-notifee',
      title,
      body,
      android: {
        channelId,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        sound: soundName === 'custom' ? 'custom_alert' : 'default',
        loopSound: true,
        ongoing: true,
        autoCancel: false,
        visibility: AndroidVisibility.PUBLIC,
        fullScreenAction: {
          id: 'default',
        },
        asForegroundService: true,
        // Android 14+ requires an explicit FGS type that matches the manifest
        // (overridden to mediaPlayback in plugins/withAndroidAlarm.js).
        foregroundServiceTypes: [
          AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
        ],
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'Stop',
            pressAction: { id: 'stop' },
          },
          {
            title: 'Snooze 5min',
            pressAction: { id: 'snooze' },
          },
        ],
      },
    });

    console.log('Notifee immediate test alarm displayed');
  } catch (error) {
    console.error('Error displaying notifee test alarm:', error);
  }
};

// Cancel a specific notifee alarm
export const cancelNotifeeAlarm = async (id: string): Promise<void> => {
  try {
    await notifee.cancelNotification(id);
    console.log(`Notifee alarm cancelled: ${id}`);
  } catch (error) {
    console.error(`Error cancelling notifee alarm ${id}:`, error);
  }
};

// Cancel all notifee alarms
export const cancelAllNotifeeAlarms = async (): Promise<void> => {
  try {
    await notifee.cancelAllNotifications();
    console.log('All notifee alarms cancelled');
  } catch (error) {
    console.error('Error cancelling all notifee alarms:', error);
  }
};

// Schedule a snooze alarm (5 minutes from now)
export const scheduleSnoozeAlarm = async (
  originalId: string,
  soundName: 'default' | 'custom' = 'custom',
): Promise<void> => {
  const snoozeTime = Date.now() + 5 * 60 * 1000;
  await scheduleNotifeeAlarm(
    `${originalId}-snooze`,
    'Snoozed Alarm',
    'Your snoozed alarm is now ringing!',
    snoozeTime,
    soundName,
  );
};

// Stop a currently active alarm notification (and its foreground service).
// stopForegroundService() tears down the looping-sound service; cancelling the
// notification then removes it from the tray.
export const stopAlarmNotification = async (
  notificationId: string,
): Promise<void> => {
  try {
    await notifee.stopForegroundService();
    await notifee.cancelNotification(notificationId);
    console.log(`Alarm notification stopped: ${notificationId}`);
  } catch (error) {
    console.error('Error stopping alarm notification:', error);
  }
};
