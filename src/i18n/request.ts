
import { match as matchLocale } from '@formatjs/intl-localematcher';
import { APP_LOCALE_COOKIES_KEY, APP_TIMEZONE_COOKIES_KEY, AppSupportedLocales, defaultLocale, defaultTimezone, Locale } from '@lib/localization/config';
import { logger } from '@lib/monitoring/logger';
import { windowRef } from '@util/window';
import Negotiator from 'negotiator';
import { IntlErrorCode } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

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
        // @ts-ignore 
        let localLocale: Locale | undefined = cookies().get(APP_LOCALE_COOKIES_KEY)?.value as Locale | undefined;
        // console.log("2. localLocale", localLocale)

        //3. get user browser locale if user accessing app first time or not selected any locale
        if (!localLocale) {
            const headersList = headers()
            const negotiatorHeaders: Record<string, string> = {}
            headersList.forEach((value, key) => (negotiatorHeaders[key] = value))
            const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
            // @ts-ignore 
            const availableLocales: string[] = AppSupportedLocales;
            // @ts-ignore 
            locale = matchLocale(languages, availableLocales, defaultLocale)
            // console.log("3. locale", locale)
        } else {
            locale = localLocale;
            // console.log("3.1. locale", locale)
        }
        if (!locale) locale = defaultLocale;

        //4. get current calling route so that we can identify which apps locals needs to be imported
        const referer = headers().get('referer');
        const currentLocalePath = "menulist.ai";
        // console.log("4. referer", referer + "/" + locale)

        //5. Normalize bare 'en' to 'en-US'; preserve specific variants like 'en-GB'
        if (locale === 'en') locale = 'en-US';
        // console.log("5. locale", locale)
        let timeZone: string | undefined = cookies().get(APP_TIMEZONE_COOKIES_KEY)?.value;
        if (!timeZone) timeZone = defaultTimezone;

        // console.log("timeZone", timeZone)
        // console.log("locale", locale)

        // Always load en-US as the fallback base
        const defaultMessages = (await import(`public/locales/${currentLocalePath}/${defaultLocale}.json`)).default;

        let messages = defaultMessages;
        if (locale !== defaultLocale) {
            try {
                const localeMessages = (await import(`public/locales/${currentLocalePath}/${locale}.json`)).default;
                // Merge: locale-specific translations override en-US, missing keys fall back to en-US
                messages = deepMerge(defaultMessages, localeMessages);
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
            fallbackMessages = (await import(`public/locales/menulist.ai/${defaultLocale}.json`)).default;
        } catch (_) { /* last-resort: empty messages, key names shown via getMessageFallback */ }

        return {
            timeZone: defaultTimezone,
            locale: defaultLocale,
            messages: fallbackMessages
        };
    }
});