import { getDefaultTimeSlotPresets } from "@config/defaultTimeSlotPresets";
import { getBusinessCategory } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { createDefaultRoles } from "@data/defaultRoles";
import { syncStoreToSummary, updateStoresCountInPlatformSummary } from "@database/platformSummary";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDocs, query, where } from "@firebase/firestore";
import { resolveBusinessDayEndTime } from "@lib/analytics/businessDay";
import { TrackingEvent, trackEvent } from "@lib/analytics/unified";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { normalizeStoreLanguagePolicy } from "@lib/localization/languagePolicy";
import { generateOwnCustomUid } from "@lib/utils/generateOwnCustomUid";
import { computeSchedulerHour } from "@lib/utils/schedulerHour";
import { TimeSlotPreset } from "@type/platform/store";
import { deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.STORES;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, `${docId}`)
}

export const getAllStores = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllStores"
    );
}

export const getAllStoresByTenantId = async (tenantId: any) => {
    return await apiCallComposer(
        async () => {
            const ref = query(await getCollectionRef(), where("tenantId", "==", tenantId));
            const querySnapshot = await getDocs(ref);
            if (querySnapshot.empty) {
                console.log(`${tenantId} : Stores not available getAllStoresByTenantId`);
                return ([]);
            } else {
                const list: any = [];
                querySnapshot.forEach((doc) => {
                    list.push({ ...doc.data(), id: doc.id })
                });
                return (list)
            }
        },
        tenantId,
        "getAllStoresByTenantId"
    );
}

export const getStoreById = async (id: number) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = await getDocRef(id);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null
            }
        },
        id,
        "getStoreById"
    );
}

export const checkCustomDomainAvailability = async (
    domain: string,
    currentStoreId?: number
) => {
    return await apiCallComposer(
        async () => {
            const normalizedDomain = domain.toLowerCase().trim();
            const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

            if (!normalizedDomain || normalizedDomain.length < 4 || normalizedDomain.length > 253 || !domainRegex.test(normalizedDomain)) {
                return {
                    available: false,
                    normalized: normalizedDomain,
                    reason: "Invalid domain format. Example: yourbusiness.com",
                };
            }

            const storesRef = collection(firebaseClient, COLLECTION);
            const q = query(
                storesRef,
                where('customDomain', '==', normalizedDomain),
                where('active', '==', true)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const existingStoreId = snapshot.docs[0].data()?.storeId;
                if (existingStoreId !== currentStoreId) {
                    return {
                        available: false,
                        normalized: normalizedDomain,
                        reason: "This domain is already linked to another store",
                    };
                }
            }

            return {
                available: true,
                normalized: normalizedDomain,
            };
        },
        { currentStoreId, domain },
        "checkCustomDomainAvailability"
    );
}

const updateLogoImage = async (data) => {

    let logoUrl: any = '';
    let imageType: any = data.imageType;
    let imageToUpdate: any = data.imageToUpdate;

    delete data.imageToUpdate;
    delete data.imageType;
    const docId = data.storeId//which is storeId
    const docRef = await getDocRef(`${docId}`);

    if (imageToUpdate) {
        if (imageToUpdate?.includes('base64')) {
            //upload logo image to firebase storage
            logoUrl = await uploadBase64ToStorage({
                fileId: docId,
                url: imageToUpdate,
                path: `${COLLECTION}/logos/${docId}`,
                type: imageType
            })
        }
        return logoUrl;
    } else return "";
}

export const addStore = async (data: any, from: string = "") => {
    return await apiCallComposer(
        async () => {
            if ('activeLanguages' in data || 'defaultLanguage' in data || 'language' in data) {
                const normalizedLanguagePolicy = normalizeStoreLanguagePolicy(data);
                data.activeLanguages = normalizedLanguagePolicy.activeLanguages;
                data.defaultLanguage = normalizedLanguagePolicy.defaultLanguage;
            }

            data.id = data.storeId
            if (data.imageToUpdate) {
                const newUrl = await updateLogoImage(data)
                data.logo = newUrl;
                delete data.imageToUpdate;
                delete data.imageType;
            }

            // Assign default time slot presets based on business type
            if (!data.timeSlotPresets && data.businessType && data.tenantId && data.storeId) {
                data.timeSlotPresets = getDefaultTimeSlotPresets(
                    data.businessType,
                    data.tenantId,
                    data.storeId
                );
            }

            // Assign default roles if not provided (Owner, Manager, Staff)
            // Skip if from onboarding (roles already created in transaction)
            if (!data.roles && from !== "onboarding") {
                const createdBy = data.email || data.createdBy || 'system';
                data.roles = createDefaultRoles(data.storeId, createdBy);
            }

            // Derive businessCategory from businessType if not provided
            const businessCategory = data.businessCategory || getBusinessCategory(data.businessType || '');
            data.businessCategory = businessCategory;

            data.businessDayEndTime = resolveBusinessDayEndTime(data.businessType, data.businessDayEndTime);

            // Auto-compute schedulerHour from timezone/EOD if not explicitly set
            const schedulerHour = data.schedulerHour ?? computeSchedulerHour(data.timeZone, data.businessDayEndTime);
            data.schedulerHour = schedulerHour;

            await setDoc(getDocRef(data.id), await requestBodyComposer(data));
            if (from != "onboarding") {
                await updateStoresCountInPlatformSummary()
            }

            // Sync to storesSummary for Cloud Function optimization
            // See: __docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md
            await syncStoreToSummary(data.storeId, {
                tId: data.tenantId,
                businessType: data.businessType || 'unknown',
                businessCategory,
                active: true,
                name: data.name || '',
                timeZone: data.timeZone,
                businessDayEndTime: data.businessDayEndTime,
                schedulerHour,
                activePlanType: data.activePlanType,
            });

            return ({ ...data })
        },
        data,
        "addStore"
    );
}

export const updateStore = async (data: any) => {
    return await apiCallComposer(
        async () => {
            let currentStoreData: any | null = null;
            const getCurrentStoreData = async () => {
                if (!currentStoreData) {
                    const currentSnap = await getDoc(getDocRef(data.id));
                    currentStoreData = currentSnap.exists() ? currentSnap.data() : {};
                }
                return currentStoreData || {};
            };

            if ('activeLanguages' in data || 'defaultLanguage' in data || 'language' in data) {
                const normalizedLanguagePolicy = normalizeStoreLanguagePolicy(data);
                data.activeLanguages = normalizedLanguagePolicy.activeLanguages;
                data.defaultLanguage = normalizedLanguagePolicy.defaultLanguage;
            }

            data.id = data.storeId
            if (data.imageToUpdate) {
                const newUrl = await updateLogoImage(data)
                data.logo = newUrl;
                delete data.imageToUpdate;
                delete data.imageType;
            }

            // G-08 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): subdomain is a permanent
            // URL anchor once the store has ever been published. Renaming it
            // would silently break every printed QR, every shared link, and
            // every search-indexed URL. If the caller is trying to mutate
            // `subdomain` on a store that already has `lastPublishedAt`, drop
            // that field from the update and warn — all other updates go
            // through untouched so the save still succeeds.
            if (data.subdomain !== undefined) {
                try {
                    const current: any = await getCurrentStoreData();
                    const wasPublished = !!current?.lastPublishedAt;
                    const subdomainChanged = (current?.subdomain || '') !== data.subdomain;
                    if (wasPublished && subdomainChanged) {
                        console.warn(
                            `[G-08] Blocked subdomain change on published store ${data.id}: ` +
                            `${current?.subdomain} → ${data.subdomain}. Subdomain is immutable after first publish.`,
                        );
                        // T5-N-02: Emit analytics event for security/support signal.
                        // Fire-and-forget: don't block the save if tracking fails.
                        trackEvent(TrackingEvent.SUBDOMAIN_MUTATION_BLOCKED, {
                            storeId: data.id,
                            tenantId: data.tenantId,
                            attemptedSubdomain: data.subdomain,
                            currentSubdomain: current?.subdomain,
                        }).catch(() => { /* silent — analytics failure shouldn't block save */ });
                        delete data.subdomain;
                    }
                } catch (e) {
                    // Non-fatal: if the guard read fails, allow the update
                    // rather than locking owners out of every settings save.
                    console.warn('[G-08] Could not verify publish status; allowing update:', e);
                }
            }

            const summaryFields = ['businessType', 'businessCategory', 'active', 'name', 'timeZone', 'businessDayEndTime', 'schedulerHour', 'activePlanType'];
            const hasSummaryFieldChanges = summaryFields.some(field => data[field] !== undefined);
            const needsSchedulerRecompute = data.timeZone !== undefined || data.businessDayEndTime !== undefined;
            const existingStore = hasSummaryFieldChanges || needsSchedulerRecompute ? await getCurrentStoreData() : {};
            const effectiveBusinessType = data.businessType ?? existingStore.businessType;
            const effectiveTimeZone = data.timeZone ?? existingStore.timeZone;
            const effectiveBusinessDayEndTime = data.businessDayEndTime ?? existingStore.businessDayEndTime;

            // Derive businessCategory from businessType if not provided
            const businessCategory = data.businessCategory || getBusinessCategory(effectiveBusinessType || '');
            data.businessCategory = businessCategory;

            if (data.businessDayEndTime !== undefined) {
                data.businessDayEndTime = resolveBusinessDayEndTime(effectiveBusinessType, data.businessDayEndTime);
            }

            // Recompute schedulerHour before writing store doc so store and summary stay aligned.
            if (needsSchedulerRecompute) {
                const nextBusinessDayEndTime = resolveBusinessDayEndTime(effectiveBusinessType, data.businessDayEndTime ?? effectiveBusinessDayEndTime);
                data.businessDayEndTime = nextBusinessDayEndTime;
                data.schedulerHour = data.schedulerHour ?? computeSchedulerHour(effectiveTimeZone, nextBusinessDayEndTime);
            }

            await updateDoc(getDocRef(data.id), await requestBodyComposer(data));

            // Sync to storesSummary for Cloud Function optimization
            // See: __docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md
            // Only sync if summary-relevant fields are present in the update
            const summaryTenantId = data.tenantId ?? existingStore.tenantId;

            if (hasSummaryFieldChanges && summaryTenantId) {
                await syncStoreToSummary(data.storeId, {
                    tId: summaryTenantId,
                    businessType: effectiveBusinessType || 'unknown',
                    businessCategory,
                    active: data.active ?? existingStore.active ?? true,
                    name: data.name ?? existingStore.name ?? '',
                    timeZone: data.timeZone ?? existingStore.timeZone,
                    businessDayEndTime: data.businessDayEndTime ?? existingStore.businessDayEndTime,
                    schedulerHour: data.schedulerHour ?? existingStore.schedulerHour,
                    activePlanType: data.activePlanType ?? existingStore.activePlanType,
                });
            } else if (!summaryTenantId) {
                console.warn('Skipping syncStoreToSummary: tenantId is undefined for store', data.storeId);
            }
            // Skip sync if no summary-relevant fields present in update

            return data;
        },
        data,
        "updateStore"
    );
}

// ============================
// TIME SLOT PRESETS
// ============================

/**
 * Generate a unique ID for a time slot preset
 * Format: {tenantId}{random3chars}{storeId} e.g., "1ABC15"
 */
export const generatePresetId = (tenantId: number, storeId: number) =>
    generateOwnCustomUid(tenantId, storeId);

/**
 * Update time slot presets for a store
 * Uses merge: true to only update the timeSlotPresets field
 * 
 * Note: storeDetails is already fetched in PlatformGlobalDataContext
 * Callers should get existing presets from context, modify locally, then call this to persist
 */
export const updateTimeSlotPresets = async (storeId: number, timeSlotPresets: TimeSlotPreset[]) => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(`${storeId}`);
            await setDoc(docRef, { timeSlotPresets }, { merge: true });
            return timeSlotPresets;
        },
        { storeId, timeSlotPresets },
        "updateTimeSlotPresets"
    );
};

// ============================
// MENU PRESENCE MONITOR
// @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
// ============================

export type MenuPresenceSurface = 'googleBusiness' | 'instagramBio' | 'whatsappProfile';

/**
 * Update a manual presence confirmation for a specific surface.
 * Timestamp-only schema: exists = confirmed, missing = not confirmed.
 * Persists on the store document under `menuPresence.{surface}`.
 */
export const updateMenuPresence = async (
    storeId: number,
    surface: MenuPresenceSurface,
    confirmed: boolean
) => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(`${storeId}`);
            if (confirmed) {
                await updateDoc(docRef, {
                    [`menuPresence.${surface}`]: new Date().toISOString(),
                });
            } else {
                await updateDoc(docRef, {
                    [`menuPresence.${surface}`]: deleteField(),
                });
            }
            return { surface, confirmed };
        },
        { storeId, surface, confirmed },
        "updateMenuPresence"
    );
};
