import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_PUBLIC_API_PURPOSE,
    buildAnswerlatticePublicApiKeySummary,
    normalizeAnswerlatticePublicApiScopes,
    type AnswerlatticePublicApiKeySummary,
    type AnswerlatticePublicApiScope,
} from '@lib/answerlattice/publicApiContracts';
import { isAnswerlatticeActiveStoreInScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export type AnswerlatticePublicApiKeyScope = {
    tenantId: number;
    storeId: number;
};

export type AnswerlatticePublicApiKeyActor = {
    id: string;
};

export class AnswerlatticePublicApiKeyStoreError extends Error {
    constructor(
        readonly code: 'firebase_unavailable' | 'invalid_request' | 'workspace_mismatch',
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'AnswerlatticePublicApiKeyStoreError';
    }
}

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        throw new AnswerlatticePublicApiKeyStoreError(
            'firebase_unavailable',
            'Answerlattice Firebase is not configured',
            503,
        );
    }
    return answerlatticeFirestoreAdmin;
};

const assertStoreScope = (
    storeData: Record<string, unknown>,
    scope: AnswerlatticePublicApiKeyScope,
    storeDocumentId: string,
) => {
    if (
        storeData.pId !== PRODUCT_IDS.ANSWERLATTICE
        || !isAnswerlatticeActiveStoreInScope(storeData, scope, storeDocumentId)
    ) {
        throw new AnswerlatticePublicApiKeyStoreError(
            'workspace_mismatch',
            'Answerlattice workspace is not available',
            409,
        );
    }
};

const normalizeActorId = (actor: AnswerlatticePublicApiKeyActor): string => {
    const actorId = String(actor.id || '').trim().slice(0, 180);
    if (!actorId) {
        throw new AnswerlatticePublicApiKeyStoreError('invalid_request', 'Invalid public API actor', 400);
    }
    return actorId;
};

const buildPublicApiKeyAudit = (
    scope: AnswerlatticePublicApiKeyScope,
    actorId: string,
    action: 'public_api_key_rotated' | 'public_api_key_revoked',
    previousState: Record<string, unknown> | null,
    newState: Record<string, unknown>,
) => ({
    pId: PRODUCT_IDS.ANSWERLATTICE,
    tId: scope.tenantId,
    sId: scope.storeId,
    action,
    entityType: 'public_api_credential',
    entityId: String(scope.storeId),
    previousState,
    newState,
    performedBy: actorId,
    timestamp: FieldValue.serverTimestamp(),
    createdOn: FieldValue.serverTimestamp(),
});

export async function readAnswerlatticePublicApiKeySummary(
    scope: AnswerlatticePublicApiKeyScope,
): Promise<AnswerlatticePublicApiKeySummary | null> {
    const db = getAnswerlatticeDb();
    const storeDocumentId = String(scope.storeId);
    const snapshot = await db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId).get();
    if (!snapshot.exists) {
        throw new AnswerlatticePublicApiKeyStoreError(
            'workspace_mismatch',
            'Answerlattice workspace is not available',
            409,
        );
    }
    const storeData = snapshot.data() || {};
    assertStoreScope(storeData, scope, storeDocumentId);
    return buildAnswerlatticePublicApiKeySummary(
        storeData.publicApi && typeof storeData.publicApi === 'object'
            ? storeData.publicApi as Record<string, unknown>
            : undefined,
    );
}

export async function rotateAnswerlatticePublicApiKey(
    scope: AnswerlatticePublicApiKeyScope,
    actor: AnswerlatticePublicApiKeyActor,
    credential: {
        apiKeyHash: string;
        keyPrefix: string;
        scopes: AnswerlatticePublicApiScope[];
        createdAt: string;
    },
): Promise<AnswerlatticePublicApiKeySummary> {
    const db = getAnswerlatticeDb();
    const actorId = normalizeActorId(actor);
    const storeDocumentId = String(scope.storeId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);
    const scopes = normalizeAnswerlatticePublicApiScopes(credential.scopes);
    const createdAt = new Date(credential.createdAt);
    if (
        scopes.length === 0
        || scopes.length !== credential.scopes.length
        || !/^[a-f0-9]{64}$/.test(credential.apiKeyHash)
        || !/^al_[A-Za-z0-9_-]{1,9}$/.test(credential.keyPrefix)
        || Number.isNaN(createdAt.getTime())
        || createdAt.toISOString() !== credential.createdAt
    ) {
        throw new AnswerlatticePublicApiKeyStoreError('invalid_request', 'Invalid public API credential', 400);
    }

    const publicApi = {
        apiKeyHash: credential.apiKeyHash,
        keyPrefix: credential.keyPrefix,
        createdAt: credential.createdAt,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        purpose: ANSWERLATTICE_PUBLIC_API_PURPOSE,
        scopes,
    };
    const nextSummary = buildAnswerlatticePublicApiKeySummary(publicApi)!;
    const auditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc();

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(storeRef);
        if (!snapshot.exists) {
            throw new AnswerlatticePublicApiKeyStoreError(
                'workspace_mismatch',
                'Answerlattice workspace is not available',
                409,
            );
        }
        const storeData = snapshot.data() || {};
        assertStoreScope(storeData, scope, storeDocumentId);
        const previousSummary = buildAnswerlatticePublicApiKeySummary(
            storeData.publicApi && typeof storeData.publicApi === 'object'
                ? storeData.publicApi as Record<string, unknown>
                : undefined,
        );
        transaction.update(storeRef, { publicApi });
        transaction.create(
            auditRef,
            buildPublicApiKeyAudit(
                scope,
                actorId,
                'public_api_key_rotated',
                previousSummary,
                nextSummary,
            ),
        );
    });

    return nextSummary;
}

export async function revokeAnswerlatticePublicApiKey(
    scope: AnswerlatticePublicApiKeyScope,
    actor: AnswerlatticePublicApiKeyActor,
): Promise<void> {
    const db = getAnswerlatticeDb();
    const actorId = normalizeActorId(actor);
    const storeDocumentId = String(scope.storeId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);
    const auditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc();

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(storeRef);
        if (!snapshot.exists) {
            throw new AnswerlatticePublicApiKeyStoreError(
                'workspace_mismatch',
                'Answerlattice workspace is not available',
                409,
            );
        }
        const storeData = snapshot.data() || {};
        assertStoreScope(storeData, scope, storeDocumentId);
        const existingCredential = storeData.publicApi && typeof storeData.publicApi === 'object'
            ? storeData.publicApi as Record<string, unknown>
            : null;
        if (!existingCredential) return;
        const previousSummary = buildAnswerlatticePublicApiKeySummary(existingCredential);
        transaction.update(storeRef, { publicApi: FieldValue.delete() });
        transaction.create(
            auditRef,
            buildPublicApiKeyAudit(
                scope,
                actorId,
                'public_api_key_revoked',
                previousSummary || { state: 'invalid_credential_removed' },
                { active: false },
            ),
        );
    });
}
