const MENULIST_PRODUCT_ID = 'ML' as const;

export type ExactMenuListSubscriptionScope = {
    tenantId: number;
    storeId: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
);

const exactPositiveInteger = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : null
);

export const getExactMenuListSubscriptionScope = (
    value: unknown,
): ExactMenuListSubscriptionScope | null => {
    if (!isRecord(value) || value.pId !== MENULIST_PRODUCT_ID || value.productId !== MENULIST_PRODUCT_ID) {
        return null;
    }
    const tenantId = exactPositiveInteger(value.tenantId);
    const tId = exactPositiveInteger(value.tId);
    const storeId = exactPositiveInteger(value.storeId);
    const sId = exactPositiveInteger(value.sId);
    if (tenantId === null || tId !== tenantId || storeId === null || sId !== storeId) return null;
    return { tenantId, storeId };
};
