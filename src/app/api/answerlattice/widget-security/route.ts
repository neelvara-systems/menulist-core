export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    isAnswerlatticeStoreInScope,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { isExactAnswerlatticeWidgetStoreAuthority } from '@lib/answerlattice/widgetKeyStore';
import {
    generateAnswerlatticeVerifiedContextKey,
    normalizeAnswerlatticeEvidenceHosts,
    normalizeVerifiedContextKeyRecord,
} from '@lib/answerlattice/verifiedWidgetContextServer';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const WIDGET_SECURITY_MAX_BODY_BYTES = 8 * 1024;
const WIDGET_SECURITY_ROTATION_MIN_INTERVAL_MS = 30_000;
const PRIVATE_NO_STORE_HEADERS = ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS;
const EvidenceHostsSchema = z.object({
    evidenceAllowedHosts: z.array(z.string().trim().min(1).max(300)).max(10),
}).strict();

const featureAvailable = () => (
    FEATURE_FLAGS.ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT
    || FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS
);

const isRateLimitUnavailable = (
    result: { allowed: boolean; reason?: 'limit_exceeded' | 'provider_unavailable' },
) => !result.allowed && result.reason === 'provider_unavailable';

class WidgetSecurityOwnershipError extends Error {
    constructor() {
        super('answerlattice_widget_security_store_ownership_changed');
        this.name = 'WidgetSecurityOwnershipError';
    }
}

class WidgetSecurityRotationConflictError extends Error {
    constructor() {
        super('answerlattice_widget_security_rotation_conflict');
        this.name = 'WidgetSecurityRotationConflictError';
    }
}

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(PRIVATE_NO_STORE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

const getStore = async (access: NonNullable<Awaited<ReturnType<typeof requireAnswerlatticePermission>>['access']>) => {
    const ref = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(access.scope.storeId));
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    if (!isAnswerlatticeStoreInScope(data, access.scope, snapshot.id)) return null;
    return { ref, data };
};

const buildResponse = (data: Record<string, unknown>) => {
    const record = normalizeVerifiedContextKeyRecord(data.answerlatticeVerifiedContext);
    return {
        verifiedContext: record ? {
            enabled: record.enabled,
            algorithm: record.algorithm,
            keyId: record.keyId,
            createdAt: record.createdAt,
            rotatedAt: record.rotatedAt || null,
            publicKeySpki: record.publicKeySpki,
        } : null,
        evidenceAllowedHosts: normalizeAnswerlatticeEvidenceHosts(data.answerlatticeEvidenceAllowedHosts),
        tokenContract: {
            algorithm: 'EdDSA',
            audience: 'answerlattice-widget',
            maxAgeSeconds: 600,
            allowedClaims: ['sub', 'name', 'email', 'plan', 'role', 'locale'],
        },
    };
};

const buildWidgetSecurityResponseSource = (
    verifiedContext: unknown,
    evidenceAllowedHosts: unknown,
): Record<string, unknown> => ({
    answerlatticeVerifiedContext: verifiedContext,
    answerlatticeEvidenceAllowedHosts: evidenceAllowedHosts,
});

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!featureAvailable()) return NextResponse.json({ error: 'Widget security controls are not enabled.' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    const readRateLimit = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'widget-security');
    if (readRateLimit) return withPrivateHeaders(readRateLimit);
    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return withPrivateHeaders(permission.response);
    const access = permission.access;
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });

    try {
        const store = await getStore(access);
        if (!store) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        return NextResponse.json(buildResponse(store.data), { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_security_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', access.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', access.scope.storeId),
        });
        return NextResponse.json({ error: 'Could not load widget security controls.' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
});

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT) {
        return NextResponse.json({ error: 'Verified visitor context is not enabled.' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    }
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-signing-key', userId, sessionScope.tenantId, sessionScope.storeId),
            limit: 3,
            window: 3600,
            failClosedOnProviderError: true,
        });
        if (isRateLimitUnavailable(rateLimit)) {
            return NextResponse.json({ error: 'Signing key management is temporarily unavailable.' }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
        }
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Signing keys can only be changed a few times per hour.' }, { status: 429, headers: PRIVATE_NO_STORE_HEADERS });
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return withPrivateHeaders(permission.response);
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
        const store = await getStore(access);
        if (!store) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        const generated = generateAnswerlatticeVerifiedContextKey();
        const rotationRequestedAtMs = Date.now();
        const updatedStoreData = await answerlatticeFirestoreAdmin.runTransaction(async transaction => {
            const currentSnapshot = await transaction.get(store.ref);
            const currentData = currentSnapshot.data() || {};
            if (!currentSnapshot.exists || !isExactAnswerlatticeWidgetStoreAuthority(currentData, {
                tenantId: access.scope.tenantId,
                storeId: access.scope.storeId,
            }, currentSnapshot.id)) {
                throw new WidgetSecurityOwnershipError();
            }
            const currentRecord = normalizeVerifiedContextKeyRecord(currentData.answerlatticeVerifiedContext);
            const currentRotationMs = currentRecord
                ? Date.parse(currentRecord.rotatedAt || currentRecord.createdAt)
                : 0;
            if (
                Number.isFinite(currentRotationMs)
                && currentRotationMs > 0
                && rotationRequestedAtMs - currentRotationMs < WIDGET_SECURITY_ROTATION_MIN_INTERVAL_MS
            ) {
                throw new WidgetSecurityRotationConflictError();
            }
            transaction.set(store.ref, {
                answerlatticeVerifiedContext: generated.record,
                answerlatticeVerifiedContextUpdatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return buildWidgetSecurityResponseSource(
                generated.record,
                currentData.answerlatticeEvidenceAllowedHosts,
            );
        });

        return NextResponse.json({
            ...buildResponse(updatedStoreData),
            privateKeyPkcs8: generated.privateKeyPkcs8,
            privateKeyShownOnce: true,
        }, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error) {
        if (error instanceof WidgetSecurityOwnershipError) {
            return NextResponse.json({ error: 'Workspace access changed. Refresh and try again.' }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
        }
        if (error instanceof WidgetSecurityRotationConflictError) {
            return NextResponse.json({ error: 'A signing key was just created. Refresh before rotating again.' }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
        }
        logRuntimeFailure('answerlattice_widget_signing_key_rotation_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json({ error: 'Could not create the widget signing key.' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS) {
        return NextResponse.json({ error: 'External evidence links are not enabled.' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    }
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-evidence-hosts', userId, sessionScope.tenantId, sessionScope.storeId),
            limit: 20,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (isRateLimitUnavailable(rateLimit)) {
            return NextResponse.json({ error: 'Evidence host management is temporarily unavailable.' }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
        }
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many changes. Please wait before trying again.' }, { status: 429, headers: PRIVATE_NO_STORE_HEADERS });
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return withPrivateHeaders(permission.response);
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
        const bodyResult = await readBoundedJsonBody(request, WIDGET_SECURITY_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return NextResponse.json({ error: 'Invalid evidence host settings.' }, { status: bodyResult.response.status, headers: PRIVATE_NO_STORE_HEADERS });
        const parsed = EvidenceHostsSchema.safeParse(bodyResult.data);
        if (!parsed.success) return NextResponse.json({ error: 'Invalid evidence host settings.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
        const normalized = normalizeAnswerlatticeEvidenceHosts(parsed.data.evidenceAllowedHosts);
        if (
            normalized.length !== parsed.data.evidenceAllowedHosts.length
            || normalized.some((host, index) => host !== parsed.data.evidenceAllowedHosts[index])
        ) {
            return NextResponse.json({ error: 'Use exact HTTPS hostnames without paths, ports, or credentials.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
        }
        const store = await getStore(access);
        if (!store) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        const updatedStoreData = await answerlatticeFirestoreAdmin.runTransaction(async transaction => {
            const currentSnapshot = await transaction.get(store.ref);
            const currentData = currentSnapshot.data() || {};
            if (!currentSnapshot.exists || !isExactAnswerlatticeWidgetStoreAuthority(currentData, {
                tenantId: access.scope.tenantId,
                storeId: access.scope.storeId,
            }, currentSnapshot.id)) {
                throw new WidgetSecurityOwnershipError();
            }
            transaction.set(store.ref, {
                answerlatticeEvidenceAllowedHosts: normalized,
                answerlatticeEvidenceAllowedHostsUpdatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return buildWidgetSecurityResponseSource(
                currentData.answerlatticeVerifiedContext,
                normalized,
            );
        });
        return NextResponse.json(buildResponse(updatedStoreData), {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        if (error instanceof WidgetSecurityOwnershipError) {
            return NextResponse.json({ error: 'Workspace access changed. Refresh and try again.' }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
        }
        logRuntimeFailure('answerlattice_widget_evidence_hosts_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json({ error: 'Could not save evidence host settings.' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
});

export const DELETE = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT) {
        return NextResponse.json({ error: 'Verified visitor context is not enabled.' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    }
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-signing-key', userId, sessionScope.tenantId, sessionScope.storeId),
            limit: 3,
            window: 3600,
            failClosedOnProviderError: true,
        });
        if (isRateLimitUnavailable(rateLimit)) {
            return NextResponse.json({ error: 'Signing key management is temporarily unavailable.' }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
        }
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Signing keys can only be changed a few times per hour.' }, { status: 429, headers: PRIVATE_NO_STORE_HEADERS });
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return withPrivateHeaders(permission.response);
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
        const store = await getStore(access);
        if (!store) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        const updatedStoreData = await answerlatticeFirestoreAdmin.runTransaction(async transaction => {
            const currentSnapshot = await transaction.get(store.ref);
            const currentData = currentSnapshot.data() || {};
            if (!currentSnapshot.exists || !isExactAnswerlatticeWidgetStoreAuthority(currentData, {
                tenantId: access.scope.tenantId,
                storeId: access.scope.storeId,
            }, currentSnapshot.id)) {
                throw new WidgetSecurityOwnershipError();
            }
            transaction.set(store.ref, {
                answerlatticeVerifiedContext: FieldValue.delete(),
                answerlatticeVerifiedContextUpdatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return buildWidgetSecurityResponseSource(
                null,
                currentData.answerlatticeEvidenceAllowedHosts,
            );
        });
        return NextResponse.json(buildResponse(updatedStoreData), {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        if (error instanceof WidgetSecurityOwnershipError) {
            return NextResponse.json({ error: 'Workspace access changed. Refresh and try again.' }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
        }
        logRuntimeFailure('answerlattice_widget_signing_key_disable_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json({ error: 'Could not disable verified visitor context.' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
});
