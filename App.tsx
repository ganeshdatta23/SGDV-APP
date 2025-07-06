/**
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View, Image, TouchableOpacity, AppState, Switch, Modal } from 'react-native';
import SimpleCompassView from './components/CompassView';
import { fetchLocationDirect } from './utils/directApi';
import Video from 'react-native-video';
import Sound from 'react-native-sound';
import { calculateSunTimes, formatSunTime, debugSunriseSunset } from './utils/sunCalculator';
import { initializeNotifications, scheduleAlarms, getNextAlarmInfo, getAlarmConfig, saveAlarmConfig, AlarmConfig } from './utils/alarmManager';

function App(): React.JSX.Element {
  // Dynamic location state
  const [targetLocation, setTargetLocation] = useState<{latitude: number; longitude: number; address: string; googleMapsUrl: string} | null>(null);
  
  // Log targetLocation changes
  useEffect(() => {
    console.log('🎯 App.tsx: targetLocation state changed:', targetLocation);
  }, [targetLocation]);
  
  // Alignment state
  const [isAligned, setIsAligned] = useState(false);
  const [nextSunEvent, setNextSunEvent] = useState<{ time: Date; type: 'sunrise' | 'sunset'; isToday: boolean } | null>(null);
  const [isClosedManually, setIsClosedManually] = useState(false);
  
  // Alarm settings
  const [alarmConfig, setAlarmConfig] = useState<AlarmConfig>({
    sunriseEnabled: true,
    sunsetEnabled: true,
    sunriseOffset: 15,
    sunsetOffset: 15,
  });
  const [showAlarmSettings, setShowAlarmSettings] = useState(false);

  // App state tracking for background/foreground
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
      setAppStateVisible(nextAppState);
      console.log('App state changed:', nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  // Fetch location on component mount
  useEffect(() => {
    const loadLocation = async () => {
      try {
        console.log('🔍 App.tsx: Starting location fetch process...');
        console.log('🔍 App.tsx: About to call fetchLocationDirect()');
        const location = await fetchLocationDirect();
        console.log('🔍 App.tsx: fetchLocationDirect returned:', location);
        if (location) {
          console.log('✅ App.tsx: Target location loaded successfully:', location);
          setTargetLocation(location);
        } else {
          console.log('❌ App.tsx: fetchLocationDirect returned null/undefined');
        }
      } catch (error) {
        console.error('❌ App.tsx: Failed to load target location:', error);
        if (error instanceof Error) {
          console.error('❌ App.tsx: Error details:', error.message, error.stack);
        } else {
          console.error('❌ App.tsx: Error details:', String(error));
        }
      }
    };

    console.log('🚀 App.tsx: Component mounted, starting location load...');
    
    // Initialize notifications
    initializeNotifications();
    
    // Load alarm configuration
    const loadAlarmConfig = async () => {
      try {
        const config = await getAlarmConfig();
        setAlarmConfig(config);
        console.log('⏰ Alarm config loaded:', config);
      } catch (error) {
        console.error('❌ Failed to load alarm config:', error);
      }
    };
    
    loadAlarmConfig();
    loadLocation();
  }, []);

  // Handle Darshan audio
  const soundRef = useRef<Sound | null>(null);

  useEffect(() => {
    // Initialize sound
    Sound.setCategory('Playback', true); // Enable mixing with other audio
    
    const sound = new Sound(require('./assets/audio/background-music.mp3'), (error) => {
      if (error) {
        console.log('❌ Failed to load the sound', error);
        return;
      }
      console.log('✅ Sound loaded successfully');
      console.log('🎵 Sound duration:', sound.getDuration());
      sound.setNumberOfLoops(-1); // Loop indefinitely
      sound.setVolume(0.8); // Set volume to 80%
      soundRef.current = sound;
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
    };
  }, []);

  // Play / pause audio depending on alignment and app state
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) {
      return;
    }

    // Only play if aligned AND app is in foreground
    if (isAligned && appStateVisible === 'active') {
      console.log('🎵 Playing darshan audio...');
      // First stop any current playback
      sound.stop();
      // Small delay to ensure stop is complete, then reset and play
      setTimeout(() => {
        sound.setCurrentTime(0);
        sound.play((success) => {
          if (!success) {
            console.log('❌ Sound playback failed');
          } else {
            console.log('✅ Sound playback started');
          }
        });
      }, 100);
    } else {
      // Pause audio if not aligned or app is in background
      sound.pause();
      if (appStateVisible !== 'active') {
        console.log('🎵 Audio paused - app in background');
      }
    }
  }, [isAligned, appStateVisible]);

  // Calculate and display next sunrise/sunset using new API
  useEffect(() => {
    const getSunEvent = async () => {
      if (targetLocation) {
        try {
          // Get today's sun times (cached after first call)
          const sunTimes = await calculateSunTimes(targetLocation.latitude, targetLocation.longitude);
          const now = new Date();
          
          // Determine next event
          if (now < sunTimes.sunrise) {
            setNextSunEvent({ time: sunTimes.sunrise, type: 'sunrise', isToday: true });
          } else if (now < sunTimes.sunset) {
            setNextSunEvent({ time: sunTimes.sunset, type: 'sunset', isToday: true });
          } else {
            // Tomorrow's sunrise
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowTimes = await calculateSunTimes(targetLocation.latitude, targetLocation.longitude, tomorrow);
            setNextSunEvent({ time: tomorrowTimes.sunrise, type: 'sunrise', isToday: false });
          }
          
          // Schedule alarms for sunrise/sunset
          console.log('⏰ Scheduling alarms for sunrise/sunset...');
          await scheduleAlarms(targetLocation.latitude, targetLocation.longitude);
        } catch (error) {
          console.error('Error getting sun times:', error);
          // Fallback to show a generic message
          setNextSunEvent(null);
        }
      }
    };
    
    getSunEvent();
  }, [targetLocation]);

  const handleAlignmentChange = (aligned: boolean) => {
    console.log('🧭 Alignment changed:', aligned);
    console.log('🎵 App state:', appStateVisible);
    console.log('🎵 Sound ref exists:', !!soundRef.current);
    console.log('🔒 Is closed manually:', isClosedManually);
    console.log('🔒 Current isAligned state:', isAligned);
    
    // Only allow alignment if not manually closed
    if (aligned && !isClosedManually) {
      console.log('✅ Setting aligned to TRUE - Video overlay will render');
      setIsAligned(true);
    } else if (!aligned) {
      console.log('❌ Setting aligned to FALSE - Video overlay will hide');
      setIsAligned(false);
      // Reset manual close state when alignment is lost
      if (isClosedManually) {
        setIsClosedManually(false);
        console.log('🔓 Manual close state reset - ready for next alignment');
      }
    } else if (aligned && isClosedManually) {
      console.log('🚫 Alignment blocked - manually closed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="rgba(0, 20, 40, 0.9)" 
        translucent={false}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Guru Digbandanam</Text>
          <TouchableOpacity 
            style={styles.alarmButton}
            onPress={() => setShowAlarmSettings(true)}
          >
            <Text style={styles.alarmButtonText}>⏰</Text>
          </TouchableOpacity>
        </View>
        {nextSunEvent && (
          <Text style={styles.sunEventText}>
            Next {nextSunEvent.type}: {formatSunTime(nextSunEvent.time)}
            {nextSunEvent.isToday ? ' today' : ' tomorrow'}
          </Text>
        )}
      </View>

      {/* Compass Component */}
      {targetLocation ? (
        <SimpleCompassView 
          targetLocation={targetLocation}
          onAlignmentChange={handleAlignmentChange}
        />
      ) : (
        <SimpleCompassView 
          targetHeading={45}
          onAlignmentChange={handleAlignmentChange}
        />
      )}

      {/* Darshan overlay */}
      {isAligned && (
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Background video */}
          <Video
            source={require('./assets/videos/darshan-background.mp4')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            repeat={true}
            muted={true}
            playInBackground={false}
            playWhenInactive={false}
            onLoad={() => console.log('🎬 Video loaded successfully')}
            onError={(error) => console.log('❌ Video error:', error)}
            onLoadStart={() => console.log('🎬 Video loading started')}
            onProgress={(data) => console.log('🎬 Video progress:', data.currentTime)}
          />
          {/* Swamiji image overlay */}
          <Image
            source={require('./assets/images/swamiji-darshan.png')}
            style={styles.darshanImage}
            resizeMode="contain"
          />
          {/* Close button to exit overlay - requires fresh realignment */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => {
            console.log('🔴 Close button pressed - stopping audio and requiring fresh alignment');
            setIsAligned(false);
            setIsClosedManually(true);
          }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Alarm Settings Modal */}
      <Modal
        visible={showAlarmSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAlarmSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⏰ Alarm Settings</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sunrise Alarm</Text>
              <Switch
                value={alarmConfig.sunriseEnabled}
                onValueChange={(value) => {
                  const newConfig = { ...alarmConfig, sunriseEnabled: value };
                  setAlarmConfig(newConfig);
                  saveAlarmConfig(newConfig);
                  if (targetLocation) {
                    scheduleAlarms(targetLocation.latitude, targetLocation.longitude);
                  }
                }}
                trackColor={{ false: '#767577', true: '#FFD700' }}
                thumbColor={alarmConfig.sunriseEnabled ? '#FFF' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sunset Alarm</Text>
              <Switch
                value={alarmConfig.sunsetEnabled}
                onValueChange={(value) => {
                  const newConfig = { ...alarmConfig, sunsetEnabled: value };
                  setAlarmConfig(newConfig);
                  saveAlarmConfig(newConfig);
                  if (targetLocation) {
                    scheduleAlarms(targetLocation.latitude, targetLocation.longitude);
                  }
                }}
                trackColor={{ false: '#767577', true: '#FFD700' }}
                thumbColor={alarmConfig.sunsetEnabled ? '#FFF' : '#f4f3f4'}
              />
            </View>

            <Text style={styles.alarmInfo}>
              {alarmConfig.sunriseEnabled && `🌅 Sunrise alarm: ${alarmConfig.sunriseOffset} min before`}
              {alarmConfig.sunriseEnabled && alarmConfig.sunsetEnabled && '\n'}
              {alarmConfig.sunsetEnabled && `🌇 Sunset alarm: ${alarmConfig.sunsetOffset} min before`}
            </Text>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowAlarmSettings(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #1a1a2e, #16213e)',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 20, 40, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  alarmButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  alarmButtonText: {
    fontSize: 20,
    color: '#FFD700',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sunEventText: {
    fontSize: 18,
    color: '#E6E6FA',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  darshanImage: {
    width: '80%',
    height: '50%',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 30, 60, 0.95)',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.6)',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  settingLabel: {
    fontSize: 18,
    color: '#E6E6FA',
    fontWeight: '600',
  },
  alarmInfo: {
    fontSize: 14,
    color: '#E6E6FA',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    lineHeight: 20,
  },
  closeModalButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  closeModalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
