/**
 * Geocoding utilities for converting addresses to GPS coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface GeocodingResult {
  latitude: string;
  longitude: string;
}

/**
 * Geocode an address to GPS coordinates using OpenStreetMap Nominatim
 * @param address Full address string (e.g., "123 Main St, Fort Myers, FL 33901")
 * @returns Latitude and longitude, or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'RiseLocal/1.0 (contact@riselocal.app)', // Required by Nominatim TOS
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const results = await response.json();
    
    if (results && results.length > 0) {
      return {
        latitude: results[0].lat,
        longitude: results[0].lon,
      };
    }

    console.log('No geocoding results found for address:', address);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of point 1 (in degrees)
 * @param lon1 Longitude of point 1 (in degrees)
 * @param lat2 Latitude of point 2 (in degrees)
 * @param lon2 Longitude of point 2 (in degrees)
 * @returns Distance in miles
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Build full address string from vendor data
 */
export function buildFullAddress(
  address: string | null | undefined,
  city: string,
  state: string,
  zipCode: string
): string {
  const parts = [];
  if (address) parts.push(address);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (zipCode) parts.push(zipCode);
  return parts.join(', ');
}
