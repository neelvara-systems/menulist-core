export const dynamic = 'force-dynamic';

/**
 * Answerlattice Widget Key API
 *
 * Manages bounded, store-doc widget keys for the authenticated Answerlattice
 * workspace. Runtime validation remains hash-based; raw widget keys are only
 * returned once at creation time and are never stored for later recovery.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import {
    ANSWERLATTICE_WIDGET_KEY_LIMIT,
    buildAnswerlatticeWidgetKeySummaries,
    normalizeAnswerlatticeWidgetApiState,
} from '@lib/answerlattice/widgetKeyManager';
import {
    AnswerlatticeWidgetKeyStoreError,
    mutateAnswerlatticeWidgetKeys,
} from '@lib/answerlattice/widgetKeyStore';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { hashApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const RequestSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('generate'),
        name: z.string().trim().min(1).max(80).optional(),
    }).strict(),
    z.object({
        action: z.literal('rename'),
        keyId: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(80),
    }).strict(),
    z.object({
        action: z.literal('copy'),
        keyId: z.string().trim().min(1).max(120),
    }).strict(),
    z.object({
        action: z.literal('delete'),
        keyId: z.string().trim().min(1).max(120),
    }).strict(),
    z.object({
        action: z.literal('revoke'),
        keyId: z.string().trim().min(1).max(120).optional(),
    }).strict(),
]);
const WIDGET_KEY_ACTION_MAX_BODY_BYTES = 4 * 1024;

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
        encryptionConfigured: false,
        keyLimit: ANSWERLATTICE_WIDGET_KEY_LIMIT,
    };
};

const keyJsonResponse = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, {
    ...init,
    headers: {
        'Cache-Control': 'private, no-store',
        ...(init.headers || {}),
    },
});
const withPrivateNoStore = <T extends NextResponse>(response: T): T => {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    let tenantIdForLog: number | string | undefined;
    let storeIdForLog: number | string | undefined;
    let userIdForLog: string | undefined = session?.uId || session?.user?.id;
    let actionForLog: string | undefined;
    let keyIdForLog: string | undefined;

    try {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
            return keyJsonResponse({ error: 'Answerlattice widget is not enabled.' }, { status: 403 });
        }

        const scope = resolveAnswerlatticeSessionScope(session);
        if (!scope) {
            return keyJsonResponse({ error: 'Not onboarded' }, { status: 400 });
        }

        const { tenantId, storeId } = scope;
        tenantIdForLog = tenantId;
        storeIdForLog = storeId;
        if (!tenantId || !storeId) {
            return keyJsonResponse({ error: 'Not onboarded' }, { status: 400 });
        }

        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-key', storeId),
            limit: 10,
            window: 60,
        });
        if (
            rateLimitResult.allowed
            && FEATURE_FLAGS.ENABLE_RATE_LIMITING
            && rateLimitResult.current === 0
            && rateLimitResult.remaining === 10
        ) {
            return keyJsonResponse({ error: 'Widget key management is temporarily unavailable' }, {
                status: 503,
                headers: { 'Cache-Control': 'no-store' },
            });
        }
        if (!rateLimitResult.allowed) {
            return keyJsonResponse({ error: 'Too many requests' }, {
                status: 429,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return withPrivateNoStore(permission.response);

        const db = getAnswerlatticeDb();
        if (!db) {
            return keyJsonResponse({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
        }

        const bodyResult = await readBoundedJsonBody(request, WIDGET_KEY_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return keyJsonResponse(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid input' },
                { status: bodyResult.response.status },
            );
        }

        const validation = RequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return keyJsonResponse({ error: 'Invalid input' }, { status: 400 });
        }
        actionForLog = validation.data.action;
        keyIdForLog = 'keyId' in validation.data ? validation.data.keyId : undefined;

        if (validation.data.action === 'generate') {
            const apiKey = `al_${randomUUID().replace(/-/g, '')}`;
            const keyHash = hashApiKey(apiKey);
            const generated = await mutateAnswerlatticeWidgetKeys(
                { tenantId, storeId },
                { action: 'generate', apiKey, keyHash, name: validation.data.name },
            );

            logRuntimeDiagnostic('answerlattice_widget_key_generated', {
                ...getBoundedRuntimeStringContext('tenantId', tenantId),
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('keyId', generated.generatedRecord?.id),
                copyable: false,
            });
            return keyJsonResponse({
                apiKey,
                key: buildAnswerlatticeWidgetKeySummaries(generated.state)
                    .find((key) => key.id === generated.generatedRecord?.id) || null,
                copyable: false,
                ...toKeyResponse(generated.state),
            });
        }

        if (validation.data.action === 'copy') {
            return keyJsonResponse({
                error: 'Widget keys are only shown once when created. Create a new key if the raw value was lost.',
            }, { status: 409 });
        }

        if (validation.data.action === 'rename') {
            const renamed = await mutateAnswerlatticeWidgetKeys(
                { tenantId, storeId },
                { action: 'rename', keyId: validation.data.keyId, name: validation.data.name },
            );

            logRuntimeDiagnostic('answerlattice_widget_key_renamed', {
                ...getBoundedRuntimeStringContext('tenantId', tenantId),
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('keyId', validation.data.keyId),
            });
            return keyJsonResponse({ success: true, ...toKeyResponse(renamed.state) });
        }

        const targetKeyId = validation.data.keyId;
        const removed = await mutateAnswerlatticeWidgetKeys(
            { tenantId, storeId },
            { action: validation.data.action, keyId: targetKeyId },
        );

        logRuntimeDiagnostic('answerlattice_widget_key_revoked', {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
            ...getBoundedRuntimeStringContext('keyId', targetKeyId || 'active-key'),
        });
        return keyJsonResponse({ success: true, ...toKeyResponse(removed.state) });
    } catch (error) {
        if (error instanceof AnswerlatticeWidgetKeyStoreError) {
            return keyJsonResponse({
                error: error.code === 'key_limit'
                    ? 'Widget key limit reached. Revoke an old key before creating another.'
                    : error.message,
                ...(error.code === 'key_limit' ? { limit: ANSWERLATTICE_WIDGET_KEY_LIMIT } : {}),
            }, { status: error.status });
        }
        logRuntimeFailure('answerlattice_widget_key_manage_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
            ...getBoundedRuntimeStringContext('action', actionForLog),
            ...getBoundedRuntimeStringContext('keyId', keyIdForLog),
        });
        return keyJsonResponse({ error: 'Failed to manage widget key' }, { status: 500 });
    }
});
