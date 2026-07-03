
import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";


type fileData = {
    componentId: any,
    url: any,
    name: any,
}
const uploadBlobFileToStorage = (fileData: fileData): Promise<string | null> => {
    return new Promise((resolve) => {
        try {
            // Create the file metadata
            /** @type {any} */
            const metadata = {
                componentId: fileData.componentId,
                contentType: 'image/jpeg'
            };

            // Upload file and metadata to the object 'images/mountains.jpg'
            const storageRef = ref(firebaseStorage, 'templates/' + fileData.componentId + "/" + fileData.name);
            const uploadTask = uploadBytesResumable(storageRef, fileData.url, metadata);

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
