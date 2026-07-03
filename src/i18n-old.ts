import { match as matchLocale } from '@formatjs/intl-localematcher';
import { APP_LOCALE_COOKIES_KEY, APP_TIMEZONE_COOKIES_KEY, AppSupportedLocales, defaultLocale, defaultTimezone, Locale } from '@lib/localization/config';
import Negotiator from 'negotiator';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { getBoundedI18nStringContext, logI18nFailure } from './i18n/diagnostics';

// https://next-intl-docs.vercel.app/docs/getting-started/app-router/without-i18n-routing
export default getRequestConfig(async () => {

    try {
        // const authorization = headers().get('authorization')

        //1.assign default locale to avoide app crash
        let locale: Locale = defaultLocale;

        //2. get current user app locale (Get this from database affter saving user preferances into database)
        // @ts-ignore 
        let localLocale: Locale = cookies().get(APP_LOCALE_COOKIES_KEY)?.value || defaultLocale

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
        } else {
            locale = localLocale;
        }
        if (!locale) locale = defaultLocale;

        //4. get current calling route so that we can identify which apps locals needs to be imported
        const referer = headers().get('referer');
        const currentLocalePath = "menulist.ai";

        //5. redirect all en to en_us
        locale = (locale.includes("en")) ? "en-US" : locale
        let timeZone: Locale = cookies().get(APP_TIMEZONE_COOKIES_KEY)?.value;
        if (!timeZone) timeZone = defaultTimezone;

        let messages;
        try {
            messages = (await import(`public/locales/${currentLocalePath}/${locale}.json`)).default;
        } catch (error) {
            logI18nFailure('i18n_old_locale_messages_load_failed', error, {
                ...getBoundedI18nStringContext('locale', locale),
                ...getBoundedI18nStringContext('defaultLocale', defaultLocale),
                hasReferer: Boolean(referer),
            });
            // Fallback to default locale if the requested locale's messages can't be loaded
            try {
                messages = (await import(`public/locales/${currentLocalePath}/${defaultLocale}.json`)).default;
                locale = defaultLocale; // Also update the locale to match the messages
            } catch (fallbackError) {
                logI18nFailure('i18n_old_fallback_messages_load_failed', fallbackError, {
                    ...getBoundedI18nStringContext('defaultLocale', defaultLocale),
                });
                messages = {}; // Empty object as last resort
            }
        }

        return {
            // The time zone can either be statically defined, read from the
            // user profile if you store such a setting, or based on dynamic
            // request information like the locale or a cookie.
            timeZone: timeZone || defaultTimezone,
            locale: locale || defaultLocale,
            messages
        };

    } catch (error) {
        logI18nFailure('i18n_old_request_config_failed', error, {
            ...getBoundedI18nStringContext('defaultLocale', defaultLocale),
        });

        return {
            timeZone: defaultTimezone,
            locale: defaultLocale,
            messages: {},
        };
    }
});
