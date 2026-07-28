import { SUCCESS_RESPONSE } from "@constant/common";
import { DB_COLLECTIONS, FONT_PRESET_ASSET_COLLECTION } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage, { type SupportedFileType } from "@database/storage/uploadBase64ToStorage";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit as firestoreLimit,
    query as firestoreQuery,
    updateDoc,
    writeBatch,
} from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { isDataUrl } from "@lib/media/mediaStorage";
import { createRandomIdSegment } from "@lib/runtime/randomId";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { FontPresetsType } from "@type/assets";
import { getStaticAssetEntityLogContext, logStaticAssetDiagnostic, logStaticAssetFailure } from "./staticDiagnostics";

const COLLECTION = `${DB_COLLECTIONS.COMMON}/${DB_COLLECTIONS.ASSETS}/${FONT_PRESET_ASSET_COLLECTION}`;
const FIREBASE_STORAGE_DOWNLOAD_HOSTS = new Set([
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
]);
const MAX_FONT_PRESETS = 500;
const MAX_FONT_PREVIEW_LENGTH = 300_000;
const MAX_FONT_URL_LENGTH = 4_096;

const getCollectionRef = () => collection(firebaseClient, COLLECTION);

const getDocRef = (docId: string) => {
    if (!isValidFirestoreDocumentId(docId)) throw new Error('font_preset_id_invalid');
    return doc(firebaseClient, COLLECTION, docId);
};

const isFirebaseStorageReference = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const normalized = value.trim();
    if (!normalized) return false;
    if (normalized.startsWith('gs://')) return true;
    try {
        const url = new URL(normalized);
        return url.protocol === 'https:'
            && (FIREBASE_STORAGE_DOWNLOAD_HOSTS.has(url.hostname) || url.hostname.endsWith('.firebasestorage.app'));
    } catch {
        return false;
    }
};

const normalizeFontFileType = (value: unknown): SupportedFileType | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    const mappings: Record<string, SupportedFileType> = {
        '.otf': 'otf',
        '.ttf': 'ttf',
        '.woff': 'woff',
        '.woff2': 'woff2',
        'application/font-sfnt': 'application/font-sfnt',
        'application/font-woff': 'application/font-woff',
        'application/x-font-opentype': 'application/x-font-opentype',
        'application/x-font-ttf': 'application/x-font-ttf',
        'font/otf': 'font/otf',
        'font/ttf': 'font/ttf',
        'font/woff': 'font/woff',
        'font/woff2': 'font/woff2',
        'otf': 'otf',
        'ttf': 'ttf',
        'woff': 'woff',
        'woff2': 'woff2',
    };
    return mappings[normalized] || null;
};

const normalizeFontPreset = (value: unknown, documentId?: string): FontPresetsType | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const font = value as Partial<FontPresetsType>;
    const id = documentId || font.id;
    const fontSize = font.fontSize;
    const width = font.width;
    const height = font.height;
    if (
        (id !== undefined && !isValidFirestoreDocumentId(String(id)))
        || typeof font.name !== 'string'
        || !font.name.trim()
        || font.name.length > 160
        || typeof font.code !== 'string'
        || !/^[A-Za-z0-9_-]{1,128}$/.test(font.code)
        || typeof font.blackTextUrl !== 'string'
        || font.blackTextUrl.length > MAX_FONT_PREVIEW_LENGTH
        || typeof font.whiteTextUrl !== 'string'
        || font.whiteTextUrl.length > MAX_FONT_PREVIEW_LENGTH
        || !(
            (typeof font.size === 'string' && font.size.length <= 64)
            || (typeof font.size === 'number' && Number.isSafeInteger(font.size) && font.size >= 0)
        )
        || typeof font.type !== 'string'
        || !normalizeFontFileType(font.type)
        || !isFirebaseStorageReference(font.fileUrl)
        || font.fileUrl.length > MAX_FONT_URL_LENGTH
        || !Number.isSafeInteger(font.index)
        || Number(font.index) < 0
        || Number(font.index) >= MAX_FONT_PRESETS
        || (fontSize !== undefined && (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 240))
        || (width !== undefined && (!Number.isFinite(width) || width < 1 || width > 2_000))
        || (height !== undefined && (!Number.isFinite(height) || height < 1 || height > 2_000))
    ) {
        return null;
    }

    return {
        ...(id !== undefined ? { id: String(id) } : {}),
        name: font.name.trim(),
        code: font.code,
        blackTextUrl: font.blackTextUrl,
        whiteTextUrl: font.whiteTextUrl,
        size: font.size,
        type: font.type,
        fileUrl: font.fileUrl,
        index: font.index,
        ...(fontSize !== undefined ? { fontSize } : {}),
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
    };
};

const cleanupFontFile = async (url: unknown, failureCode: string, fontId?: string): Promise<void> => {
    if (!isFirebaseStorageReference(url)) return;
    const result = await deleteFileByUrl(url);
    if (!result.success) {
        logStaticAssetFailure(
            failureCode,
            new Error(failureCode),
            getStaticAssetEntityLogContext('fontPreset', fontId),
        );
    }
};

const deferPersistedFontFileCleanup = (url: unknown, fontId: string): void => {
    if (!isFirebaseStorageReference(url)) return;
    logStaticAssetDiagnostic(
        'font_preset_persisted_file_cleanup_deferred_shared_reference',
        getStaticAssetEntityLogContext('fontPreset', fontId),
    );
};

const uploadFontDataUrl = async (font: FontPresetsType): Promise<string | null> => {
    if (!isDataUrl(font.fileUrl)) return null;
    const fileType = normalizeFontFileType(font.type);
    if (!fileType) throw new Error('font_preset_file_type_invalid');
    const fileId = `${font.code}-${Date.now()}-${createRandomIdSegment(9)}`;
    const uploaded = await uploadBase64ToStorage({
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        fileId,
        path: `${COLLECTION}/${fileId}`,
        type: fileType,
        url: font.fileUrl,
    });
    if (!isFirebaseStorageReference(uploaded)) throw new Error('font_preset_upload_invalid');
    return uploaded;
};

export const addFontPreset = async (fontDetails: FontPresetsType) => {
    return await apiCallComposer(
        async () => {
            const uploadedUrl = await uploadFontDataUrl(fontDetails);
            const nextFont = normalizeFontPreset({
                ...fontDetails,
                fileUrl: uploadedUrl || fontDetails.fileUrl,
            });
            if (!nextFont) {
                await cleanupFontFile(uploadedUrl, 'font_preset_invalid_upload_cleanup_failed');
                throw new Error('font_preset_payload_invalid');
            }

            let persistenceAttempted = false;
            try {
                const payload = await requestBodyComposer(nextFont, { isNew: true });
                persistenceAttempted = true;
                const fontDoc = await addDoc(getCollectionRef(), payload);
                return { ...nextFont, id: fontDoc.id };
            } catch (error) {
                if (uploadedUrl && persistenceAttempted) {
                    logStaticAssetFailure(
                        'font_preset_ambiguous_create_file_retained',
                        new Error('persistence_outcome_ambiguous'),
                        getStaticAssetEntityLogContext('fontPreset'),
                    );
                } else {
                    await cleanupFontFile(uploadedUrl, 'font_preset_pre_persist_create_cleanup_failed');
                }
                throw error;
            }
        },
        fontDetails,
        "addFontPreset",
    );
};

export const updateFontPreset = async (fontDetails: FontPresetsType) => {
    return await apiCallComposer(
        async () => {
            const fontId = String(fontDetails.id || '').trim();
            const fontRef = getDocRef(fontId);
            const currentSnap = await getDoc(fontRef);
            if (!currentSnap.exists()) throw new Error('font_preset_not_found');
            const current = normalizeFontPreset(currentSnap.data(), currentSnap.id);
            if (!current) throw new Error('font_preset_persisted_shape_invalid');

            const uploadedUrl = await uploadFontDataUrl(fontDetails);
            const nextFont = normalizeFontPreset({
                ...fontDetails,
                id: fontId,
                fileUrl: uploadedUrl || fontDetails.fileUrl || current.fileUrl,
            }, fontId);
            if (!nextFont) {
                await cleanupFontFile(uploadedUrl, 'font_preset_invalid_update_cleanup_failed', fontId);
                throw new Error('font_preset_payload_invalid');
            }

            let persistenceAttempted = false;
            try {
                const payload = await requestBodyComposer(nextFont, { isNew: false });
                persistenceAttempted = true;
                await updateDoc(fontRef, payload);
            } catch (error) {
                if (uploadedUrl && persistenceAttempted) {
                    logStaticAssetFailure(
                        'font_preset_ambiguous_update_file_retained',
                        new Error('persistence_outcome_ambiguous'),
                        getStaticAssetEntityLogContext('fontPreset', fontId),
                    );
                } else {
                    await cleanupFontFile(uploadedUrl, 'font_preset_pre_persist_update_cleanup_failed', fontId);
                }
                throw error;
            }

            if (uploadedUrl && uploadedUrl !== current.fileUrl) {
                deferPersistedFontFileCleanup(current.fileUrl, fontId);
            }
            return nextFont;
        },
        fontDetails,
        "updateFontPreset",
    );
};

export const sortFontsPresets = async (updatedList: FontPresetsType[]) => {
    return await apiCallComposer(
        async () => {
            const desiredIndexes = new Map<string, number>();
            updatedList.forEach((font, index) => {
                const fontId = String(font.id || '').trim();
                if (!isValidFirestoreDocumentId(fontId) || desiredIndexes.has(fontId)) {
                    throw new Error('font_preset_sort_identity_invalid');
                }
                desiredIndexes.set(fontId, index);
            });

            const querySnapshot = await getDocs(getCollectionRef());
            if (querySnapshot.size !== desiredIndexes.size) {
                throw new Error('font_preset_sort_set_mismatch');
            }
            const batch = writeBatch(firebaseClient);
            querySnapshot.docs.forEach((fontDoc) => {
                const nextIndex = desiredIndexes.get(fontDoc.id);
                if (nextIndex === undefined) throw new Error('font_preset_sort_set_mismatch');
                batch.update(fontDoc.ref, { index: nextIndex });
            });
            await batch.commit();
            return SUCCESS_RESPONSE;
        },
        { fontCount: updatedList.length },
        "sortFontsPresets",
    );
};

export const getFontPresets = async (): Promise<FontPresetsType[]> => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(firestoreQuery(
                getCollectionRef(),
                firestoreLimit(MAX_FONT_PRESETS + 1),
            ));
            if (querySnapshot.size > MAX_FONT_PRESETS) {
                logStaticAssetDiagnostic('font_preset_document_limit_exceeded', {
                    entityType: 'fontPreset',
                    documentCount: querySnapshot.size,
                    documentLimit: MAX_FONT_PRESETS,
                });
                throw new Error('font_preset_document_limit_exceeded');
            }
            return querySnapshot.docs.flatMap((fontDoc) => {
                const normalized = normalizeFontPreset(fontDoc.data(), fontDoc.id);
                if (normalized) return [normalized];
                logStaticAssetDiagnostic(
                    'font_preset_document_shape_invalid',
                    getStaticAssetEntityLogContext('fontPreset', fontDoc.id),
                );
                return [];
            });
        },
        "getFontPresets",
    );
};

export const deletFontPreset = async (id: string, _src?: string) => {
    return await apiCallComposer(
        async () => {
            const fontId = String(id || '').trim();
            const fontRef = getDocRef(fontId);
            const currentSnap = await getDoc(fontRef);
            if (!currentSnap.exists()) throw new Error('font_preset_not_found');
            const current = normalizeFontPreset(currentSnap.data(), currentSnap.id);
            await deleteDoc(fontRef);
            deferPersistedFontFileCleanup(current?.fileUrl, fontId);
            return SUCCESS_RESPONSE;
        },
        id,
        "deleteFontPreset",
    );
};
