/**
 * OBP Photo Upload — Uploads business photos to Firebase Storage
 * 
 * Storage path: stores/obp-photos/{tenantId}/{storeId}/{timestamp}-{index}.jpg
 * Returns download URL to store in publicPresence.photos[]
 * 
 * OBP previews the first 3 photos; all uploaded photos remain available in the public image viewer.
 * @see __docs__/official-business-page/obp-infrastructure-freeze-plan.md §Priority 2
 */

import { firebaseStorage } from '@lib/firebase/firebaseClient';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from 'firebase/storage';

function getPhotoExtension(mimeType?: string): string {
    if (mimeType?.includes('webp')) return 'webp';
    if (mimeType?.includes('png')) return 'png';
    return 'jpg';
}

/**
 * Upload a single OBP business photo to Firebase Storage
 * @param file - File or Blob to upload
 * @param session - User session with tId and sId
 * @param index - Photo slot index
 * @returns Download URL of the uploaded photo
 */
export async function uploadOBPPhoto(
    file: File | Blob,
    session: { tId: number | string; sId: number | string },
    index: number,
): Promise<string> {
    const fileId = `${Date.now()}-photo-${index}.${getPhotoExtension(file.type)}`;
    const storagePath = generateStoragePath({
        collection: 'stores',
        fileType: 'obp-photos',
        session,
        fileId,
    });

    const storageRef = ref(firebaseStorage, storagePath);
    const metadata = { contentType: file.type || 'image/jpeg' };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            () => { },
            (error) => reject(error),
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            },
        );
    });
}

/**
 * Delete an OBP photo from Firebase Storage by its download URL
 * @param photoUrl - The download URL of the photo to delete
 */
export async function deleteOBPPhoto(photoUrl: string): Promise<void> {
    try {
        const storageRef = ref(firebaseStorage, photoUrl);
        await deleteObject(storageRef);
    } catch (error: any) {
        if (error?.code === 'storage/object-not-found') {
            return;
        }
        throw error;
    }
}

export async function deleteOBPPhotos(photoUrls: Array<string | null | undefined>): Promise<void> {
    const uniquePhotoUrls = Array.from(new Set(
        photoUrls.filter((photoUrl): photoUrl is string => (
            typeof photoUrl === 'string' &&
            photoUrl.trim().length > 0 &&
            !photoUrl.startsWith('data:')
        )),
    ));

    if (uniquePhotoUrls.length === 0) return;

    const results = await Promise.allSettled(
        uniquePhotoUrls.map((photoUrl) => deleteOBPPhoto(photoUrl)),
    );

    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
        console.warn('[deleteOBPPhotos] Some OBP photo deletes failed.', failed.reason);
    }
}
