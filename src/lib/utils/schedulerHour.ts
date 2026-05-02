import { getAnalyticsSettlementLocalMinutes } from '@lib/analytics/businessDay';

/**
 * Scheduler Hour Utility
 * 
 * Computes the UTC hour at which a store's nightly scheduler should run,
 * based on the store's IANA timezone and business day end time.
 * 
 * WHY: Global clients operate in different timezones. A restaurant in
 * Sydney needs scoring after its local business day ends, not at a fixed UTC hour.
 * 
 * STORAGE: Stored as `schedulerHour` (0-23 UTC integer) on:
 *   - Store document (stores/{sId})
 *   - storesSummary (platformSummary/storesSummary → stores.{sId}.schedulerHour)
 * 
 * FALLBACK: UTC settlement hour derived from `businessDayEndTime` when timezone
 * is missing or invalid.
 * 
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */

/**
 * Compute the UTC hour that corresponds to the store-local analytics
 * settlement window (businessDayEndTime + buffer).
 * 
 * @param timeZone - IANA timezone string (e.g., 'Asia/Kolkata', 'Australia/Sydney')
 * @param businessDayEndTime - Store-local HH:mm business-day cutoff.
 * @returns UTC hour (0-23) when the settlement window falls. Missing/invalid timezone is treated as UTC.
 * 
 * @example
 * computeSchedulerHour('Asia/Kolkata', '03:00') // → 0 (05:30 IST settlement ~= 00:00 UTC)
 * computeSchedulerHour('Europe/London', '00:00') // → 2 (02:30 local settlement)
 * computeSchedulerHour(undefined, '03:00')       // → 5 (05:30 UTC settlement)
 */

export function computeSchedulerHour(timeZone?: string, businessDayEndTime?: string): number {
    const targetLocalHour = Math.floor(getAnalyticsSettlementLocalMinutes(businessDayEndTime) / 60);
    const fallbackHour = targetLocalHour;

    if (!timeZone) return fallbackHour;

    try {
        // Create a reference date and format it in the target timezone
        // We want to find: "what UTC hour maps to the local settlement hour?"
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();

        // Try each hour of the day to find which UTC hour maps to the settlement local hour.
        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 30));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === targetLocalHour) {
                return utcHour;
            }
        }

        // Fallback: try with half-hour offset timezones (e.g., IST = UTC+5:30)
        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 0));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === targetLocalHour) {
                return utcHour;
            }
        }

        return fallbackHour;
    } catch {
        return fallbackHour;
    }
}

/**
 * Get the local hour for a given Date in a specific timezone.
 */
function getLocalHour(date: Date, timeZone: string): number {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: 'numeric',
            hour12: false,
        });
        const parts = formatter.formatToParts(date);
        const hourPart = parts.find(p => p.type === 'hour');
        return hourPart ? parseInt(hourPart.value, 10) : -1;
    } catch {
        return -1;
    }
}

/**
 * Format a UTC hour as a human-readable local time string.
 * Used in UI to show the owner what time their scheduler runs.
 * 
 * @example
 * formatSchedulerTime(21, 'Asia/Kolkata') // → "2:30 AM IST"
 * formatSchedulerTime(2, undefined)       // → "2:30 AM UTC"
 */
export function formatSchedulerTime(schedulerHour: number, timeZone?: string): string {
    try {
        const date = new Date(Date.UTC(2024, 0, 1, schedulerHour, 30));
        const tz = timeZone || 'UTC';
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            timeZoneName: 'short',
        });
        return formatter.format(date);
    } catch {
        return `${schedulerHour}:30 UTC`;
    }
}
