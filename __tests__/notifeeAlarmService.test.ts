import notifee, { AlarmType, AndroidForegroundServiceType } from '@notifee/react-native';
import {
  scheduleNotifeeAlarm,
  displayImmediateAlarm,
  getScheduledNotifeeAlarms,
} from '../utils/notifeeAlarmService';

// Mock notifee so the alarm-scheduling logic can be asserted without a device.
// These tests guard the fixes that make the alarm survive background/closed
// states: an exact SET_ALARM_CLOCK trigger and a mediaPlayback foreground
// service. If either regresses, these fail.
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('chan'),
    createTriggerNotification: jest.fn().mockResolvedValue('notif-id'),
    getTriggerNotifications: jest.fn().mockResolvedValue([]),
    displayNotification: jest.fn().mockResolvedValue('notif-id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    stopForegroundService: jest.fn().mockResolvedValue(undefined),
    registerForegroundService: jest.fn(),
  },
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
  AndroidCategory: { ALARM: 'alarm' },
  AndroidVisibility: { PUBLIC: 1 },
  AndroidForegroundServiceType: { FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK: 2 },
  AlarmType: {
    SET: 0,
    SET_AND_ALLOW_WHILE_IDLE: 1,
    SET_EXACT: 2,
    SET_EXACT_AND_ALLOW_WHILE_IDLE: 3,
    SET_ALARM_CLOCK: 4,
  },
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
}));

const mock = notifee as unknown as Record<string, { mock: { calls: any[][] } }>;

describe('notifee alarm scheduling (background / closed-app correctness)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses SET_ALARM_CLOCK so the alarm fires exactly even in Doze / when the app is closed', async () => {
    await scheduleNotifeeAlarm('a', 'Title', 'Body', Date.now() + 60_000, 'default');
    expect((notifee as any).createTriggerNotification).toHaveBeenCalledTimes(1);
    const [, trigger] = mock.createTriggerNotification.mock.calls[0];
    expect(trigger.alarmManager.type).toBe(AlarmType.SET_ALARM_CLOCK);
  });

  it('runs as a mediaPlayback foreground service with a full-screen intent and Stop/Snooze actions', async () => {
    await scheduleNotifeeAlarm('a', 'Title', 'Body', Date.now() + 60_000, 'custom');
    const [notif] = mock.createTriggerNotification.mock.calls[0];
    expect(notif.android.asForegroundService).toBe(true);
    expect(notif.android.foregroundServiceTypes).toContain(
      AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
    );
    expect(notif.android.fullScreenAction).toBeDefined();
    const actionIds = notif.android.actions.map((a: any) => a.pressAction.id);
    expect(actionIds).toEqual(expect.arrayContaining(['stop', 'snooze']));
  });

  it('does not schedule an alarm whose trigger time is in the past', async () => {
    const result = await scheduleNotifeeAlarm('a', 'T', 'B', Date.now() - 1000);
    expect(result).toBeNull();
    expect((notifee as any).createTriggerNotification).not.toHaveBeenCalled();
  });

  it('immediate (test) alarm also requests a mediaPlayback foreground service', async () => {
    await displayImmediateAlarm('T', 'B', 'default');
    const [notif] = mock.displayNotification.mock.calls[0];
    expect(notif.android.asForegroundService).toBe(true);
    expect(notif.android.foregroundServiceTypes).toContain(
      AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
    );
  });

  // Android alarm-mode alarms live in notifee, not expo-notifications. The
  // scheduled-count UI read 0 until getScheduledNotifeeAlarms() surfaced them,
  // which is why "the alarm is not being scheduled" was reported.
  it('lists pending notifee alarms with their trigger time', async () => {
    const ts = Date.now() + 3_600_000;
    (notifee as any).getTriggerNotifications.mockResolvedValueOnce([
      {
        notification: { id: 'sunrise-today', title: 'Sunrise Alert', body: 'Soon' },
        trigger: { type: 0, timestamp: ts },
      },
    ]);

    const alarms = await getScheduledNotifeeAlarms();

    expect(alarms).toEqual([
      {
        id: 'sunrise-today',
        title: 'Sunrise Alert',
        body: 'Soon',
        date: new Date(ts),
      },
    ]);
  });

  it('returns an empty list (not a throw) when notifee has no pending alarms', async () => {
    (notifee as any).getTriggerNotifications.mockResolvedValueOnce([]);
    expect(await getScheduledNotifeeAlarms()).toEqual([]);
  });
});
