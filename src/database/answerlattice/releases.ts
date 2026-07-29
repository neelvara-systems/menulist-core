/**
 * Answerlattice release registry.
 *
 * Reads remain tenant-scoped through Firebase rules. Create and activation are
 * server-owned because release ordering, drift evaluation, audit rows, and
 * compiled-context invalidation must commit as one governed lifecycle.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { AnswerlatticeStoredReleaseSchema, AnswerlatticeReleaseActionResultSchema } from '@lib/answerlattice/releaseContracts';
import { normalizeAnswerlatticeReleaseId } from '@lib/answerlattice/releaseIdBoundary';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type { AnswerlatticeRelease } from '@type/answerlattice';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_RELEASES;
const MAX_RELEASES_PER_LOAD = 100;
const RELEASE_ACTION_RESPONSE_MAX_BYTES = 256 * 1024;

export class AnswerlatticeReleaseClientError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = 'AnswerlatticeReleaseClientError';
        Object.setPrototypeOf(this, AnswerlatticeReleaseClientError.prototype);
    }
}

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);

const getDocRef = (documentId: string) => {
    const normalized = normalizeAnswerlatticeReleaseId(documentId);
    if (!normalized) throw new Error('Invalid Answerlattice release ID');
    return doc(answerlatticeFirebaseClient, COLLECTION, normalized);
};

const getActiveReleaseScope = async (expected?: { tId: number; sId: number }) => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) throw new Error('Answerlattice workspace scope is required');
    if (expected && (expected.tId !== scope.tenantId || expected.sId !== scope.storeId)) {
        throw new Error('Answerlattice workspace scope does not match the active session');
    }
    return { tId: scope.tenantId, sId: scope.storeId };
};

const normalizeReleaseRecord = (
    value: unknown,
    documentId: string,
    scope: { tId: number; sId: number },
): AnswerlatticeRelease | null => {
    const id = normalizeAnswerlatticeReleaseId(documentId);
    const parsed = AnswerlatticeStoredReleaseSchema.safeParse(value);
    if (!id || !parsed.success || parsed.data.tId !== scope.tId || parsed.data.sId !== scope.sId) return null;
    return { id, ...parsed.data } as AnswerlatticeRelease;
};

const executeReleaseAction = async (
    body: Record<string, unknown>,
    expectedScope: { tId: number; sId: number },
) => {
    const response = await fetch('/api/answerlattice/releases', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, RELEASE_ACTION_RESPONSE_MAX_BYTES)
        .catch(() => null);
    if (!response.ok) {
        const errorPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
            ? payload as Record<string, unknown>
            : null;
        const code = typeof errorPayload?.code === 'string'
            ? errorPayload.code.slice(0, 80)
            : 'release_action_failed';
        const errorMessage = typeof errorPayload?.error === 'string'
            ? errorPayload.error.slice(0, 240)
            : 'Release action failed';
        throw new AnswerlatticeReleaseClientError(code, errorMessage);
    }
    const parsed = AnswerlatticeReleaseActionResultSchema.safeParse(payload);
    if (!parsed.success) throw new Error('Release action returned an invalid response');
    if (parsed.data.scope.tId !== expectedScope.tId || parsed.data.scope.sId !== expectedScope.sId) {
        throw new Error('Release action returned the wrong workspace scope');
    }
    return parsed.data;
};

export const getReleases = async (tId: number, sId: number) => apiCallComposer(
    async () => {
        const scope = await getActiveReleaseScope({ tId, sId });
        const snapshot = await getDocs(query(
            getCollectionRef(),
            where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            orderBy('versionNormalized', 'desc'),
            limit(MAX_RELEASES_PER_LOAD),
        ));
        return snapshot.docs
            .map((document) => normalizeReleaseRecord(document.data(), document.id, scope))
            .filter((release): release is AnswerlatticeRelease => Boolean(release));
    },
    { tId, sId },
    'getReleases',
);

export const getLatestRelease = async (tId: number, sId: number) => apiCallComposer(
    async () => {
        const scope = await getActiveReleaseScope({ tId, sId });
        const snapshot = await getDocs(query(
            getCollectionRef(),
            where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            where('status', '==', 'active'),
            orderBy('versionNormalized', 'desc'),
            limit(1),
        ));
        const release = snapshot.docs[0];
        return release ? normalizeReleaseRecord(release.data(), release.id, scope) : null;
    },
    { tId, sId },
    'getLatestRelease',
);

export const getReleaseById = async (releaseId: string) => apiCallComposer(
    async () => {
        const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
        if (!normalizedReleaseId) return null;
        const scope = await getActiveReleaseScope();
        const snapshot = await getDoc(getDocRef(normalizedReleaseId));
        return snapshot.exists()
            ? normalizeReleaseRecord(snapshot.data(), snapshot.id, scope)
            : null;
    },
    { releaseId },
    'getReleaseById',
);

export const addRelease = async (
    data: Omit<AnswerlatticeRelease, 'id'>,
    expectedScope: { tId: number; sId: number },
) => apiCallComposer(
    async () => {
        const scope = await getActiveReleaseScope(expectedScope);
        if (data.tId !== scope.tId || data.sId !== scope.sId) {
            throw new Error('Release data scope does not match the initiating workspace');
        }
        const result = await executeReleaseAction({
            action: 'create',
            requestId: data.requestId || createRuntimeId('release'),
            scope,
            versionLabel: data.versionLabel,
            versionNormalized: data.versionNormalized,
            releasedAt: data.releasedAt.toDate().toISOString(),
            entityChanges: data.entityChanges,
        }, expectedScope);
        if (result.action !== 'create') throw new Error('Unexpected release action response');
        return result;
    },
    data,
    'addRelease',
);

export const activateRelease = async (
    releaseId: string,
    requestId: string | undefined,
    impactFingerprint: string,
    expectedScope: { tId: number; sId: number },
) => apiCallComposer(
    async () => {
        const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
        if (!normalizedReleaseId) throw new Error('Invalid Answerlattice release ID');
        const scope = await getActiveReleaseScope(expectedScope);
        const result = await executeReleaseAction({
            action: 'activate',
            requestId: requestId || createRuntimeId('release_activation'),
            scope,
            releaseId: normalizedReleaseId,
            impactFingerprint,
        }, expectedScope);
        if (result.action !== 'activate') throw new Error('Unexpected release action response');
        return result;
    },
    {
        releaseId,
        hasRequestId: Boolean(requestId),
        hasImpactFingerprint: Boolean(impactFingerprint),
        hasExpectedScope: Boolean(expectedScope),
    },
    'activateRelease',
);

export const previewReleaseImpact = async (
    releaseId: string,
    expectedScope: { tId: number; sId: number },
) => apiCallComposer(
    async () => {
        const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
        if (!normalizedReleaseId) throw new Error('Invalid Answerlattice release ID');
        const scope = await getActiveReleaseScope(expectedScope);
        const result = await executeReleaseAction({
            action: 'preview_impact',
            requestId: createRuntimeId('release_impact_preview'),
            scope,
            releaseId: normalizedReleaseId,
            includeAnswerTestProof: true,
        }, expectedScope);
        if (result.action !== 'preview_impact') throw new Error('Unexpected release action response');
        return result;
    },
    { releaseId, hasExpectedScope: Boolean(expectedScope) },
    'previewReleaseImpact',
);
