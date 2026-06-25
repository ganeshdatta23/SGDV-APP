import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { ThemeMode } from '../../types';
import { APP_BACKGROUNDS } from '../../constants';

/**
 * Welcome slide preview: mirrors the "aligned darshan" moment — the same
 * Swamiji figure DarshanOverlay shows, glowing on a static gold aura (the aura
 * stop colors are lifted from DarshanOverlay). Intentionally STATIC (no pulsing
 * Animated.loop) because it renders inside the first-run Modal.
 */
const SIZE = 240;

const WelcomePreview: React.FC<{ theme: ThemeMode }> = ({ theme }) => {
  const bg = APP_BACKGROUNDS[theme];
  return (
    <View
      style={[
        styles.card,
        { borderColor: bg.modalBorder, backgroundColor: bg.modalBg },
      ]}
    >
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="welcomeAura" cx="50%" cy="50%" r="50%">
            <Stop offset="0.12" stopColor="#fcd34d" stopOpacity="0.85" />
            <Stop offset="0.45" stopColor="#fbbf24" stopOpacity="0.5" />
            <Stop offset="0.75" stopColor="#b45309" stopOpacity="0.3" />
            <Stop offset="1" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#welcomeAura)" />
      </Svg>
      <Image
        // The real darshan figure used by DarshanOverlay when the compass aligns.
        source={require('../../assets/images/swamiji-darshan.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SIZE,
    height: SIZE,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  image: {
    width: SIZE * 0.62,
    height: SIZE * 0.84,
  },
});

export default WelcomePreview;
