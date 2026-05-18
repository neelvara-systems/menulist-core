export const dynamic = 'force-dynamic';

/**
 * MenuList-as-Client Canonica Widget Test Key
 *
 * Temporary integration-test adapter: MenuList acts like an external SaaS
 * client and loads the real Canonica widget with a cn_* API key. The raw key is
 * derived per store and returned to the authenticated owner app, but is never
 * persisted in Firestore.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { admin } from '@lib/firebase/firebaseAdmin';
import { hashApiKey, normalizeRequestOrigin } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const buildMenuListWidgetTestKey = (tenantId: string | number, storeId: string | number) => {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is required for MenuList Canonica widget test key derivation.');
    }

    const digest = createHmac('sha256', secret)
        .update(`menulist-canonica-widget-test:${tenantId}:${storeId}`)
        .digest('hex');

    return `cn_${digest}`;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_CANONICA_WIDGET_TEST_HOST) {
        return NextResponse.json({ error: 'MenuList Canonica widget test host is disabled.' }, { status: 404 });
    }

    try {
        const sourceProductId = (session as any).pId || (session.user as any)?.pId || PRODUCT_IDS.MENULIST;
        if (sourceProductId !== PRODUCT_IDS.MENULIST) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const tenantId = (session as any).tId || session.user?.tenantId;
        const storeId = (session as any).sId || session.user?.storeId;
        if (!tenantId || !storeId) {
            return NextResponse.json({ error: 'Missing tenant/store data' }, { status: 400 });
        }

        const rateLimitResult = await checkRateLimit({
            key: `menulist-canonica-widget-test:${session.user?.id || 'unknown'}:${storeId}`,
            limit: 10,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const apiKey = buildMenuListWidgetTestKey(tenantId, storeId);
        const apiKeyHash = hashApiKey(apiKey);
        const keyPrefix = apiKey.slice(0, 7);
        const requestOrigin = normalizeRequestOrigin(request.headers.get('origin')) || request.nextUrl.origin;

        const storeRef = admin.firestore().collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const currentHash = storeData.canonicaWidgetTestApi?.apiKeyHash;
        const updatePayload: Record<string, any> = {};

        if (currentHash !== apiKeyHash) {
            updatePayload.canonicaWidgetTestApi = {
                apiKeyHash,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                keyPrefix,
                productId: PRODUCT_IDS.CANONICA,
                purpose: 'canonica_widget_test_host',
                sourceProductId: PRODUCT_IDS.MENULIST,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
        }

        const allowedOrigins = Array.isArray(storeData.widgetAllowedOrigins)
            ? storeData.widgetAllowedOrigins
            : [];

        if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
            updatePayload.widgetAllowedOrigins = admin.firestore.FieldValue.arrayUnion(requestOrigin);
        }

        if (Object.keys(updatePayload).length > 0) {
            await storeRef.set(updatePayload, { merge: true });
        }

        secureLog('[Canonica Widget Test Host] MenuList widget key resolved', {
            keyPrefix,
            storeId,
            tenantId,
        });

        return NextResponse.json({
            apiKey,
            keyPrefix,
            widgetScriptSrc: '/widget/canonica-widget.js',
        });
    } catch (error) {
        secureError('[Canonica Widget Test Host] Failed to resolve widget test key', error as Error, {
            storeId: (session as any).sId || session.user?.storeId,
        });
        return NextResponse.json({ error: 'Failed to resolve Canonica widget key' }, { status: 500 });
    }
});
