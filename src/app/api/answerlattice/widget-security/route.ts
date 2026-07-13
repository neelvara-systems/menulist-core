export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    normalizeAnswerlatticeScopeDocumentId,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
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
const PRIVATE_NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };
const EvidenceHostsSchema = z.object({
    evidenceAllowedHosts: z.array(z.string().trim().min(1).max(300)).max(10),
}).strict();

const featureAvailable = () => (
    FEATURE_FLAGS.ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT
    || FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS
);

const getStore = async (access: NonNullable<Awaited<ReturnType<typeof requireAnswerlatticePermission>>['access']>) => {
    const ref = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(access.scope.storeId));
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    if (normalizeAnswerlatticeScopeDocumentId(data.tId ?? data.tenantId) !== access.scope.tenantId) return null;
    return { ref, data };
};

const buildResponse = (data: Record<string, any>) => {
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

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!featureAvailable()) return NextResponse.json({ error: 'Widget security controls are not enabled.' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    const readRateLimit = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'widget-security');
    if (readRateLimit) return readRateLimit;
    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;
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
    const userId = session.uId || session.user?.id || 'unknown';

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-signing-key', userId, sessionScope.tenantId, sessionScope.storeId),
            limit: 3,
            window: 3600,
        });
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Signing keys can only be changed a few times per hour.' }, { status: 429, headers: PRIVATE_NO_STORE_HEADERS });
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return permission.response;
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
        const store = await getStore(access);
        if (!store) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        const generated = generateAnswerlatticeVerifiedContextKey();
        await store.ref.set({
            answerlatticeVerifiedContext: generated.record,
            answerlatticeVerifiedContextUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({
            ...buildResponse({ ...store.data, answerlatticeVerifiedContext: generated.record }),
            privateKeyPkcs8: generated.privateKeyPkcs8,
            privateKeyShownOnce: true,
        }, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error) {
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
    const userId = session.uId || session.user?.id || 'unknown';

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-evidence-hosts', userId, sessionScope.tenantId, sessionScope.storeId),
            limit: 20,
            window: 60,
        });
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many changes. Please wait before trying again.' }, { status: 429, headers: PRIVATE_NO_STORE_HEADERS });
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return permission.response;
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
        const bodyResult = await readBoundedJsonBody(request, WIDGET_SECURITY_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return NextResponse.json({ error: 'Invalid evidence host settings.' }, { status: bodyResult.response.status, headers: PRIVATE_NO_STORE_HEADERS });
        const parsed = EvidenceHostsSchema.safeParse(bodyResult.data);
        if (!parsed.success) return NextResponse.json({ error: 'Invalid evidence host settings.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
        const normalized = normalizeAnswerlatticeEvidenceHosts(parsed.data.evidenceAllowedHosts);
        if (normalized.length !== parsed.data.evidenceAllowedHosts.length) {
            return NextResponse.json({ error: 'Use exact HTTPS hostnames without paths, ports, or credentials.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
        }
        const store = await getStore(access);
        if (!store) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        await store.ref.set({
            answerlatticeEvidenceAllowedHosts: normalized,
            answerlatticeEvidenceAllowedHostsUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return NextResponse.json(buildResponse({ ...store.data, answerlatticeEvidenceAllowedHosts: normalized }), {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
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
    const userId = session.uId || session.user?.id || 'unknown';

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-signing-key', userId, sessionScope.tenantId, sessionScope.storeId),
            limit: 3,
            window: 3600,
        });
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Signing keys can only be changed a few times per hour.' }, { status: 429, headers: PRIVATE_NO_STORE_HEADERS });
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return permission.response;
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
        const store = await getStore(access);
        if (!store) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        await store.ref.set({
            answerlatticeVerifiedContext: FieldValue.delete(),
            answerlatticeVerifiedContextUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return NextResponse.json(buildResponse({ ...store.data, answerlatticeVerifiedContext: null }), {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_signing_key_disable_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json({ error: 'Could not disable verified visitor context.' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
});
