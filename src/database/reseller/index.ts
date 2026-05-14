import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { ResellerProfile, ResellerTransaction } from "@type/reseller";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard — Data Access Layer
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §2
// ═══════════════════════════════════════════════════════════════

const TRANSACTIONS_COLLECTION = DB_COLLECTIONS.RESELLER_TRANSACTIONS;
const PROFILES_COLLECTION = DB_COLLECTIONS.RESELLER_PROFILES;

// --- Collection Refs ---

const getTransactionsCollectionRef = () => {
    return collection(firebaseClient, TRANSACTIONS_COLLECTION);
};

const getProfilesCollectionRef = () => {
    return collection(firebaseClient, PROFILES_COLLECTION);
};

const getProfileDocRef = (profileId: string) => {
    return doc(firebaseClient, PROFILES_COLLECTION, profileId);
};

const getTransactionDocRef = (docId: string) => {
    return doc(firebaseClient, TRANSACTIONS_COLLECTION, docId);
};

const toResellerProfile = (docSnap: { data: () => any; id: string }): ResellerProfile => {
    const { password: _password, ...data } = docSnap.data();
    return { ...data, id: docSnap.id } as ResellerProfile;
};

const timestampMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (a: ResellerTransaction, b: ResellerTransaction) => timestampMillis(b.createdOn) - timestampMillis(a.createdOn);

// ═══════════════════════════════════════════════════════════════
// RESELLER PROFILE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get reseller profile by auth user ID or managed profile email.
 * Managed reseller profiles are created by platform admins and may use auto IDs,
 * so email fallback is required for real reseller login accounts.
 * Firebase cost: 1-2 READS
 */
export const getResellerProfile = async (userId: string, email?: string | null): Promise<ResellerProfile | null> => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(getProfileDocRef(userId));
            if (docSnap.exists()) return toResellerProfile(docSnap);

            const normalizedEmail = email?.toLowerCase()?.trim();
            if (!normalizedEmail) return null;

            const q = query(
                getProfilesCollectionRef(),
                where("email", "==", normalizedEmail),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const profileDoc = snapshot.docs[0];
            return toResellerProfile(profileDoc);
        },
        { userId, email },
        "getResellerProfile"
    );
};

/**
 * Increment the concurrent active offline stores count for a reseller
 * Firebase cost: 1 WRITE
 */
export const incrementResellerOfflineCount = async (userId: string): Promise<void> => {
    return await apiCallComposer(
        async () => {
            await updateDoc(getProfileDocRef(userId), {
                currentActiveOfflineStores: increment(1),
                totalStoresOnboarded: increment(1),
                modifiedOn: Timestamp.now(),
            });
        },
        { userId },
        "incrementResellerOfflineCount"
    );
};

/**
 * Decrement the concurrent active offline stores count (when a store expires)
 * Firebase cost: 1 WRITE
 */
export const decrementResellerOfflineCount = async (userId: string): Promise<void> => {
    return await apiCallComposer(
        async () => {
            await updateDoc(getProfileDocRef(userId), {
                currentActiveOfflineStores: increment(-1),
                modifiedOn: Timestamp.now(),
            });
        },
        { userId },
        "decrementResellerOfflineCount"
    );
};

/**
 * Increment total stores onboarded (for online mode — no offline cap change)
 * Firebase cost: 1 WRITE
 */
export const incrementResellerOnlineCount = async (userId: string): Promise<void> => {
    return await apiCallComposer(
        async () => {
            await updateDoc(getProfileDocRef(userId), {
                totalStoresOnboarded: increment(1),
                modifiedOn: Timestamp.now(),
            });
        },
        { userId },
        "incrementResellerOnlineCount"
    );
};

/**
 * Create a new reseller profile
 * Firebase cost: 1 WRITE
 */
export const createResellerProfile = async (
    profile: Omit<ResellerProfile, "id" | "createdOn" | "modifiedOn" | "activatedAt" | "currentActiveOfflineStores" | "totalStoresOnboarded" | "totalOnlineStores" | "totalOfflineStores" | "totalRevenueCollectedPaise" | "totalTransactions">
): Promise<string> => {
    return await apiCallComposer(
        async () => {
            const collRef = getProfilesCollectionRef();
            const newDocRef = doc(collRef);
            const now = Timestamp.now();
            await setDoc(newDocRef, {
                ...profile,
                id: newDocRef.id,
                currentActiveOfflineStores: 0,
                totalStoresOnboarded: 0,
                totalOnlineStores: 0,
                totalOfflineStores: 0,
                totalRevenueCollectedPaise: 0,
                totalTransactions: 0,
                activatedAt: now,
                createdOn: now,
                modifiedOn: now,
            });
            return newDocRef.id;
        },
        profile,
        "createResellerProfile"
    );
};

/**
 * Update reseller profile (personal details, caps, notes)
 * Firebase cost: 1 WRITE
 */
export const updateResellerProfile = async (
    profileId: string,
    updates: Partial<Omit<ResellerProfile, "id" | "createdOn" | "activatedAt">>
): Promise<void> => {
    return await apiCallComposer(
        async () => {
            await updateDoc(doc(firebaseClient, PROFILES_COLLECTION, profileId), {
                ...updates,
                modifiedOn: Timestamp.now(),
            });
        },
        { profileId, updates },
        "updateResellerProfile"
    );
};

/**
 * Get all reseller profiles (for platform admin view)
 * Firebase cost: 1 READ (query)
 */
export const getAllResellerProfiles = async (): Promise<ResellerProfile[]> => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getProfilesCollectionRef(),
                orderBy("createdOn", "desc"),
                limit(50)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(toResellerProfile).filter(profile => !(profile as any).deleted);
        },
        {},
        "getAllResellerProfiles"
    );
};

/**
 * Get reseller profile by document ID (not userId)
 * Firebase cost: 1 READ
 */
export const getResellerProfileById = async (profileId: string): Promise<ResellerProfile | null> => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(doc(firebaseClient, PROFILES_COLLECTION, profileId));
            if (!docSnap.exists()) return null;
            return toResellerProfile(docSnap);
        },
        { profileId },
        "getResellerProfileById"
    );
};

/**
 * Update reseller stats after a successful onboarding (atomic increment)
 * Firebase cost: 1 WRITE
 */
export const updateResellerStatsOnOnboarding = async (
    profileId: string,
    paymentMode: 'online' | 'offline',
    amountPaise: number,
): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const updates: Record<string, any> = {
                totalStoresOnboarded: increment(1),
                totalTransactions: increment(1),
                totalRevenueCollectedPaise: increment(amountPaise),
                modifiedOn: Timestamp.now(),
            };
            if (paymentMode === 'offline') {
                updates.currentActiveOfflineStores = increment(1);
                updates.totalOfflineStores = increment(1);
            } else {
                updates.totalOnlineStores = increment(1);
            }
            await updateDoc(doc(firebaseClient, PROFILES_COLLECTION, profileId), updates);
        },
        { profileId, paymentMode, amountPaise },
        "updateResellerStatsOnOnboarding"
    );
};

/**
 * Update reseller revenue stats after a renewal.
 * Firebase cost: 1 WRITE
 */
export const updateResellerStatsOnRenewal = async (
    profileId: string,
    amountPaise: number,
): Promise<void> => {
    return await apiCallComposer(
        async () => {
            await updateDoc(doc(firebaseClient, PROFILES_COLLECTION, profileId), {
                totalTransactions: increment(1),
                totalRevenueCollectedPaise: increment(amountPaise),
                modifiedOn: Timestamp.now(),
            });
        },
        { profileId, amountPaise },
        "updateResellerStatsOnRenewal"
    );
};

// ═══════════════════════════════════════════════════════════════
// RESELLER TRANSACTION OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create an immutable reseller transaction record
 * Firebase cost: 1 WRITE
 */
export const createResellerTransaction = async (
    transaction: Omit<ResellerTransaction, "id" | "createdOn" | "modifiedOn">
): Promise<string> => {
    const collRef = getTransactionsCollectionRef();
    const newDocRef = doc(collRef);
    const now = Timestamp.now();
    await setDoc(newDocRef, {
        ...transaction,
        id: newDocRef.id,
        createdOn: now,
        modifiedOn: now,
    });
    return newDocRef.id;
};

/**
 * Update transaction status only (immutability: only status field changes)
 * Firebase cost: 1 WRITE
 */
export const updateResellerTransactionStatus = async (
    transactionId: string,
    status: ResellerTransaction["status"]
): Promise<void> => {
    return await apiCallComposer(
        async () => {
            await updateDoc(getTransactionDocRef(transactionId), {
                status,
                modifiedOn: Timestamp.now(),
            });
        },
        { transactionId, status },
        "updateResellerTransactionStatus"
    );
};

/**
 * Get all transactions for a specific reseller (ordered by newest first)
 * Firebase cost: 1 READ (query)
 */
export const getResellerTransactions = async (
    resellerId: string,
    maxResults: number = 50
): Promise<ResellerTransaction[]> => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getTransactionsCollectionRef(),
                where("resellerId", "==", resellerId),
                limit(maxResults)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as ResellerTransaction))
                .sort(newestFirst);
        },
        { resellerId },
        "getResellerTransactions"
    );
};

/**
 * Get transactions for a specific store by a specific reseller
 * Firebase cost: 1 READ (query)
 */
export const getResellerTransactionsForStore = async (
    resellerId: string,
    storeId: number
): Promise<ResellerTransaction[]> => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getTransactionsCollectionRef(),
                where("resellerId", "==", resellerId),
                where("storeId", "==", storeId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as ResellerTransaction))
                .sort(newestFirst);
        },
        { resellerId, storeId },
        "getResellerTransactionsForStore"
    );
};

/**
 * Get all transactions across all resellers (founder view)
 * Firebase cost: 1 READ (query)
 */
export const getAllResellerTransactions = async (
    maxResults: number = 100
): Promise<ResellerTransaction[]> => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getTransactionsCollectionRef(),
                orderBy("createdOn", "desc"),
                limit(maxResults)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ResellerTransaction));
        },
        {},
        "getAllResellerTransactions"
    );
};
