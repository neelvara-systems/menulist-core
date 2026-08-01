/**
 * useTimedCategories Hook
 * 
 * Feature #3: Time-Based Categories
 * 
 * Handles time-based visibility logic for menu categories.
 * Uses store timezone when provided, falling back deterministically to UTC.
 * 
 * FORMAT: timeSlots?: CategoryTimeSlot[] with presetId support
 * 
 * - If undefined/empty = always visible
 * - If has entries = visible only during those windows
 */

import { CategoryTimeSlot, ExtractedDataCategory } from '@template/main-app/projects/types';
import {
    clockRangeAppliesOnDay,
    isMinuteWithinClockRange,
    isValidClockRange,
    parseClockMinutes,
} from '@lib/menu/timeSlotPresetBoundary';
import { formatClockTime } from '@util/dateTime';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { useEffect, useMemo, useState } from 'react';

/**
 * Format time for display in user's locale
 * @param time - Time in "HH:mm" format
 * @returns Formatted time string (e.g., "6:00 AM" or "06:00")
 */
export function formatTimeForDisplay(
    time: string,
    timeFormat?: string,
    locale?: string,
): string {
    if (!time) return '';
    return formatClockTime(time, timeFormat, locale);
}

/**
 * Validate a single time slot object
 * @param slot - CategoryTimeSlot object
 * @returns Object with validation result and error message
 */
export function validateTimeSlot(slot: CategoryTimeSlot): {
    valid: boolean;
    error?: string;
} {
    if (!slot.startTime || !slot.endTime) {
        return { valid: false, error: 'Start and end time are required' };
    }

    if (!isValidClockRange(slot.startTime, slot.endTime)) {
        return { valid: false, error: 'Enter different start and end times in HH:mm format' };
    }

    if (slot.days !== undefined && (
        !Array.isArray(slot.days)
        || !slot.days.length
        || slot.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    )) {
        return { valid: false, error: 'Days must use values from 0 to 6' };
    }

    return { valid: true };
}

/**
 * Validate all time slots for a category (new format)
 * @param timeSlots - Array of CategoryTimeSlot objects
 * @returns Object with validation result and error message
 */
export function validateTimeSlots(timeSlots?: CategoryTimeSlot[]): {
    valid: boolean;
    error?: string;
} {
    if (!timeSlots || timeSlots.length === 0) {
        return { valid: true }; // Empty is valid (always visible)
    }

    for (const slot of timeSlots) {
        const result = validateTimeSlot(slot);
        if (!result.valid) {
            return result;
        }
    }

    return { valid: true };
}

type CurrentTimeParts = { day: number; minutes: number };

const reportedTimedCategoryTimezoneFailures = new Set<string>();

function logTimedCategoryTimezoneFailure(error: unknown, timeZone: string): void {
    const key = `${timeZone.length}:${timeZone ? 'present' : 'missing'}`;
    if (reportedTimedCategoryTimezoneFailures.has(key) || reportedTimedCategoryTimezoneFailures.size >= 25) return;
    reportedTimedCategoryTimezoneFailures.add(key);
    logRuntimeFailure('public_menu_decision_blocks_timezone_failed', error, {
        ...getBoundedRuntimeStringContext('timeZone', timeZone),
        source: 'shared_timed_category_evaluator',
    });
}

const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

function getCurrentTimePartsForTimeZone(timeZone?: string, now = new Date()): CurrentTimeParts {
    if (timeZone) {
        try {
            const parts = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'short',
                hour12: false,
                hourCycle: 'h23',
                timeZone,
            }).formatToParts(now);
            const hour = Number(parts.find((part) => part.type === 'hour')?.value);
            const minute = Number(parts.find((part) => part.type === 'minute')?.value);
            const day = WEEKDAY_INDEX[parts.find((part) => part.type === 'weekday')?.value || ''];
            if (
                Number.isInteger(hour)
                && hour >= 0
                && hour <= 24
                && Number.isInteger(minute)
                && minute >= 0
                && minute < 60
                && Number.isInteger(day)
            ) {
                return { day, minutes: (hour % 24) * 60 + minute };
            }
            logTimedCategoryTimezoneFailure(new Error('invalid_timed_category_time_parts'), timeZone);
        } catch (error) {
            logTimedCategoryTimezoneFailure(error, timeZone);
        }
    }

    return {
        day: now.getUTCDay(),
        minutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
    };
}

/**
 * Check if current time is within ANY of the time slots (new format)
 * @param timeSlots - Array of CategoryTimeSlot objects
 * @returns boolean - true if current time is within any slot
 */
export function isWithinTimeSlot(
    timeSlots?: CategoryTimeSlot[],
    timeZone?: string,
    now = new Date(),
): boolean {
    if (!timeSlots || timeSlots.length === 0) return true;

    const current = getCurrentTimePartsForTimeZone(timeZone, now);

    return timeSlots.some(slot => {
        return isMinuteWithinClockRange(current.minutes, slot.startTime, slot.endTime)
            && clockRangeAppliesOnDay(
                current.day,
                slot.days,
                current.minutes,
                slot.startTime,
                slot.endTime,
            );
    });
}

/**
 * Get the next time slot start time (for "starts at X" message)
 */
export type NextCategorySlotOccurrence = {
    dayOffset: number;
    startTime: string;
    weekday: number;
};

export function getNextSlotOccurrence(
    category: ExtractedDataCategory,
    timeZone?: string,
    now = new Date(),
): NextCategorySlotOccurrence | null {
    if (category.timeSlots?.length) {
        const current = getCurrentTimePartsForTimeZone(timeZone, now);

        let nextOccurrence: NextCategorySlotOccurrence | null = null;
        let minFutureMinutes = Infinity;

        for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
            const candidateDay = (current.day + dayOffset) % 7;
            for (const slot of category.timeSlots) {
                if (slot.days?.length && !slot.days.includes(candidateDay)) continue;
                const startTime = slot.startTime;
                if (typeof startTime !== 'string') continue;
                const startMinutes = parseClockMinutes(startTime);
                if (startMinutes === null || !isValidClockRange(startTime, slot.endTime)) continue;
                const futureMinutes = dayOffset * 24 * 60 + startMinutes - current.minutes;
                if (futureMinutes > 0 && futureMinutes < minFutureMinutes) {
                    minFutureMinutes = futureMinutes;
                    nextOccurrence = {
                        dayOffset,
                        startTime,
                        weekday: candidateDay,
                    };
                }
            }
        }

        return nextOccurrence;
    }

    return null;
}

export function getNextSlotStart(
    category: ExtractedDataCategory,
    timeZone?: string,
    now = new Date(),
): string | null {
    return getNextSlotOccurrence(category, timeZone, now)?.startTime || null;
}

/**
 * Check if a category is visible based on time
 */
export function isCategoryVisibleByTime(
    category: ExtractedDataCategory,
    timeZone?: string,
    now = new Date(),
): boolean {
    if (!category.timeSlots?.length) return true; // No restriction = always visible
    return isWithinTimeSlot(category.timeSlots, timeZone, now);
}

/**
 * Hook to manage time-based category visibility
 * Updates visibility every minute
 */
export function useTimedCategories(categories: ExtractedDataCategory[], timeZone?: string) {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    // Filter categories based on time visibility
    const visibleCategories = useMemo(() => {
        return categories.filter(category => {
            if (category.active === false) return false;
            return isCategoryVisibleByTime(category, timeZone, currentTime);
        });
    }, [categories, currentTime, timeZone]);

    // Get hidden categories (for showing "starts at X" messages)
    const hiddenByTimeCategories = useMemo(() => {
        return categories.filter(category => {
            if (category.active === false) return false;
            if (!category.timeSlots?.length) return false;
            return !isCategoryVisibleByTime(category, timeZone, currentTime);
        });
    }, [categories, currentTime, timeZone]);

    return {
        visibleCategories,
        hiddenByTimeCategories,
        currentTime,
    };
}

/**
 * Get message for hidden category
 * @param category - The hidden category
 * @param lang - Language code for category name
 * @returns Message like "Breakfast menu starts at 6:00 AM"
 */
export function getHiddenCategoryMessage(
    category: ExtractedDataCategory,
    lang: string,
    timeZone?: string,
    now = new Date(),
): string | null {
    if (!category.timeSlots?.length) return null;

    const categoryName = category.name?.[lang] || 'Menu';
    const nextStart = getNextSlotStart(category, timeZone, now);

    if (!nextStart) return null;

    const startsAt = formatTimeForDisplay(nextStart);
    return `${categoryName} starts at ${startsAt}`;
}
