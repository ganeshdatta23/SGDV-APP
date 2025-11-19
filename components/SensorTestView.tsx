import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CompassView from './CompassView';

const SensorTestView = () => {
  const [sensorType, setSensorType] = useState<'rotation' | 'magnetometer'>('rotation');
  const [targetHeading, setTargetHeading] = useState(45);

  const switchSensor = () => {
    setSensorType(prev => prev === 'rotation' ? 'magnetometer' : 'rotation');
  };

  const changeTarget = () => {
    setTargetHeading(prev => (prev + 45) % 360);
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={switchSensor}>
          <Text style={styles.buttonText}>
            Switch to {sensorType === 'rotation' ? 'Magnetometer' : 'Rotation Vector'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={changeTarget}>
          <Text style={styles.buttonText}>
            Change Target ({targetHeading}°)
          </Text>
        </TouchableOpacity>
      </View>

      <CompassView
        targetHeading={targetHeading}
        sensorType={sensorType}
        onAlignmentChange={(aligned) => {
          console.log(`Alignment changed: ${aligned}`);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  controls: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
    flex: 0.48,
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SensorTestView; 