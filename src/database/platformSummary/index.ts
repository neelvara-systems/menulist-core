import { DB_COLLECTIONS } from "@constant/database";
import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
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
 *     "storeId": { tId: number, businessType: string, active: boolean, name: string, tenantName: string, subdomain?: string }
 *   }
 * }
 * 
 * See: __docs__/patterns/summary-document-pattern.md
 */

export interface StoreSummaryData {
    tId: number;
    businessType: string;
    businessCategory: string;  // Derived from businessType, used by Cloud Functions
    active: boolean;
    blocked?: boolean;
    tenantBlocked?: boolean;
    name: string;
    tenantName?: string;
    subdomain?: string;
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
    menuPresence?: StoreDistributionPresenceSummary;
    presence?: StoreDistributionPresenceSummary;
    modifiedOn?: any;
}

type StorePresenceValue = boolean | string | null | { linked?: boolean | null };

export type StoreDistributionPresenceSummary = {
    appleBusiness?: StorePresenceValue;
    bingPlaces?: StorePresenceValue;
    googleBusiness?: StorePresenceValue;
    instagramBio?: StorePresenceValue;
    qrCodeInstalled?: StorePresenceValue;
    qrInstalled?: StorePresenceValue;
    websiteLinked?: StorePresenceValue;
    websiteMenuLink?: StorePresenceValue;
    whatsappProfile?: StorePresenceValue;
    instagramLinked?: StorePresenceValue;
    instagramBioLinked?: StorePresenceValue;
    whatsappLinked?: StorePresenceValue;
    whatsappMenuLinked?: StorePresenceValue;
};

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

const STORE_DISTRIBUTION_PRESENCE_KEYS: Array<keyof StoreDistributionPresenceSummary> = [
    'appleBusiness',
    'bingPlaces',
    'googleBusiness',
    'instagramBio',
    'qrCodeInstalled',
    'qrInstalled',
    'websiteLinked',
    'websiteMenuLink',
    'whatsappProfile',
    'instagramLinked',
    'instagramBioLinked',
    'whatsappLinked',
    'whatsappMenuLinked',
];

const normalizePresenceValue = (value: unknown): StorePresenceValue | undefined => {
    if (value === null) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().slice(0, 120);
        return normalized || null;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const linked = (value as { linked?: unknown }).linked;
        if (linked === null) {
            return { linked: null };
        }
        if (typeof linked === 'boolean') {
            return { linked };
        }
    }
    return undefined;
};

export const buildStoreDistributionPresenceSummary = (
    value: unknown,
): StoreDistributionPresenceSummary | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const summary = STORE_DISTRIBUTION_PRESENCE_KEYS.reduce<StoreDistributionPresenceSummary>((acc, key) => {
        if (!Object.prototype.hasOwnProperty.call(source, key)) return acc;
        const normalized = normalizePresenceValue(source[key]);
        if (normalized !== undefined) {
            acc[key] = normalized;
        }
        return acc;
    }, {});

    return Object.keys(summary).length > 0 ? summary : undefined;
};

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
            const businessCategory = resolveStoreBusinessCategory(data.businessType, data.businessCategory);
            const summaryEntry: Record<string, any> = {
                tId: data.tId,
                businessType: data.businessType || 'unknown',
                businessCategory,
                active: data.active ?? true,
                blocked: data.blocked ?? false,
                name: data.name || '',
                tenantName: data.tenantName || '',
            };
            if (data.subdomain !== undefined) {
                summaryEntry.subdomain = data.subdomain || '';
            }
            // Include timeZone for DST-safe runtime scheduling in CF
            if (data.timeZone) {
                summaryEntry.timeZone = data.timeZone;
            }
            if (data.businessDayEndTime) {
                summaryEntry.businessDayEndTime = data.businessDayEndTime;
            }
            if (data.isMaster !== undefined) {
                summaryEntry.isMaster = data.isMaster;
            }
            if (data.outletSlug !== undefined) {
                summaryEntry.outletSlug = data.outletSlug;
            }
            if (data.city !== undefined) {
                summaryEntry.city = data.city || '';
            }
            if (data.addressLine !== undefined) {
                summaryEntry.addressLine = data.addressLine || '';
            }
            if (data.logo !== undefined) {
                summaryEntry.logo = data.logo || '';
            }
            if (data.workingHours !== undefined) {
                summaryEntry.workingHours = data.workingHours || {};
            }
            // schedulerHour is FALLBACK only (for stores without timeZone)
            if (data.schedulerHour !== undefined) {
                summaryEntry.schedulerHour = data.schedulerHour;
            }
            if (data.activePlanType !== undefined) {
                summaryEntry.activePlanType = data.activePlanType;
            }
            if (data.menuPresence !== undefined) {
                summaryEntry.menuPresence = buildStoreDistributionPresenceSummary(data.menuPresence) || {};
            }
            if (data.presence !== undefined) {
                summaryEntry.presence = buildStoreDistributionPresenceSummary(data.presence) || {};
            }
            if (data.modifiedOn !== undefined) {
                summaryEntry.modifiedOn = data.modifiedOn;
            }
            await setDoc(ref, {
                lastUpdated: serverTimestamp(),
                stores: {
                    [storeId]: summaryEntry,
                },
            }, { merge: true });
            return true;
        },
        { storeId, data },
        "syncStoreToSummary"
    );
}

/**
 * Merge a partial store summary update without rebuilding the full summary row.
 * Use for cross-store propagation paths where the changed fields are already known.
 */
export const mergeStoreSummaryFields = async (storeId: string | number, data: Partial<StoreSummaryData>) => {
    return await apiCallComposer(
        async () => {
            const ref = getStoresSummaryDocRef();
            const summaryEntry: Record<string, any> = {};

            if (data.tId !== undefined) {
                summaryEntry.tId = data.tId;
            }
            if (data.businessType !== undefined) {
                summaryEntry.businessType = data.businessType || 'unknown';
            }
            if (data.businessType !== undefined || data.businessCategory !== undefined) {
                summaryEntry.businessCategory = resolveStoreBusinessCategory(data.businessType, data.businessCategory);
            }
            if (data.active !== undefined) {
                summaryEntry.active = data.active;
            }
            if (data.blocked !== undefined) {
                summaryEntry.blocked = data.blocked;
            }
            if (data.tenantBlocked !== undefined) {
                summaryEntry.tenantBlocked = data.tenantBlocked;
            }
            if (data.name !== undefined) {
                summaryEntry.name = data.name || '';
            }
            if (data.tenantName !== undefined) {
                summaryEntry.tenantName = data.tenantName || '';
            }
            if (data.subdomain !== undefined) {
                summaryEntry.subdomain = data.subdomain || '';
            }
            if (data.isMaster !== undefined) {
                summaryEntry.isMaster = data.isMaster;
            }
            if (data.outletSlug !== undefined) {
                summaryEntry.outletSlug = data.outletSlug;
            }
            if (data.city !== undefined) {
                summaryEntry.city = data.city || '';
            }
            if (data.addressLine !== undefined) {
                summaryEntry.addressLine = data.addressLine || '';
            }
            if (data.logo !== undefined) {
                summaryEntry.logo = data.logo || '';
            }
            if (data.workingHours !== undefined) {
                summaryEntry.workingHours = data.workingHours || {};
            }
            if (data.timeZone !== undefined) {
                summaryEntry.timeZone = data.timeZone || '';
            }
            if (data.businessDayEndTime !== undefined) {
                summaryEntry.businessDayEndTime = data.businessDayEndTime || '';
            }
            if (data.schedulerHour !== undefined) {
                summaryEntry.schedulerHour = data.schedulerHour;
            }
            if (data.activePlanType !== undefined) {
                summaryEntry.activePlanType = data.activePlanType;
            }
            if (data.menuPresence !== undefined) {
                summaryEntry.menuPresence = buildStoreDistributionPresenceSummary(data.menuPresence) || {};
            }
            if (data.presence !== undefined) {
                summaryEntry.presence = buildStoreDistributionPresenceSummary(data.presence) || {};
            }
            if (data.modifiedOn !== undefined) {
                summaryEntry.modifiedOn = data.modifiedOn;
            }

            if (Object.keys(summaryEntry).length === 0) {
                return false;
            }

            if (summaryEntry.modifiedOn === undefined) {
                summaryEntry.modifiedOn = serverTimestamp();
            }

            await setDoc(ref, {
                lastUpdated: serverTimestamp(),
                stores: {
                    [storeId]: summaryEntry,
                },
            }, { merge: true });
            return true;
        },
        { storeId, data },
        "mergeStoreSummaryFields"
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
