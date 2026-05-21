export const dynamic = 'force-dynamic';

/**
 * Canonica Widget Key API
 *
 * Generates and revokes hash-only widget keys for the authenticated Canonica
 * workspace. Raw keys are returned once and are never persisted.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { CANONICA_WIDGET_SCOPES } from '@lib/canonica/widgetConfig';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import { hashApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const RequestSchema = z.object({
    action: z.enum(['generate', 'revoke']),
});

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? canonicaFirestoreAdmin : null;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
            return NextResponse.json({ error: 'Canonica widget is not enabled.' }, { status: 403 });
        }

        const scope = resolveCanonicaSessionScope(session);
        if (!scope) {
            return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
        }

        const { tenantId, storeId } = scope;
        if (!tenantId || !storeId) {
            return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
        }
        const db = getCanonicaDb();
        if (!db) {
            return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });
        }

        const rateLimitResult = await checkRateLimit({
            key: `canonica-widget-key:${storeId}`,
            limit: 5,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const validation = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeTenantId = Number(storeSnap.data()?.tenantId || storeSnap.data()?.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== Number(tenantId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (validation.data.action === 'generate') {
            const apiKey = `cn_${randomUUID().replace(/-/g, '')}`;
            const keyPrefix = apiKey.slice(0, 7);

            await storeRef.update({
                canonicaWidgetApi: {
                    apiKeyHash: hashApiKey(apiKey),
                    keyPrefix,
                    createdAt: new Date().toISOString(),
                    productId: PRODUCT_IDS.CANONICA,
                    purpose: 'canonica_widget',
                    scopes: [...CANONICA_WIDGET_SCOPES],
                },
            });

            secureLog('[Canonica Widget] Key generated', { storeId });
            return NextResponse.json({ apiKey, keyPrefix });
        }

        const revokePayload: Record<string, any> = {
            canonicaWidgetApi: admin.firestore.FieldValue.delete(),
        };
        const publicApiPurpose = storeSnap.exists ? storeSnap.data()?.publicApi?.purpose : null;
        if (publicApiPurpose === 'canonica_widget') {
            revokePayload.publicApi = admin.firestore.FieldValue.delete();
        }

        await storeRef.update(revokePayload);

        secureLog('[Canonica Widget] Key revoked', { storeId });
        return NextResponse.json({ success: true });
    } catch (error) {
        secureError('[Canonica Widget] Failed to manage key', error as Error, {
            userId: session?.user?.id,
        });
        return NextResponse.json({ error: 'Failed to manage widget key' }, { status: 500 });
    }
});
