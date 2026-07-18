'use client';

import { getBoundedI18nStringContext, logI18nDiagnostic, logI18nFailure } from '@/i18n/diagnostics';
import { defaultLocale, getLocaleDirection, normalizeLocalePreference } from '@lib/localization/config';
import type { Formats } from 'next-intl';
import { IntlErrorCode, NextIntlClientProvider } from 'next-intl';
import { useEffect } from 'react';

type Props = {
    children: React.ReactNode;
    locale?: string;
    timeZone?: string;
    formats?: Formats;
    messages?: Record<string, unknown>;
};

export default function IntlClientWrapper({ children, locale, timeZone, formats, messages }: Props) {
    const safeLocale = normalizeLocalePreference(locale) || defaultLocale;

    useEffect(() => {
        document.documentElement.lang = safeLocale;
        document.documentElement.dir = getLocaleDirection(safeLocale);
    }, [safeLocale]);

    return (
        <NextIntlClientProvider
            locale={safeLocale}
            timeZone={timeZone}
            formats={formats}
            messages={messages as any}
            onError={(error) => {
                if (error.code === IntlErrorCode.MISSING_MESSAGE) {
                    if (process.env.NODE_ENV === 'development') {
                        logI18nDiagnostic('i18n_client_missing_message', {
                            ...getBoundedI18nStringContext('locale', safeLocale),
                            sourceErrorCode: error.code,
                        }, { developmentOnly: true });
                    }
                } else {
                    logI18nFailure('i18n_client_runtime_error', error, {
                        ...getBoundedI18nStringContext('locale', safeLocale),
                    });
                }
            }}
            getMessageFallback={({ namespace, key, error }) => {
                if (error.code === IntlErrorCode.MISSING_MESSAGE) {
                    return key;
                }
                return [namespace, key].filter(Boolean).join('.');
            }}
        >
            {children}
        </NextIntlClientProvider>
    );
}
