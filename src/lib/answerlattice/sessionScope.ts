import { PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    ECOMSAI_PLATFORM_SUPPORT_USER_ROLE,
    ECOMSAI_PLATFORM_USER_ROLE,
} from '@constant/user';
import { isAnswerlatticeProductHostname } from '@constant/answerlattice/domains';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export type AnswerlatticeProductAccount = {
    tenantId: number;
    storeId: number;
    role?: string;
    platformRole?: string;
    storeIds?: Array<number | string>;
};

export const ANSWERLATTICE_PRODUCT_ACCOUNT_KEY = PRODUCT_IDS.ANSWERLATTICE;
const ANSWERLATTICE_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;

export function normalizeAnswerlatticeScopeDocumentId(value: unknown): number | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (
        documentId !== raw
        || !ANSWERLATTICE_SCOPE_DOCUMENT_ID_PATTERN.test(documentId)
        || !isValidFirestoreDocumentId(documentId)
    ) {
        return null;
    }

    const parsed = Number(documentId);
    return Number.isSafeInteger(parsed) && parsed > 0 && String(parsed) === documentId
        ? parsed
        : null;
}

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

export const isAnswerlatticeRuntimeRoute = (pathname?: string | null, hostname?: string | null): boolean => {
    const normalizedPath = normalizePathname(pathname);
    return normalizedPath === '/answerlattice'
        || normalizedPath.startsWith('/answerlattice/')
        || normalizedPath === '/__answerlattice'
        || normalizedPath.startsWith('/__answerlattice/')
        || isAnswerlatticeProductHostname(hostname);
};

export const isAnswerlatticeSupportClientRoute = (pathname?: string | null): boolean => {
    const normalizedPath = normalizePathname(pathname);
    return normalizedPath === '/help-center' || normalizedPath.startsWith('/help-center/');
};

export function getAnswerlatticeProductAccount(sessionOrUser: any): AnswerlatticeProductAccount | null {
    const productAccounts = getProductAccounts(sessionOrUser);
    const account = productAccounts?.[ANSWERLATTICE_PRODUCT_ACCOUNT_KEY];
    if (!account || typeof account !== 'object') return null;
    if (account.active === false || account.deleted === true || account.authDisabled === true) return null;

    const tenantId = normalizeAnswerlatticeScopeDocumentId(account.tenantId ?? account.tId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(account.storeId ?? account.sId);
    if (!tenantId || !storeId) return null;

    return {
        tenantId,
        storeId,
        role: typeof account.role === 'string' ? account.role : undefined,
        platformRole: typeof account.platformRole === 'string' ? account.platformRole : undefined,
        storeIds: Array.isArray(account.storeIds) ? account.storeIds : undefined,
    };
}

export function resolveAnswerlatticeSessionScope(sessionOrUser: any): { tenantId: number; storeId: number; role?: string } | null {
    const account = getAnswerlatticeProductAccount(sessionOrUser);
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
    if (productId !== PRODUCT_IDS.ANSWERLATTICE) return null;

    const tenantId = normalizeAnswerlatticeScopeDocumentId(sessionOrUser?.tId ?? sessionOrUser?.tenantId ?? sessionOrUser?.user?.tenantId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(sessionOrUser?.sId ?? sessionOrUser?.storeId ?? sessionOrUser?.user?.storeId);
    if (!tenantId || !storeId) return null;

    return {
        tenantId,
        storeId,
        role: sessionOrUser?.role || sessionOrUser?.user?.role,
    };
}

export function shouldUseAnswerlatticeClientScopeForRoute(
    sessionOrUser: any,
    pathname?: string | null,
    hostname?: string | null,
): boolean {
    if (isAnswerlatticeRuntimeRoute(pathname, hostname)) return true;
    return isAnswerlatticeSupportClientRoute(pathname) && Boolean(resolveAnswerlatticeSessionScope(sessionOrUser));
}

export function getAnswerlatticeScopedSession<T extends Record<string, any> | null | undefined>(session: T): T {
    if (!session) return session;

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return session;

    const account = getAnswerlatticeProductAccount(session);
    const role = account?.role || (session as any)?.role || (session as any)?.user?.role || '';
    const sourceProductId = normalizeProductId((session as any)?.pId)
        || normalizeProductId((session as any)?.productId)
        || normalizeProductId((session as any)?.user?.pId)
        || normalizeProductId((session as any)?.user?.productId);
    const sourceTenantId = normalizeAnswerlatticeScopeDocumentId((session as any)?.tId ?? (session as any)?.tenantId ?? (session as any)?.user?.tenantId);
    const sourceStoreId = normalizeAnswerlatticeScopeDocumentId((session as any)?.sId ?? (session as any)?.storeId ?? (session as any)?.user?.storeId);
    const sourceContext = (session as any)?.sourceContext || (
        sourceProductId && sourceProductId !== PRODUCT_IDS.ANSWERLATTICE
            ? {
                pId: sourceProductId,
                ...(sourceTenantId ? { tId: sourceTenantId } : {}),
                ...(sourceStoreId ? { sId: sourceStoreId } : {}),
            }
            : undefined
    );
    const scopedSession = {
        ...(session as any),
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tenantId,
        sId: scope.storeId,
        role,
        ...(sourceContext ? { sourceContext } : {}),
        ...(sourceProductId && sourceProductId !== PRODUCT_IDS.ANSWERLATTICE ? { sourceProductId } : {}),
        user: {
            ...(session as any).user,
            tenantId: scope.tenantId,
            storeId: scope.storeId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            role,
        },
    };

    return scopedSession as T;
}

export function canUseAnswerlatticeManagement(sessionOrUser: any): boolean {
    const platformRole = String(
        sessionOrUser?.platformRole
        || sessionOrUser?.user?.platformRole
        || ''
    ).toUpperCase();
    if (platformRole === ECOMSAI_PLATFORM_USER_ROLE || platformRole === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE) {
        return true;
    }

    const scopedSession = getAnswerlatticeScopedSession(sessionOrUser);
    const productId = normalizeProductId((scopedSession as any)?.pId)
        || normalizeProductId((scopedSession as any)?.user?.pId)
        || normalizeProductId((scopedSession as any)?.user?.productId);
    if (productId !== PRODUCT_IDS.ANSWERLATTICE) return false;

    const role = String((scopedSession as any)?.role || (scopedSession as any)?.user?.role || '').toLowerCase();
    return ['owner', 'admin', 'manager'].includes(role);
}
