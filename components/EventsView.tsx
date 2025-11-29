import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fetchEvents, EventData } from '../utils/sgvdApi';
import { ThemeMode } from './CompassView';

// Theme colors synced with CompassView
const EVENTS_THEMES = {
  light: {
    title: '#FFFFFF',
    cardBg: 'rgba(255, 255, 255, 0.15)',
    cardBorder: 'rgba(255, 255, 255, 0.3)',
    eventTitle: '#FFFFFF',
    eventSubtext: 'rgba(255, 255, 255, 0.7)',
    dateBg: 'rgba(0, 0, 0, 0.3)',
    dateBorder: 'rgba(255, 255, 255, 0.2)',
    dateText: '#FFFFFF',
    loadingColor: '#FFFFFF',
    emptyText: 'rgba(255, 255, 255, 0.6)',
  },
  dark: {
    title: '#e7e5e4',
    cardBg: 'rgba(28, 25, 23, 0.6)',
    cardBorder: '#44403c',
    eventTitle: '#e7e5e4',
    eventSubtext: '#a8a29e',
    dateBg: '#1c1917',
    dateBorder: '#44403c',
    dateText: '#FCD34D',
    loadingColor: '#FCD34D',
    emptyText: '#78716c',
  },
  cosmic: {
    title: '#FFFFFF',
    cardBg: 'rgba(76, 5, 25, 0.5)', // Rose-950 with opacity
    cardBorder: 'rgba(251, 191, 36, 0.3)', // Amber-400 border
    eventTitle: '#fef3c7', // Amber-100
    eventSubtext: 'rgba(254, 243, 199, 0.7)', // Amber-100 faded
    dateBg: 'rgba(2, 6, 23, 0.8)', // Slate-950
    dateBorder: 'rgba(251, 191, 36, 0.4)', // Amber-400 border
    dateText: '#fbbf24', // Amber-400
    loadingColor: '#fbbf24', // Amber-400
    emptyText: 'rgba(254, 243, 199, 0.5)', // Amber-100 faded
  },
};

interface EventsViewProps {
  style?: object;
  theme?: ThemeMode;
}

export const EventsView: React.FC<EventsViewProps> = ({ style, theme = 'cosmic' }) => {
  // Use the passed theme or default to cosmic
  const currentEventsTheme = EVENTS_THEMES[theme];
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());

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

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
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
            const isExpanded = expandedEventIds.has(event.id);
            
            return (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.7}
                onPress={() => toggleEventExpansion(event.id)}
              >
                <View 
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
                    <Text 
                      style={[styles.eventTitle, { color: currentEventsTheme.eventTitle }]} 
                      numberOfLines={isExpanded ? undefined : 3}
                    >
                      {event.title}
                    </Text>
                    <Text 
                      style={[styles.eventSubtext, { color: currentEventsTheme.eventSubtext }]}
                      numberOfLines={2}
                    >
                      {event.location_name || 'Location TBA'} • {time}
                    </Text>
                    {event.description && (
                      <Text 
                        style={[styles.eventDescription, { color: currentEventsTheme.eventSubtext }]} 
                        numberOfLines={isExpanded ? undefined : 3}
                      >
                        {event.description}
                      </Text>
                    )}
                  </View>
                  
                  {/* Chevron - rotates when expanded */}
                  <Text 
                    style={[
                      styles.chevron, 
                      { 
                        color: currentEventsTheme.eventSubtext,
                        transform: [{ rotate: isExpanded ? '90deg' : '0deg' }]
                      }
                    ]}
                  >
                    ›
                  </Text>
                </View>
              </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  dateBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 16,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.8,
    marginBottom: 2,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
  },
  eventDetails: {
    flex: 1,
    paddingRight: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  eventSubtext: {
    fontSize: 12,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  chevron: {
    fontSize: 24,
    opacity: 0.4,
    marginLeft: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default EventsView;

