/**
 * SGVD Backend API Service
 * Unified module for fetching location data, events, and calculating sun times
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Stable Cloudflare Worker proxy in front of the backend (see backend/cloudflare/).
// The swappable Vercel origin lives behind the Worker's ORIGIN var, so this URL
// never changes even when the backend is redeployed to a new Vercel URL.
const SGVD_API_BASE_URL = 'https://sgvd-proxy.sgvd-datta.workers.dev';
const SGVD_API_URL = `${SGVD_API_BASE_URL}/sgvd/locations/`;
const SGVD_EVENTS_URL = `${SGVD_API_BASE_URL}/sgvd/events/`;
const SGVD_STREAKS_URL = `${SGVD_API_BASE_URL}/sgvd/streaks`;

// Best-effort streak sync timeout — never let a hung request wedge the UI.
const STREAK_REQUEST_TIMEOUT_MS = 6000;

// Fallback location data for Avadhoota Datta Peetham
const FALLBACK_LOCATION = {
  name: "Avadhoota Datta Peetham",
  latitude: 12.308367,
  longitude: 76.645467,
  googleMapsUrl: "https://www.google.com/maps/@12.308367,76.645467,17z"
};

// Fallback sun times (approximate for India)
const FALLBACK_SUNRISE_HOUR = 6;  // 6:00 AM
const FALLBACK_SUNSET_HOUR = 18;  // 6:00 PM

// ============================================================================
// TEST MODE - HARDCODED TIMES FOR TESTING
// ============================================================================
// Set to true to use hardcoded test times (2-3 minutes from now)
// Set to false to use actual API times
const USE_HARDCODED_TEST_TIME = false;

// Get hardcoded test times (2-3 minutes from current time for easy testing)
const getHardcodedTestTimes = (): { sunrise: Date; sunset: Date } => {
  const now = new Date();
  const testSunrise = new Date(now.getTime() + 3 * 60 * 1000); // 2 minutes from now
  const testSunset = new Date(now.getTime() + 4 * 60 * 1000); // 3 minutes from now
  return { sunrise: testSunrise, sunset: testSunset };
};

// Cache validity duration (1 minute in milliseconds)
const CACHE_VALIDITY_MS = 60 * 1000;

// Events cache validity duration (10 minutes in milliseconds)
const EVENTS_CACHE_VALIDITY_MS = 10 * 60 * 1000;
const EVENTS_CACHE_KEY = '@sgvd_events_cache';
const EVENTS_TIMESTAMP_KEY = '@sgvd_events_timestamp';

// Location cache keys for AsyncStorage persistence
const LOCATION_CACHE_KEY = '@sgvd_location_cache';
const LOCATION_TIMESTAMP_KEY = '@sgvd_location_timestamp';

// ============================================================================
// TYPES
// ============================================================================

export interface LocationData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sunrise: Date;
  sunset: Date;
  googleMapsUrl: string;
}

export interface SunCalculationResult {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  nextEvent: Date;
  nextEventType: 'sunrise' | 'sunset';
}

export interface EventData {
  id: string;
  title: string;
  description: string;
  location_name: string;
  event_date: string;
  is_published: boolean;
}

interface CacheEntry {
  location: LocationData;
  sunTimes: SunCalculationResult;
  date: string;
  timestamp: number;
}

// ============================================================================
// CACHE
// ============================================================================

let cache: CacheEntry | null = null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate fallback sunrise/sunset times based on current date
const getFallbackSunTimes = (): { sunrise: Date; sunset: Date } => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  
  const sunrise = new Date(`${dateStr}T0${FALLBACK_SUNRISE_HOUR}:00:00`);
  const sunset = new Date(`${dateStr}T${FALLBACK_SUNSET_HOUR}:00:00`);
  
  return { sunrise, sunset };
};

/**
 * Extract time from API date and apply it to today's date
 * This ensures we always use today's date regardless of what date the API returns
 */
const applyTimeToToday = (apiDateString: string): Date => {
  const apiDate = new Date(apiDateString);
  const today = new Date();
  
  // Extract time components from API date (in UTC)
  const hours = apiDate.getUTCHours();
  const minutes = apiDate.getUTCMinutes();
  const seconds = apiDate.getUTCSeconds();
  
  // Create new date with today's date but API's time (in UTC)
  const result = new Date(Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    hours,
    minutes,
    seconds
  ));
  
  return result;
};

// Calculate solar noon (midpoint between sunrise and sunset)
const calculateSolarNoon = (sunrise: Date, sunset: Date): Date => {
  const midpoint = (sunrise.getTime() + sunset.getTime()) / 2;
  return new Date(midpoint);
};

// Determine next sun event
const determineNextEvent = (
  sunrise: Date,
  sunset: Date
): { nextEvent: Date; nextEventType: 'sunrise' | 'sunset' } => {
  const now = new Date();
  
  // Calculate tomorrow's sunrise and sunset
  const tomorrowSunrise = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowSunset = new Date(sunset.getTime() + 24 * 60 * 60 * 1000);
  
  // Collect all future events (today and tomorrow)
  const futureEvents: Array<{ time: Date; type: 'sunrise' | 'sunset' }> = [];
  
  // Today's sunrise
  if (sunrise > now) {
    futureEvents.push({ time: sunrise, type: 'sunrise' });
  }
  
  // Today's sunset
  if (sunset > now) {
    futureEvents.push({ time: sunset, type: 'sunset' });
  }
  
  // Tomorrow's sunrise
  if (tomorrowSunrise > now) {
    futureEvents.push({ time: tomorrowSunrise, type: 'sunrise' });
  }
  
  // Tomorrow's sunset
  if (tomorrowSunset > now) {
    futureEvents.push({ time: tomorrowSunset, type: 'sunset' });
  }
  
  // If no future events found (shouldn't happen, but fallback)
  if (futureEvents.length === 0) {
    return { nextEvent: tomorrowSunrise, nextEventType: 'sunrise' };
  }
  
  // Find the nearest event
  const nearestEvent = futureEvents.reduce((closest, current) => {
    return current.time < closest.time ? current : closest;
  });
  
  return { nextEvent: nearestEvent.time, nextEventType: nearestEvent.type };
};

// Helper function to format time for display
export function formatSunTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Check if cache is valid
const isCacheValid = (): boolean => {
  if (!cache) return false;
  
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  
  // Cache is valid if: same day AND within validity period
  const isSameDay = cache.date === today;
  const isWithinTime = (now - cache.timestamp) < CACHE_VALIDITY_MS;
  
  if (!isSameDay) {
    console.log('Cache invalid: different day', { cached: cache.date, today });
  }
  
  return isSameDay && isWithinTime;
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Helper function to check if an error is a network error
 */
const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    // TypeError usually indicates network issues (no connection, DNS failure, etc.)
    const message = error.message.toLowerCase();
    return message.includes('network request failed') || 
           message.includes('failed to fetch') ||
           message.includes('network') ||
           message.includes('timeout') ||
           message.includes('connection');
  }
  
  // Also check if error is a string (some React Native versions throw strings)
  if (typeof error === 'string') {
    const message = error.toLowerCase();
    return message.includes('network') || 
           message.includes('failed to fetch') ||
           message.includes('timeout') ||
           message.includes('connection');
  }
  
  // Check if error has a message property
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message).toLowerCase();
    return message.includes('network') || 
           message.includes('failed to fetch') ||
           message.includes('timeout') ||
           message.includes('connection');
  }
  
  return false;
};

/**
 * Helper function to load cached location data
 */
const loadCachedLocation = async (): Promise<LocationData | null> => {
  // Check in-memory cache first
  if (isCacheValid() && cache) {
    console.log('Using in-memory cached location data');
    return cache.location;
  }

  // Check AsyncStorage for persisted cache
  try {
    const cachedLocationStr = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    const cachedTimestamp = await AsyncStorage.getItem(LOCATION_TIMESTAMP_KEY);
    
    if (cachedLocationStr && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp, 10);
      
      if (cacheAge < CACHE_VALIDITY_MS) {
        console.log('Using AsyncStorage cached location data');
        const cachedData = JSON.parse(cachedLocationStr);
        
        // Restore Date objects from ISO strings
        const location: LocationData = {
          ...cachedData,
          sunrise: new Date(cachedData.sunrise),
          sunset: new Date(cachedData.sunset),
        };
        
        // Restore to in-memory cache for faster subsequent access
        await updateCache(location);
        
        return location;
      } else {
        console.log('AsyncStorage cache expired');
      }
    }
  } catch (error) {
    console.warn('Failed to read from AsyncStorage:', error);
  }
  
  return null;
};

/**
 * Fetches location data from SGVD Backend API
 * Fallback chain: API -> Cache -> Hardcoded fallback
 * Returns location info including name, coordinates, sunrise/sunset times
 */
export const fetchLocationDirect = async (): Promise<LocationData> => {
  // STEP 1: Try API first
  try {
    console.log('🌐 STEP 1: Fetching location data from API...');
    
    const response = await fetch(SGVD_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('SGVD API: Response status:', response.status);
    
    if (!response.ok) {
      console.error('SGVD API: Error - Status:', response.status);
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('SGVD API: Raw response:', JSON.stringify(data, null, 2));
    
    // The API returns { results: [...] }
    if (data?.results?.length > 0) {
      const locationData = data.results[0];
      console.log('STEP 1 SUCCESS: Location found from API:', locationData.name);
      
      // Extract time from API and apply to today's date
      // This ignores the date from API and uses only the time portion
      const fallbackTimes = getFallbackSunTimes();
      const sunrise = locationData.sunrise 
        ? applyTimeToToday(locationData.sunrise) 
        : fallbackTimes.sunrise;
      const sunset = locationData.sunset 
        ? applyTimeToToday(locationData.sunset) 
        : fallbackTimes.sunset;
      
      console.log('SGVD API: Time extraction:', {
        apiSunrise: locationData.sunrise,
        appliedSunrise: sunrise.toISOString(),
        apiSunset: locationData.sunset,
        appliedSunset: sunset.toISOString(),
      });
      
      const locationName = locationData.name?.trim() || "Appaji's Location";
      const location: LocationData = {
        name: locationName,
        address: locationName,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        sunrise,
        sunset,
        googleMapsUrl: `https://www.google.com/maps/@${locationData.latitude},${locationData.longitude},17z`
      };
      
      console.log('SGVD API: Location data ready:', {
        name: location.name,
        coords: `${location.latitude}, ${location.longitude}`,
        sunrise: formatSunTime(location.sunrise),
        sunset: formatSunTime(location.sunset)
      });
      
      // Update cache with location data (saves to both in-memory and AsyncStorage)
      await updateCache(location);
      
      return location;
    }
    
    throw new Error('No location found in API response');
  } catch (apiError) {
    // STEP 2: API failed - try internal cache (in-memory + AsyncStorage)
    console.warn('STEP 1 FAILED: API error:', apiError);
    console.log('STEP 2: Checking internal cache...');
    
    try {
      const cachedLocation = await loadCachedLocation();
      
      if (cachedLocation) {
        console.log('STEP 2 SUCCESS: Using cached location data');
        console.log('Cached location:', {
          name: cachedLocation.name,
          coords: `${cachedLocation.latitude}, ${cachedLocation.longitude}`,
          sunrise: formatSunTime(cachedLocation.sunrise),
          sunset: formatSunTime(cachedLocation.sunset)
        });
        return cachedLocation;
      }
      
      console.log('STEP 2 FAILED: No valid cache found');
    } catch (cacheError) {
      console.warn('STEP 2 FAILED: Cache read error:', cacheError);
    }
    
    // STEP 3: Both API and cache failed - use hardcoded fallback
    console.log('STEP 3: Using hardcoded fallback location');
    const fallbackTimes = getFallbackSunTimes();
    const location: LocationData = {
      ...FALLBACK_LOCATION,
      address: FALLBACK_LOCATION.name,
      sunrise: fallbackTimes.sunrise,
      sunset: fallbackTimes.sunset,
    };
    
    console.log('STEP 3 SUCCESS: Fallback location loaded:', {
      name: location.name,
      coords: `${location.latitude}, ${location.longitude}`,
      sunrise: formatSunTime(location.sunrise),
      sunset: formatSunTime(location.sunset)
    });
    
    return location;
  }
};

// Update cache with fresh data (both in-memory and AsyncStorage)
const updateCache = async (location: LocationData): Promise<void> => {
  const { sunrise, sunset } = location;
  const solarNoon = calculateSolarNoon(sunrise, sunset);
  const { nextEvent, nextEventType } = determineNextEvent(sunrise, sunset);
  
  // Update in-memory cache
  cache = {
    location,
    sunTimes: {
      sunrise,
      sunset,
      solarNoon,
      nextEvent,
      nextEventType,
    },
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
  };
  
  // Save to AsyncStorage for persistence
  try {
    const locationToStore = {
      ...location,
      sunrise: location.sunrise.toISOString(),
      sunset: location.sunset.toISOString(),
    };
    
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(locationToStore));
    await AsyncStorage.setItem(LOCATION_TIMESTAMP_KEY, cache.timestamp.toString());
    console.log('Location cached to AsyncStorage');
  } catch (error) {
    console.warn('Failed to save location to AsyncStorage:', error);
  }
};

// ============================================================================
// SUN CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate sun times for a given location
 * Always tries to fetch fresh data from API, uses cache only if network unavailable
 */
export async function calculateSunTimes(
  _latitude?: number,
  _longitude?: number,
  _date: Date = new Date()
): Promise<SunCalculationResult> {
  // ============================================================================
  // TEST MODE: Use hardcoded test times for alarm/notification testing
  // TODO: Remove this block and use API times when ready
  // ============================================================================
  if (USE_HARDCODED_TEST_TIME) {
    console.log('🧪 TEST MODE: Using hardcoded test times for alarms/notifications');
    const { sunrise, sunset } = getHardcodedTestTimes();
    const solarNoon = calculateSolarNoon(sunrise, sunset);
    const { nextEvent, nextEventType } = determineNextEvent(sunrise, sunset);
    
    const result: SunCalculationResult = {
      sunrise,
      sunset,
      solarNoon,
      nextEvent,
      nextEventType,
    };

    console.log('🧪 TEST MODE - Hardcoded sun times:', {
      sunrise: formatSunTime(sunrise),
      sunset: formatSunTime(sunset),
      nextEvent: formatSunTime(nextEvent),
      nextEventType,
    });
    
    return result;
  }
  // ============================================================================
  // END TEST MODE
  // ============================================================================

  try {
    console.log('Fetching sun times from SGVD API');
    
    // Fetch location (which includes sun times) - this also updates the cache
    // fetchLocationDirect now always tries API first, falls back to cache on network errors
    const location = await fetchLocationDirect();
    
    const { sunrise, sunset } = location;
    const solarNoon = calculateSolarNoon(sunrise, sunset);
    const { nextEvent, nextEventType } = determineNextEvent(sunrise, sunset);
    
    const result: SunCalculationResult = {
      sunrise,
      sunset,
      solarNoon,
      nextEvent,
      nextEventType,
    };

    console.log('Sun times calculated:', {
      sunrise: formatSunTime(sunrise),
      sunset: formatSunTime(sunset),
      nextEvent: formatSunTime(nextEvent),
      nextEventType,
    });
    
    return result;
  } catch (error) {
    console.error('Error calculating sun times:', error);
    
    // Try to use cached data if available
    if (isCacheValid() && cache) {
      console.log('Using cached sun times as fallback');
      const { nextEvent, nextEventType } = determineNextEvent(
        cache.sunTimes.sunrise,
        cache.sunTimes.sunset
      );
      return {
        ...cache.sunTimes,
        nextEvent,
        nextEventType,
      };
    }
    
    // Use fallback times
    const { sunrise, sunset } = getFallbackSunTimes();
    const solarNoon = calculateSolarNoon(sunrise, sunset);
    const { nextEvent, nextEventType } = determineNextEvent(sunrise, sunset);
    
    return {
      sunrise,
      sunset,
      solarNoon,
      nextEvent,
      nextEventType,
    };
  }
}

/**
 * Get the next sun event (sunrise or sunset)
 */
export function getNextSunEvent(
  latitude?: number,
  longitude?: number,
  currentTime?: Date
): Promise<{ time: Date; type: 'sunrise' | 'sunset' }> {
  return calculateSunTimes(latitude, longitude, currentTime).then(result => ({
    time: result.nextEvent,
    type: result.nextEventType,
  }));
}

/**
 * Clear the cache (useful for testing or forcing refresh)
 */
export async function cleanCache(): Promise<void> {
  cache = null;
  
  // Clear AsyncStorage cache entries
  try {
    await AsyncStorage.multiRemove([
      LOCATION_CACHE_KEY,
      LOCATION_TIMESTAMP_KEY,
      EVENTS_CACHE_KEY,
      EVENTS_TIMESTAMP_KEY,
    ]);
    console.log('Cache cleared (in-memory and AsyncStorage)');
  } catch (error) {
    console.warn('Failed to clear AsyncStorage cache:', error);
  }
}

// ============================================================================
// EVENTS API
// ============================================================================

/**
 * Fetches events from SGVD Backend API
 * Returns list of published events in descending order (latest first)
 */
export async function fetchEvents(): Promise<EventData[]> {
  // Check AsyncStorage for cached events
  try {
    const cachedEventsStr = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    const cachedTimestamp = await AsyncStorage.getItem(EVENTS_TIMESTAMP_KEY);
    
    if (cachedEventsStr && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp, 10);
      
      if (cacheAge < EVENTS_CACHE_VALIDITY_MS) {
        console.log('Using cached events data (age: ' + Math.floor(cacheAge / 1000) + 's)');
        const cachedEvents = JSON.parse(cachedEventsStr) as EventData[];
        return cachedEvents;
      } else {
        console.log('Events cache expired, fetching fresh data');
      }
    }
  } catch (error) {
    console.warn('Failed to read events from AsyncStorage:', error);
  }

  // Fetch fresh data from API
  try {
    console.log('SGVD API: Fetching events...');
    
    const response = await fetch(SGVD_EVENTS_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('SGVD Events API: Response status:', response.status);
    
    if (!response.ok) {
      console.error('SGVD Events API: Error - Status:', response.status);
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('SGVD Events API: Received', data.length, 'events');
    
    // Cache the fresh events data
    try {
      await AsyncStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(EVENTS_TIMESTAMP_KEY, Date.now().toString());
      console.log('Events cached to AsyncStorage');
    } catch (error) {
      console.warn('Failed to cache events to AsyncStorage:', error);
    }
    
    return data as EventData[];
  } catch (error) {
    console.error('SGVD Events API: Error:', error);
    
    // Try to return stale cache if available
    try {
      const cachedEventsStr = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
      if (cachedEventsStr) {
        console.log('Returning stale cached events due to API error');
        return JSON.parse(cachedEventsStr) as EventData[];
      }
    } catch (cacheError) {
      console.warn('Failed to read stale cache:', cacheError);
    }
    
    return [];
  }
}

// ============================================================================
// STREAK API (sunrise darshan streak — local-first, this is the backend mirror)
// ============================================================================

export interface BackendStreak {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  completionDates: string[];
}

/** Small fetch-with-timeout wrapper so a hung streak request never blocks. */
const fetchWithTimeout = async (url: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STREAK_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Record a sunrise darshan completion on the backend (mirror of the local
 * store). Fully best-effort: any failure is logged and swallowed — the local
 * streak is authoritative, so a failed sync never affects the UI.
 */
export async function postSunriseCompletion(
  installId: string,
  dateKey: string,
): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${SGVD_STREAKS_URL}/record`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ install_id: installId, completion_date: dateKey }),
    });
    if (!response.ok) {
      console.log('Streak POST: non-OK status', response.status);
    }
  } catch (error) {
    console.log('Streak POST failed (ignored, local is source of truth):', error);
  }
}

/**
 * Fetch the backend's view of an install's streak for reconciliation. Returns
 * null on any error (caller keeps local state). A brand-new install returns
 * zeros/empty from the backend (200, not 404).
 */
export async function getStreakFromBackend(installId: string): Promise<BackendStreak | null> {
  try {
    const response = await fetchWithTimeout(
      `${SGVD_STREAKS_URL}/${encodeURIComponent(installId)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      console.log('Streak GET: non-OK status', response.status);
      return null;
    }
    const data = await response.json();
    return {
      currentStreak: data?.current_streak ?? 0,
      longestStreak: data?.longest_streak ?? 0,
      lastCompletionDate: data?.last_completion_date ?? null,
      completionDates: Array.isArray(data?.completion_dates) ? data.completion_dates : [],
    };
  } catch (error) {
    console.log('Streak GET failed (ignored, keeping local state):', error);
    return null;
  }
}

