import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import ScrollToTopButton from '@/components/website/shared/ScrollToTopButton';
import IntlClientWrapper from '@/providers/IntlClientWrapper';
import {
    WEBSITE_RESOURCE_DEFAULT_LOCALE,
    buildWebsiteResourceLanguageAlternates,
    buildWebsiteResourcePath,
    getWebsiteRelatedResourceArticles,
    getWebsiteResourceArticle,
    getWebsiteResourceArticles,
    getWebsiteResourcesCopy,
} from '@/content/websiteResources';
import '@/styles/website.css';
import { FEATURE_FLAGS } from '@config/features';
import { defaultTimezone } from '@lib/localization/config';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import enUSMessages from 'public/locales/menulist.ai/en-US.json';
import ArticleLayout from './ArticleLayout';
import ResourceStructuredData from './ResourceStructuredData';
import ResourcesHub from './ResourcesHub';

type ResourceLocaleProps = {
    locale?: string | null;
};

type DefaultWebsiteResourceLocaleBoundaryProps = {
    children: React.ReactNode;
};

export function DefaultWebsiteResourceLocaleBoundary({ children }: DefaultWebsiteResourceLocaleBoundaryProps) {
    return (
        <IntlClientWrapper
            locale={WEBSITE_RESOURCE_DEFAULT_LOCALE}
            messages={enUSMessages}
            timeZone={defaultTimezone}
        >
            <div lang={WEBSITE_RESOURCE_DEFAULT_LOCALE} dir="ltr">
                {children}
            </div>
        </IntlClientWrapper>
    );
}

export function buildResourceHubMetadata(locale?: string | null): Metadata {
    const copy = getWebsiteResourcesCopy(locale);
    const path = buildWebsiteResourcePath(null, locale);
    const title = locale && locale !== 'en-US'
        ? `${copy.hub.title} - MenuList`
        : 'Resources - MenuList | Keep One Public List Current';
    const description = locale && locale !== 'en-US'
        ? copy.hub.subtitle
        : 'Menu and service-list correctness, QR placement, Google links, PDFs, SEO, AI search discovery, worksheets, and checklists for business owners.';

    return {
        title,
        description,
        alternates: {
            canonical: path,
            languages: buildWebsiteResourceLanguageAlternates(),
        },
        openGraph: {
            title,
            description,
            url: path,
        },
    };
}

export function buildResourceArticleMetadata(slug: string, locale?: string | null): Metadata {
    const article = getWebsiteResourceArticle(slug, locale);
    if (!article) {
        return {
            title: 'Resource Not Found - MenuList',
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const path = buildWebsiteResourcePath(article.slug, locale);

    return {
        title: article.metaTitle,
        description: article.metaDescription,
        alternates: {
            canonical: path,
            languages: buildWebsiteResourceLanguageAlternates(article.slug),
        },
        openGraph: {
            title: article.metaTitle,
            description: article.metaDescription,
            url: path,
            type: 'article',
            publishedTime: article.publishedAt,
            modifiedTime: article.updatedAt,
        },
    };
}

export function ResourceHubPageShell({ locale }: ResourceLocaleProps) {
    if (!FEATURE_FLAGS.ENABLE_WEBSITE_RESOURCES) {
        notFound();
    }

    const copy = getWebsiteResourcesCopy(locale);
    const articles = getWebsiteResourceArticles(locale);

    return (
        <div className="ws-page">
            <ResourceStructuredData
                articles={articles}
                locale={copy.locale}
                type="hub"
            />
            <Header />
            <ResourcesHub
                copy={copy}
                locale={copy.locale}
            />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}

type ResourceArticlePageShellProps = ResourceLocaleProps & {
    slug: string;
};

export function ResourceArticlePageShell({ locale, slug }: ResourceArticlePageShellProps) {
    if (!FEATURE_FLAGS.ENABLE_WEBSITE_RESOURCES) {
        notFound();
    }

    const copy = getWebsiteResourcesCopy(locale);
    const article = getWebsiteResourceArticle(slug, locale);

    if (!article) {
        notFound();
    }

    const relatedArticles = getWebsiteRelatedResourceArticles(article, locale);

    return (
        <div className="ws-page">
            <ResourceStructuredData
                article={article}
                locale={copy.locale}
                type="article"
            />
            <Header />
            <ArticleLayout
                article={article}
                clusterLabels={copy.clusterLabels}
                labels={copy.labels}
                locale={copy.locale}
                relatedArticles={relatedArticles}
            />
            <Footer />
            <ScrollToTopButton />
        </div>
    );
}
