'use client';

import { usePathname } from 'next/navigation';
import PublicCookieConsentBanner from '@/components/shared/publicCookieConsent/PublicCookieConsentBanner';

function getConstantLayerBasePath(pathname: string): string {
    if (pathname === '/cl' || pathname.startsWith('/cl/')) {
        return '/cl';
    }

    if (pathname === '/__constantlayer' || pathname.startsWith('/__constantlayer/')) {
        return '/__constantlayer';
    }

    if (pathname === '/sites/constantlayer' || pathname.startsWith('/sites/constantlayer/')) {
        return '/sites/constantlayer';
    }

    return '';
}

function withConstantLayerBasePath(basePath: string, href: string): string {
    if (!basePath) return href;
    if (href === '/') return basePath;
    return `${basePath}${href}`;
}

export default function ConstantLayerCookieConsentBanner() {
    const pathname = usePathname();
    const basePath = getConstantLayerBasePath(pathname || '/');

    return (
        <PublicCookieConsentBanner
            acceptLabel="Okay"
            message="We use essential storage to keep this company website working and remember basic preferences."
            panelLabel="Cookie preference"
            privacyHref={withConstantLayerBasePath(basePath, '/privacy')}
            privacyLabel="Privacy"
            product="constantlayer"
            showDecline={false}
            storageKey="constantlayer_website_cookie_ack_v1"
        />
    );
}
