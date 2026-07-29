/**
 * Dynamic Customer App iOS Startup Image
 *
 * Route: /api/app-splash/{storeId}/{width}x{height}
 *
 * iOS PWA startup images are static PNG responses, not animated screens.
 * This endpoint creates per-store white launch images that visually bridge
 * into the customer menu while preserving uploaded-logo aspect ratios.
 */

import { APP_THEME_COLOR } from '@constant/common';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';
import { normalizePublicAccentColor } from '@lib/obp/accentColor';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    CUSTOMER_APP_ICON_CACHE_CONTROL,
    parseCustomerAppSplashSize,
    renderCustomerAppSplash,
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
        key: `public-dynamic-asset:splash:${ipHash}`,
        ...config,
    });
    return !limit.allowed;
}

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ storeId: string; size: string }> }
) {
    const params = await props.params;
    const dimensions = parseCustomerAppSplashSize(params.size);
    if (!dimensions) {
        return new Response('Unsupported startup image size', { status: 404 });
    }

    const storeId = params.storeId;
    const { width, height } = dimensions;

    try {
        if (await shouldUseFallbackAsset(request, storeId)) {
            return new ImageResponse(renderCustomerAppSplash({
                displayName: 'Menu',
                height,
                seed: storeId || 'menu',
                themeColor: APP_THEME_COLOR,
                width,
            }), {
                width,
                height,
                headers: { 'Cache-Control': CUSTOMER_APP_ICON_CACHE_CONTROL },
            });
        }

        const store = await getPublicStoreById(storeId);
        if (!store) {
            return new ImageResponse(renderCustomerAppSplash({
                displayName: 'Menu',
                height,
                seed: storeId,
                themeColor: APP_THEME_COLOR,
                width,
            }), {
                width,
                height,
                headers: { 'Cache-Control': CUSTOMER_APP_ICON_CACHE_CONTROL },
            });
        }

        const displayName: string = getStoreContextName(store, 'Menu');
        const iconSource = resolveCustomerAppIconSource(store);
        const themeColor = normalizePublicAccentColor(store?.publicPresence?.accentColor) || APP_THEME_COLOR;

        return new ImageResponse(renderCustomerAppSplash({
            displayName,
            height,
            iconVisualRatio: iconSource.source === 'override' ? 0.88 : 0.72,
            imageUrl: iconSource.imageUrl,
            seed: storeId,
            themeColor,
            width,
        }), {
            width,
            height,
            headers: { 'Cache-Control': CUSTOMER_APP_ICON_CACHE_CONTROL },
        });
    } catch (err) {
        logRuntimeFailure('customer_app_splash_generation_failed', err, {
            height,
            width,
            ...getBoundedRuntimeStringContext('storeId', storeId),
        });
        return new ImageResponse(renderCustomerAppSplash({
            displayName: 'Menu',
            height,
            seed: storeId,
            width,
        }), {
            width,
            height,
            headers: { 'Cache-Control': CUSTOMER_APP_ICON_CACHE_CONTROL },
        });
    }
}
