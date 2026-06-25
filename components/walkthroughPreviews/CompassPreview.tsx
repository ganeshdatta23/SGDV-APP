import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode } from '../../types';
import {
  COMPASS_THEMES,
  TEXT_HEADING,
  TEXT_TURN_RIGHT,
  TEXT_TURN_LEFT,
  WALKTHROUGH_PREVIEW_HEADING_DEG,
  WALKTHROUGH_PREVIEW_TARGET_DEG,
} from '../../constants';

/**
 * Static mini compass dial mirroring CompassView, but built to *teach the
 * rotation*: the white phone marker sits at the top (where you're facing now),
 * the gold pointer marks the sacred direction off to the side, and a curved
 * gold arrow sweeps between them so it's obvious which way — and how far — to
 * turn. No magnetometer / reanimated — just plain react-native-svg.
 */
const SIZE = 220;
const C = SIZE / 2;
const DIAL_R = 96;
const HUB_R = 50;

const CARDINALS: [string, number][] = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['W', 270],
];

// Phone faces HEADING (north-up → N stays at the top); the sacred direction is
// TARGET. DELTA is the signed shortest turn [-180,180]; ≥0 means rotate right.
const HEADING = WALKTHROUGH_PREVIEW_HEADING_DEG;
const TARGET = WALKTHROUGH_PREVIEW_TARGET_DEG;
const DELTA = ((TARGET - HEADING + 540) % 360) - 180;
const ROTATE_RIGHT = DELTA >= 0;

// Polar → screen point. `angleDeg` is measured clockwise from the top (N).
const polar = (angleDeg: number, r: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
};

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

  // Curved rotation arrow: an arc near the rim from just past the top marker to
  // just before the target pointer, plus an arrowhead at the leading end.
  const arcR = DIAL_R - 22;
  const gap = 8; // degrees of breathing room at each end
  const startA = ROTATE_RIGHT ? gap : -gap;
  const endA = DELTA - (ROTATE_RIGHT ? gap : -gap);
  const arcStart = polar(startA, arcR);
  const arcEnd = polar(endA, arcR);
  const sweepFlag = ROTATE_RIGHT ? 1 : 0;
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`;

  // Arrowhead oriented along the arc's tangent at the leading (target) end.
  const dir = ROTATE_RIGHT ? 1 : -1;
  const headRad = (endA * Math.PI) / 180;
  const tx = Math.cos(headRad) * dir;
  const ty = Math.sin(headRad) * dir;
  const px = -ty;
  const py = tx;
  const tip = polar(endA + dir * 5, arcR);
  const HL = 13;
  const HW = 7;
  const bx = tip.x - tx * HL;
  const by = tip.y - ty * HL;
  const head = `${tip.x},${tip.y} ${bx + px * HW},${by + py * HW} ${bx - px * HW},${by - py * HW}`;

  // Gold pointer at the rim marking the sacred direction (points inward).
  const tIn = polar(DELTA, DIAL_R - 34);
  const toL = polar(DELTA - 6, DIAL_R - 6);
  const toR = polar(DELTA + 6, DIAL_R - 6);
  const targetPointer = `${tIn.x},${tIn.y} ${toL.x},${toL.y} ${toR.x},${toR.y}`;

  // Fixed phone marker at the top — the direction you're facing right now.
  const phoneMarker = `${C},${C - DIAL_R + 10} ${C - 8},${C - DIAL_R - 10} ${C + 8},${C - DIAL_R - 10}`;

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

        {/* Curved rotation arrow (which way + how far to turn) */}
        <Path
          d={arcPath}
          stroke={c.gold}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
        <Polygon points={head} fill={c.gold} />

        {/* Sacred-direction pointer at the rim */}
        <Polygon points={targetPointer} fill={c.gold} stroke={c.dialBackground} strokeWidth={0.5} />

        {/* Phone marker at the top — where you're facing now */}
        <Polygon
          points={phoneMarker}
          fill={c.phoneMarkerFill}
          stroke={c.phoneMarkerStroke}
          strokeWidth={1}
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
          {`${HEADING}°`}
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
          {`▲ ${TARGET}°`}
        </SvgText>
      </Svg>

      <View
        style={[
          styles.pill,
          { backgroundColor: c.turnContainerBg, borderColor: c.turnContainerBorder },
        ]}
      >
        <Ionicons
          name="refresh-outline"
          size={14}
          color={c.gold}
          style={ROTATE_RIGHT ? undefined : styles.flip}
        />
        <Text style={[styles.pillText, { color: c.gold }]}>
          {ROTATE_RIGHT ? TEXT_TURN_RIGHT : TEXT_TURN_LEFT}
        </Text>
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
  flip: {
    transform: [{ scaleX: -1 }],
  },
});

export default CompassPreview;
