import { DB_COLLECTIONS } from "@constant/database";
import { getOwnerRoleId } from "@data/defaultRoles";

type StoreAccessUpdate = {
    stores?: Array<Record<string, unknown>>;
    storeIds?: number[];
    modifiedOn?: string;
};

const normalizeStoreId = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const buildUserStoreAccessUpdate = (
    userData: Record<string, any> | undefined,
    storeId: number,
    storeName: string,
    roleId?: string,
): StoreAccessUpdate | null => {
    if (!userData || !storeId) return null;

    const currentStores = Array.isArray(userData.stores) ? userData.stores : [];
    const currentStoreIds = Array.isArray(userData.storeIds) ? userData.storeIds : [];
    const normalizedStoreIds = currentStoreIds
        .map((candidate: unknown) => normalizeStoreId(candidate))
        .filter((candidate: number | null): candidate is number => Boolean(candidate));
    const hasStoreMapping = currentStores.some((store: any) => normalizeStoreId(store?.storeId) === storeId);
    const hasStoreId = normalizedStoreIds.some((candidate) => candidate === storeId);

    if (hasStoreMapping && hasStoreId) return null;

    const nextStoreIds = hasStoreId
        ? normalizedStoreIds
        : [...normalizedStoreIds, storeId];

    const nextStores = hasStoreMapping
        ? currentStores
        : [
            ...currentStores,
            {
                storeId,
                name: storeName,
                role: roleId || getOwnerRoleId(storeId),
            },
        ];

    return {
        stores: nextStores,
        storeIds: Array.from(new Set(nextStoreIds)),
        modifiedOn: new Date().toISOString(),
    };
};

export const grantUserStoreAccess = async (
    db: FirebaseFirestore.Firestore,
    userId: string | undefined,
    storeId: number,
    storeName: string,
    roleId?: string,
) => {
    if (!userId || !storeId) return false;

    const userRef = db.doc(`${DB_COLLECTIONS.USERS}/${userId}`);
    const userSnap = await userRef.get();
    const update = buildUserStoreAccessUpdate(userSnap.data(), storeId, storeName, roleId);
    if (!update) return false;

    await userRef.set(update, { merge: true });
    return true;
};
