import { decideSyncPrompt, shouldRefetchOnTransition } from '../utils/locationSync';
import { isSyncStale } from '../utils/sgvdApi';
import { LOCATION_SYNC_STALE_MS } from '../constants';

// Fixed epoch so the pure functions are fully deterministic (no fake timers).
const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('decideSyncPrompt (pure trigger decision)', () => {
  it('never prompts while online, regardless of last sync', () => {
    expect(decideSyncPrompt({ isOnline: true, lastSync: null })).toBeNull();
    expect(
      decideSyncPrompt({ isOnline: true, lastSync: NOW - 30 * DAY, now: NOW }),
    ).toBeNull();
  });

  it('prompts first-install when offline and never synced', () => {
    expect(decideSyncPrompt({ isOnline: false, lastSync: null })).toBe('first-install');
  });

  it('prompts stale-week when offline and last sync is over a week old', () => {
    expect(
      decideSyncPrompt({ isOnline: false, lastSync: NOW - 8 * DAY, now: NOW }),
    ).toBe('stale-week');
  });

  it('does not prompt when offline but recently synced', () => {
    expect(
      decideSyncPrompt({ isOnline: false, lastSync: NOW - 2 * DAY, now: NOW }),
    ).toBeNull();
  });

  it('treats exactly one week as stale (>= boundary)', () => {
    expect(
      decideSyncPrompt({ isOnline: false, lastSync: NOW - LOCATION_SYNC_STALE_MS, now: NOW }),
    ).toBe('stale-week');
    expect(
      decideSyncPrompt({
        isOnline: false,
        lastSync: NOW - LOCATION_SYNC_STALE_MS + 1,
        now: NOW,
      }),
    ).toBeNull();
  });
});

describe('shouldRefetchOnTransition (pure)', () => {
  it('fires only on a transition into online', () => {
    expect(shouldRefetchOnTransition(null, true)).toBe(true); // first known state online
    expect(shouldRefetchOnTransition(false, true)).toBe(true); // offline -> online
    expect(shouldRefetchOnTransition(true, true)).toBe(false); // already online
    expect(shouldRefetchOnTransition(true, false)).toBe(false); // online -> offline
    expect(shouldRefetchOnTransition(false, false)).toBe(false); // still offline
    expect(shouldRefetchOnTransition(null, false)).toBe(false); // first state offline
  });
});

describe('isSyncStale (pure)', () => {
  it('treats a never-synced (null) state as stale', () => {
    expect(isSyncStale(null, NOW)).toBe(true);
  });

  it('is false for a recent sync and true for an old one', () => {
    expect(isSyncStale(NOW - 2 * DAY, NOW)).toBe(false);
    expect(isSyncStale(NOW - 8 * DAY, NOW)).toBe(true);
  });

  it('uses a >= boundary at exactly staleAfterMs', () => {
    expect(isSyncStale(NOW - LOCATION_SYNC_STALE_MS, NOW)).toBe(true);
    expect(isSyncStale(NOW - LOCATION_SYNC_STALE_MS + 1, NOW)).toBe(false);
  });

  it('honours a custom staleAfterMs', () => {
    expect(isSyncStale(NOW - 2 * DAY, NOW, 1 * DAY)).toBe(true);
    expect(isSyncStale(NOW - 2 * DAY, NOW, 5 * DAY)).toBe(false);
  });
});
