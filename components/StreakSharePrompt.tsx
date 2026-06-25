import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StreakSharePromptProps } from '../types';
import { APP_BACKGROUNDS, COMPASS_THEME } from '../constants';
import { streakStyles as s } from '../styles/StreakStyles';

/**
 * Small, non-intrusive pill shown on the Darshan screen when the user has
 * reached a milestone they haven't shared or dismissed yet (see
 * getPendingSharePrompt). It is the "if you didn't share, the option stays"
 * affordance — tapping shares, the ✕ dismisses it for that milestone. Renders
 * nothing when there's no pending milestone.
 */
const StreakSharePrompt: React.FC<StreakSharePromptProps> = ({
  milestone,
  theme = COMPASS_THEME,
  onShare,
  onDismiss,
}) => {
  if (milestone == null) return null;

  const bg = APP_BACKGROUNDS[theme];

  return (
    <View
      testID="streak-share-pill"
      style={[s.pill, { backgroundColor: bg.buttonBg, borderColor: bg.buttonBorder }]}
    >
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center' }}
        accessibilityRole="button"
        accessibilityLabel={`Share your ${milestone}-day streak`}
        onPress={onShare}
        activeOpacity={0.8}
      >
        <Ionicons name="flame" size={16} color={bg.modalTitle} />
        <Text style={[s.pillText, { color: bg.headerTextColor }]}>
          {`Share your ${milestone}-day streak`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="streak-share-pill-dismiss"
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={s.pillDismiss}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={16} color={bg.subtitleColor} />
      </TouchableOpacity>
    </View>
  );
};

export default StreakSharePrompt;
