import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { AlarmConfig, SettingsViewProps, ThemeMode } from '../types';
import { getAlarmConfig, saveAlarmConfig, scheduleAlarmsForNext3Days } from '../utils/alarmManager';
import {
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
  style 
}) => {
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [isSoundExpanded, setIsSoundExpanded] = useState(false);
  const [alarmConfig, setAlarmConfig] = useState<AlarmConfig | null>(null);
  const theme = SETTINGS_THEMES[currentTheme];

  const toggleThemeSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsThemeExpanded(!isThemeExpanded);
  };

  const toggleSoundSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSoundExpanded(!isSoundExpanded);
  };

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
              {/* Schedule Mode */}
              <View style={settingsViewStyles.settingRow}>
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
              </View>
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
              <View style={settingsViewStyles.optionRow}>
                <TouchableOpacity
                  style={[
                    settingsViewStyles.optionButton,
                    { borderColor: alarmSound === 'default' ? theme.accent : theme.sectionBorder, marginRight: 10 },
                    alarmSound === 'default' && { backgroundColor: theme.selectedBg },
                  ]}
                  onPress={() => updateAlarmConfig({ alarmSound: 'default' })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    settingsViewStyles.optionButtonText,
                    { color: alarmSound === 'default' ? theme.accent : theme.itemText }
                  ]}>
                    {TEXT_ALARM_SOUND_DEFAULT}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    settingsViewStyles.optionButton,
                    { borderColor: alarmSound === 'custom' ? theme.accent : theme.sectionBorder },
                    alarmSound === 'custom' && { backgroundColor: theme.selectedBg },
                  ]}
                  onPress={() => updateAlarmConfig({ alarmSound: 'custom' })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    settingsViewStyles.optionButtonText,
                    { color: alarmSound === 'custom' ? theme.accent : theme.itemText }
                  ]}>
                    {TEXT_ALARM_SOUND_CUSTOM}
                  </Text>
                </TouchableOpacity>
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

