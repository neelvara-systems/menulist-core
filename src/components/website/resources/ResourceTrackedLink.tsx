'use client';

import type { ReactNode } from 'react';
import Link from '../shared/WebsiteLink';
import { trackGoogleMarketingEvent, trackPlausibleEvent } from '@lib/website/plausible';
import {
    getPublicAnalyticsAttributionToken,
    getPublicAnalyticsReferrerGroup,
    getPublicAnalyticsSessionEntryPage,
    getPublicAnalyticsUrl,
} from '@lib/website/publicAnalyticsContext';

const trackedReferrers = [
    { group: 'chatgpt', hosts: ['chatgpt.com', 'chat.openai.com'] },
    { group: 'claude', hosts: ['claude.ai'] },
    { group: 'gemini', hosts: ['gemini.google.com'] },
    { group: 'perplexity', hosts: ['perplexity.ai'] },
] as const;

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
                    ...eventProps,
                    category: eventProps?.cluster,
                    destination: getPublicAnalyticsUrl(href),
                    entry_page: getEntryPage(),
                    locale: getPublicAnalyticsAttributionToken(document.documentElement.lang),
                    referrer_group: getPublicAnalyticsReferrerGroup(document.referrer, trackedReferrers),
                    target_url: getPublicAnalyticsUrl(href),
                    utm_medium: getUtmMedium(),
                    utm_source: getUtmSource(),
                };

                trackGoogleMarketingEvent(eventName, payload);

                if (shouldTrackPath(href, '/create-menu')) {
                    trackPlausibleEvent('create_customer_link_clicked');
                    trackGoogleMarketingEvent('upload_menu_click_from_resource', payload);
                }

                if (shouldTrackPath(href, '/pricing')) {
                    trackPlausibleEvent('pricing_clicked');
                    trackGoogleMarketingEvent('pricing_click_from_resource', payload);
                }
            }}
        >
            {children}
        </Link>
    );
}
