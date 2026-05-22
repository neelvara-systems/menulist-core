'use client';

import { useEffect } from 'react';
import Script from 'next/script';

const CANONICA_GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_CANONICA_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type CanonicaWindow = Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
};

function CanonicaConversionTracker() {
    useEffect(() => {
        if (!CANONICA_GA_MEASUREMENT_ID) return undefined;

        const handleClick = (event: MouseEvent) => {
            const target = event.target instanceof Element
                ? event.target.closest<HTMLElement>('[data-canonica-event]')
                : null;
            if (!target) return;

            const eventName = target.dataset.canonicaEvent;
            if (!eventName) return;

            const win = window as CanonicaWindow;
            if (typeof win.gtag !== 'function') return;

            win.gtag('event', eventName, {
                event_category: 'canonica_website',
                event_label: target.dataset.canonicaLabel || target.textContent?.trim().slice(0, 80) || undefined,
                page_path: window.location.pathname,
            });
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return null;
}

export default function CanonicaAnalytics() {
    if (!CANONICA_GA_MEASUREMENT_ID) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${CANONICA_GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="canonica-google-analytics" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${CANONICA_GA_MEASUREMENT_ID}', {
                        page_title: document.title,
                        page_location: window.location.href,
                    });
                `}
            </Script>
            <CanonicaConversionTracker />
        </>
    );
}
