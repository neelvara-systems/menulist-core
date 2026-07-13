import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { ResellerProfile, ResellerTransaction } from "@type/reseller";

const TRANSACTIONS_COLLECTION = DB_COLLECTIONS.RESELLER_TRANSACTIONS;
const PROFILES_COLLECTION = DB_COLLECTIONS.RESELLER_PROFILES;

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

const timestampMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (a: ResellerTransaction, b: ResellerTransaction) => (
    timestampMillis(b.createdOn) - timestampMillis(a.createdOn)
);

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

export const updateResellerStatsOnOnboardingServer = async (
    profileId: string,
    paymentMode: "online" | "offline",
    amountPaise: number,
): Promise<void> => {
    const updates: Record<string, any> = {
        totalStoresOnboarded: admin.firestore.FieldValue.increment(1),
        totalTransactions: admin.firestore.FieldValue.increment(1),
        totalRevenueCollectedPaise: admin.firestore.FieldValue.increment(amountPaise),
        modifiedOn: admin.firestore.Timestamp.now(),
    };

    if (paymentMode === "offline") {
        updates.currentActiveOfflineStores = admin.firestore.FieldValue.increment(1);
        updates.totalOfflineStores = admin.firestore.FieldValue.increment(1);
    } else {
        updates.totalOnlineStores = admin.firestore.FieldValue.increment(1);
    }

    await firestoreAdmin.collection(PROFILES_COLLECTION).doc(profileId).update(updates);
};

export const updateResellerStatsOnRenewalServer = async (
    profileId: string,
    amountPaise: number,
): Promise<void> => {
    await firestoreAdmin.collection(PROFILES_COLLECTION).doc(profileId).update({
        totalTransactions: admin.firestore.FieldValue.increment(1),
        totalRevenueCollectedPaise: admin.firestore.FieldValue.increment(amountPaise),
        modifiedOn: admin.firestore.Timestamp.now(),
    });
};

export const createResellerTransactionServer = async (
    transaction: Omit<ResellerTransaction, "id" | "createdOn" | "modifiedOn">,
): Promise<string> => {
    const docRef = firestoreAdmin.collection(TRANSACTIONS_COLLECTION).doc();
    const now = admin.firestore.Timestamp.now();

    await docRef.set(sanitizeForAdminFirestore({
        ...transaction,
        id: docRef.id,
        createdOn: now,
        modifiedOn: now,
    }));

    return docRef.id;
};

export const getResellerTransactionsServer = async (
    resellerId: string,
    maxResults: number = 50,
): Promise<ResellerTransaction[]> => {
    const snapshot = await firestoreAdmin
        .collection(TRANSACTIONS_COLLECTION)
        .where("resellerId", "==", resellerId)
        .limit(maxResults)
        .get();

    return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ResellerTransaction))
        .sort(newestFirst);
};

export const getResellerProfile = getResellerProfileServer;
export const getAllResellerProfiles = getAllResellerProfilesServer;
export const getResellerProfileById = getResellerProfileByIdServer;
export const updateResellerStatsOnOnboarding = updateResellerStatsOnOnboardingServer;
export const updateResellerStatsOnRenewal = updateResellerStatsOnRenewalServer;
export const createResellerTransaction = createResellerTransactionServer;
export const getResellerTransactions = getResellerTransactionsServer;
