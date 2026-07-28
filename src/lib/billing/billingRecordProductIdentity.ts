import { PRODUCT_IDS } from '@constant/product';

export type BillingRecordIdentityBackfillDecision =
    | { status: 'already_exact' }
    | {
        status: 'candidate';
        update: {
            pId: typeof PRODUCT_IDS.MENULIST;
            productId: typeof PRODUCT_IDS.MENULIST;
            storeId: number;
            tenantId: number;
        };
    }
    | { status: 'skip_conflicting_or_other_product' }
    | { status: 'skip_unclassified_product' }
    | { status: 'skip_invalid_scope' };

const getCanonicalPositiveInteger = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? value : null;
    }
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && String(parsed) === value ? parsed : null;
};

const getAlias = (record: Record<string, unknown>, key: 'pId' | 'productId'): string | null => {
    const value = record[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
};

const getConsistentScopeAliases = (
    record: Record<string, unknown>,
    keys: readonly ['tenantId', 'tId'] | readonly ['storeId', 'sId'],
): number | null => {
    const supplied = keys
        .map((key) => record[key])
        .filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;
    const normalized = supplied.map(getCanonicalPositiveInteger);
    const expected = normalized[0];
    return expected && normalized.every((value) => value === expected)
        ? expected
        : null;
};

/**
 * Classify legacy rows without guessing product ownership. The original
 * MenuList webhook composer always persisted pId=ML, so completing the missing
 * compatibility alias is safe. Rows with no alias evidence remain untouched.
 */
export const classifyMenuListBillingRecordIdentityBackfill = (
    record: Record<string, unknown>,
): BillingRecordIdentityBackfillDecision => {
    const pId = getAlias(record, 'pId');
    const productId = getAlias(record, 'productId');
    const aliases = [pId, productId].filter((value): value is string => value !== null);

    if (aliases.length === 0) return { status: 'skip_unclassified_product' };
    if (aliases.some((value) => value !== PRODUCT_IDS.MENULIST)) {
        return { status: 'skip_conflicting_or_other_product' };
    }

    const tenantId = getConsistentScopeAliases(record, ['tenantId', 'tId']);
    const storeId = getConsistentScopeAliases(record, ['storeId', 'sId']);
    if (!tenantId || !storeId) return { status: 'skip_invalid_scope' };

    if (
        pId === PRODUCT_IDS.MENULIST
        && productId === PRODUCT_IDS.MENULIST
        && record.tenantId === tenantId
        && record.storeId === storeId
    ) {
        return { status: 'already_exact' };
    }

    return {
        status: 'candidate',
        update: {
            pId: PRODUCT_IDS.MENULIST,
            productId: PRODUCT_IDS.MENULIST,
            tenantId,
            storeId,
        },
    };
};
