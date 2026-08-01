import { getUserDateFormat, getUserTimeFormat } from '@lib/localization';
import { APP_TIMEZONE_COOKIES_KEY, normalizeTimeZone } from '@lib/localization/config';
import { Formats } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import IntlClientWrapper from './IntlClientWrapper';

type Props = {
    children: React.ReactNode;
    locale?: string;
}

export default async function LocalisationProvider({ children, locale }: Props) {
    // Providing all messages to the client side is the easiest way to get started
    const messages = await getMessages();
    const timeZone = normalizeTimeZone((await cookies()).get(APP_TIMEZONE_COOKIES_KEY)?.value);

    const APP_LOCALISATION_FORMATTERS: Formats = {
        dateTime: {
            // date: {day: '2-digit',month: 'short',year: 'numeric'}
            date: await getUserDateFormat(),
            time: await getUserTimeFormat()
        },
        number: {
            precise: {
                maximumFractionDigits: 5
            }
        },
        list: undefined
    }
    // Uses IntlClientWrapper (client component) to avoid passing function props
    // (onError, getMessageFallback) from this server component to a client component,
    // which violates React Server Component rules.
    return (
        <IntlClientWrapper
            locale={locale}
            timeZone={timeZone}
            formats={APP_LOCALISATION_FORMATTERS}
            messages={messages}
        >
            {children}
        </IntlClientWrapper>
    )
}
