import { DB_COLLECTIONS } from "@constant/database";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDoc, getDocs, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { addDoc, doc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.BLOGS;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const getAllBlogs = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllBlogs"
    );
}

export const getBlogsByStoreId = async (storeId) => {
    return await apiCallComposer(
        async () => {
            const ref = query(await getCollectionRef(), where("storeId", "==", storeId));
            const querySnapshot = await getDocs(ref);
            if (querySnapshot.empty) {
                return ([]);
            } else {
                const list: any = [];
                querySnapshot.forEach((doc) => {
                    list.push({ ...doc.data(), id: doc.id })
                });
                return (list)
            }
        },
        storeId,
        "getBlogssByStoreId"
    );
}

export const getBlogById = async (id: number) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = await getDocRef(id);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null
            }
        },
        id,
        "getBlogById"
    );
}

const updateImage = async (data) => {

    let newUrl: any = '';
    let imageType: any = data.imageType;
    let imageToUpdate: any = data.imageToUpdate;
    const docId = data.id;

    if (imageToUpdate) {
        if (imageToUpdate?.includes('base64')) {
            //upload logo image to firebase storage
            newUrl = await uploadBase64ToStorage({
                fileId: docId,
                url: imageToUpdate,
                path: `${COLLECTION}/profileImages/${docId}`,
                type: imageType
            })
        }
        return newUrl
    } else return ''
}

export const addBlog = async (data: any) => {
    return await apiCallComposer(
        async () => {

            //add user first
            const docRef = await addDoc(getCollectionRef(), await requestBodyComposer(data));
            data.id = docRef.id
            if (data.imageToUpdate) {
                const newUrl = await updateImage(data)
                await updateDoc(getDocRef(data.id), { profileImage: newUrl });
                data.profileImage = newUrl;
                delete data.imageToUpdate;
                delete data.imageType;
            }
            return data;
        },
        data,
        "addBlog"
    );
}

export const updateBlog = async (data: any) => {
    return await apiCallComposer(
        async () => {
            if (data.imageToUpdate) {
                data.profileImage = await updateImage(data)
                delete data.imageToUpdate;
                delete data.imageType;
            }
            await updateDoc(getDocRef(data.id), data);
            return data;
        },
        data,
        "updateBlog"
    );
}
