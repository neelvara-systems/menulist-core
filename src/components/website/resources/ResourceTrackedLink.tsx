'use client';

import type { ReactNode } from 'react';
import Link from '../shared/WebsiteLink';

type WebsiteGtagWindow = Window & {
    gtag?: (...args: unknown[]) => void;
};

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

function shouldTrackPath(href: string, path: string): boolean {
    return href === path || href.startsWith(`${path}?`) || href.startsWith(`${path}#`);
}

interface ResourceTrackedLinkProps {
    children: ReactNode;
    className?: string;
    eventName: string;
    eventProps?: Record<string, string | number | undefined>;
    href: string;
}

export default function ResourceTrackedLink({
    children,
    className,
    eventName,
    eventProps,
    href,
}: ResourceTrackedLinkProps) {
    return (
        <Link
            href={href}
            className={className}
            onClick={() => {
                const analyticsWindow = window as WebsiteGtagWindow;
                if (typeof analyticsWindow.gtag !== 'function') return;
                const payload = {
                    category: eventProps?.cluster,
                    destination: href,
                    entry_page: getEntryPage(),
                    locale: document.documentElement.lang || undefined,
                    referrer: document.referrer || undefined,
                    referrer_host: getReferrerHost(),
                    session_id: getSessionId(),
                    target_url: href,
                    utm_medium: getUtmMedium(),
                    utm_source: getUtmSource(),
                    ...eventProps,
                };

                analyticsWindow.gtag('event', eventName, payload);

                if (shouldTrackPath(href, '/create-menu')) {
                    analyticsWindow.gtag('event', 'upload_menu_click_from_resource', payload);
                }

                if (shouldTrackPath(href, '/pricing')) {
                    analyticsWindow.gtag('event', 'pricing_click_from_resource', payload);
                }
            }}
        >
            {children}
        </Link>
    );
}
