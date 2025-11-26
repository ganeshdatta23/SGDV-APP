/**
 * SGVD Backend API Service
 * Unified module for fetching location data, events, and calculating sun times
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SGVD_API_BASE_URL = 'https://sgvd-backend.vercel.app';
const SGVD_API_URL = `${SGVD_API_BASE_URL}/sgvd/locations/`;
const SGVD_EVENTS_URL = `${SGVD_API_BASE_URL}/sgvd/events/`;

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

// Cache validity duration (1 hour in milliseconds)
const CACHE_VALIDITY_MS = 60 * 60 * 1000;

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
  
  if (now < sunrise) {
    return { nextEvent: sunrise, nextEventType: 'sunrise' };
  } else if (now < sunset) {
    return { nextEvent: sunset, nextEventType: 'sunset' };
  } else {
    // Past sunset - estimate tomorrow's sunrise (add 24 hours)
    const tomorrowSunrise = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
    return { nextEvent: tomorrowSunrise, nextEventType: 'sunrise' };
  }
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
  
  return cache.date === today && (now - cache.timestamp) < CACHE_VALIDITY_MS;
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetches location data from SGVD Backend API
 * Returns location info including name, coordinates, sunrise/sunset times
 */
export const fetchLocationDirect = async (): Promise<LocationData> => {
  // Return cached location if valid
  if (isCacheValid() && cache) {
    console.log('📦 Using cached location data');
    return cache.location;
  }

  try {
    console.log('🔍 SGVD API: Fetching location data');
    
    const response = await fetch(SGVD_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 SGVD API: Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ SGVD API: Error - Status:', response.status);
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 SGVD API: Raw response:', JSON.stringify(data, null, 2));
    
    // The API returns { results: [...] }
    if (data?.results?.length > 0) {
      const locationData = data.results[0];
      console.log('📍 SGVD API: Location found:', locationData.name);
      
      // Parse the sunrise/sunset times from ISO strings
      const fallbackTimes = getFallbackSunTimes();
      const sunrise = locationData.sunrise ? new Date(locationData.sunrise) : fallbackTimes.sunrise;
      const sunset = locationData.sunset ? new Date(locationData.sunset) : fallbackTimes.sunset;
      
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
      
      console.log('✅ SGVD API: Location data ready:', {
        name: location.name,
        coords: `${location.latitude}, ${location.longitude}`,
        sunrise: formatSunTime(location.sunrise),
        sunset: formatSunTime(location.sunset)
      });
      
      // Update cache with location data
      updateCache(location);
      
      return location;
    }
    
    throw new Error('No location found in API response');
  } catch (error) {
    console.error('❌ SGVD API: Error:', error);
    console.log('🔄 Using fallback location');
    
    const fallbackTimes = getFallbackSunTimes();
    const location: LocationData = {
      ...FALLBACK_LOCATION,
      address: FALLBACK_LOCATION.name,
      sunrise: fallbackTimes.sunrise,
      sunset: fallbackTimes.sunset,
    };
    
    return location;
  }
};

// Update cache with fresh data
const updateCache = (location: LocationData): void => {
  const { sunrise, sunset } = location;
  const solarNoon = calculateSolarNoon(sunrise, sunset);
  const { nextEvent, nextEventType } = determineNextEvent(sunrise, sunset);
  
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
};

// ============================================================================
// SUN CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate sun times for a given location
 * Uses cached data when available, otherwise fetches from API
 */
export async function calculateSunTimes(
  _latitude?: number,
  _longitude?: number,
  _date: Date = new Date()
): Promise<SunCalculationResult> {
  // Check cache first
  if (isCacheValid() && cache) {
    console.log('📦 Using cached sun times');
    // Recalculate next event as time passes
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

  try {
    console.log('🌐 Fetching sun times from SGVD API');
    
    // Fetch location (which includes sun times) - this also updates the cache
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

    console.log('✅ Sun times calculated:', {
      sunrise: formatSunTime(sunrise),
      sunset: formatSunTime(sunset),
      nextEvent: formatSunTime(nextEvent),
      nextEventType,
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error calculating sun times:', error);
    
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
export function cleanCache(): void {
  cache = null;
  console.log('🧹 Cache cleared');
}

// ============================================================================
// EVENTS API
// ============================================================================

/**
 * Fetches events from SGVD Backend API
 * Returns list of published events in descending order (latest first)
 */
export async function fetchEvents(): Promise<EventData[]> {
  try {
    console.log('📅 SGVD API: Fetching events...');
    
    const response = await fetch(SGVD_EVENTS_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 SGVD Events API: Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ SGVD Events API: Error - Status:', response.status);
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 SGVD Events API: Received', data.length, 'events');
    
    return data as EventData[];
  } catch (error) {
    console.error('❌ SGVD Events API: Error:', error);
    return [];
  }
}

