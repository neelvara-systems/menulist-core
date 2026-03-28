/**
 * Client-side geolocation utilities for analytics
 */

/**
 * Get the user's location information if available
 * This uses the browser's Geolocation API if permission is granted
 * Falls back to a general region based on timezone if geolocation is not available
 */
export const getLocationInfo = async (): Promise<string> => {
  try {
    // Check if geolocation is available in the browser
    if (navigator.geolocation) {
      // Try to get the user's position with a timeout
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { timeout: 5000, maximumAge: 600000 } // 5s timeout, 10min cache
        );
      }).catch(() => null);

      // If we got a position, use it to create a location key
      if (position) {
        const { latitude, longitude } = position.coords;
        
        // Round coordinates to reduce precision for privacy
        const roundedLat = Math.round(latitude * 10) / 10;
        const roundedLng = Math.round(longitude * 10) / 10;
        
        return `geo_${roundedLat}_${roundedLng}`;
      }
    }
    
    // Fallback: Use timezone to approximate region
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && timezone !== 'UTC') {
      // Extract region from timezone (e.g., "America/New_York" -> "America")
      const region = timezone.split('/')[0];
      return `tz_${region}`;
    }
    
    // Last resort fallback
    return 'unknown';
  } catch (error) {
    console.error('Error getting location info:', error);
    return 'unknown';
  }
};
