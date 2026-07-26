
import { firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    normalizeLegacyStoragePathSegment,
    normalizePlatformAssetBlob,
} from "@lib/storage/legacyUploadBoundary";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";


type FileData = {
    componentId: unknown,
    url: unknown,
    name: unknown,
}
const uploadBlobFileToStorage = (fileData: FileData): Promise<string | null> => {
    return new Promise((resolve) => {
        try {
            const componentId = normalizeLegacyStoragePathSegment(fileData.componentId);
            const name = normalizeLegacyStoragePathSegment(fileData.name);
            const upload = normalizePlatformAssetBlob(fileData.url);
            if (!componentId || !name || !upload) {
                throw new TypeError("storage_blob_upload_input_invalid");
            }

            // Create the file metadata
            const metadata = {
                customMetadata: { componentId },
                contentType: upload.contentType,
            };

            // Upload file and metadata to the object 'images/mountains.jpg'
            const storageRef = ref(firebaseStorage, `templates/${componentId}/${name}`);
            const uploadTask = uploadBytesResumable(storageRef, upload.bytes, metadata);

            // Listen for state changes, errors, and completion of the upload.
            uploadTask.on('state_changed',
                undefined,
                (error) => {
                    logStorageHelperFailure(
                        "storage_blob_upload_failed",
                        error,
                        {
                            ...getBoundedStringLogContext("componentId", fileData?.componentId),
                            ...getBoundedStringLogContext("name", fileData?.name),
                            hasBlob: Boolean(fileData?.url),
                        },
                    );
                    resolve(null);
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref)
                        .then((downloadURL) => {
                            resolve(downloadURL);
                        })
                        .catch((error) => {
                            logStorageHelperFailure(
                                "storage_blob_download_url_failed",
                                error,
                                {
                                    ...getBoundedStringLogContext("componentId", fileData?.componentId),
                                    ...getBoundedStringLogContext("name", fileData?.name),
                                    hasBlob: Boolean(fileData?.url),
                                },
                            );
                            resolve(null);
                        });
                }
            );
        } catch (error) {
            logStorageHelperFailure(
                "storage_blob_upload_start_failed",
                error,
                {
                    ...getBoundedStringLogContext("componentId", fileData?.componentId),
                    ...getBoundedStringLogContext("name", fileData?.name),
                    hasBlob: Boolean(fileData?.url),
                },
            );
            resolve(null);
        }
    });
}
export default uploadBlobFileToStorage;
