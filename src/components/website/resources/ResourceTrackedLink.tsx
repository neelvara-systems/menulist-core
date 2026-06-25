'use client';

import type { ReactNode } from 'react';
import Link from '../shared/WebsiteLink';
import { trackPlausibleEvent } from '@lib/website/plausible';

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
                trackPlausibleEvent(eventName);

                const payload = {
                    category: eventProps?.cluster,
                    destination: href,
                    entry_page: getEntryPage(),
                    locale: document.documentElement.lang || undefined,
                    referrer: document.referrer || undefined,
                    referrer_host: getReferrerHost(),
                    target_url: href,
                    utm_medium: getUtmMedium(),
                    utm_source: getUtmSource(),
                    ...eventProps,
                };

                const analyticsWindow = window as WebsiteGtagWindow;
                if (typeof analyticsWindow.gtag === 'function') {
                    analyticsWindow.gtag('event', eventName, payload);
                }

                if (shouldTrackPath(href, '/create-menu')) {
                    trackPlausibleEvent('create_customer_link_clicked');

                    if (typeof analyticsWindow.gtag === 'function') {
                        analyticsWindow.gtag('event', 'upload_menu_click_from_resource', payload);
                    }
                }

                if (shouldTrackPath(href, '/pricing')) {
                    trackPlausibleEvent('pricing_clicked');

                    if (typeof analyticsWindow.gtag === 'function') {
                        analyticsWindow.gtag('event', 'pricing_click_from_resource', payload);
                    }
                }
            }}
        >
            {children}
        </Link>
    );
}
