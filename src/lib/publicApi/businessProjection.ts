import { normalizeBusinessAttributes } from '@lib/obp/businessAttributes';
import { getActiveTempStatus, type ActiveTempStatus } from '@lib/tempStatus/statusBoundary';
import { normalizeWorkingHoursValue } from '@lib/hours/hoursBoundary';
import { WORKING_HOURS_DAY_KEYS } from '@lib/hours/hoursEngine';

export type PublicTempStatus = ActiveTempStatus;

export function normalizePublicBusinessAttributes(value: unknown): Record<string, boolean> | null {
    const normalized = normalizeBusinessAttributes(value);
    return Object.keys(normalized).length > 0 ? normalized : null;
}

export function getActivePublicTempStatus(
    value: unknown,
    nowMs: number = Date.now(),
): PublicTempStatus | null {
    return getActiveTempStatus(value, nowMs);
}

const PUBLIC_BUSINESS_TEXT_MAX_LENGTH = 10_000;
const PUBLIC_BUSINESS_RECORD_MAX_ENTRIES = 32;

const getPlainDataRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    try {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) return null;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set)) return null;
        return Object.fromEntries(
            Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
        );
    } catch {
        return null;
    }
};

export function normalizePublicBusinessText(
    value: unknown,
    maxLength: number = PUBLIC_BUSINESS_TEXT_MAX_LENGTH,
): string | null {
    if (typeof value !== 'string' || !Number.isSafeInteger(maxLength) || maxLength <= 0) return null;
    const normalized = value.trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
}

export function normalizePublicBusinessWorkingHours(value: unknown): Record<string, string> | null {
    const record = getPlainDataRecord(value);
    if (!record) return null;
    const entries = Object.entries(record);
    if (
        entries.length === 0
        || entries.length > WORKING_HOURS_DAY_KEYS.length
        || entries.some(([day]) => !WORKING_HOURS_DAY_KEYS.includes(day as (typeof WORKING_HOURS_DAY_KEYS)[number]))
    ) return null;

    const normalizedEntries = entries.map(([day, hours]) => [day, normalizeWorkingHoursValue(hours)] as const);
    if (normalizedEntries.some(([, hours]) => hours === null)) return null;
    return Object.fromEntries(normalizedEntries) as Record<string, string>;
}

export function normalizePublicBusinessStringRecord(value: unknown): Record<string, string> | null {
    const record = getPlainDataRecord(value);
    if (!record) return null;
    const entries = Object.entries(record);
    if (
        entries.length === 0
        || entries.length > PUBLIC_BUSINESS_RECORD_MAX_ENTRIES
        || entries.some(([key, entry]) => (
            !key
            || key.length > 64
            || /[\u0000-\u001f\u007f]/.test(key)
            || normalizePublicBusinessText(entry, 2_048) === null
        ))
    ) return null;
    return Object.fromEntries(
        entries.map(([key, entry]) => [key, normalizePublicBusinessText(entry, 2_048) as string]),
    );
}

export function normalizePublicBusinessGeo(value: unknown): { latitude: number; longitude: number } | null {
    const record = getPlainDataRecord(value);
    if (!record || Object.keys(record).some((key) => key !== 'latitude' && key !== 'longitude')) return null;
    const { latitude, longitude } = record;
    return typeof latitude === 'number'
        && Number.isFinite(latitude)
        && latitude >= -90
        && latitude <= 90
        && typeof longitude === 'number'
        && Number.isFinite(longitude)
        && longitude >= -180
        && longitude <= 180
        ? { latitude, longitude }
        : null;
}

export function normalizePublicBusinessLastModified(value: unknown): string | null {
    if (typeof value === 'string') {
        const normalized = normalizePublicBusinessText(value, 40);
        if (!normalized) return null;
        const milliseconds = Date.parse(normalized);
        return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === normalized
            ? normalized
            : null;
    }

    try {
        const date = value instanceof Date
            ? value
            : value && typeof value === 'object' && typeof Reflect.get(value, 'toDate') === 'function'
                ? Reflect.apply(Reflect.get(value, 'toDate'), value, [])
                : null;
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
}
