/**
 * Sunrise darshan streak — local-first store.
 *
 * The streak is computed and persisted ON-DEVICE (AsyncStorage) so it updates
 * instantly and works fully offline; this local copy is the source of truth that
 * drives the celebration UI. Each completion is also mirrored to the backend
 * (keyed by the anonymous install id) and reconciled on app open so a reinstall
 * or data-clear can recover and the server stays in sync.
 *
 * "Today" is the DEVICE-LOCAL calendar day (the temple is used in IST). We
 * deliberately format with local getters rather than toISOString() — the latter
 * is UTC and would roll the day over at 05:30 IST.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakState } from '../types';
import { STREAK_MILESTONES, STREAK_STATE_KEY } from '../constants';
import { getInstallId } from './installId';
import { getStreakFromBackend, postSunriseCompletion } from './sgvdApi';

const SCHEMA_VERSION = 1;
const MAX_STORED_DATES = 400; // bound the persisted blob

// Memoized so repeated reads within a session don't re-hit AsyncStorage.
let cachedState: StreakState | null = null;

const defaultStreakState = (): StreakState => ({
  currentStreak: 0,
  longestStreak: 0,
  lastCompletionDate: null,
  completionDates: [],
  milestonesCelebrated: [],
  milestonesShared: [],
  sharePromptDismissed: [],
  schemaVersion: SCHEMA_VERSION,
});

// ============================================================================
// PURE DATE / STREAK HELPERS (also unit-tested directly)
// ============================================================================

/** Device-local calendar date as 'YYYY-MM-DD' (NOT UTC). */
export const localDateKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Whole-day number for a 'YYYY-MM-DD' key (integer; adjacent days differ by 1). */
const dayNumber = (key: string): number => {
  const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};

const sortedUnique = (dates: string[]): string[] =>
  Array.from(new Set(dates)).sort();

/**
 * Compute (currentStreak, longestStreak) from a set of completion-date keys.
 * - longest: the longest run of consecutive days anywhere in history.
 * - current: the run ending on today, or on yesterday (streak still alive,
 *   today's darshan not done yet); 0 if the latest completion is older.
 */
export const computeStreaksFromDates = (
  dates: string[],
  todayKey: string,
): { currentStreak: number; longestStreak: number } => {
  const nums = sortedUnique(dates).map(dayNumber);
  if (nums.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Longest run anywhere.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === nums[i - 1] + 1) {
      run += 1;
    } else if (nums[i] !== nums[i - 1]) {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  // Current run, anchored at today or yesterday.
  const set = new Set(nums);
  const today = dayNumber(todayKey);
  let anchor: number | null = null;
  if (set.has(today)) anchor = today;
  else if (set.has(today - 1)) anchor = today - 1;

  let current = 0;
  if (anchor !== null) {
    let k = anchor;
    while (set.has(k)) {
      current += 1;
      k -= 1;
    }
  }

  return { currentStreak: current, longestStreak: longest };
};

/** The milestone a streak length equals (1/3/7), or null. */
export const milestoneFor = (streak: number): number | null =>
  STREAK_MILESTONES.includes(streak) ? streak : null;

/** Highest celebrated milestone not yet shared or dismissed → drives the pill. */
export const getPendingSharePrompt = (state: StreakState | null): number | null => {
  if (!state) return null;
  const pending = state.milestonesCelebrated
    .filter((m) => !state.milestonesShared.includes(m) && !state.sharePromptDismissed.includes(m))
    .sort((a, b) => b - a);
  return pending.length > 0 ? pending[0] : null;
};

// ============================================================================
// PERSISTENCE
// ============================================================================

const persist = async (state: StreakState): Promise<void> => {
  cachedState = state;
  try {
    await AsyncStorage.setItem(STREAK_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.log('streakManager: persist failed:', error);
  }
};

/** Read the persisted streak state, normalizing missing fields to defaults. */
export const getStreakState = async (): Promise<StreakState> => {
  if (cachedState) return cachedState;
  try {
    const raw = await AsyncStorage.getItem(STREAK_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StreakState>;
      cachedState = { ...defaultStreakState(), ...parsed };
      return cachedState;
    }
  } catch (error) {
    console.log('streakManager: read failed, using fresh state:', error);
  }
  cachedState = defaultStreakState();
  return cachedState;
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Record a sunrise darshan for the given day (default: now). Idempotent per
 * local day. Returns the updated state and, when the streak length newly equals
 * a milestone (1/3/7) that hasn't been celebrated yet, that milestone — the
 * caller uses it to pop the celebration once.
 */
export const recordSunriseDarshanCompletion = async (
  date: Date = new Date(),
): Promise<{ state: StreakState; newlyReachedMilestone: number | null }> => {
  const state = await getStreakState();
  const today = localDateKey(date);

  // Idempotent: already counted today → no increment, no re-celebration.
  if (state.completionDates.includes(today)) {
    return { state, newlyReachedMilestone: null };
  }

  const completionDates = sortedUnique([...state.completionDates, today]).slice(-MAX_STORED_DATES);
  const { currentStreak, longestStreak } = computeStreaksFromDates(completionDates, today);

  const milestone = milestoneFor(currentStreak);
  const newlyReachedMilestone =
    milestone !== null && !state.milestonesCelebrated.includes(milestone) ? milestone : null;

  const next: StreakState = {
    ...state,
    currentStreak,
    longestStreak: Math.max(longestStreak, state.longestStreak),
    lastCompletionDate: completionDates[completionDates.length - 1],
    completionDates,
    milestonesCelebrated:
      newlyReachedMilestone !== null
        ? [...state.milestonesCelebrated, newlyReachedMilestone]
        : state.milestonesCelebrated,
  };

  await persist(next);
  return { state: next, newlyReachedMilestone };
};

/** Mark a milestone as shared (clears its pending pill). */
export const markMilestoneShared = async (milestone: number): Promise<StreakState> => {
  const state = await getStreakState();
  if (state.milestonesShared.includes(milestone)) return state;
  const next = { ...state, milestonesShared: [...state.milestonesShared, milestone] };
  await persist(next);
  return next;
};

/** Dismiss the contextual share pill for a milestone without sharing. */
export const dismissSharePrompt = async (milestone: number): Promise<StreakState> => {
  const state = await getStreakState();
  if (state.sharePromptDismissed.includes(milestone)) return state;
  const next = { ...state, sharePromptDismissed: [...state.sharePromptDismissed, milestone] };
  await persist(next);
  return next;
};

/**
 * Reconcile local state with the backend on app open: union the completion
 * dates, recompute streaks deterministically, persist, and best-effort push the
 * latest completion back if the server is behind. Silent — never emits a
 * celebration (milestones discovered via reconcile are pre-marked so neither the
 * modal nor the pill fires for already-passed days).
 */
export const reconcileWithBackend = async (): Promise<StreakState> => {
  const local = await getStreakState();
  let installId: string;
  try {
    installId = await getInstallId();
  } catch {
    return local;
  }

  const remote = await getStreakFromBackend(installId);
  const today = localDateKey();

  // Server unreachable: keep local, best-effort push our latest completion.
  if (!remote) {
    if (local.lastCompletionDate) {
      postSunriseCompletion(installId, local.lastCompletionDate);
    }
    return local;
  }

  const merged = sortedUnique([...local.completionDates, ...(remote.completionDates ?? [])]).slice(
    -MAX_STORED_DATES,
  );
  const { currentStreak, longestStreak } = computeStreaksFromDates(merged, today);

  // Milestones discovered only via the server (not earned locally) are marked
  // celebrated + dismissed so they don't surprise the user with a popup/pill.
  const reconcileDiscovered = STREAK_MILESTONES.filter(
    (m) => m <= currentStreak && !local.milestonesCelebrated.includes(m),
  );

  const next: StreakState = {
    ...local,
    currentStreak,
    longestStreak: Math.max(longestStreak, local.longestStreak, remote.longestStreak ?? 0),
    lastCompletionDate: merged.length > 0 ? merged[merged.length - 1] : local.lastCompletionDate,
    completionDates: merged,
    milestonesCelebrated: sortedUniqueNums([...local.milestonesCelebrated, ...reconcileDiscovered]),
    sharePromptDismissed: sortedUniqueNums([...local.sharePromptDismissed, ...reconcileDiscovered]),
  };

  await persist(next);

  // If we know about completions the server doesn't, push our latest.
  if (next.lastCompletionDate && (remote.currentStreak ?? 0) < currentStreak) {
    postSunriseCompletion(installId, next.lastCompletionDate);
  }

  return next;
};

const sortedUniqueNums = (nums: number[]): number[] =>
  Array.from(new Set(nums)).sort((a, b) => a - b);

/** Dev/E2E helper: wipe streak state. */
export const resetStreakForTesting = async (): Promise<void> => {
  cachedState = null;
  try {
    await AsyncStorage.removeItem(STREAK_STATE_KEY);
  } catch (error) {
    console.log('streakManager: reset failed:', error);
  }
};
