import { DB_COLLECTIONS } from '@constant/database';
import { normalizeOnboardingUserId } from '@lib/onboarding/onboardingUserId';

export class ResellerOwnerClaimConflictError extends Error {
    constructor() {
        super('RESELLER_OWNER_CLAIM_CONFLICT');
        Object.setPrototypeOf(this, ResellerOwnerClaimConflictError.prototype);
        this.name = 'ResellerOwnerClaimConflictError';
    }
}

export const readResellerOwnerClaimInTransaction = async ({
    authUid,
    db,
    existingOwnerExpected,
    expectedEmail,
    transaction,
    userId,
}: {
    authUid: string;
    db: FirebaseFirestore.Firestore;
    existingOwnerExpected: boolean;
    expectedEmail: string;
    transaction: FirebaseFirestore.Transaction;
    userId: string;
}): Promise<{
    data: FirebaseFirestore.DocumentData;
    ref: FirebaseFirestore.DocumentReference;
}> => {
    const normalizedUserId = normalizeOnboardingUserId(userId);
    if (!normalizedUserId) throw new ResellerOwnerClaimConflictError();
    const ref = db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId);
    const snapshot = await transaction.get(ref);

    if (!existingOwnerExpected) {
        if (snapshot.exists) throw new ResellerOwnerClaimConflictError();
        return { data: {}, ref };
    }
    if (!snapshot.exists) throw new ResellerOwnerClaimConflictError();

    const data = snapshot.data() || {};
    const storedEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
    const storedFirebaseUid = typeof data.firebaseUid === 'string' ? data.firebaseUid.trim() : '';
    const hasTenant = data.tenantId !== undefined && data.tenantId !== null && data.tenantId !== '';
    const hasStore = data.storeId !== undefined && data.storeId !== null && data.storeId !== '';
    if (
        storedEmail !== expectedEmail
        || (storedFirebaseUid && storedFirebaseUid !== authUid)
        || hasTenant
        || hasStore
    ) {
        throw new ResellerOwnerClaimConflictError();
    }
    return { data, ref };
};

export const canDeleteCreatedResellerAuthUser = async (
    db: FirebaseFirestore.Firestore,
    authUid: string,
): Promise<boolean> => {
    const normalizedUserId = normalizeOnboardingUserId(authUid);
    if (!normalizedUserId) return false;
    return !(await db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId).get()).exists;
};
