
import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";


type DataType = {
    name: any,
    file: any
}
const uploadFontToStorage = async (data: DataType): Promise<string | null> => {
    try {
        // Upload file and metadata to the object 'images/mountains.jpg'
        const storageRef = ref(firebaseStorage, `fonts/${data.name}`);
        await uploadBytes(storageRef, data.file);
        return await getDownloadURL(storageRef);
    } catch (error) {
        logStorageHelperFailure(
            "storage_font_upload_failed",
            error,
            {
                ...getBoundedStringLogContext("name", data?.name),
                hasFile: Boolean(data?.file),
            },
        );
        return null;
    }
}
export default uploadFontToStorage;
