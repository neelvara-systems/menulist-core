export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { admin } from '@lib/firebase/firebaseAdmin';
import {
    requireAnyStorePermissionForStoreData,
    resolveStorePermissionSessionScope,
} from '@lib/permissions/server';
import { normalizePosSyncNumericDocumentId } from '@lib/posSync/posSyncDocumentId';
import {
    getNextPosSyncSecretVersion,
    getPosSyncSecretRef,
    normalizePosSyncSecretVersion,
    resolvePosSyncSecretInTransaction,
} from '@lib/posSync/serverSecretStore';
import { isPosSyncSecretScopeCurrent } from '@lib/posSync/secretScope';
import { generateWebhookSecret } from '@lib/posSync/signature';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { verifyTenantAccess, withAuth } from '../../../../middleware/auth';

const POS_SYNC_SECRET_ACTION_MAX_BODY_BYTES = 4 * 1024;
const POS_SYNC_SECRET_RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store' };
const SecretActionSchema = z.object({
    action: z.enum(['ensure', 'rotate']),
    storeId: z.number().int().positive(),
    tenantId: z.number().int().positive(),
}).strict();

function normalizeScope(storeId: unknown, tenantId: unknown) {
    const storeScope = normalizePosSyncNumericDocumentId(storeId);
    const tenantScope = normalizePosSyncNumericDocumentId(tenantId);
    return storeScope && tenantScope ? { storeScope, tenantScope } : null;
}

function getScopeFromSearchParams(request: NextRequest) {
    return normalizeScope(
        request.nextUrl.searchParams.get('storeId'),
        request.nextUrl.searchParams.get('tenantId'),
    );
}

function buildContext(storeId: unknown, tenantId: unknown, action: string) {
    return {
        action,
        ...getBoundedSecurityStringContext('storeId', storeId),
        ...getBoundedSecurityStringContext('tenantId', tenantId),
    };
}

async function readOrMutateSecret(params: {
    action: 'ensure' | 'read' | 'rotate';
    request: NextRequest;
    session: any;
    storeScope: { documentId: string; numericId: number };
    tenantScope: { documentId: string; numericId: number };
}) {
    const { action, request, session, storeScope, tenantScope } = params;
    const sessionScope = resolveStorePermissionSessionScope(session);
    if (
        !sessionScope
        || sessionScope.tenantScope.numericId !== tenantScope.numericId
        || sessionScope.storeScope.numericId !== storeScope.numericId
        || !verifyTenantAccess(session, tenantScope.numericId, storeScope.numericId, request)
    ) {
        return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    const rateLimitHash = hashPublicRateLimitValue(`${tenantScope.documentId}:${storeScope.documentId}`);
    const rlResult = await checkRateLimit({
        key: `pos-secret:${rateLimitHash}`,
        limit: action === 'rotate' ? 5 : 20,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rlResult.allowed) {
        const unavailable = rlResult.reason === 'provider_unavailable';
        return {
            response: NextResponse.json(
                { error: unavailable ? 'Service temporarily unavailable' : 'Too many requests' },
                {
                    status: unavailable ? 503 : 429,
                    headers: {
                        ...POS_SYNC_SECRET_RESPONSE_HEADERS,
                        'Retry-After': String(Math.max(Math.ceil((rlResult.resetAt - Date.now()) / 1000), 1)),
                    },
                },
            ),
        };
    }

    const db = admin.firestore();
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
    const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
    const secretRef = getPosSyncSecretRef(db, tenantScope.documentId, storeScope.documentId);
    const actorId = String(session?.uId || session?.user?.id || session?.user?.email || 'unknown');
    const actorEmail = String(session?.user?.email || '');
    const nowIso = new Date().toISOString();

    const result = await db.runTransaction(async (transaction) => {
        const [storeSnapshot, tenantSnapshot, secretSnapshot] = await Promise.all([
            transaction.get(storeRef),
            transaction.get(tenantRef),
            transaction.get(secretRef),
        ]);
        const storeData = storeSnapshot.data();
        const tenantData = tenantSnapshot.data();
        if (
            !storeSnapshot.exists
            || !tenantSnapshot.exists
            || !isPosSyncSecretScopeCurrent({
                store: storeData,
                tenant: tenantData,
                tenantDocumentId: tenantScope.documentId,
            })
        ) {
            return { permissionError: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
        }

        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            storeData,
            [PERMISSIONS.MANAGE_INTEGRATIONS],
            'POS signing secret',
            storeScope.numericId,
            tenantScope.numericId,
        );
        if (permissionError) return { permissionError };

        const current = resolvePosSyncSecretInTransaction({
            migrate: action !== 'rotate',
            transaction,
            storeRef,
            storeData: storeData || {},
            secretRef,
            secretSnapshot,
            storeId: storeScope.numericId,
            tenantId: tenantScope.numericId,
        });
        if (action === 'read' && !current) {
            return { permissionError: NextResponse.json({ error: 'Secret not configured' }, { status: 404 }) };
        }
        if (action !== 'rotate' && current) {
            return { permissionError: null, secret: current.secret, version: current.version };
        }

        const nextVersion = getNextPosSyncSecretVersion(
            current?.version ?? storeData?.posSync?.secretVersion,
        );
        if (!nextVersion) {
            return { permissionError: NextResponse.json({ error: 'Secret cannot be rotated' }, { status: 409 }) };
        }

        const secret = generateWebhookSecret();
        const now = admin.firestore.Timestamp.now();
        transaction.set(secretRef, {
            createdOn: secretSnapshot.data()?.createdOn || now,
            createdBy: secretSnapshot.data()?.createdBy || actorId,
            modifiedBy: actorId,
            modifiedOn: now,
            pId: 'ML',
            sId: storeScope.numericId,
            secret,
            tId: tenantScope.numericId,
            version: nextVersion,
        }, { merge: true });
        transaction.update(storeRef, {
            'posSync.webhookSecret': admin.firestore.FieldValue.delete(),
            'posSync.secretVersion': nextVersion,
            'posSync.status': storeData?.posSync?.enabled ? 'healthy' : 'disabled',
            'posSync.lastError': '',
            'posSync.consecutiveFailures': 0,
            ...(action === 'rotate' ? {
                'posSync.secretRotatedAt': nowIso,
                'posSync.secretRotatedByEmail': actorEmail,
                'posSync.secretRotatedByUserId': actorId,
            } : {}),
        });
        return { permissionError: null, secret, version: nextVersion };
    });

    if (result.permissionError) return { response: result.permissionError };
    return { secret: result.secret, version: result.version };
}

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
    }
    const scope = getScopeFromSearchParams(request);
    if (!scope) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const context = buildContext(scope.storeScope.numericId, scope.tenantScope.numericId, 'read');
    try {
        const result = await readOrMutateSecret({ action: 'read', request, session, ...scope });
        if (result.response) return result.response;
        return NextResponse.json(
            { secret: result.secret, version: result.version },
            { headers: POS_SYNC_SECRET_RESPONSE_HEADERS },
        );
    } catch (error) {
        logSecurityFailure('pos_sync_secret_read_failed', error, context);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
});

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
    }
    const bodyResult = await readBoundedJsonBody(request, POS_SYNC_SECRET_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const validation = SecretActionSchema.safeParse(bodyResult.data);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const scope = normalizeScope(validation.data.storeId, validation.data.tenantId);
    if (!scope) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const context = buildContext(validation.data.storeId, validation.data.tenantId, validation.data.action);
    try {
        const result = await readOrMutateSecret({ action: validation.data.action, request, session, ...scope });
        if (result.response) return result.response;
        logSecurityDiagnostic(
            validation.data.action === 'rotate' ? 'pos_sync_secret_rotated' : 'pos_sync_secret_ensured',
            { ...context, secretVersion: normalizePosSyncSecretVersion(result.version) },
        );
        return NextResponse.json(
            { secret: result.secret, version: result.version },
            { headers: POS_SYNC_SECRET_RESPONSE_HEADERS },
        );
    } catch (error) {
        logSecurityFailure('pos_sync_secret_mutation_failed', error, context);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
});
