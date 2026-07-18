import { firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    getDownloadURL,
    getMetadata,
    ref,
    uploadBytes,
    type FullMetadata,
    type UploadMetadata,
} from "firebase/storage";

interface UploadBlobToStorageData {
    blob: Blob;
    cacheControl?: string;
    contentType?: string;
    customMetadata?: Record<string, string>;
    path: string;
}

export interface CreateOrReuseBlobResult {
    created: boolean;
    url: string;
}

function getUploadMetadata({
    blob,
    cacheControl,
    contentType,
    customMetadata,
}: Omit<UploadBlobToStorageData, 'path'>): UploadMetadata {
    return {
        ...(cacheControl ? { cacheControl } : {}),
        contentType: contentType || blob.type || 'application/octet-stream',
        customMetadata: {
            uploadedAt: new Date().toISOString(),
            ...(customMetadata || {}),
        },
    };
}

export function storageObjectMatchesUpload(
    existing: Pick<FullMetadata, 'contentType' | 'customMetadata' | 'size'>,
    expected: Pick<UploadBlobToStorageData, 'blob' | 'contentType' | 'customMetadata'>,
): boolean {
    const expectedContentType = expected.contentType || expected.blob.type || 'application/octet-stream';
    if (existing.size !== expected.blob.size || existing.contentType !== expectedContentType) return false;

    return Object.entries(expected.customMetadata || {}).every(([key, value]) => (
        existing.customMetadata?.[key] === value
    ));
}

/**
 * Creates an immutable object, or reuses the object when Storage rules reject
 * an overwrite of the same content-addressed path.
 */
export async function createOrReuseBlobInStorage(
    data: UploadBlobToStorageData,
): Promise<CreateOrReuseBlobResult> {
    const storageRef = ref(firebaseStorage, data.path);

    try {
        await uploadBytes(storageRef, data.blob, getUploadMetadata(data));
    } catch (uploadError) {
        let existingMetadata: FullMetadata;
        try {
            existingMetadata = await getMetadata(storageRef);
        } catch {
            throw uploadError;
        }
        if (!storageObjectMatchesUpload(existingMetadata, data)) {
            throw new Error('storage_immutable_object_identity_mismatch');
        }
        try {
            return {
                created: false,
                url: await getDownloadURL(storageRef),
            };
        } catch {
            throw uploadError;
        }
    }

    return {
        created: true,
        url: await getDownloadURL(storageRef),
    };
}

export default async function uploadBlobToStorage({
    blob,
    cacheControl,
    contentType,
    customMetadata,
    path,
}: UploadBlobToStorageData): Promise<string> {
    const metadata = getUploadMetadata({ blob, cacheControl, contentType, customMetadata });
    const storageRef = ref(firebaseStorage, path);

    await uploadBytes(storageRef, blob, metadata);
    return getDownloadURL(storageRef);
}
