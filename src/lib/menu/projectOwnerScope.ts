import {
    normalizeMultiOutletNumericDocumentId,
    normalizeMultiOutletProjectId,
} from '@lib/multiOutlet/projectIdBoundary';

export type ProjectOwnerScope = {
    sId: number;
    tId: number;
};

export const normalizeProjectOwnerScope = (
    tenantId: unknown,
    storeId: unknown,
): ProjectOwnerScope | null => {
    const tenantScope = normalizeMultiOutletNumericDocumentId(tenantId);
    const storeScope = normalizeMultiOutletNumericDocumentId(storeId);
    return tenantScope && storeScope
        ? { tId: tenantScope.numericId, sId: storeScope.numericId }
        : null;
};

export const getProjectOwnerScopeKey = (
    scope: ProjectOwnerScope | null,
): string => (
    scope ? `${scope.tId}:${scope.sId}` : ''
);

export const projectOwnerScopesMatch = (
    left: ProjectOwnerScope | null,
    right: ProjectOwnerScope | null,
): boolean => Boolean(
    left
    && right
    && left.tId === right.tId
    && left.sId === right.sId,
);

export const getProjectOwnerScopeFromProjectId = (
    projectId: unknown,
): ProjectOwnerScope | null => {
    const scope = normalizeMultiOutletProjectId(projectId);
    return scope ? { tId: scope.tId, sId: scope.sId } : null;
};
