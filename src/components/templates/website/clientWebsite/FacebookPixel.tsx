'use client'
import { StoreDataType } from '@type/platform/store';
import Script from 'next/script';
import { useEffect } from 'react';

declare global {
    interface Window {
        fbq: (...args: any[]) => void;
    }
}

interface FacebookPixelProps {
    storeDetails?: StoreDataType;
}

const FacebookPixel = ({ storeDetails }: FacebookPixelProps) => {
    const pixelId = storeDetails?.analytics?.facebookPixelId;

    useEffect(() => {
        if (pixelId) {
            // Initialize fbq
            window.fbq = function fbq() {
                // @ts-ignore
                window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
            };

            // Initialize queue
            // @ts-ignore
            window.fbq.push = window.fbq;
            // @ts-ignore
            window.fbq.loaded = true;
            // @ts-ignore
            window.fbq.version = '2.0';
            // @ts-ignore
            window.fbq.queue = [];

            // Track PageView
            window.fbq('init', pixelId);
            window.fbq('track', 'PageView');
        }
    }, [pixelId]);

    if (!pixelId) return null;

    return (
        <>
            <Script
                id="fb-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window, document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        fbq('init', '${pixelId}');
                        fbq('track', 'PageView');
                    `,
                }}
            />
            <noscript>
                <img 
                    height="1" 
                    width="1" 
                    style={{ display: 'none' }}
                    src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                    alt=""
                />
            </noscript>
        </>
    );
};

export default FacebookPixel;

// Utility functions for tracking specific events
export const trackFBEvent = (eventName: string, params?: Record<string, any>) => {
    if (typeof window.fbq === 'function') {
        window.fbq('track', eventName, params);
    }
};

// Common e-commerce events
export const trackViewContent = (data: { 
    content_name: string;
    content_category?: string;
    content_ids?: string[];
    value?: number;
    currency?: string;
}) => {
    trackFBEvent('ViewContent', data);
};

export const trackAddToCart = (data: {
    content_name: string;
    content_ids?: string[];
    value: number;
    currency: string;
    contents?: Array<{
        id: string;
        quantity: number;
    }>;
}) => {
    trackFBEvent('AddToCart', data);
};

export const trackInitiateCheckout = (data: {
    value: number;
    currency: string;
    content_ids?: string[];
    contents?: Array<{
        id: string;
        quantity: number;
    }>;
}) => {
    trackFBEvent('InitiateCheckout', data);
};

export const trackPurchase = (data: {
    value: number;
    currency: string;
    content_ids?: string[];
    contents?: Array<{
        id: string;
        quantity: number;
    }>;
    transaction_id?: string;
}) => {
    trackFBEvent('Purchase', data);
};
