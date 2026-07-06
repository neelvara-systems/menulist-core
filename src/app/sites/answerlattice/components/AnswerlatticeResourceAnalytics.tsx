'use client';

import { useEffect } from 'react';
import { trackPlausibleEvent } from '@lib/website/plausible';
import {
    cleanAnswerlatticeAnalyticsString,
    getAnswerlatticeAnalyticsPagePath,
    getAnswerlatticeAnalyticsUrl,
} from './answerlatticeAnalyticsUtils';

type AnswerlatticeAnalyticsWindow = Window & {
    gtag?: (...args: unknown[]) => void;
};

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

function getReferrerHost(): string | undefined {
    if (!document.referrer) return undefined;

    try {
        return new URL(document.referrer).hostname.replace(/^www\./, '');
    } catch {
        return undefined;
    }
}

function getQueryParam(name: string): string | undefined {
    return cleanAnswerlatticeAnalyticsString(new URLSearchParams(window.location.search).get(name), 80);
}

function getSessionValue(storageKey: string, nextValue: string): string {
    try {
        const existing = window.sessionStorage.getItem(storageKey);
        if (existing) return existing;
        window.sessionStorage.setItem(storageKey, nextValue);
    } catch {
        return nextValue;
    }

    return nextValue;
}

function getEntryPage(): string {
    return getSessionValue(
        'answerlattice_resource_entry_page',
        getAnswerlatticeAnalyticsPagePath(),
    );
}

export default function AnswerlatticeResourceAnalytics({
    cluster,
    pageType,
    slug,
}: AnswerlatticeResourceAnalyticsProps) {
    useEffect(() => {
        const referrerHost = getReferrerHost();
        const referrerMatch = referrerHost
            ? trackedReferrers.find((referrer) => (
                referrer.hosts.some((host) => referrerHost === host || referrerHost.endsWith(`.${host}`))
            ))
            : undefined;

        const payload = {
            category: cleanAnswerlatticeAnalyticsString(cluster, 80) || 'answerlattice_resource',
            cluster: cleanAnswerlatticeAnalyticsString(cluster, 80),
            entry_page: getEntryPage(),
            page_path: getAnswerlatticeAnalyticsPagePath(),
            page_type: pageType,
            referrer: getAnswerlatticeAnalyticsUrl(document.referrer),
            referrer_host: referrerHost,
            slug: cleanAnswerlatticeAnalyticsString(slug, 120),
            target_url: getAnswerlatticeAnalyticsUrl(window.location.href),
            utm_medium: getQueryParam('utm_medium'),
            utm_source: getQueryParam('utm_source'),
        };

        trackPlausibleEvent('answerlattice_resource_page_viewed');

        const analyticsWindow = window as AnswerlatticeAnalyticsWindow;
        if (typeof analyticsWindow.gtag === 'function') {
            analyticsWindow.gtag('event', 'answerlattice_resource_page_view', payload);
        }

        if (referrerMatch) {
            trackPlausibleEvent('answerlattice_ai_referral_detected');

            if (typeof analyticsWindow.gtag === 'function') {
                analyticsWindow.gtag('event', 'answerlattice_ai_referral_detected', {
                    ...payload,
                    referrer_group: referrerMatch.group,
                });
            }
        }
    }, [cluster, pageType, slug]);

    return null;
}
