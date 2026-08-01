'use client';

import { useEffect, type ReactNode } from 'react';
import { trackWebsiteMarketingEvent } from '@lib/website/plausible';
import {
    getPublicAnalyticsPagePath,
    getPublicAnalyticsUrl,
} from '@lib/website/publicAnalyticsContext';

const AI_SUMMARY_HOSTS = new Set([
    'chatgpt.com',
    'chat.openai.com',
    'claude.ai',
    'gemini.google.com',
    'perplexity.ai',
]);

function stripLocalePrefix(pathname: string): string {
    return pathname.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/)/, '');
}

function matchesPath(pathname: string, targetPath: string): boolean {
    const normalizedPath = stripLocalePrefix(pathname);
    return normalizedPath === targetPath || normalizedPath.startsWith(`${targetPath}/`);
}

function getAnchorUrl(anchor: HTMLAnchorElement): URL | undefined {
    const href = anchor.getAttribute('href');
    if (!href) return undefined;

    try {
        return new URL(href, window.location.origin);
    } catch {
        return undefined;
    }
}

function getMarketingEventName(anchor: HTMLAnchorElement): string | undefined {
    const url = getAnchorUrl(anchor);
    if (!url) return undefined;

    const hostname = url.hostname.replace(/^www\./, '');

    if (hostname === 'wa.me' || hostname.endsWith('.whatsapp.com')) {
        return 'whatsapp_cta_clicked';
    }

    if (url.origin !== window.location.origin) {
        return AI_SUMMARY_HOSTS.has(hostname) ? 'ai_summary_link_clicked' : undefined;
    }

    if (matchesPath(url.pathname, '/create-menu')) return 'create_customer_link_clicked';
    if (matchesPath(url.pathname, '/pricing')) return 'pricing_clicked';
    if (matchesPath(url.pathname, '/signin')) return 'login_clicked';
    if (matchesPath(url.pathname, '/whatsapp')) return 'whatsapp_cta_clicked';

    return undefined;
}

export default function WebsiteMarketingClickTracker(): ReactNode {
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const anchor = event.target instanceof Element
                ? event.target.closest<HTMLAnchorElement>('a[href]')
                : null;
            if (!anchor) return;

            const eventName = getMarketingEventName(anchor);
            if (!eventName) return;

            const url = getAnchorUrl(anchor);
            trackWebsiteMarketingEvent(eventName, {
                link_url: getPublicAnalyticsUrl(url?.href),
                page_path: getPublicAnalyticsPagePath(),
            });
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return null;
}
