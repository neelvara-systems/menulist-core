import { DB_COLLECTIONS } from "@constant/database";
import { getOwnerRoleId } from "@data/defaultRoles";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import type { Firestore } from "firebase-admin/firestore";

type StoreAccessUpdate = {
    stores?: Array<Record<string, unknown>>;
    storeIds?: number[];
    modifiedOn?: string;
};

const normalizeStoreId = (value: unknown): number | null => {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && String(parsed) === raw ? parsed : null;
};

export const normalizeUserStoreAccessDocumentId = (value: unknown): string | null => {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    return documentId === raw && documentId.length <= 160 && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
};

export const buildUserStoreAccessUpdate = (
    userData: Record<string, any> | undefined,
    storeId: number,
    storeName: string,
    roleId?: string,
): StoreAccessUpdate | null => {
    const targetStoreId = normalizeStoreId(storeId);
    if (!userData || targetStoreId === null) return null;

    const currentStores = Array.isArray(userData.stores)
        ? userData.stores.flatMap((store: unknown) => {
            if (!store || typeof store !== "object" || Array.isArray(store)) return [];
            const mapping = store as Record<string, unknown>;
            const mappingStoreId = normalizeStoreId(mapping.storeId);
            if (mappingStoreId === null) return [];
            return [{
                storeId: mappingStoreId,
                name: typeof mapping.name === "string" ? mapping.name : "",
                role: typeof mapping.role === "string" ? mapping.role : "",
            }];
        })
        : [];
    const currentStoreIds = Array.isArray(userData.storeIds) ? userData.storeIds : [];
    const normalizedStoreIds = currentStoreIds
        .map((candidate: unknown) => normalizeStoreId(candidate))
        .filter((candidate: number | null): candidate is number => Boolean(candidate));
    const hasStoreMapping = currentStores.some((store) => store.storeId === targetStoreId);
    const hasStoreId = normalizedStoreIds.some((candidate) => candidate === targetStoreId);

    if (hasStoreMapping && hasStoreId) return null;

    const nextStoreIds = hasStoreId
        ? normalizedStoreIds
        : [...normalizedStoreIds, targetStoreId];

    const nextStores = hasStoreMapping
        ? currentStores
        : [
            ...currentStores,
            {
                storeId: targetStoreId,
                name: storeName.trim(),
                role: roleId || getOwnerRoleId(targetStoreId),
            },
        ];

    return {
        stores: nextStores,
        storeIds: Array.from(new Set(nextStoreIds)),
        modifiedOn: new Date().toISOString(),
    };
};

export const grantUserStoreAccess = async (
    db: Firestore,
    userId: string | undefined,
    storeId: number,
    storeName: string,
    roleId?: string,
) => {
    const userDocumentId = normalizeUserStoreAccessDocumentId(userId);
    const targetStoreId = normalizeStoreId(storeId);
    if (!userDocumentId || targetStoreId === null) return false;

    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userDocumentId);
    return db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const update = buildUserStoreAccessUpdate(userSnap.data(), targetStoreId, storeName, roleId);
        if (!update) return false;
        transaction.set(userRef, update, { merge: true });
        return true;
    });
};
