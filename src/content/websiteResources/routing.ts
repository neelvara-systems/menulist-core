export const WEBSITE_RESOURCE_DEFAULT_LOCALE = 'en-US';
export const WEBSITE_RESOURCE_HUB_PATH = '/resources';

export const WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES = [
    'hi-IN',
    'ta-IN',
    'te-IN',
    'mr-IN',
    'bn-IN',
    'ar-SA',
    'es-ES',
] as const;

export function isReviewedWebsiteResourceLocale(locale?: string | null): locale is string {
    return Boolean(
        locale
        && (WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES as readonly string[]).includes(locale),
    );
}

export function normalizeWebsiteResourceLocale(locale?: string | null): string {
    return isReviewedWebsiteResourceLocale(locale) ? locale : WEBSITE_RESOURCE_DEFAULT_LOCALE;
}

export function buildWebsiteResourcePath(slug?: string | null, locale?: string | null): string {
    const normalizedLocale = normalizeWebsiteResourceLocale(locale);
    const basePath = normalizedLocale === WEBSITE_RESOURCE_DEFAULT_LOCALE
        ? WEBSITE_RESOURCE_HUB_PATH
        : `/${normalizedLocale}${WEBSITE_RESOURCE_HUB_PATH}`;

    return slug ? `${basePath}/${slug}` : basePath;
}

export function buildWebsiteResourceLanguageAlternates(slug?: string | null): Record<string, string> {
    const defaultPath = buildWebsiteResourcePath(slug, WEBSITE_RESOURCE_DEFAULT_LOCALE);
    const languages: Record<string, string> = {
        [WEBSITE_RESOURCE_DEFAULT_LOCALE]: defaultPath,
        'x-default': defaultPath,
    };

    for (const locale of WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES) {
        languages[locale] = buildWebsiteResourcePath(slug, locale);
    }

    return languages;
}

export function getWebsiteResourceLocaleStaticParams() {
    return WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES.map((locale) => ({ locale }));
}
