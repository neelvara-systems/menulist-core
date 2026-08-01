import { normalizeMenuChangeLogScope } from '@database/menuChangeLog/menuChangeLogBoundary';
import type { ProjectExpectedScope } from '@database/projects';

export type DefaultProjectAiContextStoreInput = {
    activeSpecialMenuId?: unknown;
    primaryProjectId?: unknown;
    storeId?: unknown;
    tenantId?: unknown;
};

export type DefaultProjectAiContextRequest = {
    activeSpecialMenuId: string;
    cacheKey: string;
    expectedScope: ProjectExpectedScope;
    primaryProjectId: string;
};

const normalizeProjectSelector = (value: unknown): string => {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    const selector = String(value);
    return selector.length > 0 && selector.length <= 180 && selector.trim() === selector
        ? selector
        : '';
};

export const normalizeDefaultProjectAiContextRequest = (
    storeDetails: DefaultProjectAiContextStoreInput | null | undefined,
): DefaultProjectAiContextRequest | null => {
    const expectedScope = normalizeMenuChangeLogScope({
        tId: storeDetails?.tenantId,
        sId: storeDetails?.storeId,
    });
    if (!expectedScope) return null;

    const activeSpecialMenuId = normalizeProjectSelector(storeDetails?.activeSpecialMenuId);
    const primaryProjectId = normalizeProjectSelector(storeDetails?.primaryProjectId);

    return {
        activeSpecialMenuId,
        cacheKey: JSON.stringify([
            expectedScope.tId,
            expectedScope.sId,
            activeSpecialMenuId,
            primaryProjectId,
        ]),
        expectedScope,
        primaryProjectId,
    };
};
