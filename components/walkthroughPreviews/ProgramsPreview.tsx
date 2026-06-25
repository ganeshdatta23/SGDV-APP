import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeMode } from '../../types';
import { EVENTS_THEMES } from '../../constants';

/**
 * Mirrors EventsView's event card (date chip + title + place + chevron), themed
 * via the real EVENTS_THEMES palette. Two sample cards so it reads as a list.
 */
const SAMPLE_EVENTS = [
  { month: 'JUN', day: '26', title: 'Guru Purnima', sub: 'Ashrama • 6:30 AM' },
  { month: 'JUL', day: '12', title: 'Datta Jayanti', sub: 'Main Temple • 5:00 PM' },
];

const ProgramsPreview: React.FC<{ theme: ThemeMode }> = ({ theme }) => {
  const e = EVENTS_THEMES[theme];
  return (
    <View style={styles.wrap}>
      {SAMPLE_EVENTS.map((ev) => (
        <View
          key={ev.title}
          style={[styles.card, { backgroundColor: e.cardBg, borderColor: e.cardBorder }]}
        >
          <View style={[styles.date, { backgroundColor: e.dateBg, borderColor: e.dateBorder }]}>
            <Text style={[styles.month, { color: e.dateText }]}>{ev.month}</Text>
            <Text style={[styles.day, { color: e.dateText }]}>{ev.day}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: e.eventTitle }]} numberOfLines={1}>
              {ev.title}
            </Text>
            <Text style={[styles.sub, { color: e.eventSubtext }]} numberOfLines={1}>
              {ev.sub}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: e.eventSubtext }]}>›</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 290,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  date: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  day: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    marginTop: 3,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
  },
});

export default ProgramsPreview;
