import { normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';

type RawSessionStoreMapping = {
    role?: unknown;
    storeId?: unknown;
};

type RawSessionStoreScope = {
    storeId?: unknown;
    storeIds?: unknown;
    stores?: unknown;
    tenantId?: unknown;
};

export type AuthSessionStoreMapping = {
    role: string;
    storeId: number;
};

export type AuthSessionStoreScope = {
    storeId: number | null;
    storeIds: number[];
    stores: AuthSessionStoreMapping[];
    tenantId: number | null;
};

const normalizeSessionRole = (value: unknown): string => (
    typeof value === 'string' && value.length > 0 && value.length <= 64
        ? value
        : ''
);

export const normalizeAuthSessionStoreScope = (
    value: RawSessionStoreScope | null | undefined,
): AuthSessionStoreScope => {
    const tenantId = normalizeStoreSwitchStoreId(value?.tenantId);
    const storeId = normalizeStoreSwitchStoreId(value?.storeId);
    const storeRoles = new Map<number, string>();
    if (Array.isArray(value?.stores)) {
        value.stores.forEach((rawStore) => {
            if (!rawStore || typeof rawStore !== 'object' || Array.isArray(rawStore)) return;
            const mapping = rawStore as RawSessionStoreMapping;
            const mappedStoreId = normalizeStoreSwitchStoreId(mapping.storeId);
            if (!mappedStoreId) return;
            const role = normalizeSessionRole(mapping.role);
            const currentRole = storeRoles.get(mappedStoreId);
            if (currentRole === undefined) {
                storeRoles.set(mappedStoreId, role);
            } else if (currentRole !== role) {
                storeRoles.set(mappedStoreId, '');
            }
        });
    }
    const stores = Array.from(storeRoles, ([mappedStoreId, role]) => ({
        role,
        storeId: mappedStoreId,
    }));
    const storeIds = Array.from(new Set([
        ...(Array.isArray(value?.storeIds) ? value.storeIds : []),
        ...stores.map((store) => store.storeId),
        storeId,
    ].flatMap((candidate): number[] => {
        const normalized = normalizeStoreSwitchStoreId(candidate);
        return normalized ? [normalized] : [];
    })));

    return {
        tenantId,
        storeId,
        storeIds,
        stores,
    };
};
