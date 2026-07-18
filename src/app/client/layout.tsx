/**
 * Client Menu Layout
 * 
 * This layout is used for client digital menus accessed via:
 * - Subdomains: joespizza.menulist.ai
 * - Custom domains: joespizza.com
 * 
 * It provides a minimal wrapper without the platform navigation.
 * 
 * CDN Cache Strategy (URL Routing Architecture — Phase 2):
 * - s-maxage=60: CDN caches for 60 seconds
 * - stale-while-revalidate=300: Serve stale up to 5 min while revalidating
 * - Combined with unstable_cache (60s) + revalidateTag() for instant invalidation
 */

import { Metadata, Viewport } from 'next';
import { getStaticCustomerAppleStartupImages } from '@lib/pwa/customerAppAssets';
import { APP_THEME_COLOR } from 'src/constants/common';

const fallbackStartupImages = getStaticCustomerAppleStartupImages();

export const metadata: Metadata = {
    // Default metadata - will be overridden by page-level generateMetadata
    title: 'Digital Menu',
    description: 'View our digital menu',
    // PWA (Customer App surface) — same-origin manifest served per-tenant by
    // src/app/manifest.webmanifest/route.ts. Icons served by /api/app-icons/{id}/{size}.
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        startupImage: fallbackStartupImages,
        statusBarStyle: 'default',
        title: 'Menu',
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        apple: '/apple-touch-icon.png',
    },
    other: {
        'color-scheme': 'light',
        'mobile-web-app-capable': 'yes',
    },
};

export const viewport: Viewport = {
    themeColor: APP_THEME_COLOR,
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        html,
                        body {
                            background: #ffffff !important;
                            color-scheme: light;
                        }
                    `,
                }}
            />
            {children}
        </>
    );
}
