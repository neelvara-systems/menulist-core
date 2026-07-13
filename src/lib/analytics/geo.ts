/**
 * Client-side geolocation utilities for analytics
 */
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';

const GEOLOCATION_TIMEOUT_MS = 5000;
const GEOLOCATION_MAXIMUM_AGE_MS = 600000;
const GEOLOCATION_PERMISSION_DENIED_CODE = 1;

const hasBrowserGeolocation = (): boolean => (
  typeof navigator !== 'undefined'
  && Boolean(navigator.geolocation)
);

const isGeolocationPermissionDenied = (error: unknown): boolean => (
  Boolean(error)
  && typeof error === 'object'
  && Number((error as { code?: unknown }).code) === GEOLOCATION_PERMISSION_DENIED_CODE
);

const getGeolocationAttemptContext = () => ({
  hasGeolocationApi: hasBrowserGeolocation(),
  maximumAgeMs: GEOLOCATION_MAXIMUM_AGE_MS,
  timeoutMs: GEOLOCATION_TIMEOUT_MS,
  fallback: 'timezone',
});

const hasIntlDateTimeFormat = (): boolean => (
  typeof Intl !== 'undefined'
  && typeof Intl.DateTimeFormat === 'function'
);

const getLocationLookupFailureContext = (timeZone?: string) => ({
  hasGeolocationApi: hasBrowserGeolocation(),
  hasIntlDateTimeFormat: hasIntlDateTimeFormat(),
  ...getBoundedAnalyticsStringContext('timeZone', timeZone),
  fallback: 'unknown',
});

export const toCoarseAnalyticsLocationKey = (
  latitude: unknown,
  longitude: unknown,
): string | null => {
  if (
    typeof latitude !== 'number'
    || typeof longitude !== 'number'
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) return null;

  // Integer tenths preserve the existing ~11 km bucket without introducing
  // dots, which are Firestore field-path separators rather than map-key data.
  return `geo_${Math.round(latitude * 10)}_${Math.round(longitude * 10)}`;
};

const getBrowserPosition = async (): Promise<GeolocationPosition | null> => {
  if (!hasBrowserGeolocation()) return null;

  try {
    return await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_MAXIMUM_AGE_MS }
      );
    });
  } catch (error) {
    if (!isGeolocationPermissionDenied(error)) {
      logAnalyticsFailure('analytics_geolocation_position_failed', error, getGeolocationAttemptContext());
    }
    return null;
  }
};

/**
 * Get the user's location information if available
 * This uses the browser's Geolocation API if permission is granted
 * Falls back to a general region based on timezone if geolocation is not available
 */
export const getLocationInfo = async (): Promise<string> => {
  let timeZone: string | undefined;

  try {
    const position = await getBrowserPosition();

    // If we got a position, use it to create a location key
    if (position) {
      const { latitude, longitude } = position.coords;

      const coarseLocationKey = toCoarseAnalyticsLocationKey(latitude, longitude);
      if (coarseLocationKey) return coarseLocationKey;
    }

    // Fallback: Use timezone to approximate region
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone && timeZone !== 'UTC') {
      // Extract region from timezone (e.g., "America/New_York" -> "America")
      const region = timeZone.split('/')[0];
      return `tz_${region}`;
    }

    // Last resort fallback
    return 'unknown';
  } catch (error) {
    logAnalyticsFailure('analytics_location_lookup_failed', error, getLocationLookupFailureContext(timeZone));
    return 'unknown';
  }
};
