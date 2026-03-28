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
    const gaId = storeDetails?.analytics?.googleAnalyticsId;//"G-8QJNFHDGNL"

    useEffect(() => {
        if (gaId) {
            // Initialize gtag
            window.gtag = function gtag() {
                // @ts-ignore
                window.dataLayer = window.dataLayer || [];
                // @ts-ignore
                window.dataLayer.push(arguments);
            };

            // Initial pageview
            window.gtag('js', new Date());
            window.gtag('config', gaId, {
                page_path: window.location.pathname,
            });
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