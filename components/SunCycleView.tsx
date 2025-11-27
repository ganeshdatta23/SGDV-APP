/**
 * Sun Cycle View - Displays sunrise/sunset times with animated day arc
 * Shows sun position, countdown timer, and alarm controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAudioPlayer } from 'expo-audio';
import { calculateSunTimes, formatSunTime } from '../utils/sgvdApi';
import {
  getAlarmConfig,
  saveAlarmConfig,
  scheduleAlarmsForNext7Days,
  getScheduledNotifications,
  AlarmConfig,
} from '../utils/alarmManager';
import { sunCycleViewStyles as styles, ARC_WIDTH, ARC_HEIGHT } from '../src/styles/SunCycleViewStyles';

interface SunCycleViewProps {
  latitude?: number;
  longitude?: number;
}

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

    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    await saveAlarmConfig(updatedConfig);

    // Reschedule alarms with new config
    await scheduleAlarmsForNext7Days();

    // Refresh scheduled count
    const scheduled = await getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  // Test alarm sound
  const testAlarmSound = useCallback(() => {
    if (isTestingAlarm) {
      alarmPlayer.pause();
      setIsTestingAlarm(false);
    } else {
      alarmPlayer.loop = true;
      alarmPlayer.volume = 1.0;
      alarmPlayer.play();
      setIsTestingAlarm(true);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        alarmPlayer.pause();
        setIsTestingAlarm(false);
      }, 10000);
    }
  }, [isTestingAlarm, alarmPlayer]);

  // Calculate sun position on arc (0 to 1, where 0 is sunrise, 1 is sunset)
  const getSunPosition = (): number => {
    if (!sunTimes) return 0;

    const now = currentTime.getTime();
    const sunriseTime = sunTimes.sunrise.getTime();
    const sunsetTime = sunTimes.sunset.getTime();

    if (now < sunriseTime) {
      // Before sunrise - sun is below horizon (position 0)
      return 0;
    } else if (now > sunsetTime) {
      // After sunset - sun is below horizon (position 0 for next day)
      return 0;
    } else {
      // During the day - calculate position along arc
      const dayDuration = sunsetTime - sunriseTime;
      const elapsed = now - sunriseTime;
      return Math.min(Math.max(elapsed / dayDuration, 0), 1);
    }
  };

  // Check if it's currently daytime
  const isDaytime = (): boolean => {
    if (!sunTimes) return true;
    const now = currentTime.getTime();
    return now >= sunTimes.sunrise.getTime() && now <= sunTimes.sunset.getTime();
  };

  if (!config || !sunTimes) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sun times...</Text>
        </View>
      </View>
    );
  }

  const sunPosition = getSunPosition();
  const daytime = isDaytime();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Sun Arc Visualization */}
      <View style={styles.arcContainer}>
        <SunArc
          sunPosition={sunPosition}
          isDaytime={daytime}
          width={ARC_WIDTH}
          height={ARC_HEIGHT}
        />
      </View>

      {/* Next Event Display */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>
          NEXT {sunTimes.nextEventType === 'sunrise' ? 'SUNRISE' : 'SUNSET'}
        </Text>
        <Text style={styles.countdownTime}>{formatSunTime(sunTimes.nextEvent)}</Text>
        <Text style={styles.countdownSubtext}>
          {sunTimes.nextEventType === 'sunrise' ? '🌅' : '🌇'}
        </Text>
      </View>

      {/* Sun Times Display */}
      <View style={styles.timesContainer}>
        <View style={styles.timeCard}>
          <Ionicons name="sunny" size={32} color="#FDB813" />
          <Text style={styles.timeLabel}>Sunrise</Text>
          <Text style={styles.timeValue}>{formatSunTime(sunTimes.sunrise)}</Text>
        </View>
        <View style={styles.timeCard}>
          <Ionicons name="moon" size={32} color="#FF6B35" />
          <Text style={styles.timeLabel}>Sunset</Text>
          <Text style={styles.timeValue}>{formatSunTime(sunTimes.sunset)}</Text>
        </View>
      </View>

      {/* Alarm & Notification Controls */}
      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Alarm & Notification Settings</Text>

        {/* Alarm Mode Toggle */}
        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Ionicons name="alarm" size={24} color="#FF6B35" />
            <Text style={styles.controlText}>Alarm Mode (Loud)</Text>
          </View>
          <Switch
            value={config.alarmEnabled}
            onValueChange={(value) => updateConfig({ alarmEnabled: value })}
            trackColor={{ false: '#767577', true: '#FF6B35' }}
            thumbColor={config.alarmEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>

        {/* Test Alarm Button */}
        {config.alarmEnabled && (
          <TouchableOpacity
            style={[styles.testButton, isTestingAlarm && styles.testButtonActive]}
            onPress={testAlarmSound}
          >
            <Ionicons
              name={isTestingAlarm ? 'stop-circle' : 'play-circle'}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.testButtonText}>
              {isTestingAlarm ? 'Stop Test Alarm' : 'Test Alarm Sound'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Notification Toggle */}
        <View style={[styles.controlRow, styles.controlRowSpaced]}>
          <View style={styles.controlLabel}>
            <Ionicons name="notifications" size={24} color="#FDB813" />
            <Text style={styles.controlText}>Notifications</Text>
          </View>
          <Switch
            value={config.notificationsEnabled}
            onValueChange={(value) => updateConfig({ notificationsEnabled: value })}
            trackColor={{ false: '#767577', true: '#FDB813' }}
            thumbColor={config.notificationsEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>

        {/* Nested Notification Options */}
        {config.notificationsEnabled && (
          <View style={styles.nestedControls}>
            {/* Sunrise Toggle */}
            <View style={styles.controlRow}>
              <View style={styles.controlLabel}>
                <Ionicons name="sunny-outline" size={22} color="#FDB813" />
                <Text style={styles.controlTextNested}>Sunrise Alerts</Text>
              </View>
              <Switch
                value={config.sunriseNotificationEnabled}
                onValueChange={(value) => updateConfig({ sunriseNotificationEnabled: value })}
                trackColor={{ false: '#767577', true: '#FDB813' }}
                thumbColor={config.sunriseNotificationEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Sunset Toggle */}
            <View style={styles.controlRow}>
              <View style={styles.controlLabel}>
                <Ionicons name="moon-outline" size={22} color="#FF6B35" />
                <Text style={styles.controlTextNested}>Sunset Alerts</Text>
              </View>
              <Switch
                value={config.sunsetNotificationEnabled}
                onValueChange={(value) => updateConfig({ sunsetNotificationEnabled: value })}
                trackColor={{ false: '#767577', true: '#FF6B35' }}
                thumbColor={config.sunsetNotificationEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Scheduled Count */}
        {(config.notificationsEnabled || config.alarmEnabled) && (
          <View style={styles.infoBox}>
            <Ionicons name="calendar" size={20} color="#FDB813" />
            <Text style={styles.infoText}>
              {scheduledCount} alarms scheduled for the next 7 days
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// SUN ARC COMPONENT
// ============================================================================

interface SunArcProps {
  sunPosition: number; // 0 to 1
  isDaytime: boolean;
  width: number;
  height: number;
}

function SunArc({ sunPosition, isDaytime, width, height }: SunArcProps) {
  // Calculate arc path (semi-circle)
  const centerX = width / 2;
  const centerY = height;
  const radius = width / 2 - 20;

  // Arc path (from left to right)
  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;

  // Calculate sun position on arc
  const angle = Math.PI - sunPosition * Math.PI; // From PI (left) to 0 (right)
  const sunX = centerX + radius * Math.cos(angle);
  const sunY = centerY - radius * Math.sin(angle);

  // Sun size and color based on daytime
  const sunSize = isDaytime ? 24 : 16;
  const sunColor = isDaytime ? '#FDB813' : '#888888';

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FDB813" stopOpacity="0.3" />
          <Stop offset="50%" stopColor="#FDB813" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#FF6B35" stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* Arc Path */}
      <Path
        d={arcPath}
        stroke="url(#arcGradient)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Sunrise marker */}
      <Circle cx={centerX - radius} cy={centerY} r="8" fill="#FDB813" opacity="0.6" />

      {/* Sunset marker */}
      <Circle cx={centerX + radius} cy={centerY} r="8" fill="#FF6B35" opacity="0.6" />

      {/* Sun position */}
      {isDaytime && (
        <>
          {/* Sun glow */}
          <Circle cx={sunX} cy={sunY} r={sunSize + 8} fill={sunColor} opacity="0.2" />
          <Circle cx={sunX} cy={sunY} r={sunSize + 4} fill={sunColor} opacity="0.4" />
        </>
      )}
      <Circle cx={sunX} cy={sunY} r={sunSize} fill={sunColor} />
    </Svg>
  );
}
