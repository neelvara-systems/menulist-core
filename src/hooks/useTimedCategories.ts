/**
 * useTimedCategories Hook
 * 
 * Feature #3: Time-Based Categories
 * 
 * Handles time-based visibility logic for menu categories.
 * Uses store timezone when provided, falling back to browser timezone.
 * 
 * FORMAT: timeSlots?: CategoryTimeSlot[] with presetId support
 * 
 * - If undefined/empty = always visible
 * - If has entries = visible only during those windows
 */

import { CategoryTimeSlot, ExtractedDataCategory } from '@template/main-app/projects/types';
import { formatClockTime } from '@util/dateTime';
import { useEffect, useMemo, useState } from 'react';

/**
 * Format time for display in user's locale
 * @param time - Time in "HH:mm" format
 * @returns Formatted time string (e.g., "6:00 AM" or "06:00")
 */
export function formatTimeForDisplay(time: string): string {
    if (!time) return '';
    return formatClockTime(time);
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

    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);

    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
        return { valid: false, error: 'Invalid time format' };
    }

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (startMinutes >= endMinutes) {
        return { valid: false, error: 'End time must be after start time' };
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

function getCurrentMinutesForTimeZone(timeZone?: string, now = new Date()): number {
    if (timeZone) {
        try {
            const parts = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                hourCycle: 'h23',
                timeZone,
            }).formatToParts(now);
            const hour = Number(parts.find((part) => part.type === 'hour')?.value);
            const minute = Number(parts.find((part) => part.type === 'minute')?.value);
            if (Number.isFinite(hour) && Number.isFinite(minute)) {
                return hour * 60 + minute;
            }
        } catch {
            // Fall back to browser/server local time.
        }
    }

    return now.getHours() * 60 + now.getMinutes();
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

    const currentMinutes = getCurrentMinutesForTimeZone(timeZone, now);

    return timeSlots.some(slot => {
        if (!slot.startTime || !slot.endTime) return false;
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        if (![sh, sm, eh, em].every(Number.isFinite)) return false;
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        if (startMinutes >= endMinutes) return false;
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });
}

/**
 * Get the next time slot start time (for "starts at X" message)
 */
export function getNextSlotStart(
    category: ExtractedDataCategory,
    timeZone?: string,
): string | null {
    // Try new format first
    if (category.timeSlots?.length) {
        const currentMinutes = getCurrentMinutesForTimeZone(timeZone);

        let nextStart: string | null = null;
        let minFutureMinutes = Infinity;

        for (const slot of category.timeSlots) {
            if (!slot.startTime) continue;
            const [sh, sm] = slot.startTime.split(':').map(Number);
            if (![sh, sm].every(Number.isFinite)) continue;
            const startMinutes = sh * 60 + sm;

            if (startMinutes > currentMinutes && startMinutes < minFutureMinutes) {
                minFutureMinutes = startMinutes;
                nextStart = slot.startTime;
            }
        }

        if (!nextStart && category.timeSlots.length > 0) {
            nextStart = category.timeSlots[0].startTime;
        }

        return nextStart;
    }

    return null;
}

/**
 * Check if a category is visible based on time
 */
export function isCategoryVisibleByTime(
    category: ExtractedDataCategory,
    timeZone?: string,
): boolean {
    if (!category.timeSlots?.length) return true; // No restriction = always visible
    return isWithinTimeSlot(category.timeSlots, timeZone);
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
            if (!category.active) return false;
            return isCategoryVisibleByTime(category, timeZone);
        });
    }, [categories, currentTime, timeZone]);

    // Get hidden categories (for showing "starts at X" messages)
    const hiddenByTimeCategories = useMemo(() => {
        return categories.filter(category => {
            if (!category.active) return false;
            if (!category.timeSlots?.length) return false;
            return !isCategoryVisibleByTime(category, timeZone);
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
): string | null {
    if (!category.timeSlots?.length) return null;

    const categoryName = category.name?.[lang] || 'Menu';
    const nextStart = getNextSlotStart(category, timeZone);

    if (!nextStart) return null;

    const startsAt = formatTimeForDisplay(nextStart);
    return `${categoryName} starts at ${startsAt}`;
}
