/**
 * OBP Hours Status Calculator
 * 
 * Determines if a store is currently open or closed based on workingHours and timeZone.
 * Reuses the same data format as the existing hours status display feature.
 * 
 * @see ENABLE_HOURS_STATUS_DISPLAY feature flag
 * @see __docs__/official-business-page/official-business-page_impl.md §8
 */

export interface StoreOpenStatus {
    isOpen: boolean;
    statusText: string;
    nextChange?: string;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * Get the current open/closed status of a store
 * 
 * @param workingHours - Record of day abbreviations to time ranges (e.g., { mon: "09:00-23:00" })
 * @param timeZone - IANA timezone string (e.g., "Asia/Kolkata"). Defaults to "Asia/Kolkata" if not set.
 */
export function getStoreOpenStatus(
    workingHours?: Record<string, string>,
    timeZone?: string,
): StoreOpenStatus {
    if (!workingHours || Object.keys(workingHours).length === 0) {
        return { isOpen: false, statusText: 'Hours not available' };
    }

    const tz = timeZone || 'Asia/Kolkata';

    let now: Date;
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const parts = formatter.formatToParts(new Date());
        const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
        now = new Date(
            parseInt(get('year')),
            parseInt(get('month')) - 1,
            parseInt(get('day')),
            parseInt(get('hour')),
            parseInt(get('minute')),
        );
    } catch {
        now = new Date();
    }

    const dayIndex = now.getDay();
    const dayKey = DAY_KEYS[dayIndex];
    const todayHours = workingHours[dayKey];

    if (!todayHours || todayHours.toLowerCase() === 'closed') {
        const nextOpenDay = findNextOpenDay(workingHours, dayIndex);
        return {
            isOpen: false,
            statusText: 'Closed',
            nextChange: nextOpenDay ? `Opens ${nextOpenDay}` : undefined,
        };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const timeRanges = todayHours.split(',').map(r => r.trim());

    for (const range of timeRanges) {
        const [openStr, closeStr] = range.split('-').map(t => t.trim());
        if (!openStr || !closeStr) continue;

        const openMinutes = parseTimeToMinutes(openStr);
        const closeMinutes = parseTimeToMinutes(closeStr);

        if (openMinutes === null || closeMinutes === null) continue;

        const effectiveClose = closeMinutes <= openMinutes ? closeMinutes + 1440 : closeMinutes;
        const effectiveCurrent = currentMinutes < openMinutes && closeMinutes <= openMinutes
            ? currentMinutes + 1440
            : currentMinutes;

        if (effectiveCurrent >= openMinutes && effectiveCurrent < effectiveClose) {
            return {
                isOpen: true,
                statusText: 'Open now',
                nextChange: `Closes ${formatTime(closeMinutes)}`,
            };
        }
    }

    const firstOpen = timeRanges[0]?.split('-')[0]?.trim();
    const openMinutes = firstOpen ? parseTimeToMinutes(firstOpen) : null;

    if (openMinutes !== null && currentMinutes < openMinutes) {
        return {
            isOpen: false,
            statusText: 'Closed',
            nextChange: `Opens ${formatTime(openMinutes)}`,
        };
    }

    const nextOpenDay = findNextOpenDay(workingHours, dayIndex);
    return {
        isOpen: false,
        statusText: 'Closed',
        nextChange: nextOpenDay ? `Opens ${nextOpenDay}` : undefined,
    };
}

function parseTimeToMinutes(time: string): number | null {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
    const normalizedMinutes = minutes % 1440;
    const h = Math.floor(normalizedMinutes / 60);
    const m = normalizedMinutes % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${displayH}${period}` : `${displayH}:${String(m).padStart(2, '0')}${period}`;
}

function findNextOpenDay(
    workingHours: Record<string, string>,
    currentDayIndex: number,
): string | null {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 1; i <= 7; i++) {
        const nextIndex = (currentDayIndex + i) % 7;
        const dayKey = DAY_KEYS[nextIndex];
        const hours = workingHours[dayKey];
        if (hours && hours.toLowerCase() !== 'closed') {
            if (i === 1) return 'tomorrow';
            return dayNames[nextIndex];
        }
    }
    return null;
}
