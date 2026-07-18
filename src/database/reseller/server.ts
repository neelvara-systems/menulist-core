import { DB_COLLECTIONS } from "@constant/database";
import { RESELLER_CAPS } from "@config/resellerPricing";
import { composeInitialSubscriptionPayloadServer } from "@database/subscriptions/server";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { ResellerProfile, ResellerTransaction } from "@type/reseller";
import { FirestoreSubscriptionDoc } from "@type/razorpay";

const TRANSACTIONS_COLLECTION = DB_COLLECTIONS.RESELLER_TRANSACTIONS;
const PROFILES_COLLECTION = DB_COLLECTIONS.RESELLER_PROFILES;

export class ResellerOfflineCapExceededError extends Error {
    readonly cap: number;

    constructor(cap: number) {
        super(`reseller_offline_cap_exceeded:${cap}`);
        this.name = 'ResellerOfflineCapExceededError';
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
    value
    && typeof value === "object"
    && typeof (value as Partial<TimestampLike>).toDate === "function"
    && typeof (value as Partial<TimestampLike>).seconds === "number"
);

const sanitizeForAdminFirestore = (value: any): any => {
    return sanitizeForFirestore(value, {
        atomicTransform: (atomicValue) => {
            if (!isTimestampLike(atomicValue)) return { handled: false };
            return { handled: true, value: admin.firestore.Timestamp.fromDate(atomicValue.toDate()) };
        },
    });
};

const toResellerProfile = (docSnap: admin.firestore.DocumentSnapshot): ResellerProfile => {
    const { password: _password, ...data } = docSnap.data() || {};
    return { ...data, id: docSnap.id } as ResellerProfile;
};

export const getResellerProfileServer = async (
    userId: string,
    email?: string | null,
): Promise<ResellerProfile | null> => {
    const directSnap = await firestoreAdmin.collection(PROFILES_COLLECTION).doc(userId).get();
    if (directSnap.exists) return toResellerProfile(directSnap);

    const normalizedEmail = email?.toLowerCase()?.trim();
    if (!normalizedEmail) return null;

    const emailSnapshot = await firestoreAdmin
        .collection(PROFILES_COLLECTION)
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();

    if (emailSnapshot.empty) return null;
    return toResellerProfile(emailSnapshot.docs[0]);
};

export const getAllResellerProfilesServer = async (): Promise<ResellerProfile[]> => {
    const snapshot = await firestoreAdmin
        .collection(PROFILES_COLLECTION)
        .orderBy("createdOn", "desc")
        .limit(50)
        .get();

    return snapshot.docs
        .map(toResellerProfile)
        .filter((profile) => !(profile as any).deleted);
};

export const getResellerProfileByIdServer = async (
    profileId: string,
): Promise<ResellerProfile | null> => {
    const docSnap = await firestoreAdmin.collection(PROFILES_COLLECTION).doc(profileId).get();
    if (!docSnap.exists) return null;
    return toResellerProfile(docSnap);
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

        if (operationSnapshot.exists) {
            const operation = operationSnapshot.data() || {};
            if (
                operation.operationId !== params.transaction.operationId
                || operation.operationFingerprint !== params.transaction.operationFingerprint
                || operation.action !== 'ONBOARD'
                || operation.resellerId !== params.transaction.resellerId
                || operation.subscriptionId !== params.subscriptionId
                || !subscriptionSnapshot.exists
            ) {
                throw new Error('Reseller onboarding operation id is already used by another action.');
            }
            return { replayed: true, transactionId: transactionRef.id };
        }

        if (subscriptionSnapshot.exists) {
            throw new Error('Reseller onboarding subscription already exists without its operation ledger.');
        }

        if (profileRef) {
            if (!profileSnapshot?.exists) {
                throw new Error('Reseller profile disappeared during onboarding.');
            }
            const profile = profileSnapshot.data() || {};
            if (profile.active !== true) {
                throw new Error('Reseller profile is no longer active.');
            }
            if (params.transaction.paymentMode === 'offline') {
                const capValue = Number(profile.maxOfflineActivations);
                const cap = Number.isSafeInteger(capValue) && capValue > 0
                    ? capValue
                    : RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER;
                const currentValue = Number(profile.currentActiveOfflineStores);
                const current = Number.isSafeInteger(currentValue) && currentValue > 0
                    ? currentValue
                    : 0;
                if (current >= cap) throw new ResellerOfflineCapExceededError(cap);
            }
        }

        const now = admin.firestore.Timestamp.now();
        firestoreTransaction.create(
            subscriptionRef,
            composeInitialSubscriptionPayloadServer(params.subscription),
        );
        firestoreTransaction.create(transactionRef, sanitizeForAdminFirestore({
            ...params.transaction,
            createdOn: now,
            id: transactionRef.id,
            modifiedOn: now,
        }));

        if (profileRef) {
            const updates: Record<string, unknown> = {
                modifiedOn: now,
                totalStoresOnboarded: admin.firestore.FieldValue.increment(1),
                totalTransactions: admin.firestore.FieldValue.increment(1),
                totalRevenueCollectedPaise: admin.firestore.FieldValue.increment(
                    params.transaction.paymentMode === 'offline'
                        ? params.transaction.amountExpected
                        : 0,
                ),
            };
            if (params.transaction.paymentMode === 'offline') {
                updates.currentActiveOfflineStores = admin.firestore.FieldValue.increment(1);
                updates.totalOfflineStores = admin.firestore.FieldValue.increment(1);
            } else {
                updates.totalOnlineStores = admin.firestore.FieldValue.increment(1);
            }
            firestoreTransaction.update(profileRef, updates);
        }

        return { replayed: false, transactionId: transactionRef.id };
    });
};

export const getResellerProfile = getResellerProfileServer;
export const getAllResellerProfiles = getAllResellerProfilesServer;
export const getResellerProfileById = getResellerProfileByIdServer;
export const createResellerOnboardingBilling = createResellerOnboardingBillingServer;
