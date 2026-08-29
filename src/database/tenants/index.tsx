import { DB_COLLECTIONS } from "@constant/database";
import { reserveNextPlatformEntityId } from "@database/platformSummary";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDocs, limit, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { AUTH_BROWSER_REQUEST_POLICY } from "@lib/auth/browserRequestPolicy";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isDataUrl } from "@lib/media/mediaStorage";
import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/scopeDocumentId";
import { createRuntimeId } from "@lib/runtime/randomId";
import { logRuntimeDiagnostic, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { getStorageReplacementCleanupTargets, type StorageReplacementCommitState } from "@lib/storage/replacementUploadBoundary";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import type { TenantDataType } from "@type/platform/tenant";

const COLLECTION = DB_COLLECTIONS.TENANTS;
const MAX_TENANT_DOCUMENTS = 1000;
const TENANT_NAME_RESPONSE_MAX_BYTES = 32 * 1024;
type TenantMutationInput = Record<string, unknown> & {
    imageToUpdate?: unknown;
    imageType?: unknown;
    name?: unknown;
    storesList?: unknown;
    tenantId?: string | number;
};

const cleanupTenantLogoReplacement = async ({
    commitState,
    previousUrl,
    tenantId,
    uploadedUrl,
}: {
    commitState: StorageReplacementCommitState;
    previousUrl?: unknown;
    tenantId: unknown;
    uploadedUrl?: unknown;
}): Promise<void> => {
    if (commitState === 'committed') {
        if (previousUrl && uploadedUrl && previousUrl !== uploadedUrl) {
            logRuntimeDiagnostic('tenant_logo_persisted_cleanup_deferred_shared_reference', {
                tenantId: String(tenantId || '').slice(0, 120),
            });
        }
        return;
    }
    const targets = getStorageReplacementCleanupTargets({ commitState, previousUrl, uploadedUrl });
    if (commitState === 'ambiguous' && uploadedUrl) {
        logRuntimeFailure('tenant_logo_ambiguous_persistence_media_retained', new Error('persistence_outcome_ambiguous'), {
            tenantId: String(tenantId || '').slice(0, 120),
        });
    }
    if (!targets.length) return;
    const results = await Promise.all(targets.map((url) => deleteFileByUrl(url)));
    const failedCount = results.filter((result) => !result.success).length;
    if (failedCount > 0) {
        logRuntimeFailure('tenant_logo_replacement_cleanup_failed', new Error('storage_cleanup_failed'), {
            commitState,
            failedCount,
            tenantId: String(tenantId || '').slice(0, 120),
        });
    }
};

const uploadTenantLogo = async ({
    imageToUpdate,
    tenantId,
}: {
    imageToUpdate: string;
    tenantId: unknown;
}): Promise<string> => {
    const objectId = createRuntimeId(`tenant_${String(tenantId)}_logo`);
    return uploadBase64ToStorage({
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        fileId: objectId,
        path: `${COLLECTION}/logos/${objectId}`,
        url: imageToUpdate,
    });
};

const updateTenantNameAtomically = async (params: {
    name: string;
    storesList?: unknown[];
    tenantId: string | number;
}): Promise<void> => {
    const storesList = Array.isArray(params.storesList)
        ? params.storesList
            .filter((store): store is Record<string, unknown> => Boolean(store) && typeof store === 'object' && !Array.isArray(store))
            .map((store) => ({ name: store.name, storeId: store.storeId }))
        : undefined;
    const response = await fetch('/api/tenants/name', {
        ...AUTH_BROWSER_REQUEST_POLICY,
        body: JSON.stringify({ name: params.name, storesList, tenantId: params.tenantId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, TENANT_NAME_RESPONSE_MAX_BYTES);
    if (
        !response.ok
        || !payload
        || typeof payload !== 'object'
        || Array.isArray(payload)
        || (payload as { success?: unknown }).success !== true
        || String((payload as { tenantId?: unknown }).tenantId || '') !== String(params.tenantId)
    ) {
        throw new Error('tenant_name_update_rejected');
    }
};

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: string | number) => {
    const scope = normalizeStorePermissionScopeDocumentId(docId);
    if (!scope) throw new Error('tenant_document_id_invalid');
    return doc(firebaseClient, COLLECTION, scope.documentId);
}

const isTenantDataType = (value: unknown): value is TenantDataType & { id: string } => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const tenant = value as Record<string, unknown>;
    return typeof tenant.id === 'string'
        && typeof tenant.tenantKey === 'string'
        && typeof tenant.active === 'boolean'
        && typeof tenant.deleted === 'boolean'
        && typeof tenant.name === 'string'
        && typeof tenant.email === 'string'
        && Array.isArray(tenant.storesList)
        && tenant.storesList.every((entry) => {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
            const store = entry as Record<string, unknown>;
            return typeof store.storeId === 'number'
                && Number.isSafeInteger(store.storeId)
                && store.storeId > 0
                && typeof store.name === 'string'
                && typeof store.storeKey === 'string';
        });
};

export const normalizeTenantListDocument = (
    documentId: string,
    value: Record<string, unknown>,
): (TenantDataType & { id: string }) | null => {
    const documentScope = normalizeStorePermissionScopeDocumentId(documentId);
    const embeddedScope = value.tenantId === undefined || value.tenantId === null
        ? documentScope
        : normalizeStorePermissionScopeDocumentId(value.tenantId);
    if (!documentScope || embeddedScope?.numericId !== documentScope.numericId) return null;
    const storesList = (Array.isArray(value.storesList) ? value.storesList : [])
        .flatMap((entry) => {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
            const store = entry as Record<string, unknown>;
            const storeId = Number(store.storeId);
            if (!Number.isSafeInteger(storeId) || storeId <= 0) return [];
            const name = typeof store.name === 'string' ? store.name : '';
            const storeKey = typeof store.storeKey === 'string'
                ? store.storeKey
                : name.trim().toLowerCase().replaceAll(' ', '_');
            return [{ ...store, name, storeId, storeKey }];
        });
    const candidate: unknown = {
        ...value,
        active: value.active !== false,
        deleted: value.deleted === true,
        email: typeof value.email === 'string' ? value.email : '',
        id: documentId,
        name: typeof value.name === 'string' ? value.name : '',
        storesList,
        tenantId: documentScope.numericId,
        tenantKey: typeof value.tenantKey === 'string' ? value.tenantKey : '',
    };
    return isTenantDataType(candidate) ? candidate : null;
};

export const getAllTenants = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(query(
                getCollectionRef(),
                limit(MAX_TENANT_DOCUMENTS + 1),
            ));
            if (querySnapshot.size > MAX_TENANT_DOCUMENTS) {
                logRuntimeDiagnostic('tenant_document_limit_exceeded', {
                    documentCount: querySnapshot.size,
                    documentLimit: MAX_TENANT_DOCUMENTS,
                });
                throw new Error('tenant_document_limit_exceeded');
            }
            const list: Array<TenantDataType & { id: string }> = [];
            querySnapshot.forEach((tenantDocument) => {
                const tenant = normalizeTenantListDocument(tenantDocument.id, tenantDocument.data());
                if (tenant) list.push(tenant);
            });
            return (list);
        },
        "getAllTenants"
    );
}

export const getTenantByEmail = async (email: string) => {
    const q = query(getCollectionRef(), where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const tenantDoc = querySnapshot.docs[0];
    return normalizeTenantListDocument(tenantDoc.id, tenantDoc.data());
}

export const readTenantById = async (id: number) => {
    const collectionDocRef = await getDocRef(id);
    const docSnap = await getDoc(collectionDocRef);
    if (docSnap.exists()) {
        return normalizeTenantListDocument(docSnap.id, docSnap.data());
    }
    return null;
}

export const getTenantById = async (id: number) => {
    return await apiCallComposer(
        () => readTenantById(id),
        id,
        "getTenantById"
    );
}
export const addTenant = async (data: TenantMutationInput, from: string = "") => {
    return await apiCallComposer(
        async () => {
            const nextData: TenantMutationInput = { ...data };
            const nextTenantName = typeof nextData.name === 'string' ? nextData.name.trim() : '';
            if (!nextTenantName) throw new Error('tenant_create_name_invalid');
            nextData.name = nextTenantName;
            let uploadedLogoUrl = '';
            const imageToUpdate: unknown = nextData.imageToUpdate;

            delete nextData.imageToUpdate;
            delete nextData.imageType;
            if (from !== "onboarding") {
                nextData.tenantId = await reserveNextPlatformEntityId('tenant');
            }
            const docId = nextData.tenantId;
            if (docId === undefined) throw new Error('tenant_create_id_missing');
            const docRef = await getDocRef(`${docId}`);
            let persistenceAttempted = false;

            try {
                if (isDataUrl(imageToUpdate)) {
                    uploadedLogoUrl = await uploadTenantLogo({ imageToUpdate, tenantId: docId });
                    nextData.logo = uploadedLogoUrl;
                } else if (typeof imageToUpdate === 'string' && imageToUpdate.trim()) {
                    nextData.logo = imageToUpdate.trim();
                }
                nextData.storesList = [];
                const composedData = await requestBodyComposer(nextData, { isNew: true });
                persistenceAttempted = true;
                await setDoc(docRef, composedData);
                return ({ ...nextData, id: docId })
            } catch (error) {
                await cleanupTenantLogoReplacement({
                    commitState: persistenceAttempted ? 'ambiguous' : 'not_persisted',
                    tenantId: docId,
                    uploadedUrl: uploadedLogoUrl,
                });
                throw error;
            }
        },
        data,
        "addTenant"
    );
}

export const updateTenant = async (data: TenantMutationInput & { tenantId: string | number }) => {
    return await apiCallComposer(
        async () => {
            const nextData: TenantMutationInput & { tenantId: string | number } = { ...data };
            const docId = nextData.tenantId;
            const nextTenantName = typeof nextData.name === 'string' ? nextData.name.trim() : '';
            if ('name' in nextData && !nextTenantName) throw new Error('tenant_update_name_invalid');
            const imageToUpdate: unknown = nextData.imageToUpdate;
            const hasLogoUpload = isDataUrl(imageToUpdate);
            delete nextData.imageToUpdate;
            delete nextData.imageType;
            let shouldPropagateTenantName = false;
            let currentTenantData: Record<string, unknown> | null = null;
            let uploadedLogoUrl = '';
            let previousLogoUrl: unknown;
            let logoPersistenceAttempted = false;
            const collectionDocRef = doc(firebaseClient, `${COLLECTION}`, `${docId}`);
            if (nextTenantName || hasLogoUpload) {
                const currentTenantSnap = await getDoc(collectionDocRef);
                currentTenantData = currentTenantSnap.exists() ? currentTenantSnap.data() : null;
                if (!currentTenantData) throw new Error('tenant_update_target_missing');
                previousLogoUrl = currentTenantData.logo;
                const currentTenantName = currentTenantSnap.exists()
                    ? typeof currentTenantSnap.data()?.name === 'string'
                        ? currentTenantSnap.data()?.name.trim()
                        : ''
                    : '';
                shouldPropagateTenantName = Boolean(nextTenantName) && currentTenantName !== nextTenantName;
            }
            try {
                if (hasLogoUpload) {
                    uploadedLogoUrl = await uploadTenantLogo({
                        imageToUpdate,
                        tenantId: docId,
                    });
                    nextData.logo = uploadedLogoUrl;
                }
                if (shouldPropagateTenantName) {
                    const sourceStoresList = Array.isArray(nextData.storesList)
                        ? nextData.storesList
                        : currentTenantData?.storesList;
                    await updateTenantNameAtomically({
                        name: nextTenantName,
                        storesList: Array.isArray(sourceStoresList) ? sourceStoresList : undefined,
                        tenantId: docId,
                    });
                }
                const directTenantUpdate = { ...nextData };
                if (shouldPropagateTenantName) {
                    delete directTenantUpdate.name;
                    delete directTenantUpdate.storesList;
                }
                if (Object.keys(directTenantUpdate).length > 0) {
                    const composedData = await requestBodyComposer(directTenantUpdate, { isNew: false });
                    logoPersistenceAttempted = Boolean(uploadedLogoUrl);
                    await updateDoc(collectionDocRef, composedData);
                }
            } catch (error) {
                await cleanupTenantLogoReplacement({
                    commitState: logoPersistenceAttempted ? 'ambiguous' : 'not_persisted',
                    tenantId: docId,
                    uploadedUrl: uploadedLogoUrl,
                });
                throw error;
            }
            await cleanupTenantLogoReplacement({
                commitState: 'committed',
                previousUrl: previousLogoUrl,
                tenantId: docId,
                uploadedUrl: uploadedLogoUrl,
            });
            return nextData;
        },
        data,
        "updateTenant"
    );
}

export function assertTenantUpdateSucceeded(
    result: unknown,
    expectedTenantId?: string | number,
    rejectionCode = 'tenant_update_rejected',
): asserts result is Record<string, unknown> {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    if (expectedTenantId === undefined || expectedTenantId === null) return;

    const savedTenantId = (result as { tenantId?: unknown; id?: unknown }).tenantId
        ?? (result as { tenantId?: unknown; id?: unknown }).id;
    if (String(savedTenantId) !== String(expectedTenantId)) {
        throw new Error(rejectionCode);
    }
}
