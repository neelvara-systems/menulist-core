import GlobalLanguagesList from '@data/languages';
import publicCustomerMessages from '@data/generated/publicCustomerMessages.json';
import {
    getNextIntlLocaleForPublicLanguage,
    normalizePublicLanguageCode,
} from './publicRenderLanguage';

type PublicCustomerLocale = keyof typeof publicCustomerMessages;
type PublicCustomerSourceMessages = (typeof publicCustomerMessages)['en-US'];

export type PublicCustomerMessageKey = keyof PublicCustomerSourceMessages;
export type PublicCustomerTranslationValues = Record<
    string,
    string | number | boolean | null | undefined
>;
export type PublicCustomerTranslator = (
    key: PublicCustomerMessageKey,
    values?: PublicCustomerTranslationValues,
) => string;

const PUBLIC_CUSTOMER_SOURCE_LOCALE: PublicCustomerLocale = 'en-US';
const PUBLIC_SPICE_LEVEL_KEYS: Record<string, PublicCustomerMessageKey> = {
    mild: 'menu.spiceMild',
    medium: 'menu.spiceMedium',
    hot: 'menu.spiceHot',
    'very-hot': 'menu.spiceVeryHot',
    'very hot': 'menu.spiceVeryHot',
};

function interpolate(
    template: string,
    values?: PublicCustomerTranslationValues,
): string {
    if (!values) return template;
    return template.replace(/\{([^}]+)\}/g, (_, key) => {
        const value = values[key];
        return value === null || value === undefined ? '' : String(value);
    });
}

export function getPublicCustomerLocale(language?: string | null): PublicCustomerLocale {
    const locale = getNextIntlLocaleForPublicLanguage(language);
    return Object.prototype.hasOwnProperty.call(publicCustomerMessages, locale)
        ? locale as PublicCustomerLocale
        : PUBLIC_CUSTOMER_SOURCE_LOCALE;
}

export function getPublicCustomerLanguageDirection(
    language?: string | null,
): 'ltr' | 'rtl' {
    const normalizedLanguage = normalizePublicLanguageCode(language);
    return GlobalLanguagesList.find((entry) => entry.code === normalizedLanguage)?.direction || 'ltr';
}

export function createPublicCustomerTranslator(
    language?: string | null,
): PublicCustomerTranslator {
    const locale = getPublicCustomerLocale(language);
    const selectedMessages = publicCustomerMessages[locale] as Record<string, string>;
    const fallbackMessages = publicCustomerMessages[PUBLIC_CUSTOMER_SOURCE_LOCALE] as Record<string, string>;

    return (key, values) => interpolate(
        selectedMessages[key] || fallbackMessages[key] || String(key),
        values,
    );
}

export function getPublicSpiceLevelLabel(
    value: string,
    translate: PublicCustomerTranslator,
): string {
    const normalized = value.toLowerCase().trim().replace(/_/g, '-');
    const messageKey = Object.prototype.hasOwnProperty.call(PUBLIC_SPICE_LEVEL_KEYS, normalized)
        ? PUBLIC_SPICE_LEVEL_KEYS[normalized]
        : undefined;
    if (messageKey) return translate(messageKey);
    return value
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getPublicCustomerSupportedLocales(): string[] {
    return Object.keys(publicCustomerMessages);
}
