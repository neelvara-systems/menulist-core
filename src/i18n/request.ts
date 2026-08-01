
import {
    APP_LOCALE_COOKIES_KEY,
    APP_TIMEZONE_COOKIES_KEY,
    defaultLocale,
    defaultTimezone,
    Locale,
    normalizeLocalePreference,
    parseAcceptLanguageLocales,
    normalizeTimeZone,
} from '@lib/localization/config';
import { IntlErrorCode, type AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { getBoundedErrorStringField } from '@lib/monitoring/boundedLogContext';
import arSA from '../../public/locales/menulist.ai/ar-SA.json';
import asIN from '../../public/locales/menulist.ai/as-IN.json';
import bnIN from '../../public/locales/menulist.ai/bn-IN.json';
import brxIN from '../../public/locales/menulist.ai/brx-IN.json';
import csCZ from '../../public/locales/menulist.ai/cs-CZ.json';
import daDK from '../../public/locales/menulist.ai/da-DK.json';
import deDE from '../../public/locales/menulist.ai/de-DE.json';
import doiIN from '../../public/locales/menulist.ai/doi-IN.json';
import elGR from '../../public/locales/menulist.ai/el-GR.json';
import enGB from '../../public/locales/menulist.ai/en-GB.json';
import enUS from '../../public/locales/menulist.ai/en-US.json';
import esES from '../../public/locales/menulist.ai/es-ES.json';
import faIR from '../../public/locales/menulist.ai/fa-IR.json';
import fiFI from '../../public/locales/menulist.ai/fi-FI.json';
import filPH from '../../public/locales/menulist.ai/fil-PH.json';
import frFR from '../../public/locales/menulist.ai/fr-FR.json';
import guIN from '../../public/locales/menulist.ai/gu-IN.json';
import heIL from '../../public/locales/menulist.ai/he-IL.json';
import hiIN from '../../public/locales/menulist.ai/hi-IN.json';
import huHU from '../../public/locales/menulist.ai/hu-HU.json';
import idID from '../../public/locales/menulist.ai/id-ID.json';
import itIT from '../../public/locales/menulist.ai/it-IT.json';
import jaJP from '../../public/locales/menulist.ai/ja-JP.json';
import knIN from '../../public/locales/menulist.ai/kn-IN.json';
import koKR from '../../public/locales/menulist.ai/ko-KR.json';
import kokIN from '../../public/locales/menulist.ai/kok-IN.json';
import ksIN from '../../public/locales/menulist.ai/ks-IN.json';
import maiIN from '../../public/locales/menulist.ai/mai-IN.json';
import mlIN from '../../public/locales/menulist.ai/ml-IN.json';
import mniIN from '../../public/locales/menulist.ai/mni-IN.json';
import msMY from '../../public/locales/menulist.ai/ms-MY.json';
import mrIN from '../../public/locales/menulist.ai/mr-IN.json';
import neNP from '../../public/locales/menulist.ai/ne-NP.json';
import nlNL from '../../public/locales/menulist.ai/nl-NL.json';
import orIN from '../../public/locales/menulist.ai/or-IN.json';
import paIN from '../../public/locales/menulist.ai/pa-IN.json';
import plPL from '../../public/locales/menulist.ai/pl-PL.json';
import ptBR from '../../public/locales/menulist.ai/pt-BR.json';
import roRO from '../../public/locales/menulist.ai/ro-RO.json';
import satIN from '../../public/locales/menulist.ai/sat-IN.json';
import sdIN from '../../public/locales/menulist.ai/sd-IN.json';
import svSE from '../../public/locales/menulist.ai/sv-SE.json';
import swKE from '../../public/locales/menulist.ai/sw-KE.json';
import taIN from '../../public/locales/menulist.ai/ta-IN.json';
import teIN from '../../public/locales/menulist.ai/te-IN.json';
import thTH from '../../public/locales/menulist.ai/th-TH.json';
import trTR from '../../public/locales/menulist.ai/tr-TR.json';
import ukUA from '../../public/locales/menulist.ai/uk-UA.json';
import urIN from '../../public/locales/menulist.ai/ur-IN.json';
import viVN from '../../public/locales/menulist.ai/vi-VN.json';
import zhCN from '../../public/locales/menulist.ai/zh-CN.json';
import zhTW from '../../public/locales/menulist.ai/zh-TW.json';
import { getBoundedI18nStringContext, logI18nDiagnostic, logI18nFailure } from './diagnostics';

const localeMessages: Record<string, AbstractIntlMessages> = {
    'ar-SA': arSA,
    'as-IN': asIN,
    'bn-IN': bnIN,
    'brx-IN': brxIN,
    'cs-CZ': csCZ,
    'da-DK': daDK,
    'de-DE': deDE,
    'doi-IN': doiIN,
    'el-GR': elGR,
    'en-GB': enGB,
    'en-US': enUS,
    'es-ES': esES,
    'fa-IR': faIR,
    'fi-FI': fiFI,
    'fil-PH': filPH,
    'fr-FR': frFR,
    'gu-IN': guIN,
    'he-IL': heIL,
    'hi-IN': hiIN,
    'hu-HU': huHU,
    'id-ID': idID,
    'it-IT': itIT,
    'ja-JP': jaJP,
    'kn-IN': knIN,
    'ko-KR': koKR,
    'kok-IN': kokIN,
    'ks-IN': ksIN,
    'mai-IN': maiIN,
    'ml-IN': mlIN,
    'mni-IN': mniIN,
    'ms-MY': msMY,
    'mr-IN': mrIN,
    'ne-NP': neNP,
    'nl-NL': nlNL,
    'or-IN': orIN,
    'pa-IN': paIN,
    'pl-PL': plPL,
    'pt-BR': ptBR,
    'ro-RO': roRO,
    'sat-IN': satIN,
    'sd-IN': sdIN,
    'sv-SE': svSE,
    'sw-KE': swKE,
    'ta-IN': taIN,
    'te-IN': teIN,
    'th-TH': thTH,
    'tr-TR': trTR,
    'uk-UA': ukUA,
    'ur-IN': urIN,
    'vi-VN': viVN,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
};

// Deep merge: target values overwrite source, but missing keys fall back to source
const UNSAFE_MESSAGE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function deepMerge(
    source: AbstractIntlMessages,
    target: AbstractIntlMessages,
): AbstractIntlMessages {
    const result = { ...source };
    for (const key of Object.keys(target)) {
        if (UNSAFE_MESSAGE_KEYS.has(key)) continue;
        const targetValue = target[key];
        const sourceValue = source[key];
        if (
            targetValue
            && typeof targetValue === 'object'
            && sourceValue
            && typeof sourceValue === 'object'
        ) {
            result[key] = deepMerge(sourceValue, targetValue);
        } else {
            result[key] = targetValue;
        }
    }
    return result;
}

function isNextInternalControlError(error: unknown): boolean {
    const digest = getBoundedErrorStringField(error, 'digest', 128) || '';

    return digest === 'DYNAMIC_SERVER_USAGE'
        || digest === 'NEXT_NOT_FOUND'
        || digest.startsWith('NEXT_REDIRECT');
}

// https://next-intl-docs.vercel.app/docs/getting-started/app-router/without-i18n-routing
export default getRequestConfig(async () => {

    try {
        // const authorization = headers().get('authorization')

        //1.assign default locale to avoide app crash
        let locale: Locale = defaultLocale;

        //2. get current user app locale (Get this from database affter saving user preferances into database)
        const localLocale = normalizeLocalePreference((await cookies()).get(APP_LOCALE_COOKIES_KEY)?.value);

        //3. get user browser locale if user accessing app first time or not selected any locale
        if (!localLocale) {
            const languages = parseAcceptLanguageLocales((await headers()).get('accept-language'));
            locale = languages[0] || defaultLocale;
        } else {
            locale = localLocale;
        }
        if (!locale) locale = defaultLocale;

        //4. get current calling route so that we can identify which apps locals needs to be imported
        const referer = (await headers()).get('referer');

        //5. Normalize/sanitize selected locale before handing it to next-intl.
        locale = normalizeLocalePreference(locale) || defaultLocale;
        const timeZone = normalizeTimeZone((await cookies()).get(APP_TIMEZONE_COOKIES_KEY)?.value);

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
                logI18nFailure('i18n_locale_messages_load_failed', error, {
                    ...getBoundedI18nStringContext('locale', locale),
                    ...getBoundedI18nStringContext('defaultLocale', defaultLocale),
                    hasReferer: Boolean(referer),
                });
                // Keep defaultMessages as fallback
            }
        }

        return {
            timeZone,
            locale: locale || defaultLocale,
            messages,
            // Graceful error handling for missing translations in production
            onError(error) {
                if (error.code === IntlErrorCode.MISSING_MESSAGE) {
                    // Missing translations are expected for partially-translated locales
                    // Silenced in production — en-US fallback via deepMerge covers most cases
                    if (process.env.NODE_ENV === 'development') {
                        logI18nDiagnostic('i18n_missing_message', {
                            ...getBoundedI18nStringContext('locale', locale),
                            ...getBoundedI18nStringContext('defaultLocale', defaultLocale),
                            sourceErrorCode: error.code,
                        }, { developmentOnly: true });
                    }
                } else {
                    logI18nFailure('i18n_runtime_error', error, {
                        ...getBoundedI18nStringContext('locale', locale),
                        ...getBoundedI18nStringContext('defaultLocale', defaultLocale),
                    });
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
        if (isNextInternalControlError(error)) {
            throw error;
        }

        // Log error for debugging
        logI18nFailure('i18n_request_config_failed', error, {
            ...getBoundedI18nStringContext('defaultLocale', defaultLocale),
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
