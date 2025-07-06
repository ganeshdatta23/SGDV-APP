/**
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import SimpleCompassView from './components/CompassView';
import SettingsScreen from './components/SettingsScreen';
import BottomNavigation from './components/BottomNavigation';
import { parseUrlOrCoords } from './utils/locationUtils';
import Video from 'react-native-video';
import Sound from 'react-native-sound';
import { calculateSunTimes, formatSunTime } from './utils/sunCalculator';
import { fetchLocationDirect } from './utils/directApi';
import alarmService from './utils/alarmService';
import { Coordinates } from './utils/locationUtils';

// Refresh interval in milliseconds (10 seconds)
const LOCATION_REFRESH_INTERVAL = 10000;

type TabType = 'home' | 'dashboard' | 'schedule' | 'settings';

function App(): React.JSX.Element {
  // Navigation state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  
  // State for target location
  const [targetLocation, setTargetLocation] = useState<Coordinates | null>(null);
  const [locationName, setLocationName] = useState<string>("Unknown Location");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Settings state
  const [musicAutoplay, setMusicAutoplay] = useState<boolean>(true);
  const [sunriseAlarm, setSunriseAlarm] = useState<boolean>(false);
  
  // Alignment state
  const [isAligned, setIsAligned] = useState(false);
  const [nextSunEvent, setNextSunEvent] = useState<{ time: Date; type: 'sunrise' | 'sunset'; isToday: boolean } | null>(null);

  // Handle Darshan audio
  const soundRef = useRef<Sound | null>(null);
  
  // Reference to store interval ID
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch location from Supabase
  const fetchLocation = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      console.log('Fetching target location...');
      const location = await fetchLocationDirect('swamiji_location');
      console.log('Fetch result:', location);
      
      if (location && location.latitude && location.longitude) {
        const newLocation = {
          latitude: location.latitude,
          longitude: location.longitude
        };
        setTargetLocation(newLocation);
        
        // Set location name if available
        if (location.address) {
          setLocationName(location.address);
        } else {
          setLocationName("Appaji's Location");
        }
        
        console.log('Target location set:', location);
        setError(null);
        setLastUpdated(new Date());

        // Update sunrise alarm if enabled
        if (sunriseAlarm) {
          alarmService.updateSunriseAlarm(true, newLocation.latitude, newLocation.longitude);
        }
      } else {
        console.log('Using fallback location - no data returned');
        // Only use fallback if we don't already have a location
        if (!targetLocation) {
          const fallbackLocation = parseUrlOrCoords("https://www.google.com/maps/@12.308367,76.645467,17z");
          setTargetLocation(fallbackLocation);
          setLocationName("Default Location");
          setError('Using fallback location - no data returned');
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch target location:', err);
      // Only use fallback if we don't already have a location
      if (!targetLocation) {
        const fallbackLocation = parseUrlOrCoords("https://www.google.com/maps/@12.308367,76.645467,17z");
        setTargetLocation(fallbackLocation);
        setLocationName("Default Location");
        setError(`Error: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Initial fetch and setup interval for periodic updates
  useEffect(() => {
    // Initial fetch
    fetchLocation();
    
    // Set up interval to fetch location every 10 seconds
    locationIntervalRef.current = setInterval(() => {
      fetchLocation(false); // Don't show loading indicator for periodic updates
    }, LOCATION_REFRESH_INTERVAL);
    
    // Clean up interval on component unmount
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

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

  // Play / pause audio depending on alignment and settings
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound || !musicAutoplay) {
      return;
    }

    if (isAligned) {
      console.log('🎵 Playing darshan audio...');
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
  }, [isAligned, musicAutoplay]);

  // Handle sunrise alarm changes
  useEffect(() => {
    if (targetLocation) {
      alarmService.updateSunriseAlarm(sunriseAlarm, targetLocation.latitude, targetLocation.longitude);
    }
  }, [sunriseAlarm, targetLocation]);

  // Calculate and display next sunrise/sunset using new API
  useEffect(() => {
    const getSunEvent = async () => {
      if (targetLocation) {
        try {
          console.log('Calculating sun times for:', targetLocation);
          // Get today's sun times (cached after first call)
          const sunTimes = await calculateSunTimes(targetLocation.latitude, targetLocation.longitude);
          console.log('Sun times calculated:', sunTimes);
          
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
    console.log('Alignment changed:', aligned);
    setIsAligned(aligned);
  };

  // Function to manually retry fetching location
  const retryFetchLocation = () => {
    setError(null);
    fetchLocation(true);
  };

  // Function to open Google Maps
  const openGoogleMaps = () => {
    if (targetLocation) {
      const url = `https://www.google.com/maps/@${targetLocation.latitude},${targetLocation.longitude},17z`;
      Linking.openURL(url);
    }
  };

  // Handle sunrise alarm toggle
  const handleSunriseAlarmChange = (enabled: boolean) => {
    setSunriseAlarm(enabled);
    if (enabled) {
      Alert.alert(
        'Sunrise Alarm Enabled',
        'You will receive a notification at sunrise based on Appaji\'s location.',
        [{ text: 'OK' }]
      );
    }
  };

  // Format the last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return '';
    
    const hours = lastUpdated.getHours().toString().padStart(2, '0');
    const minutes = lastUpdated.getMinutes().toString().padStart(2, '0');
    const seconds = lastUpdated.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };

  // Render different screens based on active tab
  const renderScreen = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <SettingsScreen
            onBack={() => setActiveTab('home')}
            onRefreshLocation={retryFetchLocation}
            onOpenMaps={openGoogleMaps}
            musicAutoplay={musicAutoplay}
            onMusicAutoplayChange={setMusicAutoplay}
            sunriseAlarm={sunriseAlarm}
            onSunriseAlarmChange={handleSunriseAlarmChange}
          />
        );
      case 'home':
      default:
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
              {targetLocation && (
                <View>
                  <Text style={styles.locationText}>
                    Location: {locationName}
                  </Text>
                  {lastUpdated && (
                    <Text style={styles.updatedText}>
                      Updated: {getLastUpdatedText()}
                    </Text>
                  )}
                </View>
              )}
              {error && (
                <TouchableOpacity onPress={retryFetchLocation}>
                  <Text style={styles.errorText}>{error} (Tap to retry)</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Loading indicator */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Fetching Appaji's location...</Text>
              </View>
            ) : (
              /* Compass Component */
              targetLocation && (
                <SimpleCompassView 
                  targetLocation={targetLocation}
                  onAlignmentChange={handleAlignmentChange}
                />
              )
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
  };

  return (
    <View style={styles.appContainer}>
      {renderScreen()}
      {activeTab !== 'settings' && (
        <BottomNavigation 
          activeTab={activeTab} 
          onTabPress={setActiveTab} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 20, 40, 0.95)',
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
  sunEventText: {
    fontSize: 18,
    color: '#E6E6FA',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 16,
    color: '#A0A0FF',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  updatedText: {
    fontSize: 12,
    color: '#8080FF',
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#E6E6FA',
    textAlign: 'center',
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
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default App;