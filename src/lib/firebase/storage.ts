import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';

interface UploadResult {
  downloadURL: string;
  storagePath: string;
  fileName: string;
  type: string;
  gsUri: string;
}

export const uploadFile = (
  storagePath: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<UploadResult> => {
  const storage = getStorage();
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);
  const bucketName = storageRef.bucket;

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
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
          reject(error);
        }
      }
    );
  });
};
