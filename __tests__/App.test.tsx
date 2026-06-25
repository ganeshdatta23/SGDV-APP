/**
 * @format
 */

import 'react-native';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { it, jest } from '@jest/globals';

import App from '../App';

// App starts timers, AppState/Linking listeners and async native calls in its
// effects. Use fake timers, flush effects inside act(), then unmount so none of
// that work runs after Jest tears the environment down (which would otherwise
// crash the run even though the assertion passes).
jest.useFakeTimers();

it('renders correctly', async () => {
  let tree: renderer.ReactTestRenderer | undefined;

  await act(async () => {
    tree = renderer.create(<App />);
  });

  await act(async () => {
    tree?.unmount();
  });
});
