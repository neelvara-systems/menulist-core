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
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import {
    clampCustomerAppIconSize,
    CUSTOMER_APP_ICON_CACHE_CONTROL,
    renderCustomerAppIcon,
    resolveCustomerAppIconSource,
} from '@lib/pwa/customerAppAssets';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getClientIp } from 'src/middleware/publicApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const STORE_ID_PATTERN = /^\d{1,20}$/;

async function shouldUseFallbackAsset(request: NextRequest, storeId: string): Promise<boolean> {
    if (!STORE_ID_PATTERN.test(storeId)) return true;

    const config = getRateLimitForFeature('PUBLIC_DYNAMIC_ASSET');
    const limit = await checkRateLimit({
        key: `public-dynamic-asset:icon:${getClientIp(request)}`,
        ...config,
    });
    return !limit.allowed;
}

// Caching rationale (KEPT — do not remove):
//   - Icons rarely change (logo update / owner override). When they do, busting
//     happens naturally via a new tenant-origin URL per deploy (Vercel cache).
//   - Without a CDN cache every install flow would re-invoke this route per icon
//     size per device — measurable cost hit at scale.
//   - max-age=3600: browser re-checks after 1h.
//   - s-maxage=86400: Vercel edge caches 1 day.
//   - stale-while-revalidate=604800: serve stale for 1wk while refetching.
export async function GET(
    request: NextRequest,
    { params }: { params: { storeId: string; size: string } },
) {
    const size = clampCustomerAppIconSize(params.size);
    const storeId = params.storeId;

    try {
        if (await shouldUseFallbackAsset(request, storeId)) {
            return new ImageResponse(renderCustomerAppIcon({
                displayName: 'Menu',
                seed: storeId || 'menu',
                size,
            }), {
                width: size,
                height: size,
                headers: { 'Cache-Control': CUSTOMER_APP_ICON_CACHE_CONTROL },
            });
        }

        const snap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get();
        const store = snap.exists ? snap.data() : null;

        const displayName: string = getStoreContextName(store, 'Menu');
        const iconSource = resolveCustomerAppIconSource(store);
        const visualRatio = iconSource.source === 'override'
            ? size >= 512 ? 0.9 : 0.92
            : size >= 512 ? 0.72 : 0.74;

        return new ImageResponse(renderCustomerAppIcon({
            displayName,
            imageUrl: iconSource.imageUrl,
            seed: storeId,
            size,
            visualRatio,
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
