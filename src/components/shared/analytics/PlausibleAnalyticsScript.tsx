'use client';

import Script from 'next/script';

const DEFAULT_PLAUSIBLE_SCRIPT_SRC = 'https://plausible.io/js/script.js';

interface PlausibleAnalyticsScriptProps {
    domain?: string;
    scriptId: string;
    scriptSrc?: string;
}

export default function PlausibleAnalyticsScript({
    domain,
    scriptId,
    scriptSrc = DEFAULT_PLAUSIBLE_SCRIPT_SRC,
}: PlausibleAnalyticsScriptProps) {
    if (process.env.NODE_ENV === 'development') return null;
    if (!domain) return null;

    const resolvedScriptSrc = scriptSrc || DEFAULT_PLAUSIBLE_SCRIPT_SRC;

    return (
        <>
            <Script id={`${scriptId}-queue`} strategy="afterInteractive">
                {`
                    window.plausible = window.plausible || function(){
                        (window.plausible.q = window.plausible.q || []).push(arguments);
                    };
                `}
            </Script>
            <Script
                id={scriptId}
                src={resolvedScriptSrc}
                data-domain={domain}
                strategy="afterInteractive"
            />
        </>
    );
}
