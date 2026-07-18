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
import { filterUnreferencedObpMediaUrls } from '@lib/media/obpMediaReferences';
import { prepareMediaImage, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import { uploadPreparedMediaImage } from '@database/storage/uploadPreparedMediaImage';
import { getBoundedStringLogContext, logStorageHelperFailure } from '@database/storage/storageDiagnostics';
import { ref, deleteObject } from 'firebase/storage';

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
    const resolvedPrepared = prepared || await prepareMediaImage(file, 'galleryImage');
    return uploadPreparedMediaImage({
        blob: resolvedPrepared.blob,
        contentType: resolvedPrepared.mimeType,
        entityId: `gallery-${index}`,
        prepared: resolvedPrepared,
        profile: 'galleryImage',
        storeId: session.sId,
        tenantId: session.tId,
        variant: 'full',
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
    const resolvedPrepared = prepared || await prepareMediaImage(file, 'businessCover');
    return uploadPreparedMediaImage({
        blob: resolvedPrepared.blob,
        contentType: resolvedPrepared.mimeType,
        entityId: 'official-page-cover',
        prepared: resolvedPrepared,
        profile: 'businessCover',
        storeId: session.sId,
        tenantId: session.tId,
        variant: 'hero',
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

export async function deleteOBPPhotos(
    photoUrls: Array<string | null | undefined>,
    retainedPhotoUrls: Array<string | null | undefined> = [],
): Promise<string[]> {
    const uniquePhotoUrls = filterUnreferencedObpMediaUrls(photoUrls, retainedPhotoUrls);

    if (uniquePhotoUrls.length === 0) return [];

    const results = await Promise.allSettled(
        uniquePhotoUrls.map((photoUrl) => deleteOBPPhoto(photoUrl)),
    );

    const failedPhotoUrls = uniquePhotoUrls.filter((_, index) => results[index]?.status === 'rejected');
    const failedIndex = results.findIndex((result) => result.status === 'rejected');
    const failed = failedIndex >= 0 ? results[failedIndex] : null;
    if (failed?.status === 'rejected') {
        logStorageHelperFailure(
            'storage_obp_photo_batch_delete_failed',
            failed.reason,
            {
                requestedDeleteCount: uniquePhotoUrls.length,
                failedDeleteCount: failedPhotoUrls.length,
                ...getBoundedStringLogContext('firstFailedPhotoUrl', uniquePhotoUrls[failedIndex]),
            },
        );
    }

    return failedPhotoUrls;
}
