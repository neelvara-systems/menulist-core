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
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/server";
import { removeDangerousKeys } from "@lib/security/sanitizeObject";
import { createHash } from "crypto";

const USERS_COLLECTION = DB_COLLECTIONS.USERS;

export class AuthUserIdentityConflictError extends Error {
    constructor() {
        super('Authentication identity is not unique.');
        this.name = 'AuthUserIdentityConflictError';
        Object.setPrototypeOf(this, AuthUserIdentityConflictError.prototype);
    }
}

export const normalizePhoneUsername = normalizeLoginDigits;

const normalizeEmail = (email: string) => String(email || '').toLowerCase().trim();

export const getGlobalEmailUserDocumentId = (email: string): string | null => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;
    return `oauth_${createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 40)}`;
};

export const getOAuthUserDocumentId = getGlobalEmailUserDocumentId;

const getUsersCollection = () => firestoreAdmin.collection(USERS_COLLECTION);

const getAuthUsersByField = async (
    collection: FirebaseFirestore.CollectionReference,
    field: string,
    value: string,
) => {
    const snapshot = await collection
        .where(field, "==", value)
        .limit(2)
        .get();

    return snapshot.docs.map((userDoc) => ({
        ...removeDangerousKeys(userDoc.data()),
        id: userDoc.id,
    }));
};

const getUniqueAuthUserFromMatches = (matches: Array<{ id: string; [key: string]: unknown }>) => {
    const uniqueMatches = new Map(matches.map((match) => [match.id, match]));
    if (uniqueMatches.size > 1) throw new AuthUserIdentityConflictError();
    return uniqueMatches.values().next().value || null;
};

export const getUniqueAuthUserByEmailFromCollection = async (
    collection: FirebaseFirestore.CollectionReference,
    email: string,
) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    return getUniqueAuthUserFromMatches(await getAuthUsersByField(collection, 'email', normalizedEmail));
};

export const getAuthUserByEmail = async (email: string) => {
    return getUniqueAuthUserByEmailFromCollection(getUsersCollection(), email);
};

export const getAuthUserByLoginIdentifier = async (identifier: string) => {
    const normalizedIdentifier = String(identifier || '').toLowerCase().trim();
    if (!normalizedIdentifier) return null;

    if (normalizedIdentifier.includes('@')) {
        return getAuthUserByEmail(normalizedIdentifier);
    }

    const phoneUsername = normalizePhoneUsername(normalizedIdentifier);
    if (!phoneUsername) return null;

    const lookupPairs: Array<[field: string, value: string]> = [
        ['username', phoneUsername],
        ['loginUsername', phoneUsername],
        ['phoneUsername', phoneUsername],
    ];

    const staffLoginId = formatStaffLoginId(phoneUsername);
    if (staffLoginId) {
        lookupPairs.push(['staffLoginId', staffLoginId]);
    }

    for (const candidate of getPhoneLookupCandidates(normalizedIdentifier)) {
        for (const field of ['phone', 'phoneNumber']) {
            lookupPairs.push([field, candidate]);
        }
    }

    const uniqueLookupPairs = Array.from(new Map(
        lookupPairs.map(([field, value]) => [`${field}\0${value}`, [field, value] as const]),
    ).values());
    const matches = (await Promise.all(uniqueLookupPairs.map(([field, value]) => (
        getAuthUsersByField(getUsersCollection(), field, value)
    )))).flat();
    return getUniqueAuthUserFromMatches(matches);
};

export const addAuthPlatformUser = async (data: any) => {
    const normalizedEmail = normalizeEmail(data?.email);
    const userDocumentId = getOAuthUserDocumentId(normalizedEmail);
    if (!userDocumentId) throw new Error("INVALID_OAUTH_EMAIL");
    const existing = await getAuthUserByEmail(normalizedEmail);
    if (existing) return existing;

    const now = admin.firestore.Timestamp.now();
    const userToAdd = sanitizeForFirestore({
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

    const docRef = getUsersCollection().doc(userDocumentId);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);
        if (snapshot.exists) {
            const current = removeDangerousKeys(snapshot.data());
            if (normalizeEmail(String(current.email || '')) !== normalizedEmail) {
                throw new Error("OAUTH_USER_ID_CONFLICT");
            }
            return { ...current, id: snapshot.id };
        }
        const persistedUser = { ...userToAdd, id: userDocumentId };
        transaction.create(docRef, persistedUser);
        return persistedUser;
    });
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
