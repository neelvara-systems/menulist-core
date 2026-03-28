'use client';

import type { Formats } from 'next-intl';
import { IntlErrorCode, NextIntlClientProvider } from 'next-intl';

type Props = {
    children: React.ReactNode;
    locale?: string;
    timeZone?: string;
    formats?: Formats;
    messages?: Record<string, unknown>;
};

export default function IntlClientWrapper({ children, locale, timeZone, formats, messages }: Props) {
    return (
        <NextIntlClientProvider
            locale={locale}
            timeZone={timeZone}
            formats={formats}
            messages={messages as any}
            onError={(error) => {
                if (error.code === IntlErrorCode.MISSING_MESSAGE) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`[i18n] Missing: ${error.message}`);
                    }
                } else {
                    console.error('[i18n] Error:', error);
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
