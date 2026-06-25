import React, { forwardRef } from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StreakShareCardProps } from '../types';
import {
  STREAK_CARD_BG,
  STREAK_CARD_GOLD,
  STREAK_CARD_CREAM,
  TEXT_GURU_DIGVANDANAM,
} from '../constants';
import { streakStyles as s } from '../styles/StreakStyles';

/**
 * Branded, square streak card rendered for sharing. Captured to a PNG by
 * react-native-view-shot (see utils/shareStreak.ts), so it forwards its ref to
 * the root View and keeps `collapsable={false}` — Android flattens plain views
 * and would otherwise snapshot a blank image. Uses the fixed cosmic temple
 * palette regardless of the in-app theme for consistent shareable branding.
 */
const StreakShareCard = forwardRef<View, StreakShareCardProps>(
  ({ currentStreak }, ref) => {
    const dateStr = new Date().toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <View ref={ref} collapsable={false} style={s.card}>
        <LinearGradient
          colors={STREAK_CARD_BG as any}
          locations={[0, 0.45, 1] as any}
          style={s.cardInner}
        >
          <Text style={[s.cardAppName, { color: STREAK_CARD_GOLD }]}>
            {TEXT_GURU_DIGVANDANAM}
          </Text>

          <View style={[s.cardPhotoFrame, { borderColor: STREAK_CARD_GOLD }]}>
            <Image
              source={require('../assets/images/swamiji-darshan.png')}
              style={s.cardPhoto}
              resizeMode="cover"
            />
          </View>

          <View style={s.cardCountRow}>
            <Ionicons name="flame" size={48} color={STREAK_CARD_GOLD} />
            <Text style={[s.cardCount, { color: STREAK_CARD_GOLD }]}>{currentStreak}</Text>
          </View>

          <Text style={[s.cardStreakLabel, { color: STREAK_CARD_CREAM }]}>
            {`${currentStreak}-DAY SUNRISE STREAK`}
          </Text>

          <View style={[s.cardDivider, { backgroundColor: STREAK_CARD_GOLD }]} />

          <Text style={[s.cardDate, { color: STREAK_CARD_CREAM }]}>{dateStr}</Text>
        </LinearGradient>
      </View>
    );
  },
);

StreakShareCard.displayName = 'StreakShareCard';

export default StreakShareCard;
