import { LANGUAGE_CONSTANTS } from '@constant/languages';
import { resolveRenderLanguage } from './languageResolver';
import { normalizeProjectLanguages, normalizeStoreLanguagePolicy } from './languagePolicy';
import { getProjectDefaultLanguage } from './projectContent';

export const normalizePublicLanguageCode = (value?: string | string[] | null): string | null => {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized) return null;
    return normalized.split('-')[0] || null;
};

export function resolveStorePublicLanguage(storeDetails?: any, requestedLanguage?: string | string[] | null): string {
    const storePolicy = normalizeStoreLanguagePolicy(storeDetails);
    return resolveRenderLanguage(
        normalizePublicLanguageCode(requestedLanguage),
        storePolicy.defaultLanguage,
        storePolicy.activeLanguages,
    );
}

export function resolveProjectPublicLanguage(
    projectDetails?: any,
    storeDetails?: any,
    requestedLanguage?: string | string[] | null,
): string {
    const availableLanguages = normalizeProjectLanguages(projectDetails?.languages || []);
    return resolveRenderLanguage(
        normalizePublicLanguageCode(requestedLanguage),
        getProjectDefaultLanguage(projectDetails, storeDetails),
        availableLanguages,
    );
}

export function getPublicLanguageOptions(storeDetails?: any): string[] {
    return normalizeStoreLanguagePolicy(storeDetails).activeLanguages;
}

export function shouldExposePublicLanguageSwitcher(storeDetails?: any): boolean {
    return getPublicLanguageOptions(storeDetails).length > 1;
}

export function getNextIntlLocaleForPublicLanguage(language?: string | null): string {
    const normalized = normalizePublicLanguageCode(language) || LANGUAGE_CONSTANTS.FALLBACK_LANGUAGE;

    switch (normalized) {
        case 'hi':
            return 'hi-IN';
        case 'ar':
            return 'ar-SA';
        case 'es':
            return 'es-ES';
        case 'ta':
            return 'ta-IN';
        case 'te':
            return 'te-IN';
        case 'mr':
            return 'mr-IN';
        case 'bn':
            return 'bn-IN';
        case 'gu':
            return 'gu-IN';
        case 'kn':
            return 'kn-IN';
        case 'ml':
            return 'ml-IN';
        case 'pa':
            return 'pa-IN';
        case 'ur':
            return 'ur-IN';
        case 'or':
            return 'or-IN';
        case 'as':
            return 'as-IN';
        case 'ne':
            return 'ne-NP';
        case 'mai':
            return 'mai-IN';
        case 'kok':
            return 'kok-IN';
        case 'sd':
            return 'sd-IN';
        case 'ks':
            return 'ks-IN';
        case 'doi':
            return 'doi-IN';
        case 'mni':
            return 'mni-IN';
        case 'sat':
            return 'sat-IN';
        case 'brx':
            return 'brx-IN';
        case 'fr':
            return 'fr-FR';
        case 'pt':
            return 'pt-BR';
        case 'de':
            return 'de-DE';
        case 'it':
            return 'it-IT';
        case 'ja':
            return 'ja-JP';
        case 'id':
            return 'id-ID';
        case 'vi':
            return 'vi-VN';
        case 'th':
            return 'th-TH';
        case 'ko':
            return 'ko-KR';
        case 'tr':
            return 'tr-TR';
        case 'ms':
            return 'ms-MY';
        case 'nl':
            return 'nl-NL';
        case 'pl':
            return 'pl-PL';
        case 'uk':
            return 'uk-UA';
        case 'cs':
            return 'cs-CZ';
        case 'ro':
            return 'ro-RO';
        case 'el':
            return 'el-GR';
        case 'hu':
            return 'hu-HU';
        case 'sv':
            return 'sv-SE';
        case 'da':
            return 'da-DK';
        case 'fi':
            return 'fi-FI';
        case 'fil':
        case 'tl':
            return 'fil-PH';
        case 'he':
            return 'he-IL';
        case 'fa':
            return 'fa-IR';
        case 'sw':
            return 'sw-KE';
        case 'zh':
            return 'zh-CN';
        case 'en':
        default:
            return 'en-US';
    }
}

export function appendPublicLanguageParam(url: string, language?: string | null): string {
    const normalizedLanguage = normalizePublicLanguageCode(language);
    if (!url || !normalizedLanguage) return url;

    try {
        const parsed = new URL(url, 'https://menulist.ai');
        parsed.searchParams.set('lang', normalizedLanguage);
        return url.startsWith('/')
            ? `${parsed.pathname}${parsed.search}${parsed.hash}`
            : parsed.toString();
    } catch {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}lang=${encodeURIComponent(normalizedLanguage)}`;
    }
}

export function buildPublicLanguageAlternates(
    baseUrl: string,
    languages: string[],
): Record<string, string> | undefined {
    const normalizedLanguages = Array.from(new Set(languages.map(normalizePublicLanguageCode).filter(Boolean))) as string[];
    if (normalizedLanguages.length <= 1) return undefined;

    return Object.fromEntries(
        normalizedLanguages.map((language) => [
            language,
            appendPublicLanguageParam(baseUrl, language),
        ]),
    );
}
