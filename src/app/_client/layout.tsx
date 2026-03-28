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
};

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
