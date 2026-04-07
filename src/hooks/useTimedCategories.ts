/**
 * useTimedCategories Hook
 * 
 * Feature #3: Time-Based Categories
 * 
 * Handles time-based visibility logic for menu categories.
 * Uses browser timezone for comparison.
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

/**
 * Check if current time is within ANY of the time slots (new format)
 * @param timeSlots - Array of CategoryTimeSlot objects
 * @returns boolean - true if current time is within any slot
 */
export function isWithinTimeSlot(timeSlots?: CategoryTimeSlot[]): boolean {
    if (!timeSlots || timeSlots.length === 0) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return timeSlots.some(slot => {
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });
}

/**
 * Get the next time slot start time (for "starts at X" message)
 */
export function getNextSlotStart(category: ExtractedDataCategory): string | null {
    // Try new format first
    if (category.timeSlots?.length) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let nextStart: string | null = null;
        let minFutureMinutes = Infinity;

        for (const slot of category.timeSlots) {
            const [sh, sm] = slot.startTime.split(':').map(Number);
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
export function isCategoryVisibleByTime(category: ExtractedDataCategory): boolean {
    if (!category.timeSlots?.length) return true; // No restriction = always visible
    return isWithinTimeSlot(category.timeSlots);
}

/**
 * Hook to manage time-based category visibility
 * Updates visibility every minute
 */
export function useTimedCategories(categories: ExtractedDataCategory[]) {
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
            return isCategoryVisibleByTime(category);
        });
    }, [categories, currentTime]);

    // Get hidden categories (for showing "starts at X" messages)
    const hiddenByTimeCategories = useMemo(() => {
        return categories.filter(category => {
            if (!category.active) return false;
            if (!category.timeSlots?.length) return false;
            return !isCategoryVisibleByTime(category);
        });
    }, [categories, currentTime]);

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
    lang: string
): string | null {
    if (!category.timeSlots?.length) return null;

    const categoryName = category.name?.[lang] || 'Menu';
    const nextStart = getNextSlotStart(category);

    if (!nextStart) return null;

    const startsAt = formatTimeForDisplay(nextStart);
    return `${categoryName} starts at ${startsAt}`;
}
