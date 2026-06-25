import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { AlarmConfig, SettingsViewProps, StreakState, ThemeMode } from '../types';
import { getAlarmConfig, saveAlarmConfig, scheduleAlarmsForNext3Days } from '../utils/alarmManager';
import { getStreakState } from '../utils/streakManager';
import {
  TEXT_STREAK_SECTION,
  TEXT_STREAK_CURRENT,
  TEXT_STREAK_LONGEST,
  TEXT_STREAK_SHARE,
  TEXT_STREAK_NONE,
  TEXT_STREAK_DAYS,
  TEXT_STREAK_DAY,
  SETTINGS_THEMES,
  THEME_INFO,
  TEXT_APPEARANCE,
  TEXT_SOUND,
  TEXT_CHOOSE_THEME,
  TEXT_DARSHAN_AUDIO_VOLUME,
  TEXT_ALARM_NOTIFICATION_SETTINGS,
  TEXT_ALARM_SOUND,
  TEXT_ALARM_SOUND_DEFAULT,
  TEXT_ALARM_SOUND_CUSTOM,
  TEXT_SCHEDULE_MODE,
  TEXT_SCHEDULE_MODE_ALARM,
  TEXT_SCHEDULE_MODE_NOTIFICATION,
  TEXT_ALARM_TIMEOUT,
  TEXT_ALARM_TIMEOUT_SUBTITLE,
  TEXT_SNOOZE_DURATION,
  TEXT_SNOOZE_DURATION_SUBTITLE,
  ALARM_TIMEOUT_OPTIONS,
  SNOOZE_DURATION_OPTIONS,
  TEXT_SCHEDULE_DAYS_AHEAD,
  TEXT_SCHEDULE_DAYS_AHEAD_SUBTITLE,
  SCHEDULE_DAYS_AHEAD_OPTIONS,
  APP_NAME,
  APP_VERSION,
} from '../constants';
import { settingsViewStyles } from '../styles/SettingsViewStyles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper function to get the appropriate volume icon based on volume level
const getVolumeIcon = (volume: number): keyof typeof Ionicons.glyphMap => {
  if (volume === 0) return 'volume-mute';
  if (volume < 0.33) return 'volume-low';
  if (volume < 0.67) return 'volume-medium';
  return 'volume-high';
};

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  currentTheme, 
  onThemeChange,
  audioEnabled = true,
  onAudioToggle,
  audioVolume = 1.0,
  onVolumeChange,
  targetLocation,
  onShareStreak,
  style
}) => {
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [isSoundExpanded, setIsSoundExpanded] = useState(false);
  const [isAlarmExpanded, setIsAlarmExpanded] = useState(false);
  const [isStreakExpanded, setIsStreakExpanded] = useState(false);
  const [alarmConfig, setAlarmConfig] = useState<AlarmConfig | null>(null);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const theme = SETTINGS_THEMES[currentTheme];

  // All sections share one expand/collapse animation for a consistent feel.
  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev) => !prev);
  };
  const toggleThemeSection = () => toggleSection(setIsThemeExpanded);
  const toggleSoundSection = () => toggleSection(setIsSoundExpanded);
  const toggleAlarmSection = () => toggleSection(setIsAlarmExpanded);
  const toggleStreakSection = () => toggleSection(setIsStreakExpanded);

  const handleThemeSelect = (selectedTheme: ThemeMode) => {
    onThemeChange(selectedTheme);
    // Optionally collapse after selection
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // setIsThemeExpanded(false);
  };

  useEffect(() => {
    const loadAlarmConfig = async () => {
      const config = await getAlarmConfig();
      setAlarmConfig(config);
    };

    loadAlarmConfig();
  }, []);

  // Load the streak for display each time Settings opens (the tab remounts).
  useEffect(() => {
    getStreakState()
      .then(setStreak)
      .catch(() => setStreak(null));
  }, []);

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const dayWord = (n: number) => (n === 1 ? TEXT_STREAK_DAY : TEXT_STREAK_DAYS);

  const updateAlarmConfig = async (newConfig: Partial<AlarmConfig>) => {
    if (!alarmConfig) return;

    let nextConfig = { ...newConfig };

    if (nextConfig.alarmEnabled === true && !alarmConfig.alarmEnabled) {
      nextConfig = {
        ...nextConfig,
        sunriseAlarmEnabled: true,
        sunsetAlarmEnabled: true,
      };
    }

    if (nextConfig.notificationsEnabled === true && !alarmConfig.notificationsEnabled) {
      nextConfig = {
        ...nextConfig,
        sunriseNotificationEnabled: true,
        sunsetNotificationEnabled: true,
      };
    }

    if (nextConfig.alarmEnabled === true) {
      nextConfig = { ...nextConfig, notificationsEnabled: false };
    }
    if (nextConfig.notificationsEnabled === true) {
      nextConfig = { ...nextConfig, alarmEnabled: false };
    }

    const updatedConfig = { ...alarmConfig, ...nextConfig };
    setAlarmConfig(updatedConfig);
    await saveAlarmConfig(updatedConfig);

    if (targetLocation?.latitude && targetLocation?.longitude) {
      await scheduleAlarmsForNext3Days(targetLocation.latitude, targetLocation.longitude);
    }
  };

  const isAlarmMode = alarmConfig?.alarmEnabled ?? false;
  const isNotificationMode = alarmConfig?.notificationsEnabled ?? true;
  const alarmSound = alarmConfig?.alarmSound ?? 'custom';
  const alarmTimeoutMs = alarmConfig?.alarmTimeoutMs ?? 60000;
  const snoozeMinutes = alarmConfig?.snoozeMinutes ?? 5;
  const scheduleDaysAhead = alarmConfig?.scheduleDaysAhead ?? 1;

  return (
    <View style={[settingsViewStyles.wrapper, style]}>
      <ScrollView 
        style={settingsViewStyles.container} 
        contentContainerStyle={settingsViewStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={[settingsViewStyles.section, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
          <Text style={[settingsViewStyles.sectionHeader, { color: theme.sectionTitle }]}>
            {TEXT_APPEARANCE}
          </Text>

        {/* Theme Selector Row */}
        <TouchableOpacity 
          style={settingsViewStyles.settingRow}
          onPress={toggleThemeSection}
          activeOpacity={0.7}
        >
          <View style={settingsViewStyles.settingLeft}>
            <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
              <Ionicons name="color-palette" size={20} color={theme.accent} />
            </View>
            <View style={settingsViewStyles.settingInfo}>
              <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                {TEXT_CHOOSE_THEME}
              </Text>
              <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                {THEME_INFO[currentTheme].name}
              </Text>
            </View>
          </View>
          <Ionicons 
            name={isThemeExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={theme.chevron} 
          />
        </TouchableOpacity>

        {/* Expanded Theme Options */}
        {isThemeExpanded && (
          <View style={settingsViewStyles.themeOptions}>
            {(Object.keys(THEME_INFO) as ThemeMode[]).map((themeKey) => {
              const info = THEME_INFO[themeKey];
              const isSelected = currentTheme === themeKey;
              
              return (
                <TouchableOpacity
                  key={themeKey}
                  style={[
                    settingsViewStyles.themeOption,
                    { 
                      borderColor: isSelected ? theme.accent : theme.sectionBorder,
                      backgroundColor: isSelected ? theme.selectedBg : 'transparent',
                    },
                  ]}
                  onPress={() => handleThemeSelect(themeKey)}
                  activeOpacity={0.7}
                >
                  {/* Color Preview Circles */}
                  <View style={settingsViewStyles.colorPreview}>
                    {info.colors.map((color, idx) => (
                      <View
                        key={idx}
                        style={[
                          settingsViewStyles.colorCircle,
                          { 
                            backgroundColor: color,
                            marginLeft: idx > 0 ? -10 : 0,
                            zIndex: 3 - idx,
                          },
                        ]}
                      />
                    ))}
                  </View>

                  {/* Theme Name & Description */}
                  <View style={settingsViewStyles.themeInfo}>
                    <Text style={[
                      settingsViewStyles.themeName, 
                      { color: isSelected ? theme.accent : theme.itemText }
                    ]}>
                      {info.name}
                    </Text>
                    <Text style={[settingsViewStyles.themeDescription, { color: theme.itemSubtext }]}>
                      {info.description}
                    </Text>
                  </View>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={theme.accent} 
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Sound Section */}
      <View style={[settingsViewStyles.section, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
        <Text style={[settingsViewStyles.sectionHeader, { color: theme.sectionTitle }]}>
          {TEXT_SOUND}
        </Text>

        {/* Darshan Audio Volume Row */}
        <TouchableOpacity 
          style={settingsViewStyles.settingRow}
          onPress={toggleSoundSection}
          activeOpacity={0.7}
        >
          <View style={settingsViewStyles.settingLeft}>
            <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
              <Ionicons 
                name={getVolumeIcon(audioVolume)} 
                size={24} 
                color={theme.accent} 
              />
            </View>
            <View style={settingsViewStyles.settingInfo}>
              <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                {TEXT_DARSHAN_AUDIO_VOLUME}
              </Text>
              <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                {Math.round(audioVolume * 100)}%
              </Text>
            </View>
          </View>
          <Ionicons 
            name={isSoundExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={theme.chevron} 
          />
        </TouchableOpacity>

        {/* Expanded Volume Slider */}
        {isSoundExpanded && (
          <View style={settingsViewStyles.sliderContainer}>
            <Slider
              style={settingsViewStyles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={audioVolume}
              onValueChange={(value) => {
                if (onVolumeChange) {
                  onVolumeChange(value);
                }
              }}
              minimumTrackTintColor={theme.accent}
              maximumTrackTintColor={theme.sectionBorder}
              thumbTintColor={theme.accent}
            />
          </View>
        )}
        </View>

        {/* Alarm & Notification Settings */}
        <View style={[settingsViewStyles.section, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
          <Text style={[settingsViewStyles.sectionHeader, { color: theme.sectionTitle }]}>
            {TEXT_ALARM_NOTIFICATION_SETTINGS}
          </Text>

          {!alarmConfig ? (
            <View style={settingsViewStyles.loadingRow}>
              <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                Loading alarm settings...
              </Text>
            </View>
          ) : (
            <>
              {/* Schedule Mode — tapping expands the full alarm controls. */}
              <TouchableOpacity
                style={settingsViewStyles.settingRow}
                onPress={toggleAlarmSection}
                activeOpacity={0.7}
              >
                <View style={settingsViewStyles.settingLeft}>
                  <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                    <Ionicons name="alarm" size={22} color={theme.accent} />
                  </View>
                  <View style={settingsViewStyles.settingInfo}>
                    <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                      {TEXT_SCHEDULE_MODE}
                    </Text>
                    <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                      {isAlarmMode ? TEXT_SCHEDULE_MODE_ALARM : TEXT_SCHEDULE_MODE_NOTIFICATION}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isAlarmExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.chevron}
                />
              </TouchableOpacity>
              {isAlarmExpanded && (
              <>
              <View style={settingsViewStyles.optionRow}>
                <TouchableOpacity
                  style={[
                    settingsViewStyles.optionButton,
                    { borderColor: isAlarmMode ? theme.accent : theme.sectionBorder, marginRight: 10 },
                    isAlarmMode && { backgroundColor: theme.selectedBg },
                  ]}
                  onPress={() => updateAlarmConfig({ alarmEnabled: true })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    settingsViewStyles.optionButtonText,
                    { color: isAlarmMode ? theme.accent : theme.itemText }
                  ]}>
                    {TEXT_SCHEDULE_MODE_ALARM}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    settingsViewStyles.optionButton,
                    { borderColor: isNotificationMode ? theme.accent : theme.sectionBorder },
                    isNotificationMode && { backgroundColor: theme.selectedBg },
                  ]}
                  onPress={() => updateAlarmConfig({ notificationsEnabled: true })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    settingsViewStyles.optionButtonText,
                    { color: isNotificationMode ? theme.accent : theme.itemText }
                  ]}>
                    {TEXT_SCHEDULE_MODE_NOTIFICATION}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Alarm Sound */}
              <View style={settingsViewStyles.settingRow}>
                <View style={settingsViewStyles.settingLeft}>
                  <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                    <Ionicons name="musical-notes" size={22} color={theme.accent} />
                  </View>
                  <View style={settingsViewStyles.settingInfo}>
                    <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                      {TEXT_ALARM_SOUND}
                    </Text>
                    <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                      {alarmSound === 'custom' ? TEXT_ALARM_SOUND_CUSTOM : TEXT_ALARM_SOUND_DEFAULT}
                    </Text>
                  </View>
                </View>
              </View>
              {/* Full-width stacked rows: the custom sound name is long and
                  wrapped/looked cramped in the half-width side-by-side chips. */}
              <View style={settingsViewStyles.soundOptionList}>
                {([
                  { value: 'default' as const, label: TEXT_ALARM_SOUND_DEFAULT },
                  { value: 'custom' as const, label: TEXT_ALARM_SOUND_CUSTOM },
                ]).map((opt) => {
                  const selected = alarmSound === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        settingsViewStyles.soundOption,
                        { borderColor: selected ? theme.accent : theme.sectionBorder },
                        selected && { backgroundColor: theme.selectedBg },
                      ]}
                      onPress={() => updateAlarmConfig({ alarmSound: opt.value })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          settingsViewStyles.soundOptionText,
                          { color: selected ? theme.accent : theme.itemText },
                        ]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Alarm Timeout */}
              <View style={settingsViewStyles.settingRow}>
                <View style={settingsViewStyles.settingLeft}>
                  <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                    <Ionicons name="timer-outline" size={22} color={theme.accent} />
                  </View>
                  <View style={settingsViewStyles.settingInfo}>
                    <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                      {TEXT_ALARM_TIMEOUT}
                    </Text>
                    <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                      {TEXT_ALARM_TIMEOUT_SUBTITLE}{' '}
                      {ALARM_TIMEOUT_OPTIONS.find((o) => o.value === alarmTimeoutMs)?.label ?? '1 min'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={settingsViewStyles.optionRowWrap}>
                {ALARM_TIMEOUT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      settingsViewStyles.optionChip,
                      { borderColor: alarmTimeoutMs === opt.value ? theme.accent : theme.sectionBorder },
                      alarmTimeoutMs === opt.value && { backgroundColor: theme.selectedBg },
                    ]}
                    onPress={() => updateAlarmConfig({ alarmTimeoutMs: opt.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      settingsViewStyles.optionButtonText,
                      { color: alarmTimeoutMs === opt.value ? theme.accent : theme.itemText }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Snooze Duration */}
              <View style={settingsViewStyles.settingRow}>
                <View style={settingsViewStyles.settingLeft}>
                  <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                    <Ionicons name="alarm-outline" size={22} color={theme.accent} />
                  </View>
                  <View style={settingsViewStyles.settingInfo}>
                    <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                      {TEXT_SNOOZE_DURATION}
                    </Text>
                    <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                      {TEXT_SNOOZE_DURATION_SUBTITLE}{' '}
                      {SNOOZE_DURATION_OPTIONS.find((o) => o.value === snoozeMinutes)?.label ?? '5 min'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={settingsViewStyles.optionRowWrap}>
                {SNOOZE_DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      settingsViewStyles.optionChip,
                      { borderColor: snoozeMinutes === opt.value ? theme.accent : theme.sectionBorder },
                      snoozeMinutes === opt.value && { backgroundColor: theme.selectedBg },
                    ]}
                    onPress={() => updateAlarmConfig({ snoozeMinutes: opt.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      settingsViewStyles.optionButtonText,
                      { color: snoozeMinutes === opt.value ? theme.accent : theme.itemText }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Schedule Ahead — how many days of alarms to pre-schedule.
                  Refreshed on every app open, so a small range is enough. */}
              <View style={settingsViewStyles.settingRow}>
                <View style={settingsViewStyles.settingLeft}>
                  <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                    <Ionicons name="calendar-outline" size={22} color={theme.accent} />
                  </View>
                  <View style={settingsViewStyles.settingInfo}>
                    <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                      {TEXT_SCHEDULE_DAYS_AHEAD}
                    </Text>
                    <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                      {TEXT_SCHEDULE_DAYS_AHEAD_SUBTITLE}{' '}
                      {SCHEDULE_DAYS_AHEAD_OPTIONS.find((o) => o.value === scheduleDaysAhead)?.label ?? '1 day'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={settingsViewStyles.optionRowWrap}>
                {SCHEDULE_DAYS_AHEAD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      settingsViewStyles.optionChip,
                      { borderColor: scheduleDaysAhead === opt.value ? theme.accent : theme.sectionBorder },
                      scheduleDaysAhead === opt.value && { backgroundColor: theme.selectedBg },
                    ]}
                    onPress={() => updateAlarmConfig({ scheduleDaysAhead: opt.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      settingsViewStyles.optionButtonText,
                      { color: scheduleDaysAhead === opt.value ? theme.accent : theme.itemText }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              </>
              )}
            </>
          )}
        </View>

        {/* Your Streak Section (collapsible; kept last for consistency) */}
        <View style={[settingsViewStyles.section, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
          <Text style={[settingsViewStyles.sectionHeader, { color: theme.sectionTitle }]}>
            {TEXT_STREAK_SECTION}
          </Text>

          {/* Current streak — tap to expand longest + share. */}
          <TouchableOpacity
            testID="settings-streak-toggle"
            style={settingsViewStyles.settingRow}
            onPress={toggleStreakSection}
            activeOpacity={0.7}
          >
            <View style={settingsViewStyles.settingLeft}>
              <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                <Ionicons name="flame" size={22} color={theme.accent} />
              </View>
              <View style={settingsViewStyles.settingInfo}>
                <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                  {TEXT_STREAK_CURRENT}
                </Text>
                <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                  {currentStreak > 0
                    ? `${currentStreak} ${dayWord(currentStreak)}`
                    : TEXT_STREAK_NONE}
                </Text>
              </View>
            </View>
            <Ionicons
              name={isStreakExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.chevron}
            />
          </TouchableOpacity>

          {isStreakExpanded && (
            <>
              {/* Longest streak */}
              <View style={settingsViewStyles.settingRow}>
                <View style={settingsViewStyles.settingLeft}>
                  <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                    <Ionicons name="trophy" size={20} color={theme.accent} />
                  </View>
                  <View style={settingsViewStyles.settingInfo}>
                    <Text style={[settingsViewStyles.settingTitle, { color: theme.itemText }]}>
                      {TEXT_STREAK_LONGEST}
                    </Text>
                    <Text style={[settingsViewStyles.settingSubtitle, { color: theme.itemSubtext }]}>
                      {`${longestStreak} ${dayWord(longestStreak)}`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Share my streak */}
              <TouchableOpacity
                testID="settings-share-streak"
                style={settingsViewStyles.settingRow}
                onPress={onShareStreak}
                activeOpacity={0.7}
                disabled={!onShareStreak || currentStreak <= 0}
              >
                <View style={settingsViewStyles.settingLeft}>
                  <View style={[settingsViewStyles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                    <Ionicons name="share-social" size={20} color={theme.accent} />
                  </View>
                  <View style={settingsViewStyles.settingInfo}>
                    <Text
                      style={[
                        settingsViewStyles.settingTitle,
                        { color: currentStreak > 0 ? theme.accent : theme.itemSubtext },
                      ]}
                    >
                      {TEXT_STREAK_SHARE}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.chevron} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Version Info - Fixed at bottom */}
      <View style={settingsViewStyles.versionContainer}>
        <Text style={[settingsViewStyles.versionText, { color: theme.itemSubtext }]}>
          {APP_NAME} v{APP_VERSION}
        </Text>
      </View>
    </View>
  );
};

export default SettingsView;

