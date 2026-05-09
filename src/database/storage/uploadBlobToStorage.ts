import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { getDownloadURL, ref, uploadBytes, type UploadMetadata } from "firebase/storage";

interface UploadBlobToStorageData {
    blob: Blob;
    contentType?: string;
    customMetadata?: Record<string, string>;
    path: string;
}

export default async function uploadBlobToStorage({
    blob,
    contentType,
    customMetadata,
    path,
}: UploadBlobToStorageData): Promise<string> {
    const metadata: UploadMetadata = {
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
