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
  AlarmConfig,
} from '../utils/alarmManager';

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
        }, 10000);
      } catch (error) {
        console.log('⚠️ Could not play alarm:', error);
      }
    }
  }, [isTestingAlarm, alarmPlayer]);

  if (!config || !sunTimes) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sun times...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Next Event Display */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>
          NEXT {sunTimes.nextEventType === 'sunrise' ? 'SUNRISE' : 'SUNSET'}
        </Text>
        <Text style={styles.countdownTime}>{formatSunTime(sunTimes.nextEvent)}</Text>
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
            <Text style={styles.controlText}>Alarm</Text>
          </View>
          <Switch
            value={config.alarmEnabled}
            onValueChange={(value) => updateConfig({ alarmEnabled: value })}
            trackColor={{ false: '#767577', true: '#FF6B35' }}
            thumbColor={config.alarmEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>

        {/* Nested Alarm Options */}
        {config.alarmEnabled && (
          <View style={styles.nestedControlsAlarm}>
            {/* Sunrise Toggle */}
            <View style={styles.controlRow}>
              <View style={styles.controlLabel}>
                <Ionicons name="sunny-outline" size={22} color="#FF6B35" />
                <Text style={styles.controlTextNested}>Sunrise Alarm</Text>
              </View>
              <Switch
                value={config.sunriseAlarmEnabled}
                onValueChange={(value) => updateConfig({ sunriseAlarmEnabled: value })}
                trackColor={{ false: '#767577', true: '#FF6B35' }}
                thumbColor={config.sunriseAlarmEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Sunset Toggle */}
            <View style={styles.controlRow}>
              <View style={styles.controlLabel}>
                <Ionicons name="moon-outline" size={22} color="#FF6B35" />
                <Text style={styles.controlTextNested}>Sunset Alarm</Text>
              </View>
              <Switch
                value={config.sunsetAlarmEnabled}
                onValueChange={(value) => updateConfig({ sunsetAlarmEnabled: value })}
                trackColor={{ false: '#767577', true: '#FF6B35' }}
                thumbColor={config.sunsetAlarmEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

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
              {scheduledCount} alarms scheduled for the next 3 days
            </Text>
          </View>
        )}

        {/* Test Notification Button */}
        <TouchableOpacity
          style={styles.testNotificationButton}
          onPress={async () => {
            await sendTestNotification();
          }}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>

        {/* Test Alarm Button - schedules alarm for 5 seconds from now */}
        <TouchableOpacity
          style={styles.testAlarmButton}
          onPress={async () => {
            await sendTestAlarm();
          }}
        >
          <Ionicons name="alarm-outline" size={24} color="#FFFFFF" />
          <Text style={styles.testButtonText}>Test Alarm (5 sec)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingRight: 8,
  },
  controlText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flexWrap: 'wrap',
    flex: 1,
  },
  controlTextNested: {
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 12,
    opacity: 0.9,
    flexWrap: 'wrap',
    flex: 1,
  },
  nestedControls: {
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(253, 184, 19, 0.3)',
  },
  nestedControlsAlarm: {
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255, 107, 53, 0.3)',
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
  testNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  testAlarmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
});

