/**
 * Jest setup: mock the native modules that have no JS-only build so the app's
 * component tree can be imported and rendered under jest-expo. The jest-expo
 * preset already mocks React Native core and most expo-* packages; the modules
 * below are third-party native libraries (or hooks) it does not cover.
 */
/* eslint-env jest */

// AsyncStorage ships an official jest mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// react-native-reanimated ships a jest mock (CompassView/animations use it).
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // The mock's `call` is a no-op stub some versions reference.
  Reanimated.default.call = () => {};
  return Reanimated;
});

// react-native-gradients has no jest-friendly build; stub the gradient views.
jest.mock('react-native-gradients', () => ({
  __esModule: true,
  RadialGradient: () => null,
  LinearGradient: () => null,
}));

// expo-video is a native module; stub the view and the player hook. useVideoPlayer
// keeps one player per component (useRef) so re-renders don't churn effect deps.
jest.mock('expo-video', () => {
  const React = require('react');
  const makePlayer = () => ({
    loop: false, muted: false, volume: 1, currentTime: 0, playing: false,
    play: jest.fn(), pause: jest.fn(), replace: jest.fn(), release: jest.fn(),
  });
  return {
    __esModule: true,
    VideoView: () => null,
    useVideoPlayer: (_source, setup) => {
      const ref = React.useRef();
      if (!ref.current) {
        ref.current = makePlayer();
        if (typeof setup === 'function') setup(ref.current);
      }
      return ref.current;
    },
    createVideoPlayer: makePlayer,
  };
});

// expo-audio is a native module; stub the player hook + audio-mode helpers.
jest.mock('expo-audio', () => {
  const React = require('react');
  const makePlayer = () => ({
    loop: false, volume: 1, muted: false, playing: false,
    play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), remove: jest.fn(),
  });
  return {
    __esModule: true,
    useAudioPlayer: () => {
      const ref = React.useRef();
      if (!ref.current) ref.current = makePlayer();
      return ref.current;
    },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    setIsAudioActiveAsync: jest.fn().mockResolvedValue(undefined),
  };
});

// @notifee/react-native is a native module; provide the surface the app uses.
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
    onForegroundEvent: jest.fn().mockReturnValue(() => {}),
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
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
  EventType: { DISMISSED: 0, PRESS: 1, ACTION_PRESS: 2, DELIVERED: 3 },
}));
