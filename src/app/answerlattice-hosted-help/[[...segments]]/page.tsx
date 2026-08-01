import { FEATURE_FLAGS } from '@config/features';
import {
    getCachedKnowledgeBaseArticle,
    getCachedKnowledgeBaseCategories,
    getCachedLatestChangelogPage,
    getCachedPublishedFaqs,
} from '@lib/answerlattice/publicContentCache';
import { renderPublicTiptapArticle } from '@lib/answerlattice/publicRichText';
import { resolveHostedHelpSiteByDomain } from '@lib/answerlattice/hostedHelpServer';
import {
    buildHostedHelpArticlePath,
    getHostedHelpChangelogText,
    normalizeHostedHelpArticleSlug,
    resolveHostedHelpRequestDomain,
    resolveHostedHelpPublicRoute,
    serializeHostedHelpDate,
} from '@lib/answerlattice/hostedHelpRequest';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import type { KnowledgeBaseArticleMeta, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import type { AnswerlatticePublicFaq } from '@type/answerlattice';
import type {
    AnswerlatticePublicArticle,
    AnswerlatticePublicChangelogPage,
} from '@lib/answerlattice/publicContentBoundary';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HostedHelpClient, {
    type HostedHelpArticle,
    type HostedHelpChangelogPage,
    type HostedHelpFaq,
    type HostedHelpSiteView,
} from '@template/answerlattice/hostedHelp/HostedHelpClient';

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ segments?: string[] }>;
    searchParams?: Promise<{ domain?: string }>;
};

const getRequestDomain = async (searchParams?: { domain?: string }) => {
    const headerList = (await headers());
    return resolveHostedHelpRequestDomain({
        host: headerList.get('host'),
        queryDomain: searchParams?.domain,
        isDevelopmentRewrite: headerList.get('x-answerlattice-hosted-help-dev') === '1',
        isDevelopmentRuntime: process.env.NODE_ENV === 'development' || process.env.VERCEL !== '1',
    });
};

const getRequestIp = async () => {
    const headerList = (await headers());
    return headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headerList.get('x-real-ip')
        || 'unknown';
};

const getArticlesFromCategories = (categories: KnowledgeBaseCategoriesType | null): KnowledgeBaseArticleMeta[] => {
    if (!categories?.categories) return [];
    const articles = Object.values(categories.categories).flatMap(category => [
        ...(category.articles || []),
        ...(category.sections || []).flatMap(section => section.articles || []),
    ]);
    return Array.from(new Map(articles.map(article => [article.id, article])).values());
};

const findArticleMeta = (
    categories: KnowledgeBaseCategoriesType | null,
    slug?: string | null,
): KnowledgeBaseArticleMeta | null => {
    const normalized = normalizeHostedHelpArticleSlug(slug);
    if (!normalized) return null;
    return getArticlesFromCategories(categories).find(article => (
        article.id === normalized
        || normalizeHostedHelpArticleSlug(article.id) === normalized
        || normalizeHostedHelpArticleSlug(article.url) === normalized
    )) || null;
};

const compactArticleMeta = (article: KnowledgeBaseArticleMeta): KnowledgeBaseArticleMeta => ({
    id: article.id,
    active: true,
    title: article.title,
    index: Number(article.index || 0),
    url: article.url || article.id,
});

const compactCategoriesForClient = (
    categories: KnowledgeBaseCategoriesType | null,
): KnowledgeBaseCategoriesType | null => {
    if (!categories?.categories) return null;

    return {
        categories: Object.fromEntries(
            Object.entries(categories.categories).map(([categoryId, category]) => [
                categoryId,
                {
                    id: category.id,
                    title: category.title,
                    description: category.description,
                    icon: category.icon,
                    url: category.url,
                    active: category.active !== false,
                    index: Number(category.index || 0),
                    articles: (category.articles || []).map(compactArticleMeta),
                    sections: (category.sections || []).map(section => ({
                        id: section.id,
                        title: section.title,
                        description: section.description,
                        url: section.url,
                        active: section.active !== false,
                        index: Number(section.index || 0),
                        articles: (section.articles || []).map(compactArticleMeta),
                    })),
                },
            ]),
        ),
    };
};

const compactFaqsForClient = (faqs: AnswerlatticePublicFaq[]): HostedHelpFaq[] => (
    (faqs || []).map(faq => ({
        id: String(faq.id || ''),
        question: String(faq.question || ''),
        answer: String(faq.answer || ''),
    })).filter(faq => faq.id && faq.question)
);

const compactChangelogForClient = (
    page: AnswerlatticePublicChangelogPage | null,
): HostedHelpChangelogPage | null => {
    if (!page) return null;

    return {
        id: page.id,
        entries: (page.entries || []).map((entry) => ({
            id: String(entry.id || ''),
            title: String(entry.title || ''),
            version: entry.version ? String(entry.version) : null,
            releasedOn: serializeHostedHelpDate(entry.releasedOn),
            descriptionText: getHostedHelpChangelogText(entry.description),
        })).filter((entry) => entry.id && entry.title),
    };
};

const compactArticleForClient = (article: AnswerlatticePublicArticle): HostedHelpArticle => {
    const rendered = renderPublicTiptapArticle(article.content);
    return {
        id: article.id,
        active: true,
        title: article.title,
        index: Number(article.index || 0),
        url: article.url || article.id,
        categoryTitle: article.categoryTitle,
        sectionTitle: article.sectionTitle,
        safeHtml: rendered.safeHtml,
        outline: rendered.outline,
    };
};

const compactSiteForClient = (site: Awaited<ReturnType<typeof resolveHostedHelpSiteByDomain>>): HostedHelpSiteView => ({
    domain: site?.domain || '',
    config: {
        title: site?.config.title || 'Help Center',
        description: site?.config.description || '',
        showFaqs: site?.config.showFaqs !== false,
        showChangelog: site?.config.showChangelog !== false,
    },
});

async function resolvePage(searchParams?: { domain?: string }) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER) return null;
    return resolveHostedHelpSiteByDomain(await getRequestDomain(searchParams));
}

const buildCanonicalUrl = (domain: string, path: string) => (
    `https://${domain}${path === '/' ? '' : path}`
);

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const site = await resolvePage(searchParams);
    if (!site) {
        return {
            title: 'Help Center not found',
            robots: { index: false, follow: false },
        };
    }

    const publicRoute = resolveHostedHelpPublicRoute(params.segments, {
        showFaqs: site.config.showFaqs,
        showChangelog: site.config.showChangelog,
    });
    if (!publicRoute) {
        return {
            title: `Page not found | ${site.config.title}`,
            robots: { index: false, follow: false },
        };
    }

    let canonicalPath = publicRoute.canonicalPath;
    let title = publicRoute.view === 'docs'
        ? `Docs | ${site.config.title}`
        : publicRoute.view === 'faq'
            ? `FAQ | ${site.config.title}`
            : publicRoute.view === 'changelog'
                ? `What's New | ${site.config.title}`
                : site.config.title;

    if (publicRoute.view === 'article') {
        const categories = await getCachedKnowledgeBaseCategories({ tId: site.tId, sId: site.sId });
        const articleMeta = findArticleMeta(categories, publicRoute.articleSlug);
        const articlePath = buildHostedHelpArticlePath(articleMeta?.url || articleMeta?.id);
        if (!articleMeta || !articlePath) {
            return {
                title: `Article not found | ${site.config.title}`,
                robots: { index: false, follow: false },
            };
        }
        title = `${articleMeta.title} | ${site.config.title}`;
        canonicalPath = articlePath;
    }

    const canonicalDomain = site.config.primaryDomain || site.domain;

    return {
        title,
        description: site.config.description,
        robots: {
            index: !site.config.noIndex,
            follow: !site.config.noIndex,
        },
        alternates: {
            canonical: buildCanonicalUrl(canonicalDomain, canonicalPath),
        },
    };
}

export default async function AnswerlatticeHostedHelpPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const site = await resolvePage(searchParams);
    if (!site) notFound();

    const publicRoute = resolveHostedHelpPublicRoute(params.segments, {
        showFaqs: site.config.showFaqs,
        showChangelog: site.config.showChangelog,
    });
    if (!publicRoute) notFound();

    const rateLimitConfig = getRateLimitForFeature('ANSWERLATTICE_HOSTED_HELP');
    const rateLimit = await checkRateLimit({
        key: `answerlattice-hosted-help:${site.domain}:${getRequestIp()}`,
        limit: rateLimitConfig.limit,
        window: rateLimitConfig.window,
    });
    const rateLimitUnavailable =
        rateLimit.allowed
        && FEATURE_FLAGS.ENABLE_RATE_LIMITING
        && rateLimit.current === 0
        && rateLimit.remaining === rateLimitConfig.limit;
    if (rateLimitUnavailable || !rateLimit.allowed) {
        return (
            <HostedHelpClient
                categories={null}
                changelogPage={null}
                faqs={[]}
                site={compactSiteForClient(site)}
                unavailableReason="Help content is temporarily unavailable. Please try again shortly."
                view={publicRoute.view}
            />
        );
    }

    const scope = { tId: site.tId, sId: site.sId };
    const [categories, faqs, changelogPage] = await Promise.all([
        getCachedKnowledgeBaseCategories(scope),
        site.config.showFaqs ? getCachedPublishedFaqs(scope) : Promise.resolve([]),
        site.config.showChangelog ? getCachedLatestChangelogPage(scope) : Promise.resolve(null),
    ]);

    if (publicRoute.view === 'article') {
        const articleMeta = findArticleMeta(categories, publicRoute.articleSlug);
        if (!articleMeta) notFound();
        const article = await getCachedKnowledgeBaseArticle(scope, articleMeta.id);

        if (!article) notFound();

        return (
            <HostedHelpClient
                article={compactArticleForClient(article)}
                categories={compactCategoriesForClient(categories)}
                changelogPage={compactChangelogForClient(changelogPage)}
                faqs={compactFaqsForClient(faqs)}
                site={compactSiteForClient(site)}
                view="article"
            />
        );
    }

    return (
        <HostedHelpClient
            categories={compactCategoriesForClient(categories)}
            changelogPage={compactChangelogForClient(changelogPage)}
            faqs={compactFaqsForClient(faqs)}
            site={compactSiteForClient(site)}
            view={publicRoute.view}
        />
    );
}
