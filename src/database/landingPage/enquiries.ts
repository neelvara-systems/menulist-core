import { DB_COLLECTIONS } from "@constant/database";
import { collection, getDoc, getDocs, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { addDoc, doc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const getAllEnquiries = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllEnquiries"
    );
}

export const getEnquiriesByStoreId = async (storeId: any) => {
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
        "getEnquiriesByStoreId"
    );
}

export const getEnquiryById = async (id: number) => {
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
        "getEnquiryById"
    );
}

export const addEnquiry = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = await addDoc(getCollectionRef(), await requestBodyComposer(data));
            data.id = docRef.id
            return data;
        },
        data,
        "addEnquiry"
    );
}

export const updateEnquiry = async (data: any) => {
    return await apiCallComposer(
        async () => {
            await updateDoc(getDocRef(data.id), data);
            return data;
        },
        data,
        "updateEnquiry"
    );
}
