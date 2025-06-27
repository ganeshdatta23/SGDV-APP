
import notifee, { TimestampTrigger, TriggerType } from '@notifee/react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 3; //AuthorizationStatus.AUTHORIZED
}

export async function scheduleNotification(title: string, body: string, timestamp: number): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission not granted. Cannot schedule notification.');
    return;
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
  };

  await notifee.createTriggerNotification(
    {
      title,
      body,
      android: {
        channelId: 'default',
      },
    },
    trigger,
  );
}

export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}
