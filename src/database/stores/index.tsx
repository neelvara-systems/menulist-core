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
import { mergeStoreSummaryFields, syncStoreToSummary, type StoreDistributionPresenceSummary, updateStoresCountInPlatformSummary } from "@database/platformSummary";
import { uploadPreparedMediaImage } from "@database/storage/uploadPreparedMediaImage";
import { collection, getDocs, limit, query, where } from "@firebase/firestore";
import { resolveBusinessDayEndTime } from "@lib/analytics/businessDay";
import { TrackingEvent, trackEvent } from "@lib/analytics/unified";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { revalidatePublicClientCache } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { normalizeStoreLanguagePolicy } from "@lib/localization/languagePolicy";
import { isDataUrl } from "@lib/media/mediaStorage";
import { touchDigitalScreenContentVersion } from "@lib/screen/screenInvalidation";
import type { StarterActivationSignal } from "@lib/onboarding/starterActivation";
import { generateOwnCustomUid } from "@lib/utils/generateOwnCustomUid";
import { computeSchedulerHour } from "@lib/utils/schedulerHour";
import { TimeSlotPreset } from "@type/platform/store";
import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

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

export const readStoreById = async (id: number) => {
    const collectionDocRef = await getDocRef(id);
    const docSnap = await getDoc(collectionDocRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
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

            await setDoc(getDocRef(data.id), await requestBodyComposer(data));
            if (from != "onboarding") {
                await updateStoresCountInPlatformSummary()
            }

            // Sync to storesSummary for Cloud Function optimization
            // See: __docs__/patterns/summary-document-pattern.md
            await syncStoreToSummary(data.storeId, {
                tId: data.tenantId,
                businessType: data.businessType || 'unknown',
                businessCategory,
                active: true,
                blocked: data.blocked ?? false,
                name: data.name || '',
                tenantName: data.tenantName || '',
                subdomain: data.subdomain,
                isMaster: data.isMaster,
                outletSlug: data.outletSlug,
                city: data.city,
                addressLine: data.addressLine,
                logo: data.logo,
                workingHours: data.workingHours,
                timeZone: data.timeZone,
                businessDayEndTime: data.businessDayEndTime,
                schedulerHour,
                activePlanType: data.activePlanType,
                menuPresence: data.menuPresence,
                presence: data.presence,
                modifiedOn: data.modifiedOn,
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
                    // T5-N-02: Emit analytics event for security/support signal.
                    // Fire-and-forget: don't block the save if tracking fails.
                    trackEvent(TrackingEvent.SUBDOMAIN_MUTATION_BLOCKED, {
                        storeId: data.id,
                        tenantId: data.tenantId,
                        attemptedSubdomain: data.subdomain,
                        currentSubdomain: current?.subdomain,
                    }).catch((error) => {
                        logStoreDataFailure('store_subdomain_block_analytics_signal_failed', error, {
                            ...getBoundedStoreStringContext('storeId', data.id),
                            ...getBoundedStoreStringContext('tenantId', data.tenantId),
                            ...getBoundedStoreStringContext('currentSubdomain', current?.subdomain),
                            ...getBoundedStoreStringContext('attemptedSubdomain', data.subdomain),
                            wasPublished,
                            subdomainChanged,
                        });
                    });
                    throw new Error('This public link is locked after first publish.');
                }
            }

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
            const needsBusinessCategoryResolution = hasSummaryFieldChanges || needsSchedulerRecompute;
            const hasPropagationFieldChanges = hasMasterStorePropagationFields(data);
            const existingStore = (needsBusinessCategoryResolution || hasPropagationFieldChanges) ? await getCurrentStoreData() : {};
            const effectiveBusinessType = data.businessType ?? existingStore.businessType;
            const effectiveBusinessCategory = data.businessCategory !== undefined
                ? data.businessCategory
                : data.businessType !== undefined
                    ? undefined
                    : existingStore.businessCategory;
            const effectiveTimeZone = data.timeZone ?? existingStore.timeZone;
            const effectiveBusinessDayEndTime = data.businessDayEndTime ?? existingStore.businessDayEndTime;

            const businessCategory = needsBusinessCategoryResolution
                ? resolveStoreBusinessCategory(effectiveBusinessType || '', effectiveBusinessCategory)
                : undefined;
            if (needsBusinessCategoryResolution && businessCategory) {
                data.businessCategory = businessCategory;
            } else {
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

            await updateDoc(getDocRef(data.id), await requestBodyComposer(data));

            // Sync to storesSummary for Cloud Function optimization
            // See: __docs__/patterns/summary-document-pattern.md
            // Only sync if summary-relevant fields are present in the update
            const summaryTenantId = data.tenantId ?? existingStore.tenantId;

            if (hasSummaryFieldChanges && summaryTenantId) {
                await syncStoreToSummary(data.storeId, {
                    tId: summaryTenantId,
                    businessType: effectiveBusinessType || 'unknown',
                    businessCategory,
                    active: data.active ?? existingStore.active ?? true,
                    blocked: data.blocked ?? existingStore.blocked ?? false,
                    name: data.name ?? existingStore.name ?? '',
                    tenantName: data.tenantName ?? existingStore.tenantName ?? '',
                    subdomain: data.subdomain ?? existingStore.subdomain,
                    isMaster: data.isMaster ?? existingStore.isMaster,
                    outletSlug: data.outletSlug ?? existingStore.outletSlug,
                    city: data.city ?? existingStore.city,
                    addressLine: data.addressLine ?? existingStore.addressLine,
                    logo: data.logo ?? existingStore.logo,
                    workingHours: data.workingHours ?? existingStore.workingHours,
                    timeZone: data.timeZone ?? existingStore.timeZone,
                    businessDayEndTime: data.businessDayEndTime ?? existingStore.businessDayEndTime,
                    schedulerHour: data.schedulerHour ?? existingStore.schedulerHour,
                    activePlanType: data.activePlanType ?? existingStore.activePlanType,
                    menuPresence: data.menuPresence ?? existingStore.menuPresence,
                    presence: data.presence ?? existingStore.presence,
                    modifiedOn: data.modifiedOn ?? existingStore.modifiedOn,
                });
            } else if (hasSummaryFieldChanges && !summaryTenantId) {
                logStoreDataFailure('store_summary_sync_skipped_missing_tenant', undefined, {
                    ...getBoundedStoreStringContext('storeId', data.storeId),
                });
            }
            // Skip sync if no summary-relevant fields present in update

            const propagationSource = data.businessCategory !== undefined && effectiveBusinessType
                ? { ...data, businessType: effectiveBusinessType }
                : data;
            const propagationChanges = hasPropagationFieldChanges
                ? extractMasterStorePropagationChanges(propagationSource)
                : null;
            const isMasterStore = (data.isMaster ?? existingStore.isMaster) === true;
            if (propagationChanges && isMasterStore && summaryTenantId && data.storeId) {
                await propagateMasterStoreChangesToOutlets(
                    Number(summaryTenantId),
                    Number(data.storeId),
                    propagationChanges,
                );
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
            const docRef = getDocRef(`${storeId}`);
            await setDoc(docRef, { modifiedOn: serverTimestamp(), timeSlotPresets }, { merge: true });
            await revalidatePublicClientCache(storeId, "updateTimeSlotPresets");
            return { success: true, timeSlotPresets } satisfies TimeSlotPresetUpdateResult;
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
            await assertActiveSessionStore(storeId, 'menu_presence_store_scope_mismatch');
            const docRef = getDocRef(`${storeId}`);
            const now = new Date().toISOString();
            if (confirmed) {
                const updatePayload: Record<string, string> = {
                    [`menuPresence.${surface}`]: now,
                };
                if (options?.starterSignal) {
                    updatePayload[`starterActivationSignals.actions.${options.starterSignal}`] = now;
                    updatePayload['starterActivationSignals.lastSignalAt'] = now;
                }
                await updateDoc(docRef, updatePayload);
                const menuPresenceSummary: StoreDistributionPresenceSummary = { [surface]: now };
                await mergeStoreSummaryFields(storeId, {
                    menuPresence: menuPresenceSummary,
                    modifiedOn: now,
                });
            } else {
                await updateDoc(docRef, {
                    [`menuPresence.${surface}`]: deleteField(),
                });
                const menuPresenceSummary: StoreDistributionPresenceSummary = { [surface]: null };
                await mergeStoreSummaryFields(storeId, {
                    menuPresence: menuPresenceSummary,
                    modifiedOn: now,
                });
            }
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
