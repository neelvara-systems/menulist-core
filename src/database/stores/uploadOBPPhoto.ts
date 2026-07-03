/**
 * OBP Photo Upload — Uploads business photos to Firebase Storage
 * 
 * Profile-aware media uploads use immutable media/{profile}/{tenantId}/{storeId}/... paths.
 * Gallery URLs are stored in publicPresence.photos[]; cover URLs are stored in publicPresence.businessCover.
 * 
 * OBP previews the first 3 photos; all uploaded photos remain available in the public image viewer.
 * @see __docs__/official-business-page/obp-infrastructure-freeze-plan.md §Priority 2
 */

import { firebaseStorage } from '@lib/firebase/firebaseClient';
import { getMediaFileExtension } from '@lib/media/mediaStorage';
import type { PreparedMediaImage } from '@lib/media/prepareMediaImage';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import { uploadPreparedMediaImage } from '@database/storage/uploadPreparedMediaImage';
import { getBoundedStringLogContext, logStorageHelperFailure } from '@database/storage/storageDiagnostics';
import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from 'firebase/storage';

function getPhotoExtension(mimeType?: string): string {
    return getMediaFileExtension(mimeType || 'image/jpeg');
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
    prepared?: PreparedMediaImage,
): Promise<string> {
    if (prepared) {
        return uploadPreparedMediaImage({
            blob: prepared.blob || file,
            contentType: prepared.mimeType || file.type,
            entityId: `gallery-${index}`,
            prepared,
            profile: 'galleryImage',
            storeId: session.sId,
            tenantId: session.tId,
            variant: 'full',
        });
    }

    const fileId = `${Date.now()}-photo-${index}.${getPhotoExtension(file.type)}`;
    const storagePath = generateStoragePath({
        collection: 'stores',
        fileType: 'obp-photos',
        session,
        fileId,
    });

    const storageRef = ref(firebaseStorage, storagePath);
    const metadata = {
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        contentType: file.type || 'image/jpeg',
    };

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
 * Upload the Official Business Page cover image to Firebase Storage.
 * The returned URL is persisted on publicPresence.businessCover by the store DAL.
 */
export async function uploadOBPCover(
    file: File | Blob,
    session: { tId: number | string; sId: number | string },
    prepared?: PreparedMediaImage,
): Promise<string> {
    if (prepared) {
        return uploadPreparedMediaImage({
            blob: prepared.blob || file,
            contentType: prepared.mimeType || file.type,
            entityId: 'official-page-cover',
            prepared,
            profile: 'businessCover',
            storeId: session.sId,
            tenantId: session.tId,
            variant: 'hero',
        });
    }

    const fileId = `${Date.now()}-business-cover.${getPhotoExtension(file.type)}`;
    const storagePath = generateStoragePath({
        collection: 'stores',
        fileType: 'obp-covers',
        session,
        fileId,
    });

    const storageRef = ref(firebaseStorage, storagePath);
    const metadata = {
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        contentType: file.type || 'image/jpeg',
    };

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

    const failedIndex = results.findIndex((result) => result.status === 'rejected');
    const failed = failedIndex >= 0 ? results[failedIndex] : null;
    if (failed?.status === 'rejected') {
        logStorageHelperFailure(
            'storage_obp_photo_batch_delete_failed',
            failed.reason,
            {
                requestedDeleteCount: uniquePhotoUrls.length,
                failedDeleteCount: results.filter((result) => result.status === 'rejected').length,
                ...getBoundedStringLogContext('firstFailedPhotoUrl', uniquePhotoUrls[failedIndex]),
            },
        );
    }
}
