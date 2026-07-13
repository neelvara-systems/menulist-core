import { DB_COLLECTIONS } from '@constant/database';
import { getPhoneUserDocumentId } from '@lib/auth/phoneUserIdentity';
import { normalizeOnboardingUserId } from '@lib/onboarding/onboardingUserId';

export class MessagingOwnerClaimConflictError extends Error {
    readonly code = 'MESSAGING_OWNER_CLAIM_CONFLICT';

    constructor() {
        super('Unable to claim messaging onboarding owner.');
        Object.setPrototypeOf(this, MessagingOwnerClaimConflictError.prototype);
        this.name = 'MessagingOwnerClaimConflictError';
    }
}

export const isMessagingOwnerClaimConflictError = (
    error: unknown,
): error is MessagingOwnerClaimConflictError => (
    error instanceof MessagingOwnerClaimConflictError
    || (
        typeof error === 'object'
        && error !== null
        && (error as { code?: unknown }).code === 'MESSAGING_OWNER_CLAIM_CONFLICT'
    )
);

export const getMessagingOwnerDocumentId = getPhoneUserDocumentId;

export const readMessagingOwnerClaimInTransaction = async ({
    db,
    existingUserExpected,
    expectedPhone,
    expectedPhoneUsername,
    transaction,
    userId,
}: {
    db: FirebaseFirestore.Firestore;
    existingUserExpected: boolean;
    expectedPhone: string;
    expectedPhoneUsername: string;
    transaction: FirebaseFirestore.Transaction;
    userId: string;
}): Promise<{
    data: FirebaseFirestore.DocumentData;
    ref: FirebaseFirestore.DocumentReference;
}> => {
    const normalizedUserId = normalizeOnboardingUserId(userId);
    if (!normalizedUserId) throw new MessagingOwnerClaimConflictError();
    const ref = db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId);
    const snapshot = await transaction.get(ref);
    if (!existingUserExpected) {
        if (snapshot.exists) throw new MessagingOwnerClaimConflictError();
        return { data: {}, ref };
    }
    if (!snapshot.exists) throw new MessagingOwnerClaimConflictError();

    const data = snapshot.data() || {};
    const storedPhone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const storedPhoneUsername = typeof data.phoneUsername === 'string' ? data.phoneUsername.trim() : '';
    const hasTenant = data.tenantId !== undefined && data.tenantId !== null && data.tenantId !== '';
    const hasStore = data.storeId !== undefined && data.storeId !== null && data.storeId !== '';
    const hasStoreMappings = Array.isArray(data.stores) && data.stores.length > 0;
    const hasStoreIds = Array.isArray(data.storeIds) && data.storeIds.length > 0;
    const phoneMatches = (
        (Boolean(expectedPhone) && storedPhone === expectedPhone)
        || (Boolean(expectedPhoneUsername) && storedPhoneUsername === expectedPhoneUsername)
    );
    const phoneConflicts = (
        (Boolean(storedPhone) && Boolean(expectedPhone) && storedPhone !== expectedPhone)
        || (
            Boolean(storedPhoneUsername)
            && Boolean(expectedPhoneUsername)
            && storedPhoneUsername !== expectedPhoneUsername
        )
    );
    const userIsIneligible = (
        data.active === false
        || data.authDisabled === true
        || data.blocked === true
        || data.deleted === true
    );
    if (
        !phoneMatches
        || phoneConflicts
        || hasTenant
        || hasStore
        || hasStoreMappings
        || hasStoreIds
        || userIsIneligible
    ) {
        throw new MessagingOwnerClaimConflictError();
    }
    return { data, ref };
};
