/**
 * Scheduler Hour Utility
 * 
 * Computes the UTC hour at which a store's nightly scheduler should run,
 * based on the store's IANA timezone. The goal: run at ~2:30 AM local time.
 * 
 * WHY: Global clients operate in different timezones. A restaurant in
 * Sydney needs scoring at 2:30 AM AEST, not 2:30 AM UTC (which is 12:30 PM AEST).
 * 
 * STORAGE: Stored as `schedulerHour` (0-23 UTC integer) on:
 *   - Store document (stores/{sId})
 *   - storesSummary (platformSummary/storesSummary → stores.{sId}.schedulerHour)
 * 
 * DEFAULT: 2 (UTC) — equivalent to current fixed 2:30 AM UTC behavior.
 * 
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */

/**
 * Compute the UTC hour that corresponds to 2:30 AM in the given timezone.
 * 
 * @param timeZone - IANA timezone string (e.g., 'Asia/Kolkata', 'Australia/Sydney')
 * @returns UTC hour (0-23) when 2:30 AM local falls. Returns 2 if timezone is invalid/missing.
 * 
 * @example
 * computeSchedulerHour('Asia/Kolkata')      // → 21 (IST is UTC+5:30, so 2:30 AM IST = 21:00 UTC)
 * computeSchedulerHour('Australia/Sydney')   // → 15 or 16 (AEST/AEDT, 2:30 AM = ~15:30-16:30 UTC)
 * computeSchedulerHour('America/New_York')   // → 7 (EST is UTC-5, so 2:30 AM EST = 7:30 UTC)
 * computeSchedulerHour('Europe/London')      // → 2 (GMT = UTC, so 2:30 AM = 2:30 UTC)
 * computeSchedulerHour(undefined)            // → 2 (default)
 */
export function computeSchedulerHour(timeZone?: string): number {
    const DEFAULT_HOUR = 2;

    if (!timeZone) return DEFAULT_HOUR;

    try {
        // Create a reference date and format it in the target timezone
        // We want to find: "what UTC hour = 2:30 AM in this timezone?"
        // Approach: Create 2:30 AM today in the target timezone, convert to UTC hour
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();

        // Try each hour of the day to find which UTC hour maps to ~2 AM local
        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 30));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === 2) {
                return utcHour;
            }
        }

        // Fallback: try with half-hour offset timezones (e.g., IST = UTC+5:30)
        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 0));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === 2) {
                return utcHour;
            }
        }

        return DEFAULT_HOUR;
    } catch {
        return DEFAULT_HOUR;
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
