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
    params: Promise<{
        slug: string;
    }>;
};

export function generateStaticParams() {
    return getWebsiteResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: ResourcePageParams): Promise<Metadata> {
    const params = await props.params;
    return buildResourceArticleMetadata(params.slug, WEBSITE_RESOURCE_DEFAULT_LOCALE);
}

export default async function ResourceArticlePage(props: ResourcePageParams) {
    const params = await props.params;
    return (
        <DefaultWebsiteResourceLocaleBoundary>
            <ResourceArticlePageShell
                locale={WEBSITE_RESOURCE_DEFAULT_LOCALE}
                slug={params.slug}
            />
        </DefaultWebsiteResourceLocaleBoundary>
    );
}
