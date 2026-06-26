/**
 * Sun Cycle View - Displays sunrise/sunset times
 * Shows countdown timer and alarm controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateSunTimes, formatSunTime } from '../utils/sgvdApi';
import {
  getAlarmConfig,
  saveAlarmConfig,
  scheduleAlarmsForNext3Days,
  getScheduledNotifications,
  cancelScheduledNotification,
} from '../utils/alarmManager';
import { SunCycleViewProps, AlarmConfig } from '../types';
import {
  TEXT_LOADING_SUN_TIMES,
  TEXT_NEXT_SUNRISE,
  TEXT_NEXT_SUNSET,
  TEXT_SUNRISE,
  TEXT_SUNSET,
  TEXT_ALARM,
  TEXT_NOTIFICATIONS,
  TEXT_SUNRISE_ALARM,
  TEXT_SUNSET_ALARM,
  TEXT_SUNRISE_ALERTS,
  TEXT_SUNSET_ALERTS,
  TEXT_ALARM_NOTIFICATION_SETTINGS,
  TEXT_SCHEDULE_AHEAD,
  SCHEDULE_DAYS_OPTIONS,
  SUN_SUNRISE_ICON_COLOR,
  SUN_SUNSET_ICON_COLOR,
  SUN_ICON_SIZE,
} from '../constants';
import { sunCycleViewStyles } from '../styles/SunCycleViewStyles';

export default function SunCycleView({ latitude, longitude }: SunCycleViewProps) {
  const [config, setConfig] = useState<AlarmConfig | null>(null);
  const [sunTimes, setSunTimes] = useState<{
    sunrise: Date;
    sunset: Date;
    nextEvent: Date;
    nextEventType: 'sunrise' | 'sunset';
  } | null>(null);
  const [scheduledAlarms, setScheduledAlarms] = useState<
    Array<{ id: string; title: string; body: string; date: Date }>
  >([]);

  // Load configuration and sun times when the location changes.
  useEffect(() => {
    loadData();
  }, [latitude, longitude]);

  const loadData = async () => {
    try {
      // Load alarm config
      const savedConfig = await getAlarmConfig();
      setConfig(savedConfig);

      // Load sun times
      if (latitude && longitude) {
        const times = await calculateSunTimes(latitude, longitude);
        console.log('Sun times loaded:', {
          sunrise: times.sunrise.toLocaleString(),
          sunset: times.sunset.toLocaleString(),
          nextEvent: times.nextEvent.toLocaleString(),
          nextEventType: times.nextEventType,
        });
        setSunTimes(times);

        // Ensure alarms/notifications are actually scheduled for the saved
        // config before reading the count. Without this, opening the Alarm tab
        // races the app-startup scheduling and can show "0 alarms scheduled"
        // until the user toggles a switch. scheduleAlarmsForNext3Days is
        // idempotent (it cancels then reschedules), so this is safe to call here.
        await scheduleAlarmsForNext3Days(latitude, longitude);
      }

      // Get scheduled alarms/notifications (includes Android notifee alarms)
      const scheduled = await getScheduledNotifications();
      setScheduledAlarms(scheduled);
    } catch (error) {
      console.error('Error loading sun cycle data:', error);
    }
  };

  // Cancel a single scheduled alarm and refresh the list
  const removeScheduledAlarm = async (id: string) => {
    await cancelScheduledNotification(id);
    const scheduled = await getScheduledNotifications();
    setScheduledAlarms(scheduled);
  };

  // e.g. "Fri 5:42 AM" — alarms span several days, so include the weekday.
  const formatAlarmDateTime = (date: Date) =>
    date.toLocaleString('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  // Update config and reschedule alarms
  const updateConfig = async (newConfig: Partial<AlarmConfig>) => {
    if (!config) return;

    let nextConfig = { ...newConfig };

    // If alarm mode is being enabled, automatically enable both sunrise and sunset alarms
    if (nextConfig.alarmEnabled === true && !config.alarmEnabled) {
      nextConfig = {
        ...nextConfig,
        sunriseAlarmEnabled: true,
        sunsetAlarmEnabled: true,
      };
    }

    // If notification mode is being enabled, automatically enable both sunrise and sunset notifications
    if (nextConfig.notificationsEnabled === true && !config.notificationsEnabled) {
      nextConfig = {
        ...nextConfig,
        sunriseNotificationEnabled: true,
        sunsetNotificationEnabled: true,
      };
    }

    // Alarm and Notification modes are mutually exclusive (an event fires as a
    // loud alarm OR a silent notification, never both). Enabling one disables
    // the other — matching the Settings tab so both screens stay consistent.
    if (nextConfig.alarmEnabled === true) {
      nextConfig = { ...nextConfig, notificationsEnabled: false };
    }
    if (nextConfig.notificationsEnabled === true) {
      nextConfig = { ...nextConfig, alarmEnabled: false };
    }

    const updatedConfig = { ...config, ...nextConfig };
    setConfig(updatedConfig);
    await saveAlarmConfig(updatedConfig);

    // Reschedule alarms with new config (only if we have location)
    if (latitude && longitude) {
      await scheduleAlarmsForNext3Days(latitude, longitude);
    }
    
    // Refresh scheduled alarms
    const scheduled = await getScheduledNotifications();
    setScheduledAlarms(scheduled);
  };

  if (!config || !sunTimes) {
    return (
      <View style={sunCycleViewStyles.container}>
        <View style={sunCycleViewStyles.loadingContainer}>
          <Text style={sunCycleViewStyles.loadingText}>{TEXT_LOADING_SUN_TIMES}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={sunCycleViewStyles.container} contentContainerStyle={sunCycleViewStyles.scrollContent}>
      {/* Next Event Display */}
      <View style={sunCycleViewStyles.countdownContainer}>
        <Text style={sunCycleViewStyles.countdownLabel}>
          {sunTimes.nextEventType === 'sunrise' ? TEXT_NEXT_SUNRISE : TEXT_NEXT_SUNSET}
        </Text>
        <Text style={sunCycleViewStyles.countdownTime}>{formatSunTime(sunTimes.nextEvent)}</Text>
      </View>

      {/* Sun Times Display */}
      <View style={sunCycleViewStyles.timesContainer}>
        <View style={sunCycleViewStyles.timeCard}>
          <Ionicons name="sunny" size={SUN_ICON_SIZE} color={SUN_SUNRISE_ICON_COLOR} />
          <Text style={sunCycleViewStyles.timeLabel}>{TEXT_SUNRISE}</Text>
          <Text style={sunCycleViewStyles.timeValue}>{formatSunTime(sunTimes.sunrise)}</Text>
        </View>
        <View style={sunCycleViewStyles.timeCard}>
          <Ionicons name="moon" size={SUN_ICON_SIZE} color={SUN_SUNSET_ICON_COLOR} />
          <Text style={sunCycleViewStyles.timeLabel}>{TEXT_SUNSET}</Text>
          <Text style={sunCycleViewStyles.timeValue}>{formatSunTime(sunTimes.sunset)}</Text>
        </View>
      </View>

      {/* Alarm & Notification Controls */}
      <View style={sunCycleViewStyles.controlsContainer}>
        <Text style={sunCycleViewStyles.sectionTitle}>{TEXT_ALARM_NOTIFICATION_SETTINGS}</Text>

        {/* Alarm Mode Toggle */}
        <View style={sunCycleViewStyles.controlRow}>
          <View style={sunCycleViewStyles.controlLabel}>
            <Ionicons name="alarm" size={24} color={SUN_SUNSET_ICON_COLOR} />
            <Text style={sunCycleViewStyles.controlText}>{TEXT_ALARM}</Text>
          </View>
          <Switch
            value={config.alarmEnabled}
            onValueChange={(value) => updateConfig({ alarmEnabled: value })}
            trackColor={{ false: '#767577', true: SUN_SUNSET_ICON_COLOR }}
            thumbColor={config.alarmEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>

        {/* Nested Alarm Options */}
        {config.alarmEnabled && (
          <View style={sunCycleViewStyles.nestedControlsAlarm}>
            {/* Sunrise Toggle */}
            <View style={sunCycleViewStyles.controlRow}>
              <View style={sunCycleViewStyles.controlLabel}>
                <Ionicons name="sunny-outline" size={22} color={SUN_SUNSET_ICON_COLOR} />
                <Text style={sunCycleViewStyles.controlTextNested}>{TEXT_SUNRISE_ALARM}</Text>
              </View>
              <Switch
                value={config.sunriseAlarmEnabled}
                onValueChange={(value) => updateConfig({ sunriseAlarmEnabled: value })}
                trackColor={{ false: '#767577', true: SUN_SUNSET_ICON_COLOR }}
                thumbColor={config.sunriseAlarmEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Sunset Toggle */}
            <View style={sunCycleViewStyles.controlRow}>
              <View style={sunCycleViewStyles.controlLabel}>
                <Ionicons name="moon-outline" size={22} color={SUN_SUNSET_ICON_COLOR} />
                <Text style={sunCycleViewStyles.controlTextNested}>{TEXT_SUNSET_ALARM}</Text>
              </View>
              <Switch
                value={config.sunsetAlarmEnabled}
                onValueChange={(value) => updateConfig({ sunsetAlarmEnabled: value })}
                trackColor={{ false: '#767577', true: SUN_SUNSET_ICON_COLOR }}
                thumbColor={config.sunsetAlarmEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Notification Toggle */}
        <View style={[sunCycleViewStyles.controlRow, sunCycleViewStyles.controlRowSpaced]}>
          <View style={sunCycleViewStyles.controlLabel}>
            <Ionicons name="notifications" size={24} color={SUN_SUNRISE_ICON_COLOR} />
            <Text style={sunCycleViewStyles.controlText}>{TEXT_NOTIFICATIONS}</Text>
          </View>
          <Switch
            value={config.notificationsEnabled}
            onValueChange={(value) => updateConfig({ notificationsEnabled: value })}
            trackColor={{ false: '#767577', true: SUN_SUNRISE_ICON_COLOR }}
            thumbColor={config.notificationsEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>

        {/* Nested Notification Options */}
        {config.notificationsEnabled && (
          <View style={sunCycleViewStyles.nestedControls}>
            {/* Sunrise Toggle */}
            <View style={sunCycleViewStyles.controlRow}>
              <View style={sunCycleViewStyles.controlLabel}>
                <Ionicons name="sunny-outline" size={22} color={SUN_SUNRISE_ICON_COLOR} />
                <Text style={sunCycleViewStyles.controlTextNested}>{TEXT_SUNRISE_ALERTS}</Text>
              </View>
              <Switch
                value={config.sunriseNotificationEnabled}
                onValueChange={(value) => updateConfig({ sunriseNotificationEnabled: value })}
                trackColor={{ false: '#767577', true: SUN_SUNRISE_ICON_COLOR }}
                thumbColor={config.sunriseNotificationEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Sunset Toggle */}
            <View style={sunCycleViewStyles.controlRow}>
              <View style={sunCycleViewStyles.controlLabel}>
                <Ionicons name="moon-outline" size={22} color={SUN_SUNSET_ICON_COLOR} />
                <Text style={sunCycleViewStyles.controlTextNested}>{TEXT_SUNSET_ALERTS}</Text>
              </View>
              <Switch
                value={config.sunsetNotificationEnabled}
                onValueChange={(value) => updateConfig({ sunsetNotificationEnabled: value })}
                trackColor={{ false: '#767577', true: SUN_SUNSET_ICON_COLOR }}
                thumbColor={config.sunsetNotificationEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Scheduled alarms list (with per-alarm remove) */}
        {(config.notificationsEnabled || config.alarmEnabled) && (
          <>
            {/* How many calendar days to schedule, inclusive of today. Kept small
                (1/2/4) so the OS isn't flooded with exact alarms. */}
            <View style={sunCycleViewStyles.scheduleAheadRow}>
              <Text style={sunCycleViewStyles.scheduleAheadLabel}>{TEXT_SCHEDULE_AHEAD}</Text>
              <View style={sunCycleViewStyles.scheduleAheadOptions}>
                {SCHEDULE_DAYS_OPTIONS.map((days) => {
                  const selected = (config.scheduleDaysAhead ?? 1) === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      style={[
                        sunCycleViewStyles.scheduleAheadChip,
                        selected && sunCycleViewStyles.scheduleAheadChipActive,
                      ]}
                      onPress={() => updateConfig({ scheduleDaysAhead: days })}
                      accessibilityLabel={`Schedule ${days} day${days > 1 ? 's' : ''}`}
                    >
                      <Text
                        style={[
                          sunCycleViewStyles.scheduleAheadChipText,
                          selected && sunCycleViewStyles.scheduleAheadChipTextActive,
                        ]}
                      >
                        {days}d
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={sunCycleViewStyles.infoBox}>
              <Ionicons name="calendar" size={20} color={SUN_SUNRISE_ICON_COLOR} />
              <Text style={sunCycleViewStyles.infoText}>
                {scheduledAlarms.length} alarm{scheduledAlarms.length === 1 ? '' : 's'} scheduled across{' '}
                {config.scheduleDaysAhead ?? 1} day{(config.scheduleDaysAhead ?? 1) === 1 ? '' : 's'}, including today
              </Text>
            </View>

            {scheduledAlarms.map((alarm) => (
              <View key={alarm.id} style={sunCycleViewStyles.scheduledRow}>
                <View style={sunCycleViewStyles.scheduledInfo}>
                  <Text style={sunCycleViewStyles.scheduledTitle} numberOfLines={1}>
                    {alarm.title}
                  </Text>
                  <Text style={sunCycleViewStyles.scheduledTime}>
                    {formatAlarmDateTime(alarm.date)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={sunCycleViewStyles.scheduledRemove}
                  onPress={() => removeScheduledAlarm(alarm.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={`Remove ${alarm.title} alarm`}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

      </View>
    </ScrollView>
  );
}
