'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import PublicCookieConsentBanner, { type PublicCookieConsentChoice } from '@/components/shared/publicCookieConsent/PublicCookieConsentBanner';
import {
    setPublicWebsiteAnalyticsRuntimeConsent,
    trackGoogleMarketingEvent,
    trackPlausibleEvent,
} from '@lib/website/plausible';
import AnswerlatticePlausibleAnalytics from './AnswerlatticePlausibleAnalytics';
import {
    cleanAnswerlatticeAnalyticsString,
    getAnswerlatticeAnalyticsPagePath,
    getAnswerlatticeAnalyticsUrl,
} from './answerlatticeAnalyticsUtils';

const ANSWERLATTICE_GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const RAW_ANSWERLATTICE_GA_MEASUREMENT_ID = (
    process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID
    || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    || ''
).trim();
const ANSWERLATTICE_GA_MEASUREMENT_ID = ANSWERLATTICE_GA_MEASUREMENT_ID_PATTERN.test(RAW_ANSWERLATTICE_GA_MEASUREMENT_ID)
    ? RAW_ANSWERLATTICE_GA_MEASUREMENT_ID
    : '';
const ANSWERLATTICE_PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN;
const ANSWERLATTICE_ANALYTICS_CONSENT_STORAGE_KEY = 'answerlattice_website_analytics_consent_v1';

type AnswerlatticeWindow = Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (...args: unknown[]) => void;
};

function deleteCookie(name: string) {
    const hostname = window.location.hostname;
    const hostnameParts = hostname.split('.').filter(Boolean);
    const parentDomain = hostnameParts.length > 2 ? hostnameParts.slice(-2).join('.') : hostname;
    const domainCandidates = ['', hostname, `.${hostname}`, parentDomain, `.${parentDomain}`];

    Array.from(new Set(domainCandidates)).forEach((domain) => {
        document.cookie = [
            `${name}=`,
            'Max-Age=0',
            'expires=Thu, 01 Jan 1970 00:00:00 GMT',
            'path=/',
            domain ? `domain=${domain}` : '',
            'SameSite=Lax',
        ].filter(Boolean).join('; ');
    });
}

function clearKnownGoogleAnalyticsCookies() {
    const currentNames = document.cookie
        .split(';')
        .map((cookie) => cookie.split('=')[0]?.trim())
        .filter(Boolean) as string[];

    const dynamicNames = currentNames.filter((name) => (
        name.startsWith('_ga_') ||
        name.startsWith('_gat_')
    ));

    Array.from(new Set(['_ga', '_gid', '_gat', ...dynamicNames])).forEach(deleteCookie);
}

function applyAnswerlatticeConsent(choice: PublicCookieConsentChoice) {
    setPublicWebsiteAnalyticsRuntimeConsent(choice);
    const win = window as AnswerlatticeWindow;
    if (choice === 'declined') {
        win.plausible = undefined;
    }

    if (typeof win.gtag !== 'function') {
        if (choice === 'declined') clearKnownGoogleAnalyticsCookies();
        return;
    }

    win.gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: choice === 'accepted' ? 'granted' : 'denied',
    });

    if (choice === 'declined') {
        clearKnownGoogleAnalyticsCookies();
    }
}

function AnswerlatticeConversionTracker() {
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target instanceof Element
                ? event.target.closest<HTMLElement>('[data-answerlattice-event]')
                : null;
            if (!target) return;

            const eventName = target.dataset.answerlatticeEvent;
            if (!eventName) return;

            trackPlausibleEvent(eventName);

            trackGoogleMarketingEvent(eventName, {
                event_category: cleanAnswerlatticeAnalyticsString(target.dataset.answerlatticeCategory, 80) || 'answerlattice_website',
                event_label: cleanAnswerlatticeAnalyticsString(target.dataset.answerlatticeLabel || target.textContent, 80),
                page_path: getAnswerlatticeAnalyticsPagePath(),
                link_url: target instanceof HTMLAnchorElement ? getAnswerlatticeAnalyticsUrl(target.href) : undefined,
            });
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return null;
}

function AnswerlatticeGoogleAnalytics() {
    if (!ANSWERLATTICE_GA_MEASUREMENT_ID) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${ANSWERLATTICE_GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="answerlattice-google-analytics" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('consent', 'default', {
                        ad_storage: 'denied',
                        ad_user_data: 'denied',
                        ad_personalization: 'denied',
                        analytics_storage: 'granted'
                    });
                    gtag('set', 'ads_data_redaction', true);
                    gtag('js', new Date());
                    gtag('config', '${ANSWERLATTICE_GA_MEASUREMENT_ID}', {
                        page_title: document.title,
                        page_location: (function getAnswerlatticeAnalyticsPageLocation() {
                            try {
                                var url = new URL(window.location.href);
                                return url.origin + (url.pathname || '/');
                            } catch (error) {
                                return window.location.origin + (window.location.pathname || '/');
                            }
                        })(),
                    });
                `}
            </Script>
        </>
    );
}

export default function AnswerlatticeAnalytics({ privacyHref = '/privacy-policy' }: { privacyHref?: string }) {
    const hasAnalytics = Boolean(ANSWERLATTICE_GA_MEASUREMENT_ID || ANSWERLATTICE_PLAUSIBLE_DOMAIN);

    return (
        <PublicCookieConsentBanner
            acceptLabel="Okay"
            closeLabel="Close cookie preference"
            declineLabel="Decline"
            message={hasAnalytics
                ? 'We use essential storage to run this site. Optional analytics help us understand traffic and improve reliability.'
                : 'We use essential storage to keep this site working and remember basic preferences.'}
            onConsentChange={hasAnalytics ? applyAnswerlatticeConsent : undefined}
            panelLabel="Cookie preference"
            privacyHref={privacyHref}
            privacyLabel="Privacy policy"
            product="answerlattice"
            showDecline={hasAnalytics}
            statusAccepted={hasAnalytics ? 'Current choice: analytics accepted.' : 'Current choice: essential storage acknowledged.'}
            statusDeclined="Current choice: essentials only."
            storageKey={ANSWERLATTICE_ANALYTICS_CONSENT_STORAGE_KEY}
        >
            {hasAnalytics ? <AnswerlatticePlausibleAnalytics /> : null}
            {ANSWERLATTICE_GA_MEASUREMENT_ID ? <AnswerlatticeGoogleAnalytics /> : null}
            {hasAnalytics ? <AnswerlatticeConversionTracker /> : null}
        </PublicCookieConsentBanner>
    );
}
