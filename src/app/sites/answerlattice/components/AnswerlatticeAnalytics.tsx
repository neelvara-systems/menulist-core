'use client';

import { useEffect } from 'react';
import Script from 'next/script';

const ANSWERLATTICE_GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type AnswerlatticeWindow = Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
};

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

export default function AnswerlatticeAnalytics() {
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
