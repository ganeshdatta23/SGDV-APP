import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fetchEvents } from '../utils/sgvdApi';
import { EventsViewProps, EventData, FormattedDate } from '../types';
import { EVENTS_THEMES, TEXT_LOADING_EVENTS, TEXT_NO_UPCOMING_EVENTS, TEXT_LOCATION_TBA, EMOJI_CALENDAR } from '../constants';
import { eventsViewStyles } from '../styles/EventsViewStyles';

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

  const formatDate = (dateStr: string): FormattedDate => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate(),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  return (
    <View style={[eventsViewStyles.container, style]}>      
      <ScrollView 
        style={eventsViewStyles.scrollView}
        contentContainerStyle={eventsViewStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={[eventsViewStyles.card, { backgroundColor: currentEventsTheme.cardBg, borderColor: currentEventsTheme.cardBorder }]}>
            <ActivityIndicator size="large" color={currentEventsTheme.loadingColor} />
            <Text style={[eventsViewStyles.loadingText, { color: currentEventsTheme.eventSubtext }]}>{TEXT_LOADING_EVENTS}</Text>
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
                    eventsViewStyles.eventCard, 
                    { backgroundColor: currentEventsTheme.cardBg, borderColor: currentEventsTheme.cardBorder }
                  ]}
                >
                  {/* Date badge */}
                  <View style={[eventsViewStyles.dateBadge, { backgroundColor: currentEventsTheme.dateBg, borderColor: currentEventsTheme.dateBorder }]}>
                    <Text style={[eventsViewStyles.dateMonth, { color: currentEventsTheme.dateText }]}>{month}</Text>
                    <Text style={[eventsViewStyles.dateDay, { color: currentEventsTheme.dateText }]}>{day}</Text>
                  </View>
                  
                  {/* Event details */}
                  <View style={eventsViewStyles.eventDetails}>
                    <Text 
                      style={[eventsViewStyles.eventTitle, { color: currentEventsTheme.eventTitle }]} 
                      numberOfLines={isExpanded ? undefined : 3}
                    >
                      {event.title}
                    </Text>
                    <Text 
                      style={[eventsViewStyles.eventSubtext, { color: currentEventsTheme.eventSubtext }]}
                      numberOfLines={2}
                    >
                      {event.location_name || TEXT_LOCATION_TBA} • {time}
                    </Text>
                    {event.description && (
                      <Text 
                        style={[eventsViewStyles.eventDescription, { color: currentEventsTheme.eventSubtext }]} 
                        numberOfLines={isExpanded ? undefined : 3}
                      >
                        {event.description}
                      </Text>
                    )}
                  </View>
                  
                  {/* Chevron - rotates when expanded */}
                  <Text 
                    style={[
                      eventsViewStyles.chevron, 
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
          <View style={[eventsViewStyles.card, { backgroundColor: currentEventsTheme.cardBg, borderColor: currentEventsTheme.cardBorder }]}>
            <Text style={eventsViewStyles.emptyIcon}>{EMOJI_CALENDAR}</Text>
            <Text style={[eventsViewStyles.emptyText, { color: currentEventsTheme.emptyText }]}>{TEXT_NO_UPCOMING_EVENTS}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default EventsView;

