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
    params: {
        locale: string;
    };
};

export function generateStaticParams() {
    return getWebsiteResourceLocaleStaticParams();
}

export function generateMetadata({ params }: LocalizedResourcesPageParams): Metadata {
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

export default function LocalizedResourcesPage({ params }: LocalizedResourcesPageParams) {
    if (!isReviewedWebsiteResourceLocale(params.locale)) {
        notFound();
    }

    return <ResourceHubPageShell locale={params.locale} />;
}
