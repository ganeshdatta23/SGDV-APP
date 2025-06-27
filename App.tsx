/**
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Switch } from 'react-native';
import { scheduleNotification, cancelAllNotifications } from './utils/notificationManager';
import { SafeAreaView, StatusBar, StyleSheet, Text, View, Image, TouchableOpacity, AppState } from 'react-native';
import SimpleCompassView from './components/CompassView';
import { parseUrlOrCoords } from './utils/locationUtils';
import Video from 'react-native-video';
import Sound from 'react-native-sound';
import { calculateSunTimes, formatSunTime, debugSunriseSunset } from './utils/sunCalculator';

function App(): React.JSX.Element {
  // Replace this with the desired URL or "lat,lng" string.
  const TARGET_LOCATION_INPUT = "https://www.google.com/maps/@12.308367,76.645467,17z";

  const parsedTarget = useMemo(() => parseUrlOrCoords(TARGET_LOCATION_INPUT), [TARGET_LOCATION_INPUT]);
  
  // Alignment state
  const [isAligned, setIsAligned] = useState(false);
  const [nextSunEvent, setNextSunEvent] = useState<{ time: Date; type: 'sunrise' | 'sunset'; isToday: boolean } | null>(null);
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(false);

  useEffect(() => {
    if (isAlarmEnabled && nextSunEvent) {
      const title = `Time for ${nextSunEvent.type}!`;
      const body = `The sun will ${nextSunEvent.type} at ${formatSunTime(nextSunEvent.time)}.`;
      scheduleNotification(title, body, nextSunEvent.time.getTime());
    } else {
      cancelAllNotifications();
    }
  }, [isAlarmEnabled, nextSunEvent]);

  // Handle Darshan audio
  const soundRef = useRef<Sound | null>(null);

  useEffect(() => {
    // Initialize sound
    Sound.setCategory('Playback', true); // Enable mixing with other audio
    
    const sound = new Sound('background_music.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load the sound', error);
        return;
      }
      console.log('Sound loaded successfully');
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

  // Play / pause audio depending on alignment
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) {
      return;
    }

    if (isAligned) {
      console.log('🎵 Playing darshan audio...');
      // Reset audio to the beginning before playing.
      sound.setCurrentTime(0);
      sound.play((success) => {
        if (!success) {
          console.log('❌ Sound playback failed');
        } else {
          console.log('✅ Sound playback started');
        }
      });
    } else {
      sound.pause();
    }
  }, [isAligned]);

  // Handle app state changes for audio playback
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      const sound = soundRef.current;
      if (!sound) {
        return;
      }

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App is in background, pausing audio.');
        sound.pause();
      } else if (nextAppState === 'active') {
        console.log('App is in foreground, checking alignment to resume audio.');
        if (isAligned) {
          sound.play((success) => {
            if (!success) {
              console.log('❌ Sound playback failed on resume');
            } else {
              console.log('✅ Sound playback resumed');
            }
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAligned]);

  // Calculate and display next sunrise/sunset using new API
  useEffect(() => {
    const getSunEvent = async () => {
      if (parsedTarget) {
        try {
          // Get today's sun times (cached after first call)
          const sunTimes = await calculateSunTimes(parsedTarget.latitude, parsedTarget.longitude);
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
            const tomorrowTimes = await calculateSunTimes(parsedTarget.latitude, parsedTarget.longitude, tomorrow);
            setNextSunEvent({ time: tomorrowTimes.sunrise, type: 'sunrise', isToday: false });
          }
        } catch (error) {
          console.error('Error getting sun times:', error);
          // Fallback to show a generic message
          setNextSunEvent(null);
        }
      }
    };
    
    getSunEvent();
  }, [parsedTarget]);

  const handleAlignmentChange = (aligned: boolean) => {
    console.log('Alignment changed:', aligned);
    setIsAligned(aligned);
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
        <Text style={styles.title}>Guru Digbandanam</Text>
        {nextSunEvent && (
          <Text style={styles.sunEventText}>
            Next {nextSunEvent.type}: {formatSunTime(nextSunEvent.time)}
            {nextSunEvent.isToday ? ' today' : ' tomorrow'}
          </Text>
        )}
        <View style={styles.alarmContainer}>
          <Text style={styles.alarmText}>Set Alarm</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isAlarmEnabled ? '#f5dd4b' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setIsAlarmEnabled}
            value={isAlarmEnabled}
          />
        </View>
      </View>

      {/* Compass Component */}
      {parsedTarget ? (
        <SimpleCompassView 
          targetLocation={parsedTarget}
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
          />
          {/* Swamiji image overlay */}
          <Image
            source={require('./assets/images/swamiji-darshan.png')}
            style={styles.darshanImage}
            resizeMode="contain"
          />
          {/* Close button to exit overlay */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setIsAligned(false)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
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
  alarmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  alarmText: {
    color: '#FFD700',
    fontSize: 18,
    marginRight: 10,
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
});

export default App;
