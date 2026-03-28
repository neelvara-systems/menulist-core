import { DB_COLLECTIONS } from "@constant/database";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection } from "@firebase/firestore";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { doc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.FILES;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, `${docId}`)
}

const updateLogoImage = async (data) => {

    let logoUrl: any = '';
    let imageType: any = data.imageType;
    let imageToUpdate: any = data.imageToUpdate;

    delete data.imageToUpdate;
    delete data.imageType;
    const docId = data.storeId//which is storeId
    const docRef = await getDocRef(`${docId}`);

    if (imageToUpdate) {
        if (imageToUpdate?.includes('base64')) {
            //upload logo image to firebase storage
            logoUrl = await uploadBase64ToStorage({
                fileId: docId,
                url: imageToUpdate,
                path: `${COLLECTION}/logos/${docId}`,
                type: imageType
            })
        }
        return logoUrl;
    } else return "";
}
