import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';

type AnalyticsTimeZoneFallbackSource = 'analytics_date_key' | 'analytics_business_day';

const MAX_ANALYTICS_TIME_ZONE_DIAGNOSTICS = 25;
const reportedAnalyticsTimeZoneFailures = new Set<string>();

function logAnalyticsTimeZoneFallback(
  error: unknown,
  timeZone: string,
  source: AnalyticsTimeZoneFallbackSource,
): void {
  const failureKey = `${source}:${timeZone.length}`;
  if (reportedAnalyticsTimeZoneFailures.has(failureKey)) return;
  if (reportedAnalyticsTimeZoneFailures.size >= MAX_ANALYTICS_TIME_ZONE_DIAGNOSTICS) return;
  reportedAnalyticsTimeZoneFailures.add(failureKey);

  logAnalyticsFailure('analytics_timezone_validation_failed', error, {
    ...getBoundedAnalyticsStringContext('timeZone', timeZone),
    ...getBoundedAnalyticsStringContext('source', source),
    fallbackTimeZone: 'UTC',
    hasWindow: typeof window !== 'undefined',
  });
}

export function isValidAnalyticsTimeZone(
  timeZone: string | undefined,
  source: AnalyticsTimeZoneFallbackSource,
): timeZone is string {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch (error) {
    logAnalyticsTimeZoneFallback(error, timeZone, source);
    return false;
  }
}
