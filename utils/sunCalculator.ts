interface SunCalculationResult {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  nextEvent: Date;
  nextEventType: 'sunrise' | 'sunset';
}

// SunriseSunset.io API response interface
interface SunriseSunsetApiResponse {
  results: {
    date: string;
    sunrise: string;
    sunset: string;
    first_light: string;
    last_light: string;
    dawn: string;
    dusk: string;
    solar_noon: string;
    golden_hour: string;
    day_length: string;
    timezone: string;
    utc_offset: number;
  };
  status: string;
}

// Cache for API results - only call once per day per location
interface CacheEntry {
  data: SunCalculationResult;
  date: string;
  location: string;
}

const sunTimesCache: Map<string, CacheEntry> = new Map();

// Helper to create cache key
const getCacheKey = (latitude: number, longitude: number, date: Date): string => {
  const dateStr = date.toISOString().split('T')[0];
  const locationStr = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  return `${locationStr}_${dateStr}`;
};

export async function calculateSunTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): Promise<SunCalculationResult> {
  const cacheKey = getCacheKey(latitude, longitude, date);
  
  // Check cache first
  const cached = sunTimesCache.get(cacheKey);
  if (cached) {
    console.log('📦 Using cached sun times for', cacheKey);
    return cached.data;
  }

  try {
    console.log('🌐 Fetching sun times from API for', cacheKey);
    const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const url = `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}&date=${dateStr}&time_format=24`;
    
    console.log('🔗 Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data: SunriseSunsetApiResponse = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`API returned error: ${data.status}`);
    }
    
    // Parse times - API returns in local timezone
    const sunrise = new Date(`${dateStr}T${data.results.sunrise}`);
    const sunset = new Date(`${dateStr}T${data.results.sunset}`);
    const solarNoon = new Date(`${dateStr}T${data.results.solar_noon}`);
    
    // Determine next event (simplified - no recursive calls)
    const now = new Date();
    let nextEvent: Date;
    let nextEventType: 'sunrise' | 'sunset';
    
    if (now < sunrise) {
      nextEvent = sunrise;
      nextEventType = 'sunrise';
    } else if (now < sunset) {
      nextEvent = sunset;
      nextEventType = 'sunset';
    } else {
      // If it's past sunset, just estimate tomorrow's sunrise (add 24 hours to today's sunrise)
      nextEvent = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
      nextEventType = 'sunrise';
    }
    
    const result: SunCalculationResult = {
      sunrise,
      sunset,
      solarNoon,
      nextEvent,
      nextEventType
    };

    // Cache the result
    sunTimesCache.set(cacheKey, {
      data: result,
      date: dateStr,
      location: `${latitude},${longitude}`
    });

    console.log('✅ Sun times cached for', cacheKey);
    return result;
  } catch (error) {
    console.error('Error calculating sun times:', error);
    throw error;
  }
}

export function getNextSunEvent(
  latitude: number,
  longitude: number,
  currentTime?: Date
): Promise<{ time: Date; type: 'sunrise' | 'sunset' }> {
  return calculateSunTimes(latitude, longitude, currentTime).then(result => ({
    time: result.nextEvent,
    type: result.nextEventType
  }));
}

// Helper function to format time for display
export function formatSunTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Clean up old cache entries (optional - call periodically)
export function cleanCache(): void {
  const today = new Date().toISOString().split('T')[0];
  for (const [key, entry] of sunTimesCache.entries()) {
    if (entry.date < today) {
      sunTimesCache.delete(key);
    }
  }
}

// Debug function for testing
export async function debugSunriseSunset(latitude: number, longitude: number) {
  try {
    console.log('🌅 Testing Sunrise/Sunset API');
    console.log(`📍 Location: ${latitude}, ${longitude}`);
    
    const result = await calculateSunTimes(latitude, longitude);
    
    console.log('📊 Results:');
    console.log(`🌅 Sunrise: ${formatSunTime(result.sunrise)} (${result.sunrise.toISOString()})`);
    console.log(`🌇 Sunset: ${formatSunTime(result.sunset)} (${result.sunset.toISOString()})`);
    console.log(`☀️ Solar Noon: ${formatSunTime(result.solarNoon)} (${result.solarNoon.toISOString()})`);
    console.log(`⏰ Next Event: ${result.nextEventType} at ${formatSunTime(result.nextEvent)}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error testing sunrise/sunset:', error);
    throw error;
  }
} 