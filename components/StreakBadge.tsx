import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StreakBadgeProps } from '../types';
import { APP_BACKGROUNDS, COMPASS_THEME } from '../constants';
import { streakStyles as s } from '../styles/StreakStyles';

/**
 * Small flame + count pill shown on the Darshan/home screen. Tapping it lets
 * the user share their current streak any time. Renders nothing until the user
 * has a streak going.
 */
const StreakBadge: React.FC<StreakBadgeProps> = ({ count, theme = COMPASS_THEME, onPress }) => {
  if (!count || count <= 0) return null;

  const bg = APP_BACKGROUNDS[theme];

  return (
    <TouchableOpacity
      testID="streak-badge"
      accessibilityRole="button"
      accessibilityLabel={`Current streak ${count} days. Tap to share.`}
      style={[s.badge, { backgroundColor: bg.buttonBg, borderColor: bg.buttonBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <Ionicons name="flame" size={16} color={bg.modalTitle} />
      <Text style={[s.badgeText, { color: bg.modalTitle }]}>{count}</Text>
    </TouchableOpacity>
  );
};

export default StreakBadge;
