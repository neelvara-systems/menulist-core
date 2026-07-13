import { DB_COLLECTIONS } from "@constant/database";
import { reserveNextPlatformEntityId } from "@database/platformSummary";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDocs, limit, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { AUTH_BROWSER_REQUEST_POLICY } from "@lib/auth/browserRequestPolicy";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.TENANTS;
const TENANT_NAME_RESPONSE_MAX_BYTES = 32 * 1024;

const updateTenantNameAtomically = async (params: {
    name: string;
    storesList?: unknown[];
    tenantId: string | number;
}): Promise<void> => {
    const storesList = Array.isArray(params.storesList)
        ? params.storesList
            .filter((store): store is Record<string, unknown> => Boolean(store) && typeof store === 'object' && !Array.isArray(store))
            .map((store) => ({ name: store.name, storeId: store.storeId }))
        : undefined;
    const response = await fetch('/api/tenants/name', {
        ...AUTH_BROWSER_REQUEST_POLICY,
        body: JSON.stringify({ name: params.name, storesList, tenantId: params.tenantId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, TENANT_NAME_RESPONSE_MAX_BYTES);
    if (
        !response.ok
        || !payload
        || typeof payload !== 'object'
        || Array.isArray(payload)
        || (payload as { success?: unknown }).success !== true
        || String((payload as { tenantId?: unknown }).tenantId || '') !== String(params.tenantId)
    ) {
        throw new Error('tenant_name_update_rejected');
    }
};

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

export const getTenantByEmail = async (email: string) => {
    const q = query(getCollectionRef(), where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const tenantDoc = querySnapshot.docs[0];
    return { ...tenantDoc.data(), id: tenantDoc.id };
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
            if (from !== "onboarding") {
                data.tenantId = await reserveNextPlatformEntityId('tenant');
            }
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
            await setDoc(docRef, await requestBodyComposer(data, { isNew: true }));
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
                await updateTenantNameAtomically({
                    name: nextTenantName,
                    storesList: Array.isArray(sourceStoresList) ? sourceStoresList : undefined,
                    tenantId: docId,
                });
            }
            const directTenantUpdate = { ...data };
            if (shouldPropagateTenantName) {
                delete directTenantUpdate.name;
                delete directTenantUpdate.storesList;
            }
            if (Object.keys(directTenantUpdate).length > 0) {
                const composedData = await requestBodyComposer(directTenantUpdate, { isNew: false });
                await updateDoc(collectionDocRef, composedData);
            }
            return data;
        },
        data,
        "updateTenant"
    );
}

export function assertTenantUpdateSucceeded(
    result: unknown,
    expectedTenantId?: string | number,
    rejectionCode = 'tenant_update_rejected',
): asserts result is Record<string, unknown> {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    if (expectedTenantId === undefined || expectedTenantId === null) return;

    const savedTenantId = (result as { tenantId?: unknown; id?: unknown }).tenantId
        ?? (result as { tenantId?: unknown; id?: unknown }).id;
    if (String(savedTenantId) !== String(expectedTenantId)) {
        throw new Error(rejectionCode);
    }
}
