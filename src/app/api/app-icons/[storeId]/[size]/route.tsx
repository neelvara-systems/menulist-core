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

import { getStoreContextName } from '@lib/businessIdentity/names';
import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    clampCustomerAppIconSize,
    CUSTOMER_APP_ICON_CACHE_CONTROL,
    CUSTOMER_APP_TRANSIENT_FALLBACK_CACHE_CONTROL,
    normalizeCustomerAppDisplayName,
    renderCustomerAppIcon,
    resolveCustomerAppIconSource,
} from '@lib/pwa/customerAppAssets';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const STORE_ID_PATTERN = /^\d{1,20}$/;

async function shouldUseFallbackAsset(request: NextRequest, storeId: string): Promise<boolean> {
    if (!STORE_ID_PATTERN.test(storeId)) return true;

    const config = getRateLimitForFeature('PUBLIC_DYNAMIC_ASSET');
    const ipHash = hashPublicRateLimitValue(getClientIp(request));
    const limit = await checkRateLimit({
        key: `public-dynamic-asset:icon:${ipHash}`,
        ...config,
        failClosedOnProviderError: true,
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
    props: { params: Promise<{ storeId: string; size: string }> }
) {
    const params = await props.params;
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
                headers: { 'Cache-Control': CUSTOMER_APP_TRANSIENT_FALLBACK_CACHE_CONTROL },
            });
        }

        const store = await getPublicStoreById(storeId);
        if (!store) {
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

        const displayName = normalizeCustomerAppDisplayName(getStoreContextName(store, 'Menu'));
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
            headers: { 'Cache-Control': CUSTOMER_APP_TRANSIENT_FALLBACK_CACHE_CONTROL },
        });
    } catch (err) {
        logRuntimeFailure('customer_app_icon_generation_failed', err, {
            size,
            ...getBoundedRuntimeStringContext('storeId', storeId),
        });
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
