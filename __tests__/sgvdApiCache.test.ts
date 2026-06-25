import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchLocationDirect,
  forceRefreshLocation,
  getLastSyncTimestamp,
  purgeStaleLocationCache,
  cleanCache,
} from '../utils/sgvdApi';
import { LOCATION_CACHE_KEY, LOCATION_TIMESTAMP_KEY } from '../constants';

const DAY = 24 * 60 * 60 * 1000;
const FALLBACK_NAME = 'Avadhoota Datta Peetham';

// Seed a persisted location cache `ageMs` old, with the given sunrise/sunset ISO
// strings (as fetchLocationDirect stores them).
async function seedCache(ageMs: number, sunriseISO: string, sunsetISO: string) {
  await AsyncStorage.setItem(
    LOCATION_CACHE_KEY,
    JSON.stringify({
      name: 'Cached Temple',
      address: 'Cached Temple',
      latitude: 1.23,
      longitude: 4.56,
      sunrise: sunriseISO,
      sunset: sunsetISO,
      googleMapsUrl: 'x',
    }),
  );
  await AsyncStorage.setItem(
    LOCATION_TIMESTAMP_KEY,
    (Date.now() - ageMs).toString(),
  );
}

const okResponse = (results: any[]) => ({
  ok: true,
  status: 200,
  json: async () => ({ results }),
});

const apiLocation = {
  name: 'Live Temple',
  latitude: 9.9,
  longitude: 8.8,
  sunrise: '2024-03-03T01:00:00.000Z',
  sunset: '2024-03-03T12:30:00.000Z',
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await cleanCache(); // reset module-level in-memory cache + keys
  global.fetch = jest.fn() as any;
});

describe('offline cache: re-anchor + serve window', () => {
  it('re-anchors cached sun times to TODAY (so alarms schedule against future times)', async () => {
    // Cached 2 days ago, sunrise stored on an old date at 00:30 UTC.
    await seedCache(2 * DAY, '2020-01-01T00:30:00.000Z', '2020-01-01T13:45:00.000Z');
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    const loc = await fetchLocationDirect();

    expect(loc.name).toBe('Cached Temple'); // served from cache, not fallback
    // Re-anchored from 2020 to ~now (within a day), so alarms schedule against
    // current times rather than the stale day the data was first fetched.
    expect(loc.sunrise.getUTCFullYear()).toBe(new Date().getUTCFullYear());
    expect(Math.abs(loc.sunrise.getTime() - Date.now())).toBeLessThan(2 * DAY);
    // Time-of-day (UTC) preserved exactly from the stored ISO.
    expect(loc.sunrise.getUTCHours()).toBe(0);
    expect(loc.sunrise.getUTCMinutes()).toBe(30);
    expect(loc.sunset.getUTCHours()).toBe(13);
    expect(loc.sunset.getUTCMinutes()).toBe(45);
  });

  it('serves the cache when younger than the 3-day max age', async () => {
    await seedCache(2 * DAY, '2024-01-01T01:00:00.000Z', '2024-01-01T13:00:00.000Z');
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    const loc = await fetchLocationDirect();
    expect(loc.name).toBe('Cached Temple');
  });
});

describe('offline cache: purge past max age', () => {
  it('purges a cache older than 3 days and falls back to the hardcoded location', async () => {
    await seedCache(4 * DAY, '2024-01-01T01:00:00.000Z', '2024-01-01T13:00:00.000Z');
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    const loc = await fetchLocationDirect();
    expect(loc.name).toBe(FALLBACK_NAME);
    // Stale cache keys removed.
    expect(await AsyncStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(LOCATION_TIMESTAMP_KEY)).toBeNull();
  });

  it('purgeStaleLocationCache returns true + clears keys when old, false when fresh', async () => {
    await seedCache(4 * DAY, '2024-01-01T01:00:00.000Z', '2024-01-01T13:00:00.000Z');
    expect(await purgeStaleLocationCache()).toBe(true);
    expect(await AsyncStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();

    await seedCache(1 * DAY, '2024-01-01T01:00:00.000Z', '2024-01-01T13:00:00.000Z');
    expect(await purgeStaleLocationCache()).toBe(false);
    expect(await AsyncStorage.getItem(LOCATION_CACHE_KEY)).not.toBeNull();
  });
});

describe('last-sync timestamp', () => {
  it('is null before any sync', async () => {
    expect(await getLastSyncTimestamp()).toBeNull();
  });

  it('advances on a successful API fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okResponse([apiLocation]));
    const before = Date.now();
    const loc = await fetchLocationDirect();

    expect(loc.name).toBe('Live Temple');
    const ts = await getLastSyncTimestamp();
    expect(ts).not.toBeNull();
    expect(ts as number).toBeGreaterThanOrEqual(before);
  });

  it('does NOT advance when served from cache (offline)', async () => {
    await seedCache(1 * DAY, '2024-01-01T01:00:00.000Z', '2024-01-01T13:00:00.000Z');
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    await fetchLocationDirect();
    expect(await getLastSyncTimestamp()).toBeNull();
  });
});

describe('forceRefreshLocation', () => {
  it('hits the network and returns fresh data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okResponse([apiLocation]));
    const loc = await forceRefreshLocation();
    expect(loc.name).toBe('Live Temple');
    expect(global.fetch as jest.Mock).toHaveBeenCalled();
  });
});
