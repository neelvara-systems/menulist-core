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
