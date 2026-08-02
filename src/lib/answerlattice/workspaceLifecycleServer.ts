import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { eraseAnswerlatticeStaffProductAccountBridge } from '@lib/answerlattice/staffAccessBridge';
import { getAnswerlatticeStaffMembership, readAnswerlatticeStaffAccessState, } from '@lib/answerlattice/staffAccessContracts';
import { repairAnswerlatticeStaffAccessProjections } from '@lib/answerlattice/staffAccessServer';
import { ANSWERLATTICE_STAFF_QUERY_LIMIT, removeAnswerlatticeWorkspaceMembershipForErasureTransaction, } from '@lib/answerlattice/staffAccessTransactions';
import { appendAnswerlatticeTenantSummaryAdmin, getAnswerlatticeTenantSummaryShardId, removeAnswerlatticeTenantSummaryEntryAdmin, } from '@lib/answerlattice/tenantSummaryAdmin';
import { ANSWERLATTICE_WORKSPACE_ERASURE_BATCH_LIMIT, ANSWERLATTICE_WORKSPACE_ERASURE_COLLECTIONS, ANSWERLATTICE_WORKSPACE_ERASURE_QUERY_LIMIT, type AnswerlatticeWorkspaceLifecycleRequest, type AnswerlatticeWorkspaceLifecycleState, type AnswerlatticeWorkspaceScope, canRecoverAnswerlatticeWorkspace, canStartAnswerlatticeWorkspaceErasure, classifyAnswerlatticeWorkspaceRecord, getAnswerlatticeWorkspaceCloseConfirmation, getAnswerlatticeWorkspaceEraseAfterMillis, getAnswerlatticeWorkspaceEraseConfirmation, getAnswerlatticeWorkspaceRecoverConfirmation, hasExactAnswerlatticeProductIdentity, isExactAnswerlatticeWorkspaceConfirmation, } from '@lib/answerlattice/workspaceLifecycleContracts';
import { ANSWERLATTICE_CONTEXT_PRIVATE_ROOT, ANSWERLATTICE_CONTEXT_PUBLIC_ROOT, getAnswerlatticeBundleManifestDocId, isAnswerlatticeContextBundleManifestForScope, } from '@lib/answerlattice/compiledContext';
import { isAnswerlatticeStoreInScope, normalizeAnswerlatticeScopeDocumentId, } from '@lib/answerlattice/sessionScope';
import { getExpectedAnswerlatticePublicBundleId, isExpectedAnswerlatticePublicBundleId, } from '@lib/answerlattice/publicBundleIdentityServer';
import { answerlatticeAuthAdmin, answerlatticeFirestoreAdmin, answerlatticeStorageAdmin, requireAnswerlatticeAuthAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { shouldUseSharedAnswerlatticeFirebase } from '@lib/firebase/answerlatticeConfig';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getDirectActiveProductSubscriptionForStore } from '@lib/billing/productBillingServer';
import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const WORKSPACE_LIFECYCLE_SCHEMA_VERSION = 1;
const WORKSPACE_LIFECYCLE_EMPTY_PHASE_LIMIT = 8;
const WORKSPACE_LIFECYCLE_HOSTED_SITE_LIMIT = 100;
const WORKSPACE_LIFECYCLE_COMPILED_OBJECT_BATCH_LIMIT = 50;

const STORAGE_PREFIXES = [
    (scope: AnswerlatticeWorkspaceScope) => `chatSessions/chatimages/${scope.tId}/${scope.sId}/`,
    (scope: AnswerlatticeWorkspaceScope) => `supportTickets/documents/${scope.tId}/${scope.sId}/`,
    (scope: AnswerlatticeWorkspaceScope) => `supportTickets/messages/${scope.tId}/${scope.sId}/`,
    (scope: AnswerlatticeWorkspaceScope) => `changelog/files/${scope.tId}/${scope.sId}/`,
    (scope: AnswerlatticeWorkspaceScope) => `ingestion_source_files/${scope.tId}/${scope.sId}/`,
    (scope: AnswerlatticeWorkspaceScope) => `${ANSWERLATTICE_CONTEXT_PRIVATE_ROOT}/${scope.tId}/${scope.sId}/`,
] as const;

type LifecycleProgress = {
    collectionIndex: number;
    deletedDocuments: number;
    deletedObjects: number;
    nestedIndex: number;
    phase: 'collections' | 'nested' | 'staff' | 'storage' | 'finalize';
    storageIndex: number;
};

type WorkspaceLifecycleRecord = {
    closedAt?: unknown;
    eraseAfter?: unknown;
    erasure?: LifecycleProgress;
    legalHold?: boolean;
    revokedPublicBundleId?: string | null;
    state: AnswerlatticeWorkspaceLifecycleState;
    [key: string]: unknown;
};

export type AnswerlatticeWorkspaceLifecycleResult = {
    action: AnswerlatticeWorkspaceLifecycleRequest['action'];
    complete: boolean;
    progress?: LifecycleProgress;
    recoveryAvailableUntil?: string | null;
    state: AnswerlatticeWorkspaceLifecycleState;
};

export class AnswerlatticeWorkspaceLifecycleError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(code: string, status = 409) {
        super(code);
        this.code = code;
        this.status = status;
        this.name = 'AnswerlatticeWorkspaceLifecycleError';
        Object.setPrototypeOf(this, AnswerlatticeWorkspaceLifecycleError.prototype);
    }
}

const getDb = (): FirebaseFirestore.Firestore => {
    const db = answerlatticeFirestoreAdmin;
    if (!db) {
        throw new AnswerlatticeWorkspaceLifecycleError('ANSWERLATTICE_FIREBASE_NOT_CONFIGURED', 503);
    }
    return db;
};

const getRecord = (value: unknown): Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
);

const timestampMillis = (value: unknown): number => {
    if (value instanceof Date) return value.getTime();
    if (typeof (value as { toMillis?: unknown })?.toMillis === 'function') {
        try {
            return (value as { toMillis: () => number }).toMillis();
        } catch {
            return 0;
        }
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const lifecycleFromStore = (store: Record<string, unknown>): WorkspaceLifecycleRecord => {
    const lifecycle = getRecord(store.answerlatticeWorkspaceLifecycle);
    const state = String(lifecycle.state || '') as AnswerlatticeWorkspaceLifecycleState;
    if (['active', 'closing', 'closed', 'erasing', 'erased'].includes(state)) {
        return { ...lifecycle, state };
    }
    if (store.active !== false && store.deleted !== true && store.authDisabled !== true) {
        return { state: 'active' };
    }
    throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_LIFECYCLE_STATE_INVALID');
};

const assertScopedStore = (
    snapshot: FirebaseFirestore.DocumentSnapshot,
    scope: AnswerlatticeWorkspaceScope,
): Record<string, unknown> => {
    const data = snapshot.data() || {};
    if (
        !snapshot.exists
        || !isAnswerlatticeStoreInScope(
            data,
            { tenantId: scope.tId, storeId: scope.sId },
            snapshot.id,
        )
    ) {
        throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_NOT_FOUND', 404);
    }
    return data;
};

const requireConfirmation = (value: unknown, expected: string) => {
    if (!isExactAnswerlatticeWorkspaceConfirmation(value, expected)) {
        throw new AnswerlatticeWorkspaceLifecycleError('CONFIRMATION_MISMATCH', 400);
    }
};

const auditDocument = (params: {
    action: string;
    actorId: string;
    reason?: string;
    scope: AnswerlatticeWorkspaceScope;
}) => ({
    action: params.action,
    createdOn: FieldValue.serverTimestamp(),
    entityId: String(params.scope.sId),
    entityType: 'answerlattice_workspace',
    pId: PRODUCT_IDS.ANSWERLATTICE,
    performedBy: params.actorId.slice(0, 180),
    reason: params.reason?.slice(0, 500) || null,
    sId: params.scope.sId,
    tId: params.scope.tId,
});

const getPublicBundleId = async (
    db: FirebaseFirestore.Firestore,
    scope: AnswerlatticeWorkspaceScope,
): Promise<string | null> => {
    const expectedPublicBundleId = getExpectedAnswerlatticePublicBundleId(scope.tId, scope.sId);
    if (!expectedPublicBundleId) {
        throw new AnswerlatticeWorkspaceLifecycleError('CONTEXT_BUNDLE_MANIFEST_REVIEW_REQUIRED');
    }
    const snapshot = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId))
        .get();
    const data = snapshot.data();
    if (!snapshot.exists) return expectedPublicBundleId;
    if (!isAnswerlatticeContextBundleManifestForScope(data, scope.tId, scope.sId)) {
        throw new AnswerlatticeWorkspaceLifecycleError('CONTEXT_BUNDLE_MANIFEST_REVIEW_REQUIRED');
    }
    const publicBundleId = typeof data.publicBundleId === 'string' ? data.publicBundleId : '';
    if (!publicBundleId) return expectedPublicBundleId;
    if (!isExpectedAnswerlatticePublicBundleId(publicBundleId, scope.tId, scope.sId)) {
        throw new AnswerlatticeWorkspaceLifecycleError('CONTEXT_BUNDLE_MANIFEST_REVIEW_REQUIRED');
    }
    return publicBundleId;
};

const removeHostedHelpRegistry = async (
    db: FirebaseFirestore.Firestore,
    scope: AnswerlatticeWorkspaceScope,
) => {
    const snapshots = await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES)
            .where('sId', 'in', [scope.sId, String(scope.sId)])
            .limit(WORKSPACE_LIFECYCLE_HOSTED_SITE_LIMIT + 1)
            .get(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES)
            .where('storeId', 'in', [scope.sId, String(scope.sId)])
            .limit(WORKSPACE_LIFECYCLE_HOSTED_SITE_LIMIT + 1)
            .get(),
    ]);
    const documents = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    snapshots.forEach(snapshot => snapshot.docs.forEach(document => documents.set(document.ref.path, document)));
    if (documents.size > WORKSPACE_LIFECYCLE_HOSTED_SITE_LIMIT) {
        throw new AnswerlatticeWorkspaceLifecycleError('HOSTED_HELP_REGISTRY_LIMIT_EXCEEDED');
    }
    const classifiedDocuments = Array.from(documents.values()).map((document) => ({
        classification: classifyAnswerlatticeWorkspaceRecord(document.data(), scope, 'dedicated'),
        document,
    }));
    if (classifiedDocuments.some(item => item.classification !== 'exact')) {
        throw new AnswerlatticeWorkspaceLifecycleError('HOSTED_HELP_REGISTRY_SCOPE_REVIEW_REQUIRED');
    }
    const exactDocuments = classifiedDocuments.map(item => item.document);
    if (exactDocuments.length === 0) return;
    const batch = db.batch();
    exactDocuments.forEach(document => batch.delete(document.ref));
    await batch.commit();
};

const removeCompiledBundles = async (
    scope: AnswerlatticeWorkspaceScope,
    publicBundleId: string | null,
) => {
    const storage = answerlatticeStorageAdmin as typeof answerlatticeStorageAdmin | null;
    if (!storage || typeof storage.bucket !== 'function') {
        if (publicBundleId) {
            throw new AnswerlatticeWorkspaceLifecycleError('ANSWERLATTICE_STORAGE_NOT_CONFIGURED', 503);
        }
        return;
    }
    const bucket = storage.bucket();
    const prefixes = [
        `${ANSWERLATTICE_CONTEXT_PRIVATE_ROOT}/${scope.tId}/${scope.sId}/`,
        ...(publicBundleId ? [`${ANSWERLATTICE_CONTEXT_PUBLIC_ROOT}/${publicBundleId}/`] : []),
    ];
    const results = await Promise.all(prefixes.map(async (prefix) => {
        const [files] = await bucket.getFiles({
            autoPaginate: false,
            maxResults: WORKSPACE_LIFECYCLE_COMPILED_OBJECT_BATCH_LIMIT + 1,
            prefix,
        });
        const targets = files.slice(0, WORKSPACE_LIFECYCLE_COMPILED_OBJECT_BATCH_LIMIT);
        await Promise.all(targets.map(file => file.delete({ ignoreNotFound: true })));
        return files.length > targets.length;
    }));
    if (results.some(Boolean)) {
        throw new AnswerlatticeWorkspaceLifecycleError('COMPILED_BUNDLE_CLEANUP_INCOMPLETE');
    }
};

type WorkspaceStaffDiscoveryResult = {
    documents: FirebaseFirestore.QueryDocumentSnapshot[];
    reviewRequired:
        | 'AMBIGUOUS_STAFF_MEMBERSHIP_REVIEW_REQUIRED'
        | 'WORKSPACE_STAFF_LIMIT_EXCEEDED'
        | null;
};

const discoverWorkspaceStaffDocuments = async (
    db: FirebaseFirestore.Firestore,
    scope: AnswerlatticeWorkspaceScope,
): Promise<WorkspaceStaffDiscoveryResult> => {
    const users = db.collection(DB_COLLECTIONS.USERS);
    const [canonicalSnapshot, legacySnapshot] = await Promise.all([
        users.where('tenantId', '==', scope.tId)
            .limit(ANSWERLATTICE_STAFF_QUERY_LIMIT + 1)
            .get(),
        users.where('tId', '==', scope.tId)
            .limit(ANSWERLATTICE_STAFF_QUERY_LIMIT + 1)
            .get(),
    ]);
    const tenantUsers = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    canonicalSnapshot.docs.forEach(document => tenantUsers.set(document.ref.path, document));
    legacySnapshot.docs.forEach(document => tenantUsers.set(document.ref.path, document));
    if (
        canonicalSnapshot.size > ANSWERLATTICE_STAFF_QUERY_LIMIT
        || legacySnapshot.size > ANSWERLATTICE_STAFF_QUERY_LIMIT
        || tenantUsers.size > ANSWERLATTICE_STAFF_QUERY_LIMIT
    ) {
        return {
            documents: [],
            reviewRequired: 'WORKSPACE_STAFF_LIMIT_EXCEEDED',
        };
    }

    const documents: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let ambiguousMembership = false;
    Array.from(tenantUsers.values()).forEach((document) => {
        const data = document.data() || {};
        const state = readAnswerlatticeStaffAccessState(data);
        if (
            state?.tenantId === scope.tId
            && getAnswerlatticeStaffMembership(state, scope.sId)
        ) {
            documents.push(document);
            return;
        }

        const rawStoreReferences = [
            data.sId,
            data.storeId,
            ...(Array.isArray(data.storeIds) ? data.storeIds : []),
            ...(Array.isArray(data.stores)
                ? data.stores.flatMap((membership: unknown) => {
                    const value = getRecord(membership);
                    return [value.sId, value.storeId];
                })
                : []),
        ];
        const suppliedProductIds = [data.pId, data.productId]
            .filter((value: unknown) => value !== undefined);
        const explicitlyForeignProduct = suppliedProductIds.length > 0
            && suppliedProductIds.every(
                (value: unknown) => value !== PRODUCT_IDS.ANSWERLATTICE,
            );
        if (
            !explicitlyForeignProduct
            && rawStoreReferences.some(
                value => normalizeAnswerlatticeScopeDocumentId(value) === scope.sId,
            )
        ) {
            ambiguousMembership = true;
        }
    });

    documents.sort((left, right) => left.id.localeCompare(right.id));
    return {
        documents,
        reviewRequired: ambiguousMembership
            ? 'AMBIGUOUS_STAFF_MEMBERSHIP_REVIEW_REQUIRED'
            : null,
    };
};

const syncWorkspaceStaffClaims = async (
    db: FirebaseFirestore.Firestore,
    scope: AnswerlatticeWorkspaceScope,
): Promise<boolean> => {
    const discovery = await discoverWorkspaceStaffDocuments(db, scope);
    if (discovery.reviewRequired) return false;
    const results = await Promise.all(discovery.documents.map(document => repairAnswerlatticeStaffAccessProjections({
        data: document.data(),
        fallbackStoreId: scope.sId,
        forceClaimsRevoke: true,
        operation: 'workspace_lifecycle_access_refresh',
        syncBridge: false,
        syncClaims: true,
        userId: document.id,
    })));
    return results.every(Boolean);
};

const closeWorkspace = async (params: {
    actorId: string;
    request: Extract<AnswerlatticeWorkspaceLifecycleRequest, { action: 'close' }>;
}): Promise<AnswerlatticeWorkspaceLifecycleResult> => {
    const db = getDb();
    const scope = { tId: params.request.tId, sId: params.request.sId };
    requireConfirmation(params.request.confirmation, getAnswerlatticeWorkspaceCloseConfirmation(scope));
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));
    const storeSnapshot = await storeRef.get();
    const store = assertScopedStore(storeSnapshot, scope);
    const lifecycle = lifecycleFromStore(store);
    if (lifecycle.state === 'erasing' || lifecycle.state === 'erased') {
        throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_CANNOT_BE_CLOSED');
    }
    const now = Timestamp.now();
    const preservesExistingClosureWindow = lifecycle.state === 'closing' || lifecycle.state === 'closed';
    const existingEraseAfterMillis = preservesExistingClosureWindow
        ? timestampMillis(lifecycle.eraseAfter)
        : 0;
    const eraseAfter = Timestamp.fromMillis(
        existingEraseAfterMillis > 0
            ? existingEraseAfterMillis
            : getAnswerlatticeWorkspaceEraseAfterMillis(now.toMillis()),
    );
    await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(storeRef);
        const currentStore = assertScopedStore(currentSnapshot, scope);
        const currentLifecycle = lifecycleFromStore(currentStore);
        if (currentLifecycle.state === 'erasing' || currentLifecycle.state === 'erased') {
            throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_CANNOT_BE_CLOSED');
        }
        transaction.set(storeRef, {
            active: false,
            answerlatticeWidgetApi: FieldValue.delete(),
            answerlatticeWorkspaceLifecycle: {
                ...currentLifecycle,
                closedAt: currentLifecycle.state === 'closing' || currentLifecycle.state === 'closed'
                    ? currentLifecycle.closedAt || now
                    : now,
                closedBy: params.actorId.slice(0, 180),
                closeReason: params.request.reason,
                eraseAfter: currentLifecycle.state === 'closing' || currentLifecycle.state === 'closed'
                    ? currentLifecycle.eraseAfter || eraseAfter
                    : eraseAfter,
                legalHold: currentLifecycle.legalHold === true,
                schemaVersion: WORKSPACE_LIFECYCLE_SCHEMA_VERSION,
                state: 'closing',
                updatedAt: now,
            },
            authDisabled: true,
            deleted: true,
            hostedHelpConfig: FieldValue.delete(),
            hostedHelpConfigVersion: FieldValue.delete(),
            modifiedOn: now,
            publicApi: FieldValue.delete(),
        }, { merge: true });
        transaction.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
            lastUpdated: now,
            stores: {
                [String(scope.sId)]: {
                    active: false,
                    authDisabled: true,
                    deleted: true,
                    modifiedOn: now,
                },
            },
        }, { merge: true });
        appendAnswerlatticeTenantSummaryAdmin(transaction, {
            active: false,
            sId: scope.sId,
            source: 'workspace_lifecycle_closing',
            tId: scope.tId,
        });
    });

    const deniedStore = assertScopedStore(await storeRef.get(), scope);
    const deniedLifecycle = lifecycleFromStore(deniedStore);
    const storedPublicBundleId = deniedLifecycle.revokedPublicBundleId;
    if (
        storedPublicBundleId !== undefined
        && storedPublicBundleId !== null
        && (
            typeof storedPublicBundleId !== 'string'
            || !isExpectedAnswerlatticePublicBundleId(
                storedPublicBundleId,
                scope.tId,
                scope.sId,
            )
        )
    ) {
        throw new AnswerlatticeWorkspaceLifecycleError('CONTEXT_BUNDLE_MANIFEST_REVIEW_REQUIRED');
    }
    const publicBundleId = typeof storedPublicBundleId === 'string'
        ? storedPublicBundleId
        : await getPublicBundleId(db, scope);
    if (publicBundleId) {
        await storeRef.update({
            'answerlatticeWorkspaceLifecycle.revokedPublicBundleId': publicBundleId,
            'answerlatticeWorkspaceLifecycle.updatedAt': Timestamp.now(),
        });
    }

    await removeHostedHelpRegistry(db, scope);
    await removeCompiledBundles(scope, publicBundleId);

    await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(storeRef);
        const currentStore = assertScopedStore(currentSnapshot, scope);
        const currentLifecycle = lifecycleFromStore(currentStore);
        if (currentLifecycle.state !== 'closing' && currentLifecycle.state !== 'closed') {
            throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_CANNOT_BE_CLOSED');
        }
        const completedAt = Timestamp.now();
        transaction.set(storeRef, {
            answerlatticeWorkspaceLifecycle: {
                ...currentLifecycle,
                schemaVersion: WORKSPACE_LIFECYCLE_SCHEMA_VERSION,
                state: 'closed',
                updatedAt: completedAt,
            },
            modifiedOn: completedAt,
        }, { merge: true });
        transaction.set(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS)
                .doc(`workspace_close_${scope.tId}_${scope.sId}`),
            auditDocument({
                action: 'workspace_closed',
                actorId: params.actorId,
                reason: params.request.reason,
                scope,
            }),
        );
    });

    const claimsSynchronized = await syncWorkspaceStaffClaims(db, scope);
    await storeRef.update({
        'answerlatticeWorkspaceLifecycle.claimsRefreshPending': !claimsSynchronized,
        'answerlatticeWorkspaceLifecycle.updatedAt': Timestamp.now(),
    });
    return {
        action: 'close',
        complete: claimsSynchronized,
        recoveryAvailableUntil: eraseAfter.toDate().toISOString(),
        state: 'closed',
    };
};

const recoverWorkspace = async (params: {
    actorId: string;
    request: Extract<AnswerlatticeWorkspaceLifecycleRequest, { action: 'recover' }>;
}): Promise<AnswerlatticeWorkspaceLifecycleResult> => {
    const db = getDb();
    const scope = { tId: params.request.tId, sId: params.request.sId };
    requireConfirmation(params.request.confirmation, getAnswerlatticeWorkspaceRecoverConfirmation(scope));
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));
    const storeSnapshot = await storeRef.get();
    const store = assertScopedStore(storeSnapshot, scope);
    const lifecycle = lifecycleFromStore(store);
    const eraseAfterMillis = timestampMillis(lifecycle.eraseAfter);
    if (!canRecoverAnswerlatticeWorkspace({
        eraseAfterMillis,
        nowMillis: Date.now(),
        state: lifecycle.state,
    })) {
        throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_RECOVERY_NOT_ALLOWED');
    }

    const now = Timestamp.now();
    await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(storeRef);
        const currentStore = assertScopedStore(currentSnapshot, scope);
        const currentLifecycle = lifecycleFromStore(currentStore);
        if (!canRecoverAnswerlatticeWorkspace({
            eraseAfterMillis: timestampMillis(currentLifecycle.eraseAfter),
            nowMillis: now.toMillis(),
            state: currentLifecycle.state,
        })) {
            throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_RECOVERY_NOT_ALLOWED');
        }
        transaction.set(storeRef, {
            active: true,
            answerlatticeWorkspaceLifecycle: {
                ...currentLifecycle,
                claimsRefreshPending: true,
                recoveredAt: now,
                recoveredBy: params.actorId.slice(0, 180),
                recoveryReason: params.request.reason,
                schemaVersion: WORKSPACE_LIFECYCLE_SCHEMA_VERSION,
                state: 'active',
                updatedAt: now,
            },
            authDisabled: false,
            deleted: false,
            modifiedOn: now,
        }, { merge: true });
        transaction.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
            lastUpdated: now,
            stores: {
                [String(scope.sId)]: {
                    active: true,
                    authDisabled: false,
                    deleted: false,
                    modifiedOn: now,
                },
            },
        }, { merge: true });
        appendAnswerlatticeTenantSummaryAdmin(transaction, {
            active: true,
            sId: scope.sId,
            source: 'workspace_lifecycle_recover',
            tId: scope.tId,
        });
        transaction.set(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(`workspace_recover_${randomUUID()}`),
            auditDocument({
                action: 'workspace_recovered',
                actorId: params.actorId,
                reason: params.request.reason,
                scope,
            }),
        );
    });
    const claimsSynchronized = await syncWorkspaceStaffClaims(db, scope);
    await storeRef.update({
        'answerlatticeWorkspaceLifecycle.claimsRefreshPending': !claimsSynchronized,
        'answerlatticeWorkspaceLifecycle.updatedAt': Timestamp.now(),
    });
    return {
        action: 'recover',
        complete: claimsSynchronized,
        recoveryAvailableUntil: null,
        state: 'active',
    };
};

const setLegalHold = async (params: {
    actorId: string;
    request: Extract<AnswerlatticeWorkspaceLifecycleRequest, { action: 'set_legal_hold' }>;
}): Promise<AnswerlatticeWorkspaceLifecycleResult> => {
    const db = getDb();
    const scope = { tId: params.request.tId, sId: params.request.sId };
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));
    const snapshot = await storeRef.get();
    const store = assertScopedStore(snapshot, scope);
    const lifecycle = lifecycleFromStore(store);
    if (lifecycle.state === 'erased') {
        throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_ALREADY_ERASED');
    }
    const now = Timestamp.now();
    await storeRef.set({
        answerlatticeWorkspaceLifecycle: {
            ...lifecycle,
            legalHold: params.request.enabled,
            legalHoldChangedAt: now,
            legalHoldChangedBy: params.actorId.slice(0, 180),
            legalHoldReason: params.request.reason,
            schemaVersion: WORKSPACE_LIFECYCLE_SCHEMA_VERSION,
            updatedAt: now,
        },
    }, { merge: true });
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS)
        .doc(`workspace_legal_hold_${randomUUID()}`)
        .set(auditDocument({
            action: params.request.enabled ? 'workspace_legal_hold_enabled' : 'workspace_legal_hold_disabled',
            actorId: params.actorId,
            reason: params.request.reason,
            scope,
        }));
    return {
        action: 'set_legal_hold',
        complete: true,
        state: lifecycle.state,
    };
};

const initialProgress = (): LifecycleProgress => ({
    collectionIndex: 0,
    deletedDocuments: 0,
    deletedObjects: 0,
    nestedIndex: 0,
    phase: 'collections',
    storageIndex: 0,
});

const startErasure = async (params: {
    actorId: string;
    request: Extract<AnswerlatticeWorkspaceLifecycleRequest, { action: 'start_erasure' }>;
}): Promise<AnswerlatticeWorkspaceLifecycleResult> => {
    const db = getDb();
    const scope = { tId: params.request.tId, sId: params.request.sId };
    requireConfirmation(params.request.confirmation, getAnswerlatticeWorkspaceEraseConfirmation(scope));
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));
    const snapshot = await storeRef.get();
    const store = assertScopedStore(snapshot, scope);
    const lifecycle = lifecycleFromStore(store);
    const activeSubscription = await getDirectActiveProductSubscriptionForStore(
        PRODUCT_IDS.ANSWERLATTICE,
        scope.tId,
        scope.sId,
    );
    const gate = canStartAnswerlatticeWorkspaceErasure({
        activeSubscription: Boolean(activeSubscription),
        billingReview: params.request.billingReview,
        eraseAfterMillis: timestampMillis(lifecycle.eraseAfter),
        exportDecision: params.request.exportDecision,
        legalHold: lifecycle.legalHold === true,
        nowMillis: Date.now(),
        retainedEvidenceAcknowledged: params.request.retainedEvidenceAcknowledged,
        state: lifecycle.state,
    });
    if (!gate.allowed) {
        throw new AnswerlatticeWorkspaceLifecycleError(gate.reason || 'WORKSPACE_ERASURE_NOT_ALLOWED');
    }

    const now = Timestamp.now();
    await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(storeRef);
        const currentStore = assertScopedStore(currentSnapshot, scope);
        const currentLifecycle = lifecycleFromStore(currentStore);
        if (
            currentLifecycle.state !== 'closed'
            || currentLifecycle.legalHold === true
            || now.toMillis() < timestampMillis(currentLifecycle.eraseAfter)
        ) {
            throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_ERASURE_NOT_ALLOWED');
        }
        transaction.set(storeRef, {
            answerlatticeWorkspaceLifecycle: {
                ...currentLifecycle,
                billingReview: params.request.billingReview,
                eraseReason: params.request.reason,
                erasure: initialProgress(),
                erasureStartedAt: now,
                erasureStartedBy: params.actorId.slice(0, 180),
                exportDecision: params.request.exportDecision,
                retainedEvidenceAcknowledged: true,
                schemaVersion: WORKSPACE_LIFECYCLE_SCHEMA_VERSION,
                state: 'erasing',
                updatedAt: now,
            },
        }, { merge: true });
        transaction.set(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(`workspace_erasure_start_${randomUUID()}`),
            auditDocument({
                action: 'workspace_erasure_started',
                actorId: params.actorId,
                reason: params.request.reason,
                scope,
            }),
        );
    });
    const result = await continueErasure({
        actorId: params.actorId,
        request: {
            action: 'continue_erasure',
            confirmation: params.request.confirmation,
            ...scope,
        },
    });
    return {
        ...result,
        action: 'start_erasure',
    };
};

const writeProgress = async (
    storeRef: FirebaseFirestore.DocumentReference,
    progress: LifecycleProgress,
) => {
    await storeRef.update({
        'answerlatticeWorkspaceLifecycle.erasure': progress,
        'answerlatticeWorkspaceLifecycle.updatedAt': Timestamp.now(),
    });
};

const deleteCollectionBatch = async (params: {
    db: FirebaseFirestore.Firestore;
    index: number;
    progress: LifecycleProgress;
    scope: AnswerlatticeWorkspaceScope;
    storeRef: FirebaseFirestore.DocumentReference;
}): Promise<{ advanced: boolean; deleted: number }> => {
    const spec = ANSWERLATTICE_WORKSPACE_ERASURE_COLLECTIONS[params.index];
    if (!spec) return { advanced: true, deleted: 0 };

    const documents = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const field of spec.scopeFields) {
        const snapshot = await params.db.collection(spec.collection)
            .where(field, 'in', [params.scope.sId, String(params.scope.sId)])
            .limit(ANSWERLATTICE_WORKSPACE_ERASURE_QUERY_LIMIT)
            .get();
        snapshot.docs.forEach(document => documents.set(document.ref.path, document));
    }
    const classifications = Array.from(documents.values()).map(document => ({
        classification: classifyAnswerlatticeWorkspaceRecord(
            document.data(),
            params.scope,
            spec.productIdentity,
        ),
        document,
    }));
    if (classifications.some(item => item.classification === 'ambiguous')) {
        throw new AnswerlatticeWorkspaceLifecycleError(
            `AMBIGUOUS_ERASURE_SCOPE:${spec.collection}`,
        );
    }
    const exact = classifications
        .filter(item => item.classification === 'exact')
        .map(item => item.document)
        .slice(0, ANSWERLATTICE_WORKSPACE_ERASURE_BATCH_LIMIT);
    if (exact.length === 0) {
        params.progress.collectionIndex += 1;
        await writeProgress(params.storeRef, params.progress);
        return { advanced: true, deleted: 0 };
    }

    const batch = params.db.batch();
    exact.forEach(document => batch.delete(document.ref));
    params.progress.deletedDocuments += exact.length;
    batch.update(params.storeRef, {
        'answerlatticeWorkspaceLifecycle.erasure': params.progress,
        'answerlatticeWorkspaceLifecycle.updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { advanced: false, deleted: exact.length };
};

const nestedCollections = (
    db: FirebaseFirestore.Firestore,
    scope: AnswerlatticeWorkspaceScope,
): FirebaseFirestore.CollectionReference[] => [
    db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(scope.tId))
        .collection(String(scope.sId)),
    db.collection(DB_COLLECTIONS.CHANGELOG)
        .doc(String(scope.tId))
        .collection(String(scope.sId)),
    db.collection(DB_COLLECTIONS.ARTICLE_FEEDBACK)
        .doc(String(scope.tId))
        .collection(String(scope.sId)),
    db.collection(DB_COLLECTIONS.CHANGELOG_FEEDBACK)
        .doc(String(scope.tId))
        .collection(String(scope.sId)),
    db.collection(DB_COLLECTIONS.FAQ_FEEDBACK)
        .doc(String(scope.tId))
        .collection(String(scope.sId)),
    db.collection(DB_COLLECTIONS.INSIGHTS)
        .doc(String(scope.tId))
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(scope.sId))
        .collection(DB_COLLECTIONS.AI),
];

const deleteNestedBatch = async (params: {
    db: FirebaseFirestore.Firestore;
    progress: LifecycleProgress;
    scope: AnswerlatticeWorkspaceScope;
    storeRef: FirebaseFirestore.DocumentReference;
}): Promise<{ advanced: boolean; deleted: number }> => {
    const collection = nestedCollections(params.db, params.scope)[params.progress.nestedIndex];
    if (!collection) {
        params.progress.phase = 'staff';
        await writeProgress(params.storeRef, params.progress);
        return { advanced: true, deleted: 0 };
    }
    const snapshot = await collection.limit(ANSWERLATTICE_WORKSPACE_ERASURE_QUERY_LIMIT).get();
    const documents = snapshot.docs.slice(0, ANSWERLATTICE_WORKSPACE_ERASURE_BATCH_LIMIT);
    if (documents.length === 0) {
        params.progress.nestedIndex += 1;
        await writeProgress(params.storeRef, params.progress);
        return { advanced: true, deleted: 0 };
    }
    const batch = params.db.batch();
    documents.forEach(document => batch.delete(document.ref));
    params.progress.deletedDocuments += documents.length;
    batch.update(params.storeRef, {
        'answerlatticeWorkspaceLifecycle.erasure': params.progress,
        'answerlatticeWorkspaceLifecycle.updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { advanced: false, deleted: documents.length };
};

const getAuthErrorCode = (error: unknown): string => (
    typeof (error as { code?: unknown })?.code === 'string'
        ? String((error as { code: string }).code)
        : ''
);

const eraseOneStaffMembership = async (params: {
    db: FirebaseFirestore.Firestore;
    progress: LifecycleProgress;
    scope: AnswerlatticeWorkspaceScope;
    storeRef: FirebaseFirestore.DocumentReference;
}): Promise<{ advanced: boolean; deleted: number }> => {
    const discovery = await discoverWorkspaceStaffDocuments(params.db, params.scope);
    if (discovery.reviewRequired) {
        throw new AnswerlatticeWorkspaceLifecycleError(discovery.reviewRequired);
    }
    const target = discovery.documents[0];
    if (!target) {
        params.progress.phase = 'storage';
        await writeProgress(params.storeRef, params.progress);
        return { advanced: true, deleted: 0 };
    }
    const targetData = target.data();
    if (['PLATFORM', 'PLATFORM_SUPPORT'].includes(String(targetData.platformRole || '').toUpperCase())) {
        throw new AnswerlatticeWorkspaceLifecycleError('PLATFORM_IDENTITY_MEMBERSHIP_REVIEW_REQUIRED');
    }

    const result = await removeAnswerlatticeWorkspaceMembershipForErasureTransaction({
        db: params.db,
        storeId: params.scope.sId,
        tenantId: params.scope.tId,
        userId: target.id,
    });
    const projectionsComplete = await repairAnswerlatticeStaffAccessProjections({
        data: result.nextData,
        fallbackStoreId: params.scope.sId,
        forceClaimsRevoke: true,
        operation: 'workspace_erasure_membership_remove',
        revokeDefault: false,
        syncBridge: true,
        syncClaims: true,
        userId: target.id,
    });
    if (!projectionsComplete) {
        throw new AnswerlatticeWorkspaceLifecycleError('STAFF_IDENTITY_PROJECTION_INCOMPLETE');
    }

    if (result.memberships.length === 0) {
        const defaultDb = firestoreAdmin as FirebaseFirestore.Firestore | null;
        if (defaultDb && typeof defaultDb.collection === 'function') {
            await eraseAnswerlatticeStaffProductAccountBridge({
                db: defaultDb,
                defaultUserId: target.id,
                tenantId: params.scope.tId,
            });
        }
        if (!shouldUseSharedAnswerlatticeFirebase) {
            try {
                const lookup = typeof targetData.firebaseUid === 'string' && targetData.firebaseUid
                    ? await requireAnswerlatticeAuthAdmin().getUser(targetData.firebaseUid)
                    : await requireAnswerlatticeAuthAdmin().getUserByEmail(String(targetData.email || ''));
                await requireAnswerlatticeAuthAdmin().deleteUser(lookup.uid);
            } catch (error) {
                if (getAuthErrorCode(error) !== 'auth/user-not-found') throw error;
            }
            await target.ref.delete();
        }
    }
    params.progress.deletedDocuments += result.memberships.length === 0 && !shouldUseSharedAnswerlatticeFirebase ? 1 : 0;
    await writeProgress(params.storeRef, params.progress);
    return { advanced: false, deleted: 1 };
};

const storagePrefixes = (
    scope: AnswerlatticeWorkspaceScope,
    lifecycle: WorkspaceLifecycleRecord,
): string[] => {
    const publicBundleId = lifecycle.revokedPublicBundleId;
    if (
        publicBundleId !== undefined
        && publicBundleId !== null
        && !isExpectedAnswerlatticePublicBundleId(publicBundleId, scope.tId, scope.sId)
    ) {
        throw new AnswerlatticeWorkspaceLifecycleError('CONTEXT_BUNDLE_MANIFEST_REVIEW_REQUIRED');
    }
    const expectedPublicBundleId = getExpectedAnswerlatticePublicBundleId(scope.tId, scope.sId);
    if (!expectedPublicBundleId) {
        throw new AnswerlatticeWorkspaceLifecycleError('CONTEXT_BUNDLE_MANIFEST_REVIEW_REQUIRED');
    }
    return [
        ...STORAGE_PREFIXES.map(build => build(scope)),
        `${ANSWERLATTICE_CONTEXT_PUBLIC_ROOT}/${publicBundleId || expectedPublicBundleId}/`,
    ];
};

const deleteStorageBatch = async (params: {
    lifecycle: WorkspaceLifecycleRecord;
    progress: LifecycleProgress;
    scope: AnswerlatticeWorkspaceScope;
    storeRef: FirebaseFirestore.DocumentReference;
}): Promise<{ advanced: boolean; deleted: number }> => {
    const prefixes = storagePrefixes(params.scope, params.lifecycle);
    const prefix = prefixes[params.progress.storageIndex];
    if (!prefix) {
        params.progress.phase = 'finalize';
        await writeProgress(params.storeRef, params.progress);
        return { advanced: true, deleted: 0 };
    }
    const storage = answerlatticeStorageAdmin as typeof answerlatticeStorageAdmin | null;
    if (!storage || typeof storage.bucket !== 'function') {
        throw new AnswerlatticeWorkspaceLifecycleError('ANSWERLATTICE_STORAGE_NOT_CONFIGURED', 503);
    }
    const [files] = await storage.bucket().getFiles({
        autoPaginate: false,
        maxResults: ANSWERLATTICE_WORKSPACE_ERASURE_QUERY_LIMIT,
        prefix,
    });
    const targets = files.slice(0, ANSWERLATTICE_WORKSPACE_ERASURE_BATCH_LIMIT);
    if (targets.length === 0) {
        params.progress.storageIndex += 1;
        await writeProgress(params.storeRef, params.progress);
        return { advanced: true, deleted: 0 };
    }
    await Promise.all(targets.map(file => file.delete({ ignoreNotFound: true })));
    params.progress.deletedObjects += targets.length;
    await writeProgress(params.storeRef, params.progress);
    return { advanced: false, deleted: targets.length };
};

const hasExactTenantIdentity = (
    value: unknown,
    tenantId: number,
): boolean => {
    const data = getRecord(value);
    const suppliedTenantIds = [data.tId, data.tenantId].filter(value => value !== undefined);
    return hasExactAnswerlatticeProductIdentity(data)
        && suppliedTenantIds.length > 0
        && suppliedTenantIds.every(value => String(value) === String(tenantId));
};

const finalizeErasure = async (params: {
    actorId: string;
    db: FirebaseFirestore.Firestore;
    lifecycle: WorkspaceLifecycleRecord;
    progress: LifecycleProgress;
    scope: AnswerlatticeWorkspaceScope;
    storeRef: FirebaseFirestore.DocumentReference;
}): Promise<void> => {
    const tenantRef = params.db.collection(DB_COLLECTIONS.TENANTS).doc(String(params.scope.tId));
    const storesSummaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    const tenantSummaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
        getAnswerlatticeTenantSummaryShardId(params.scope.tId, params.scope.sId),
    );
    const storeCollection = params.db.collection(DB_COLLECTIONS.STORES);
    const canonicalTenantStoresQuery = storeCollection
        .where('tenantId', '==', params.scope.tId)
        .limit(102);
    const legacyTenantStoresQuery = storeCollection
        .where('tId', '==', params.scope.tId)
        .limit(102);

    await params.db.runTransaction(async (transaction) => {
        const [
            currentStoreSnapshot,
            tenantSnapshot,
            storesSummarySnapshot,
            tenantSummarySnapshot,
            canonicalTenantStoresSnapshot,
            legacyTenantStoresSnapshot,
        ] = await Promise.all([
            transaction.get(params.storeRef),
            transaction.get(tenantRef),
            transaction.get(storesSummaryRef),
            transaction.get(tenantSummaryRef),
            transaction.get(canonicalTenantStoresQuery),
            transaction.get(legacyTenantStoresQuery),
        ]);
        const currentStore = assertScopedStore(currentStoreSnapshot, params.scope);
        const currentLifecycle = lifecycleFromStore(currentStore);
        if (
            currentLifecycle.state !== 'erasing'
            || currentLifecycle.legalHold === true
            || currentLifecycle.erasure?.phase !== 'finalize'
        ) {
            throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_ERASURE_FINALIZE_CONFLICT');
        }

        const tenantStoreDocuments = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        canonicalTenantStoresSnapshot.docs.forEach(document => tenantStoreDocuments.set(document.ref.path, document));
        legacyTenantStoresSnapshot.docs.forEach(document => tenantStoreDocuments.set(document.ref.path, document));
        if (
            canonicalTenantStoresSnapshot.size > 101
            || legacyTenantStoresSnapshot.size > 101
            || tenantStoreDocuments.size > 101
        ) {
            throw new AnswerlatticeWorkspaceLifecycleError('TENANT_STORE_REVIEW_REQUIRED');
        }
        const hasOtherAnswerlatticeStore = Array.from(tenantStoreDocuments.values()).some(document => (
            document.id !== String(params.scope.sId)
            && isAnswerlatticeStoreInScope(
                document.data(),
                {
                    tenantId: params.scope.tId,
                    storeId: document.id,
                },
                document.id,
            )
        ));
        const erasedAt = Timestamp.now();
        const certificateId = `al_erasure_${params.scope.tId}_${params.scope.sId}`;
        transaction.set(params.storeRef, {
            active: false,
            answerlatticeWorkspaceLifecycle: {
                certificateId,
                closedAt: currentLifecycle.closedAt || null,
                deletedDocuments: currentLifecycle.erasure.deletedDocuments,
                deletedObjects: currentLifecycle.erasure.deletedObjects,
                erasedAt,
                erasedBy: params.actorId.slice(0, 180),
                legalHold: false,
                retainedCollections: [
                    DB_COLLECTIONS.SUBSCRIPTIONS,
                    DB_COLLECTIONS.PAYMENT_TRANSACTIONS,
                    DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS,
                ],
                schemaVersion: WORKSPACE_LIFECYCLE_SCHEMA_VERSION,
                state: 'erased',
            },
            authDisabled: true,
            deleted: true,
            modifiedOn: erasedAt,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: params.scope.sId,
            storeId: params.scope.sId,
            tId: params.scope.tId,
            tenantId: params.scope.tId,
        });
        if (storesSummarySnapshot.exists) {
            transaction.update(storesSummaryRef, {
                [`stores.${params.scope.sId}`]: FieldValue.delete(),
                lastUpdated: erasedAt,
            });
        }
        if (tenantSummarySnapshot.exists) {
            removeAnswerlatticeTenantSummaryEntryAdmin(transaction, params.scope);
        }
        if (
            tenantSnapshot.exists
            && !hasOtherAnswerlatticeStore
            && hasExactTenantIdentity(tenantSnapshot.data(), params.scope.tId)
        ) {
            transaction.delete(tenantRef);
        }
    });
};

const continueErasure = async (params: {
    actorId: string;
    request: Extract<AnswerlatticeWorkspaceLifecycleRequest, { action: 'continue_erasure' }>;
}): Promise<AnswerlatticeWorkspaceLifecycleResult> => {
    const db = getDb();
    const scope = { tId: params.request.tId, sId: params.request.sId };
    requireConfirmation(params.request.confirmation, getAnswerlatticeWorkspaceEraseConfirmation(scope));
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));

    for (let attempt = 0; attempt < WORKSPACE_LIFECYCLE_EMPTY_PHASE_LIMIT; attempt += 1) {
        const snapshot = await storeRef.get();
        const store = assertScopedStore(snapshot, scope);
        const lifecycle = lifecycleFromStore(store);
        if (lifecycle.state === 'erased') {
            return { action: 'continue_erasure', complete: true, state: 'erased' };
        }
        if (lifecycle.state !== 'erasing') {
            throw new AnswerlatticeWorkspaceLifecycleError('WORKSPACE_ERASURE_NOT_STARTED');
        }
        if (lifecycle.legalHold === true) {
            throw new AnswerlatticeWorkspaceLifecycleError('LEGAL_HOLD_ACTIVE');
        }
        const activeSubscription = await getDirectActiveProductSubscriptionForStore(
            PRODUCT_IDS.ANSWERLATTICE,
            scope.tId,
            scope.sId,
        );
        const erasureGate = canStartAnswerlatticeWorkspaceErasure({
            activeSubscription: Boolean(activeSubscription),
            billingReview: lifecycle.billingReview,
            eraseAfterMillis: timestampMillis(lifecycle.eraseAfter),
            exportDecision: lifecycle.exportDecision,
            legalHold: false,
            nowMillis: Date.now(),
            retainedEvidenceAcknowledged: lifecycle.retainedEvidenceAcknowledged === true,
            state: lifecycle.state === 'erasing' ? 'closed' : lifecycle.state,
        });
        if (!erasureGate.allowed) {
            throw new AnswerlatticeWorkspaceLifecycleError(
                erasureGate.reason || 'WORKSPACE_ERASURE_NOT_ALLOWED',
            );
        }
        const progress = lifecycle.erasure || initialProgress();

        if (progress.phase === 'collections') {
            if (progress.collectionIndex >= ANSWERLATTICE_WORKSPACE_ERASURE_COLLECTIONS.length) {
                progress.phase = 'nested';
                await writeProgress(storeRef, progress);
                continue;
            }
            const result = await deleteCollectionBatch({
                db,
                index: progress.collectionIndex,
                progress,
                scope,
                storeRef,
            });
            if (result.deleted > 0) {
                return { action: 'continue_erasure', complete: false, progress, state: 'erasing' };
            }
            continue;
        }
        if (progress.phase === 'nested') {
            const result = await deleteNestedBatch({ db, progress, scope, storeRef });
            if (result.deleted > 0) {
                return { action: 'continue_erasure', complete: false, progress, state: 'erasing' };
            }
            continue;
        }
        if (progress.phase === 'staff') {
            const result = await eraseOneStaffMembership({ db, progress, scope, storeRef });
            if (result.deleted > 0) {
                return { action: 'continue_erasure', complete: false, progress, state: 'erasing' };
            }
            continue;
        }
        if (progress.phase === 'storage') {
            const result = await deleteStorageBatch({
                lifecycle,
                progress,
                scope,
                storeRef,
            });
            if (result.deleted > 0) {
                return { action: 'continue_erasure', complete: false, progress, state: 'erasing' };
            }
            continue;
        }
        await finalizeErasure({
            actorId: params.actorId,
            db,
            lifecycle,
            progress,
            scope,
            storeRef,
        });
        return { action: 'continue_erasure', complete: true, state: 'erased' };
    }

    const latest = await storeRef.get();
    const lifecycle = lifecycleFromStore(assertScopedStore(latest, scope));
    return {
        action: 'continue_erasure',
        complete: lifecycle.state === 'erased',
        progress: lifecycle.erasure,
        state: lifecycle.state,
    };
};

export const executeAnswerlatticeWorkspaceLifecycle = async (params: {
    actorId: string;
    request: AnswerlatticeWorkspaceLifecycleRequest;
}): Promise<AnswerlatticeWorkspaceLifecycleResult> => {
    switch (params.request.action) {
        case 'close':
            return closeWorkspace({
                actorId: params.actorId,
                request: params.request,
            });
        case 'recover':
            return recoverWorkspace({
                actorId: params.actorId,
                request: params.request,
            });
        case 'set_legal_hold':
            return setLegalHold({
                actorId: params.actorId,
                request: params.request,
            });
        case 'start_erasure':
            return startErasure({
                actorId: params.actorId,
                request: params.request,
            });
        case 'continue_erasure':
            return continueErasure({
                actorId: params.actorId,
                request: params.request,
            });
    }
};
