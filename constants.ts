/**
 * Application Constants
 * All hardcoded values, strings, numbers, and configurations in SCREAMING_SNAKE_CASE
 */

import {
  AppBackgroundTheme,
  CompassTheme,
  BottomNavTheme,
  EventsTheme,
  SettingsTheme,
  ThemeMode,
  ThemeInfo,
  CompassConfig,
  AlarmConfig,
  NavItem,
  WalkthroughStep,
} from './types';

// ============================================================================
// API CONFIGURATION
// ============================================================================

// Stable Cloudflare Worker proxy in front of the backend. The Vercel origin URL
// can change (new deployment/host); only the Worker's ORIGIN var is updated and
// clients keep using this URL. See backend/cloudflare/.
export const SGVD_API_BASE_URL = 'https://sgvd-proxy.sgvd-datta.workers.dev';
export const SGVD_API_URL = `${SGVD_API_BASE_URL}/sgvd/locations/`;
export const SGVD_EVENTS_URL = `${SGVD_API_BASE_URL}/sgvd/events/`;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_VALIDITY_MS = 60 * 1000; // 1 minute
export const EVENTS_CACHE_VALIDITY_MS = 10 * 60 * 1000; // 10 minutes
export const EVENTS_CACHE_KEY = '@sgvd_events_cache';
export const EVENTS_TIMESTAMP_KEY = '@sgvd_events_timestamp';
export const LOCATION_CACHE_KEY = '@sgvd_location_cache';
export const LOCATION_TIMESTAMP_KEY = '@sgvd_location_timestamp';

// ============================================================================
// LOCATION SYNC LIFECYCLE
// ============================================================================
// Internet-aware location syncing. The app is local-first: it works offline on
// the cached (or hardcoded fallback) location, but nudges the user to turn on
// internet so sunrise/sunset times stay fresh, and re-syncs automatically when
// connectivity returns.

// A successful API sync is considered "stale" after this long. When the app is
// opened offline and the last successful sync is older than this, we prompt the
// user to turn on internet so we can refresh. 1 week.
export const LOCATION_SYNC_STALE_MS = 7 * 24 * 60 * 60 * 1000;

// Cached location is served as an offline fallback only up to this age; older
// than this it is purged and we drop to the hardcoded FALLBACK_LOCATION. Kept as
// its own constant (separate from LOCATION_SYNC_STALE_MS) so the "prompt" and
// "purge" thresholds differ: we purge the cached location after 3 days, but only
// nag about being unsynced after a week.
export const LOCATION_CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// Timestamp (ms epoch, stringified) of the last SUCCESSFUL API sync. Distinct
// from LOCATION_TIMESTAMP_KEY, which records when the cache row was last written
// (used for the 60s in-memory freshness check). This one drives the weekly
// staleness prompt + purge, and is set ONLY on a real API success.
export const LOCATION_LAST_SYNC_KEY = '@sgvd_location_last_sync';

// Debounce window for connectivity transitions, so rapid offline<->online
// flapping triggers at most one background re-fetch.
export const CONNECTIVITY_DEBOUNCE_MS = 3000;

// Dedicated channel for a "turn on internet" local notification, kept separate
// from the alarm channels so it can be muted independently. Reserved for the
// future notification-presentation path (the v1 prompt is an in-app banner).
export const SYNC_NOTIFICATION_CHANNEL = 'sgvd-sync-reminders-v1';
export const SYNC_NOTIFICATION_CHANNEL_NAME = 'Location Sync Reminders';

// Text labels for the "turn on internet" prompt (banner + first-run modal).
export const TEXT_SYNC_PROMPT_TITLE = 'Connect to refresh';
export const TEXT_SYNC_PROMPT_FIRST_RUN =
  'Turn on internet so we can fetch the temple location and accurate sun times. The app still works offline.';
export const TEXT_SYNC_PROMPT_STALE =
  'Your saved location is over a week old. Turn on internet to refresh sunrise and sunset times.';
export const TEXT_SYNC_PROMPT_DISMISS = 'Not now';
export const TEXT_SYNC_PROMPT_RETRY = 'Open settings';

// ============================================================================
// FALLBACK VALUES
// ============================================================================

export const FALLBACK_LOCATION = {
  name: 'Avadhoota Datta Peetham',
  latitude: 12.308367,
  longitude: 76.645467,
  googleMapsUrl: 'https://www.google.com/maps/@12.308367,76.645467,17z',
};

export const FALLBACK_SUNRISE_HOUR = 6; // 6:00 AM
export const FALLBACK_SUNSET_HOUR = 18; // 6:00 PM

// ============================================================================
// TEST MODE CONFIGURATION
// ============================================================================

export const USE_HARDCODED_TEST_TIME = true;
export const TEST_SENSOR_TYPE = 'magnetometer';
export const TEST_SUNRISE_OFFSET_MINUTES = 3;
export const TEST_SUNSET_OFFSET_MINUTES = 4;

// ============================================================================
// ALARM CONFIGURATION
// ============================================================================

export const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  sunriseEnabled: false,
  sunsetEnabled: false,
  sunriseOffset: 2,
  sunsetOffset: 2,
  alarmEnabled: false,
  sunriseAlarmEnabled: false,
  sunsetAlarmEnabled: false,
  notificationsEnabled: true,
  sunriseNotificationEnabled: true,
  sunsetNotificationEnabled: true,
  alarmSound: 'custom',
  alarmTimeoutMs: 60000, // 1 minute
  snoozeMinutes: 5,
  scheduleDaysAhead: 1, // default: today + tomorrow. User can raise to 2 or 4 in settings.
};

export const ALARM_MAX_DURATION_MS = 60000; // 1 minute
export const ALARM_TEST_DURATION_MS = 10000; // 10 seconds
export const ALARM_TEST_DELAY_SECONDS = 5;
export const ALARM_NOTIFICATION_CHANNEL = 'sunrise-sunset-alarms';
export const ALARM_NOTIFICATION_CHANNEL_NAME = 'Sunrise & Sunset Alarms';
export const ALARM_CONFIG_KEY = '@sgvd_alarm_config';

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

export const DEFAULT_THEME: ThemeMode = 'cosmic';
export const COMPASS_THEME: ThemeMode = 'cosmic';

export const APP_BACKGROUNDS: Record<ThemeMode, AppBackgroundTheme> = {
  light: {
    gradientColors: ['#FF6B35', '#F7931E'] as const,
    gradientLocations: [0, 1] as const,
    statusBarStyle: 'light-content' as const,
    headerTextColor: '#FFFFFF',
    subtitleColor: '#FFFFFF',
    buttonBg: 'rgba(255, 255, 255, 0.2)',
    buttonBorder: 'rgba(255, 255, 255, 0.5)',
    buttonText: '#FFFFFF',
    modalBg: 'rgba(0, 30, 60, 0.95)',
    modalBorder: 'rgba(255, 215, 0, 0.6)',
    modalTitle: '#FFD700',
    modalText: '#E6E6FA',
  },
  dark: {
    gradientColors: ['#292524', '#1c1917', '#0c0a09', '#000000'] as const,
    gradientLocations: [0, 0.3, 0.6, 1] as const,
    statusBarStyle: 'light-content' as const,
    headerTextColor: '#e7e5e4',
    subtitleColor: '#a8a29e',
    buttonBg: 'rgba(28, 25, 23, 0.6)',
    buttonBorder: '#44403c',
    buttonText: '#e7e5e4',
    modalBg: 'rgba(12, 10, 9, 0.95)',
    modalBorder: '#44403c',
    modalTitle: '#FCD34D',
    modalText: '#a8a29e',
  },
  cosmic: {
    isRadial: true,
    radialColorList: [
      { offset: '0%', color: '#b45309', opacity: '0.9' },
      { offset: '40%', color: '#4c0519', opacity: '1' },
      { offset: '100%', color: '#020617', opacity: '1' },
    ],
    gradientColors: ['#b45309', '#4c0519', '#020617'] as const,
    gradientLocations: [0, 0.4, 1] as const,
    statusBarStyle: 'light-content' as const,
    headerTextColor: '#FFFFFF',
    subtitleColor: '#fbbf24',
    buttonBg: 'rgba(76, 5, 25, 0.6)',
    buttonBorder: 'rgba(251, 191, 36, 0.5)',
    buttonText: '#FFFFFF',
    modalBg: 'rgba(2, 6, 23, 0.95)',
    modalBorder: 'rgba(251, 191, 36, 0.6)',
    modalTitle: '#fbbf24',
    modalText: '#fef3c7',
  },
};

export const COMPASS_THEMES: Record<ThemeMode, CompassTheme> = {
  light: {
    dialBackground: 'rgba(95, 46, 22, 0.5)',
    dialStroke: 'rgba(183, 99, 4, 0.6)',
    tickMajor: '#D97706',
    tickMinor: 'rgba(180, 83, 9, 0.5)',
    northColor: '#EF4444',
    cardinalColor: '#FDE68A',
    centerHubBg: 'rgba(60, 30, 15, 0.7)',
    centerHubStroke: 'rgba(217, 119, 6, 0.5)',
    headingLabel: 'rgba(251, 191, 36, 0.95)',
    headingValue: '#FDE68A',
    gold: '#F59E0B',
    emerald: '#10b981',
    emeraldGlow: '#34d399',
    turnContainerBg: 'rgba(80, 40, 20, 0.55)',
    turnContainerBorder: 'rgba(217, 119, 6, 0.5)',
    turnContainerAlignedBg: 'rgba(6, 78, 59, 0.5)',
    turnContainerAlignedBorder: 'rgba(16, 185, 129, 0.6)',
    statusBg: 'rgba(60, 30, 15, 0.65)',
    statusBorder: 'rgba(217, 119, 6, 0.4)',
    statusText: '#FDE68A',
    phoneMarkerFill: '#FDE68A',
    phoneMarkerStroke: 'rgba(80, 40, 20, 0.6)',
  },
  dark: {
    dialBackground: 'rgba(28, 25, 23, 0.85)',
    dialStroke: '#444444',
    tickMajor: '#FCD34D',
    tickMinor: '#57534e',
    northColor: '#ef4444',
    cardinalColor: '#a8a29e',
    centerHubBg: 'rgba(10, 10, 10, 0.95)',
    centerHubStroke: '#44403c',
    headingLabel: '#78716c',
    headingValue: '#FFFFFF',
    gold: '#fbbf24',
    emerald: '#34d399',
    emeraldGlow: '#10b981',
    turnContainerBg: 'rgba(28, 25, 23, 0.6)',
    turnContainerBorder: '#44403c',
    turnContainerAlignedBg: 'rgba(6, 78, 59, 0.3)',
    turnContainerAlignedBorder: 'rgba(16, 185, 129, 0.5)',
    statusBg: 'rgba(28, 25, 23, 0.8)',
    statusBorder: '#44403c',
    statusText: '#e7e5e4',
    phoneMarkerFill: '#FFFFFF',
    phoneMarkerStroke: '#78716c',
  },
  cosmic: {
    dialBackground: 'rgba(76, 5, 25, 0.7)',
    dialStroke: 'rgba(251, 191, 36, 0.4)',
    tickMajor: '#fbbf24',
    tickMinor: 'rgba(251, 191, 36, 0.3)',
    northColor: '#ef4444',
    cardinalColor: '#fef3c7',
    centerHubBg: 'rgba(2, 6, 23, 0.9)',
    centerHubStroke: 'rgba(251, 191, 36, 0.3)',
    headingLabel: '#d97706',
    headingValue: '#FFFFFF',
    gold: '#fbbf24',
    emerald: '#34d399',
    emeraldGlow: '#10b981',
    turnContainerBg: 'rgba(76, 5, 25, 0.5)',
    turnContainerBorder: 'rgba(251, 191, 36, 0.4)',
    turnContainerAlignedBg: 'rgba(6, 78, 59, 0.4)',
    turnContainerAlignedBorder: 'rgba(52, 211, 153, 0.5)',
    statusBg: 'rgba(2, 6, 23, 0.8)',
    statusBorder: 'rgba(251, 191, 36, 0.3)',
    statusText: '#fef3c7',
    phoneMarkerFill: '#FFFFFF',
    phoneMarkerStroke: 'rgba(251, 191, 36, 0.5)',
  },
};

export const BOTTOM_NAV_THEMES: Record<ThemeMode, BottomNavTheme> = {
  light: {
    background: '#C74A1A',
    borderColor: '#FF8C5A',
    activeText: '#FFFFFF',
    activeIcon: '#FFFFFF',
    inactiveText: 'rgba(255, 255, 255, 0.6)',
    inactiveIcon: 'rgba(255, 255, 255, 0.6)',
    activeGlow: '#FFD700',
  },
  dark: {
    background: '#0c0a09',
    borderColor: '#57534e',
    activeText: '#FCD34D',
    activeIcon: '#FCD34D',
    inactiveText: '#78716c',
    inactiveIcon: '#78716c',
    activeGlow: '#FCD34D',
  },
  cosmic: {
    background: '#1a0508',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    activeText: '#fbbf24',
    activeIcon: '#fbbf24',
    inactiveText: 'rgba(254, 243, 199, 0.5)',
    inactiveIcon: 'rgba(254, 243, 199, 0.5)',
    activeGlow: '#fbbf24',
  },
};

export const EVENTS_THEMES: Record<ThemeMode, EventsTheme> = {
  light: {
    title: '#FFFFFF',
    cardBg: 'rgba(255, 255, 255, 0.15)',
    cardBorder: 'rgba(255, 255, 255, 0.3)',
    eventTitle: '#FFFFFF',
    eventSubtext: 'rgba(255, 255, 255, 0.7)',
    dateBg: 'rgba(0, 0, 0, 0.3)',
    dateBorder: 'rgba(255, 255, 255, 0.2)',
    dateText: '#FFFFFF',
    loadingColor: '#FFFFFF',
    emptyText: 'rgba(255, 255, 255, 0.6)',
  },
  dark: {
    title: '#e7e5e4',
    cardBg: 'rgba(28, 25, 23, 0.6)',
    cardBorder: '#44403c',
    eventTitle: '#e7e5e4',
    eventSubtext: '#a8a29e',
    dateBg: '#1c1917',
    dateBorder: '#44403c',
    dateText: '#FCD34D',
    loadingColor: '#FCD34D',
    emptyText: '#78716c',
  },
  cosmic: {
    title: '#FFFFFF',
    cardBg: 'rgba(76, 5, 25, 0.5)',
    cardBorder: 'rgba(251, 191, 36, 0.3)',
    eventTitle: '#fef3c7',
    eventSubtext: 'rgba(254, 243, 199, 0.7)',
    dateBg: 'rgba(2, 6, 23, 0.8)',
    dateBorder: 'rgba(251, 191, 36, 0.4)',
    dateText: '#fbbf24',
    loadingColor: '#fbbf24',
    emptyText: 'rgba(254, 243, 199, 0.5)',
  },
};

export const SETTINGS_THEMES: Record<ThemeMode, SettingsTheme> = {
  light: {
    title: '#FFFFFF',
    sectionBg: 'rgba(255, 255, 255, 0.15)',
    sectionBorder: 'rgba(255, 255, 255, 0.3)',
    sectionTitle: '#FFFFFF',
    itemText: '#FFFFFF',
    itemSubtext: 'rgba(255, 255, 255, 0.7)',
    accent: '#FFD700',
    chevron: 'rgba(255, 255, 255, 0.5)',
    selectedBg: 'rgba(255, 215, 0, 0.15)',
  },
  dark: {
    title: '#e7e5e4',
    sectionBg: 'rgba(28, 25, 23, 0.6)',
    sectionBorder: '#44403c',
    sectionTitle: '#e7e5e4',
    itemText: '#e7e5e4',
    itemSubtext: '#a8a29e',
    accent: '#FCD34D',
    chevron: '#78716c',
    selectedBg: 'rgba(252, 211, 77, 0.1)',
  },
  cosmic: {
    title: '#FFFFFF',
    sectionBg: 'rgba(76, 5, 25, 0.5)',
    sectionBorder: 'rgba(251, 191, 36, 0.3)',
    sectionTitle: '#fef3c7',
    itemText: '#fef3c7',
    itemSubtext: 'rgba(254, 243, 199, 0.7)',
    accent: '#fbbf24',
    chevron: 'rgba(251, 191, 36, 0.5)',
    selectedBg: 'rgba(251, 191, 36, 0.15)',
  },
};

export const THEME_INFO: Record<ThemeMode, ThemeInfo> = {
  cosmic: {
    name: 'Cosmic',
    colors: ['#b45309', '#4c0519', '#fbbf24'],
    description: 'Amber & rose galaxy vibes',
  },
  dark: {
    name: 'Midnight',
    colors: ['#292524', '#1c1917', '#FCD34D'],
    description: 'Dark stone with gold accents',
  },
  light: {
    name: 'Sunrise',
    colors: ['#FF6B35', '#F7931E', '#FFD700'],
    description: 'Warm orange & gold tones',
  },
};

// ============================================================================
// COMPASS CONFIGURATION
// ============================================================================

export const DEFAULT_COMPASS_CONFIG: CompassConfig = {
  // Size & Layout
  compassSizeRatio: 0.67,
  centerHubSizeRatio: 0.35,
  
  // Tick Marks
  cardinalTickLength: 20,
  semiCardinalTickLength: 12,
  minorTickLength: 6,
  cardinalTickWidth: 2.5,
  minorTickWidth: 0.8,
  
  // Font Sizes
  cardinalNorthFontSize: 18,
  cardinalOtherFontSize: 14,
  centerLabelFontSize: 8,
  centerValueFontSize: 28,
  targetBearingFontSize: 12,
  turnInstructionIconSize: 25,
  turnInstructionTextSize: 16,
  statusTextSize: 10,
  locationTextSize: 15,
  
  // Spacing & Padding
  turnContainerPaddingH: 22,
  turnContainerPaddingV: 12,
  turnContainerMarginBottom: 30,
  compassMarginBottom: 80,
  statusContainerPaddingH: 20,
  statusContainerPaddingV: 16,
  statusContainerMargin: 20,
  statusContainerBottom: 40,
  
  // Glow Effects
  glowRingOffset: 5,
  glowRingWidth: 3,
  
  // Sensor & Animation
  facingThresholdDegrees: 20,
  compassRefreshInterval: 30,
  smoothingAlpha: 1,
  magnetometerSpringDamping: 200,
  magnetometerSpringStiffness: 1000,
  
  // Border Radii
  turnContainerRadius: 50,
  statusContainerRadius: 30,
};

export const COMPASS_DEGREE_MARKINGS_COUNT = 72;
export const COMPASS_DEGREE_INCREMENT = 5;
export const COMPASS_CARDINAL_INTERVAL = 18;
export const COMPASS_SEMI_CARDINAL_INTERVAL = 6;

// ============================================================================
// DARSHAN OVERLAY CONFIGURATION
// ============================================================================

export const DARSHAN_IMAGE_WIDTH = 288;
export const DARSHAN_IMAGE_HEIGHT = 384;
export const DARSHAN_AURA_CONTAINER_SIZE = 600;

export const DARSHAN_FADE_DURATION_MS = 1000;
export const DARSHAN_SPRING_FRICTION = 8;
export const DARSHAN_SPRING_TENSION = 40;

export const DARSHAN_PULSE_1_DURATION_MS = 3000;
export const DARSHAN_PULSE_2_DURATION_MS = 2500;
export const DARSHAN_PULSE_3_DURATION_MS = 2000;

export const DARSHAN_PULSE_1_MIN_OPACITY = 0.5;
export const DARSHAN_PULSE_1_MAX_OPACITY = 0.8;
export const DARSHAN_PULSE_2_MIN_OPACITY = 0.3;
export const DARSHAN_PULSE_2_MAX_OPACITY = 0.6;
export const DARSHAN_PULSE_3_MIN_OPACITY = 0.4;
export const DARSHAN_PULSE_3_MAX_OPACITY = 0.7;

export const DARSHAN_PULSE_2_START_DELAY_MS = 500;
export const DARSHAN_PULSE_3_START_DELAY_MS = 1000;

export const DARSHAN_CONTROL_BUTTON_SIZE = 56;
export const DARSHAN_CONTROL_BUTTON_BORDER_RADIUS = 28;
export const DARSHAN_CLOSE_BUTTON_SIZE = 44;
export const DARSHAN_CLOSE_BUTTON_BORDER_RADIUS = 22;

export const DARSHAN_CONTROL_BUTTON_BG_COLOR = 'rgba(0, 0, 0, 0.7)';
export const DARSHAN_CONTROL_BUTTON_BORDER_COLOR = 'rgba(251, 191, 36, 0.6)';
export const DARSHAN_CONTROL_BUTTON_ICON_COLOR = '#fbbf24';
export const DARSHAN_CLOSE_BUTTON_BG_COLOR = 'rgba(0, 0, 0, 0.6)';
export const DARSHAN_CLOSE_BUTTON_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
export const DARSHAN_CLOSE_BUTTON_ICON_COLOR = '#ffffff';

export const DARSHAN_DIMMING_OVERLAY_COLOR = 'rgba(0, 0, 0, 0.4)';

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Darshan', icon: 'compass' },
  { id: 'sun', label: 'Alarm', icon: 'alarm' },
  { id: 'events', label: 'Programs', icon: 'calendar' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export const BOTTOM_NAV_HEIGHT = 80;
export const BOTTOM_NAV_PADDING_BOTTOM = 20;
export const BOTTOM_NAV_ACTIVE_INDICATOR_WIDTH = 60;
export const BOTTOM_NAV_ACTIVE_INDICATOR_HEIGHT = 4;
export const BOTTOM_NAV_ACTIVE_INDICATOR_BORDER_RADIUS = 2;
export const BOTTOM_NAV_ACTIVE_ICON_SIZE = 26;
export const BOTTOM_NAV_INACTIVE_ICON_SIZE = 24;
export const BOTTOM_NAV_ICON_MARGIN_BOTTOM = 4;
export const BOTTOM_NAV_LABEL_FONT_SIZE = 10;
export const BOTTOM_NAV_LABEL_LETTER_SPACING = 0.5;

// ============================================================================
// APP LAYOUT CONFIGURATION
// ============================================================================

export const APP_HEADER_PADDING_TOP = 60;
export const APP_HEADER_PADDING_BOTTOM = 20;
export const APP_HEADER_PADDING_HORIZONTAL = 20;
export const APP_TITLE_FONT_SIZE = 28;
export const APP_SUBTITLE_FONT_SIZE = 16;
export const APP_SUBTITLE_MARGIN_TOP = 8;
export const APP_SUBTITLE_LINE_HEIGHT = 22;

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Guru Dhigvandanam';

// ============================================================================
// SUN CYCLE VIEW CONFIGURATION
// ============================================================================

export const SUN_COUNTDOWN_FONT_SIZE = 64;
export const SUN_COUNTDOWN_LABEL_FONT_SIZE = 18;
export const SUN_COUNTDOWN_LETTER_SPACING = 4;
export const SUN_TIME_CARD_MIN_WIDTH = 140;
export const SUN_TIME_CARD_BORDER_RADIUS = 16;
export const SUN_TIME_CARD_PADDING = 20;
export const SUN_ICON_SIZE = 32;
export const SUN_TIME_LABEL_FONT_SIZE = 14;
export const SUN_TIME_VALUE_FONT_SIZE = 20;

export const SUN_SUNRISE_ICON_COLOR = '#FDB813';
export const SUN_SUNSET_ICON_COLOR = '#FF6B35';

export const SUN_CONTROLS_BORDER_RADIUS = 16;
export const SUN_CONTROLS_PADDING = 20;
export const SUN_SECTION_TITLE_FONT_SIZE = 18;
export const SUN_CONTROL_TEXT_FONT_SIZE = 16;
export const SUN_CONTROL_TEXT_NESTED_FONT_SIZE = 15;
export const SUN_TEST_BUTTON_BORDER_RADIUS = 12;
export const SUN_TEST_BUTTON_PADDING = 16;

// ============================================================================
// VIDEO CONFIGURATION
// ============================================================================

export const VIDEO_PLAYBACK_RATE = 0.3;
export const VIDEO_MUTED = true;
export const VIDEO_LOOP = true;

// ============================================================================
// AUDIO CONFIGURATION
// ============================================================================

export const AUDIO_VOLUME_DEFAULT = 1.0;
export const AUDIO_VOLUME_MIN = 0;
export const AUDIO_VOLUME_MAX = 1;
export const AUDIO_VOLUME_STEP = 0.01;

// ============================================================================
// TEXT LABELS
// ============================================================================

export const TEXT_GURU_DIGVANDANAM = 'Guru Digvandanam';
export const TEXT_OFFER_PRAYERS = 'Offer prayers to Appaji in the direction shown';
export const TEXT_SUNRISE_SUNSET_ALARMS = 'Sunrise & Sunset Alarms';
export const TEXT_PROGRAMS = 'Programs';
export const TEXT_STAY_UPDATED = 'Stay updated with upcoming programs';
export const TEXT_SETTINGS = 'Settings';
export const TEXT_CUSTOMIZE_EXPERIENCE = 'Customize your experience';
export const TEXT_LOADING_EVENTS = 'Loading events...';
export const TEXT_NO_UPCOMING_EVENTS = 'No upcoming events';
export const TEXT_LOCATION_TBA = 'Location TBA';
export const TEXT_LOADING_SUN_TIMES = 'Loading sun times...';
export const TEXT_NEXT_SUNRISE = 'NEXT SUNRISE';
export const TEXT_NEXT_SUNSET = 'NEXT SUNSET';
export const TEXT_SUNRISE = 'Sunrise';
export const TEXT_SUNSET = 'Sunset';
export const TEXT_ALARM = 'Alarm';
export const TEXT_NOTIFICATIONS = 'Notifications';
export const TEXT_SUNRISE_ALARM = 'Sunrise Alarm';
export const TEXT_SUNSET_ALARM = 'Sunset Alarm';
export const TEXT_SUNRISE_ALERTS = 'Sunrise Alerts';
export const TEXT_SUNSET_ALERTS = 'Sunset Alerts';
export const TEXT_ALARM_NOTIFICATION_SETTINGS = 'Alarm & Notification Settings';
export const TEXT_SCHEDULE_AHEAD = 'Schedule ahead';
// How many days ahead the user can choose to pre-schedule alarms. Kept small so
// the OS isn't flooded with exact alarms; alarms are refreshed on every app open.
export const SCHEDULE_DAYS_OPTIONS = [1, 2, 4] as const;
export const TEXT_ALARM_SOUND = 'Alarm Sound';
export const TEXT_ALARM_SOUND_DEFAULT = 'Default';
export const TEXT_ALARM_SOUND_CUSTOM = 'Sri Natha Charana Dwandvam';
export const TEXT_SCHEDULE_MODE = 'Schedule Mode';
export const TEXT_SCHEDULE_MODE_ALARM = 'Alarm';
export const TEXT_SCHEDULE_MODE_NOTIFICATION = 'Notification';
export const TEXT_ALARM_TIMEOUT = 'Alarm Timeout';
export const TEXT_ALARM_TIMEOUT_SUBTITLE = 'Auto-stop the ringing alarm after';
export const TEXT_SNOOZE_DURATION = 'Snooze Duration';
export const TEXT_SNOOZE_DURATION_SUBTITLE = 'Ring again after';

export const ALARM_TIMEOUT_OPTIONS: { label: string; value: number }[] = [
  { label: '30s', value: 30000 },
  { label: '1 min', value: 60000 },
  { label: '2 min', value: 120000 },
  { label: '5 min', value: 300000 },
  { label: 'Never', value: 0 },
];
export const SNOOZE_DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
];
export const TEXT_SCHEDULE_DAYS_AHEAD = 'Schedule Ahead';
export const TEXT_SCHEDULE_DAYS_AHEAD_SUBTITLE = 'Pre-schedule alarms for the next';
// Days-ahead options (max 4) kept small so the OS isn't flooded with exact
// alarms; the schedule is refreshed every time the app is opened.
export const SCHEDULE_DAYS_AHEAD_OPTIONS: { label: string; value: number }[] = [
  { label: '1 day', value: 1 },
  { label: '2 days', value: 2 },
  { label: '4 days', value: 4 },
];
export const TEXT_APPEARANCE = 'APPEARANCE';
export const TEXT_SOUND = 'SOUND';
export const TEXT_CHOOSE_THEME = 'Choose Theme';
export const TEXT_DARSHAN_AUDIO_VOLUME = 'Darshan Audio Volume';
export const TEXT_ALIGNED = 'Aligned';
export const TEXT_TURN_RIGHT = 'ROTATE RIGHT';
export const TEXT_TURN_LEFT = 'ROTATE LEFT';
export const TEXT_HEADING = 'HEADING';
export const TEXT_TIME_FOR_PRAYERS = 'Time for your prayers';
export const TEXT_STOP_ALARM = 'Stop Alarm';

// ============================================================================
// EMOJIS
// ============================================================================
// Emoji constants removed - no longer used

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const HAPTICS_RESET_DELAY_MS = 2000;
export const ANIMATION_SPRING_CONFIG = {
  friction: 8,
  tension: 40,
};

// ============================================================================
// WALKTHROUGH / ONBOARDING
// ============================================================================

// AsyncStorage key that records the first-run walkthrough has been seen.
// Versioned so a future redesign can re-show it to everyone by bumping `_vN`.
// Bumped to _v2 with the redesigned walkthrough (live in-app previews) so every
// existing user sees the new tour once.
export const WALKTHROUGH_STORAGE_KEY = 'hasSeenWalkthrough_v2';

export const TEXT_WALKTHROUGH_SKIP = 'Skip';
export const TEXT_WALKTHROUGH_NEXT = 'Next';
export const TEXT_WALKTHROUGH_BACK = 'Back';
export const TEXT_WALKTHROUGH_GET_STARTED = 'Get Started';

// Settings row that re-launches the walkthrough on demand.
export const TEXT_SHOW_WALKTHROUGH = 'How to use the app';
export const TEXT_SHOW_WALKTHROUGH_SUB = 'Replay the welcome tour';

// ============================================================================
// SUNRISE DARSHAN STREAK
// ============================================================================

// Per-install anonymous id + local streak state (single JSON blob, like the
// alarm config). The streak is local-first (works offline, drives the
// celebration) and synced to the backend keyed by INSTALL_ID for durable
// backup + reinstall recovery.
export const INSTALL_ID_KEY = '@sgvd_install_id';
export const STREAK_STATE_KEY = '@sgvd_streak_state';

// A darshan counts toward the streak only if it happens within this many
// minutes either side of that day's actual sunrise. Tunable.
export const SUNRISE_WINDOW_MINUTES = 60;

// Milestones that trigger a celebration + share prompt (day 2 intentionally
// omitted to avoid nagging). Used by both the modal and the contextual pill.
export const STREAK_MILESTONES: number[] = [1, 3, 7];

export const STREAK_MILESTONE_LABELS: Record<number, string> = {
  1: 'First Sunrise Darshan!',
  3: '3-Day Streak',
  7: '7-Day Streak — a full week!',
};

// Backend streak endpoint (POST to record a completion, GET /{install_id} to
// read). Routed through the same stable Cloudflare proxy; not edge-cached.
export const SGVD_STREAKS_URL = `${SGVD_API_BASE_URL}/sgvd/streaks`;

// Shown in the share caption so recipients can install the app. Update with the
// real Play Store / App Store / landing URL once published.
export const APP_DOWNLOAD_URL =
  'https://play.google.com/store/apps/details?id=com.darshanamcompassnative';

// Builds the prefilled caption that accompanies the shared streak card image.
export const buildStreakShareMessage = (streak: number): string =>
  `🌅 I've kept a ${streak}-day sunrise darshan streak on ${TEXT_GURU_DIGVANDANAM}! ` +
  `Offer your prayers to Appaji in the sacred direction and never miss a sunrise. ` +
  `Download the app: ${APP_DOWNLOAD_URL}`;

// Share-card palette (cosmic temple theme) + capture size.
export const STREAK_CARD_BG = ['#b45309', '#4c0519', '#020617'] as const;
export const STREAK_CARD_GOLD = '#fbbf24';
export const STREAK_CARD_CREAM = '#fef3c7';
export const STREAK_CARD_SIZE = 340;

// Streak UI text labels.
export const TEXT_STREAK_SECTION = 'YOUR STREAK';
export const TEXT_STREAK_CURRENT = 'Current streak';
export const TEXT_STREAK_LONGEST = 'Longest streak';
export const TEXT_STREAK_LAST = 'Last darshan';
export const TEXT_STREAK_SHARE = 'Share my streak';
export const TEXT_STREAK_CONTINUE = 'Continue';
export const TEXT_STREAK_DAYS = 'days';
export const TEXT_STREAK_DAY = 'day';
export const TEXT_STREAK_NONE = 'No streak yet — align at sunrise to begin';

// One slide per app capability, shown in order on first launch. Each slide
// renders a live, theme-aware preview of the real screen it describes (see
// `preview` → components/walkthroughPreviews/). `icon` reuses the bottom-nav Ionicon
// names as a lightweight semantic fallback.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    icon: 'sparkles',
    preview: 'welcome',
    title: 'Welcome to Guru Digvandanam',
    body: 'Offer your prayers to Appaji in the sacred direction, and never miss a sunrise or sunset.',
  },
  {
    icon: 'compass',
    preview: 'compass',
    title: 'Find the Sacred Direction',
    body: 'Hold your phone flat and rotate slowly — the dial guides you until it reads “Aligned”, then a live darshan appears.',
  },
  {
    icon: 'alarm',
    preview: 'alarm',
    title: 'Sunrise & Sunset Alarms',
    body: 'See each day’s sunrise and sunset, and switch on a gentle alarm so you’re on time for prayers — even when the app is closed.',
  },
  {
    icon: 'calendar',
    preview: 'programs',
    title: 'Stay Updated',
    body: 'Browse upcoming programs and events, with the date and place for each, so you never miss a special occasion.',
  },
  {
    icon: 'settings-outline',
    preview: 'settings',
    title: 'Make It Yours',
    body: 'Pick a theme, choose your alarm sound, and fine-tune timing any time from Settings.',
  },
];

