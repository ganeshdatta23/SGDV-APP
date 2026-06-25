/**
 * Connectivity wrapper
 *
 * Hides the connectivity library (expo-network) behind a tiny, normalized API so
 * the rest of the app never imports expo-network directly. Swapping to a
 * different library later (e.g. @react-native-community/netinfo) means changing
 * only this file.
 *
 * Everything is best-effort and defensive: a missing/throwing native module must
 * never crash the app or a Jest/jsdom test, so failures resolve to "unknown but
 * assume online" and listeners degrade to a no-op unsubscribe.
 */

import * as Network from 'expo-network';

export interface ConnectivityState {
  /** There is an active network connection (does not guarantee internet). */
  isConnected: boolean;
  /** Internet is reachable. `null` when the platform can't determine it. */
  isInternetReachable: boolean | null;
}

/**
 * Treat "connected and not-explicitly-unreachable" as online. We only consider
 * the device offline when there's no connection or reachability is definitively
 * false — a `null` reachability (undetermined) is optimistically online, since
 * the actual `fetch` is the final arbiter and the API fallback chain handles a
 * "connected but request failed" case anyway.
 */
export const isOnline = (s: ConnectivityState): boolean =>
  s.isConnected && s.isInternetReachable !== false;

const normalize = (state: Network.NetworkState): ConnectivityState => ({
  isConnected: state?.isConnected ?? false,
  isInternetReachable:
    state?.isInternetReachable === undefined ? null : state.isInternetReachable,
});

/** One-shot snapshot of the current connectivity. */
export async function getConnectivity(): Promise<ConnectivityState> {
  try {
    const state = await Network.getNetworkStateAsync();
    return normalize(state);
  } catch (error) {
    console.log('getConnectivity failed, assuming online:', error);
    return { isConnected: true, isInternetReachable: null };
  }
}

/**
 * Subscribe to connectivity changes. The callback receives a normalized
 * ConnectivityState. Returns an unsubscribe function; on any failure it returns
 * a no-op unsubscribe so callers can always call it safely in cleanup.
 */
export function subscribeConnectivity(
  cb: (state: ConnectivityState) => void,
): () => void {
  try {
    const subscription = Network.addNetworkStateListener((event) => {
      try {
        cb(normalize(event));
      } catch (error) {
        console.log('connectivity listener callback threw:', error);
      }
    });
    return () => {
      try {
        subscription.remove();
      } catch {
        /* ignore */
      }
    };
  } catch (error) {
    console.log('subscribeConnectivity failed (no-op listener):', error);
    return () => {};
  }
}
