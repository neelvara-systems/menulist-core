import { enUSWebsiteResources } from './en-US';
import { hiINWebsiteResources } from './hi-IN';
import { taINWebsiteResources } from './ta-IN';
import { teINWebsiteResources } from './te-IN';
import { mrINWebsiteResources } from './mr-IN';
import { bnINWebsiteResources } from './bn-IN';
import { arSAWebsiteResources } from './ar-SA';
import { esESWebsiteResources } from './es-ES';
import {
    WEBSITE_RESOURCE_HUB_PATH,
    WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES,
    buildWebsiteResourcePath,
} from './routing';
import type { WebsiteResourceArticle, WebsiteResourcesCopy } from './types';

export {
    WEBSITE_RESOURCE_DEFAULT_LOCALE,
    WEBSITE_RESOURCE_HUB_PATH,
    WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES,
    buildWebsiteResourceLanguageAlternates,
    buildWebsiteResourcePath,
    getWebsiteResourceLocaleStaticParams,
    isReviewedWebsiteResourceLocale,
    normalizeWebsiteResourceLocale,
} from './routing';

const resourceCopies: Record<string, WebsiteResourcesCopy> = {
    'en-US': enUSWebsiteResources,
    'hi-IN': hiINWebsiteResources,
    'ta-IN': taINWebsiteResources,
    'te-IN': teINWebsiteResources,
    'mr-IN': mrINWebsiteResources,
    'bn-IN': bnINWebsiteResources,
    'ar-SA': arSAWebsiteResources,
    'es-ES': esESWebsiteResources,
};

export function getWebsiteResourcesCopy(locale?: string | null): WebsiteResourcesCopy {
    if (locale && resourceCopies[locale]) {
        return resourceCopies[locale];
    }

    return enUSWebsiteResources;
}

export function getWebsiteResourceArticles(locale?: string | null): WebsiteResourceArticle[] {
    return getWebsiteResourcesCopy(locale).articles;
}

export function getWebsiteResourceArticle(
    slug: string,
    locale?: string | null,
): WebsiteResourceArticle | undefined {
    return getWebsiteResourceArticles(locale).find((article) => article.slug === slug);
}

export function getWebsiteRelatedResourceArticles(
    article: WebsiteResourceArticle,
    locale?: string | null,
): WebsiteResourceArticle[] {
    const articles = getWebsiteResourceArticles(locale);
    return article.relatedSlugs
        .map((slug) => articles.find((related) => related.slug === slug))
        .filter(Boolean) as WebsiteResourceArticle[];
}

export function getWebsiteResourceSlugs(): string[] {
    return enUSWebsiteResources.articles.map((article) => article.slug);
}

export const WEBSITE_RESOURCE_DISCOVERY_PAGES = [
    {
        label: 'Resources',
        path: WEBSITE_RESOURCE_HUB_PATH,
        description: 'Menu correctness, QR, Google menu, SEO, and AI discovery resources',
        changeFrequency: 'monthly' as const,
        priority: 0.82,
    },
    ...enUSWebsiteResources.articles.map((article) => ({
        label: article.title,
        path: `${WEBSITE_RESOURCE_HUB_PATH}/${article.slug}`,
        description: article.metaDescription,
        changeFrequency: article.changeFrequency,
        priority: article.priority,
    })),
];

export const WEBSITE_RESOURCE_LOCALIZED_DISCOVERY_PAGES = WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES.flatMap((locale) => {
    const copy = getWebsiteResourcesCopy(locale);

    return [
        {
            label: `Resources (${locale})`,
            path: buildWebsiteResourcePath(null, locale),
            description: copy.hub.subtitle,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
        ...copy.articles.map((article) => ({
            label: `${article.title} (${locale})`,
            path: buildWebsiteResourcePath(article.slug, locale),
            description: article.metaDescription,
            changeFrequency: article.changeFrequency,
            priority: Math.max(article.priority - 0.02, 0.7),
        })),
    ];
});

export const WEBSITE_RESOURCE_ALL_DISCOVERY_PAGES = [
    ...WEBSITE_RESOURCE_DISCOVERY_PAGES,
    ...WEBSITE_RESOURCE_LOCALIZED_DISCOVERY_PAGES,
];
