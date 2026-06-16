import { DB_COLLECTIONS } from "@constant/database";
import { mergeStoreSummaryFields, updateTenantsCountInPlatformSummary } from "@database/platformSummary";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDocs, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { revalidatePublicClientCache } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.TENANTS;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, `${docId}`)
}

export const getAllTenants = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllTenants"
    );
}

export const getTenantByEmail = (email: string) => {
    return new Promise(async (res, rej) => {
        const q = query(getCollectionRef(), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log('User not found.');
            res(null);
        } else {
            querySnapshot.forEach(doc => res({ ...doc.data(), id: doc.id }));
        }
    })
}

export const readTenantById = async (id: number) => {
    const collectionDocRef = await getDocRef(id);
    const docSnap = await getDoc(collectionDocRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
}

export const getTenantById = async (id: number) => {
    return await apiCallComposer(
        () => readTenantById(id),
        id,
        "getTenantById"
    );
}
export const addTenant = async (data: any, from: string = "") => {
    return await apiCallComposer(
        async () => {

            let logoUrl: any = '';
            let imageType: any = data.imageType;
            let imageToUpdate: any = data.imageToUpdate;

            delete data.imageToUpdate;
            delete data.imageType;
            const docId = data.tenantId//which is tenantId
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
                data.logo = logoUrl;
            }
            data.storesList = [];
            await setDoc(docRef, await requestBodyComposer(data));
            if (from != "onboarding") {
                await updateTenantsCountInPlatformSummary()
            }
            return ({ ...data, id: docId })
        },
        data,
        "addTenant"
    );
}

export const updateTenant = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const docId = data.tenantId//which is tenantId
            const nextTenantName = typeof data.name === 'string' ? data.name.trim() : '';
            let shouldPropagateTenantName = false;
            let currentTenantData: any = null;
            if (data.imageToUpdate) {

                let logoUrl: any = data.logo;

                let imageType: any = data.imageType;
                let imageToUpdate: any = data.imageToUpdate;
                delete data.imageToUpdate;
                delete data.imageType;

                if (imageToUpdate?.includes('base64')) {
                    if (data.logo) {
                        await deleteFileByUrl(data.logo);
                    }
                    //upload logo image to firebase storage
                    logoUrl = await uploadBase64ToStorage({
                        fileId: docId,
                        url: imageToUpdate,
                        path: `${COLLECTION}/logos/${docId}`,
                        type: imageType
                    })
                }
                data.logo = logoUrl;
            }
            const collectionDocRef = doc(firebaseClient, `${COLLECTION}`, `${docId}`);
            if (nextTenantName) {
                const currentTenantSnap = await getDoc(collectionDocRef);
                currentTenantData = currentTenantSnap.exists() ? currentTenantSnap.data() : null;
                const currentTenantName = currentTenantSnap.exists()
                    ? typeof currentTenantSnap.data()?.name === 'string'
                        ? currentTenantSnap.data()?.name.trim()
                        : ''
                    : '';
                shouldPropagateTenantName = currentTenantName !== nextTenantName;
            }
            if (shouldPropagateTenantName) {
                const sourceStoresList = Array.isArray(data.storesList)
                    ? data.storesList
                    : currentTenantData?.storesList;
                if (Array.isArray(sourceStoresList)) {
                    data.storesList = sourceStoresList.map((store: any) => ({
                        ...store,
                        tenantName: nextTenantName,
                    }));
                }
            }
            const composedData = await requestBodyComposer(data);
            await updateDoc(collectionDocRef, composedData);

            if (shouldPropagateTenantName) {
                const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
                const storesQuery = query(storesRef, where("tenantId", "==", docId));
                const storesSnapshot = await getDocs(storesQuery);

                if (!storesSnapshot.empty) {
                    const batch = writeBatch(firebaseClient);
                    const storeIds: Array<string | number> = [];
                    storesSnapshot.forEach((storeDoc) => {
                        const storeId = storeDoc.data()?.storeId || storeDoc.id;
                        storeIds.push(storeId);
                        batch.update(storeDoc.ref, { tenantName: nextTenantName });
                    });
                    await batch.commit();
                    await Promise.all(storeIds.map(async (storeId) => {
                        await mergeStoreSummaryFields(storeId, { tenantName: nextTenantName });
                        await revalidatePublicClientCache(storeId, "updateTenantName");
                    }));
                }
            }
            return data;
        },
        data,
        "updateTenant"
    );
}

export const updateTenantsStoreslist = async (data) => {
    return await apiCallComposer(
        async () => {
            await setDoc(await getDocRef(data.tenantId), { "storesList": data.storesList }, { merge: true });
            return true
        },
        data,
        "updateTenantsStoreslist"
    );
}

// export const deleteTenantById = async (templateDetails: TenantDataType) => {
//     return await apiCallComposer(
//         async () => {
//             if (templateDetails.logo) {
//                 await deleteFileByUrl(templateDetails.logo);
//                 console.log("Tenant Logo Deleted")
//             }
//             const collectionDocRef = await getDocRef(templateDetails.id);
//             const templateDoc = await deleteDoc(collectionDocRef);
//             console.log("Tenant Deleted")
//             return ({ status: 200, data: true })
//         },
//         templateDetails, "deleteTemplateById"
//     );
// }
