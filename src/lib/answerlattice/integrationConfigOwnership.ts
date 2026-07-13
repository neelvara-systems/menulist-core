import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeScopeDocumentId } from './sessionScope';

export type AnswerlatticeIntegrationConfigScope = {
    tId: number;
    sId: number;
};

export type AnswerlatticeIntegrationConfigOwnership = 'owned' | 'legacy-unowned' | 'invalid';

const hasOwn = (value: Record<string, unknown>, key: string): boolean => (
    Object.prototype.hasOwnProperty.call(value, key)
);

export function classifyAnswerlatticeIntegrationConfigOwnership(
    value: unknown,
    expectedScope: AnswerlatticeIntegrationConfigScope,
): AnswerlatticeIntegrationConfigOwnership {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'invalid';

    const expectedTenantId = normalizeAnswerlatticeScopeDocumentId(expectedScope.tId);
    const expectedStoreId = normalizeAnswerlatticeScopeDocumentId(expectedScope.sId);
    if (expectedTenantId === null || expectedStoreId === null) return 'invalid';

    const data = value as Record<string, unknown>;
    const identityKeysPresent = ['pId', 'tId', 'sId'].filter(key => hasOwn(data, key));
    if (identityKeysPresent.length === 0) return 'legacy-unowned';
    if (identityKeysPresent.length !== 3) return 'invalid';

    return data.pId === PRODUCT_IDS.ANSWERLATTICE
        && normalizeAnswerlatticeScopeDocumentId(data.tId) === expectedTenantId
        && normalizeAnswerlatticeScopeDocumentId(data.sId) === expectedStoreId
        ? 'owned'
        : 'invalid';
}

export function buildAnswerlatticeIntegrationConfigIdentity(
    scope: AnswerlatticeIntegrationConfigScope,
): { pId: 'AL'; tId: number; sId: number } | null {
    const tId = normalizeAnswerlatticeScopeDocumentId(scope.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(scope.sId);
    return tId === null || sId === null
        ? null
        : { pId: PRODUCT_IDS.ANSWERLATTICE, tId, sId };
}
