/**
 * Central Type Definitions
 * All TypeScript interfaces and types used across the application
 */

import { VideoPlayer } from 'expo-video';
import { AudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { SharedValue } from 'react-native-reanimated';

// ============================================================================
// THEME TYPES
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'cosmic';

export interface AppBackgroundTheme {
  gradientColors: readonly string[];
  gradientLocations: readonly number[];
  statusBarStyle: 'light-content' | 'dark-content';
  headerTextColor: string;
  subtitleColor: string;
  buttonBg: string;
  buttonBorder: string;
  buttonText: string;
  modalBg: string;
  modalBorder: string;
  modalTitle: string;
  modalText: string;
  isRadial?: boolean;
  radialColorList?: Array<{ offset: string; color: string; opacity: string }>;
}

export interface CompassTheme {
  dialBackground: string;
  dialStroke: string;
  tickMajor: string;
  tickMinor: string;
  northColor: string;
  cardinalColor: string;
  centerHubBg: string;
  centerHubStroke: string;
  headingLabel: string;
  headingValue: string;
  gold: string;
  emerald: string;
  emeraldGlow: string;
  turnContainerBg: string;
  turnContainerBorder: string;
  turnContainerAlignedBg: string;
  turnContainerAlignedBorder: string;
  statusBg: string;
  statusBorder: string;
  statusText: string;
  phoneMarkerFill: string;
  phoneMarkerStroke: string;
}

export interface BottomNavTheme {
  background: string;
  borderColor: string;
  activeText: string;
  activeIcon: string;
  inactiveText: string;
  inactiveIcon: string;
  activeGlow: string;
}

export interface EventsTheme {
  title: string;
  cardBg: string;
  cardBorder: string;
  eventTitle: string;
  eventSubtext: string;
  dateBg: string;
  dateBorder: string;
  dateText: string;
  loadingColor: string;
  emptyText: string;
}

export interface SettingsTheme {
  title: string;
  sectionBg: string;
  sectionBorder: string;
  sectionTitle: string;
  itemText: string;
  itemSubtext: string;
  accent: string;
  chevron: string;
  selectedBg: string;
}

export interface ThemeInfo {
  name: string;
  colors: string[];
  description: string;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export type Tab = 'home' | 'sun' | 'events' | 'settings';

export interface NavItem {
  id: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ============================================================================
// WALKTHROUGH / ONBOARDING TYPES
// ============================================================================

// Identifies which live in-app preview a walkthrough slide renders. Each id maps
// to a component in components/walkthroughPreviews/ that mirrors the real screen.
export type WalkthroughPreviewId =
  | 'welcome'
  | 'compass'
  | 'alarm'
  | 'programs'
  | 'settings';

export interface WalkthroughStep {
  // Kept as a lightweight fallback / semantic hint; the slide art is now driven
  // by `preview` (a live mock-up of the real screen) rather than this icon.
  icon: keyof typeof Ionicons.glyphMap;
  preview: WalkthroughPreviewId;
  title: string;
  body: string;
}

export interface WalkthroughProps {
  visible: boolean;
  theme?: ThemeMode;
  // Called when the user finishes the last step ("Get Started") or taps "Skip".
  onComplete: () => void;
}

// ============================================================================
// LOCATION & COORDINATES TYPES
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sunrise: Date;
  sunset: Date;
  googleMapsUrl: string;
}

export interface TargetLocation {
  latitude: number;
  longitude: number;
  address: string;
  googleMapsUrl: string;
}

// ============================================================================
// SUN CALCULATION TYPES
// ============================================================================

export interface SunCalculationResult {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  nextEvent: Date;
  nextEventType: 'sunrise' | 'sunset';
}

export interface SunEventInfo {
  time: Date;
  type: 'sunrise' | 'sunset';
  isToday: boolean;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface EventData {
  id: string;
  title: string;
  description: string;
  location_name: string;
  event_date: string;
  is_published: boolean;
}

export interface FormattedDate {
  month: string;
  day: number;
  time: string;
}

// ============================================================================
// ALARM & NOTIFICATION TYPES
// ============================================================================

export interface AlarmConfig {
  sunriseEnabled: boolean;
  sunsetEnabled: boolean;
  sunriseOffset: number;
  sunsetOffset: number;
  alarmEnabled: boolean;
  sunriseAlarmEnabled: boolean;
  sunsetAlarmEnabled: boolean;
  notificationsEnabled: boolean;
  sunriseNotificationEnabled: boolean;
  sunsetNotificationEnabled: boolean;
  alarmSound: 'default' | 'custom';
  alarmTimeoutMs: number; // auto-stop the ringing alarm after N ms (0 = never). Default 60000 (1 min)
  snoozeMinutes: number; // snooze duration in minutes. Default 5
  scheduleDaysAhead: number; // Number of days ahead to schedule alarms (default: 1 = today + tomorrow)
}

// ============================================================================
// COMPASS TYPES
// ============================================================================

export interface CompassConfig {
  // Size & Layout
  compassSizeRatio: number;
  centerHubSizeRatio: number;
  
  // Tick Marks
  cardinalTickLength: number;
  semiCardinalTickLength: number;
  minorTickLength: number;
  cardinalTickWidth: number;
  minorTickWidth: number;
  
  // Font Sizes
  cardinalNorthFontSize: number;
  cardinalOtherFontSize: number;
  centerLabelFontSize: number;
  centerValueFontSize: number;
  targetBearingFontSize: number;
  turnInstructionIconSize: number;
  turnInstructionTextSize: number;
  statusTextSize: number;
  locationTextSize: number;
  
  // Spacing & Padding
  turnContainerPaddingH: number;
  turnContainerPaddingV: number;
  turnContainerMarginBottom: number;
  compassMarginBottom: number;
  statusContainerPaddingH: number;
  statusContainerPaddingV: number;
  statusContainerMargin: number;
  statusContainerBottom: number;
  
  // Glow Effects
  glowRingOffset: number;
  glowRingWidth: number;
  
  // Sensor & Animation
  facingThresholdDegrees: number;
  compassRefreshInterval: number;
  smoothingAlpha: number;
  magnetometerSpringDamping: number;
  magnetometerSpringStiffness: number;
  
  // Border Radii
  turnContainerRadius: number;
  statusContainerRadius: number;
}

export interface CardinalDirectionProps {
  dir: string;
  x: number;
  y: number;
  rotation: SharedValue<number>;
  color: string;
  fontSize: number;
  fontWeight: string;
}

export interface TurnInstruction {
  text: string;
  icon: keyof typeof Ionicons.glyphMap | null;
  transform?: Array<{ scaleX?: number; scaleY?: number }>;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  currentTheme?: ThemeMode;
}

export interface CompassViewProps {
  targetHeading?: number | null;
  targetLocation?: (Coordinates & { address?: string }) | null;
  onAlignmentChange?: (aligned: boolean) => void;
  hideStatusWhenAligned?: boolean;
  theme?: ThemeMode;
  config?: Partial<CompassConfig>;
}

export interface DarshanOverlayProps {
  visible: boolean;
  videoPlayer: VideoPlayer;
  audioPlayer: AudioPlayer;
  onClose: () => void;
  audioEnabled?: boolean;
  audioVolume?: number;
}

export interface EventsViewProps {
  style?: object;
  theme?: ThemeMode;
}

export interface SettingsViewProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  audioEnabled?: boolean;
  onAudioToggle?: (enabled: boolean) => void;
  audioVolume?: number;
  onVolumeChange?: (volume: number) => void;
  targetLocation?: TargetLocation | null;
  // Re-launches the first-run walkthrough on demand (Settings → "How to use the app").
  onShowWalkthrough?: () => void;
  style?: object;
}

export interface SunCycleViewProps {
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// ANIMATION TYPES
// ============================================================================

export interface FlowerAnimationRef {
  trigger: () => void;
}

export interface AartiAnimationRef {
  trigger: () => void;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheEntry {
  location: LocationData;
  sunTimes: SunCalculationResult;
  date: string;
  timestamp: number;
}

