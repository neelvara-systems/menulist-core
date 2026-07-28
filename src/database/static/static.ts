import { SUCCESS_RESPONSE } from "@constant/common";
import { DB_COLLECTIONS, STATIC_ASSET_COLLECTIONS } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit as firestoreLimit,
    query as firestoreQuery,
    runTransaction,
    updateDoc,
} from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { createRandomIdSegment } from "@lib/runtime/randomId";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { AssetsCategoryType, CraftBuilderAssetsTypesType } from "@type/assets";
import { getStaticAssetEntityLogContext, logStaticAssetDiagnostic, logStaticAssetFailure } from "./staticDiagnostics";

const COLLECTION = `${DB_COLLECTIONS.COMMON}/${DB_COLLECTIONS.ASSETS}/`;
const MAX_ASSET_CHILDREN = 1000;
const MAX_ASSET_DOCUMENTS = 1000;
const FIREBASE_STORAGE_DOWNLOAD_HOSTS = new Set([
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
]);
const ASSET_PREVIEW_TYPES = new Set<AssetsCategoryType['previewType']>([
    'gif',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp',
    'jpeg',
    'png',
    'svg',
    'webp',
]);
const ASSET_COLLECTION_BY_TYPE: Record<CraftBuilderAssetsTypesType, string> = {
    graphics: STATIC_ASSET_COLLECTIONS.GRAPHICS,
    illustrations: STATIC_ASSET_COLLECTIONS.ILLUSTRATIONS,
    images: STATIC_ASSET_COLLECTIONS.IMAGES,
};
// @firestore-collection-evidence STATIC_ASSET_COLLECTIONS.GRAPHICS operations=read/query|write|delete|transaction/batch
// @firestore-collection-evidence STATIC_ASSET_COLLECTIONS.ILLUSTRATIONS operations=read/query|write|delete|transaction/batch
// @firestore-collection-evidence STATIC_ASSET_COLLECTIONS.IMAGES operations=read/query|write|delete|transaction/batch

type AssetMutationInput = Partial<AssetsCategoryType> & {
    newPreview?: string | null;
};

type PreparedAssetMutation = {
    data: AssetMutationInput;
    previousPreview: string | null;
    uploadedPreview: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isAssetType = (value: unknown): value is CraftBuilderAssetsTypesType => (
    typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(ASSET_COLLECTION_BY_TYPE, value)
);

const normalizeAssetEntityId = (value: unknown): string | number | undefined => {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized && normalized.length <= 128 ? normalized : undefined;
};

const normalizeAssetList = (value: unknown, depth: number): AssetsCategoryType[] => {
    if (!Array.isArray(value) || value.length > MAX_ASSET_CHILDREN || depth > 2) return [];
    return value
        .map((entry) => normalizeAssetCategory(entry, undefined, depth))
        .filter((entry): entry is AssetsCategoryType => entry !== null);
};

const readPersistedAssetList = (value: unknown, depth: number): AssetsCategoryType[] => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > MAX_ASSET_CHILDREN) {
        throw new Error('static_asset_persisted_list_invalid');
    }
    const normalized = normalizeAssetList(value, depth);
    if (normalized.length !== value.length || normalized.some((entry) => entry.id === undefined)) {
        throw new Error('static_asset_persisted_child_invalid');
    }
    return normalized;
};

const normalizeAssetCategory = (
    value: unknown,
    documentId?: string,
    depth = 0,
): AssetsCategoryType | null => {
    if (!isRecord(value)) return null;
    const previewType = value.previewType;
    if (
        typeof value.active !== 'boolean'
        || typeof value.name !== 'string'
        || value.name.length > 160
        || typeof value.preview !== 'string'
        || value.preview.length > 4096
        || typeof value.tags !== 'string'
        || value.tags.length > 2000
        || typeof previewType !== 'string'
        || !ASSET_PREVIEW_TYPES.has(previewType as AssetsCategoryType['previewType'])
    ) {
        return null;
    }

    const id = normalizeAssetEntityId(documentId ?? value.id);
    return {
        ...(id !== undefined ? { id } : {}),
        active: value.active,
        name: value.name,
        preview: value.preview,
        previewType: previewType as AssetsCategoryType['previewType'],
        tags: value.tags,
        subCategories: normalizeAssetList(value.subCategories, depth + 1),
        items: normalizeAssetList(value.items, depth + 1),
    };
};

const requireAssetMutation = (
    value: AssetMutationInput,
    options: { requireId?: boolean } = {},
): AssetsCategoryType => {
    const normalized = normalizeAssetCategory(value);
    if (!normalized || (options.requireId && normalized.id === undefined)) {
        throw new Error('static_asset_payload_invalid');
    }
    return normalized;
};

const normalizeAssetCategoryPatch = (value: AssetMutationInput): AssetMutationInput => {
    const patch: AssetMutationInput = {};
    if (value.active !== undefined) {
        if (typeof value.active !== 'boolean') throw new Error('static_asset_active_invalid');
        patch.active = value.active;
    }
    if (value.name !== undefined) {
        if (typeof value.name !== 'string' || value.name.length > 160) throw new Error('static_asset_name_invalid');
        patch.name = value.name;
    }
    if (value.tags !== undefined) {
        if (typeof value.tags !== 'string' || value.tags.length > 2000) throw new Error('static_asset_tags_invalid');
        patch.tags = value.tags;
    }
    if (value.preview !== undefined) {
        if (typeof value.preview !== 'string' || value.preview.length > 4096) throw new Error('static_asset_preview_invalid');
        patch.preview = value.preview;
    }
    if (value.previewType !== undefined) {
        if (!ASSET_PREVIEW_TYPES.has(value.previewType)) throw new Error('static_asset_preview_type_invalid');
        patch.previewType = value.previewType;
    }
    if (!Object.keys(patch).length) throw new Error('static_asset_update_empty');
    return patch;
};

const isFirebaseStorageReference = (value: unknown): value is string => {
    if (typeof value !== "string") return false;

    const trimmedValue = value.trim();
    if (!trimmedValue) return false;
    if (trimmedValue.startsWith("gs://")) return true;

    try {
        const url = new URL(trimmedValue);
        return url.protocol === "https:"
            && (
                FIREBASE_STORAGE_DOWNLOAD_HOSTS.has(url.hostname)
                || url.hostname.endsWith(".firebasestorage.app")
            );
    } catch {
        return false;
    }
};

const getCollectionRef = (type: CraftBuilderAssetsTypesType) => {
    if (!isAssetType(type)) throw new Error('static_asset_type_invalid');
    return collection(firebaseClient, `${COLLECTION}${ASSET_COLLECTION_BY_TYPE[type]}`);
};

const getDocRef = (type: CraftBuilderAssetsTypesType, docId: string | number) => {
    if (!isAssetType(type)) throw new Error('static_asset_type_invalid');
    const normalizedDocId = String(docId ?? '').trim();
    if (!isValidFirestoreDocumentId(normalizedDocId)) {
        throw new Error('static_asset_document_id_invalid');
    }
    return doc(firebaseClient, `${COLLECTION}${ASSET_COLLECTION_BY_TYPE[type]}`, normalizedDocId);
};

const cleanupStorageReferences = async (
    urls: unknown[],
    failureCode: string,
    context: Record<string, boolean | number | string | undefined>,
): Promise<void> => {
    const references = Array.from(new Set(urls.filter(isFirebaseStorageReference)));
    if (!references.length) return;

    const results = await Promise.all(references.map((url) => deleteFileByUrl(url)));
    const failedCount = results.filter((result) => !result.success).length;
    if (failedCount > 0) {
        logStaticAssetFailure(failureCode, new Error(failureCode), {
            ...context,
            fileCount: references.length,
            failedCleanupCount: failedCount,
        });
    }
};

const deferPersistedStorageReferenceCleanup = (
    urls: unknown[],
    operation: 'category_delete' | 'item_delete' | 'preview_replace' | 'subcategory_delete',
    context: Record<string, boolean | number | string | undefined>,
): void => {
    const retainedCount = new Set(urls.filter(isFirebaseStorageReference)).size;
    if (retainedCount === 0) return;
    logStaticAssetDiagnostic('static_asset_persisted_file_cleanup_deferred_shared_reference', {
        ...context,
        operation,
        retainedCount,
    });
};

const prepareAssetPreview = async (
    type: CraftBuilderAssetsTypesType,
    input: AssetMutationInput,
): Promise<PreparedAssetMutation> => {
    const data: AssetMutationInput = { ...input };
    const previousPreview = isFirebaseStorageReference(data.preview) ? data.preview : null;
    const newPreview = typeof data.newPreview === 'string' ? data.newPreview : '';
    delete data.newPreview;

    if (!newPreview) {
        return { data, previousPreview, uploadedPreview: null };
    }
    if (!data.previewType || !ASSET_PREVIEW_TYPES.has(data.previewType)) {
        throw new Error('static_asset_preview_type_invalid');
    }

    const id = `${Date.now()}-${createRandomIdSegment(9)}`;
    const uploaded = await uploadBase64ToStorage({
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        fileId: id,
        url: newPreview,
        path: `${DB_COLLECTIONS.COMMON}/${DB_COLLECTIONS.ASSETS}/${ASSET_COLLECTION_BY_TYPE[type]}/${id}`,
        type: data.previewType,
    });
    if (!isFirebaseStorageReference(uploaded)) {
        throw new Error('static_asset_preview_upload_invalid');
    }

    data.preview = uploaded;
    return { data, previousPreview, uploadedPreview: uploaded };
};

const persistPreparedAsset = async <T>(
    prepared: PreparedAssetMutation,
    persist: (data: AssetMutationInput) => Promise<T>,
    context: Record<string, boolean | number | string | undefined>,
): Promise<{ data: AssetMutationInput; result: T }> => {
    try {
        const result = await persist(prepared.data);
        if (prepared.previousPreview && prepared.previousPreview !== prepared.uploadedPreview) {
            deferPersistedStorageReferenceCleanup(
                [prepared.previousPreview],
                'preview_replace',
                context,
            );
        }
        return { data: prepared.data, result };
    } catch (error) {
        if (prepared.uploadedPreview) {
            logStaticAssetFailure(
                'static_asset_ambiguous_write_preview_retained',
                new Error('persistence_outcome_ambiguous'),
                context,
            );
        }
        throw error;
    }
};

const validatePreparedAsset = async <T>(
    prepared: PreparedAssetMutation,
    validate: (data: AssetMutationInput) => T,
    context: Record<string, boolean | number | string | undefined>,
): Promise<T> => {
    try {
        return validate(prepared.data);
    } catch (error) {
        if (prepared.uploadedPreview) {
            await cleanupStorageReferences(
                [prepared.uploadedPreview],
                'static_asset_pre_persist_preview_cleanup_failed',
                context,
            );
        }
        throw error;
    }
};

const collectAssetPreviewReferences = (asset: AssetsCategoryType): string[] => {
    const references = [asset.preview];
    for (const subCategory of asset.subCategories || []) {
        references.push(...collectAssetPreviewReferences(subCategory));
    }
    for (const item of asset.items || []) {
        references.push(...collectAssetPreviewReferences(item));
    }
    return references;
};

export const addAssetsCategory = async (type: CraftBuilderAssetsTypesType, data: AssetMutationInput) => {
    return await apiCallComposer(
        async () => {
            const prepared = await prepareAssetPreview(type, data);
            const normalized = await validatePreparedAsset(
                prepared,
                (nextData) => requireAssetMutation(nextData),
                getStaticAssetEntityLogContext(type),
            );
            const persisted = await persistPreparedAsset(
                { ...prepared, data: normalized },
                async (nextData) => addDoc(getCollectionRef(type), await requestBodyComposer(nextData, { isNew: true })),
                getStaticAssetEntityLogContext(type, normalized.id),
            );
            return { ...normalized, id: persisted.result.id };
        },
        type,
        data,
        "addAssetsCategory",
    );
};

export const updateAssetsCategory = async (
    type: CraftBuilderAssetsTypesType,
    data: AssetMutationInput,
    docId: string,
) => {
    return await apiCallComposer(
        async () => {
            const prepared = await prepareAssetPreview(type, data);
            const patch = await validatePreparedAsset(
                prepared,
                normalizeAssetCategoryPatch,
                getStaticAssetEntityLogContext(type, docId),
            );
            await persistPreparedAsset(
                { ...prepared, data: patch },
                async (nextData) => updateDoc(getDocRef(type, docId), await requestBodyComposer(nextData, { isNew: false })),
                getStaticAssetEntityLogContext(type, docId),
            );
            return { ...patch };
        },
        type,
        data,
        docId,
        "updateAssetsCategory",
    );
};

export const deleteAssetsCategory = async (
    type: CraftBuilderAssetsTypesType,
    categoryDetails: AssetsCategoryType,
) => {
    return await apiCallComposer(
        async () => {
            if (categoryDetails.id === undefined) throw new Error('static_asset_category_id_missing');
            const deletedCategory = await runTransaction(firebaseClient, async (transaction) => {
                const categoryRef = getDocRef(type, categoryDetails.id as string | number);
                const categorySnap = await transaction.get(categoryRef);
                if (!categorySnap.exists()) throw new Error('static_asset_category_not_found');
                const current = normalizeAssetCategory(categorySnap.data(), categorySnap.id);
                if (!current) throw new Error('static_asset_persisted_category_invalid');
                transaction.delete(categoryRef);
                return current;
            });
            deferPersistedStorageReferenceCleanup(
                collectAssetPreviewReferences(deletedCategory),
                'category_delete',
                getStaticAssetEntityLogContext(type, categoryDetails.id),
            );
            return SUCCESS_RESPONSE;
        },
        type,
        categoryDetails,
        "deleteAssetsCategory",
    );
};

export const addAssetsSubCategory = async (
    type: CraftBuilderAssetsTypesType,
    data: AssetMutationInput,
    docId: string,
) => {
    return await apiCallComposer(
        async () => {
            const prepared = await prepareAssetPreview(type, data);
            const subCategory = await validatePreparedAsset(
                prepared,
                (nextData) => requireAssetMutation(nextData, { requireId: true }),
                getStaticAssetEntityLogContext(type, docId),
            );
            await persistPreparedAsset(
                { ...prepared, data: subCategory },
                async () => runTransaction(firebaseClient, async (transaction) => {
                    const parentRef = getDocRef(type, docId);
                    const parentSnap = await transaction.get(parentRef);
                    if (!parentSnap.exists()) throw new Error('static_asset_parent_not_found');
                    const current = readPersistedAssetList(parentSnap.data().subCategories, 1);
                    if (current.some((entry) => String(entry.id) === String(subCategory.id))) {
                        throw new Error('static_asset_subcategory_id_conflict');
                    }
                    transaction.update(parentRef, { subCategories: [...current, subCategory] });
                }),
                getStaticAssetEntityLogContext(type, docId, subCategory.id),
            );
            return subCategory;
        },
        type,
        data,
        docId,
        "addAssetsSubCategory",
    );
};

export const updateAssetsSubCategory = async (
    type: CraftBuilderAssetsTypesType,
    data: AssetMutationInput,
    parentCategory: AssetsCategoryType,
) => {
    return await apiCallComposer(
        async () => {
            if (parentCategory.id === undefined) throw new Error('static_asset_parent_id_missing');
            const prepared = await prepareAssetPreview(type, data);
            const subCategory = await validatePreparedAsset(
                prepared,
                (nextData) => requireAssetMutation(nextData, { requireId: true }),
                getStaticAssetEntityLogContext(type, parentCategory.id),
            );
            await persistPreparedAsset(
                { ...prepared, data: subCategory },
                async () => runTransaction(firebaseClient, async (transaction) => {
                    const parentRef = getDocRef(type, parentCategory.id as string | number);
                    const parentSnap = await transaction.get(parentRef);
                    if (!parentSnap.exists()) throw new Error('static_asset_parent_not_found');
                    const current = readPersistedAssetList(parentSnap.data().subCategories, 1);
                    const index = current.findIndex((entry) => String(entry.id) === String(subCategory.id));
                    if (index < 0) throw new Error('static_asset_subcategory_not_found');
                    current[index] = subCategory;
                    transaction.update(parentRef, { subCategories: current });
                }),
                getStaticAssetEntityLogContext(type, parentCategory.id, subCategory.id),
            );
            return subCategory;
        },
        type,
        data,
        parentCategory,
        "updateAssetsSubCategory",
    );
};

export const deleteAssetsSubCategory = async (
    type: CraftBuilderAssetsTypesType,
    categoryDetails: AssetsCategoryType,
    parentCategory: AssetsCategoryType,
) => {
    return await apiCallComposer(
        async () => {
            if (parentCategory.id === undefined || categoryDetails.id === undefined) {
                throw new Error('static_asset_subcategory_id_missing');
            }
            const deletedSubCategory = await runTransaction(firebaseClient, async (transaction) => {
                const parentRef = getDocRef(type, parentCategory.id as string | number);
                const parentSnap = await transaction.get(parentRef);
                if (!parentSnap.exists()) throw new Error('static_asset_parent_not_found');
                const current = readPersistedAssetList(parentSnap.data().subCategories, 1);
                const index = current.findIndex((entry) => String(entry.id) === String(categoryDetails.id));
                if (index < 0) throw new Error('static_asset_subcategory_not_found');
                const [removed] = current.splice(index, 1);
                const next = current;
                transaction.update(parentRef, { subCategories: next });
                return removed;
            });
            deferPersistedStorageReferenceCleanup(
                collectAssetPreviewReferences(deletedSubCategory),
                'subcategory_delete',
                getStaticAssetEntityLogContext(type, parentCategory.id, categoryDetails.id),
            );
            return SUCCESS_RESPONSE;
        },
        type,
        categoryDetails,
        "deleteAssetsSubCategory",
    );
};

const mutateAssetItem = async (
    mode: 'add' | 'update',
    type: CraftBuilderAssetsTypesType,
    data: AssetMutationInput,
    parentCategory: AssetsCategoryType,
    subCategory: AssetsCategoryType,
): Promise<AssetsCategoryType> => {
    if (parentCategory.id === undefined) throw new Error('static_asset_parent_id_missing');
    const prepared = await prepareAssetPreview(type, data);
    const item = await validatePreparedAsset(
        prepared,
        (nextData) => requireAssetMutation(nextData, { requireId: true }),
        getStaticAssetEntityLogContext(type, parentCategory.id, subCategory?.id),
    );

    await persistPreparedAsset(
        { ...prepared, data: item },
        async () => runTransaction(firebaseClient, async (transaction) => {
            const parentRef = getDocRef(type, parentCategory.id as string | number);
            const parentSnap = await transaction.get(parentRef);
            if (!parentSnap.exists()) throw new Error('static_asset_parent_not_found');

            if (subCategory?.id !== undefined) {
                const subCategories = readPersistedAssetList(parentSnap.data().subCategories, 1);
                const subIndex = subCategories.findIndex((entry) => String(entry.id) === String(subCategory.id));
                if (subIndex < 0) throw new Error('static_asset_item_subcategory_not_found');
                const items = [...(subCategories[subIndex].items || [])];
                const itemIndex = items.findIndex((entry) => String(entry.id) === String(item.id));
                if (mode === 'add' && itemIndex >= 0) throw new Error('static_asset_item_id_conflict');
                if (mode === 'update' && itemIndex < 0) throw new Error('static_asset_item_update_item_missing');
                if (mode === 'add') items.push(item);
                else items[itemIndex] = item;
                subCategories[subIndex] = { ...subCategories[subIndex], items };
                transaction.update(parentRef, { subCategories });
                return;
            }

            const items = readPersistedAssetList(parentSnap.data().items, 1);
            const itemIndex = items.findIndex((entry) => String(entry.id) === String(item.id));
            if (mode === 'add' && itemIndex >= 0) throw new Error('static_asset_item_id_conflict');
            if (mode === 'update' && itemIndex < 0) throw new Error('static_asset_item_update_item_missing');
            if (mode === 'add') items.push(item);
            else items[itemIndex] = item;
            transaction.update(parentRef, { items });
        }),
        getStaticAssetEntityLogContext(type, parentCategory.id, subCategory?.id, item.id),
    );

    return item;
};

export const addAssetsItem = async (
    type: CraftBuilderAssetsTypesType,
    data: AssetMutationInput,
    parentCategory: AssetsCategoryType,
    subCategory: AssetsCategoryType,
) => apiCallComposer(
    () => mutateAssetItem('add', type, data, parentCategory, subCategory),
    type,
    data,
    parentCategory,
    subCategory,
    "addAssetsItem",
);

export const updateAssetsItem = async (
    type: CraftBuilderAssetsTypesType,
    data: AssetMutationInput,
    parentCategory: AssetsCategoryType,
    subCategory: AssetsCategoryType,
) => apiCallComposer(
    () => mutateAssetItem('update', type, data, parentCategory, subCategory),
    type,
    data,
    parentCategory,
    subCategory,
    "updateAssetsItem",
);

export const deleteAssetsItem = async (
    type: CraftBuilderAssetsTypesType,
    data: AssetsCategoryType,
    parentCategory: AssetsCategoryType,
    subCategory: AssetsCategoryType,
) => {
    return await apiCallComposer(
        async () => {
            if (parentCategory.id === undefined || data.id === undefined) {
                throw new Error('static_asset_item_id_missing');
            }
            const deletedItem = await runTransaction(firebaseClient, async (transaction) => {
                const parentRef = getDocRef(type, parentCategory.id as string | number);
                const parentSnap = await transaction.get(parentRef);
                if (!parentSnap.exists()) throw new Error('static_asset_parent_not_found');

                if (subCategory?.id !== undefined) {
                    const subCategories = readPersistedAssetList(parentSnap.data().subCategories, 1);
                    const subIndex = subCategories.findIndex((entry) => String(entry.id) === String(subCategory.id));
                    if (subIndex < 0) throw new Error('static_asset_item_subcategory_not_found');
                    const items = subCategories[subIndex].items || [];
                    const itemIndex = items.findIndex((entry) => String(entry.id) === String(data.id));
                    if (itemIndex < 0) throw new Error('static_asset_item_delete_item_missing');
                    const [removed] = items.splice(itemIndex, 1);
                    const nextItems = items;
                    subCategories[subIndex] = { ...subCategories[subIndex], items: nextItems };
                    transaction.update(parentRef, { subCategories });
                    return removed;
                }

                const items = readPersistedAssetList(parentSnap.data().items, 1);
                const itemIndex = items.findIndex((entry) => String(entry.id) === String(data.id));
                if (itemIndex < 0) throw new Error('static_asset_item_delete_item_missing');
                const [removed] = items.splice(itemIndex, 1);
                const nextItems = items;
                transaction.update(parentRef, { items: nextItems });
                return removed;
            });
            deferPersistedStorageReferenceCleanup(
                collectAssetPreviewReferences(deletedItem),
                'item_delete',
                getStaticAssetEntityLogContext(type, parentCategory.id, subCategory?.id, data.id),
            );
            return SUCCESS_RESPONSE;
        },
        type,
        data,
        parentCategory,
        subCategory,
        "deleteAssetsItem",
    );
};

export async function getAllAssetsByType(type: CraftBuilderAssetsTypesType): Promise<AssetsCategoryType[]> {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(firestoreQuery(
                getCollectionRef(type),
                firestoreLimit(MAX_ASSET_DOCUMENTS + 1),
            ));
            if (querySnapshot.size > MAX_ASSET_DOCUMENTS) {
                logStaticAssetDiagnostic(
                    'static_asset_document_limit_exceeded',
                    {
                        ...getStaticAssetEntityLogContext(type),
                        documentCount: querySnapshot.size,
                        documentLimit: MAX_ASSET_DOCUMENTS,
                    },
                );
                throw new Error('static_asset_document_limit_exceeded');
            }
            return querySnapshot.docs.flatMap((assetDoc) => {
                const normalized = normalizeAssetCategory(assetDoc.data(), assetDoc.id);
                if (normalized) return [normalized];
                logStaticAssetDiagnostic(
                    'static_asset_document_shape_invalid',
                    getStaticAssetEntityLogContext(type, assetDoc.id),
                );
                return [];
            });
        },
        type,
        "getAllAssetsByType",
    );
}

export async function getBusinessAssetsByType(
    type: CraftBuilderAssetsTypesType,
    businessType: string,
): Promise<AssetsCategoryType[]> {
    const assets = await getAllAssetsByType(type);
    const normalizedBusinessType = businessType.trim().toLowerCase();
    if (!normalizedBusinessType) return assets;
    return assets.filter((asset) => (
        asset.tags.split(',').some((tag) => tag.trim().toLowerCase() === normalizedBusinessType)
    ));
}
