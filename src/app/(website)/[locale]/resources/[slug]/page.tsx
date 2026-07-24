import {
    ResourceArticlePageShell,
    buildResourceArticleMetadata,
} from '@/components/website/resources/ResourcePageShell';
import {
    getWebsiteResourceSlugs,
} from '@/content/websiteResources';
import {
    getWebsiteResourceLocaleStaticParams,
    isReviewedWebsiteResourceLocale,
} from '@/content/websiteResources/routing';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type LocalizedResourceArticlePageParams = {
    params: Promise<{
        locale: string;
        slug: string;
    }>;
};

export function generateStaticParams() {
    return getWebsiteResourceLocaleStaticParams().flatMap(({ locale }) => (
        getWebsiteResourceSlugs().map((slug) => ({ locale, slug }))
    ));
}

export async function generateMetadata(props: LocalizedResourceArticlePageParams): Promise<Metadata> {
    const params = await props.params;
    if (!isReviewedWebsiteResourceLocale(params.locale)) {
        return {
            title: 'Resource Not Found - MenuList',
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    return buildResourceArticleMetadata(params.slug, params.locale);
}

export default async function LocalizedResourceArticlePage(props: LocalizedResourceArticlePageParams) {
    const params = await props.params;
    if (!isReviewedWebsiteResourceLocale(params.locale)) {
        notFound();
    }

    return (
        <ResourceArticlePageShell
            locale={params.locale}
            slug={params.slug}
        />
    );
}
