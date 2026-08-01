'use client';

import Script from 'next/script';
import { normalizePlausibleScriptSource } from '@lib/website/plausible';

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

    const resolvedScriptSrc = normalizePlausibleScriptSource(
        scriptSrc || DEFAULT_PLAUSIBLE_SCRIPT_SRC,
    );
    if (!resolvedScriptSrc) return null;

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
