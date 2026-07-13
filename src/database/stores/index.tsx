import { getDefaultTimeSlotPresets } from "@config/defaultTimeSlotPresets";
import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import { DB_COLLECTIONS } from "@constant/database";
import { createDefaultRoles } from "@data/defaultRoles";
import {
    extractMasterStorePropagationChanges,
    hasMasterStorePropagationFields,
    propagateMasterStoreChangesToOutlets,
} from "@database/multiOutlet/brandPropagation";
import { getBoundedStoreStringContext, logStoreDataFailure } from "@database/stores/storeDiagnostics";
import {
    buildStoreSummaryEntry,
    reserveNextPlatformEntityId,
    type StoreSummaryData,
} from "@database/platformSummary";
import { uploadPreparedMediaImage } from "@database/storage/uploadPreparedMediaImage";
import { collection, getDocs, limit, query, where } from "@firebase/firestore";
import { resolveBusinessDayEndTime } from "@lib/analytics/businessDay";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { AUTH_BROWSER_REQUEST_POLICY } from "@lib/auth/browserRequestPolicy";
import getActiveSession from "@lib/auth/getActiveSession";
import { revalidatePublicClientCache } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { normalizeStoreLanguagePolicy } from "@lib/localization/languagePolicy";
import { isDataUrl } from "@lib/media/mediaStorage";
import { normalizeTimeSlotPresets } from "@lib/menu/timeSlotPresetBoundary";
import { touchDigitalScreenContentVersion } from "@lib/screen/screenInvalidation";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { isStarterActivationSignal, type StarterActivationSignal } from "@lib/onboarding/starterActivation";
import { generateOwnCustomUid } from "@lib/utils/generateOwnCustomUid";
import { computeSchedulerHour } from "@lib/utils/schedulerHour";
import { StoreDataType, TimeSlotPreset } from "@type/platform/store";
import { deleteField, doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.STORES;
const DIGITAL_SCREEN_STORE_OUTPUT_FIELDS = [
    'active',
    'activePlanType',
    'activeSpecialMenuId',
    'blocked',
    'businessName',
    'currencyCode',
    'currencySymbol',
    'customDomain',
    'logo',
    'name',
    'storeName',
    'subdomain',
    'tenantName',
] as const;
const SUBDOMAIN_ASSIGN_RESPONSE_MAX_BYTES = 8 * 1024;

const buildSummaryDataFromStore = (store: Record<string, any>): StoreSummaryData => ({
    tId: store.tenantId,
    businessType: store.businessType || 'unknown',
    businessCategory: resolveStoreBusinessCategory(store.businessType || '', store.businessCategory),
    active: store.active ?? true,
    blocked: store.blocked ?? false,
    tenantBlocked: store.tenantBlocked,
    name: store.name || '',
    tenantName: store.tenantName || '',
    subdomain: store.subdomain,
    isMaster: store.isMaster,
    outletSlug: store.outletSlug,
    city: store.city,
    addressLine: store.addressLine,
    logo: store.logo,
    workingHours: store.workingHours,
    timeZone: store.timeZone,
    businessDayEndTime: store.businessDayEndTime,
    schedulerHour: store.schedulerHour,
    activePlanType: store.activePlanType,
    menuPresence: store.menuPresence,
    presence: store.presence,
    modifiedOn: store.modifiedOn,
});

const upsertTenantStoreListEntry = (
    storesList: unknown,
    store: Record<string, any>,
) => {
    const current = Array.isArray(storesList)
        ? storesList.filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
        : [];
    const nextEntry = {
        storeId: store.storeId,
        name: store.name || '',
        tenantName: store.tenantName || '',
    };
    let inserted = false;
    const next = current.flatMap((entry) => {
        if (String(entry.storeId) !== String(store.storeId)) return [entry];
        if (inserted) return [];
        inserted = true;
        return [{ ...entry, ...nextEntry }];
    });
    return inserted ? next : [...next, nextEntry];
};

async function assignStoreSubdomain(subdomain: string): Promise<string> {
    const response = await fetch('/api/subdomain/check', {
        ...AUTH_BROWSER_REQUEST_POLICY,
        body: JSON.stringify({ subdomain }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, SUBDOMAIN_ASSIGN_RESPONSE_MAX_BYTES);
    if (
        !response.ok
        || !payload
        || typeof payload !== 'object'
        || Array.isArray(payload)
        || (payload as { success?: unknown }).success !== true
        || typeof (payload as { subdomain?: unknown }).subdomain !== 'string'
    ) {
        throw new Error('store_subdomain_assignment_rejected');
    }
    return (payload as { subdomain: string }).subdomain;
}

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const hasDigitalScreenStoreOutputFieldChanges = (data: Record<string, any>): boolean => (
    DIGITAL_SCREEN_STORE_OUTPUT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(data, field))
);

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

const isStoreDataType = (value: unknown, expectedStoreId: number): value is StoreDataType => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const store = value as Partial<StoreDataType>;
    return Number.isSafeInteger(store.storeId)
        && store.storeId === expectedStoreId
        && Number.isSafeInteger(store.tenantId)
        && Number(store.tenantId) > 0
        && typeof store.storeKey === 'string'
        && typeof store.tenantName === 'string'
        && typeof store.active === 'boolean'
        && typeof store.deleted === 'boolean'
        && typeof store.name === 'string'
        && typeof store.email === 'string'
        && typeof store.phoneNumber === 'string'
        && typeof store.logo === 'string'
        && typeof store.city === 'string'
        && typeof store.state === 'string'
        && typeof store.currencyCode === 'string'
        && typeof store.currencySymbol === 'string'
        && typeof store.businessType === 'string'
        && typeof store.businessCategory === 'string'
        && typeof store.contactPersonName === 'string'
        && typeof store.contactPersonEmail === 'string'
        && typeof store.contactPersonNumber === 'string'
        && Array.isArray(store.roles);
};

export const readStoreById = async (id: number): Promise<StoreDataType | null> => {
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const collectionDocRef = await getDocRef(id);
    const docSnap = await getDoc(collectionDocRef);
    if (!docSnap.exists()) return null;

    const storeData = docSnap.data();
    if (!isStoreDataType(storeData, id)) {
        logStoreDataFailure('store_document_shape_invalid', new Error('store_document_shape_invalid'), {
            storeId: id,
        });
        return null;
    }
    return storeData;
}

export const getStoreById = async (id: number) => {
    return await apiCallComposer(
        () => readStoreById(id),
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
                where('active', '==', true),
                limit(1)
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
    let preparedMedia: any = data.preparedMedia;

    delete data.imageToUpdate;
    delete data.imageType;
    delete data.preparedMedia;
    const docId = data.storeId//which is storeId
    const docRef = await getDocRef(`${docId}`);

    if (imageToUpdate) {
        if (isDataUrl(imageToUpdate)) {
            const session = await getActiveSession();
            logoUrl = await uploadPreparedMediaImage({
                contentType: imageType,
                dataUrl: imageToUpdate,
                entityId: docId,
                prepared: preparedMedia,
                profile: 'businessLogo',
                storeId: docId || session.sId,
                tenantId: data.tenantId || session.tId,
                variant: 'full',
            });
        }
        return logoUrl || imageToUpdate;
    } else return "";
}

export const addStore = async (data: any, from: string = "") => {
    return await apiCallComposer(
        async () => {
            if (from !== "onboarding") {
                data.storeId = await reserveNextPlatformEntityId('store');
            }
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

            const businessCategory = resolveStoreBusinessCategory(data.businessType || '', data.businessCategory);
            data.businessCategory = businessCategory;

            // Assign default time slot presets based on business type
            if (!data.timeSlotPresets && data.businessType && data.tenantId && data.storeId) {
                data.timeSlotPresets = getDefaultTimeSlotPresets(
                    data.businessType,
                    data.tenantId,
                    data.storeId,
                    businessCategory,
                );
            }

            // Assign default roles if not provided (Owner, Manager, Staff)
            // Skip if from onboarding (roles already created in transaction)
            if (!data.roles && from !== "onboarding") {
                const createdBy = data.email || data.createdBy || 'system';
                data.roles = createDefaultRoles(data.storeId, createdBy);
            }

            data.businessDayEndTime = resolveBusinessDayEndTime(data.businessType, data.businessDayEndTime, businessCategory);

            // Auto-compute schedulerHour from timezone/EOD if not explicitly set
            const schedulerHour = data.schedulerHour ?? computeSchedulerHour(data.timeZone, data.businessDayEndTime);
            data.schedulerHour = schedulerHour;

            const storeId = Number(data.storeId);
            const tenantId = Number(data.tenantId);
            if (!Number.isSafeInteger(storeId) || storeId <= 0 || !Number.isSafeInteger(tenantId) || tenantId <= 0) {
                throw new Error('store_create_scope_invalid');
            }
            const storeRef = getDocRef(storeId);
            const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId));
            const summaryRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary');
            const composedStore = await requestBodyComposer(data, { isNew: true });
            await runTransaction(firebaseClient, async (transaction) => {
                const [storeSnapshot, tenantSnapshot] = await Promise.all([
                    transaction.get(storeRef),
                    transaction.get(tenantRef),
                ]);
                if (storeSnapshot.exists()) throw new Error('store_create_id_conflict');
                if (!tenantSnapshot.exists()) throw new Error('store_create_tenant_missing');
                if (String(tenantSnapshot.data()?.tenantId) !== String(tenantId)) {
                    throw new Error('store_create_tenant_scope_mismatch');
                }

                transaction.set(storeRef, composedStore);
                transaction.set(summaryRef, {
                    lastUpdated: serverTimestamp(),
                    stores: { [String(storeId)]: buildStoreSummaryEntry(buildSummaryDataFromStore(data)) },
                }, { merge: true });
                transaction.update(tenantRef, {
                    storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, data),
                });
            });
            await revalidatePublicClientCache(data.storeId, "addStore");

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
            // every search-indexed URL. Fail closed if the guard cannot prove
            // the store is still pre-publish.
            if (data.subdomain !== undefined) {
                let current: any;
                try {
                    current = await getCurrentStoreData();
                } catch (e) {
                    logStoreDataFailure('store_subdomain_publish_status_check_failed', e, {
                        ...getBoundedStoreStringContext('storeId', data.id),
                        ...getBoundedStoreStringContext('tenantId', data.tenantId),
                    });
                    throw new Error('Could not verify whether this public link is locked. Please try again.');
                }

                const wasPublished = !!current?.lastPublishedAt;
                const subdomainChanged = (current?.subdomain || '') !== data.subdomain;
                if (wasPublished && subdomainChanged) {
                    logStoreDataFailure('store_subdomain_change_blocked_after_publish', undefined, {
                        ...getBoundedStoreStringContext('storeId', data.id),
                        ...getBoundedStoreStringContext('tenantId', data.tenantId),
                        ...getBoundedStoreStringContext('currentSubdomain', current?.subdomain),
                        ...getBoundedStoreStringContext('attemptedSubdomain', data.subdomain),
                        wasPublished,
                        subdomainChanged,
                    });
                    throw new Error('This public link is locked after first publish.');
                }
            }

            const requestedBusinessType = data.businessType;
            const requestedBusinessCategory = data.businessCategory;
            const requestedBusinessDayEndTime = data.businessDayEndTime;
            const requestedSchedulerHour = data.schedulerHour;
            const requestedTimeZone = data.timeZone;
            const summaryFields = [
                'businessType',
                'businessCategory',
                'active',
                'blocked',
                'name',
                'tenantName',
                'subdomain',
                'isMaster',
                'outletSlug',
                'city',
                'addressLine',
                'logo',
                'workingHours',
                'timeZone',
                'businessDayEndTime',
                'schedulerHour',
                'activePlanType',
                'menuPresence',
                'presence',
                'modifiedOn',
            ];
            const hasSummaryFieldChanges = summaryFields.some(field => data[field] !== undefined);
            const needsSchedulerRecompute = data.timeZone !== undefined || data.businessDayEndTime !== undefined;
            const needsBusinessCategoryResolution = requestedBusinessType !== undefined
                || requestedBusinessCategory !== undefined;
            const hasPropagationFieldChanges = hasMasterStorePropagationFields(data);
            const existingStore = (hasSummaryFieldChanges || needsSchedulerRecompute || hasPropagationFieldChanges)
                ? await getCurrentStoreData()
                : {};
            const effectiveBusinessType = data.businessType ?? existingStore.businessType;
            const effectiveBusinessCategory = data.businessCategory !== undefined
                ? data.businessCategory
                : data.businessType !== undefined
                    ? undefined
                    : existingStore.businessCategory;
            const effectiveTimeZone = data.timeZone ?? existingStore.timeZone;
            const effectiveBusinessDayEndTime = data.businessDayEndTime ?? existingStore.businessDayEndTime;

            const businessCategory = resolveStoreBusinessCategory(
                effectiveBusinessType || '',
                effectiveBusinessCategory,
            );
            if (needsBusinessCategoryResolution) {
                data.businessCategory = businessCategory;
            } else if (requestedBusinessCategory === undefined) {
                delete data.businessCategory;
            }

            if (data.businessDayEndTime !== undefined) {
                data.businessDayEndTime = resolveBusinessDayEndTime(effectiveBusinessType, data.businessDayEndTime, businessCategory);
            }

            // Recompute schedulerHour before writing store doc so store and summary stay aligned.
            if (needsSchedulerRecompute) {
                const nextBusinessDayEndTime = resolveBusinessDayEndTime(effectiveBusinessType, data.businessDayEndTime ?? effectiveBusinessDayEndTime, businessCategory);
                data.businessDayEndTime = nextBusinessDayEndTime;
                data.schedulerHour = data.schedulerHour ?? computeSchedulerHour(effectiveTimeZone, nextBusinessDayEndTime);
            }

            const propagationSource = data.businessCategory !== undefined && effectiveBusinessType
                ? { ...data, businessType: effectiveBusinessType }
                : data;
            const propagationChanges = hasPropagationFieldChanges
                ? extractMasterStorePropagationChanges(propagationSource)
                : null;
            const isMasterStore = (data.isMaster ?? existingStore.isMaster) === true;
            const summaryTenantId = data.tenantId ?? existingStore.tenantId;
            let propagationHandledByServer = false;
            let subdomainHandledByServer = false;
            if (data.subdomain !== undefined) {
                data.subdomain = await assignStoreSubdomain(String(data.subdomain));
                subdomainHandledByServer = true;
            }
            if (propagationChanges && isMasterStore) {
                if (!summaryTenantId || !data.storeId) {
                    logStoreDataFailure('store_brand_propagation_scope_missing', undefined, {
                        ...getBoundedStoreStringContext('storeId', data.storeId),
                        ...getBoundedStoreStringContext('tenantId', summaryTenantId),
                    });
                    throw new Error('store_brand_propagation_scope_missing');
                }
                await propagateMasterStoreChangesToOutlets(
                    Number(summaryTenantId),
                    Number(data.storeId),
                    propagationChanges,
                );
                propagationHandledByServer = true;
            }

            const directStoreUpdate = { ...data };
            if (propagationHandledByServer && propagationChanges) {
                for (const field of Object.keys(propagationChanges)) delete directStoreUpdate[field];
                delete directStoreUpdate.modifiedOn;
            }
            if (subdomainHandledByServer) delete directStoreUpdate.subdomain;
            const composedDirectStoreUpdate = await requestBodyComposer(directStoreUpdate, { isNew: false });

            // Sync to storesSummary for Cloud Function optimization
            // See: __docs__/patterns/summary-document-pattern.md
            // Only sync if summary-relevant fields are present in the update
            const serverSummaryFields = new Set<string>([
                ...(propagationHandledByServer && propagationChanges ? Object.keys(propagationChanges) : []),
                ...(propagationHandledByServer ? ['modifiedOn'] : []),
                ...(subdomainHandledByServer ? ['subdomain'] : []),
            ]);
            const hasClientSummaryFieldChanges = summaryFields.some((field) => (
                data[field] !== undefined && !serverSummaryFields.has(field)
            ));

            if (hasClientSummaryFieldChanges) {
                const storeId = Number(data.storeId);
                if (!Number.isSafeInteger(storeId) || storeId <= 0) {
                    throw new Error('store_summary_scope_invalid');
                }
                const storeRef = getDocRef(storeId);
                const summaryRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary');
                await runTransaction(firebaseClient, async (transaction) => {
                    const freshStoreSnapshot = await transaction.get(storeRef);
                    if (!freshStoreSnapshot.exists()) throw new Error('store_update_target_missing');
                    const freshStore = freshStoreSnapshot.data();
                    const tenantId = Number(composedDirectStoreUpdate.tenantId ?? freshStore.tenantId);
                    if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
                        throw new Error('store_summary_scope_invalid');
                    }
                    if (
                        String(freshStore.storeId) !== String(storeId)
                        || String(freshStore.tenantId) !== String(tenantId)
                    ) {
                        throw new Error('store_update_scope_changed');
                    }
                    const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId));
                    const shouldSyncTenantList = Object.prototype.hasOwnProperty.call(composedDirectStoreUpdate, 'name')
                        || Object.prototype.hasOwnProperty.call(composedDirectStoreUpdate, 'tenantName');
                    const tenantSnapshot = shouldSyncTenantList ? await transaction.get(tenantRef) : null;
                    if (shouldSyncTenantList && !tenantSnapshot?.exists()) {
                        throw new Error('store_update_tenant_missing');
                    }

                    const transactionUpdate = { ...composedDirectStoreUpdate };
                    const transactionBusinessType = requestedBusinessType ?? freshStore.businessType;
                    const transactionBusinessCategory = resolveStoreBusinessCategory(
                        transactionBusinessType || '',
                        requestedBusinessCategory ?? freshStore.businessCategory,
                    );
                    if (needsBusinessCategoryResolution) {
                        transactionUpdate.businessCategory = transactionBusinessCategory;
                    }
                    if (requestedBusinessDayEndTime !== undefined) {
                        transactionUpdate.businessDayEndTime = resolveBusinessDayEndTime(
                            transactionBusinessType,
                            requestedBusinessDayEndTime,
                            transactionBusinessCategory,
                        );
                    }
                    if (needsSchedulerRecompute) {
                        const transactionBusinessDayEndTime = resolveBusinessDayEndTime(
                            transactionBusinessType,
                            transactionUpdate.businessDayEndTime ?? freshStore.businessDayEndTime,
                            transactionBusinessCategory,
                        );
                        transactionUpdate.businessDayEndTime = transactionBusinessDayEndTime;
                        transactionUpdate.schedulerHour = requestedSchedulerHour ?? computeSchedulerHour(
                            requestedTimeZone ?? freshStore.timeZone,
                            transactionBusinessDayEndTime,
                        );
                    }

                    const nextStore = { ...freshStore, ...transactionUpdate };
                    transaction.update(storeRef, transactionUpdate);
                    transaction.set(summaryRef, {
                        lastUpdated: serverTimestamp(),
                        stores: { [String(storeId)]: buildStoreSummaryEntry(buildSummaryDataFromStore(nextStore)) },
                    }, { merge: true });
                    if (tenantSnapshot) {
                        transaction.update(tenantRef, {
                            storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, nextStore),
                        });
                    }
                });
            } else {
                await updateDoc(getDocRef(data.id), composedDirectStoreUpdate);
            }

            // Public OBP/menu/screen store lookup uses shared Data Cache tags.
            // Revalidate after summary propagation so the next SSR/read cannot
            // refill from stale store summary data.
            if (data.storeId) {
                await revalidatePublicClientCache(data.storeId, "updateStore");
                if (hasDigitalScreenStoreOutputFieldChanges(data)) {
                    await touchDigitalScreenContentVersion(data.storeId, "updateStore");
                }
            }

            return data;
        },
        data,
        "updateStore"
    );
}

export function assertStoreUpdateSucceeded(
    result: unknown,
    expectedStoreId?: string | number,
    rejectionCode = 'store_update_rejected',
): asserts result is Record<string, any> {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    if (expectedStoreId === undefined || expectedStoreId === null) return;

    const savedStoreId = (result as { storeId?: unknown; id?: unknown }).storeId
        ?? (result as { storeId?: unknown; id?: unknown }).id;
    if (String(savedStoreId) !== String(expectedStoreId)) {
        throw new Error(rejectionCode);
    }
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
export type TimeSlotPresetUpdateResult = {
    success: true;
    timeSlotPresets: TimeSlotPreset[];
};

export const isTimeSlotPresetUpdateResult = (result: unknown): result is TimeSlotPresetUpdateResult => (
    Boolean(result && typeof result === 'object')
    && (result as TimeSlotPresetUpdateResult).success === true
    && Array.isArray((result as TimeSlotPresetUpdateResult).timeSlotPresets)
);

export function assertTimeSlotPresetUpdateSucceeded(result: unknown): asserts result is TimeSlotPresetUpdateResult {
    if (isTimeSlotPresetUpdateResult(result)) return;
    throw new Error('time_slot_preset_update_rejected');
}

export const updateTimeSlotPresets = async (storeId: number, timeSlotPresets: TimeSlotPreset[]) => {
    return await apiCallComposer(
        async () => {
            if (!Number.isSafeInteger(storeId) || storeId <= 0) {
                throw new Error('time_slot_preset_store_scope_invalid');
            }
            await assertActiveSessionStore(storeId, 'time_slot_preset_store_scope_mismatch');
            const normalizedPresets = normalizeTimeSlotPresets(timeSlotPresets);
            const docRef = getDocRef(`${storeId}`);
            await setDoc(docRef, { modifiedOn: serverTimestamp(), timeSlotPresets: normalizedPresets }, { merge: true });
            await revalidatePublicClientCache(storeId, "updateTimeSlotPresets");
            return { success: true, timeSlotPresets: normalizedPresets } satisfies TimeSlotPresetUpdateResult;
        },
        { storeId, timeSlotPresets },
        "updateTimeSlotPresets"
    );
};

// ============================
// MENU PRESENCE MONITOR
// @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
// ============================

export type MenuPresenceSurface = 'googleBusiness' | 'appleBusiness' | 'bingPlaces' | 'instagramBio' | 'whatsappProfile';
const MENU_PRESENCE_SURFACES = new Set<MenuPresenceSurface>([
    'googleBusiness',
    'appleBusiness',
    'bingPlaces',
    'instagramBio',
    'whatsappProfile',
]);

export type MenuPresenceUpdateResult = {
    success: true;
    storeId: number;
    surface: MenuPresenceSurface;
    confirmed: boolean;
    starterSignal?: StarterActivationSignal;
};

const assertActiveSessionStore = async (
    storeId: string | number,
    rejectionCode = 'store_session_scope_mismatch',
) => {
    const session = await getActiveSession();
    if (!session?.sId || String(session.sId) !== String(storeId)) {
        throw new Error(rejectionCode);
    }
    return session;
};

export const recordStarterActivationSignal = async (
    storeId: number,
    signal: StarterActivationSignal,
) => {
    return await apiCallComposer(
        async () => {
            if (!Number.isSafeInteger(storeId) || storeId <= 0 || !isStarterActivationSignal(signal)) {
                throw new Error('starter_activation_signal_input_invalid');
            }
            await assertActiveSessionStore(storeId, 'starter_activation_signal_store_scope_mismatch');
            const now = new Date().toISOString();
            await updateDoc(getDocRef(`${storeId}`), {
                [`starterActivationSignals.actions.${signal}`]: now,
                'starterActivationSignals.lastSignalAt': now,
            });
            return { signal };
        },
        { storeId, signal },
        "recordStarterActivationSignal"
    );
};

/**
 * Update a manual presence confirmation for a specific surface.
 * Timestamp-only schema: exists = confirmed, missing = not confirmed.
 * Persists on the store document under `menuPresence.{surface}`.
 */
export const updateMenuPresence = async (
    storeId: number,
    surface: MenuPresenceSurface,
    confirmed: boolean,
    options?: { starterSignal?: StarterActivationSignal },
) => {
    return await apiCallComposer(
        async () => {
            const session = await assertActiveSessionStore(storeId, 'menu_presence_store_scope_mismatch');
            if (
                !Number.isSafeInteger(storeId)
                || storeId <= 0
                || !MENU_PRESENCE_SURFACES.has(surface)
                || typeof confirmed !== 'boolean'
                || (options?.starterSignal !== undefined && !isStarterActivationSignal(options.starterSignal))
            ) {
                throw new Error('menu_presence_input_invalid');
            }
            const sessionTenantId = String(session.tId ?? '').trim();
            const tenantId = Number(sessionTenantId);
            if (!/^[1-9]\d*$/.test(sessionTenantId) || !Number.isSafeInteger(tenantId)) {
                throw new Error('menu_presence_tenant_scope_invalid');
            }
            const storeRef = getDocRef(`${storeId}`);
            const summaryRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary');
            const now = new Date().toISOString();
            await runTransaction(firebaseClient, async (transaction) => {
                const storeSnapshot = await transaction.get(storeRef);
                if (!storeSnapshot.exists()) throw new Error('menu_presence_store_missing');
                const store = storeSnapshot.data();
                if (
                    String(store.storeId) !== String(storeId)
                    || String(store.tenantId) !== sessionTenantId
                ) {
                    throw new Error('menu_presence_store_scope_changed');
                }

                const storeUpdate: Record<string, unknown> = confirmed
                    ? {
                        [`menuPresence.${surface}`]: now,
                    }
                    : {
                        [`menuPresence.${surface}`]: deleteField(),
                    };
                if (confirmed && options?.starterSignal) {
                    storeUpdate[`starterActivationSignals.actions.${options.starterSignal}`] = now;
                    storeUpdate['starterActivationSignals.lastSignalAt'] = now;
                }
                transaction.update(storeRef, storeUpdate);
                transaction.set(summaryRef, {
                    lastUpdated: serverTimestamp(),
                    stores: {
                        [String(storeId)]: {
                            menuPresence: { [surface]: confirmed ? now : null },
                            modifiedOn: now,
                            tId: tenantId,
                        },
                    },
                }, { merge: true });
            });
            await revalidatePublicClientCache(storeId, 'updateMenuPresence');
            return {
                success: true,
                storeId,
                surface,
                confirmed,
                ...(options?.starterSignal ? { starterSignal: options.starterSignal } : {}),
            } satisfies MenuPresenceUpdateResult;
        },
        { storeId, surface, confirmed, starterSignal: options?.starterSignal },
        "updateMenuPresence"
    );
};

export function assertMenuPresenceUpdateSucceeded(
    result: unknown,
    expectedStoreId: string | number,
    expectedSurface: MenuPresenceSurface,
    expectedConfirmed: boolean,
    rejectionCode = 'menu_presence_update_rejected',
): asserts result is MenuPresenceUpdateResult {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    const updateResult = result as Partial<MenuPresenceUpdateResult>;
    if (
        updateResult.success !== true
        || String(updateResult.storeId) !== String(expectedStoreId)
        || updateResult.surface !== expectedSurface
        || updateResult.confirmed !== expectedConfirmed
    ) {
        throw new Error(rejectionCode);
    }
}
