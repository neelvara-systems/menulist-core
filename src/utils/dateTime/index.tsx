import { APP_TIMEZONE_COOKIES_KEY, defaultTimezone } from '@lib/localization/config';
import { getCookie } from 'cookies-next';
import { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════
// TIMEZONE
// ═══════════════════════════════════════════════════════════════

/**
 * Gets the user's preferred timezone from cookies or falls back to system default.
 * Works in both React and non-React contexts.
 */
export const getUserTimezone = (): string => {
    try {
        const tz = getCookie(APP_TIMEZONE_COOKIES_KEY) as string;
        if (tz) return tz;
    } catch {
        // Cookie access might fail in certain contexts (SSR, middleware)
    }
    return defaultTimezone;
};

// ═══════════════════════════════════════════════════════════════
// DATE NORMALISATION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise any date-like value (Timestamp, ISO string, Date, serialised
 * Firestore Timestamp {seconds, nanoseconds}) into a plain JS Date.
 */
export const toDate = (value: Timestamp | Date | string | { seconds: number; nanoseconds?: number } | { _seconds: number; _nanoseconds?: number }): Date => {
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    // Serialised Firestore Timestamp from API (plain object)
    const seconds = (value as any).seconds ?? (value as any)._seconds;
    const nanoseconds = (value as any).nanoseconds ?? (value as any)._nanoseconds ?? 0;
    if (seconds !== undefined) return new Date(seconds * 1000 + nanoseconds / 1_000_000);
    return new Date(value as any);
};

// ═══════════════════════════════════════════════════════════════
// CURRENT DATE (for display previews)
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the current moment as a plain JS Date.
 *
 * NOTE: JS Date is always UTC internally.  next-intl's formatter
 * automatically converts to the user's timezone when rendering.
 * There is NO need to shift the Date before passing it to a formatter.
 *
 * The legacy return shape `{ dateString, newDate }` is kept for
 * backward-compat with callers that destructure `.newDate`.
 */
export const getUTCDate = (d: Date = new Date()) => {
    const date = d || new Date();
    return {
        dateString: date.toISOString(),
        newDate: date,
    };
};

/** Shorthand: ISO-8601 string for any input */
export const getISOStringDate = (d: Date | string = new Date()): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString();
};

// ═══════════════════════════════════════════════════════════════
// FORMATTING  (all use next-intl formatter → timezone-aware)
// ═══════════════════════════════════════════════════════════════

type IntlFormatter = { dateTime: (date: Date, preset: string) => string };

/**
 * Format date + time using next-intl formatter (respects user prefs)
 */
export const getFormatedDateAndTime = (formatter: IntlFormatter, date: Date | string | null): string | null => {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${formatter.dateTime(d, 'date')} ${formatter.dateTime(d, 'time')}`;
};

/**
 * Format date-only using next-intl formatter (respects user prefs)
 */
export const getFormatedDate = (formatter: IntlFormatter, date: Date | string | null): string | null => {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatter.dateTime(d, 'date');
};

/**
 * Format time-only using next-intl formatter (respects user prefs)
 */
export const getFormatedTime = (formatter: IntlFormatter, date: Date | string | null): string | null => {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatter.dateTime(d, 'time');
};

/**
 * Universal date/time formatter — accepts Timestamp, Date, or ISO string.
 * Uses next-intl formatter when available, falls back to ISO string.
 */
export const formatDateTime = (
    value?: Timestamp | Date | string | null,
    mode: 'date' | 'time' | 'datetime' = 'date',
    formatter?: IntlFormatter,
): string => {
    if (!value) return 'N/A';

    const dateObj = toDate(value as any);
    if (isNaN(dateObj.getTime())) return 'N/A';

    if (!formatter) return dateObj.toISOString();

    switch (mode) {
        case 'datetime':
            return `${formatter.dateTime(dateObj, 'date')} ${formatter.dateTime(dateObj, 'time')}`;
        case 'time':
            return formatter.dateTime(dateObj, 'time');
        case 'date':
        default:
            return formatter.dateTime(dateObj, 'date');
    }
};

/**
 * Format a date in the user's timezone using native Intl.DateTimeFormat.
 * Useful outside React components where next-intl formatter isn't available.
 */
export const formatInUserTimezone = (
    d: Date = new Date(),
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' },
    specificTimezone?: string,
): string => {
    const tz = specificTimezone || getUserTimezone();
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: tz }).format(d);
};

// ═══════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════

/** ISO-8601 string for database / API storage (always UTC) */
export const toStorageFormat = (d: Date = new Date()): string => d.toISOString();

/** YYYY-MM-DD for API queries */
export const formatForApi = (date: Date | null = null): string => {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
};

// ═══════════════════════════════════════════════════════════════
// COMPARISON HELPERS
// ═══════════════════════════════════════════════════════════════

/** Check if two Timestamps are within `dayDiffAllowed` days of each other */
export const isWithinDays = (ts1: Timestamp, ts2: Timestamp, dayDiffAllowed = 1): boolean => {
    const diff = Math.abs(ts1.toDate().getTime() - ts2.toDate().getTime());
    return diff / (1000 * 60 * 60 * 24) <= dayDiffAllowed;
};

/** @deprecated Use `isWithinDays` — this name is misleading (checks N-day range, not same day) */
export const isSameDayUTC = isWithinDays;

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate time slots for time selection components
 */
export const generateTimeSlots = (interval = 15, format: '12h' | '24h' = '24h') => {
    const slots: { label: string; value: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            let label: string;
            if (format === '12h') {
                const period = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                label = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
            } else {
                label = value;
            }
            slots.push({ label, value });
        }
    }
    return slots;
};
