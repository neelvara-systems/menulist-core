'use client';

import { useEffect } from 'react';
import { trackGoogleMarketingEvent, trackPlausibleEvent } from '@lib/website/plausible';
import {
    getPublicAnalyticsAttributionToken,
    getPublicAnalyticsReferrerGroup,
    getPublicAnalyticsSessionEntryPage,
} from '@lib/website/publicAnalyticsContext';
import {
    cleanAnswerlatticeAnalyticsString,
    getAnswerlatticeAnalyticsPagePath,
    getAnswerlatticeAnalyticsUrl,
} from './answerlatticeAnalyticsUtils';

const trackedReferrers = [
    { group: 'chatgpt', hosts: ['chatgpt.com', 'chat.openai.com'] },
    { group: 'perplexity', hosts: ['perplexity.ai'] },
    { group: 'claude', hosts: ['claude.ai'] },
    { group: 'google', hosts: ['google.com'] },
    { group: 'bing', hosts: ['bing.com'] },
    { group: 'copilot', hosts: ['copilot.microsoft.com'] },
];

type AnswerlatticeResourceAnalyticsProps = {
    cluster?: string;
    pageType: 'hub' | 'article';
    slug?: string;
};

function getQueryParam(name: string): string | undefined {
    return getPublicAnalyticsAttributionToken(
        new URLSearchParams(window.location.search).get(name),
    );
}

function getEntryPage(): string {
    return getPublicAnalyticsSessionEntryPage('answerlattice_resource_entry_page');
}

export default function AnswerlatticeResourceAnalytics({
    cluster,
    pageType,
    slug,
}: AnswerlatticeResourceAnalyticsProps): null {
    useEffect(() => {
        const referrerGroup = getPublicAnalyticsReferrerGroup(document.referrer, trackedReferrers);

        const payload = {
            category: cleanAnswerlatticeAnalyticsString(cluster, 80) || 'answerlattice_resource',
            cluster: cleanAnswerlatticeAnalyticsString(cluster, 80),
            entry_page: getEntryPage(),
            page_path: getAnswerlatticeAnalyticsPagePath(),
            page_type: pageType,
            referrer_group: referrerGroup,
            slug: cleanAnswerlatticeAnalyticsString(slug, 120),
            target_url: getAnswerlatticeAnalyticsUrl(window.location.href),
            utm_medium: getQueryParam('utm_medium'),
            utm_source: getQueryParam('utm_source'),
        };

        trackPlausibleEvent('answerlattice_resource_page_viewed');

        trackGoogleMarketingEvent('answerlattice_resource_page_view', payload);

        if (referrerGroup) {
            trackPlausibleEvent('answerlattice_ai_referral_detected');

            trackGoogleMarketingEvent('answerlattice_ai_referral_detected', {
                ...payload,
                referrer_group: referrerGroup,
            });
        }
    }, [cluster, pageType, slug]);

    return null;
}
