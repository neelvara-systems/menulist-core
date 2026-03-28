/**
 * Scheduler Hour Utility (Server-Side)
 * 
 * Mirrors src/lib/utils/schedulerHour.ts for Cloud Functions.
 * Computes the UTC hour at which a store's nightly scheduler should run.
 * 
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */

/**
 * Compute the UTC hour that corresponds to 2:30 AM in the given timezone.
 * Returns 2 if timezone is invalid/missing (default = current behavior).
 */
export function computeSchedulerHour(timeZone?: string): number {
    const DEFAULT_HOUR = 2;
    if (!timeZone) return DEFAULT_HOUR;

    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();

        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 30));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === 2) return utcHour;
        }

        for (let utcHour = 0; utcHour < 24; utcHour++) {
            const testDate = new Date(Date.UTC(year, month, day, utcHour, 0));
            const localHour = getLocalHour(testDate, timeZone);
            if (localHour === 2) return utcHour;
        }

        return DEFAULT_HOUR;
    } catch {
        return DEFAULT_HOUR;
    }
}

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
