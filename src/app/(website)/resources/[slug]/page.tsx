import {
    DefaultWebsiteResourceLocaleBoundary,
    ResourceArticlePageShell,
    buildResourceArticleMetadata,
} from '@/components/website/resources/ResourcePageShell';
import {
    WEBSITE_RESOURCE_DEFAULT_LOCALE,
    getWebsiteResourceSlugs,
} from '@/content/websiteResources';
import type { Metadata } from 'next';

type ResourcePageParams = {
    params: {
        slug: string;
    };
};

export function generateStaticParams() {
    return getWebsiteResourceSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: ResourcePageParams): Metadata {
    return buildResourceArticleMetadata(params.slug, WEBSITE_RESOURCE_DEFAULT_LOCALE);
}

export default function ResourceArticlePage({ params }: ResourcePageParams) {
    return (
        <DefaultWebsiteResourceLocaleBoundary>
            <ResourceArticlePageShell
                locale={WEBSITE_RESOURCE_DEFAULT_LOCALE}
                slug={params.slug}
            />
        </DefaultWebsiteResourceLocaleBoundary>
    );
}
