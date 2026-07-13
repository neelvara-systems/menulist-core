import { DB_COLLECTIONS } from '@constant/database';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export type ClaimAccountMode = 'email-password' | 'google' | 'whatsapp-phone';

export type ClaimAccountScope = {
    tenantDocumentId: string;
    tenantId: number;
    storeDocumentId: string;
    storeId: number;
};

export type ClaimedMessagingUser = FirebaseFirestore.DocumentData & {
    claimAccountScope: ClaimAccountScope;
};

export class ClaimTokenUnavailableError extends Error {
    readonly status: number;

    constructor(message = 'Unable to complete account claim.', status = 409) {
        super(message);
        Object.setPrototypeOf(this, ClaimTokenUnavailableError.prototype);
        this.name = 'ClaimTokenUnavailableError';
        this.status = status;
    }
}

const CLAIM_OPERATION_LEASE_MS = 15 * 60 * 1000;
const MAX_CLAIMED_SUBSCRIPTIONS = 100;

export const claimTokenTimestampLikeToMillis = (value: unknown): number | null => {
    if (!value) return null;
    if (typeof (value as { toMillis?: unknown }).toMillis === 'function') {
        const millis = (value as { toMillis: () => unknown }).toMillis();
        return typeof millis === 'number' && Number.isFinite(millis) ? millis : null;
    }
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const normalizeClaimAccountScopeDocumentId = (value: unknown): string | null => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const documentId = String(value);
    if (documentId !== documentId.trim() || !isValidFirestoreDocumentId(documentId)) return null;
    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? documentId
        : null;
};

export const normalizeClaimAccountScope = (
    data: FirebaseFirestore.DocumentData | undefined,
): ClaimAccountScope | null => {
    const tenantDocumentId = normalizeClaimAccountScopeDocumentId(data?.tenantId);
    const storeDocumentId = normalizeClaimAccountScopeDocumentId(data?.storeId);
    if (!tenantDocumentId || !storeDocumentId) return null;
    return {
        tenantDocumentId,
        tenantId: Number(tenantDocumentId),
        storeDocumentId,
        storeId: Number(storeDocumentId),
    };
};

export const assertMessagingUserClaimIsAvailable = (
    data: FirebaseFirestore.DocumentData | undefined,
    claimToken: string,
): ClaimedMessagingUser => {
    if (!data) throw new ClaimTokenUnavailableError('Unable to complete account claim.', 404);
    if (data.claimToken !== claimToken) throw new ClaimTokenUnavailableError();

    const expiresAt = claimTokenTimestampLikeToMillis(data.claimTokenExpiresAt);
    if (expiresAt === null) throw new ClaimTokenUnavailableError();
    if (expiresAt <= Date.now()) throw new ClaimTokenUnavailableError('This claim link has expired.', 410);
    if (
        data.active === false
        || data.authDisabled === true
        || data.blocked === true
        || data.deleted === true
    ) {
        throw new ClaimTokenUnavailableError();
    }

    const claimAccountScope = normalizeClaimAccountScope(data);
    if (!claimAccountScope) {
        throw new ClaimTokenUnavailableError('Unable to complete account claim.', 400);
    }
    const hasOwnerStoreMapping = Array.isArray(data.stores) && data.stores.some((mapping: unknown) => {
        if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return false;
        const candidate = mapping as { role?: unknown; storeId?: unknown };
        return normalizeClaimAccountScopeDocumentId(candidate.storeId) === claimAccountScope.storeDocumentId
            && candidate.role === 'owner';
    });
    if (!hasOwnerStoreMapping) throw new ClaimTokenUnavailableError();
    return {
        ...data,
        claimAccountScope,
        tenantId: claimAccountScope.tenantId,
        storeId: claimAccountScope.storeId,
    };
};

const hasActiveClaimOperation = (value: unknown, nowMs: number): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const leaseExpiresAt = claimTokenTimestampLikeToMillis((value as { leaseExpiresAt?: unknown }).leaseExpiresAt);
    return leaseExpiresAt !== null && leaseExpiresAt > nowMs;
};

export const getUniqueMessagingUserByClaimToken = async (
    db: FirebaseFirestore.Firestore,
    claimToken: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> => {
    const snapshot = await db
        .collection(DB_COLLECTIONS.USERS)
        .where('claimToken', '==', claimToken)
        .limit(2)
        .get();
    if (snapshot.size > 1) throw new ClaimTokenUnavailableError();
    return snapshot.docs[0] || null;
};

export const reserveClaimAccountOperation = async ({
    claimToken,
    db,
    messagingUserRef,
    mode,
    operationId,
}: {
    claimToken: string;
    db: FirebaseFirestore.Firestore;
    messagingUserRef: FirebaseFirestore.DocumentReference;
    mode: ClaimAccountMode;
    operationId: string;
}): Promise<ClaimedMessagingUser> => db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messagingUserRef);
    const current = assertMessagingUserClaimIsAvailable(snapshot.data(), claimToken);
    const nowMs = Date.now();
    if (hasActiveClaimOperation(current.claimOperation, nowMs)) {
        throw new ClaimTokenUnavailableError();
    }
    transaction.update(messagingUserRef, {
        claimOperation: {
            id: operationId,
            leaseExpiresAt: Timestamp.fromMillis(nowMs + CLAIM_OPERATION_LEASE_MS),
            mode,
            reservedAt: Timestamp.fromMillis(nowMs),
            status: 'reserved',
        },
        modifiedOn: Timestamp.fromMillis(nowMs),
    });
    return current;
});

const assertMatchingClaimOperation = (
    data: FirebaseFirestore.DocumentData,
    mode: ClaimAccountMode,
    operationId: string,
): void => {
    const operation = data.claimOperation;
    if (
        !operation
        || typeof operation !== 'object'
        || operation.id !== operationId
        || operation.mode !== mode
        || operation.status !== 'reserved'
    ) {
        throw new ClaimTokenUnavailableError();
    }
};

export const runClaimAccountTransaction = async ({
    apply,
    claimToken,
    db,
    messagingUserRef,
    mode,
    operationId,
    subscription,
}: {
    apply: (
        transaction: FirebaseFirestore.Transaction,
        currentMessagingUser: ClaimedMessagingUser,
    ) => Promise<void> | void;
    claimToken: string;
    db: FirebaseFirestore.Firestore;
    messagingUserRef: FirebaseFirestore.DocumentReference;
    mode: ClaimAccountMode;
    operationId: string;
    subscription: { email: string; name?: string; userDocId: string };
}): Promise<ClaimedMessagingUser> => db.runTransaction(async (transaction) => {
    const latestMessagingUserDoc = await transaction.get(messagingUserRef);
    const current = assertMessagingUserClaimIsAvailable(latestMessagingUserDoc.data(), claimToken);
    assertMatchingClaimOperation(current, mode, operationId);

    const scope = current.claimAccountScope;
    const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(scope.tenantDocumentId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(scope.storeDocumentId);
    const [tenantSnapshot, storeSnapshot] = await Promise.all([
        transaction.get(tenantRef),
        transaction.get(storeRef),
    ]);
    if (!tenantSnapshot.exists || !storeSnapshot.exists) throw new ClaimTokenUnavailableError();
    const tenant = tenantSnapshot.data() || {};
    const store = storeSnapshot.data() || {};
    if (
        normalizeClaimAccountScopeDocumentId(tenant.tenantId) !== scope.tenantDocumentId
        || normalizeClaimAccountScopeDocumentId(store.tenantId) !== scope.tenantDocumentId
        || normalizeClaimAccountScopeDocumentId(store.storeId) !== scope.storeDocumentId
        || tenant.active === false
        || tenant.blocked === true
        || tenant.deleted === true
        || store.active === false
        || store.blocked === true
        || store.deleted === true
    ) {
        throw new ClaimTokenUnavailableError();
    }
    const subscriptionsQuery = db
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('tenantId', '==', scope.tenantId)
        .where('storeId', '==', scope.storeId)
        .limit(MAX_CLAIMED_SUBSCRIPTIONS + 1);
    const subscriptionsSnapshot = await transaction.get(subscriptionsQuery);
    if (subscriptionsSnapshot.size > MAX_CLAIMED_SUBSCRIPTIONS) {
        throw new ClaimTokenUnavailableError();
    }

    await apply(transaction, current);
    const now = Timestamp.now();
    subscriptionsSnapshot.docs.forEach((subscriptionDoc) => {
        transaction.update(subscriptionDoc.ref, {
            email: subscription.email,
            ...(subscription.name ? { name: subscription.name } : {}),
            modifiedOn: now,
            userId: subscription.userDocId,
        });
    });
    transaction.update(messagingUserRef, { claimOperation: FieldValue.delete() });
    return current;
});

export const releaseClaimAccountOperation = async ({
    db,
    messagingUserRef,
    operationId,
}: {
    db: FirebaseFirestore.Firestore;
    messagingUserRef: FirebaseFirestore.DocumentReference;
    operationId: string;
}): Promise<void> => {
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(messagingUserRef);
        if (!snapshot.exists) return;
        const data = snapshot.data() || {};
        if (data.claimOperation?.id !== operationId || !data.claimToken) return;
        transaction.update(messagingUserRef, {
            claimOperation: FieldValue.delete(),
            modifiedOn: Timestamp.now(),
        });
    });
};

export const canDeleteCreatedClaimAuthUser = async (
    db: FirebaseFirestore.Firestore,
    messagingUserRef: FirebaseFirestore.DocumentReference,
    firebaseUid: string,
): Promise<boolean> => {
    const [snapshot, linkedUsers] = await Promise.all([
        messagingUserRef.get(),
        db.collection(DB_COLLECTIONS.USERS).where('firebaseUid', '==', firebaseUid).limit(1).get(),
    ]);
    return (!snapshot.exists || snapshot.data()?.firebaseUid !== firebaseUid) && linkedUsers.empty;
};

export const assertGoogleClaimTargetIsAvailable = (
    data: FirebaseFirestore.DocumentData,
    expectedEmail: string,
): void => {
    const storedEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
    if (
        storedEmail !== expectedEmail
        || (data.tenantId !== undefined && data.tenantId !== null && data.tenantId !== '')
        || (data.storeId !== undefined && data.storeId !== null && data.storeId !== '')
        || (Array.isArray(data.stores) && data.stores.length > 0)
        || (Array.isArray(data.storeIds) && data.storeIds.length > 0)
        || data.active === false
        || data.authDisabled === true
        || data.blocked === true
        || data.deleted === true
        || (
            data.platformRole !== undefined
            && data.platformRole !== null
            && !['OWNER', 'USER'].includes(data.platformRole)
        )
    ) {
        throw new ClaimTokenUnavailableError();
    }
};
