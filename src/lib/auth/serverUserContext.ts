import { DB_COLLECTIONS } from "@constant/database";
import { DEFAULT_PRODUCT_ID } from "@constant/product";
import {
    ECOMSAI_PLATFORM_STORE_ID,
    ECOMSAI_PLATFORM_TENANT_ID,
    ECOMSAI_PLATFORM_USER_ID,
    ECOMSAI_PLATFORM_USER_NAME,
    ECOMSAI_PLATFORM_USER_ROLE,
} from "@constant/user";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { formatStaffLoginId, getPhoneLookupCandidates, normalizeLoginDigits } from "@lib/auth/loginIdentifiers";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/server";
import { removeDangerousKeys } from "@lib/security/sanitizeObject";

const USERS_COLLECTION = DB_COLLECTIONS.USERS;

export const normalizePhoneUsername = normalizeLoginDigits;

const normalizeEmail = (email: string) => String(email || '').toLowerCase().trim();

const sanitizeForAdminFirestore = <T>(value: T): T => {
    if (value === undefined) return null as T;
    if (value === null) return value;

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeForAdminFirestore(item)) as T;
    }

    if (typeof value === 'object') {
        if ((value as any).constructor?.name === 'Timestamp') {
            return value;
        }

        const result: Record<string, unknown> = {};
        Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
            result[key] = sanitizeForAdminFirestore(entryValue);
        });
        return result as T;
    }

    return value;
};

const getUsersCollection = () => firestoreAdmin.collection(USERS_COLLECTION);

const getFirstAuthUserByField = async (field: string, value: string) => {
    const snapshot = await getUsersCollection()
        .where(field, "==", value)
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    const safeData = removeDangerousKeys(userDoc.data());
    return { ...safeData, id: userDoc.id };
};

export const getAuthUserByEmail = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    return getFirstAuthUserByField("email", normalizedEmail);
};

export const getAuthUserByLoginIdentifier = async (identifier: string) => {
    const normalizedIdentifier = String(identifier || '').toLowerCase().trim();
    if (!normalizedIdentifier) return null;

    if (normalizedIdentifier.includes('@')) {
        return getAuthUserByEmail(normalizedIdentifier);
    }

    const phoneUsername = normalizePhoneUsername(normalizedIdentifier);
    if (!phoneUsername) return null;

    for (const field of ['username', 'loginUsername', 'phoneUsername']) {
        const user = await getFirstAuthUserByField(field, phoneUsername);
        if (user) return user;
    }

    const staffLoginId = formatStaffLoginId(phoneUsername);
    if (staffLoginId) {
        const user = await getFirstAuthUserByField('staffLoginId', staffLoginId);
        if (user) return user;
    }

    for (const candidate of getPhoneLookupCandidates(normalizedIdentifier)) {
        for (const field of ['phone', 'phoneNumber']) {
            const user = await getFirstAuthUserByField(field, candidate);
            if (user) return user;
        }
    }

    return null;
};

export const addAuthPlatformUser = async (data: any) => {
    const normalizedEmail = normalizeEmail(data?.email);

    if (normalizedEmail) {
        const existing = await getAuthUserByEmail(normalizedEmail);
        if (existing) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }
    }

    const now = admin.firestore.Timestamp.now();
    const userToAdd = sanitizeForAdminFirestore({
        ...data,
        email: normalizedEmail || data?.email || null,
        pId: data?.pId ?? DEFAULT_PRODUCT_ID,
        sId: data?.sId ?? ECOMSAI_PLATFORM_STORE_ID,
        tId: data?.tId ?? ECOMSAI_PLATFORM_TENANT_ID,
        role: data?.role ?? ECOMSAI_PLATFORM_USER_ROLE,
        uId: data?.uId ?? ECOMSAI_PLATFORM_USER_ID,
        modifiedBy: data?.modifiedBy ?? ECOMSAI_PLATFORM_USER_NAME,
        modifiedOn: now,
        createdBy: data?.createdBy ?? ECOMSAI_PLATFORM_USER_NAME,
        createdOn: data?.createdOn ?? now,
    });

    const docRef = await getUsersCollection().add(userToAdd);
    await docRef.set({ id: docRef.id }, { merge: true });

    return { ...userToAdd, id: docRef.id };
};

export const getAuthEntitySnapshot = async (collectionName: string, id?: string | number | null) => {
    if (id == null || id === '') return null;

    const rawDocumentId = typeof id === 'string' || typeof id === 'number' ? String(id) : '';
    const documentId = rawDocumentId.trim();
    if (documentId !== rawDocumentId || !isValidFirestoreDocumentId(documentId)) return null;

    const scopeDocumentId = collectionName === DB_COLLECTIONS.TENANTS || collectionName === DB_COLLECTIONS.STORES
        ? normalizeStorePermissionScopeDocumentId(id)?.documentId
        : documentId;
    if (!scopeDocumentId) return null;

    const snapshot = await firestoreAdmin.collection(collectionName).doc(scopeDocumentId).get();
    return snapshot.exists ? snapshot.data() : null;
};
