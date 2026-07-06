import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from './sessionScope';

export type AnswerlatticePublicContentScope = {
    tId: number;
    sId: number;
};

export const resolveAnswerlatticePublicContentScope = (sessionOrUser: any): AnswerlatticePublicContentScope | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(sessionOrUser);
    if (answerlatticeScope) {
        return {
            tId: answerlatticeScope.tenantId,
            sId: answerlatticeScope.storeId,
        };
    }

    const tenantId = normalizeAnswerlatticeScopeDocumentId(
        sessionOrUser?.tId
        ?? sessionOrUser?.tenantId
        ?? sessionOrUser?.user?.tenantId,
    );
    const storeId = normalizeAnswerlatticeScopeDocumentId(
        sessionOrUser?.sId
        ?? sessionOrUser?.storeId
        ?? sessionOrUser?.user?.storeId,
    );

    if (!tenantId || !storeId) {
        return null;
    }

    return { tId: tenantId, sId: storeId };
};
