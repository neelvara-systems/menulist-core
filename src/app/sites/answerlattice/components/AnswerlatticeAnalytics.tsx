'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import PublicCookieConsentBanner, { type PublicCookieConsentChoice } from '@/components/shared/publicCookieConsent/PublicCookieConsentBanner';

const ANSWERLATTICE_GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ANSWERLATTICE_ANALYTICS_CONSENT_STORAGE_KEY = 'answerlattice_website_analytics_consent_v1';

type AnswerlatticeWindow = Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
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
    const win = window as AnswerlatticeWindow;
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
        if (!ANSWERLATTICE_GA_MEASUREMENT_ID) return undefined;

        const handleClick = (event: MouseEvent) => {
            const target = event.target instanceof Element
                ? event.target.closest<HTMLElement>('[data-answerlattice-event]')
                : null;
            if (!target) return;

            const eventName = target.dataset.answerlatticeEvent;
            if (!eventName) return;

            const win = window as AnswerlatticeWindow;
            if (typeof win.gtag !== 'function') return;

            win.gtag('event', eventName, {
                event_category: target.dataset.answerlatticeCategory || 'answerlattice_website',
                event_label: target.dataset.answerlatticeLabel || target.textContent?.trim().slice(0, 80) || undefined,
                page_path: window.location.pathname,
                link_url: target instanceof HTMLAnchorElement ? target.href : undefined,
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
                        page_location: window.location.href,
                    });
                `}
            </Script>
            <AnswerlatticeConversionTracker />
        </>
    );
}

export default function AnswerlatticeAnalytics({ privacyHref = '/privacy-policy' }: { privacyHref?: string }) {
    const hasAnalytics = Boolean(ANSWERLATTICE_GA_MEASUREMENT_ID);

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
            {hasAnalytics ? <AnswerlatticeGoogleAnalytics /> : null}
        </PublicCookieConsentBanner>
    );
}
