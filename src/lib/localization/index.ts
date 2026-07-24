'use server';

import { DateTimeFormatOptions } from 'next-intl';
import { cookies } from 'next/headers';
import {
    APP_DATE_FORMAT_COOKIES_KEY,
    APP_LOCALE_COOKIES_KEY,
    APP_TIME_FORMAT_COOKIES_KEY,
    APP_TIMEZONE_COOKIES_KEY,
    getDateFormatOptions,
    getTimeFormatOptions,
    Locale,
    normalizeDateFormatPreference,
    normalizeLocalePreference,
    normalizeTimeFormatPreference,
    normalizeTimeZone,
} from './config';

const PREFERENCE_COOKIE_OPTIONS = {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
};

export async function getUserLocale(): Promise<Locale> {
    return normalizeLocalePreference((await cookies()).get(APP_LOCALE_COOKIES_KEY)?.value) || 'en-US';
}

export async function setUserLocale(locale: Locale) {
    const normalized = normalizeLocalePreference(locale);
    if (!normalized) throw new Error('locale_preference_invalid');
    (await cookies()).set(APP_LOCALE_COOKIES_KEY, normalized, PREFERENCE_COOKIE_OPTIONS);
}

export async function setUserTimezone(timeZone: string) {
    const normalized = normalizeTimeZone(timeZone, '');
    if (!normalized) throw new Error('timezone_preference_invalid');
    (await cookies()).set(APP_TIMEZONE_COOKIES_KEY, normalized, PREFERENCE_COOKIE_OPTIONS);
}

export async function setUserDateFormat(format: string) {
    const normalized = normalizeDateFormatPreference(format);
    if (normalized !== format) throw new Error('date_format_preference_invalid');
    (await cookies()).set(APP_DATE_FORMAT_COOKIES_KEY, normalized, PREFERENCE_COOKIE_OPTIONS);
}

export async function setUserTimeFormat(format: string) {
    const normalized = normalizeTimeFormatPreference(format);
    if (normalized !== format) throw new Error('time_format_preference_invalid');
    (await cookies()).set(APP_TIME_FORMAT_COOKIES_KEY, normalized, PREFERENCE_COOKIE_OPTIONS);
}

export async function getUserDateFormat(): Promise<DateTimeFormatOptions> {
    return getDateFormatOptions((await cookies()).get(APP_DATE_FORMAT_COOKIES_KEY)?.value);
}

export async function getUserTimeFormat(): Promise<DateTimeFormatOptions> {
    return getTimeFormatOptions((await cookies()).get(APP_TIME_FORMAT_COOKIES_KEY)?.value);
}
