'use client'
import { StoreDataType } from '@type/platform/store';
import Script from 'next/script';
import { useEffect } from 'react';

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
        gaId?: string;
        dataLayer: any[];
    }
}

interface GoogleAnalyticsProps {
    storeDetails?: StoreDataType;
}

const GoogleAnalytics = ({ storeDetails }: GoogleAnalyticsProps) => {
    const gaId = storeDetails?.analytics?.googleAnalyticsId;

    useEffect(() => {
        if (!gaId) return;

        window.gaId = gaId;
        if (typeof window.gtag !== 'function') {
            window.gtag = function gtag() {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(arguments);
            };
        }
    }, [gaId]);

    if (!gaId) return null;

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${gaId}');
                    `,
                }}
            />
        </>
    );
};

export default GoogleAnalytics;
