import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode } from './CompassView';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Theme display names and preview colors
export const THEME_INFO: Record<ThemeMode, { 
  name: string; 
  colors: string[]; 
  description: string;
}> = {
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

// Theme colors for settings view
const SETTINGS_THEMES: Record<ThemeMode, {
  title: string;
  sectionBg: string;
  sectionBorder: string;
  sectionTitle: string;
  itemText: string;
  itemSubtext: string;
  accent: string;
  chevron: string;
  selectedBg: string;
}> = {
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

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 10,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  settingSubtitle: {
    fontSize: 13,
    flexWrap: 'wrap',
  },
  themeOptions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  colorPreview: {
    flexDirection: 'row',
    marginRight: 14,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  themeInfo: {
    flex: 1,
    paddingRight: 8,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  themeDescription: {
    fontSize: 13,
    flexWrap: 'wrap',
  },
  sliderContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 60, // Space for bottom nav
  },
  versionText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export default SettingsView;

