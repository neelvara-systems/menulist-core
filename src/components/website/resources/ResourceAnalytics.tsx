'use client';

import { useEffect, type ReactNode } from 'react';
import { trackGoogleMarketingEvent, trackPlausibleEvent } from '@lib/website/plausible';
import {
    cleanPublicAnalyticsString,
    getPublicAnalyticsAttributionToken,
    getPublicAnalyticsReferrerGroup,
    getPublicAnalyticsSessionEntryPage,
    getPublicAnalyticsUrl,
} from '@lib/website/publicAnalyticsContext';

const trackedReferrers = [
    { group: 'chatgpt', hosts: ['chatgpt.com', 'chat.openai.com'] },
    { group: 'perplexity', hosts: ['perplexity.ai'] },
    { group: 'claude', hosts: ['claude.ai'] },
    { group: 'google', hosts: ['google.com'] },
    { group: 'bing', hosts: ['bing.com'] },
    { group: 'copilot', hosts: ['copilot.microsoft.com'] },
];

interface ResourceAnalyticsProps {
    cluster?: string;
    locale?: string | null;
    pageType: 'hub' | 'article';
    slug?: string;
}

function getUtmSource(): string | undefined {
    return getPublicAnalyticsAttributionToken(
        new URLSearchParams(window.location.search).get('utm_source'),
    );
}

function getUtmMedium(): string | undefined {
    return getPublicAnalyticsAttributionToken(
        new URLSearchParams(window.location.search).get('utm_medium'),
    );
}

function getEntryPage(): string {
    return getPublicAnalyticsSessionEntryPage('menulist_resource_entry_page');
}

function getPageLocale(explicitLocale?: string | null): string | undefined {
    return getPublicAnalyticsAttributionToken(
        explicitLocale || document.documentElement.lang,
    );
}

export default function ResourceAnalytics({
    cluster,
    locale,
    pageType,
    slug,
}: ResourceAnalyticsProps): ReactNode {
    useEffect(() => {
        const pageLocale = getPageLocale(locale);
        const referrerGroup = getPublicAnalyticsReferrerGroup(document.referrer, trackedReferrers);

        trackPlausibleEvent('resource_page_viewed');

        const payload = {
            category: cleanPublicAnalyticsString(cluster, 80),
            cluster: cleanPublicAnalyticsString(cluster, 80),
            entry_page: getEntryPage(),
            locale: pageLocale,
            page_type: pageType,
            referrer_group: referrerGroup,
            slug: cleanPublicAnalyticsString(slug, 120),
            target_url: getPublicAnalyticsUrl(window.location.href),
            utm_medium: getUtmMedium(),
            utm_source: getUtmSource(),
        };

        trackGoogleMarketingEvent('resource_page_view', payload);

        if (referrerGroup) {
            trackPlausibleEvent('ai_referral_detected');
            trackGoogleMarketingEvent('ai_crawler_referral_detected', {
                ...payload,
                referrer_group: referrerGroup,
            });
        }
    }, [cluster, locale, pageType, slug]);

    return null;
}
