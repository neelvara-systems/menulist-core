import { getDefaultTimeSlotPresets } from "@config/defaultTimeSlotPresets";
import { FEATURE_FLAGS } from "@config/features";
import { getAllowedBusinessAttributeKeysForCategory } from "@data/shared/businessAttributeInference";
import { mergeMissingBusinessAttributeDefaults } from "@data/shared/businessAttributeDefaults";
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
import { collection, getDocs, query, where } from "@firebase/firestore";
import { resolveBusinessDayEndTime } from "@lib/analytics/businessDay";
import { normalizeWorkingHoursValue, WORKING_HOURS_DAY_KEYS } from "@lib/hours/hoursEngine";
import { normalizeSpecialHours } from "@lib/hours/specialHours";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { AUTH_BROWSER_REQUEST_POLICY } from "@lib/auth/browserRequestPolicy";
import getActiveSession from "@lib/auth/getActiveSession";
import { revalidatePublicClientCache } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { normalizeStoreLanguagePolicy } from "@lib/localization/languagePolicy";
import { isDataUrl } from "@lib/media/mediaStorage";
import type { PreparedMediaImage } from "@lib/media/prepareMediaImage";
import {
    normalizeProjectPresetReferenceMutation,
    normalizeTimeSlotPresetId,
    normalizeTimeSlotPresetCascadePending,
    normalizeTimeSlotPresets,
    type ProjectPresetReferenceMutation,
} from "@lib/menu/timeSlotPresetBoundary";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import {
    buildOwnerGoogleMapsLinkIdentityBinding,
    EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION,
    normalizeExternalLocationIdentityBinding,
} from "@lib/public-truth-tools/externalLocationIdentity";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import {
    isStoreNestedDelete,
    mergeStoreNestedUpdateWithCurrent,
    projectStoreNestedUpdateEntries,
    STORE_NESTED_DELETE,
    type StoreNestedUpdateEntry,
} from "@lib/store/storeNestedUpdateProjection";
import { isReadableStoreDocument } from "@lib/store/storeDocumentBoundary";
import {
    STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE,
    isStarterActivationSignal,
    normalizeStarterActivationTimestamp,
    shouldRecordStarterActivationSignal,
    type StarterActivationSignal,
} from "@lib/onboarding/starterActivation";
import { generateOwnCustomUid } from "@lib/utils/generateOwnCustomUid";
import { computeSchedulerHour } from "@lib/utils/schedulerHour";
import {
    ExternalLocationIdentityBinding,
    ExternalLocationIdentityProvider,
    StoreDataType,
    TimeSlotPreset,
    TimeSlotPresetCascadePending,
} from "@type/platform/store";
import { deleteField, doc, FieldPath, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

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
const CUSTOM_DOMAIN_AVAILABILITY_RESPONSE_MAX_BYTES = 8 * 1024;

type StoreMutationData = Omit<
    Partial<StoreDataType>,
    'analytics' | 'businessAttributes' | 'externalLocationIdentity' | 'posSync' | 'publicPresence' | 'specialHours' | 'workingHours'
> & {
    [key: string]: unknown;
    analytics?: Record<string, unknown>;
    businessAttributes?: Record<string, unknown>;
    externalLocationIdentity?: unknown;
    id?: string | number;
    imageToUpdate?: string | null;
    imageType?: string;
    posSync?: Record<string, unknown>;
    preparedMedia?: PreparedMediaImage;
    publicPresence?: Record<string, unknown>;
    specialHours?: unknown;
    storeId?: number;
    tenantId?: number;
    workingHours?: unknown;
};

const normalizeSpecialHoursUpdate = (value: unknown): unknown => {
    if (value === null) return null;
    const normalized = normalizeSpecialHours(value);
    if (!normalized) throw new Error('store_special_hours_invalid');
    return normalized;
};

const normalizeWorkingHoursUpdate = (value: unknown, allowDeleteMarkers: boolean): unknown => {
    if (value === null) return null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('store_working_hours_invalid');
    }

    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > WORKING_HOURS_DAY_KEYS.length) {
        throw new Error('store_working_hours_invalid');
    }

    return Object.fromEntries(entries.map(([day, hours]) => {
        if (!WORKING_HOURS_DAY_KEYS.includes(day as (typeof WORKING_HOURS_DAY_KEYS)[number])) {
            throw new Error('store_working_hours_day_invalid');
        }
        if (allowDeleteMarkers && isStoreNestedDelete(hours)) return [day, hours];
        const normalized = normalizeWorkingHoursValue(hours);
        if (normalized === null) throw new Error('store_working_hours_range_invalid');
        return [day, normalized];
    }));
};

const mirrorOwnerGoogleMapsLinkIdentity = (data: Record<string, any>): void => {
    const publicPresence = data.publicPresence;
    if (
        !publicPresence
        || typeof publicPresence !== 'object'
        || Array.isArray(publicPresence)
        || !Object.prototype.hasOwnProperty.call(publicPresence, 'googleMapsUrl')
    ) {
        return;
    }

    const rawGoogleMapsUrl = publicPresence.googleMapsUrl;
    const clearsGoogleMapsUrl = isStoreNestedDelete(rawGoogleMapsUrl)
        || rawGoogleMapsUrl === null
        || (typeof rawGoogleMapsUrl === 'string' && !rawGoogleMapsUrl.trim());
    if (clearsGoogleMapsUrl) {
        data.externalLocationIdentity = {
            ...(data.externalLocationIdentity || {}),
            schemaVersion: EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION,
            bindings: {
                ...(data.externalLocationIdentity?.bindings || {}),
                google_maps: STORE_NESTED_DELETE,
            },
        };
        return;
    }

    const binding = buildOwnerGoogleMapsLinkIdentityBinding(
        rawGoogleMapsUrl,
        new Date().toISOString(),
    );
    if (!binding) {
        throw new Error('store_google_maps_identity_invalid');
    }

    data.publicPresence = {
        ...publicPresence,
        googleMapsUrl: binding.providerUri,
    };
    data.externalLocationIdentity = {
        ...(data.externalLocationIdentity || {}),
        schemaVersion: EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION,
        bindings: {
            ...(data.externalLocationIdentity?.bindings || {}),
            google_maps: binding,
        },
    };
};

const materializeStoreNestedEntry = (entry: StoreNestedUpdateEntry) => ({
    fieldPath: new FieldPath(...entry.path),
    value: isStoreNestedDelete(entry.value) ? deleteField() : entry.value,
});

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
    || (
        data.publicPresence
        && typeof data.publicPresence === 'object'
        && !Array.isArray(data.publicPresence)
        && Object.prototype.hasOwnProperty.call(data.publicPresence, 'accentColor')
    )
);

const getDocRef = (docId: string | number) => {
    return doc(firebaseClient, `${COLLECTION}`, `${docId}`)
}

export const getAllStores = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list: StoreDataType[] = [];
            querySnapshot.forEach((doc) => {
                const storeId = Number(doc.id);
                const value = doc.data();
                if (Number.isSafeInteger(storeId) && isReadableStoreDocument(value, storeId)) {
                    list.push(value);
                } else {
                    logStoreDataFailure('store_list_document_shape_invalid', new Error('store_list_document_shape_invalid'), {
                        ...getBoundedStoreStringContext('storeId', doc.id),
                    });
                }
            });
            return (list);
        },
        "getAllStores"
    );
}

export const getAllStoresByTenantId = async (tenantId: string | number) => {
    return await apiCallComposer(
        async () => {
            const tenantDocumentId = String(tenantId).trim();
            const normalizedTenantId = Number(tenantDocumentId);
            if (
                !/^(?:0|[1-9]\d*)$/.test(tenantDocumentId)
                || !Number.isSafeInteger(normalizedTenantId)
                || normalizedTenantId < 0
                || String(normalizedTenantId) !== tenantDocumentId
            ) {
                throw new Error('store_list_tenant_scope_invalid');
            }
            const ref = query(await getCollectionRef(), where("tenantId", "==", normalizedTenantId));
            const querySnapshot = await getDocs(ref);
            if (querySnapshot.empty) {
                return ([]);
            } else {
                const list: StoreDataType[] = [];
                querySnapshot.forEach((doc) => {
                    const storeId = Number(doc.id);
                    const value = doc.data();
                    if (Number.isSafeInteger(storeId) && isReadableStoreDocument(value, storeId)) {
                        list.push(value);
                    } else {
                        logStoreDataFailure('store_list_document_shape_invalid', new Error('store_list_document_shape_invalid'), {
                            ...getBoundedStoreStringContext('storeId', doc.id),
                            tenantId: normalizedTenantId,
                        });
                    }
                });
                return (list)
            }
        },
        tenantId,
        "getAllStoresByTenantId"
    );
}

export const readStoreById = async (id: number): Promise<StoreDataType | null> => {
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const collectionDocRef = await getDocRef(id);
    const docSnap = await getDoc(collectionDocRef);
    if (!docSnap.exists()) return null;

    const storeData = docSnap.data();
    if (!isReadableStoreDocument(storeData, id)) {
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
            const response = await fetch(
                `/api/domain?candidate=${encodeURIComponent(normalizedDomain)}`,
                AUTH_BROWSER_REQUEST_POLICY,
            );
            const payload = await readJsonResponseWithLimit<unknown>(
                response,
                CUSTOM_DOMAIN_AVAILABILITY_RESPONSE_MAX_BYTES,
            );
            if (
                !response.ok
                || !payload
                || typeof payload !== 'object'
                || Array.isArray(payload)
                || typeof (payload as { available?: unknown }).available !== 'boolean'
            ) {
                throw new Error('custom_domain_availability_response_invalid');
            }

            const result = payload as { available: boolean; normalized?: unknown; reason?: unknown };
            return {
                available: result.available,
                normalized: typeof result.normalized === 'string'
                    ? result.normalized
                    : normalizedDomain,
                reason: typeof result.reason === 'string' ? result.reason : undefined,
            };
        },
        { currentStoreId, domain },
        "checkCustomDomainAvailability"
    );
}

const updateLogoImage = async (data: StoreMutationData): Promise<string> => {
    const imageType = data.imageType;
    const imageToUpdate = data.imageToUpdate;
    const preparedMedia = data.preparedMedia;
    if (imageToUpdate) {
        if (isDataUrl(imageToUpdate)) {
            const session = await getActiveSession();
            if (!session) throw new Error('store_logo_session_missing');
            const storeId = data.storeId ?? session.sId;
            const tenantId = data.tenantId ?? session.tId;
            if (
                !Number.isSafeInteger(storeId)
                || Number(storeId) <= 0
                || !Number.isSafeInteger(tenantId)
                || Number(tenantId) <= 0
            ) {
                throw new Error('store_logo_scope_invalid');
            }
            return await uploadPreparedMediaImage({
                contentType: imageType,
                dataUrl: imageToUpdate,
                entityId: String(storeId),
                prepared: preparedMedia,
                profile: 'businessLogo',
                storeId: Number(storeId),
                tenantId: Number(tenantId),
                variant: 'full',
            });
        }
        return imageToUpdate;
    } else return "";
}

export const addStore = async (data: StoreMutationData, from: string = "") => {
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
            if (data.workingHours !== undefined) {
                data.workingHours = normalizeWorkingHoursUpdate(data.workingHours, false);
            }
            if (data.specialHours !== undefined) {
                data.specialHours = normalizeSpecialHoursUpdate(data.specialHours);
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
            const storeId = Number(data.storeId);
            const tenantId = Number(data.tenantId);
            if (!Number.isSafeInteger(storeId) || storeId <= 0 || !Number.isSafeInteger(tenantId) || tenantId <= 0) {
                throw new Error('store_create_scope_invalid');
            }
            data.storeId = storeId;
            data.tenantId = tenantId;

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

export const updateStore = async (data: StoreMutationData) => {
    return await apiCallComposer(
        async () => {
            const storeId = Number(data.storeId);
            if (!Number.isSafeInteger(storeId) || storeId <= 0) {
                throw new Error('store_update_scope_invalid');
            }
            data.storeId = storeId;
            data.id = storeId;
            let currentStoreData: any | null = null;
            const getCurrentStoreData = async () => {
                if (!currentStoreData) {
                    const currentSnap = await getDoc(getDocRef(storeId));
                    currentStoreData = currentSnap.exists() ? currentSnap.data() : {};
                }
                return currentStoreData || {};
            };

            if (Object.prototype.hasOwnProperty.call(data, 'externalLocationIdentity')) {
                throw new Error('store_external_location_identity_direct_update_forbidden');
            }

            if ('activeLanguages' in data || 'defaultLanguage' in data || 'language' in data) {
                const normalizedLanguagePolicy = normalizeStoreLanguagePolicy(data);
                data.activeLanguages = normalizedLanguagePolicy.activeLanguages;
                data.defaultLanguage = normalizedLanguagePolicy.defaultLanguage;
            }

            if (data.workingHours !== undefined) {
                data.workingHours = normalizeWorkingHoursUpdate(data.workingHours, true);
            }
            if (data.specialHours !== undefined) {
                data.specialHours = normalizeSpecialHoursUpdate(data.specialHours);
            }
            mirrorOwnerGoogleMapsLinkIdentity(data);

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

                    const transactionLogicalUpdate = { ...composedDirectStoreUpdate };
                    const transactionBusinessType = requestedBusinessType ?? freshStore.businessType;
                    const transactionBusinessCategory = resolveStoreBusinessCategory(
                        transactionBusinessType || '',
                        requestedBusinessCategory ?? freshStore.businessCategory,
                    );
                    if (needsBusinessCategoryResolution) {
                        transactionLogicalUpdate.businessCategory = transactionBusinessCategory;
                    }
                    if (requestedBusinessDayEndTime !== undefined) {
                        transactionLogicalUpdate.businessDayEndTime = resolveBusinessDayEndTime(
                            transactionBusinessType,
                            requestedBusinessDayEndTime,
                            transactionBusinessCategory,
                        );
                    }
                    if (needsSchedulerRecompute) {
                        const transactionBusinessDayEndTime = resolveBusinessDayEndTime(
                            transactionBusinessType,
                            transactionLogicalUpdate.businessDayEndTime ?? freshStore.businessDayEndTime,
                            transactionBusinessCategory,
                        );
                        transactionLogicalUpdate.businessDayEndTime = transactionBusinessDayEndTime;
                        transactionLogicalUpdate.schedulerHour = requestedSchedulerHour ?? computeSchedulerHour(
                            requestedTimeZone ?? freshStore.timeZone,
                            transactionBusinessDayEndTime,
                        );
                    }

                    const [firstTransactionEntry, ...remainingTransactionEntries] = projectStoreNestedUpdateEntries(
                        transactionLogicalUpdate,
                    ).map(materializeStoreNestedEntry);
                    const nextStore = mergeStoreNestedUpdateWithCurrent(freshStore, transactionLogicalUpdate);
                    if (!firstTransactionEntry) throw new Error('store_update_empty');
                    transaction.update(
                        storeRef,
                        firstTransactionEntry.fieldPath,
                        firstTransactionEntry.value,
                        ...remainingTransactionEntries.flatMap((entry) => [entry.fieldPath, entry.value]),
                    );
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
                const [firstDirectEntry, ...remainingDirectEntries] = projectStoreNestedUpdateEntries(
                    composedDirectStoreUpdate,
                ).map(materializeStoreNestedEntry);
                if (!firstDirectEntry) throw new Error('store_update_empty');
                await updateDoc(
                    getDocRef(storeId),
                    firstDirectEntry.fieldPath,
                    firstDirectEntry.value,
                    ...remainingDirectEntries.flatMap((entry) => [entry.fieldPath, entry.value]),
                );
            }

            // Public OBP/menu/screen store lookup uses shared Data Cache tags.
            // Revalidate after summary propagation so the next SSR/read cannot
            // refill from stale store summary data.
            if (data.storeId) {
                await revalidatePublicClientCache(data.storeId, "updateStore", {
                    touchScreen: hasDigitalScreenStoreOutputFieldChanges(data),
                });
            }

            return data;
        },
        data,
        "updateStore"
    );
}

export const applyStoreBusinessAttributeDefaults = async (data: {
    businessAttributes: Record<string, unknown>;
    storeId: string | number;
    tenantId: string | number;
}) => {
    return await apiCallComposer(
        async () => {
            const storeId = Number(data.storeId);
            const tenantId = Number(data.tenantId);
            const session = await getActiveSession();
            if (
                !Number.isSafeInteger(storeId)
                || storeId <= 0
                || !Number.isSafeInteger(tenantId)
                || tenantId <= 0
                || String(session?.sId) !== String(storeId)
                || String(session?.tId) !== String(tenantId)
            ) {
                throw new Error('store_business_attribute_defaults_scope_invalid');
            }

            const storeRef = getDocRef(storeId);
            const composedUpdate = await requestBodyComposer({
                id: storeId,
                storeId,
                tenantId,
                businessAttributes: data.businessAttributes,
            }, { isNew: false });
            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const storeSnapshot = await transaction.get(storeRef);
                if (!storeSnapshot.exists()) throw new Error('store_business_attribute_defaults_target_missing');
                const currentStore = storeSnapshot.data();
                if (
                    String(currentStore.storeId) !== String(storeId)
                    || String(currentStore.tenantId) !== String(tenantId)
                ) {
                    throw new Error('store_business_attribute_defaults_scope_changed');
                }

                const businessCategory = resolveStoreBusinessCategory(
                    currentStore.businessType || '',
                    currentStore.businessCategory,
                );
                const result = mergeMissingBusinessAttributeDefaults(
                    currentStore.businessAttributes,
                    data.businessAttributes,
                    getAllowedBusinessAttributeKeysForCategory(businessCategory),
                );
                if (result.changed) {
                    transaction.update(storeRef, {
                        ...composedUpdate,
                        businessAttributes: result.businessAttributes,
                    });
                }

                return {
                    applied: result.changed,
                    businessAttributes: result.businessAttributes,
                    id: storeId,
                    storeId,
                    tenantId,
                };
            });

            if (transactionResult.applied) {
                await revalidatePublicClientCache(storeId, 'applyStoreBusinessAttributeDefaults');
            }
            return transactionResult;
        },
        data,
        'applyStoreBusinessAttributeDefaults',
    );
};

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
    pendingCascade?: TimeSlotPresetCascadePending;
};

export const isTimeSlotPresetUpdateResult = (result: unknown): result is TimeSlotPresetUpdateResult => (
    Boolean(result && typeof result === 'object')
    && (result as TimeSlotPresetUpdateResult).success === true
    && Array.isArray((result as TimeSlotPresetUpdateResult).timeSlotPresets)
    && (
        (result as TimeSlotPresetUpdateResult).pendingCascade === undefined
        || Boolean(normalizeTimeSlotPresetCascadePending((result as TimeSlotPresetUpdateResult).pendingCascade))
    )
);

export function assertTimeSlotPresetUpdateSucceeded(result: unknown): asserts result is TimeSlotPresetUpdateResult {
    if (isTimeSlotPresetUpdateResult(result)) return;
    throw new Error('time_slot_preset_update_rejected');
}

export const updateTimeSlotPresets = async (
    storeId: number,
    timeSlotPresets: TimeSlotPreset[],
    cascadeMutation?: ProjectPresetReferenceMutation,
) => {
    return await apiCallComposer(
        async () => {
            if (!Number.isSafeInteger(storeId) || storeId <= 0) {
                throw new Error('time_slot_preset_store_scope_invalid');
            }
            await assertActiveSessionStore(storeId, 'time_slot_preset_store_scope_mismatch');
            const normalizedPresets = normalizeTimeSlotPresets(timeSlotPresets);
            const normalizedMutation = cascadeMutation === undefined
                ? null
                : normalizeProjectPresetReferenceMutation(cascadeMutation);
            if (cascadeMutation !== undefined && !normalizedMutation) {
                throw new Error('time_slot_preset_cascade_mutation_invalid');
            }
            const pendingCascade: TimeSlotPresetCascadePending | undefined = normalizedMutation
                ? {
                    operationId: generateOwnCustomUid(storeId, storeId),
                    createdAt: new Date().toISOString(),
                    mutation: normalizedMutation,
                }
                : undefined;
            const docRef = getDocRef(`${storeId}`);
            await runTransaction(firebaseClient, async (transaction) => {
                const currentSnapshot = await transaction.get(docRef);
                if (!currentSnapshot.exists()) throw new Error('time_slot_preset_store_missing');
                if (currentSnapshot.data().timeSlotPresetCascadePending !== undefined) {
                    throw new Error('time_slot_preset_cascade_pending');
                }
                transaction.set(docRef, {
                    modifiedOn: serverTimestamp(),
                    timeSlotPresets: normalizedPresets,
                    ...(pendingCascade ? { timeSlotPresetCascadePending: pendingCascade } : {}),
                }, { merge: true });
            });
            await revalidatePublicClientCache(storeId, "updateTimeSlotPresets");
            return {
                success: true,
                timeSlotPresets: normalizedPresets,
                ...(pendingCascade ? { pendingCascade } : {}),
            } satisfies TimeSlotPresetUpdateResult;
        },
        { storeId, timeSlotPresets },
        "updateTimeSlotPresets"
    );
};

export type TimeSlotPresetCascadeCompletionResult = {
    success: true;
    operationId: string;
};

export const isTimeSlotPresetCascadeCompletionResult = (
    result: unknown,
): result is TimeSlotPresetCascadeCompletionResult => (
    Boolean(result && typeof result === 'object')
    && (result as TimeSlotPresetCascadeCompletionResult).success === true
    && Boolean(normalizeTimeSlotPresetId((result as TimeSlotPresetCascadeCompletionResult).operationId))
);

export function assertTimeSlotPresetCascadeCompleted(
    result: unknown,
): asserts result is TimeSlotPresetCascadeCompletionResult {
    if (isTimeSlotPresetCascadeCompletionResult(result)) return;
    throw new Error('time_slot_preset_cascade_completion_rejected');
}

export const completeTimeSlotPresetCascade = async (
    storeId: number,
    operationId: string,
) => {
    return await apiCallComposer(
        async () => {
            if (!Number.isSafeInteger(storeId) || storeId <= 0) {
                throw new Error('time_slot_preset_store_scope_invalid');
            }
            const normalizedOperationId = normalizeTimeSlotPresetId(operationId);
            if (!normalizedOperationId) throw new Error('time_slot_preset_cascade_operation_invalid');
            await assertActiveSessionStore(storeId, 'time_slot_preset_store_scope_mismatch');
            const docRef = getDocRef(`${storeId}`);
            await runTransaction(firebaseClient, async (transaction) => {
                const currentSnapshot = await transaction.get(docRef);
                if (!currentSnapshot.exists()) throw new Error('time_slot_preset_store_missing');
                const rawPending = currentSnapshot.data().timeSlotPresetCascadePending;
                if (rawPending === undefined) return;
                const pending = normalizeTimeSlotPresetCascadePending(rawPending);
                if (!pending || pending.operationId !== normalizedOperationId) {
                    throw new Error('time_slot_preset_cascade_operation_conflict');
                }
                transaction.update(docRef, {
                    modifiedOn: serverTimestamp(),
                    timeSlotPresetCascadePending: deleteField(),
                });
            });
            return {
                success: true,
                operationId: normalizedOperationId,
            } satisfies TimeSlotPresetCascadeCompletionResult;
        },
        { storeId, operationId },
        "completeTimeSlotPresetCascade",
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
    recordedAt: string;
    starterSignal?: StarterActivationSignal;
};

export type StarterActivationSignalUpdateResult = {
    success: true;
    storeId: number;
    signal: StarterActivationSignal;
    recordedAt: string;
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

const getExternalLocationIdentitySessionTenantId = (session: Record<string, any>): string => {
    const sessionTenantId = String(session.tId ?? '').trim();
    const tenantId = Number(sessionTenantId);
    if (!/^[1-9]\d*$/.test(sessionTenantId) || !Number.isSafeInteger(tenantId)) {
        throw new Error('external_location_identity_tenant_scope_invalid');
    }
    return sessionTenantId;
};

const assertExternalLocationIdentityStoreAvailable = (
    store: Record<string, any>,
    storeId: number,
    sessionTenantId: string,
): void => {
    if (
        String(store.storeId) !== String(storeId)
        || String(store.tenantId) !== sessionTenantId
    ) {
        throw new Error('external_location_identity_store_scope_changed');
    }
    if (store.active === false || store.deleted === true || isPlatformEntityBlocked(store)) {
        throw new Error('external_location_identity_store_unavailable');
    }
};

export type ExternalLocationIdentityMutationResult = {
    success: true;
    storeId: number;
    provider: ExternalLocationIdentityProvider;
    confirmed: boolean;
    recordedAt: string;
    binding?: ExternalLocationIdentityBinding;
};

export const confirmExternalLocationIdentity = async (data: {
    storeId: number;
    binding: ExternalLocationIdentityBinding;
}) => {
    return await apiCallComposer(
        async () => {
            if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK) {
                throw new Error('maps_place_check_not_enabled');
            }
            const storeId = Number(data.storeId);
            const requestedBinding = normalizeExternalLocationIdentityBinding(data.binding);
            if (
                !Number.isSafeInteger(storeId)
                || storeId <= 0
                || !requestedBinding
                || requestedBinding.provider !== 'google_maps'
                || requestedBinding.source !== 'maps_place_check'
            ) {
                throw new Error('external_location_identity_input_invalid');
            }
            const session = await assertActiveSessionStore(
                storeId,
                'external_location_identity_store_scope_mismatch',
            );
            const sessionTenantId = getExternalLocationIdentitySessionTenantId(session);
            const binding = {
                ...requestedBinding,
                confirmedAt: new Date().toISOString(),
            } satisfies ExternalLocationIdentityBinding;
            const storeRef = getDocRef(`${storeId}`);
            await runTransaction(firebaseClient, async (transaction) => {
                const storeSnapshot = await transaction.get(storeRef);
                if (!storeSnapshot.exists()) throw new Error('external_location_identity_store_missing');
                assertExternalLocationIdentityStoreAvailable(
                    storeSnapshot.data(),
                    storeId,
                    sessionTenantId,
                );
                transaction.update(
                    storeRef,
                    new FieldPath('externalLocationIdentity', 'schemaVersion'),
                    EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION,
                    new FieldPath('externalLocationIdentity', 'bindings', binding.provider),
                    binding,
                );
            });
            return {
                success: true,
                storeId,
                provider: binding.provider,
                confirmed: true,
                recordedAt: binding.confirmedAt,
                binding,
            } satisfies ExternalLocationIdentityMutationResult;
        },
        { provider: data.binding?.provider, storeId: data.storeId },
        'confirmExternalLocationIdentity',
    );
};

export const clearExternalLocationIdentity = async (data: {
    storeId: number;
    provider: ExternalLocationIdentityProvider;
}) => {
    return await apiCallComposer(
        async () => {
            const storeId = Number(data.storeId);
            if (
                !Number.isSafeInteger(storeId)
                || storeId <= 0
                || (data.provider !== 'google_maps' && data.provider !== 'google_business_profile')
            ) {
                throw new Error('external_location_identity_input_invalid');
            }
            const session = await assertActiveSessionStore(
                storeId,
                'external_location_identity_store_scope_mismatch',
            );
            const sessionTenantId = getExternalLocationIdentitySessionTenantId(session);
            const recordedAt = new Date().toISOString();
            const storeRef = getDocRef(`${storeId}`);
            await runTransaction(firebaseClient, async (transaction) => {
                const storeSnapshot = await transaction.get(storeRef);
                if (!storeSnapshot.exists()) throw new Error('external_location_identity_store_missing');
                assertExternalLocationIdentityStoreAvailable(
                    storeSnapshot.data(),
                    storeId,
                    sessionTenantId,
                );
                transaction.update(
                    storeRef,
                    new FieldPath('externalLocationIdentity', 'bindings', data.provider),
                    deleteField(),
                );
            });
            return {
                success: true,
                storeId,
                provider: data.provider,
                confirmed: false,
                recordedAt,
            } satisfies ExternalLocationIdentityMutationResult;
        },
        data,
        'clearExternalLocationIdentity',
    );
};

export function assertExternalLocationIdentityMutationSucceeded(
    result: unknown,
    expectedStoreId: string | number,
    expectedProvider: ExternalLocationIdentityProvider,
    expectedConfirmed: boolean,
    rejectionCode = 'external_location_identity_update_rejected',
): asserts result is ExternalLocationIdentityMutationResult {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }
    const updateResult = result as Partial<ExternalLocationIdentityMutationResult>;
    if (
        updateResult.success !== true
        || String(updateResult.storeId) !== String(expectedStoreId)
        || updateResult.provider !== expectedProvider
        || updateResult.confirmed !== expectedConfirmed
        || !normalizeStarterActivationTimestamp(updateResult.recordedAt)
    ) {
        throw new Error(rejectionCode);
    }
}

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
            return { success: true, storeId, signal, recordedAt: now } satisfies StarterActivationSignalUpdateResult;
        },
        { storeId, signal },
        "recordStarterActivationSignal"
    );
};

export function assertStarterActivationSignalUpdateSucceeded(
    result: unknown,
    expectedStoreId: string | number,
    expectedSignal: StarterActivationSignal,
    rejectionCode = 'starter_activation_signal_update_rejected',
): asserts result is StarterActivationSignalUpdateResult {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }
    const updateResult = result as Partial<StarterActivationSignalUpdateResult>;
    if (
        updateResult.success !== true
        || String(updateResult.storeId) !== String(expectedStoreId)
        || updateResult.signal !== expectedSignal
        || !normalizeStarterActivationTimestamp(updateResult.recordedAt)
    ) {
        throw new Error(rejectionCode);
    }
}

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
            const canonicalStarterSignal = STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE[surface];
            if (
                !Number.isSafeInteger(storeId)
                || storeId <= 0
                || !MENU_PRESENCE_SURFACES.has(surface)
                || typeof confirmed !== 'boolean'
                || (options?.starterSignal !== undefined && (
                    !isStarterActivationSignal(options.starterSignal)
                    || options.starterSignal !== canonicalStarterSignal
                ))
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
            let appliedStarterSignal: StarterActivationSignal | undefined;
            await runTransaction(firebaseClient, async (transaction) => {
                appliedStarterSignal = undefined;
                const storeSnapshot = await transaction.get(storeRef);
                if (!storeSnapshot.exists()) throw new Error('menu_presence_store_missing');
                const store = storeSnapshot.data();
                if (
                    String(store.storeId) !== String(storeId)
                    || String(store.tenantId) !== sessionTenantId
                ) {
                    throw new Error('menu_presence_store_scope_changed');
                }
                if (store.active === false || store.deleted === true || isPlatformEntityBlocked(store)) {
                    throw new Error('menu_presence_store_unavailable');
                }

                const storeUpdate: Record<string, string | ReturnType<typeof deleteField>> = confirmed
                    ? {
                        [`menuPresence.${surface}`]: now,
                    }
                    : {
                        [`menuPresence.${surface}`]: deleteField(),
                    };
                if (confirmed && shouldRecordStarterActivationSignal(store as StoreDataType)) {
                    appliedStarterSignal = canonicalStarterSignal;
                    storeUpdate[`starterActivationSignals.actions.${canonicalStarterSignal}`] = now;
                    storeUpdate['starterActivationSignals.lastSignalAt'] = now;
                } else if (!confirmed) {
                    appliedStarterSignal = canonicalStarterSignal;
                    storeUpdate[`starterActivationSignals.actions.${canonicalStarterSignal}`] = deleteField();
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
            return {
                success: true,
                storeId,
                surface,
                confirmed,
                recordedAt: now,
                ...(appliedStarterSignal ? { starterSignal: appliedStarterSignal } : {}),
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
        || !normalizeStarterActivationTimestamp(updateResult.recordedAt)
    ) {
        throw new Error(rejectionCode);
    }
}
