import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { fetchEvents, EventData } from '../utils/sgvdApi';
import { COMPASS_THEME, EVENTS_THEMES } from '../src/constants/theme';
import { eventsViewStyles as styles } from '../src/styles/EventsViewStyles';

const currentEventsTheme = EVENTS_THEMES[COMPASS_THEME];

interface EventsViewProps {
  style?: object;
}

export const EventsView: React.FC<EventsViewProps> = ({ style }) => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate(),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={[styles.card, { backgroundColor: currentEventsTheme.cardBg, borderColor: currentEventsTheme.cardBorder }]}>
            <ActivityIndicator size="large" color={currentEventsTheme.loadingColor} />
            <Text style={[styles.loadingText, { color: currentEventsTheme.eventSubtext }]}>Loading events...</Text>
          </View>
        ) : events.length > 0 ? (
          events.map((event) => {
            const { month, day, time } = formatDate(event.event_date);
            return (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  { backgroundColor: currentEventsTheme.cardBg, borderColor: currentEventsTheme.cardBorder }
                ]}
              >
                {/* Date badge */}
                <View style={[styles.dateBadge, { backgroundColor: currentEventsTheme.dateBg, borderColor: currentEventsTheme.dateBorder }]}>
                  <Text style={[styles.dateMonth, { color: currentEventsTheme.dateText }]}>{month}</Text>
                  <Text style={[styles.dateDay, { color: currentEventsTheme.dateText }]}>{day}</Text>
                </View>

                {/* Event details */}
                <View style={styles.eventDetails}>
                  <Text style={[styles.eventTitle, { color: currentEventsTheme.eventTitle }]} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventSubtext, { color: currentEventsTheme.eventSubtext }]}>
                    {event.location_name || 'Location TBA'} • {time}
                  </Text>
                  {event.description && (
                    <Text style={[styles.eventDescription, { color: currentEventsTheme.eventSubtext }]} numberOfLines={2}>
                      {event.description}
                    </Text>
                  )}
                </View>

                {/* Chevron */}
                <Text style={[styles.chevron, { color: currentEventsTheme.eventSubtext }]}>›</Text>
              </View>
            );
          })
        ) : (
          <View style={[styles.card, { backgroundColor: currentEventsTheme.cardBg, borderColor: currentEventsTheme.cardBorder }]}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyText, { color: currentEventsTheme.emptyText }]}>No upcoming events</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default EventsView;

