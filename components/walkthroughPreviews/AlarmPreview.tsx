import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode } from '../../types';
import {
  SUN_SUNRISE_ICON_COLOR,
  SUN_SUNSET_ICON_COLOR,
  TEXT_NEXT_SUNRISE,
  TEXT_SUNRISE,
  TEXT_SUNSET,
} from '../../constants';

/**
 * Mirrors SunCycleView: the next-event countdown, the sunrise/sunset time cards
 * (same sunny/moon icons + colors), and one Alarm toggle row. SunCycleView uses
 * a hardcoded white/SUN_* palette (not per-theme), so this preview looks the
 * same across themes by design — it sits on the Modal's themed gradient.
 */
const AlarmPreview: React.FC<{ theme: ThemeMode }> = () => {
  return (
    <View style={styles.wrap}>
      <Text style={styles.countLabel}>{TEXT_NEXT_SUNRISE}</Text>
      <Text style={styles.countTime}>5:42 AM</Text>

      <View style={styles.cards}>
        <View style={styles.card}>
          <Ionicons name="sunny" size={28} color={SUN_SUNRISE_ICON_COLOR} />
          <Text style={styles.cardLabel}>{TEXT_SUNRISE}</Text>
          <Text style={styles.cardTime}>6:12 AM</Text>
        </View>
        <View style={styles.card}>
          <Ionicons name="moon" size={28} color={SUN_SUNSET_ICON_COLOR} />
          <Text style={styles.cardLabel}>{TEXT_SUNSET}</Text>
          <Text style={styles.cardTime}>6:48 PM</Text>
        </View>
      </View>

      <View style={styles.control}>
        <View style={styles.controlLeft}>
          <Ionicons name="alarm" size={22} color={SUN_SUNSET_ICON_COLOR} />
          <Text style={styles.controlText}>Alarm</Text>
        </View>
        <Switch
          value
          disabled
          trackColor={{ true: SUN_SUNSET_ICON_COLOR, false: '#767577' }}
          thumbColor="#ffffff"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 286,
    alignItems: 'center',
  },
  countLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  countTime: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 16,
  },
  cards: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 112,
    marginHorizontal: 6,
  },
  cardLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 6,
  },
  cardTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  control: {
    width: '100%',
    marginTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default AlarmPreview;
