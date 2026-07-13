import {
    normalizeStoredAnswerlatticeScopeId,
    parseExactAnswerlatticeScope,
} from '../answerlattice/scopeBoundary';

export type IntegrationConfigOwnership = 'owned' | 'legacy-unowned' | 'invalid';

const hasOwn = (value: Record<string, unknown>, key: string): boolean => (
    Object.prototype.hasOwnProperty.call(value, key)
);

export function classifyIntegrationConfigOwnership(
    value: unknown,
    expectedTId: unknown,
    expectedSId: unknown,
): IntegrationConfigOwnership {
    const expectedScope = parseExactAnswerlatticeScope(expectedTId, expectedSId);
    if (!expectedScope || !value || typeof value !== 'object' || Array.isArray(value)) return 'invalid';

    const data = value as Record<string, unknown>;
    const identityKeysPresent = ['pId', 'tId', 'sId'].filter(key => hasOwn(data, key));
    if (identityKeysPresent.length === 0) return 'legacy-unowned';
    if (identityKeysPresent.length !== 3) return 'invalid';

    return data.pId === 'AL'
        && normalizeStoredAnswerlatticeScopeId(data.tId) === expectedScope.tId
        && normalizeStoredAnswerlatticeScopeId(data.sId) === expectedScope.sId
        ? 'owned'
        : 'invalid';
}

export function buildIntegrationConfigIdentity(
    tId: unknown,
    sId: unknown,
): { pId: 'AL'; tId: number; sId: number } | null {
    const scope = parseExactAnswerlatticeScope(tId, sId);
    return scope ? { pId: 'AL', ...scope } : null;
}
