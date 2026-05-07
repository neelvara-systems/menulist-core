import { DB_COLLECTIONS } from "@constant/database";
import { collection, getDocs } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { deleteField, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

/**
 * STORES SUMMARY PATTERN
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Single document containing minimal data for all stores.
 * Used by Cloud Functions to avoid N reads when processing all stores.
 * 
 * Document: platformSummary/storesSummary
 * 
 * Structure:
 * {
 *   lastUpdated: Timestamp,
 *   stores: {
 *     "storeId": { tId: number, businessType: string, active: boolean, name: string, tenantName: string }
 *   }
 * }
 * 
 * See: __docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md
 */

export interface StoreSummaryData {
    tId: number;
    businessType: string;
    businessCategory: string;  // Derived from businessType, used by Cloud Functions
    active: boolean;
    name: string;
    tenantName?: string;
    isMaster?: boolean;
    outletSlug?: string;
    city?: string;
    addressLine?: string;
    logo?: string;
    workingHours?: Record<string, string>;
    timeZone?: string;         // IANA timezone (e.g., 'Asia/Kolkata') — used for DST-safe runtime scheduling
    businessDayEndTime?: string; // Store-local HH:mm analytics business-day cutoff
    schedulerHour?: number;    // UTC hour (0-23) — FALLBACK ONLY when timeZone is missing
    activePlanType?: string;    // Denormalized billing plan id for scheduler entitlements, e.g. 'starter' | 'pro' | 'premium'
    modifiedOn?: any;
}

export interface StoresSummary {
    lastUpdated: any;
    stores: Record<string, StoreSummaryData>;
}

const COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getPlatformSummaryDocRef = () => {
    return doc(firebaseClient, `${COLLECTION}`, 'default')
}

export const getPlatformSummary = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return list[0];
        },
        "getPlatformSummary"
    );
}

export const updateTenantsCountInPlatformSummary = async () => {
    return await apiCallComposer(
        async () => {

            const ref = await getPlatformSummaryDocRef();
            const docSnap = await getDoc(ref);
            if (docSnap.exists()) {
                console.log("docSnap.data()", docSnap.data())
                await updateDoc(ref, { 'tenants.count': increment(1) });
            } else {
                //for the first time in life
                await setDoc(ref, { tenants: { count: 0 } });
            }
            return true;
        },
        "updateTenantsCountInPlatformSummary"
    );
}


export const updateStoresCountInPlatformSummary = async () => {
    return await apiCallComposer(
        async () => {

            const ref = await getPlatformSummaryDocRef();
            const docSnap = await getDoc(ref);
            if (docSnap.exists()) {
                console.log("docSnap.data()", docSnap.data())
                await updateDoc(ref, { 'stores.count': increment(1) });
            } else {
                //for the first time in life
                await setDoc(ref, { stores: { count: 0 } });
            }
            return true;
        },
        "updateStoresCountInPlatformSummary"
    );
}


export const updateStoresAndTenantsCountInPlatformSummary = async () => {
    return await apiCallComposer(
        async () => {

            const ref = await getPlatformSummaryDocRef();
            const docSnap = await getDoc(ref);
            if (docSnap.exists()) {
                console.log("docSnap.data()", docSnap.data())
                await updateDoc(ref, {
                    'stores.count': increment(1),
                    'tenants.count': increment(1),
                });
            } else {
                //for the first time in life
                await setDoc(ref, { stores: { count: 0 }, tenants: { count: 0 } });
            }
            return true;
        },
        "updateStoresAndTenantsCountInPlatformSummary"
    );
}


// ============================
// STORES SUMMARY (Cost Optimization)
// ============================

const getStoresSummaryDocRef = () => {
    return doc(firebaseClient, `${COLLECTION}`, 'storesSummary')
}

/**
 * Get all stores summary data (1 read instead of N)
 * Used by Cloud Functions for batch processing
 */
export const getStoresSummary = async (): Promise<StoresSummary | null> => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(getStoresSummaryDocRef());
            if (docSnap.exists()) {
                return docSnap.data() as StoresSummary;
            }
            return null;
        },
        "getStoresSummary"
    );
}

/**
 * Sync a single store to the summary document
 * Called after addStore() or updateStore()
 */
export const syncStoreToSummary = async (storeId: string | number, data: StoreSummaryData) => {
    return await apiCallComposer(
        async () => {
            const ref = getStoresSummaryDocRef();
            const summaryEntry: Record<string, any> = {
                [`stores.${storeId}.tId`]: data.tId,
                [`stores.${storeId}.businessType`]: data.businessType || 'unknown',
                [`stores.${storeId}.businessCategory`]: data.businessCategory || 'specialty',
                [`stores.${storeId}.active`]: data.active ?? true,
                [`stores.${storeId}.name`]: data.name || '',
                [`stores.${storeId}.tenantName`]: data.tenantName || '',
            };
            // Include timeZone for DST-safe runtime scheduling in CF
            if (data.timeZone) {
                summaryEntry[`stores.${storeId}.timeZone`] = data.timeZone;
            }
            if (data.businessDayEndTime) {
                summaryEntry[`stores.${storeId}.businessDayEndTime`] = data.businessDayEndTime;
            }
            if (data.isMaster !== undefined) {
                summaryEntry[`stores.${storeId}.isMaster`] = data.isMaster;
            }
            if (data.outletSlug !== undefined) {
                summaryEntry[`stores.${storeId}.outletSlug`] = data.outletSlug;
            }
            if (data.city !== undefined) {
                summaryEntry[`stores.${storeId}.city`] = data.city || '';
            }
            if (data.addressLine !== undefined) {
                summaryEntry[`stores.${storeId}.addressLine`] = data.addressLine || '';
            }
            if (data.logo !== undefined) {
                summaryEntry[`stores.${storeId}.logo`] = data.logo || '';
            }
            if (data.workingHours !== undefined) {
                summaryEntry[`stores.${storeId}.workingHours`] = data.workingHours || {};
            }
            // schedulerHour is FALLBACK only (for stores without timeZone)
            if (data.schedulerHour !== undefined) {
                summaryEntry[`stores.${storeId}.schedulerHour`] = data.schedulerHour;
            }
            if (data.activePlanType !== undefined) {
                summaryEntry[`stores.${storeId}.activePlanType`] = data.activePlanType;
            }
            if (data.modifiedOn !== undefined) {
                summaryEntry[`stores.${storeId}.modifiedOn`] = data.modifiedOn;
            }
            await setDoc(ref, {
                lastUpdated: serverTimestamp(),
                ...summaryEntry
            }, { merge: true });
            return true;
        },
        { storeId, data },
        "syncStoreToSummary"
    );
}

/**
 * Remove a store from the summary document
 * Called after deleteStore() or when deactivating
 */
export const removeStoreFromSummary = async (storeId: string | number) => {
    return await apiCallComposer(
        async () => {
            const ref = getStoresSummaryDocRef();
            await updateDoc(ref, {
                lastUpdated: serverTimestamp(),
                [`stores.${storeId}`]: deleteField()
            });
            return true;
        },
        { storeId },
        "removeStoreFromSummary"
    );
}

/**
 * Update store active status in summary
 * Called when store is activated/deactivated
 */
export const updateStoreActiveStatusInSummary = async (storeId: string | number, active: boolean) => {
    return await apiCallComposer(
        async () => {
            const ref = getStoresSummaryDocRef();
            await updateDoc(ref, {
                lastUpdated: serverTimestamp(),
                [`stores.${storeId}.active`]: active
            });
            return true;
        },
        { storeId, active },
        "updateStoreActiveStatusInSummary"
    );
}
