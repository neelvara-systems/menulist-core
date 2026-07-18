import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable, type FirebaseStorage, type UploadMetadata } from 'firebase/storage';
import { getBoundedStringLogContext, logStorageHelperFailure } from '@database/storage/storageDiagnostics';

interface UploadResult {
  downloadURL: string;
  storagePath: string;
  fileName: string;
  type: string;
  gsUri: string;
}

type UploadLifecycleOptions = {
  cleanupOnDownloadUrlFailure?: boolean;
};

export type CompletedUploadCleanupResult =
  | { success: true }
  | { error: unknown; success: false };

export async function cleanupCompletedUploadAfterUrlFailure(
  deleteUploadedObject: () => Promise<void>,
): Promise<CompletedUploadCleanupResult> {
  try {
    await deleteUploadedObject();
    return { success: true };
  } catch (error) {
    return { error, success: false };
  }
}

export const uploadFile = (
  storagePath: string,
  file: File,
  onProgress: (progress: number) => void,
  storageOverride?: FirebaseStorage | null,
  metadata?: UploadMetadata,
  lifecycleOptions: UploadLifecycleOptions = {},
): Promise<UploadResult> => {
  const storage = storageOverride || getStorage();
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  const bucketName = storageRef.bucket;

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        logStorageHelperFailure('firebase_storage_upload_failed', error, {
          ...getBoundedStringLogContext('storagePath', storagePath),
          ...getBoundedStringLogContext('fileName', file.name),
          ...getBoundedStringLogContext('fileType', file.type),
          fileSize: file.size,
          metadataPresent: Boolean(metadata),
          storageOverridePresent: Boolean(storageOverride),
        });
        reject(new Error('Failed to upload file'));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const gsUri = `gs://${bucketName}/${storagePath}`;
          resolve({
            downloadURL,
            storagePath,
            fileName: file.name,
            type: file.type,
            gsUri
          });
        } catch (error) {
          if (lifecycleOptions.cleanupOnDownloadUrlFailure === true) {
            const cleanupResult = await cleanupCompletedUploadAfterUrlFailure(
              () => deleteObject(uploadTask.snapshot.ref),
            );
            if (cleanupResult.success === false) {
              logStorageHelperFailure('firebase_storage_unreferenced_upload_cleanup_failed', cleanupResult.error, {
                ...getBoundedStringLogContext('storagePath', storagePath),
                ...getBoundedStringLogContext('fileName', file.name),
                fileSize: file.size,
                storageOverridePresent: Boolean(storageOverride),
              });
            }
          }
          logStorageHelperFailure('firebase_storage_download_url_failed', error, {
            ...getBoundedStringLogContext('storagePath', storagePath),
            ...getBoundedStringLogContext('fileName', file.name),
            ...getBoundedStringLogContext('fileType', file.type),
            fileSize: file.size,
            metadataPresent: Boolean(metadata),
            cleanupOnDownloadUrlFailure: lifecycleOptions.cleanupOnDownloadUrlFailure === true,
            storageOverridePresent: Boolean(storageOverride),
          });
          reject(new Error('Failed to upload file'));
        }
      }
    );
  });
};
