import { FEATURE_FLAGS } from '@config/features';
import {
    getCachedKnowledgeBaseArticle,
    getCachedKnowledgeBaseCategories,
    getCachedLatestChangelogPage,
    getCachedPublishedFaqs,
} from '@lib/answerlattice/publicContentCache';
import { renderPublicTiptapHtml } from '@lib/answerlattice/publicRichText';
import { resolveHostedHelpSiteByDomain } from '@lib/answerlattice/hostedHelpServer';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import type { KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
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
    params: { segments?: string[] };
    searchParams?: { domain?: string };
};

const getRequestDomain = (searchParams?: { domain?: string }) => {
    const headerList = headers();
    const routedHost = headerList.get('x-answerlattice-hosted-help-domain');
    if (routedHost) return routedHost;

    const isDevRewrite = headerList.get('x-answerlattice-hosted-help-dev') === '1';
    const allowQueryDomain = isDevRewrite || process.env.NODE_ENV === 'development' || process.env.VERCEL !== '1';
    return allowQueryDomain
        ? searchParams?.domain || headerList.get('host')
        : headerList.get('host');
};

const getRequestIp = () => {
    const headerList = headers();
    return headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headerList.get('x-real-ip')
        || 'unknown';
};

const getArticlesFromCategories = (categories: KnowledgeBaseCategoriesType | null): KnowledgeBaseArticleMeta[] => {
    if (!categories?.categories) return [];
    return Object.values(categories.categories).flatMap(category => [
        ...(category.articles || []),
        ...(category.sections || []).flatMap(section => section.articles || []),
    ]);
};

const findArticleMeta = (
    categories: KnowledgeBaseCategoriesType | null,
    segment?: string,
): KnowledgeBaseArticleMeta | null => {
    const normalized = decodeURIComponent(segment || '').trim();
    if (!normalized) return null;
    return getArticlesFromCategories(categories).find(article => (
        article.id === normalized || article.url === normalized
    )) || null;
};

const toClientPlainValue = <T,>(value: T): T => {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (typeof (value as any)?.toMillis === 'function') {
        return new Date((value as any).toMillis()).toISOString() as T;
    }

    if (Array.isArray(value)) {
        return value.map(item => toClientPlainValue(item)) as T;
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, item]) => [
                key,
                toClientPlainValue(item),
            ]),
        ) as T;
    }

    return value;
};

const compactArticleMeta = (article: KnowledgeBaseArticleMeta): KnowledgeBaseArticleMeta => ({
    id: article.id,
    active: article.active !== false,
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

const compactFaqsForClient = (faqs: any[]): HostedHelpFaq[] => (
    (faqs || []).map(faq => ({
        id: String(faq.id || ''),
        question: String(faq.question || ''),
        answer: String(faq.answer || ''),
    })).filter(faq => faq.id && faq.question)
);

const compactChangelogForClient = (page: any): HostedHelpChangelogPage | null => {
    if (!page) return null;

    return {
        id: page.id,
        entries: (page.entries || []).map((entry: any) => ({
            id: String(entry.id || ''),
            title: String(entry.title || ''),
            version: entry.version ? String(entry.version) : null,
            releasedOn: toClientPlainValue(entry.releasedOn),
            description: entry.description || null,
        })).filter((entry: any) => entry.id && entry.title),
    };
};

const compactArticleForClient = (article: KnowledgeBaseArticleType): HostedHelpArticle => ({
    id: article.id,
    active: article.active !== false,
    title: article.title,
    index: Number(article.index || 0),
    url: article.url || article.id,
    categoryTitle: article.categoryTitle,
    sectionTitle: article.sectionTitle,
    safeHtml: renderPublicTiptapHtml(article.content),
});

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
    return resolveHostedHelpSiteByDomain(getRequestDomain(searchParams));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const site = await resolvePage(searchParams);
    if (!site) {
        return {
            title: 'Help Center not found',
            robots: { index: false, follow: false },
        };
    }

    const segments = params.segments || [];
    const title = segments[0] === 'docs'
        ? `Docs | ${site.config.title}`
        : segments[0] === 'faq'
            ? `FAQ | ${site.config.title}`
            : segments[0] === 'changelog'
                ? `What's New | ${site.config.title}`
                : site.config.title;

    return {
        title,
        description: site.config.description,
        robots: {
            index: !site.config.noIndex,
            follow: !site.config.noIndex,
        },
        alternates: site.config.primaryDomain ? {
            canonical: `https://${site.config.primaryDomain}/${segments.join('/')}`.replace(/\/$/, ''),
        } : undefined,
    };
}

export default async function AnswerlatticeHostedHelpPage({ params, searchParams }: PageProps) {
    const site = await resolvePage(searchParams);
    if (!site) notFound();

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
                view="home"
            />
        );
    }

    const segments = params.segments || [];
    const route = segments[0] || 'home';
    const scope = { tId: site.tId, sId: site.sId };
    const [categories, faqs, changelogPage] = await Promise.all([
        getCachedKnowledgeBaseCategories(scope),
        site.config.showFaqs ? getCachedPublishedFaqs(scope) : Promise.resolve([]),
        site.config.showChangelog ? getCachedLatestChangelogPage(scope) : Promise.resolve(null),
    ]);

    if (route === 'articles') {
        const articleMeta = findArticleMeta(categories, segments[1]);
        const article = articleMeta
            ? await getCachedKnowledgeBaseArticle(scope, articleMeta.id)
            : await getCachedKnowledgeBaseArticle(scope, decodeURIComponent(segments[1] || ''));

        if (!article) notFound();

        return (
            <HostedHelpClient
                article={compactArticleForClient(article as KnowledgeBaseArticleType)}
                categories={compactCategoriesForClient(categories)}
                changelogPage={compactChangelogForClient(changelogPage)}
                faqs={compactFaqsForClient(faqs)}
                site={compactSiteForClient(site)}
                view="article"
            />
        );
    }

    const view = route === 'docs'
        ? 'docs'
        : route === 'faq'
            ? 'faq'
            : route === 'changelog'
                ? 'changelog'
                : 'home';

    return (
        <HostedHelpClient
            categories={compactCategoriesForClient(categories)}
            changelogPage={compactChangelogForClient(changelogPage)}
            faqs={compactFaqsForClient(faqs)}
            site={compactSiteForClient(site)}
            view={view}
        />
    );
}
