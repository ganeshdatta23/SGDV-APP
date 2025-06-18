export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Parse coordinates from a simple "lat,lng" string
export function parseDirectCoordinates(coordsStr: string): Coordinates | null {
  const parts = coordsStr.split(',').map((s) => s.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { latitude: lat, longitude: lng };
    }
  }
  return null;
}

// Parse coordinates from a Google Maps URL
export function parseGoogleMapsUrl(url: string): Coordinates | null {
  // Pattern 1: @lat,lng in the path
  let match = url.match(/@([-?\d\.]+),([-?\d\.]+)/);
  if (match && match[1] && match[2]) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 2: !3d<lat>!4d<lng> in the path
  match = url.match(/!3d([-?\d\.]+)[^!]*!4d([-?\d\.]+)/);
  if (match && match[1] && match[2]) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // Attempt to parse query parameters if it is a valid URL
  try {
    const urlObj = new URL(url);
    const queryParams = urlObj.searchParams;

    // Pattern 3: q=lat,lng or query=lat,lng
    const qParam = queryParams.get('q') || queryParams.get('query');
    if (qParam) {
      const coords = parseDirectCoordinates(qParam);
      if (coords) return coords;
    }

    // Pattern 4: ll=lat,lng
    const llParam = queryParams.get('ll');
    if (llParam) {
      const coords = parseDirectCoordinates(llParam);
      if (coords) return coords;
    }
  } catch (_) {
    // Not a valid URL structure; ignore
  }

  return null;
}

// Generic parser that accepts either URL or raw coordinates
export function parseUrlOrCoords(input: string): Coordinates | null {
  if (input.trim().startsWith('http')) {
    return parseGoogleMapsUrl(input);
  }
  return parseDirectCoordinates(input);
}

/**
 * Calculate the initial bearing (forward azimuth) from point1 to point2
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Initial bearing in degrees (0-360)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const toDegrees = (radians: number) => radians * (180 / Math.PI);

  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = toDegrees(Math.atan2(y, x));
  
  // Normalize to 0-360 degrees
  return (bearing + 360) % 360;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
} 