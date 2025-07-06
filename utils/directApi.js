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
  // Fallback location data for Avadhoota Datta peetham
  const fallbackLocation = {
    latitude: 12.308367,
    longitude: 76.645467,
    address: "Avadhoota Datta peetham",
    googleMapsUrl: "https://www.google.com/maps/@12.308367,76.645467,17z"
  };

  try {
    console.log('🔍 Supabase: Starting fetchLocationDirect for ID:', locationId);
    console.log('🔍 Supabase: SUPABASE_URL:', SUPABASE_URL);
    console.log('🔍 Supabase: API Key present:', SUPABASE_ANON_KEY ? 'Yes' : 'No');
    
    const apiUrl = `${SUPABASE_URL}/rest/v1/locations?id=eq.${encodeURIComponent(locationId)}&select=latitude,longitude,address,googleMapsUrl`;
    console.log('🔍 Supabase: Full API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Supabase: API response status:', response.status);
    console.log('📡 Supabase: API response statusText:', response.statusText);
    
    if (!response.ok) {
      console.error('❌ Supabase: API error - Status:', response.status, 'StatusText:', response.statusText);
      console.log('🔄 Supabase: Using fallback location due to API error');
      return fallbackLocation;
    }

    const data = await response.json();
    console.log('📦 Supabase: Raw API response data:', JSON.stringify(data, null, 2));
    
    // The API returns an array, we want the first item
    if (data && data.length > 0) {
      const location = data[0];
      console.log('📍 Supabase: Location found in response:', JSON.stringify(location, null, 2));
      
      // If address is empty, use a default name
      if (!location.address || location.address.trim() === '') {
        location.address = "Appaji's Location";
        console.log('📝 Supabase: Updated empty address to default:', location.address);
      }
      
      console.log('✅ Supabase: Final location data:', JSON.stringify(location, null, 2));
      return location;
    }
    
    console.log('❌ Supabase: No location found in response for ID:', locationId);
    console.log('🔄 Supabase: Using fallback location');
    return fallbackLocation;
  } catch (error) {
    console.error('❌ Supabase: Exception in API call:', error);
    console.error('❌ Supabase: Error message:', error.message);
    console.error('❌ Supabase: Error stack:', error.stack);
    console.log('🔄 Supabase: Using fallback location due to exception');
    return fallbackLocation;
  }
};

export default {
  fetchLocationDirect
};