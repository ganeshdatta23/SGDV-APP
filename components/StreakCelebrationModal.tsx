import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FlowerAnimation } from './FlowerAnimation';
import { FlowerAnimationRef, StreakCelebrationModalProps } from '../types';
import {
  APP_BACKGROUNDS,
  COMPASS_THEME,
  STREAK_MILESTONE_LABELS,
  TEXT_STREAK_SHARE,
  TEXT_STREAK_CONTINUE,
} from '../constants';
import { streakStyles as s } from '../styles/StreakStyles';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Celebratory modal shown once when the user hits a milestone (1/3/7). Reuses
 * the FlowerAnimation shower + a success haptic, and offers Share / Continue.
 * "Share" reports back via onShare (which also marks the milestone shared);
 * "Continue" leaves the milestone un-shared so the contextual pill can offer it
 * later. Once-per-milestone is enforced by the data layer (milestonesCelebrated).
 */
const StreakCelebrationModal: React.FC<StreakCelebrationModalProps> = ({
  visible,
  milestone,
  currentStreak,
  theme = COMPASS_THEME,
  onShare,
  onClose,
}) => {
  const bg = APP_BACKGROUNDS[theme];
  const flowerRef = useRef<FlowerAnimationRef>(null);

  useEffect(() => {
    if (visible) {
      // Fire the flower shower + a celebratory haptic on appear.
      const t = setTimeout(() => flowerRef.current?.trigger(), 150);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return () => clearTimeout(t);
    }
  }, [visible]);

  const label =
    (milestone != null && STREAK_MILESTONE_LABELS[milestone]) || `${currentStreak}-Day Streak`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay} testID="streak-celebration-overlay">
        {/* Flower shower above the dim backdrop. */}
        <FlowerAnimation ref={flowerRef} startX={SCREEN_W / 2} startY={80} groundY={SCREEN_H * 0.7} />

        <View
          style={[s.modalCard, { backgroundColor: bg.modalBg, borderColor: bg.modalBorder }]}
        >
          <LinearGradient
            colors={bg.gradientColors as any}
            style={[s.modalIconBadge, { borderColor: bg.modalBorder }]}
          >
            <Ionicons name="flame" size={48} color={bg.modalTitle} />
          </LinearGradient>

          <Text style={[s.modalCount, { color: bg.modalTitle }]}>{currentStreak}</Text>
          <Text style={[s.modalTitle, { color: bg.headerTextColor }]}>{label}</Text>
          <Text style={[s.modalSubtitle, { color: bg.modalText }]}>
            You offered your sunrise darshan. Keep the streak alive — share the moment!
          </Text>

          <View style={s.modalButtonRow}>
            <TouchableOpacity
              testID="streak-celebration-share"
              accessibilityRole="button"
              accessibilityLabel={TEXT_STREAK_SHARE}
              style={[s.modalShareBtn, { backgroundColor: bg.modalTitle }]}
              onPress={onShare}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social" size={18} color="#1a1208" />
              <Text style={s.modalShareText}>{TEXT_STREAK_SHARE}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="streak-celebration-close"
              accessibilityRole="button"
              accessibilityLabel={TEXT_STREAK_CONTINUE}
              style={[s.modalContinueBtn, { borderColor: bg.buttonBorder }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={[s.modalContinueText, { color: bg.subtitleColor }]}>
                {TEXT_STREAK_CONTINUE}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default StreakCelebrationModal;
