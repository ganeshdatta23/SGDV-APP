import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { bottomNavStyles as styles } from '../src/styles/BottomNavStyles';
import { Ionicons } from '@expo/vector-icons';

import { COMPASS_THEME } from '../src/constants/theme';
import { Tab, ThemeMode } from '../src/types';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  currentTheme?: ThemeMode;
}

// Theme colors synced with CompassView
const NAV_THEMES: Record<ThemeMode, {
  background: string;
  borderColor: string;
  activeText: string;
  activeIcon: string;
  inactiveText: string;
  inactiveIcon: string;
  activeGlow: string;
}> = {
  light: {
    background: '#C74A1A', // Solid darker orange
    borderColor: '#FF8C5A',
    activeText: '#FFFFFF',
    activeIcon: '#FFFFFF',
    inactiveText: 'rgba(255, 255, 255, 0.6)',
    inactiveIcon: 'rgba(255, 255, 255, 0.6)',
    activeGlow: '#FFD700', // Gold glow
  },
  dark: {
    background: '#0c0a09', // Solid black
    borderColor: '#57534e',
    activeText: '#FCD34D',
    activeIcon: '#FCD34D',
    inactiveText: '#78716c',
    inactiveIcon: '#78716c',
    activeGlow: '#FCD34D', // Gold glow
  },
  cosmic: {
    background: '#1a0508', // Very dark rose/black (from rose-950 darkened)
    borderColor: 'rgba(251, 191, 36, 0.4)', // Amber-400 border
    activeText: '#fbbf24', // Amber-400
    activeIcon: '#fbbf24', // Amber-400
    inactiveText: 'rgba(254, 243, 199, 0.5)', // Amber-100 faded
    inactiveIcon: 'rgba(254, 243, 199, 0.5)', // Amber-100 faded
    activeGlow: '#fbbf24', // Amber glow
  },
};

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  currentTheme = COMPASS_THEME,
}) => {
  const currentNavTheme = NAV_THEMES[currentTheme];

  const navItems: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Darshan', icon: 'compass' },
    { id: 'sun', label: 'Alarm', icon: 'alarm' },
    { id: 'events', label: 'Programs', icon: 'calendar' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: currentNavTheme.background, borderTopColor: currentNavTheme.borderColor }]}>
      {navItems.map((item) => {
        const isActive = currentTab === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onTabChange(item.id)}
            style={styles.navItem}
            activeOpacity={0.7}
          >
            {/* Active indicator with glow */}
            {isActive && (
              <View style={[
                styles.activeIndicator,
                {
                  backgroundColor: currentNavTheme.activeGlow,
                  shadowColor: currentNavTheme.activeGlow,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  elevation: 10,
                }
              ]} />
            )}

            <View style={[styles.iconContainer, { transform: [{ translateY: isActive ? -2 : 0 }] }]}>
              <Ionicons
                name={item.icon}
                size={isActive ? 26 : 24}
                color={isActive ? currentNavTheme.activeIcon : currentNavTheme.inactiveIcon}
              />
            </View>

            <Text style={[
              styles.label,
              { color: isActive ? currentNavTheme.activeText : currentNavTheme.inactiveText }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomNav;
