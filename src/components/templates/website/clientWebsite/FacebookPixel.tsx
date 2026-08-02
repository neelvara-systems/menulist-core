'use client'
import { StoreDataType } from '@type/platform/store';
import Script from 'next/script';

declare global {
    interface Window {
        fbq: FacebookPixelFunction;
    }
}

type FacebookPixelFunction = {
    (...args: unknown[]): void;
    callMethod?: (...args: unknown[]) => void;
    push: FacebookPixelFunction;
    loaded: boolean;
    version: string;
    queue: unknown[][];
};

interface FacebookPixelProps {
    storeDetails?: StoreDataType;
}

const META_PIXEL_ID_PATTERN = /^\d{5,32}$/;

const getSafeMetaPixelId = (value?: string | null): string | null => {
    const normalized = String(value || '').trim();
    return META_PIXEL_ID_PATTERN.test(normalized) ? normalized : null;
};

const FacebookPixel = ({ storeDetails }: FacebookPixelProps) => {
    const pixelId = getSafeMetaPixelId(storeDetails?.analytics?.facebookPixelId);

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
