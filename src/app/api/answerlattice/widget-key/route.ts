export const dynamic = 'force-dynamic';

/**
 * Answerlattice Widget Key API
 *
 * Manages bounded, store-doc widget keys for the authenticated Answerlattice
 * workspace. Runtime validation remains hash-based; recoverable widget keys are
 * stored only as encrypted server-side material when the encryption secret is configured.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import {
    ANSWERLATTICE_WIDGET_KEY_LIMIT,
    buildAnswerlatticeWidgetApiStateWithNewKey,
    buildAnswerlatticeWidgetKeySummaries,
    decryptAnswerlatticeWidgetKey,
    deleteAnswerlatticeWidgetKey,
    getAnswerlatticeWidgetKeyEncryptionReadiness,
    getAnswerlatticeWidgetKeyRecordById,
    normalizeAnswerlatticeWidgetApiState,
    renameAnswerlatticeWidgetKey,
} from '@lib/answerlattice/widgetKeyManager';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { hashApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const RequestSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('generate'),
        name: z.string().trim().min(1).max(80).optional(),
    }),
    z.object({
        action: z.literal('rename'),
        keyId: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(80),
    }),
    z.object({
        action: z.literal('copy'),
        keyId: z.string().trim().min(1).max(120),
    }),
    z.object({
        action: z.literal('delete'),
        keyId: z.string().trim().min(1).max(120),
    }),
    z.object({
        action: z.literal('revoke'),
        keyId: z.string().trim().min(1).max(120).optional(),
    }),
]);

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

const toKeyResponse = (state: unknown) => {
    const normalizedState = normalizeAnswerlatticeWidgetApiState(state);
    return {
        keys: buildAnswerlatticeWidgetKeySummaries(normalizedState),
        keyPrefix: normalizedState.keyPrefix || null,
        hasWidgetKey: normalizedState.keyHashes.length > 0,
        encryptionConfigured: getAnswerlatticeWidgetKeyEncryptionReadiness().configured,
        keyLimit: ANSWERLATTICE_WIDGET_KEY_LIMIT,
    };
};

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
            return NextResponse.json({ error: 'Answerlattice widget is not enabled.' }, { status: 403 });
        }
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return permission.response;

        const scope = resolveAnswerlatticeSessionScope(session);
        if (!scope) {
            return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
        }

        const { tenantId, storeId } = scope;
        if (!tenantId || !storeId) {
            return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
        }
        const db = getAnswerlatticeDb();
        if (!db) {
            return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
        }

        const rateLimitResult = await checkRateLimit({
            key: `answerlattice-widget-key:${storeId}`,
            limit: 10,
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

        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== Number(tenantId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (validation.data.action === 'generate') {
            const apiKey = `al_${randomUUID().replace(/-/g, '')}`;
            const keyHash = hashApiKey(apiKey);
            let generated;

            try {
                generated = buildAnswerlatticeWidgetApiStateWithNewKey({
                    currentState: storeData.answerlatticeWidgetApi,
                    apiKey,
                    keyHash,
                    name: validation.data.name,
                });
            } catch (error) {
                if ((error as Error).message === 'ANSWERLATTICE_WIDGET_KEY_LIMIT_REACHED') {
                    return NextResponse.json({
                        error: 'Widget key limit reached. Delete an old key before creating another.',
                        limit: ANSWERLATTICE_WIDGET_KEY_LIMIT,
                    }, { status: 409 });
                }
                throw error;
            }

            await storeRef.set({ answerlatticeWidgetApi: generated.state }, { merge: true });

            secureLog('[Answerlattice Widget] Key generated', {
                storeId,
                keyId: generated.record.id,
                copyable: generated.copyable,
            });
            return NextResponse.json({
                apiKey,
                key: buildAnswerlatticeWidgetKeySummaries(generated.state)
                    .find((key) => key.id === generated.record.id) || null,
                copyable: generated.copyable,
                ...toKeyResponse(generated.state),
            });
        }

        if (validation.data.action === 'copy') {
            const match = getAnswerlatticeWidgetKeyRecordById(storeData.answerlatticeWidgetApi, validation.data.keyId);
            if (!match) {
                return NextResponse.json({ error: 'Widget key not found' }, { status: 404 });
            }

            const apiKey = decryptAnswerlatticeWidgetKey(match.record.encryptedKey);
            if (!apiKey) {
                return NextResponse.json({
                    error: 'This key cannot be copied. Rotate it to create a copyable key.',
                    encryptionConfigured: getAnswerlatticeWidgetKeyEncryptionReadiness().configured,
                }, { status: 409 });
            }

            secureLog('[Answerlattice Widget] Key copied', {
                storeId,
                keyId: match.record.id,
            });
            return NextResponse.json({ apiKey });
        }

        if (validation.data.action === 'rename') {
            const nextState = renameAnswerlatticeWidgetKey({
                currentState: storeData.answerlatticeWidgetApi,
                keyId: validation.data.keyId,
                name: validation.data.name,
            });
            if (!nextState) {
                return NextResponse.json({ error: 'Widget key not found' }, { status: 404 });
            }

            await storeRef.set({ answerlatticeWidgetApi: nextState }, { merge: true });

            secureLog('[Answerlattice Widget] Key renamed', {
                storeId,
                keyId: validation.data.keyId,
            });
            return NextResponse.json({ success: true, ...toKeyResponse(nextState) });
        }

        const currentState = normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi);
        const targetKeyId = validation.data.keyId || buildAnswerlatticeWidgetKeySummaries(currentState)[0]?.id;
        if (!targetKeyId) {
            return NextResponse.json({ error: 'Widget key not found' }, { status: 404 });
        }

        const nextState = deleteAnswerlatticeWidgetKey({
            currentState,
            keyId: targetKeyId,
        });
        if (!nextState) {
            return NextResponse.json({ error: 'Widget key not found' }, { status: 404 });
        }

        await storeRef.set({ answerlatticeWidgetApi: nextState }, { merge: true });

        secureLog('[Answerlattice Widget] Key revoked', {
            storeId,
            keyId: targetKeyId,
        });
        return NextResponse.json({ success: true, ...toKeyResponse(nextState) });
    } catch (error) {
        secureError('[Answerlattice Widget] Failed to manage key', error as Error, {
            userId: session?.user?.id,
        });
        return NextResponse.json({ error: 'Failed to manage widget key' }, { status: 500 });
    }
});
