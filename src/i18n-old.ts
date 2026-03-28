
import { addErrorLog } from '@database/loggers/errorLogger';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import { APP_LOCALE_COOKIES_KEY, APP_TIMEZONE_COOKIES_KEY, AppSupportedLocales, defaultLocale, defaultTimezone, Locale } from '@lib/localization/config';
import { isProduction } from '@util/utils';
import { windowRef } from '@util/window';
import Negotiator from 'negotiator';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import logger from './loggers';

// https://next-intl-docs.vercel.app/docs/getting-started/app-router/without-i18n-routing
export default getRequestConfig(async () => {

    try {
        // const authorization = headers().get('authorization')

        //1.assign default locale to avoide app crash
        let locale: Locale = defaultLocale;
        // console.log("1. locale", locale)

        //2. get current user app locale (Get this from database affter saving user preferances into database)
        // @ts-ignore 
        let localLocale: Locale = cookies().get(APP_LOCALE_COOKIES_KEY)?.value || defaultLocale
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

        //5. redirect all en to en_us
        locale = (locale.includes("en")) ? "en-US" : locale
        // console.log("5. locale", locale)
        let timeZone: Locale = cookies().get(APP_TIMEZONE_COOKIES_KEY)?.value;
        if (!timeZone) timeZone = defaultTimezone;

        // console.log("timeZone", timeZone)
        // console.log("locale", locale)

        let messages;
        try {
            messages = (await import(`public/locales/${currentLocalePath}/${locale}.json`)).default;
        } catch (error) {
            console.error(`Error loading messages for locale '${locale}':`, error);
            // Fallback to default locale if the requested locale's messages can't be loaded
            try {
                messages = (await import(`public/locales/${currentLocalePath}/${defaultLocale}.json`)).default;
                locale = defaultLocale; // Also update the locale to match the messages
            } catch (fallbackError) {
                console.error(`Error loading fallback messages for locale '${defaultLocale}':`, fallbackError);
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
        const payload = {
            userAgent: windowRef()?.navigator?.userAgent || "",
            type: "error",
            message: error?.message,
            cause: error?.cause,
            name: error?.name,
            stack: error?.stack,
            location: windowRef()?.location?.href
        }
        console.log("error payload", payload)
        if (isProduction()) {
            //log error when running in production
            addErrorLog(payload).then((docId: any) => logger.error("error log", { docId }))
        }
    }
});