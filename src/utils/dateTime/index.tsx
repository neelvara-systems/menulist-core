import {
    APP_LOCALE_COOKIES_KEY,
    APP_TIMEZONE_COOKIES_KEY,
    defaultLocale,
    defaultTimezone,
    getTimeFormatOptions,
    normalizeLocalePreference,
    normalizeTimeZone,
} from '@lib/localization/config';
import { getCookie } from 'cookies-next';
import { Timestamp } from 'firebase/firestore';
import { DateTimeFormatOptions } from 'next-intl';
import { getUserDateFormatOptions, getUserTimeFormatOptions } from '../formatters';

// ═══════════════════════════════════════════════════════════════
// TIMEZONE
// ═══════════════════════════════════════════════════════════════

/**
 * Gets the user's preferred timezone from cookies or falls back to system default.
 * Works in both React and non-React contexts.
 */
export const getUserTimezone = (): string => {
    try {
        return normalizeTimeZone(getCookie(APP_TIMEZONE_COOKIES_KEY) as string);
    } catch {
        // Cookie access might fail in certain contexts (SSR, middleware)
    }
    return defaultTimezone;
};

// ═══════════════════════════════════════════════════════════════
// DATE NORMALISATION
// ═══════════════════════════════════════════════════════════════

export type DateLike = Timestamp | Date | string | number | {
    nanoseconds?: number;
    seconds?: number;
} | {
    _nanoseconds?: number;
    _seconds?: number;
} | null | undefined;

const invalidDate = (): Date => new Date(Number.NaN);

const getDataProperty = (value: object, keys: readonly string[]): unknown => {
    for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
            return descriptor.value;
        }
    }
    return undefined;
};

const getPrototypeDataMethod = (
    value: object,
    key: string,
): ((this: object) => unknown) | null => {
    let current: object | null = value;
    for (let depth = 0; current && depth < 8; depth += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor) {
            return Object.prototype.hasOwnProperty.call(descriptor, 'value')
                && typeof descriptor.value === 'function'
                ? descriptor.value as (this: object) => unknown
                : null;
        }
        current = Object.getPrototypeOf(current);
    }
    return null;
};

const isValidDateObject = (value: unknown): value is Date => {
    if (!(value instanceof Date)) return false;
    try {
        return Number.isFinite(Date.prototype.getTime.call(value));
    } catch {
        return false;
    }
};

/**
 * Normalise any date-like value (Timestamp, ISO string, Date, serialised
 * Firestore Timestamp {seconds, nanoseconds}) into a plain JS Date.
 */
export const toDate = (value: DateLike): Date => {
    try {
        if (value === null || value === undefined || value === '') return invalidDate();
        if (value instanceof Date) return isValidDateObject(value) ? value : invalidDate();
        if (value instanceof Timestamp) {
            const converted = value.toDate();
            return isValidDateObject(converted) ? converted : invalidDate();
        }
        if (typeof value === 'string' || typeof value === 'number') {
            const converted = new Date(value);
            return isValidDateObject(converted) ? converted : invalidDate();
        }
        if (typeof value !== 'object' || Array.isArray(value)) return invalidDate();

        const toDateMethod = getPrototypeDataMethod(value, 'toDate');
        if (toDateMethod) {
            const converted = toDateMethod.call(value);
            return isValidDateObject(converted) ? converted : invalidDate();
        }

        // Serialised Firestore Timestamp from API (plain data properties only).
        const seconds = getDataProperty(value, ['seconds', '_seconds']);
        const nanoseconds = getDataProperty(value, ['nanoseconds', '_nanoseconds']) ?? 0;
        if (
            typeof seconds !== 'number'
            || !Number.isFinite(seconds)
            || typeof nanoseconds !== 'number'
            || !Number.isInteger(nanoseconds)
            || nanoseconds < 0
            || nanoseconds > 999_999_999
        ) {
            return invalidDate();
        }
        const converted = new Date(seconds * 1000 + nanoseconds / 1_000_000);
        return isValidDateObject(converted) ? converted : invalidDate();
    } catch {
        return invalidDate();
    }
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

export type IntlFormatter = { dateTime: (date: Date, preset: string) => string };
export type DateTimeDisplayMode = 'date' | 'time' | 'datetime';

/**
 * Format date + time using next-intl formatter (respects user prefs)
 */
export const getFormatedDateAndTime = (formatter: IntlFormatter, date: DateLike): string | null => {
    if (date === null || date === undefined || date === '') return null;
    const d = toDate(date);
    if (isNaN(d.getTime())) return null;
    return `${formatter.dateTime(d, 'date')} ${formatter.dateTime(d, 'time')}`;
};

/**
 * Format date-only using next-intl formatter (respects user prefs)
 */
export const getFormatedDate = (formatter: IntlFormatter, date: DateLike): string | null => {
    if (date === null || date === undefined || date === '') return null;
    const d = toDate(date);
    if (isNaN(d.getTime())) return null;
    return formatter.dateTime(d, 'date');
};

/**
 * Format time-only using next-intl formatter (respects user prefs)
 */
export const getFormatedTime = (formatter: IntlFormatter, date: DateLike): string | null => {
    if (date === null || date === undefined || date === '') return null;
    const d = toDate(date);
    if (isNaN(d.getTime())) return null;
    return formatter.dateTime(d, 'time');
};

/**
 * Universal date/time formatter — accepts Timestamp, Date, or ISO string.
 * Uses next-intl formatter when available, then a safe native Intl fallback.
 */
export const formatDateTime = (
    value?: DateLike,
    mode: DateTimeDisplayMode = 'date',
    formatter?: IntlFormatter,
): string => {
    if (value === null || value === undefined || value === '') return 'N/A';

    const dateObj = toDate(value as any);
    if (isNaN(dateObj.getTime())) return 'N/A';

    if (!formatter) {
        const locale = resolveLocalePreference();
        const timeZone = getUserTimezone();
        const dateOptions = getUserDateFormatOptions();
        const timeOptions = getUserTimeFormatOptions();
        const dateLabel = new Intl.DateTimeFormat(locale, { ...dateOptions, timeZone }).format(dateObj);
        const timeLabel = new Intl.DateTimeFormat(locale, { ...timeOptions, timeZone }).format(dateObj);

        if (mode === 'time') return timeLabel;
        if (mode === 'datetime') return `${dateLabel} ${timeLabel}`;
        return dateLabel;
    }

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

export const formatDateRange = (
    start?: DateLike,
    end?: DateLike,
    formatter?: IntlFormatter,
    fallback = 'N/A',
): string => {
    const startLabel = formatDateTime(start, 'date', formatter);
    const endLabel = formatDateTime(end, 'date', formatter);
    if (startLabel === 'N/A' && endLabel === 'N/A') return fallback;
    if (startLabel === 'N/A') return endLabel;
    if (endLabel === 'N/A' || startLabel === endLabel) return startLabel;
    return `${startLabel} - ${endLabel}`;
};

export const formatDateTimeRange = (
    start?: DateLike,
    end?: DateLike,
    formatter?: IntlFormatter,
    fallback = 'N/A',
): string => {
    const startDate = formatDateTime(start, 'date', formatter);
    const startTime = formatDateTime(start, 'time', formatter);
    const endDate = formatDateTime(end, 'date', formatter);
    const endTime = formatDateTime(end, 'time', formatter);

    if (startDate === 'N/A' && endDate === 'N/A') return fallback;
    if (startDate === 'N/A') return `${endDate} ${endTime}`;
    if (endDate === 'N/A') return `${startDate} ${startTime}`;
    if (startDate === endDate) return `${startDate} ${startTime} - ${endTime}`;
    return `${startDate} ${startTime} - ${endDate} ${endTime}`;
};

export const dateKeyToStorageInstant = (value: string, timeZone?: string): string => {
    const trimmed = value.trim();
    const dashedMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dashedMatch) return fromNativeDateInputValue(trimmed, timeZone);

    const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
    if (compactMatch) {
        return fromNativeDateInputValue(`${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`, timeZone);
    }

    return trimmed;
};

export const formatDateKey = (
    value?: string | null,
    formatter?: IntlFormatter,
    fallback = 'N/A',
): string => {
    if (!value) return fallback;
    const label = formatDateTime(dateKeyToStorageInstant(value), 'date', formatter);
    return label === 'N/A' ? fallback : label;
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
    const tz = normalizeTimeZone(specificTimezone, getUserTimezone());
    return new Intl.DateTimeFormat(resolveLocalePreference(), { ...options, timeZone: tz }).format(d);
};

const getZonedParts = (date: Date, timeZone?: string): Record<string, string> => {
    const tz = normalizeTimeZone(timeZone, getUserTimezone());
    return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        month: '2-digit',
        second: '2-digit',
        timeZone: tz,
        year: 'numeric',
    }).formatToParts(date).map((part) => [part.type, part.value]));
};

const getTimeZoneOffsetMs = (date: Date, timeZone?: string): number => {
    const parts = getZonedParts(date, timeZone);
    const asUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour === '24' ? '0' : parts.hour),
        Number(parts.minute),
        Number(parts.second),
    );
    return asUtc - date.getTime();
};

const zonedDateTimeToUtc = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    timeZone?: string,
): Date => {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
    const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
    const firstResult = new Date(utcGuess - firstOffset);
    const secondOffset = getTimeZoneOffsetMs(firstResult, timeZone);
    return new Date(utcGuess - secondOffset);
};

const matchesZonedDateTime = (
    date: Date,
    {
        day,
        hour,
        minute,
        month,
        year,
    }: {
        day: number;
        hour: number;
        minute: number;
        month: number;
        year: number;
    },
    timeZone?: string,
): boolean => {
    const parts = getZonedParts(date, timeZone);
    return Number(parts.year) === year
        && Number(parts.month) === month
        && Number(parts.day) === day
        && Number(parts.hour === '24' ? '0' : parts.hour) === hour
        && Number(parts.minute) === minute;
};

const isValidCalendarDate = (year: number, month: number, day: number): boolean => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;

    const candidate = new Date(Date.UTC(year, month - 1, day));
    return candidate.getUTCFullYear() === year
        && candidate.getUTCMonth() === month - 1
        && candidate.getUTCDate() === day;
};

export const toNativeDateInputValue = (value?: DateLike, timeZone?: string): string => {
    const date = toDate(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = getZonedParts(date, timeZone);
    return `${parts.year}-${parts.month}-${parts.day}`;
};

export const toNativeDateTimeInputValue = (value?: DateLike, timeZone?: string): string => {
    const date = toDate(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = getZonedParts(date, timeZone);
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
};

export const fromNativeDateInputValue = (value: string, timeZone?: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return '';
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidCalendarDate(year, month, day)) return '';
    const converted = zonedDateTimeToUtc(year, month, day, 0, 0, timeZone);
    return matchesZonedDateTime(converted, { day, hour: 0, minute: 0, month, year }, timeZone)
        ? converted.toISOString()
        : '';
};

export const fromNativeDateTimeInputValue = (value: string, timeZone?: string): string => {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) return '';
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    if (!isValidCalendarDate(year, month, day) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
    const converted = zonedDateTimeToUtc(year, month, day, hour, minute, timeZone);
    return matchesZonedDateTime(converted, { day, hour, minute, month, year }, timeZone)
        ? converted.toISOString()
        : '';
};

// ═══════════════════════════════════════════════════════════════
// CLOCK-TIME HELPERS (HH:mm stored values, display by user preference)
// ═══════════════════════════════════════════════════════════════

const resolveClockTimeFormatOptions = (timeFormat?: string): DateTimeFormatOptions => {
    return timeFormat ? getTimeFormatOptions(timeFormat) : getUserTimeFormatOptions();
};

const resolveLocalePreference = (locale?: string): string => {
    if (locale) return normalizeLocalePreference(locale) || defaultLocale;
    try {
        const cookieValue = getCookie(APP_LOCALE_COOKIES_KEY) as string;
        return normalizeLocalePreference(cookieValue) || defaultLocale;
    } catch {
        // Cookie access may fail outside browser contexts.
    }
    return defaultLocale;
};

const buildUtcReferenceDate = (time24: string): Date | null => {
    const match = /^(\d{2}):(\d{2})$/.exec(time24);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return new Date(Date.UTC(2000, 0, 1, hours, minutes, 0));
};

export const formatClockTime = (time24: string, timeFormat?: string, locale?: string): string => {
    const referenceDate = buildUtcReferenceDate(time24);
    if (!referenceDate) return time24;

    return new Intl.DateTimeFormat(resolveLocalePreference(locale), {
        ...resolveClockTimeFormatOptions(timeFormat),
        timeZone: 'UTC',
    }).format(referenceDate);
};

export const buildClockTimeOptions = (timeFormat?: string, locale?: string): { label: string; value: string }[] => {
    const options: { label: string; value: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (const minute of [0, 15, 30, 45]) {
            const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            options.push({
                label: formatClockTime(value, timeFormat, locale),
                value,
            });
        }
    }
    return options;
};

export const getClockTimeInputFormat = (timeFormat?: string): string => {
    const options = resolveClockTimeFormatOptions(timeFormat);
    const is24Hour = options.hour12 === false;
    const usesDoubleDigitHour = options.hour === '2-digit';
    return is24Hour
        ? (usesDoubleDigitHour ? 'HH:mm' : 'H:mm')
        : (usesDoubleDigitHour ? 'hh:mm A' : 'h:mm A');
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
