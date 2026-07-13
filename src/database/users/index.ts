import { DB_COLLECTIONS } from "@constant/database";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDocs, limit, query, where } from "@firebase/firestore";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { getPhoneLookupCandidates, normalizeLoginDigits } from "@lib/auth/loginIdentifiers";
import { normalizeStoreSwitchStoreId } from "@lib/multiOutlet/storeSwitchAccess";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { removeDangerousKeys } from "@lib/security/sanitizeObject";
import { objectNullCheck } from "@util/utils";
import type { PlatformBlockDetails } from "@type/platform/blocking";
import type { UserStoreMappingType } from "@type/platform/user";
import { doc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.USERS;
const PLATFORM_USER_SCOPE_QUERY_LIMIT = 500;

const normalizePlatformUserScopeId = (value: unknown, allowZero = false): number | null => {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const pattern = allowZero ? /^(0|[1-9]\d*)$/ : /^[1-9]\d*$/;
    if (!pattern.test(raw)) return null;
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) && String(numeric) === raw ? numeric : null;
};

export type PlatformUserRecord = {
    active: boolean;
    blocked?: boolean;
    blockDetails?: PlatformBlockDetails;
    deleted: boolean;
    email: string;
    id: string;
    isVerified: boolean;
    name: string;
    platformRole: string;
    profileImage: string;
    role?: string;
    storeId?: number;
    storeIds: number[];
    stores: UserStoreMappingType[];
    tenantId?: number;
};

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (value: unknown) => {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    if (documentId !== raw || documentId.length > 160 || !isValidFirestoreDocumentId(documentId)) {
        throw new Error("INVALID_PLATFORM_USER_DOCUMENT_ID");
    }
    return doc(firebaseClient, COLLECTION, documentId)
}

export const getUserByEmail = async (email: string) => {
    const q = query(getCollectionRef(), where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const userDoc = querySnapshot.docs[0];
    const safeData = removeDangerousKeys(userDoc.data());
    return { ...safeData, id: userDoc.id };
}

export const normalizePhoneUsername = normalizeLoginDigits;

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

    for (const candidate of getPhoneLookupCandidates(normalizedIdentifier)) {
        const phoneUser = await getFirstUserByField('phone', candidate);
        if (phoneUser) return phoneUser;

        const phoneNumberUser = await getFirstUserByField('phoneNumber', candidate);
        if (phoneNumberUser) return phoneNumberUser;
    }

    return null;
}

const getScopedPlatformUsers = async (
    field: "storeIds" | "tenantId",
    scopeId: unknown,
) => {
    const numericScopeId = normalizePlatformUserScopeId(scopeId, field === "tenantId");
    if (numericScopeId === null) return [];
    const values: Array<number | string> = [numericScopeId, String(numericScopeId)];
    const snapshots = await Promise.all(values.map((value) => getDocs(query(
        getCollectionRef(),
        where(field, field === "storeIds" ? "array-contains" : "==", value),
        limit(PLATFORM_USER_SCOPE_QUERY_LIMIT + 1),
    ))));
    const users = new Map<string, PlatformUserRecord>();
    snapshots.forEach((snapshot) => snapshot.docs.forEach((userDoc) => {
        const data = removeDangerousKeys(userDoc.data());
        const storedScopeMatches = field === "tenantId"
            ? normalizePlatformUserScopeId(data.tenantId, true) === numericScopeId
            : Array.isArray(data.storeIds)
                && data.storeIds.some((storeId: unknown) => normalizeStoreSwitchStoreId(storeId) === numericScopeId);
        if (!storedScopeMatches) return;
        const stores = Array.isArray(data.stores)
            ? data.stores.flatMap((candidate: unknown) => {
                if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
                const mapping = candidate as Record<string, unknown>;
                const mappingStoreId = normalizeStoreSwitchStoreId(mapping.storeId);
                if (mappingStoreId === null) return [];
                return [{
                    name: typeof mapping.name === "string" ? mapping.name : "",
                    role: typeof mapping.role === "string" ? mapping.role : "",
                    storeId: mappingStoreId,
                }];
            })
            : [];
        const storeIds = Array.isArray(data.storeIds)
            ? Array.from(new Set(data.storeIds
                .map(normalizeStoreSwitchStoreId)
                .filter((storeId): storeId is number => storeId !== null)))
            : stores.map(({ storeId }) => storeId);
        const tenantId = normalizeStoreSwitchStoreId(data.tenantId);
        const storeId = normalizeStoreSwitchStoreId(data.storeId);
        users.set(userDoc.id, {
            active: data.active !== false,
            blocked: data.blocked === true,
            blockDetails: data.blockDetails && typeof data.blockDetails === "object"
                ? data.blockDetails as PlatformBlockDetails
                : undefined,
            deleted: data.deleted === true,
            email: typeof data.email === "string" ? data.email : "",
            id: userDoc.id,
            isVerified: data.isVerified === true,
            name: typeof data.name === "string" ? data.name : "",
            platformRole: typeof data.platformRole === "string" ? data.platformRole : "",
            profileImage: typeof data.profileImage === "string" ? data.profileImage : "",
            role: typeof data.role === "string" ? data.role : undefined,
            storeId: storeId ?? undefined,
            storeIds,
            stores,
            tenantId: tenantId ?? undefined,
        });
    }));
    if (users.size > PLATFORM_USER_SCOPE_QUERY_LIMIT) throw new Error("PLATFORM_USER_SCOPE_LIMIT_EXCEEDED");
    return Array.from(users.values());
};

export const getUserByTenantId = (tenantId: unknown) => {
    return apiCallComposer(
        () => getScopedPlatformUsers("tenantId", tenantId),
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

export const updatePlatformUser = async (data: any) => {
    return await apiCallComposer(
        async () => {
            return await updateUser(data);
        },
        data,
        "updatePlatformUser"
    );
}

export function assertUserUpdateSucceeded(
    result: unknown,
    expectedUserId?: string | number,
    rejectionCode = 'user_update_rejected',
): asserts result is Record<string, unknown> {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    if (expectedUserId === undefined || expectedUserId === null) return;

    const savedUserId = (result as { id?: unknown; userId?: unknown }).id
        ?? (result as { id?: unknown; userId?: unknown }).userId;
    if (String(savedUserId) !== String(expectedUserId)) {
        throw new Error(rejectionCode);
    }
}
