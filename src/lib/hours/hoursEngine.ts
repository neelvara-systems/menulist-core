import { formatClockTime } from '@util/dateTime';

/**
 * Hours Engine - Compute store open/closed status from workingHours
 *
 * Feature #2A: Hours Status Display (P0)
 * Uses existing workingHours field from StoreDataType
 *
 * @module lib/hours/hoursEngine
 */

/**
 * Store status result
 */
export type StoreStatus = {
    isOpen: boolean;
    statusText: string; // "Open" or "Closed"
    nextChange?: string; // "Closes at 11:00 PM" or "Opens at 9:00 AM"
    currentDayHours?: string; // "09:00 - 23:00" for today
};

/**
 * Day abbreviation mapping (workingHours uses lowercase 3-letter keys)
 */
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_KEYS)[number];

/**
 * Get current day key based on timezone
 */
function getCurrentDayKey(timeZone?: string): DayKey {
    try {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: "short",
            timeZone: timeZone || "UTC",
        };
        const dayStr = new Intl.DateTimeFormat("en-US", options)
            .format(now)
            .toLowerCase();
        return dayStr as DayKey;
    } catch {
        // Fallback to local timezone if invalid
        const day = new Date().getDay();
        return DAY_KEYS[day];
    }
}

/**
 * Get current time in HH:mm format based on timezone
 */
function getCurrentTime(timeZone?: string): string {
    try {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: timeZone || "UTC",
        };
        return new Intl.DateTimeFormat("en-GB", options).format(now);
    } catch {
        // Fallback to local time
        const now = new Date();
        return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    }
}

/**
 * Parse time string "HH:mm" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Check if current time is within a time window
 */
function isWithinWindow(
    currentMinutes: number,
    startMinutes: number,
    endMinutes: number,
): boolean {
    // Handle overnight hours (e.g., 22:00-02:00)
    if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get the next day key
 */
function getNextDayKey(currentDay: DayKey): DayKey {
    const currentIndex = DAY_KEYS.indexOf(currentDay);
    const nextIndex = (currentIndex + 1) % 7;
    return DAY_KEYS[nextIndex];
}

/**
 * Compute store open/closed status
 *
 * @param workingHours - Record<string, string> from store data (e.g., { "mon": "09:00-23:00" })
 * @param timeZone - Store timezone (e.g., "Asia/Kolkata")
 * @param timeFormat - Time format preference ("12h" or "24h")
 * @returns StoreStatus object
 */
export function getStoreStatus(
    workingHours?: Record<string, string>,
    timeZone?: string,
    timeFormat?: string,
): StoreStatus {
    // No hours configured - assume open (silent behavior)
    if (!workingHours || Object.keys(workingHours).length === 0) {
        return {
            isOpen: true,
            statusText: "Open",
        };
    }

    const currentDay = getCurrentDayKey(timeZone);
    const currentTime = getCurrentTime(timeZone);
    const currentMinutes = parseTimeToMinutes(currentTime);

    const todayHours = workingHours[currentDay];

    // No hours for today - store is closed
    if (!todayHours || !todayHours.includes("-")) {
        // Find next open day
        const nextOpen = findNextOpenTime(workingHours, currentDay, timeFormat);
        return {
            isOpen: false,
            statusText: "Closed",
            nextChange: nextOpen,
        };
    }

    // Parse today's hours
    const [openTime, closeTime] = todayHours.split("-").map((t) => t.trim());
    const openMinutes = parseTimeToMinutes(openTime);
    const closeMinutes = parseTimeToMinutes(closeTime);

    const isCurrentlyOpen = isWithinWindow(
        currentMinutes,
        openMinutes,
        closeMinutes,
    );

    if (isCurrentlyOpen) {
        // Store is open - show when it closes
        const closesAt = formatClockTime(closeTime, timeFormat);
        return {
            isOpen: true,
            statusText: "Open",
            nextChange: `Closes at ${closesAt}`,
            currentDayHours: `${formatClockTime(openTime, timeFormat)} - ${formatClockTime(closeTime, timeFormat)}`,
        };
    } else {
        // Store is closed
        // Check if it opens later today
        if (currentMinutes < openMinutes) {
            const opensAt = formatClockTime(openTime, timeFormat);
            return {
                isOpen: false,
                statusText: "Closed",
                nextChange: `Opens at ${opensAt}`,
                currentDayHours: `${formatClockTime(openTime, timeFormat)} - ${formatClockTime(closeTime, timeFormat)}`,
            };
        }

        // Already past closing time - find next open time
        const nextOpen = findNextOpenTime(workingHours, currentDay, timeFormat);
        return {
            isOpen: false,
            statusText: "Closed",
            nextChange: nextOpen,
            currentDayHours: `${formatClockTime(openTime, timeFormat)} - ${formatClockTime(closeTime, timeFormat)}`,
        };
    }
}

/**
 * Find next open time (for showing "Opens Monday at 9:00 AM")
 */
function findNextOpenTime(
    workingHours: Record<string, string>,
    currentDay: DayKey,
    timeFormat?: string,
): string | undefined {
    let checkDay = getNextDayKey(currentDay);

    // Check up to 7 days ahead
    for (let i = 0; i < 7; i++) {
        const hours = workingHours[checkDay];
        if (hours && hours.includes("-")) {
            const [openTime] = hours.split("-").map((t) => t.trim());
            const opensAt = formatClockTime(openTime, timeFormat);
            const dayName = getDayDisplayName(checkDay);

            // If it's tomorrow, just say "tomorrow"
            if (i === 0) {
                return `Opens tomorrow at ${opensAt}`;
            }

            return `Opens ${dayName} at ${opensAt}`;
        }
        checkDay = getNextDayKey(checkDay);
    }

    return undefined;
}

/**
 * Get display name for day
 */
function getDayDisplayName(day: DayKey): string {
    const names: Record<DayKey, string> = {
        sun: "Sunday",
        mon: "Monday",
        tue: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        fri: "Friday",
        sat: "Saturday",
    };
    return names[day];
}

/**
 * React hook-friendly version that updates status
 * Use this in client components
 */
export function useStoreStatus(
    workingHours?: Record<string, string>,
    timeZone?: string,
    timeFormat?: string,
): StoreStatus {
    // For SSR compatibility, compute on each render
    // In a real implementation, you might add a timer to update every minute
    return getStoreStatus(workingHours, timeZone, timeFormat);
}
