import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { SettingsViewProps, ThemeMode } from '../types';
import {
  SETTINGS_THEMES,
  THEME_INFO,
  TEXT_APPEARANCE,
  TEXT_SOUND,
  TEXT_CHOOSE_THEME,
  TEXT_DARSHAN_AUDIO_VOLUME,
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

