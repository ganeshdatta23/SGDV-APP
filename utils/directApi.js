/**
 * Direct API utility to fetch location data from Supabase
 */

const SUPABASE_URL = 'https://kpqwrcjtubmuxcegltty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXdyY2p0dWJtdXhjZWdsdHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMzI1MjMsImV4cCI6MjA2MzYwODUyM30.y84yzzcxaevq9VDDEfFG7wo1-OHnlbm2OHM-KQQ1aLo';

/**
 * Fetches location data directly using the REST API
 * @param {string} locationId - The ID of the location to fetch
 * @returns {Promise<{latitude: number, longitude: number, address: string, googleMapsUrl: string} | null>}
 */
export const fetchLocationDirect = async (locationId = 'swamiji_location') => {
  try {
    console.log('Fetching location directly via REST API for ID:', locationId);
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/locations?id=eq.${encodeURIComponent(locationId)}&select=latitude,longitude,address,googleMapsUrl`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      console.error('API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('API response data:', data);
    
    // The API returns an array, we want the first item
    if (data && data.length > 0) {
      const location = data[0];
      // If address is empty, use a default name
      if (!location.address || location.address.trim() === '') {
        location.address = "Appaji's Location";
      }
      console.log('Location found:', location);
      return location;
    }
    
    console.log('No location found for ID:', locationId);
    return null;
  } catch (error) {
    console.error('Error in API call:', error);
    return null;
  }
};

export default {
  fetchLocationDirect
};