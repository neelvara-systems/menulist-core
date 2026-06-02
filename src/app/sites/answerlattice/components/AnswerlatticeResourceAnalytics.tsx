'use client';

import { useEffect } from 'react';

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
    return new URLSearchParams(window.location.search).get(name) || undefined;
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

function getSessionId(): string {
    return getSessionValue(
        'answerlattice_resource_session_id',
        `ars_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    );
}

function getEntryPage(): string {
    return getSessionValue(
        'answerlattice_resource_entry_page',
        `${window.location.pathname}${window.location.search}`,
    );
}

export default function AnswerlatticeResourceAnalytics({
    cluster,
    pageType,
    slug,
}: AnswerlatticeResourceAnalyticsProps) {
    useEffect(() => {
        const analyticsWindow = window as AnswerlatticeAnalyticsWindow;
        if (typeof analyticsWindow.gtag !== 'function') return;

        const referrerHost = getReferrerHost();
        const referrerMatch = referrerHost
            ? trackedReferrers.find((referrer) => (
                referrer.hosts.some((host) => referrerHost === host || referrerHost.endsWith(`.${host}`))
            ))
            : undefined;

        const payload = {
            category: cluster || 'answerlattice_resource',
            cluster,
            entry_page: getEntryPage(),
            page_path: window.location.pathname,
            page_type: pageType,
            referrer: document.referrer || undefined,
            referrer_host: referrerHost,
            session_id: getSessionId(),
            slug,
            target_url: window.location.href,
            utm_medium: getQueryParam('utm_medium'),
            utm_source: getQueryParam('utm_source'),
        };

        analyticsWindow.gtag('event', 'answerlattice_resource_page_view', payload);

        if (referrerMatch) {
            analyticsWindow.gtag('event', 'answerlattice_ai_referral_detected', {
                ...payload,
                referrer_group: referrerMatch.group,
            });
        }
    }, [cluster, pageType, slug]);

    return null;
}

