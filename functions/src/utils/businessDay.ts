import { resolveBusinessCategory } from '../sharedData/businessTypes';

export const DEFAULT_FOOD_BUSINESS_DAY_END_TIME = '03:00';
export const DEFAULT_CALENDAR_BUSINESS_DAY_END_TIME = '00:00';
export const ANALYTICS_SETTLEMENT_BUFFER_MINUTES = 150;

const LEGACY_FOOD_BUSINESS_KEYWORDS = [
    'bar',
    'bakery',
    'cafe',
    'coffee',
    'food',
    'ice cream',
    'kitchen',
    'parlor',
    'pizza',
    'restaurant',
    'sushi',
];

function isValidTimeZone(timeZone?: string): timeZone is string {
    if (!timeZone) return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

export function parseBusinessDayEndMinutes(value?: unknown): number | null {
    if (typeof value !== 'string') return null;
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

export function normalizeBusinessDayEndTime(
    value?: unknown,
    fallback: unknown = DEFAULT_FOOD_BUSINESS_DAY_END_TIME,
): string {
    if (parseBusinessDayEndMinutes(value) !== null) return (value as string).trim();
    return parseBusinessDayEndMinutes(fallback) !== null
        ? (fallback as string).trim()
        : DEFAULT_FOOD_BUSINESS_DAY_END_TIME;
}

export function resolveDefaultBusinessDayEndTime(businessType?: unknown, businessCategory?: unknown): string {
    const normalizedBusinessType = typeof businessType === 'string' ? businessType : undefined;
    const normalizedBusinessCategory = typeof businessCategory === 'string' ? businessCategory : undefined;
    const category = resolveBusinessCategory(normalizedBusinessType, normalizedBusinessCategory);
    if (category) {
        return category === 'food'
            ? DEFAULT_FOOD_BUSINESS_DAY_END_TIME
            : DEFAULT_CALENDAR_BUSINESS_DAY_END_TIME;
    }

    const normalizedType = normalizedBusinessType?.trim().toLowerCase() || '';
    if (!normalizedType) return DEFAULT_FOOD_BUSINESS_DAY_END_TIME;

    return LEGACY_FOOD_BUSINESS_KEYWORDS.some((keyword) => normalizedType.includes(keyword))
        ? DEFAULT_FOOD_BUSINESS_DAY_END_TIME
        : DEFAULT_CALENDAR_BUSINESS_DAY_END_TIME;
}

export function resolveBusinessDayEndTime(businessType?: unknown, value?: unknown, businessCategory?: unknown): string {
    return normalizeBusinessDayEndTime(value, resolveDefaultBusinessDayEndTime(businessType, businessCategory));
}

function formatLocalParts(date: Date, timeZone?: string): {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
} {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    return {
        year: parts.find((part) => part.type === 'year')?.value || '1970',
        month: parts.find((part) => part.type === 'month')?.value || '01',
        day: parts.find((part) => part.type === 'day')?.value || '01',
        hour: parts.find((part) => part.type === 'hour')?.value || '00',
        minute: parts.find((part) => part.type === 'minute')?.value || '00',
    };
}

export function getBusinessAnalyticsDateKey(
    date: Date = new Date(),
    timeZone?: string,
    businessDayEndTime?: string,
): string {
    const parts = formatLocalParts(date, timeZone);
    const localDateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const endMinutes = parseBusinessDayEndMinutes(businessDayEndTime) ?? parseBusinessDayEndMinutes(DEFAULT_FOOD_BUSINESS_DAY_END_TIME)!;
    if (endMinutes <= 0) return localDateKey;

    const localMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    if (localMinutes >= endMinutes) return localDateKey;

    const shifted = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    shifted.setUTCDate(shifted.getUTCDate() - 1);
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

export function getAnalyticsSettlementLocalMinutes(businessDayEndTime?: string): number {
    const endMinutes = parseBusinessDayEndMinutes(businessDayEndTime) ?? parseBusinessDayEndMinutes(DEFAULT_FOOD_BUSINESS_DAY_END_TIME)!;
    return (endMinutes + ANALYTICS_SETTLEMENT_BUFFER_MINUTES) % (24 * 60);
}

function shiftDateKey(dateKey: string, days: number): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

export function getAnalyticsSettlementCycleDateKey(
    date: Date = new Date(),
    timeZone?: string,
    businessDayEndTime?: string,
): string {
    const parts = formatLocalParts(date, timeZone);
    const localDateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const settlementMinutes = getAnalyticsSettlementLocalMinutes(businessDayEndTime);
    const localMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    return localMinutes >= settlementMinutes ? localDateKey : shiftDateKey(localDateKey, -1);
}

export function getLatestSettledBusinessDateKey(
    date: Date = new Date(),
    timeZone?: string,
    businessDayEndTime?: string,
): string {
    const cycleDateKey = getAnalyticsSettlementCycleDateKey(date, timeZone, businessDayEndTime);
    return shiftDateKey(cycleDateKey, -1);
}

export function isAnalyticsSettlementDue(
    date: Date,
    timeZone?: string,
    businessDayEndTime?: string,
): boolean {
    const dueMinutes = getAnalyticsSettlementLocalMinutes(businessDayEndTime);
    const parts = formatLocalParts(date, timeZone);
    const localMinutes = Number(parts.hour) * 60 + Number(parts.minute);

    for (let offset = 0; offset < 60; offset++) {
        if ((dueMinutes + offset) % (24 * 60) === localMinutes) return true;
    }

    return false;
}
