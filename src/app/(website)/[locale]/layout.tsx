import IntlClientWrapper from '@/providers/IntlClientWrapper';
import WebsiteDocumentLocale from '@/components/website/shared/WebsiteDocumentLocale';
import { WEBSITE_LANGUAGES } from '@/config/websiteLanguages';
import {
    getWebsiteResourceLocaleStaticParams,
    isReviewedWebsiteResourceLocale,
} from '@/content/websiteResources/routing';
import { defaultTimezone } from '@lib/localization/config';
import type { AbstractIntlMessages } from 'next-intl';
import { notFound } from 'next/navigation';
import arSA from 'public/locales/menulist.ai/ar-SA.json';
import bnIN from 'public/locales/menulist.ai/bn-IN.json';
import enUS from 'public/locales/menulist.ai/en-US.json';
import esES from 'public/locales/menulist.ai/es-ES.json';
import hiIN from 'public/locales/menulist.ai/hi-IN.json';
import mrIN from 'public/locales/menulist.ai/mr-IN.json';
import taIN from 'public/locales/menulist.ai/ta-IN.json';
import teIN from 'public/locales/menulist.ai/te-IN.json';

type LocaleLayoutProps = {
    children: React.ReactNode;
    params: Promise<{
        locale: string;
    }>;
};

const localeMessages: Record<string, AbstractIntlMessages> = {
    'hi-IN': hiIN,
    'ta-IN': taIN,
    'te-IN': teIN,
    'mr-IN': mrIN,
    'bn-IN': bnIN,
    'ar-SA': arSA,
    'es-ES': esES,
};

function deepMergeMessages(
    source: AbstractIntlMessages,
    target: AbstractIntlMessages,
): AbstractIntlMessages {
    const result = { ...source };

    for (const key of Object.keys(target)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (
            sourceValue
            && targetValue
            && typeof sourceValue === 'object'
            && typeof targetValue === 'object'
        ) {
            result[key] = deepMergeMessages(sourceValue, targetValue);
        } else {
            result[key] = targetValue;
        }
    }

    return result;
}

function getMessagesForLocale(locale: string): AbstractIntlMessages {
    const selectedMessages = localeMessages[locale];
    if (!selectedMessages) return enUS;

    return deepMergeMessages(enUS, selectedMessages);
}

export function generateStaticParams() {
    return getWebsiteResourceLocaleStaticParams();
}

export default async function WebsiteResourceLocaleLayout(props: LocaleLayoutProps) {
    const params = await props.params;

    const {
        children
    } = props;

    if (!isReviewedWebsiteResourceLocale(params.locale)) {
        notFound();
    }

    const language = WEBSITE_LANGUAGES.find((item) => item.code === params.locale);

    return (
        <IntlClientWrapper
            locale={params.locale}
            messages={getMessagesForLocale(params.locale)}
            timeZone={defaultTimezone}
        >
            <WebsiteDocumentLocale locale={params.locale} />
            <div lang={params.locale} dir={language?.direction ?? 'ltr'}>
                {children}
            </div>
        </IntlClientWrapper>
    );
}
