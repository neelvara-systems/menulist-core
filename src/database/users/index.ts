import { DB_COLLECTIONS } from "@constant/database";
import { getOwnerRoleId } from "@data/defaultRoles";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDocs, limit, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { removeDangerousKeys } from "@lib/security/sanitizeObject";
import { objectNullCheck } from "@util/utils";
import { addDoc, doc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.USERS;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const getUserByEmail = (email: string) => {
    return new Promise(async (res, rej) => {
        const q = query(getCollectionRef(), where("email", "==", email), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            res(null);
        } else {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            // ✅ SECURITY: Remove dangerous prototype pollution keys
            const safeData = removeDangerousKeys(data);
            res({ ...safeData, id: userDoc.id });
        }
    })
}

export const normalizePhoneUsername = (value: string) => value.replace(/[^0-9]/g, '');

const getFirstUserByField = async (field: string, value: string) => {
    const q = query(getCollectionRef(), where(field, "==", value), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const userDoc = querySnapshot.docs[0];
    const safeData = removeDangerousKeys(userDoc.data());
    return { ...safeData, id: userDoc.id };
}

export const getUserByLoginIdentifier = async (identifier: string) => {
    const normalizedIdentifier = (identifier || '').toLowerCase().trim();
    if (!normalizedIdentifier) return null;
    if (normalizedIdentifier.includes('@')) {
        return getUserByEmail(normalizedIdentifier);
    }

    const phoneUsername = normalizePhoneUsername(normalizedIdentifier);
    if (!phoneUsername) return null;

    for (const field of ['username', 'loginUsername', 'phoneUsername']) {
        const user = await getFirstUserByField(field, phoneUsername);
        if (user) return user;
    }

    const phoneUser = await getFirstUserByField('phone', phoneUsername);
    if (phoneUser) return phoneUser;

    return getFirstUserByField('phoneNumber', phoneUsername);
}

export const getUserByTenantId = (tenantId: string) => {
    return apiCallComposer(
        async () => {
            const ref = query(getCollectionRef(), where("tenantId", "==", tenantId));
            const querySnapshot = await getDocs(ref);
            if (querySnapshot.empty) {
                console.log(`${tenantId} Users not available getUserByTenantId`);
                return ([]);
            } else {
                const list: any = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // ✅ SECURITY: Remove dangerous prototype pollution keys
                    const safeData = removeDangerousKeys(data);
                    list.push({ ...safeData, id: doc.id });
                });
                return (list)
            }
        },
        tenantId,
        "getUserByTenantId"
    );
}


const uploadImage = async (data, type = '') => {

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
                path: `${COLLECTION}/${type}/${docId}`,
                type: imageType
            })
        }
        return newUrl
    } else return ''
}

const updateUser = async (data) => {

    //upload user profile image
    if (data.imageToUpdate) {
        const newUrl = await uploadImage(data)
        data.profileImage = newUrl;
        delete data.imageToUpdate;
        delete data.imageType;
    }

    //upload additional documents files
    const additionalFileToUpload = data.additionalDocuments?.filter(doc => doc.url.includes('base64')) || [];
    if (additionalFileToUpload.length) {
        for (let i = 0; i < data.additionalDocuments.length; i++) {
            if (data.additionalDocuments[i].url.includes('base64')) {
                data.additionalDocuments[i].url = await uploadImage({ imageType: data.additionalDocuments[i].type, imageToUpdate: data.additionalDocuments[i].url }, 'additionalDocuments')
            }
        }
    }

    if (objectNullCheck(data)) {
        await updateDoc(getDocRef(data.id), data);
    }
    return data;
}

export const addPlatformUser = async (data: any) => {
    return await apiCallComposer(
        async () => {
            // 🔒 EMAIL UNIQUENESS GUARD: Prevent duplicate user docs
            // @see __docs__/auth/ADR-email-uniqueness-strategy.md
            if (data.email) {
                const normalizedEmail = data.email.toLowerCase().trim();
                const q = query(getCollectionRef(), where("email", "==", normalizedEmail));
                const existing = await getDocs(q);
                if (!existing.empty) {
                    throw new Error("EMAIL_ALREADY_EXISTS");
                }
            }

            //add user first
            const userToadd = await requestBodyComposer(data)
            const docRef = await addDoc(getCollectionRef(), userToadd);
            userToadd.id = docRef.id;
            return await updateUser(userToadd);
        },
        data,
        "addPlatformUser"
    );
}

export const updatePlatformUser = async (data: any) => {
    return await apiCallComposer(
        async () => {
            return await updateUser(data);
        },
        data,
        "updatePlatformUser"
    );
}

export const getAllPlatformUsers = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllPlatformUsers"
    );
}

export const getUsersByStoreId = async (storeId) => {

    return await apiCallComposer(
        async () => {
            const ref = query(await getCollectionRef(), where("storeIds", "array-contains", storeId));
            const querySnapshot = await getDocs(ref);
            if (querySnapshot.empty) {
                console.log(`${storeId} users not available getUsersByStoreId`);
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
        "getUsersByStoreId"
    );
}

/**
 * Add store mapping to user's stores array with Owner role
 * Called when a multi-chain owner adds a new outlet store
 * 
 * @param userId - User document ID
 * @param storeId - New store ID
 * @param storeName - Store display name
 * @param roleId - Role ID to assign (defaults to Owner role for the store)
 */
export const addStoreToUser = async (
    userId: string,
    storeId: number,
    storeName: string,
    roleId?: string
) => {
    return await apiCallComposer(
        async () => {
            const userRef = getDocRef(userId);
            const userDoc = await getDocs(query(getCollectionRef(), where("id", "==", userId)));

            // Get current user data to append to stores array
            let currentStores: any[] = [];
            let currentStoreIds: number[] = [];

            userDoc.forEach((doc) => {
                const data = doc.data();
                currentStores = data.stores || [];
                currentStoreIds = data.storeIds || [];
            });

            // Add new store mapping with Owner role by default
            const newStoreMapping = {
                storeId,
                name: storeName,
                role: roleId || getOwnerRoleId()  // Simple role ID: 'owner'
            };

            // Append to existing stores
            const updatedStores = [...currentStores, newStoreMapping];
            const updatedStoreIds = [...currentStoreIds, storeId];

            await updateDoc(userRef, {
                stores: updatedStores,
                storeIds: updatedStoreIds,
                modifiedOn: new Date().toISOString()
            });

            return { stores: updatedStores, storeIds: updatedStoreIds };
        },
        { userId, storeId, storeName },
        "addStoreToUser"
    );
}
