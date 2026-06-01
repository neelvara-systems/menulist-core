import {
    buildWebsiteResourcePath,
    normalizeWebsiteResourceLocale,
} from '@/content/websiteResources';
import type { WebsiteResourceArticle } from '@/content/websiteResources/types';
import { buildPlatformDiscoveryUrl } from '@lib/seo/discoveryPolicy';
import { PLATFORM_URL } from '@constant/urls';

function buildResourceUrl(path: string): string {
    return buildPlatformDiscoveryUrl(path, PLATFORM_URL);
}

function buildBreadcrumb(
    url: string,
    title: string,
    options: { includeResourcesParent?: boolean; locale?: string | null } = {},
) {
    const itemListElement: Array<Record<string, unknown>> = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: PLATFORM_URL,
        },
    ];

    if (options.includeResourcesParent) {
        itemListElement.push({
            '@type': 'ListItem',
            position: 2,
            name: 'Resources',
            item: buildResourceUrl(buildWebsiteResourcePath(null, options.locale)),
        });
    }

    itemListElement.push({
        '@type': 'ListItem',
        position: itemListElement.length + 1,
        name: title,
        item: url,
    });

    return {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement,
    };
}

export function buildResourcesHubSchema(articles: WebsiteResourceArticle[], locale?: string | null) {
    const normalizedLocale = normalizeWebsiteResourceLocale(locale);
    const hubPath = buildWebsiteResourcePath(null, normalizedLocale);
    const url = buildResourceUrl(hubPath);

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: 'MenuList Resources',
                description: 'Menu correctness, QR, Google menu, SEO, and AI discovery resources for business owners.',
                inLanguage: normalizedLocale,
                isPartOf: { '@id': `${PLATFORM_URL}/#website` },
                publisher: { '@id': `${PLATFORM_URL}/#organization` },
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            buildBreadcrumb(url, 'Resources'),
            {
                '@type': 'ItemList',
                '@id': `${url}#resources`,
                inLanguage: normalizedLocale,
                name: 'MenuList Resources',
                itemListElement: articles.map((article, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: article.title,
                    url: buildResourceUrl(buildWebsiteResourcePath(article.slug, normalizedLocale)),
                })),
            },
        ],
    };
}

export function buildResourceArticleSchema(article: WebsiteResourceArticle, locale?: string | null) {
    const normalizedLocale = normalizeWebsiteResourceLocale(locale);
    const url = buildResourceUrl(buildWebsiteResourcePath(article.slug, normalizedLocale));
    const graph: Array<Record<string, unknown>> = [
        {
            '@type': 'WebPage',
            '@id': `${url}#webpage`,
            url,
            name: article.metaTitle,
            description: article.metaDescription,
            inLanguage: normalizedLocale,
            isPartOf: { '@id': `${PLATFORM_URL}/#website` },
            publisher: { '@id': `${PLATFORM_URL}/#organization` },
            breadcrumb: { '@id': `${url}#breadcrumb` },
        },
        {
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: article.title,
            description: article.metaDescription,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            inLanguage: normalizedLocale,
            mainEntityOfPage: { '@id': `${url}#webpage` },
            author: { '@id': `${PLATFORM_URL}/#organization` },
            publisher: { '@id': `${PLATFORM_URL}/#organization` },
        },
        buildBreadcrumb(url, article.title, {
            includeResourcesParent: true,
            locale: normalizedLocale,
        }),
    ];

    if (article.faq?.length) {
        graph.push({
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            inLanguage: normalizedLocale,
            mainEntity: article.faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                },
            })),
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}
