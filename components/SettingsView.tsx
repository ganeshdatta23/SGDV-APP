
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode } from '../src/types';
import { THEME_INFO, SETTINGS_THEMES } from '../src/constants/theme';
import { settingsViewStyles as styles } from '../src/styles/SettingsViewStyles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SettingsViewProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  audioEnabled?: boolean;
  onAudioToggle?: (enabled: boolean) => void;
  audioVolume?: number;
  onVolumeChange?: (volume: number) => void;
  style?: object;
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
  audioVolume = 0.7,
  onVolumeChange,
  style
}) => {
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [isSoundExpanded, setIsSoundExpanded] = useState(false);
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

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
          <Text style={[styles.sectionHeader, { color: theme.sectionTitle }]}>
            APPEARANCE
          </Text>

          {/* Theme Selector Row */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={toggleThemeSection}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                <Ionicons name="color-palette" size={20} color={theme.accent} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.itemText }]}>
                  Choose Theme
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.itemSubtext }]}>
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
            <View style={styles.themeOptions}>
              {(Object.keys(THEME_INFO) as ThemeMode[]).map((themeKey) => {
                const info = THEME_INFO[themeKey];
                const isSelected = currentTheme === themeKey;

                return (
                  <TouchableOpacity
                    key={themeKey}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: isSelected ? theme.accent : theme.sectionBorder,
                        backgroundColor: isSelected ? theme.selectedBg : 'transparent',
                      },
                    ]}
                    onPress={() => handleThemeSelect(themeKey)}
                    activeOpacity={0.7}
                  >
                    {/* Color Preview Circles */}
                    <View style={styles.colorPreview}>
                      {info.colors.map((color, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.colorCircle,
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
                    <View style={styles.themeInfo}>
                      <Text style={[
                        styles.themeName,
                        { color: isSelected ? theme.accent : theme.itemText }
                      ]}>
                        {info.name}
                      </Text>
                      <Text style={[styles.themeDescription, { color: theme.itemSubtext }]}>
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
        <View style={[styles.section, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
          <Text style={[styles.sectionHeader, { color: theme.sectionTitle }]}>
            SOUND
          </Text>

          {/* Darshan Audio Volume Row */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={toggleSoundSection}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                <Ionicons
                  name={getVolumeIcon(audioVolume)}
                  size={24}
                  color={theme.accent}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.itemText }]}>
                  Darshan Audio Volume
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.itemSubtext }]}>
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
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
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
      </ScrollView>

      {/* Version Info - Fixed at bottom */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: theme.itemSubtext }]}>
          Guru Digvandanam v1.0.0
        </Text>
      </View>
    </View>
  );
};

export default SettingsView;

