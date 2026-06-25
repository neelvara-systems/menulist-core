'use client';

import { useEffect } from 'react';
import { trackPlausibleEvent } from '@lib/website/plausible';

type WebsiteGtagWindow = Window & {
    gaId?: string;
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

interface ResourceAnalyticsProps {
    cluster?: string;
    locale?: string | null;
    pageType: 'hub' | 'article';
    slug?: string;
}

function getReferrerHost(): string | undefined {
    if (!document.referrer) return undefined;

    try {
        return new URL(document.referrer).hostname.replace(/^www\./, '');
    } catch {
        return undefined;
    }
}

function getUtmSource(): string | undefined {
    return new URLSearchParams(window.location.search).get('utm_source') || undefined;
}

function getUtmMedium(): string | undefined {
    return new URLSearchParams(window.location.search).get('utm_medium') || undefined;
}

function getEntryPage(): string {
    const storageKey = 'menulist_resource_entry_page';
    const entryPage = `${window.location.pathname}${window.location.search}`;

    try {
        const existing = window.sessionStorage.getItem(storageKey);
        if (existing) return existing;
        window.sessionStorage.setItem(storageKey, entryPage);
    } catch {
        return entryPage;
    }

    return entryPage;
}

function getPageLocale(explicitLocale?: string | null): string | undefined {
    return explicitLocale || document.documentElement.lang || undefined;
}

export default function ResourceAnalytics({
    cluster,
    locale,
    pageType,
    slug,
}: ResourceAnalyticsProps) {
    useEffect(() => {
        const referrerHost = getReferrerHost();
        const pageLocale = getPageLocale(locale);
        const referrerMatch = referrerHost
            ? trackedReferrers.find((referrer) => (
                referrer.hosts.some((host) => referrerHost === host || referrerHost.endsWith(`.${host}`))
            ))
            : undefined;

        trackPlausibleEvent('resource_page_viewed');

        const analyticsWindow = window as WebsiteGtagWindow;
        const payload = {
            category: cluster,
            cluster,
            entry_page: getEntryPage(),
            locale: pageLocale,
            page_type: pageType,
            referrer: document.referrer || undefined,
            referrer_host: referrerHost,
            slug,
            target_url: window.location.href,
            utm_medium: getUtmMedium(),
            utm_source: getUtmSource(),
        };

        if (typeof analyticsWindow.gtag === 'function') {
            analyticsWindow.gtag('event', 'resource_page_view', payload);
        }

        if (referrerMatch) {
            trackPlausibleEvent('ai_referral_detected');

            if (typeof analyticsWindow.gtag === 'function') {
                analyticsWindow.gtag('event', 'ai_crawler_referral_detected', {
                    ...payload,
                    referrer_group: referrerMatch.group,
                });
            }
        }
    }, [cluster, locale, pageType, slug]);

    return null;
}
