import { PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    ECOMSAI_PLATFORM_SUPPORT_USER_ROLE,
    ECOMSAI_PLATFORM_USER_ROLE,
} from '@constant/user';
import { isCanonicaProductHostname } from '@constant/canonica/domains';

export type CanonicaProductAccount = {
    tenantId: number;
    storeId: number;
    role?: string;
    platformRole?: string;
    storeIds?: Array<number | string>;
};

export const CANONICA_PRODUCT_ACCOUNT_KEY = PRODUCT_IDS.CANONICA;

const normalizeNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeProductId = (value: unknown): ProductId | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return Object.values(PRODUCT_IDS).includes(normalized as ProductId)
        ? normalized as ProductId
        : null;
};

const getProductAccounts = (sessionOrUser: any): Record<string, any> | undefined => (
    sessionOrUser?.user?.productAccounts
    || sessionOrUser?.productAccounts
);

const normalizePathname = (pathname?: string | null): string => (
    pathname === '/' ? '/' : String(pathname || '').replace(/\/+$/, '')
);

export const isCanonicaRuntimeRoute = (pathname?: string | null, hostname?: string | null): boolean => {
    const normalizedPath = normalizePathname(pathname);
    return normalizedPath === '/canonica'
        || normalizedPath.startsWith('/canonica/')
        || normalizedPath === '/__canonica'
        || normalizedPath.startsWith('/__canonica/')
        || isCanonicaProductHostname(hostname);
};

export const isCanonicaSupportClientRoute = (pathname?: string | null): boolean => {
    const normalizedPath = normalizePathname(pathname);
    return normalizedPath === '/help-center' || normalizedPath.startsWith('/help-center/');
};

export function getCanonicaProductAccount(sessionOrUser: any): CanonicaProductAccount | null {
    const productAccounts = getProductAccounts(sessionOrUser);
    const account = productAccounts?.[CANONICA_PRODUCT_ACCOUNT_KEY];
    if (!account || typeof account !== 'object') return null;
    if (account.active === false || account.deleted === true || account.authDisabled === true) return null;

    const tenantId = normalizeNumber(account.tenantId ?? account.tId);
    const storeId = normalizeNumber(account.storeId ?? account.sId);
    if (!tenantId || !storeId) return null;

    return {
        tenantId,
        storeId,
        role: typeof account.role === 'string' ? account.role : undefined,
        platformRole: typeof account.platformRole === 'string' ? account.platformRole : undefined,
        storeIds: Array.isArray(account.storeIds) ? account.storeIds : undefined,
    };
}

export function resolveCanonicaSessionScope(sessionOrUser: any): { tenantId: number; storeId: number; role?: string } | null {
    const account = getCanonicaProductAccount(sessionOrUser);
    if (account) {
        return {
            tenantId: account.tenantId,
            storeId: account.storeId,
            role: account.role,
        };
    }

    const productId = normalizeProductId(sessionOrUser?.pId)
        || normalizeProductId(sessionOrUser?.productId)
        || normalizeProductId(sessionOrUser?.user?.pId)
        || normalizeProductId(sessionOrUser?.user?.productId);
    if (productId !== PRODUCT_IDS.CANONICA) return null;

    const tenantId = normalizeNumber(sessionOrUser?.tId ?? sessionOrUser?.tenantId ?? sessionOrUser?.user?.tenantId);
    const storeId = normalizeNumber(sessionOrUser?.sId ?? sessionOrUser?.storeId ?? sessionOrUser?.user?.storeId);
    if (!tenantId || !storeId) return null;

    return {
        tenantId,
        storeId,
        role: sessionOrUser?.role || sessionOrUser?.user?.role,
    };
}

export function shouldUseCanonicaClientScopeForRoute(
    sessionOrUser: any,
    pathname?: string | null,
    hostname?: string | null,
): boolean {
    if (isCanonicaRuntimeRoute(pathname, hostname)) return true;
    return isCanonicaSupportClientRoute(pathname) && Boolean(resolveCanonicaSessionScope(sessionOrUser));
}

export function getCanonicaScopedSession<T extends Record<string, any> | null | undefined>(session: T): T {
    if (!session) return session;

    const scope = resolveCanonicaSessionScope(session);
    if (!scope) return session;

    const account = getCanonicaProductAccount(session);
    const role = account?.role || (session as any)?.role || (session as any)?.user?.role || '';
    const sourceProductId = normalizeProductId((session as any)?.pId)
        || normalizeProductId((session as any)?.productId)
        || normalizeProductId((session as any)?.user?.pId)
        || normalizeProductId((session as any)?.user?.productId);
    const sourceTenantId = normalizeNumber((session as any)?.tId ?? (session as any)?.tenantId ?? (session as any)?.user?.tenantId);
    const sourceStoreId = normalizeNumber((session as any)?.sId ?? (session as any)?.storeId ?? (session as any)?.user?.storeId);
    const sourceContext = (session as any)?.sourceContext || (
        sourceProductId && sourceProductId !== PRODUCT_IDS.CANONICA
            ? {
                pId: sourceProductId,
                ...(sourceTenantId ? { tId: sourceTenantId } : {}),
                ...(sourceStoreId ? { sId: sourceStoreId } : {}),
            }
            : undefined
    );
    const scopedSession = {
        ...(session as any),
        pId: PRODUCT_IDS.CANONICA,
        productId: PRODUCT_IDS.CANONICA,
        tId: scope.tenantId,
        sId: scope.storeId,
        role,
        ...(sourceContext ? { sourceContext } : {}),
        ...(sourceProductId && sourceProductId !== PRODUCT_IDS.CANONICA ? { sourceProductId } : {}),
        user: {
            ...(session as any).user,
            tenantId: scope.tenantId,
            storeId: scope.storeId,
            pId: PRODUCT_IDS.CANONICA,
            productId: PRODUCT_IDS.CANONICA,
            role,
        },
    };

    return scopedSession as T;
}

export function canUseCanonicaManagement(sessionOrUser: any): boolean {
    const platformRole = String(
        sessionOrUser?.platformRole
        || sessionOrUser?.user?.platformRole
        || ''
    ).toUpperCase();
    if (platformRole === ECOMSAI_PLATFORM_USER_ROLE || platformRole === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE) {
        return true;
    }

    const scopedSession = getCanonicaScopedSession(sessionOrUser);
    const productId = normalizeProductId((scopedSession as any)?.pId)
        || normalizeProductId((scopedSession as any)?.user?.pId)
        || normalizeProductId((scopedSession as any)?.user?.productId);
    if (productId !== PRODUCT_IDS.CANONICA) return false;

    const role = String((scopedSession as any)?.role || (scopedSession as any)?.user?.role || '').toLowerCase();
    return ['owner', 'admin', 'manager'].includes(role);
}
