'use client';

import { useEffect } from 'react';

type WebsiteGtagWindow = Window & {
    gaId?: string;
    gtag?: (...args: unknown[]) => void;
};

interface ResourceAnalyticsProps {
    cluster?: string;
    pageType: 'hub' | 'article';
    slug?: string;
}

export default function ResourceAnalytics({ cluster, pageType, slug }: ResourceAnalyticsProps) {
    useEffect(() => {
        const analyticsWindow = window as WebsiteGtagWindow;
        if (typeof analyticsWindow.gtag !== 'function') return;

        analyticsWindow.gtag('event', 'resource_page_view', {
            cluster,
            page_type: pageType,
            slug,
        });
    }, [cluster, pageType, slug]);

    return null;
}
