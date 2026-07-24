import {
    ResourceHubPageShell,
    buildResourceHubMetadata,
} from '@/components/website/resources/ResourcePageShell';
import {
    getWebsiteResourceLocaleStaticParams,
    isReviewedWebsiteResourceLocale,
} from '@/content/websiteResources/routing';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type LocalizedResourcesPageParams = {
    params: Promise<{
        locale: string;
    }>;
};

export function generateStaticParams() {
    return getWebsiteResourceLocaleStaticParams();
}

export async function generateMetadata(props: LocalizedResourcesPageParams): Promise<Metadata> {
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

    return buildResourceHubMetadata(params.locale);
}

export default async function LocalizedResourcesPage(props: LocalizedResourcesPageParams) {
    const params = await props.params;
    if (!isReviewedWebsiteResourceLocale(params.locale)) {
        notFound();
    }

    return <ResourceHubPageShell locale={params.locale} />;
}
