const ABSOLUTE_GOOGLE_ANALYTICS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RELATIVE_GOOGLE_ANALYTICS_DATE_PATTERN = /^(\d{1,3})daysago$/i;
const GOOGLE_ANALYTICS_MAX_DATE_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DASHBOARD_PREFERENCE_START_DATES: Record<string, string> = {
    '7days': '7daysAgo',
    '30days': '30daysAgo',
    '90days': '90daysAgo',
};

export type GoogleAnalyticsDateRange = {
    startDate: string;
    endDate: string;
};

function getUtcStartOfToday(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseAbsoluteGoogleAnalyticsDate(value: string): Date | null {
    const match = value.match(ABSOLUTE_GOOGLE_ANALYTICS_DATE_PATTERN);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
        parsed.getUTCFullYear() !== year
        || parsed.getUTCMonth() !== month - 1
        || parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return parsed;
}

function normalizeGoogleAnalyticsDate(rawDate: string | null | undefined): string | null {
    const trimmed = String(rawDate || '').trim();
    if (!trimmed) return null;

    const dashboardPreferenceDate = DASHBOARD_PREFERENCE_START_DATES[trimmed.toLowerCase()];
    if (dashboardPreferenceDate) return dashboardPreferenceDate;

    if (trimmed.toLowerCase() === 'today') return 'today';
    if (trimmed.toLowerCase() === 'yesterday') return 'yesterday';

    const relativeMatch = trimmed.match(RELATIVE_GOOGLE_ANALYTICS_DATE_PATTERN);
    if (relativeMatch) {
        const dayCount = Number(relativeMatch[1]);
        if (!Number.isInteger(dayCount) || dayCount < 0 || dayCount > GOOGLE_ANALYTICS_MAX_DATE_RANGE_DAYS) {
            return null;
        }
        return `${dayCount}daysAgo`;
    }

    const absoluteDate = parseAbsoluteGoogleAnalyticsDate(trimmed);
    if (!absoluteDate) return null;
    if (absoluteDate.getTime() > getUtcStartOfToday().getTime()) return null;

    return trimmed;
}

function resolveGoogleAnalyticsDate(value: string): Date | null {
    const today = getUtcStartOfToday();
    if (value === 'today') return today;
    if (value === 'yesterday') return new Date(today.getTime() - MS_PER_DAY);

    const relativeMatch = value.match(RELATIVE_GOOGLE_ANALYTICS_DATE_PATTERN);
    if (relativeMatch) {
        const dayCount = Number(relativeMatch[1]);
        return new Date(today.getTime() - (dayCount * MS_PER_DAY));
    }

    return parseAbsoluteGoogleAnalyticsDate(value);
}

export function normalizeGoogleAnalyticsDateRange(
    rawStartDate: string | null | undefined,
    rawEndDate: string | null | undefined,
    defaults: Partial<GoogleAnalyticsDateRange> = {},
): GoogleAnalyticsDateRange | null {
    const startDate = normalizeGoogleAnalyticsDate(rawStartDate ?? defaults.startDate);
    const endDate = normalizeGoogleAnalyticsDate(rawEndDate ?? defaults.endDate);
    if (!startDate || !endDate) return null;

    const resolvedStartDate = resolveGoogleAnalyticsDate(startDate);
    const resolvedEndDate = resolveGoogleAnalyticsDate(endDate);
    if (!resolvedStartDate || !resolvedEndDate) return null;
    if (resolvedStartDate.getTime() > resolvedEndDate.getTime()) return null;

    const rangeDays = Math.floor((resolvedEndDate.getTime() - resolvedStartDate.getTime()) / MS_PER_DAY);
    if (rangeDays > GOOGLE_ANALYTICS_MAX_DATE_RANGE_DAYS) return null;

    return { startDate, endDate };
}
