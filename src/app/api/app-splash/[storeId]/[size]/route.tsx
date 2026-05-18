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
import { DB_COLLECTIONS } from '@constant/database';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import {
    CUSTOMER_APP_ICON_CACHE_CONTROL,
    parseCustomerAppSplashSize,
    renderCustomerAppSplash,
    resolveCustomerAppIconSource,
} from '@lib/pwa/customerAppAssets';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: { storeId: string; size: string } },
) {
    const dimensions = parseCustomerAppSplashSize(params.size);
    if (!dimensions) {
        return new Response('Unsupported startup image size', { status: 404 });
    }

    const storeId = params.storeId;
    const { width, height } = dimensions;

    try {
        const snap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get();
        const store = snap.exists ? snap.data() : null;
        const displayName: string = getStoreContextName(store, 'Menu');
        const iconSource = resolveCustomerAppIconSource(store);
        const themeColor = store?.publicPresence?.accentColor || APP_THEME_COLOR;

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
        console.error('[app-splash] generation failed:', err);
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
