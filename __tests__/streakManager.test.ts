/**
 * Unit tests for the local-first streak store. Pure date/streak math plus the
 * persisted record/reconcile flows. AsyncStorage is auto-mocked by jest.setup;
 * the backend client + install id are mocked so nothing hits the network.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as sgvdApi from '../utils/sgvdApi';
import {
  computeStreaksFromDates,
  milestoneFor,
  localDateKey,
  getPendingSharePrompt,
  recordSunriseDarshanCompletion,
  markMilestoneShared,
  dismissSharePrompt,
  reconcileWithBackend,
  resetStreakForTesting,
  getStreakState,
} from '../utils/streakManager';

jest.mock('../utils/sgvdApi', () => ({
  __esModule: true,
  getStreakFromBackend: jest.fn(),
  postSunriseCompletion: jest.fn(),
}));

jest.mock('../utils/installId', () => ({
  __esModule: true,
  getInstallId: jest.fn().mockResolvedValue('test-install'),
}));

const mockedApi = sgvdApi as jest.Mocked<typeof sgvdApi>;

// Build a 'YYYY-MM-DD' key relative to today (for reconcile tests).
const keyOffset = (deltaDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return localDateKey(d);
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await resetStreakForTesting();
});

describe('computeStreaksFromDates', () => {
  it('returns zeros for no dates', () => {
    expect(computeStreaksFromDates([], '2026-06-03')).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it('counts consecutive days ending today', () => {
    const r = computeStreaksFromDates(['2026-06-01', '2026-06-02', '2026-06-03'], '2026-06-03');
    expect(r).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it('keeps the streak alive when only yesterday is present (today not done yet)', () => {
    const r = computeStreaksFromDates(['2026-06-01', '2026-06-02'], '2026-06-03');
    expect(r.currentStreak).toBe(2);
  });

  it('breaks the current streak on a skipped day but keeps the longest', () => {
    const r = computeStreaksFromDates(
      ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-05', '2026-06-06'],
      '2026-06-06',
    );
    expect(r.currentStreak).toBe(2);
    expect(r.longestStreak).toBe(3);
  });

  it('current is 0 when the latest completion is older than yesterday', () => {
    const r = computeStreaksFromDates(['2026-06-01'], '2026-06-05');
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(1);
  });

  it('handles unordered, duplicate input', () => {
    const r = computeStreaksFromDates(
      ['2026-06-03', '2026-06-01', '2026-06-02', '2026-06-02'],
      '2026-06-03',
    );
    expect(r).toEqual({ currentStreak: 3, longestStreak: 3 });
  });
});

describe('milestoneFor', () => {
  it('returns the milestone for 1/3/7 only', () => {
    expect(milestoneFor(1)).toBe(1);
    expect(milestoneFor(3)).toBe(3);
    expect(milestoneFor(7)).toBe(7);
  });
  it('returns null for non-milestones (incl. day 2)', () => {
    [0, 2, 4, 5, 6, 8].forEach((n) => expect(milestoneFor(n)).toBeNull());
  });
});

describe('localDateKey', () => {
  it('formats the device-local date zero-padded', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31, 1, 0))).toBe('2026-12-31');
  });
});

describe('recordSunriseDarshanCompletion', () => {
  it('increments across consecutive days and emits milestones at 1 and 3 (not 2)', async () => {
    const d1 = await recordSunriseDarshanCompletion(new Date(2026, 5, 1));
    expect(d1.state.currentStreak).toBe(1);
    expect(d1.newlyReachedMilestone).toBe(1);

    const d2 = await recordSunriseDarshanCompletion(new Date(2026, 5, 2));
    expect(d2.state.currentStreak).toBe(2);
    expect(d2.newlyReachedMilestone).toBeNull(); // day 2 is not a milestone

    const d3 = await recordSunriseDarshanCompletion(new Date(2026, 5, 3));
    expect(d3.state.currentStreak).toBe(3);
    expect(d3.newlyReachedMilestone).toBe(3);
    expect(d3.state.longestStreak).toBe(3);
    expect(d3.state.milestonesCelebrated).toEqual([1, 3]);
  });

  it('is idempotent within the same day', async () => {
    await recordSunriseDarshanCompletion(new Date(2026, 5, 1));
    const again = await recordSunriseDarshanCompletion(new Date(2026, 5, 1, 9, 0));
    expect(again.newlyReachedMilestone).toBeNull();
    expect(again.state.currentStreak).toBe(1);
    expect(again.state.completionDates).toEqual(['2026-06-01']);
  });

  it('resets the current streak after a gap but preserves the longest', async () => {
    await recordSunriseDarshanCompletion(new Date(2026, 5, 1));
    await recordSunriseDarshanCompletion(new Date(2026, 5, 2));
    await recordSunriseDarshanCompletion(new Date(2026, 5, 3)); // streak 3
    const after = await recordSunriseDarshanCompletion(new Date(2026, 5, 5)); // gap on the 4th
    expect(after.state.currentStreak).toBe(1);
    expect(after.state.longestStreak).toBe(3);
    expect(after.newlyReachedMilestone).toBeNull(); // milestone 1 already celebrated
  });
});

describe('share-prompt state', () => {
  it('exposes the highest un-shared/un-dismissed celebrated milestone, cleared by share/dismiss', async () => {
    await recordSunriseDarshanCompletion(new Date(2026, 5, 1)); // celebrates 1
    expect(getPendingSharePrompt(await getStreakState())).toBe(1);

    await recordSunriseDarshanCompletion(new Date(2026, 5, 2));
    await recordSunriseDarshanCompletion(new Date(2026, 5, 3)); // celebrates 3
    expect(getPendingSharePrompt(await getStreakState())).toBe(3); // highest

    await dismissSharePrompt(3);
    expect(getPendingSharePrompt(await getStreakState())).toBe(1); // falls back to 1

    await markMilestoneShared(1);
    expect(getPendingSharePrompt(await getStreakState())).toBeNull();
  });
});

describe('reconcileWithBackend', () => {
  it('unions remote dates, recomputes, and stays silent (no pending pill for past milestones)', async () => {
    mockedApi.getStreakFromBackend.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 3,
      lastCompletionDate: keyOffset(0),
      completionDates: [keyOffset(-2), keyOffset(-1), keyOffset(0)],
    });

    const state = await reconcileWithBackend();
    expect(state.currentStreak).toBe(3);
    expect(state.longestStreak).toBe(3);
    // Milestones discovered via reconcile are pre-marked → no surprise pill.
    expect(state.milestonesCelebrated).toEqual(expect.arrayContaining([1, 3]));
    expect(getPendingSharePrompt(state)).toBeNull();
    // Server already matched our streak → no re-push.
    expect(mockedApi.postSunriseCompletion).not.toHaveBeenCalled();
  });

  it('keeps local state and pushes the latest when the server is unreachable', async () => {
    await recordSunriseDarshanCompletion(new Date()); // local streak of 1 today
    mockedApi.getStreakFromBackend.mockResolvedValue(null);

    const state = await reconcileWithBackend();
    expect(state.currentStreak).toBe(1);
    expect(mockedApi.postSunriseCompletion).toHaveBeenCalledWith('test-install', localDateKey());
  });
});
