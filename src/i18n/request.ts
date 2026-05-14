
import { match as matchLocale } from '@formatjs/intl-localematcher';
import { APP_LOCALE_COOKIES_KEY, APP_TIMEZONE_COOKIES_KEY, AppSupportedLocales, defaultLocale, defaultTimezone, Locale } from '@lib/localization/config';
import { logger } from '@lib/monitoring/logger';
import { windowRef } from '@util/window';
import Negotiator from 'negotiator';
import { IntlErrorCode } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import arSA from '../../public/locales/menulist.ai/ar-SA.json';
import bnIN from '../../public/locales/menulist.ai/bn-IN.json';
import enGB from '../../public/locales/menulist.ai/en-GB.json';
import enUS from '../../public/locales/menulist.ai/en-US.json';
import esES from '../../public/locales/menulist.ai/es-ES.json';
import guIN from '../../public/locales/menulist.ai/gu-IN.json';
import hiIN from '../../public/locales/menulist.ai/hi-IN.json';
import mrIN from '../../public/locales/menulist.ai/mr-IN.json';
import taIN from '../../public/locales/menulist.ai/ta-IN.json';
import teIN from '../../public/locales/menulist.ai/te-IN.json';
import zhCN from '../../public/locales/menulist.ai/zh-CN.json';

const localeMessages: Record<string, Record<string, any>> = {
    'ar-SA': arSA,
    'bn-IN': bnIN,
    'en-GB': enGB,
    'en-US': enUS,
    'es-ES': esES,
    'gu-IN': guIN,
    'hi-IN': hiIN,
    'mr-IN': mrIN,
    'ta-IN': taIN,
    'te-IN': teIN,
    'zh-CN': zhCN,
};

const supportedLocales = AppSupportedLocales as readonly string[];

function isSupportedLocale(value: string): boolean {
    return supportedLocales.includes(value);
}

function normalizeLocalePreference(value?: string | null): Locale | null {
    if (!value || typeof value !== 'string') return null;

    const normalizedInput = value.trim().replace('_', '-');
    if (!normalizedInput || normalizedInput === '*') return null;
    if (normalizedInput === 'en') return 'en-US';

    try {
        const canonical = Intl.getCanonicalLocales(normalizedInput)[0];
        if (!canonical) return null;
        if (isSupportedLocale(canonical)) return canonical as Locale;

        const baseLanguage = canonical.split('-')[0]?.toLowerCase();
        if (baseLanguage === 'en') return 'en-US';

        const supportedMatch = supportedLocales.find((locale) => (
            locale.toLowerCase() === baseLanguage ||
            locale.toLowerCase().startsWith(`${baseLanguage}-`)
        ));

        return supportedMatch ? supportedMatch as Locale : null;
    } catch (_) {
        return null;
    }
}

// Deep merge: target values overwrite source, but missing keys fall back to source
function deepMerge(source: Record<string, any>, target: Record<string, any>): Record<string, any> {
    const result = { ...source };
    for (const key of Object.keys(target)) {
        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
            && source[key] && typeof source[key] === 'object') {
            result[key] = deepMerge(source[key], target[key]);
        } else {
            result[key] = target[key];
        }
    }
    return result;
}

// https://next-intl-docs.vercel.app/docs/getting-started/app-router/without-i18n-routing
export default getRequestConfig(async () => {

    try {
        // const authorization = headers().get('authorization')

        //1.assign default locale to avoide app crash
        let locale: Locale = defaultLocale;
        // console.log("1. locale", locale)

        //2. get current user app locale (Get this from database affter saving user preferances into database)
        const localLocale = normalizeLocalePreference(cookies().get(APP_LOCALE_COOKIES_KEY)?.value);
        // console.log("2. localLocale", localLocale)

        //3. get user browser locale if user accessing app first time or not selected any locale
        if (!localLocale) {
            const headersList = headers()
            const negotiatorHeaders: Record<string, string> = {}
            headersList.forEach((value, key) => (negotiatorHeaders[key] = value))
            const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
                .map((language) => normalizeLocalePreference(language))
                .filter(Boolean) as Locale[];
            const availableLocales: string[] = AppSupportedLocales;
            locale = languages.length
                ? matchLocale(languages, availableLocales, defaultLocale) as Locale
                : defaultLocale;
            // console.log("3. locale", locale)
        } else {
            locale = localLocale;
            // console.log("3.1. locale", locale)
        }
        if (!locale) locale = defaultLocale;

        //4. get current calling route so that we can identify which apps locals needs to be imported
        const referer = headers().get('referer');
        // console.log("4. referer", referer + "/" + locale)

        //5. Normalize/sanitize selected locale before handing it to next-intl.
        locale = normalizeLocalePreference(locale) || defaultLocale;
        // console.log("5. locale", locale)
        let timeZone: string | undefined = cookies().get(APP_TIMEZONE_COOKIES_KEY)?.value;
        if (!timeZone) timeZone = defaultTimezone;

        // console.log("timeZone", timeZone)
        // console.log("locale", locale)

        // Always load en-US as the fallback base.
        // Static imports avoid missing generated JSON chunks in Next dev after route-table rebuilds.
        const defaultMessages = localeMessages[defaultLocale] || enUS;

        let messages = defaultMessages;
        if (locale !== defaultLocale) {
            try {
                const selectedLocaleMessages = localeMessages[locale];
                if (!selectedLocaleMessages) throw new Error(`Unsupported locale '${locale}'`);
                // Merge: locale-specific translations override en-US, missing keys fall back to en-US
                messages = deepMerge(defaultMessages, selectedLocaleMessages);
            } catch (error) {
                console.error(`Error loading messages for locale '${locale}', falling back to ${defaultLocale}:`, error);
                // Keep defaultMessages as fallback
            }
        }

        return {
            timeZone: timeZone || defaultTimezone,
            locale: locale || defaultLocale,
            messages,
            // Graceful error handling for missing translations in production
            onError(error) {
                if (error.code === IntlErrorCode.MISSING_MESSAGE) {
                    // Missing translations are expected for partially-translated locales
                    // Silenced in production — en-US fallback via deepMerge covers most cases
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`[i18n] Missing: ${error.message}`);
                    }
                } else {
                    console.error('[i18n] Error:', error);
                }
            },
            getMessageFallback({ namespace, key, error }) {
                const path = [namespace, key].filter(Boolean).join('.');
                if (error.code === IntlErrorCode.MISSING_MESSAGE) {
                    return key; // Show the key name as readable fallback
                }
                return path;
            }
        };

    } catch (error) {
        // Log error for debugging
        logger.error('i18n Configuration Error', error, {
            userAgent: windowRef()?.navigator?.userAgent,
            location: windowRef()?.location?.href,
        });

        // Return fallback config to prevent app crash
        let fallbackMessages = {};
        try {
            fallbackMessages = localeMessages[defaultLocale] || enUS;
        } catch (_) { /* last-resort: empty messages, key names shown via getMessageFallback */ }

        return {
            timeZone: defaultTimezone,
            locale: defaultLocale,
            messages: fallbackMessages
        };
    }
});
