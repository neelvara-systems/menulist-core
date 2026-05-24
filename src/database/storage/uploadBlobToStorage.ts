import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { getDownloadURL, ref, uploadBytes, type UploadMetadata } from "firebase/storage";

interface UploadBlobToStorageData {
    blob: Blob;
    cacheControl?: string;
    contentType?: string;
    customMetadata?: Record<string, string>;
    path: string;
}

export default async function uploadBlobToStorage({
    blob,
    cacheControl,
    contentType,
    customMetadata,
    path,
}: UploadBlobToStorageData): Promise<string> {
    const metadata: UploadMetadata = {
        ...(cacheControl ? { cacheControl } : {}),
        contentType: contentType || blob.type || 'application/octet-stream',
        customMetadata: {
            uploadedAt: new Date().toISOString(),
            ...(customMetadata || {}),
        },
    };
    const storageRef = ref(firebaseStorage, path);

    await uploadBytes(storageRef, blob, metadata);
    return getDownloadURL(storageRef);
}
