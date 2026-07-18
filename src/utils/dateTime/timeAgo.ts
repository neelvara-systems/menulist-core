import { defaultLocale, normalizeLocalePreference } from '@lib/localization/config';

const RELATIVE_UNITS: Array<{
    milliseconds: number;
    unit: Intl.RelativeTimeFormatUnit;
}> = [
    { milliseconds: 365 * 24 * 60 * 60 * 1000, unit: 'year' },
    { milliseconds: 30 * 24 * 60 * 60 * 1000, unit: 'month' },
    { milliseconds: 7 * 24 * 60 * 60 * 1000, unit: 'week' },
    { milliseconds: 24 * 60 * 60 * 1000, unit: 'day' },
    { milliseconds: 60 * 60 * 1000, unit: 'hour' },
    { milliseconds: 60 * 1000, unit: 'minute' },
];

export function timeAgo(dateParam: Date, locale?: string, now = Date.now()): string {
    const timestamp = new Date(dateParam).getTime();
    if (!Number.isFinite(timestamp)) return '';

    const difference = timestamp - now;
    const formatter = new Intl.RelativeTimeFormat(
        normalizeLocalePreference(locale) || defaultLocale,
        { numeric: 'auto', style: 'short' },
    );

    const resolved = RELATIVE_UNITS.find(({ milliseconds }) => Math.abs(difference) >= milliseconds);
    if (!resolved) return formatter.format(0, 'second');

    return formatter.format(Math.round(difference / resolved.milliseconds), resolved.unit);
}
