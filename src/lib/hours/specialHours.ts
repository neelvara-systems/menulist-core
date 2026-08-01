import type { StoreSpecialHours, StoreSpecialHoursEntry } from '@type/platform/store';
import { parseWorkingHoursRanges } from './hoursBoundary';
import {
    getStoreLocalDateKey,
    isValidSpecialHoursDateKey,
    normalizeSpecialHoursEntry,
} from './hoursBoundary';

export {
    SPECIAL_HOURS_LABEL_MAX_LENGTH,
    SPECIAL_HOURS_MAX_ENTRIES,
    addDaysToSpecialHoursDateKey,
    getSpecialHoursEntry,
    getStoreLocalDateKey,
    isValidSpecialHoursDateKey,
    normalizeSpecialHours,
    normalizeSpecialHoursEntry,
} from './hoursBoundary';

export function formatSpecialHoursEntry(entry: StoreSpecialHoursEntry, timeFormat?: string): string {
    const ranges = parseWorkingHoursRanges(entry.hours);
    if (!ranges.length) return 'Closed';
    return ranges
        .map((range) => {
            const format = (time: string) => {
                if (timeFormat === '24h') return time;
                const [hour, minute] = time.split(':').map(Number);
                const suffix = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
            };
            return `${format(range.startTime)} - ${format(range.endTime)}`;
        })
        .join(', ');
}

export function getUpcomingSpecialHours(
    specialHours: StoreSpecialHours | undefined,
    timeZone?: string,
    now = new Date(),
    limit = 6,
): Array<{ date: string; entry: StoreSpecialHoursEntry }> {
    const today = getStoreLocalDateKey(timeZone, now);
    return Object.entries(specialHours || {})
        .filter(([date]) => isValidSpecialHoursDateKey(date) && date >= today)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, Math.max(0, limit))
        .flatMap(([date, value]) => {
            const entry = normalizeSpecialHoursEntry(value);
            return entry ? [{ date, entry }] : [];
        });
}

export function sortSpecialHoursEntriesForOwner(
    specialHours: StoreSpecialHours,
    today: string,
): Array<[string, StoreSpecialHoursEntry]> {
    return Object.entries(specialHours).sort(([left], [right]) => {
        const leftIsPast = left < today;
        const rightIsPast = right < today;
        if (leftIsPast !== rightIsPast) return leftIsPast ? 1 : -1;
        return leftIsPast
            ? right.localeCompare(left)
            : left.localeCompare(right);
    });
}
