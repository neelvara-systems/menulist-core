import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeBillingScopeDocumentId } from '@lib/answerlattice/billingDocumentIdBoundary';

export type AnswerlatticeBillingScope = {
    tId: unknown;
    sId: unknown;
};

export type AnswerlatticeBillingRecordScope = {
    tId: number;
    sId: number;
};

const hasExactProductIdentity = (record: Record<string, unknown>): boolean => {
    const productValues = [record.pId, record.productId].filter((value) => value !== undefined);
    return productValues.length > 0
        && productValues.every((value) => value === PRODUCT_IDS.ANSWERLATTICE);
};

const getExactNumericScope = (
    record: Record<string, unknown>,
    fields: readonly [string, string],
): number | null => {
    const values = fields.map((field) => record[field]).filter((value) => value !== undefined);
    if (
        values.length === 0
        || !values.every((value) => typeof value === 'number'
            && Number.isSafeInteger(value)
            && value > 0)
    ) return null;

    const [first] = values as number[];
    return values.every((value) => value === first) ? first : null;
};

export const getAnswerlatticeBillingRecordScope = (
    value: unknown,
): AnswerlatticeBillingRecordScope | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (!hasExactProductIdentity(record)) return null;

    const tId = getExactNumericScope(record, ['tId', 'tenantId']);
    const sId = getExactNumericScope(record, ['sId', 'storeId']);
    return tId && sId ? { tId, sId } : null;
};

const isAnswerlatticeBillingRecordInScope = (
    value: unknown,
    scope: AnswerlatticeBillingScope,
): boolean => {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) return false;

    const recordScope = getAnswerlatticeBillingRecordScope(value);
    if (!recordScope) return false;

    return recordScope.tId === tenantScope.numericId
        && recordScope.sId === storeScope.numericId;
};

export const isAnswerlatticeSubscriptionInScope = (
    value: unknown,
    scope: AnswerlatticeBillingScope,
): boolean => isAnswerlatticeBillingRecordInScope(value, scope);

export const isAnswerlatticePaymentHistoryItemInScope = (
    value: unknown,
    scope: AnswerlatticeBillingScope,
): boolean => isAnswerlatticeBillingRecordInScope(value, scope);
