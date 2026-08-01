import { defaultTimezone } from '@lib/localization/config';
import { parseClockMinutes } from '@lib/menu/timeSlotPresetBoundary';
import type { StoreSpecialHours, StoreSpecialHoursEntry } from '@type/platform/store';

export type WorkingHoursRange = Readonly<{
    endMinutes: number;
    endTime: string;
    startMinutes: number;
    startTime: string;
}>;

export const SPECIAL_HOURS_MAX_ENTRIES = 64;
export const SPECIAL_HOURS_LABEL_MAX_LENGTH = 80;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

export function normalizeWorkingHoursValue(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.toLowerCase() === 'closed') return '';

    const ranges = normalized.split(',').map((range) => range.trim());
    if (!ranges.length || ranges.some((range) => !range)) return null;

    const normalizedRanges: string[] = [];
    for (const range of ranges) {
        const match = /^((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)$/.exec(range);
        if (!match) return null;
        const startMinutes = parseClockMinutes(match[1]);
        const endMinutes = parseClockMinutes(match[2]);
        if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return null;
        normalizedRanges.push(`${match[1]}-${match[2]}`);
    }

    return normalizedRanges.join(', ');
}

export function parseWorkingHoursRanges(value: unknown): WorkingHoursRange[] {
    const normalized = normalizeWorkingHoursValue(value);
    if (!normalized) return [];

    return normalized.split(',').map((range) => {
        const [startTime, endTime] = range.trim().split('-');
        return {
            endMinutes: parseClockMinutes(endTime) as number,
            endTime,
            startMinutes: parseClockMinutes(startTime) as number,
            startTime,
        };
    });
}

export function isValidSpecialHoursDateKey(value: string): boolean {
    const match = DATE_KEY_PATTERN.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

export function addDaysToSpecialHoursDateKey(dateKey: string, days: number): string | null {
    if (!isValidSpecialHoursDateKey(dateKey) || !Number.isSafeInteger(days)) return null;
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return [
        date.getUTCFullYear().toString().padStart(4, '0'),
        (date.getUTCMonth() + 1).toString().padStart(2, '0'),
        date.getUTCDate().toString().padStart(2, '0'),
    ].join('-');
}

export function getStoreLocalDateKey(timeZone?: string, now = new Date()): string {
    const format = (resolvedTimeZone: string) => {
        const parts = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
            day: '2-digit',
            month: '2-digit',
            timeZone: resolvedTimeZone,
            year: 'numeric',
        }).formatToParts(now);
        const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
        return `${values.year}-${values.month}-${values.day}`;
    };

    try {
        return format(timeZone || defaultTimezone);
    } catch {
        return format(defaultTimezone);
    }
}

export function normalizeSpecialHoursEntry(value: unknown): StoreSpecialHoursEntry | null {
    if (!isPlainRecord(value)) return null;
    const keys = Object.keys(value);
    if (keys.some((key) => key !== 'hours' && key !== 'label')) return null;

    const hours = normalizeWorkingHoursValue(value.hours);
    if (hours === null) return null;

    let label: string | undefined;
    if (value.label !== undefined) {
        if (typeof value.label !== 'string' || /[\u0000-\u001f\u007f]/.test(value.label)) return null;
        label = value.label.trim().replace(/\s+/g, ' ');
        if (label.length > SPECIAL_HOURS_LABEL_MAX_LENGTH) return null;
    }

    return {
        hours,
        ...(label ? { label } : {}),
    };
}

export function normalizeSpecialHours(value: unknown): StoreSpecialHours | null {
    if (!isPlainRecord(value)) return null;
    const entries = Object.entries(value);
    if (entries.length > SPECIAL_HOURS_MAX_ENTRIES) return null;

    const normalized: StoreSpecialHours = {};
    for (const [dateKey, entry] of entries) {
        if (!isValidSpecialHoursDateKey(dateKey)) return null;
        const normalizedEntry = normalizeSpecialHoursEntry(entry);
        if (!normalizedEntry) return null;
        normalized[dateKey] = normalizedEntry;
    }

    return Object.fromEntries(
        Object.entries(normalized).sort(([left], [right]) => left.localeCompare(right)),
    );
}

export function getSpecialHoursEntry(
    specialHours: StoreSpecialHours | undefined,
    dateKey: string,
): StoreSpecialHoursEntry | undefined {
    if (!specialHours || !Object.prototype.hasOwnProperty.call(specialHours, dateKey)) return undefined;
    return normalizeSpecialHoursEntry(specialHours[dateKey]) || undefined;
}
