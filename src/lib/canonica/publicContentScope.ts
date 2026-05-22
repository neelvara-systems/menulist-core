import { resolveCanonicaSessionScope } from './sessionScope';

export type CanonicaPublicContentScope = {
    tId: number;
    sId: number;
};

const normalizeScopeNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const resolveCanonicaPublicContentScope = (sessionOrUser: any): CanonicaPublicContentScope | null => {
    const canonicaScope = resolveCanonicaSessionScope(sessionOrUser);
    if (canonicaScope) {
        return {
            tId: canonicaScope.tenantId,
            sId: canonicaScope.storeId,
        };
    }

    const tenantId = normalizeScopeNumber(
        sessionOrUser?.tId
        ?? sessionOrUser?.tenantId
        ?? sessionOrUser?.user?.tenantId,
    );
    const storeId = normalizeScopeNumber(
        sessionOrUser?.sId
        ?? sessionOrUser?.storeId
        ?? sessionOrUser?.user?.storeId,
    );

    if (!tenantId || !storeId) {
        return null;
    }

    return { tId: tenantId, sId: storeId };
};
