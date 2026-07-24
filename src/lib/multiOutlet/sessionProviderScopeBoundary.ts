import { normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';
import { DEFAULT_PRODUCT_ID } from '@constant/product';

type SessionScopeLike = {
    pId?: unknown;
    productId?: unknown;
    sId?: unknown;
    storeId?: unknown;
    tId?: unknown;
    tenantId?: unknown;
    platformRole?: unknown;
    user?: {
        id?: unknown;
        pId?: unknown;
        productId?: unknown;
        sId?: unknown;
        storeId?: unknown;
        tId?: unknown;
        tenantId?: unknown;
        platformRole?: unknown;
    } | null;
};

const normalizeConsistentPositiveIds = (values: unknown[]): number | null => {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (!supplied.length) return null;
    const normalized = supplied.map(normalizeStoreSwitchStoreId);
    const first = normalized[0];
    return first && normalized.every((value) => value === first) ? first : null;
};

const normalizeConsistentProductIds = (values: unknown[]): string | null => {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (!supplied.length) return null;
    const normalized = supplied.map((value) => (
        typeof value === 'string' && value === value.trim()
            ? value.toUpperCase()
            : null
    ));
    const first = normalized[0];
    return first && normalized.every((value) => value === first) ? first : null;
};

const normalizeSessionUserId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized === value && normalized.length <= 256 ? normalized : null;
};

const getSessionProviderScopeIdentity = (session: unknown): {
    productId: string;
    storeId: number | null;
    tenantId: number | null;
    userId: string;
    platformRole: 'PLATFORM' | null;
} | null => {
    if (!session || typeof session !== 'object' || Array.isArray(session)) return null;
    const candidate = session as SessionScopeLike;
    const userId = normalizeSessionUserId(candidate.user?.id);
    const tenantValues = [
        candidate.tenantId,
        candidate.tId,
        candidate.user?.tenantId,
        candidate.user?.tId,
    ];
    const storeValues = [
        candidate.storeId,
        candidate.sId,
        candidate.user?.storeId,
        candidate.user?.sId,
    ];
    if (!userId) return null;

    const suppliedProductValues = [
        candidate.pId,
        candidate.productId,
        candidate.user?.pId,
        candidate.user?.productId,
    ].filter((value) => value !== undefined && value !== null);
    const productId = suppliedProductValues.length
        ? normalizeConsistentProductIds(suppliedProductValues)
        : 'ML';
    if (!productId) return null;

    const suppliedTenantValues = tenantValues.filter((value) => value !== undefined && value !== null);
    const suppliedStoreValues = storeValues.filter((value) => value !== undefined && value !== null);
    if (!suppliedTenantValues.length && !suppliedStoreValues.length) {
        const suppliedPlatformRoles = [candidate.platformRole, candidate.user?.platformRole]
            .filter((value) => value !== undefined && value !== null);
        const platformRole = suppliedPlatformRoles.length
            && suppliedPlatformRoles.every((value) => value === 'PLATFORM')
            ? 'PLATFORM'
            : null;
        return platformRole ? { productId, userId, tenantId: null, storeId: null, platformRole } : null;
    }

    const tenantId = normalizeConsistentPositiveIds(tenantValues);
    const storeId = normalizeConsistentPositiveIds(storeValues);
    if (!tenantId || !storeId) return null;
    return { productId, userId, tenantId, storeId, platformRole: null };
};

export const getSessionProviderScopeKey = (session: unknown): string | null => {
    const identity = getSessionProviderScopeIdentity(session);
    if (!identity) return null;
    return identity.platformRole === 'PLATFORM'
        ? JSON.stringify([identity.productId, identity.userId, 'platform', identity.platformRole])
        : JSON.stringify([identity.productId, identity.userId, identity.tenantId, identity.storeId]);
};

export const getMenuListSessionProviderScopeKey = (session: unknown): string | null => {
    const identity = getSessionProviderScopeIdentity(session);
    return identity?.productId === DEFAULT_PRODUCT_ID && identity.storeId && identity.tenantId
        ? JSON.stringify([identity.productId, identity.userId, identity.tenantId, identity.storeId])
        : null;
};

export const getSubscriptionLoadScopeKey = (tenantId: unknown, storeId: unknown): string | null => {
    const normalizedTenantId = normalizeStoreSwitchStoreId(tenantId);
    const normalizedStoreId = normalizeStoreSwitchStoreId(storeId);
    return normalizedTenantId && normalizedStoreId
        ? `${normalizedTenantId}:${normalizedStoreId}`
        : null;
};

export const hasSessionProviderScopeChanged = (
    previousScopeKey: string | null | undefined,
    currentScopeKey: string | null,
): boolean => previousScopeKey !== undefined && previousScopeKey !== currentScopeKey;
