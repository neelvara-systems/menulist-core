/**
 * Dynamic PWA Icon Endpoint
 *
 * Route: /api/app-icons/{storeId}/{size}
 *
 * Strategy:
 *   1. If the store has a `publicPresence.pwaIconOverrideUrl` or image logo,
 *      render it into a square, padded PNG so app icons never look squeezed.
 *   2. Otherwise, generate a deterministic letter-based PNG via Next.js
 *      ImageResponse — no Sharp, no native deps.
 *
 * Supported sizes: common iOS + Android PWA icon sizes. Unsupported sizes clamp to 512.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import {
    clampCustomerAppIconSize,
    CUSTOMER_APP_ICON_CACHE_CONTROL,
    renderCustomerAppIcon,
    resolveCustomerAppIconImageUrl,
} from '@lib/pwa/customerAppAssets';
import { doc, getDoc } from 'firebase/firestore';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs'; // Firestore client needs node runtime
export const dynamic = 'force-dynamic';

// Caching rationale (KEPT — do not remove):
//   - Icons rarely change (logo update / owner override). When they do, busting
//     happens naturally via a new tenant-origin URL per deploy (Vercel cache).
//   - Without a CDN cache every install flow would re-invoke this route per icon
//     size per device — measurable cost hit at scale.
//   - max-age=3600: browser re-checks after 1h.
//   - s-maxage=86400: Vercel edge caches 1 day.
//   - stale-while-revalidate=604800: serve stale for 1wk while refetching.
export async function GET(
    _request: Request,
    { params }: { params: { storeId: string; size: string } },
) {
    const size = clampCustomerAppIconSize(params.size);
    const storeId = params.storeId;

    try {
        const ref = doc(firebaseClient, DB_COLLECTIONS.STORES, storeId);
        const snap = await getDoc(ref);
        const store = snap.exists() ? snap.data() : null;

        const displayName: string = getStoreContextName(store, 'Menu');
        const imageUrl = resolveCustomerAppIconImageUrl(store);

        return new ImageResponse(renderCustomerAppIcon({
            displayName,
            imageUrl,
            seed: storeId,
            size,
            visualRatio: size >= 512 ? 0.72 : 0.74,
        }), {
            width: size,
            height: size,
            headers: { 'Cache-Control': CUSTOMER_APP_ICON_CACHE_CONTROL },
        });
    } catch (err) {
        console.error('[app-icons] generation failed:', err);
        // Always return an icon — never 500 for install flows.
        return new ImageResponse(renderCustomerAppIcon({
            displayName: 'Menu',
            seed: storeId,
            size,
        }), {
            width: size,
            height: size,
            headers: { 'Cache-Control': CUSTOMER_APP_ICON_CACHE_CONTROL },
        });
    }
}
