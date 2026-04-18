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

import { Metadata } from 'next';

export const metadata: Metadata = {
    // Default metadata - will be overridden by page-level generateMetadata
    title: 'Digital Menu',
    description: 'View our digital menu',
    // PWA (Customer App surface) — same-origin manifest served per-tenant by
    // src/app/manifest.webmanifest/route.ts. Icons served by /api/app-icons/{id}/{size}.
    manifest: '/manifest.webmanifest',
};

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                {/* PWA — apple-touch-icon is resolved per-tenant at request time.
                    The actual store id is unknown here (shared layout), so we point
                    to the manifest's default icon which redirects to the tenant
                    store's icon once the page resolves. iOS Safari will fall back
                    to the manifest icons on install. */}
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                {/* theme-color may be overridden by page-level metadata; this is the
                    conservative default that blends with the menu chrome. */}
                <meta name="theme-color" content="#0f172a" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
