/**
 * Sun Cycle View - Displays sunrise/sunset times with animated day arc
 * Shows sun position, countdown timer, and alarm controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARC_WIDTH = SCREEN_WIDTH - 80;
const ARC_HEIGHT = 200;

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
      // After sunset - sun is below horizon (position 1)
      return 1;
    } else {
      // During the day - calculate position along arc
      const dayDuration = sunsetTime - sunriseTime;
      const elapsed = now - sunriseTime;
      return elapsed / dayDuration;
    }
  };

  // Calculate countdown to next event
  const getCountdown = (): string => {
    if (!sunTimes) return '--:--';

    const now = currentTime.getTime();
    const nextTime = sunTimes.nextEvent.getTime();
    const diff = nextTime - now;

    if (diff <= 0) {
      // If negative, the event has passed, recalculate
      return '00:00';
    }

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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
  const countdown = getCountdown();
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

      {/* Next Event Countdown */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>
          Next {sunTimes.nextEventType === 'sunrise' ? 'Sunrise' : 'Sunset'}
        </Text>
        <Text style={styles.countdownTime}>{countdown}</Text>
        <Text style={styles.countdownSubtext}>
          {sunTimes.nextEventType === 'sunrise' ? '🌅' : '🌇'} {formatSunTime(sunTimes.nextEvent)}
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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  arcContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  countdownLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownTime: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  countdownSubtext: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 8,
  },
  timesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  timeCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    minWidth: 140,
  },
  timeLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  controlsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlRowSpaced: {
    marginTop: 16,
  },
  controlLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  controlText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  controlTextNested: {
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 12,
    opacity: 0.9,
  },
  nestedControls: {
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(253, 184, 19, 0.3)',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  testButtonActive: {
    backgroundColor: '#DC3545',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 184, 19, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
});

