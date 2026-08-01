import { APP_LANGUAGES } from "@constant/common";
import type { DateTimeFormatOptions } from "next-intl";

export const APP_LOCALE_COOKIES_KEY = `e-locale`
export const APP_TIMEZONE_COOKIES_KEY = `e-timezone`
export const APP_DATE_FORMAT_COOKIES_KEY = `e-date-format`;
export const APP_TIME_FORMAT_COOKIES_KEY = `e-time-format`;

export type Locale = string;
export const AppSupportedLocales = APP_LANGUAGES.map(l => l.value);
export const defaultLocale: Locale = 'en-US';

// Keep the SSR fallback deterministic. The selected browser preference is
// persisted separately in APP_TIMEZONE_COOKIES_KEY.
export const defaultTimezone = 'UTC';

// Safe hardcoded defaults — Intl.DateTimeFormat().resolvedOptions() does NOT
// reliably return day/month/year on all runtimes (returns undefined on some servers).
export const defaultDateFormat: DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
}
export const defaultDateFormatString = 'numeric|short|numeric';

export const defaultTimeFormat: DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true }
export const defaultTimeFormatString = `2-digit|2-digit|true`;

type DateTimeFormatsEntry = { label: string; value: DateTimeFormatOptions }
type TimeFormatsEntry = { labelHelper: string; label: string; value: DateTimeFormatOptions }

export const DATE_FORMATS: DateTimeFormatsEntry[] = [
    { label: "numeric|numeric|numeric", value: { day: 'numeric', month: 'numeric', year: 'numeric' } },
    { label: "numeric|numeric|2-digit", value: { day: 'numeric', month: 'numeric', year: '2-digit' } },
    { label: "2-digit|2-digit|numeric", value: { day: '2-digit', month: '2-digit', year: 'numeric' } },
    { label: "2-digit|short|numeric", value: { day: '2-digit', month: 'short', year: 'numeric' } },
    { label: "2-digit|short|2-digit", value: { day: '2-digit', month: 'short', year: '2-digit' } },
    { label: "2-digit|long|numeric", value: { day: '2-digit', month: 'long', year: 'numeric' } },
    { label: "2-digit|long|2-digit", value: { day: '2-digit', month: 'long', year: '2-digit' } },
]

export const TIME_FORMATS: TimeFormatsEntry[] = [
    { labelHelper: "12 Hr format", label: "numeric|numeric|true", value: { hour: 'numeric', minute: 'numeric', hour12: true } },
    { labelHelper: "12 Hr format", label: "2-digit|2-digit|true", value: { hour: '2-digit', minute: '2-digit', hour12: true } },
    { labelHelper: "24 Hr format", label: "numeric|numeric|false", value: { hour: 'numeric', minute: 'numeric', hour12: false } },
    { labelHelper: "24 Hr format", label: "2-digit|2-digit|false", value: { hour: '2-digit', minute: '2-digit', hour12: false } },
]

const supportedLocaleSet = new Set<string>(AppSupportedLocales);
const rtlLanguageCodes = new Set(['ar', 'fa', 'he', 'ks', 'sd', 'ur']);

export const isSupportedLocale = (value?: string | null): boolean => (
    Boolean(value && supportedLocaleSet.has(value))
);

export const normalizeLocalePreference = (value?: string | null): Locale | null => {
    if (!value || typeof value !== 'string') return null;

    const normalizedInput = value.trim().replace(/_/g, '-');
    if (!normalizedInput || normalizedInput === '*') return null;

    try {
        const canonical = Intl.getCanonicalLocales(normalizedInput)[0];
        if (!canonical) return null;
        if (isSupportedLocale(canonical)) return canonical as Locale;

        const baseLanguage = canonical.split('-')[0]?.toLowerCase();
        if (!baseLanguage) return null;
        if (baseLanguage === 'en') return defaultLocale;

        return AppSupportedLocales.find((locale) => (
            locale.toLowerCase() === baseLanguage
            || locale.toLowerCase().startsWith(`${baseLanguage}-`)
        )) || null;
    } catch {
        return null;
    }
};

const ACCEPT_LANGUAGE_MAX_LENGTH = 8_192;
const ACCEPT_LANGUAGE_MAX_ENTRIES = 50;
const ACCEPT_LANGUAGE_QUALITY_PATTERN = /^(?:0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/;

export const parseAcceptLanguageLocales = (value: unknown): Locale[] => {
    if (
        typeof value !== 'string'
        || value.length === 0
        || value.length > ACCEPT_LANGUAGE_MAX_LENGTH
    ) {
        return [];
    }

    const candidates = value.split(',').slice(0, ACCEPT_LANGUAGE_MAX_ENTRIES).flatMap((entry, index) => {
        const [rawLocale, ...parameters] = entry.trim().split(';');
        const locale = normalizeLocalePreference(rawLocale);
        if (!locale) return [];
        const qualityParameter = parameters
            .map((parameter) => parameter.trim())
            .find((parameter) => parameter.toLowerCase().startsWith('q='));
        const rawQuality = qualityParameter?.slice(2);
        const quality = rawQuality === undefined
            ? 1
            : ACCEPT_LANGUAGE_QUALITY_PATTERN.test(rawQuality)
                ? Number(rawQuality)
                : 0;
        return quality > 0 ? [{ index, locale, quality }] : [];
    });

    candidates.sort((left, right) => right.quality - left.quality || left.index - right.index);
    return Array.from(new Set(candidates.map(({ locale }) => locale)));
};

export const normalizeTimeZone = (
    value?: string | null,
    fallback = defaultTimezone,
): string => {
    const candidate = typeof value === 'string' ? value.trim() : '';
    if (!candidate || candidate.length > 100) return fallback;

    try {
        new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(0);
        return candidate;
    } catch {
        return fallback;
    }
};

export const normalizeDateFormatPreference = (value?: string | null): string => (
    DATE_FORMATS.some((format) => format.label === value)
        ? value as string
        : defaultDateFormatString
);

export const normalizeTimeFormatPreference = (value?: string | null): string => (
    TIME_FORMATS.some((format) => format.label === value)
        ? value as string
        : defaultTimeFormatString
);

export const getDateFormatOptions = (value?: string | null): DateTimeFormatOptions => (
    DATE_FORMATS.find((format) => format.label === normalizeDateFormatPreference(value))?.value
    || defaultDateFormat
);

export const getTimeFormatOptions = (value?: string | null): DateTimeFormatOptions => (
    TIME_FORMATS.find((format) => format.label === normalizeTimeFormatPreference(value))?.value
    || defaultTimeFormat
);

export const isRtlLocale = (value?: string | null): boolean => {
    const normalized = normalizeLocalePreference(value);
    return normalized ? rtlLanguageCodes.has(normalized.split('-')[0].toLowerCase()) : false;
};

export const getLocaleDirection = (value?: string | null): 'ltr' | 'rtl' => (
    isRtlLocale(value) ? 'rtl' : 'ltr'
);
