import { resolveAnswerlatticeSessionScope } from './sessionScope';

export type AnswerlatticePublicContentScope = {
    tId: number;
    sId: number;
};

const normalizeScopeNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const resolveAnswerlatticePublicContentScope = (sessionOrUser: any): AnswerlatticePublicContentScope | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(sessionOrUser);
    if (answerlatticeScope) {
        return {
            tId: answerlatticeScope.tenantId,
            sId: answerlatticeScope.storeId,
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
