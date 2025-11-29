import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomNavProps, NavItem } from '../types';
import { COMPASS_THEME, BOTTOM_NAV_THEMES, NAV_ITEMS } from '../constants';
import { bottomNavStyles } from '../styles/BottomNavStyles';

export const BottomNav: React.FC<BottomNavProps> = ({ 
  currentTab, 
  onTabChange,
  currentTheme = COMPASS_THEME,
}) => {
  const currentNavTheme = BOTTOM_NAV_THEMES[currentTheme];

  return (
    <View style={[bottomNavStyles.container, { backgroundColor: currentNavTheme.background, borderTopColor: currentNavTheme.borderColor }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = currentTab === item.id;
        
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onTabChange(item.id)}
            style={bottomNavStyles.navItem}
            activeOpacity={0.7}
          >
            {/* Active indicator with glow */}
            {isActive && (
              <View style={[
                bottomNavStyles.activeIndicator, 
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
            
            <View style={[bottomNavStyles.iconContainer, { transform: [{ translateY: isActive ? -2 : 0 }] }]}>
              <Ionicons 
                name={item.icon} 
                size={isActive ? 26 : 24} 
                color={isActive ? currentNavTheme.activeIcon : currentNavTheme.inactiveIcon}
              />
            </View>
            
            <Text style={[
              bottomNavStyles.label,
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
