
import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";


type jsonDataType = {
    id: any,
    path: any,
    data: any
}
const uploadJSONToStorage = async (jsonData: jsonDataType): Promise<string | null> => {
    try {
        const jsonString = JSON.stringify(jsonData.data);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Upload file and metadata to the object 'images/mountains.jpg'
        const storageRef = ref(firebaseStorage, jsonData.path);
        await uploadBytes(storageRef, blob);
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
