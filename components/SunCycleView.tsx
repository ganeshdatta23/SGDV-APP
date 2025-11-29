/**
 * Sun Cycle View - Displays sunrise/sunset times
 * Shows countdown timer and alarm controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { calculateSunTimes, formatSunTime } from '../utils/sgvdApi';
import {
  getAlarmConfig,
  saveAlarmConfig,
  scheduleAlarmsForNext3Days,
  getScheduledNotifications,
  sendTestNotification,
  sendTestAlarm,
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
  TEXT_TEST_ALARM_SOUND,
  TEXT_STOP_TEST_ALARM,
  TEXT_SEND_TEST_NOTIFICATION,
  TEXT_TEST_ALARM_5_SEC,
  TEXT_ALARM_NOTIFICATION_SETTINGS,
  SUN_SUNRISE_ICON_COLOR,
  SUN_SUNSET_ICON_COLOR,
  SUN_ICON_SIZE,
  ALARM_TEST_DURATION_MS,
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scheduledCount, setScheduledCount] = useState(0);
  const [isTestingAlarm, setIsTestingAlarm] = useState(false);

  // Audio player for alarm sound
  const alarmPlayer = useAudioPlayer(require('../assets/audio/alarm-sound.mp3'));

  // Load configuration and sun times
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
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
      }

      // Get scheduled notification count
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    } catch (error) {
      console.error('Error loading sun cycle data:', error);
    }
  };

  // Update config and reschedule alarms
  const updateConfig = async (newConfig: Partial<AlarmConfig>) => {
    if (!config) return;

    // If alarm mode is being enabled, automatically enable both sunrise and sunset alarms
    if (newConfig.alarmEnabled === true && !config.alarmEnabled) {
      newConfig = {
        ...newConfig,
        sunriseAlarmEnabled: true,
        sunsetAlarmEnabled: true,
      };
    }

    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    await saveAlarmConfig(updatedConfig);

    // Reschedule alarms with new config (only if we have location)
    if (latitude && longitude) {
      await scheduleAlarmsForNext3Days(latitude, longitude);
    }
    
    // Refresh scheduled count
    const scheduled = await getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  // Test alarm sound
  const testAlarmSound = useCallback(() => {
    if (isTestingAlarm) {
      try {
        alarmPlayer.pause();
        setIsTestingAlarm(false);
      } catch (error) {
        console.log('⚠️ Could not pause alarm (player may be disposed)');
        setIsTestingAlarm(false);
      }
    } else {
      try {
        alarmPlayer.loop = true;
        alarmPlayer.volume = 1.0;
        alarmPlayer.play();
        setIsTestingAlarm(true);
        
        // Auto-stop after 10 seconds
        setTimeout(() => {
          try {
            alarmPlayer.pause();
            setIsTestingAlarm(false);
          } catch (error) {
            console.log('⚠️ Could not pause alarm (player may be disposed)');
            setIsTestingAlarm(false);
          }
        }, ALARM_TEST_DURATION_MS);
      } catch (error) {
        console.log('⚠️ Could not play alarm:', error);
      }
    }
  }, [isTestingAlarm, alarmPlayer]);

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

        {/* Test Alarm Button */}
        {config.alarmEnabled && (
          <TouchableOpacity
            style={[sunCycleViewStyles.testButton, isTestingAlarm && sunCycleViewStyles.testButtonActive]}
            onPress={testAlarmSound}
          >
            <Ionicons
              name={isTestingAlarm ? 'stop-circle' : 'play-circle'}
              size={24}
              color="#FFFFFF"
            />
            <Text style={sunCycleViewStyles.testButtonText}>
              {isTestingAlarm ? TEXT_STOP_TEST_ALARM : TEXT_TEST_ALARM_SOUND}
            </Text>
          </TouchableOpacity>
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

        {/* Scheduled Count */}
        {(config.notificationsEnabled || config.alarmEnabled) && (
          <View style={sunCycleViewStyles.infoBox}>
            <Ionicons name="calendar" size={20} color={SUN_SUNRISE_ICON_COLOR} />
            <Text style={sunCycleViewStyles.infoText}>
              {scheduledCount} alarms scheduled for the next 3 days
            </Text>
          </View>
        )}

        {/* Test Notification Button */}
        <TouchableOpacity
          style={sunCycleViewStyles.testNotificationButton}
          onPress={async () => {
            await sendTestNotification();
          }}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          <Text style={sunCycleViewStyles.testButtonText}>{TEXT_SEND_TEST_NOTIFICATION}</Text>
        </TouchableOpacity>

        {/* Test Alarm Button - schedules alarm for 5 seconds from now */}
        <TouchableOpacity
          style={sunCycleViewStyles.testAlarmButton}
          onPress={async () => {
            await sendTestAlarm();
          }}
        >
          <Ionicons name="alarm-outline" size={24} color="#FFFFFF" />
          <Text style={sunCycleViewStyles.testButtonText}>{TEXT_TEST_ALARM_5_SEC}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

