import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode } from '../../types';
import { COMPASS_THEMES, TEXT_HEADING, TEXT_TURN_RIGHT } from '../../constants';

/**
 * Static mini compass dial mirroring CompassView (the dial, tick ring, N/E/S/W
 * labels, center hub readout, gold pointer, and the "ROTATE RIGHT" pill) using
 * the real COMPASS_THEMES palette. No magnetometer / reanimated — just SVG.
 */
const SIZE = 220;
const C = SIZE / 2;
const DIAL_R = 96;
const HUB_R = 50;

const CARDINALS: Array<[string, number]> = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['W', 270],
];

const CompassPreview: React.FC<{ theme: ThemeMode }> = ({ theme }) => {
  const c = COMPASS_THEMES[theme];

  // Tick ring: one tick every 30°; cardinals (every 90°) drawn longer/major.
  const ticks = [];
  for (let a = 0; a < 360; a += 30) {
    const isCardinal = a % 90 === 0;
    const rad = ((a - 90) * Math.PI) / 180;
    const outer = DIAL_R - 5;
    const inner = outer - (isCardinal ? 14 : 8);
    ticks.push(
      <Line
        key={a}
        x1={C + outer * Math.cos(rad)}
        y1={C + outer * Math.sin(rad)}
        x2={C + inner * Math.cos(rad)}
        y2={C + inner * Math.sin(rad)}
        stroke={isCardinal ? c.tickMajor : c.tickMinor}
        strokeWidth={isCardinal ? 2.5 : 1}
      />,
    );
  }

  const labelR = DIAL_R - 30;

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={C}
          cy={C}
          r={DIAL_R}
          fill={c.dialBackground}
          stroke={c.dialStroke}
          strokeWidth={2}
        />
        {ticks}
        {CARDINALS.map(([d, a]) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <SvgText
              key={d}
              x={C + labelR * Math.cos(rad)}
              y={C + labelR * Math.sin(rad) + 5}
              fill={d === 'N' ? c.northColor : c.cardinalColor}
              fontSize={d === 'N' ? 16 : 13}
              fontWeight="bold"
              textAnchor="middle"
            >
              {d}
            </SvgText>
          );
        })}
        {/* Gold pointer toward N */}
        <Path
          d={`M ${C} ${C - 34} L ${C - 9} ${C - 4} L ${C} ${C - 14} L ${C + 9} ${C - 4} Z`}
          fill={c.gold}
        />
        {/* Center hub readout */}
        <Circle
          cx={C}
          cy={C}
          r={HUB_R}
          fill={c.centerHubBg}
          stroke={c.centerHubStroke}
          strokeWidth={1.5}
        />
        <SvgText
          x={C}
          y={C - 13}
          fill={c.headingLabel}
          fontSize={8}
          fontWeight="600"
          textAnchor="middle"
        >
          {TEXT_HEADING}
        </SvgText>
        <SvgText
          x={C}
          y={C + 11}
          fill={c.headingValue}
          fontSize={24}
          fontWeight="bold"
          textAnchor="middle"
        >
          45°
        </SvgText>
        <Line
          x1={C - 22}
          y1={C + 19}
          x2={C + 22}
          y2={C + 19}
          stroke={c.centerHubStroke}
          strokeWidth={1}
        />
        <SvgText x={C} y={C + 33} fill={c.gold} fontSize={10} textAnchor="middle">
          ▲ 45°
        </SvgText>
      </Svg>

      <View
        style={[
          styles.pill,
          { backgroundColor: c.turnContainerBg, borderColor: c.turnContainerBorder },
        ]}
      >
        <Ionicons name="refresh-outline" size={14} color={c.gold} />
        <Text style={[styles.pillText, { color: c.gold }]}>{TEXT_TURN_RIGHT}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    marginTop: 14,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
});

export default CompassPreview;
