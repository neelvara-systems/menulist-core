import { DB_COLLECTIONS } from "@constant/database";
import { DEFAULT_PRODUCT_ID } from "@constant/product";
import { RESELLER_CAPS } from "@config/resellerPricing";
import { composeInitialSubscriptionPayloadServer } from "@database/subscriptions/server";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { getMenuListSubscriptionEntitlementScope } from "@lib/billing/menuListSubscriptionEntitlementBoundary";
import {
    addNonNegativeSafeIntegers,
    isNonNegativeSafeInteger,
} from "@lib/reseller/resellerMutationState";
import { projectResellerProfileRecord } from "@lib/reseller/resellerProfileRecord";
import { getMatchingResellerOnboardingProvisioningOperation } from "@lib/reseller/resellerOnboardingOperation";
import type { ResellerProfileRecord, ResellerTransaction } from "@type/reseller";
import { FirestoreSubscriptionDoc } from "@type/razorpay";

const TRANSACTIONS_COLLECTION = DB_COLLECTIONS.RESELLER_TRANSACTIONS;
const PROFILES_COLLECTION = DB_COLLECTIONS.RESELLER_PROFILES;

export type ResellerProfileAdmissionConflict =
    | "email"
    | "profile"
    | "total-cap"
    | "username";

export class ResellerProfileAdmissionError extends Error {
    readonly conflict: ResellerProfileAdmissionConflict;

    constructor(conflict: ResellerProfileAdmissionConflict) {
        super(`reseller_profile_admission_conflict:${conflict}`);
        this.name = "ResellerProfileAdmissionError";
        Object.setPrototypeOf(this, new.target.prototype);
        this.conflict = conflict;
    }
}

export const getResellerProfileAdmissionConflict = (
    error: unknown,
): ResellerProfileAdmissionConflict | null => (
    error instanceof ResellerProfileAdmissionError ? error.conflict : null
);

export class ResellerOfflineCapExceededError extends Error {
    readonly cap: number;

    constructor(cap: number) {
        super(`reseller_offline_cap_exceeded:${cap}`);
        this.name = 'ResellerOfflineCapExceededError';
        Object.setPrototypeOf(this, new.target.prototype);
        this.cap = cap;
    }
}

export const getResellerOfflineCapFromError = (error: unknown): number | null => {
    const message = error instanceof Error ? error.message : '';
    const match = message.match(/^reseller_offline_cap_exceeded:(\d{1,3})$/);
    if (!match) return null;
    const cap = Number(match[1]);
    return Number.isSafeInteger(cap) && cap > 0 ? cap : null;
};

type TimestampLike = {
    toDate: () => Date;
    seconds: number;
};

const isTimestampLike = (value: unknown): value is TimestampLike => (
    Boolean(value)
    && typeof value === "object"
    && typeof (value as Partial<TimestampLike>).toDate === "function"
    && typeof (value as Partial<TimestampLike>).seconds === "number"
);

const sanitizeForAdminFirestore = (
    value: Record<string, unknown>,
): Record<string, unknown> => {
    return sanitizeForFirestore(value, {
        atomicTransform: (atomicValue) => {
            if (!isTimestampLike(atomicValue)) return { handled: false };
            return { handled: true, value: admin.firestore.Timestamp.fromDate(atomicValue.toDate()) };
        },
    });
};

const toResellerProfile = (
    docSnap: admin.firestore.DocumentSnapshot,
): ResellerProfileRecord | null => (
    projectResellerProfileRecord(docSnap.id, docSnap.data())
);

export type ResellerProfileDocument = Record<string, unknown> & { id: string };

export const getResellerProfileServer = async (
    userId: string,
    email?: string | null,
    claimedProfileId?: string | null,
): Promise<ResellerProfileRecord | null> => {
    if (!isValidFirestoreDocumentId(userId) || userId !== userId.trim()) return null;
    const directSnap = await firestoreAdmin.collection(PROFILES_COLLECTION).doc(userId).get();
    if (directSnap.exists) return toResellerProfile(directSnap);

    const normalizedEmail = email?.toLowerCase()?.trim();
    if (!normalizedEmail || normalizedEmail.length > 320) return null;

    const normalizedClaim = claimedProfileId?.trim();
    if (
        normalizedClaim
        && normalizedClaim === claimedProfileId
        && isValidFirestoreDocumentId(normalizedClaim)
    ) {
        const claimedSnapshot = await firestoreAdmin
            .collection(PROFILES_COLLECTION)
            .doc(normalizedClaim)
            .get();
        const claimedProfile = claimedSnapshot.exists ? toResellerProfile(claimedSnapshot) : null;
        return claimedProfile?.email.toLowerCase().trim() === normalizedEmail
            ? claimedProfile
            : null;
    }

    const actorSnapshot = await firestoreAdmin
        .collection(PROFILES_COLLECTION)
        .where("authUserId", "==", userId)
        .limit(2)
        .get();
    const matchingProfiles = actorSnapshot.docs
        .map(toResellerProfile)
        .filter((profile) => profile !== null)
        .filter((profile) => profile.email.toLowerCase().trim() === normalizedEmail);
    return matchingProfiles.length === 1 ? matchingProfiles[0] : null;
};

export const getAllResellerProfilesServer = async (): Promise<ResellerProfileDocument[]> => {
    const snapshot = await firestoreAdmin
        .collection(PROFILES_COLLECTION)
        .orderBy("createdOn", "desc")
        .limit(51)
        .get();

    return snapshot.docs
        .filter((doc) => doc.data()?.deleted !== true)
        .map((doc) => ({ ...(doc.data() || {}), id: doc.id })) as ResellerProfileDocument[];
};

export const getResellerProfileByIdServer = async (
    profileId: string,
): Promise<ResellerProfileRecord | null> => {
    const docSnap = await firestoreAdmin.collection(PROFILES_COLLECTION).doc(profileId).get();
    if (!docSnap.exists) return null;
    return toResellerProfile(docSnap);
};

/**
 * Creates the reseller profile only after transaction-current uniqueness and
 * platform-cap checks. Query reads must stay inside the same transaction as
 * the create so concurrent platform requests cannot both pass stale checks.
 */
export const createResellerProfileServer = async (params: {
    email: string;
    maxProfiles: number;
    profile: Record<string, unknown>;
    profileId: string;
    user: Record<string, unknown>;
    userId: string;
    username: string;
}): Promise<void> => {
    const profiles = firestoreAdmin.collection(PROFILES_COLLECTION);
    const profileRef = profiles.doc(params.profileId);
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(params.userId);
    const emailQuery = profiles.where("email", "==", params.email).limit(1);
    const usernameQuery = profiles.where("username", "==", params.username).limit(1);
    const capQuery = profiles.limit(params.maxProfiles);

    await firestoreAdmin.runTransaction(async (transaction) => {
        const [profileSnapshot, emailSnapshot, usernameSnapshot, capSnapshot] = await Promise.all([
            transaction.get(profileRef),
            transaction.get(emailQuery),
            transaction.get(usernameQuery),
            transaction.get(capQuery),
        ]);

        if (profileSnapshot.exists) throw new ResellerProfileAdmissionError("profile");
        if (!emailSnapshot.empty) throw new ResellerProfileAdmissionError("email");
        if (!usernameSnapshot.empty) throw new ResellerProfileAdmissionError("username");
        if (capSnapshot.size >= params.maxProfiles) {
            throw new ResellerProfileAdmissionError("total-cap");
        }

        transaction.set(userRef, sanitizeForAdminFirestore(params.user), { merge: true });
        transaction.create(profileRef, sanitizeForAdminFirestore(params.profile));
    });
};

/**
 * Applies a profile merge only after transaction-current uniqueness checks.
 * The profile read also prevents an update from recreating a concurrently
 * removed reseller.
 */
export const updateResellerProfileServer = async (params: {
    email: string;
    profileId: string;
    updates: Record<string, unknown>;
    user: Record<string, unknown>;
    userId: string;
    username: string;
}): Promise<void> => {
    const profiles = firestoreAdmin.collection(PROFILES_COLLECTION);
    const profileRef = profiles.doc(params.profileId);
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(params.userId);
    const emailQuery = profiles.where("email", "==", params.email).limit(2);
    const usernameQuery = profiles.where("username", "==", params.username).limit(2);

    await firestoreAdmin.runTransaction(async (transaction) => {
        const [profileSnapshot, emailSnapshot, usernameSnapshot] = await Promise.all([
            transaction.get(profileRef),
            transaction.get(emailQuery),
            transaction.get(usernameQuery),
        ]);

        if (!profileSnapshot.exists) throw new ResellerProfileAdmissionError("profile");
        if (emailSnapshot.docs.some((doc) => doc.id !== params.profileId)) {
            throw new ResellerProfileAdmissionError("email");
        }
        if (usernameSnapshot.docs.some((doc) => doc.id !== params.profileId)) {
            throw new ResellerProfileAdmissionError("username");
        }

        transaction.set(userRef, sanitizeForAdminFirestore(params.user), { merge: true });
        transaction.set(profileRef, sanitizeForAdminFirestore(params.updates), { merge: true });
    });
};

type ResellerOnboardingTransactionInput = Omit<
    ResellerTransaction,
    "createdOn" | "id" | "modifiedOn"
> & {
    operationFingerprint: string;
    operationId: string;
    profileRevenueRecognized?: boolean;
};

/**
 * Commits reseller subscription truth, the immutable onboarding ledger, the
 * offline-cap reservation, and profile counters as one Firestore transaction.
 */
export const createResellerOnboardingBillingServer = async (params: {
    profileId?: string | null;
    subscription: Omit<FirestoreSubscriptionDoc, "id">;
    subscriptionId: string;
    transaction: ResellerOnboardingTransactionInput;
}): Promise<{ replayed: boolean; transactionId: string }> => {
    const hasExactDocumentId = (value: unknown): value is string => (
        isValidFirestoreDocumentId(value) && value === value.trim()
    );
    if (
        !hasExactDocumentId(params.subscriptionId)
        || !hasExactDocumentId(params.transaction.operationId)
        || !hasExactDocumentId(params.transaction.resellerId)
        || !isNonNegativeSafeInteger(params.transaction.amountExpected)
        || !["offline", "online"].includes(params.transaction.paymentMode)
        || (params.profileId !== undefined
            && params.profileId !== null
            && !hasExactDocumentId(params.profileId))
        || (params.profileId
            && params.transaction.resellerProfileId !== params.profileId)
    ) {
        throw new Error("Reseller onboarding billing input is invalid.");
    }

    const subscriptionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(params.subscriptionId);
    const transactionRef = firestoreAdmin
        .collection(TRANSACTIONS_COLLECTION)
        .doc(params.transaction.operationId);
    const profileRef = params.profileId
        ? firestoreAdmin.collection(PROFILES_COLLECTION).doc(params.profileId)
        : null;

    return firestoreAdmin.runTransaction(async (firestoreTransaction) => {
        const [operationSnapshot, subscriptionSnapshot, profileSnapshot] = await Promise.all([
            firestoreTransaction.get(transactionRef),
            firestoreTransaction.get(subscriptionRef),
            profileRef ? firestoreTransaction.get(profileRef) : Promise.resolve(null),
        ]);

        let upgradesProvisioningOperation = false;
        if (operationSnapshot.exists) {
            const operation = operationSnapshot.data() || {};
            const existingSubscription = subscriptionSnapshot.exists ? subscriptionSnapshot.data() || {} : {};
            const existingScope = getMenuListSubscriptionEntitlementScope(existingSubscription);
            const matchesCompletedOperation = (
                operation.operationId !== params.transaction.operationId
                || operation.operationFingerprint !== params.transaction.operationFingerprint
                || operation.action !== 'ONBOARD'
                || operation.resellerId !== params.transaction.resellerId
                || operation.subscriptionId !== params.subscriptionId
                || operation.tenantId !== params.transaction.tenantId
                || operation.storeId !== params.transaction.storeId
                || operation.amountExpected !== params.transaction.amountExpected
                || operation.paymentMode !== params.transaction.paymentMode
                || !subscriptionSnapshot.exists
                || existingScope?.tenantId !== params.transaction.tenantId
                || existingScope.storeId !== params.transaction.storeId
                || existingSubscription.providerSubscriptionId !== params.subscriptionId
                || existingSubscription.resellerId !== params.transaction.resellerId
                || existingSubscription.resellerProfileId !== params.transaction.resellerProfileId
            ) === false;
            if (matchesCompletedOperation) {
                return { replayed: true, transactionId: transactionRef.id };
            }
            const provisioningOperation = getMatchingResellerOnboardingProvisioningOperation({
                fingerprint: params.transaction.operationFingerprint,
                operationData: operation,
                operationId: params.transaction.operationId,
                resellerId: params.transaction.resellerId,
            });
            if (
                !provisioningOperation
                || provisioningOperation.tenantId !== params.transaction.tenantId
                || provisioningOperation.storeId !== params.transaction.storeId
                || provisioningOperation.userId !== params.subscription.userId
                || operation.paymentMode !== params.transaction.paymentMode
                || subscriptionSnapshot.exists
            ) {
                throw new Error('Reseller onboarding operation id is already used by another action.');
            }
            upgradesProvisioningOperation = true;
        }

        if (subscriptionSnapshot.exists) {
            throw new Error('Reseller onboarding subscription already exists without its operation ledger.');
        }

        let profileUpdates: Record<string, unknown> | null = null;
        if (profileRef) {
            if (!profileSnapshot?.exists) {
                throw new Error('Reseller profile disappeared during onboarding.');
            }
            const profile = profileSnapshot.data() || {};
            if (profile.active !== true) {
                throw new Error('Reseller profile is no longer active.');
            }
            if (
                profileRef.id !== params.transaction.resellerId
                && profile.authUserId !== params.transaction.resellerId
            ) {
                throw new Error("Reseller onboarding profile identity is invalid.");
            }
            const readCounter = (field: string): number | null => {
                const value = profile[field];
                return value === undefined ? 0 : (isNonNegativeSafeInteger(value) ? value : null);
            };
            const totalStoresOnboarded = readCounter("totalStoresOnboarded");
            const totalTransactions = readCounter("totalTransactions");
            const totalRevenueCollectedPaise = readCounter("totalRevenueCollectedPaise");
            const currentActiveOfflineStores = readCounter("currentActiveOfflineStores");
            const totalOfflineStores = readCounter("totalOfflineStores");
            const totalOnlineStores = readCounter("totalOnlineStores");
            if (
                totalStoresOnboarded === null
                || totalTransactions === null
                || totalRevenueCollectedPaise === null
                || currentActiveOfflineStores === null
                || totalOfflineStores === null
                || totalOnlineStores === null
            ) {
                throw new Error("Reseller onboarding profile counters are invalid.");
            }
            const nextTotalStores = addNonNegativeSafeIntegers(totalStoresOnboarded, 1);
            const nextTransactions = addNonNegativeSafeIntegers(totalTransactions, 1);
            const nextRevenue = addNonNegativeSafeIntegers(
                totalRevenueCollectedPaise,
                params.transaction.paymentMode === "offline"
                    ? params.transaction.amountExpected
                    : 0,
            );
            const nextOfflineActive = params.transaction.paymentMode === "offline"
                ? addNonNegativeSafeIntegers(currentActiveOfflineStores, 1)
                : currentActiveOfflineStores;
            const nextOfflineTotal = params.transaction.paymentMode === "offline"
                ? addNonNegativeSafeIntegers(totalOfflineStores, 1)
                : totalOfflineStores;
            const nextOnlineTotal = params.transaction.paymentMode === "online"
                ? addNonNegativeSafeIntegers(totalOnlineStores, 1)
                : totalOnlineStores;
            if (
                nextTotalStores === null
                || nextTransactions === null
                || nextRevenue === null
                || nextOfflineActive === null
                || nextOfflineTotal === null
                || nextOnlineTotal === null
            ) {
                throw new Error("Reseller onboarding profile counters would overflow.");
            }
            if (params.transaction.paymentMode === 'offline') {
                const persistedCap = profile.maxOfflineActivations;
                const cap = persistedCap === undefined
                    ? RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER
                    : persistedCap;
                if (!isNonNegativeSafeInteger(cap) || cap < 1) {
                    throw new Error("Reseller onboarding offline cap is invalid.");
                }
                if (currentActiveOfflineStores >= cap) throw new ResellerOfflineCapExceededError(cap);
            }
            profileUpdates = {
                currentActiveOfflineStores: nextOfflineActive,
                totalOfflineStores: nextOfflineTotal,
                totalOnlineStores: nextOnlineTotal,
                totalRevenueCollectedPaise: nextRevenue,
                totalStoresOnboarded: nextTotalStores,
                totalTransactions: nextTransactions,
            };
        }

        const now = admin.firestore.Timestamp.now();
        firestoreTransaction.create(
            subscriptionRef,
            composeInitialSubscriptionPayloadServer(params.subscription),
        );
        const persistedOperation = sanitizeForAdminFirestore({
            ...params.transaction,
            createdOn: now,
            id: transactionRef.id,
            modifiedOn: now,
        });
        if (upgradesProvisioningOperation) {
            firestoreTransaction.set(transactionRef, persistedOperation);
        } else {
            firestoreTransaction.create(transactionRef, persistedOperation);
        }

        if (profileRef && profileUpdates) {
            firestoreTransaction.update(profileRef, {
                ...profileUpdates,
                modifiedOn: now,
            });
        }

        return { replayed: false, transactionId: transactionRef.id };
    });
};

export const getResellerProfile = getResellerProfileServer;
export const getAllResellerProfiles = getAllResellerProfilesServer;
export const getResellerProfileById = getResellerProfileByIdServer;
export const createResellerProfile = createResellerProfileServer;
export const updateResellerProfile = updateResellerProfileServer;
export const createResellerOnboardingBilling = createResellerOnboardingBillingServer;
