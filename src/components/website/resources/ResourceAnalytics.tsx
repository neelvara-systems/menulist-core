'use client';

import { useEffect } from 'react';

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

function getSessionId(): string {
    const storageKey = 'menulist_resource_session_id';
    const nextId = `rs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    try {
        const existing = window.sessionStorage.getItem(storageKey);
        if (existing) return existing;
        window.sessionStorage.setItem(storageKey, nextId);
    } catch {
        return nextId;
    }

    return nextId;
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
        const analyticsWindow = window as WebsiteGtagWindow;
        if (typeof analyticsWindow.gtag !== 'function') return;
        const referrerHost = getReferrerHost();
        const pageLocale = getPageLocale(locale);
        const referrerMatch = referrerHost
            ? trackedReferrers.find((referrer) => (
                referrer.hosts.some((host) => referrerHost === host || referrerHost.endsWith(`.${host}`))
            ))
            : undefined;

        analyticsWindow.gtag('event', 'resource_page_view', {
            category: cluster,
            cluster,
            entry_page: getEntryPage(),
            locale: pageLocale,
            page_type: pageType,
            referrer: document.referrer || undefined,
            referrer_host: referrerHost,
            session_id: getSessionId(),
            slug,
            target_url: window.location.href,
            utm_medium: getUtmMedium(),
            utm_source: getUtmSource(),
        });

        if (referrerMatch) {
            analyticsWindow.gtag('event', 'ai_crawler_referral_detected', {
                category: cluster,
                cluster,
                entry_page: getEntryPage(),
                locale: pageLocale,
                page_type: pageType,
                referrer: document.referrer || undefined,
                referrer_group: referrerMatch.group,
                referrer_host: referrerHost,
                session_id: getSessionId(),
                slug,
                target_url: window.location.href,
            });
        }
    }, [cluster, locale, pageType, slug]);

    return null;
}
