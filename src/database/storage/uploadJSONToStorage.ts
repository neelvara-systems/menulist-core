
import { firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    normalizeLegacyStorageObjectPath,
    serializeBoundedStorageJson,
} from "@lib/storage/legacyUploadBoundary";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";


type jsonDataType = {
    id: unknown,
    path: unknown,
    data: unknown
}
const uploadJSONToStorage = async (jsonData: jsonDataType): Promise<string | null> => {
    try {
        const path = normalizeLegacyStorageObjectPath(jsonData.path);
        const jsonString = serializeBoundedStorageJson(jsonData.data);
        if (!path || !jsonString) throw new TypeError("storage_json_upload_input_invalid");
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Upload file and metadata to the object 'images/mountains.jpg'
        const storageRef = ref(firebaseStorage, path);
        await uploadBytes(storageRef, blob, { contentType: "application/json" });
        return await getDownloadURL(storageRef);
    } catch (error) {
        logStorageHelperFailure(
            "storage_json_upload_failed",
            error,
            {
                ...getBoundedStringLogContext("id", jsonData?.id),
                ...getBoundedStringLogContext("path", jsonData?.path),
                hasData: Boolean(jsonData?.data),
            },
        );
        return null;
    }
}
export default uploadJSONToStorage;
