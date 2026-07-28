import { resolveAnswerlatticeSessionScope } from './sessionScope';

export type AnswerlatticePublicContentScope = {
    tId: number;
    sId: number;
};

export const resolveAnswerlatticePublicContentScope = (sessionOrUser: unknown): AnswerlatticePublicContentScope | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(sessionOrUser);
    return answerlatticeScope
        ? {
            tId: answerlatticeScope.tenantId,
            sId: answerlatticeScope.storeId,
        }
        : null;
};
