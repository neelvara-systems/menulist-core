import { ERROR_RESPONSE, SUCCESS_RESPONSE } from "@constant/common";
import { DB_COLLECTIONS, FONT_PRESET_ASSET_COLLECTION } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { addDoc, collection } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { FontPresetsType } from "@type/assets";
import { deleteDoc, doc, getDocs, updateDoc, writeBatch } from "firebase/firestore";

const COLLECTION = `${DB_COLLECTIONS.COMMON}/${DB_COLLECTIONS.ASSETS}/${FONT_PRESET_ASSET_COLLECTION}`;

const getCollectionRef = () => {
    return collection(firebaseClient, `${COLLECTION}`)
}

const getDocRef = async (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const addFontPreset = async (fontDetails: FontPresetsType) => {
    return await apiCallComposer(
        async () => {
            if (fontDetails.fileUrl) {
                let fileUrl: any = await uploadBase64ToStorage({
                    fileId: fontDetails.code,
                    url: fontDetails.fileUrl,
                    path: `${COLLECTION}/${fontDetails.code}`,
                    type: "jpeg"
                })
                fontDetails.fileUrl = fileUrl;
            }
            const docRef = await addDoc(getCollectionRef(), await requestBodyComposer(fontDetails));
            const docId = docRef.id
            return {
                id: docId,
                ...fontDetails
            };
        },
        fontDetails,
        "addFontPreset"
    );
}

export const updateFontPreset = async (fontDetails: FontPresetsType) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = doc(firebaseClient, `${COLLECTION}`, fontDetails.id);
            const docRef = await updateDoc(collectionDocRef, await requestBodyComposer(fontDetails));
            return fontDetails;
        },
        fontDetails,
        "updateFontPreset"
    );
}

export const sortFontsPresets = async (updatedList: FontPresetsType[]) => {
    return await apiCallComposer(
        async () => {

            try {
                const querySnapshot = await getDocs(getCollectionRef());
                const batch = writeBatch(firebaseClient);
                querySnapshot.forEach((doc) => {
                    const newIndex = updatedList.find(f => f.id == doc.id).index;
                    batch.update(doc.ref, { index: newIndex });
                });
                await batch.commit();
                return SUCCESS_RESPONSE
            } catch (e) {
                return ERROR_RESPONSE
            }

        },
        "sortFontsPresets"
    );
}
export const getFontPresets = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getFontPresets"
    );
}

export const deletFontPreset = async (id, src) => {
    return await apiCallComposer(
        async () => {
            if (src) {
                await deleteFileByUrl(src);
            }
            const collectionDocRef = await getDocRef(id);
            await deleteDoc(collectionDocRef);
            return SUCCESS_RESPONSE
        },
        id, "deletFontPreset"
    );
}