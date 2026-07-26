
import { firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    normalizeFontUploadBytes,
    normalizeLegacyStoragePathSegment,
} from "@lib/storage/legacyUploadBoundary";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";


type DataType = {
    name: unknown,
    file: unknown
}
const uploadFontToStorage = async (data: DataType): Promise<string | null> => {
    try {
        const name = normalizeLegacyStoragePathSegment(data.name);
        const upload = normalizeFontUploadBytes(data.file);
        if (!name || !upload) throw new TypeError("storage_font_upload_input_invalid");

        // Upload file and metadata to the object 'images/mountains.jpg'
        const storageRef = ref(firebaseStorage, `fonts/${name}`);
        await uploadBytes(storageRef, upload.bytes, { contentType: upload.contentType });
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
