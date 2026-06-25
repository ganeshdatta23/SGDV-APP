/**
 * Location sync coordinator
 *
 * Holds the pure trigger-decision logic (decoupled from how the prompt is
 * presented) plus the best-effort orchestration for the weekly lifecycle:
 *  - on app open: purge week-old cache and decide whether to nudge the user to
 *    turn on internet (first install offline, or data stale > 1 week);
 *  - on offline->online: force a fresh fetch so location + sun times (and, via
 *    the App effect that watches targetLocation, the alarms) are refreshed.
 *
 * The decision functions are pure and fully unit-testable; the orchestration is
 * best-effort and never throws (mirrors the app's local-first, non-blocking
 * style).
 */

import { getConnectivity, isOnline } from './connectivity';
import {
  LocationData,
  forceRefreshLocation,
  getLastSyncTimestamp,
  isSyncStale,
  purgeStaleLocationCache,
} from './sgvdApi';

export type SyncPromptReason = 'first-install' | 'stale-week' | null;

/**
 * Pure: decide whether (and why) to prompt the user to turn on internet.
 *   - Online                       -> null (we just sync silently).
 *   - Offline & never synced       -> 'first-install'.
 *   - Offline & last sync > 1 week -> 'stale-week'.
 *   - Otherwise                    -> null.
 * The prompt only ever fires while OFFLINE, so it never races with an online
 * sync advancing `lastSync`.
 */
export function decideSyncPrompt(args: {
  isOnline: boolean;
  lastSync: number | null;
  now?: number;
  staleAfterMs?: number;
}): SyncPromptReason {
  const { isOnline: online, lastSync, now, staleAfterMs } = args;
  if (online) return null;
  if (lastSync == null) return 'first-install';
  if (isSyncStale(lastSync, now, staleAfterMs)) return 'stale-week';
  return null;
}

/**
 * Pure: should an offline->online transition trigger a background re-fetch?
 * True only when we are now online and were not already online (covers the
 * first observed state being online too, where `prevOnline` is null).
 */
export function shouldRefetchOnTransition(
  prevOnline: boolean | null,
  nextOnline: boolean,
): boolean {
  return nextOnline === true && prevOnline !== true;
}

/**
 * Run on app open: purge a week-old cache, then decide whether to show the
 * "turn on internet" prompt. Returns the reason (or null). Best-effort — the
 * actual location fetch is handled by the App's existing mount loader, so this
 * does not fetch (and therefore cannot double-fetch).
 */
export async function evaluateSyncOnOpen(): Promise<SyncPromptReason> {
  try {
    await purgeStaleLocationCache();
    const conn = await getConnectivity();
    const online = isOnline(conn);
    const lastSync = await getLastSyncTimestamp();
    return decideSyncPrompt({ isOnline: online, lastSync });
  } catch (error) {
    console.log('evaluateSyncOnOpen failed (no prompt):', error);
    return null;
  }
}

/**
 * Called by the connectivity listener on an offline->online transition. Forces a
 * fresh fetch (which records the last-sync timestamp on success) and returns the
 * fresh location so the caller can update state and trigger an alarm reschedule.
 * Returns null if the refresh fails.
 */
export async function handleCameOnline(): Promise<LocationData | null> {
  try {
    return await forceRefreshLocation();
  } catch (error) {
    console.log('handleCameOnline refresh failed:', error);
    return null;
  }
}
