/**
 * @format
 */

import 'react-native';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { describe, it, expect } from '@jest/globals';

import CompassPreview from '../components/walkthroughPreviews/CompassPreview';
import {
  TEXT_TURN_RIGHT,
  WALKTHROUGH_PREVIEW_TARGET_DEG,
} from '../constants';
import { ThemeMode } from '../types';

// Collect every bit of visible text in the rendered tree. RN <Text> exposes its
// content as string children; react-native-svg <Text> renders the content as a
// `content` prop on an RNSVGTSpan node, so pull both.
const collectText = (node: any): string[] => {
  if (node == null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (typeof node !== 'object') return [];
  const out: string[] = [];
  if (node.type === 'RNSVGTSpan' && node.props?.content != null) {
    out.push(String(node.props.content));
  }
  if (node.children) out.push(...collectText(node.children));
  return out;
};

const THEMES: ThemeMode[] = ['cosmic', 'dark', 'light'];

describe('CompassPreview (walkthrough)', () => {
  it('renders on every theme without crashing', () => {
    THEMES.forEach((theme) => {
      let tree: renderer.ReactTestRenderer | undefined;
      act(() => {
        tree = renderer.create(<CompassPreview theme={theme} />);
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    });
  });

  it('shows the rotation guidance: a turn direction and the target bearing', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<CompassPreview theme="cosmic" />);
    });
    const texts = collectText(tree!.toJSON());

    // The pill tells the user which way to rotate (default sample turns right).
    expect(texts).toContain(TEXT_TURN_RIGHT);
    // The sacred-direction bearing is shown in the hub readout.
    expect(texts.some((t) => t.includes(`${WALKTHROUGH_PREVIEW_TARGET_DEG}°`))).toBe(true);
    // The compass dial is drawn with all four cardinals.
    ['N', 'E', 'S', 'W'].forEach((d) => expect(texts).toContain(d));

    act(() => tree!.unmount());
  });
});
