import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, StatusBar } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SettingsScreenProps {
  onBack: () => void;
  onRefreshLocation: () => void;
  onOpenMaps: () => void;
  musicAutoplay: boolean;
  onMusicAutoplayChange: (value: boolean) => void;
  sunriseAlarm: boolean;
  onSunriseAlarmChange: (value: boolean) => void;
}

const ArrowLeft = () => (
  <Svg width="24" height="24" viewBox="0 0 256 256" fill="#121517">
    <Path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </Svg>
);

const ArrowClockwise = () => (
  <Svg width="24" height="24" viewBox="0 0 256 256" fill="#121517">
    <Path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z"/>
  </Svg>
);

const MapPin = () => (
  <Svg width="24" height="24" viewBox="0 0 256 256" fill="#121517">
    <Path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"/>
  </Svg>
);

export default function SettingsScreen({ 
  onBack, 
  onRefreshLocation, 
  onOpenMaps, 
  musicAutoplay, 
  onMusicAutoplayChange,
  sunriseAlarm,
  onSunriseAlarmChange
}: SettingsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Music Autoplay</Text>
            <Text style={styles.settingDescription}>Automatically play music when aligned with Appaji</Text>
          </View>
          <Switch
            value={musicAutoplay}
            onValueChange={onMusicAutoplayChange}
            trackColor={{ false: '#f1f3f4', true: '#add6ea' }}
            thumbColor="white"
            style={styles.switch}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Sunrise Alarm</Text>
            <Text style={styles.settingDescription}>Get notified at sunrise based on Appaji's location</Text>
          </View>
          <Switch
            value={sunriseAlarm}
            onValueChange={onSunriseAlarmChange}
            trackColor={{ false: '#f1f3f4', true: '#add6ea' }}
            thumbColor="white"
            style={styles.switch}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Location Update Frequency</Text>
            <Text style={styles.settingDescription}>How often the app updates Appaji's location</Text>
          </View>
          <Text style={styles.settingValue}>Every 10 seconds</Text>
        </View>

        {/* Actions Section */}
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={onRefreshLocation}>
          <Text style={styles.actionTitle}>Refresh Appaji's Location</Text>
          <ArrowClockwise />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onOpenMaps}>
          <Text style={styles.actionTitle}>Open Appaji's Google Maps</Text>
          <MapPin />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#121517',
    textAlign: 'center',
    marginRight: 48,
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#121517',
    marginTop: 20,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    minHeight: 72,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#121517',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#677a83',
    lineHeight: 20,
  },
  settingValue: {
    fontSize: 16,
    color: '#121517',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    minHeight: 56,
  },
  actionTitle: {
    fontSize: 16,
    color: '#121517',
    flex: 1,
  },
});