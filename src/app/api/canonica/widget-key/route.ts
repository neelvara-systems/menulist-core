export const dynamic = 'force-dynamic';

/**
 * Canonica Widget Key API
 *
 * Generates and revokes hash-only widget keys for the authenticated Canonica
 * workspace. Raw keys are returned once and are never persisted.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
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

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
        return NextResponse.json({ error: 'Canonica widget is not enabled.' }, { status: 403 });
    }

    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const rateLimitResult = await checkRateLimit({
        key: `canonica-widget-key:${storeId}`,
        limit: 5,
        window: 60,
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const validation = RequestSchema.safeParse(await request.json());
    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const storeRef = admin.firestore().collection(DB_COLLECTIONS.STORES).doc(String(storeId));

    try {
        if (validation.data.action === 'generate') {
            const apiKey = `cn_${randomUUID().replace(/-/g, '')}`;
            const keyPrefix = apiKey.slice(0, 7);

            await storeRef.update({
                publicApi: {
                    apiKeyHash: hashApiKey(apiKey),
                    keyPrefix,
                    createdAt: new Date().toISOString(),
                    productId: 'CN',
                    purpose: 'canonica_widget',
                },
            });

            secureLog('[Canonica Widget] Key generated', { storeId });
            return NextResponse.json({ apiKey, keyPrefix });
        }

        await storeRef.update({
            publicApi: admin.firestore.FieldValue.delete(),
        });

        secureLog('[Canonica Widget] Key revoked', { storeId });
        return NextResponse.json({ success: true });
    } catch (error) {
        secureError('[Canonica Widget] Failed to manage key', error as Error, { storeId });
        return NextResponse.json({ error: 'Failed to manage widget key' }, { status: 500 });
    }
});
