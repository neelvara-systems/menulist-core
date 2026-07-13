import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeBillingScopeDocumentId } from '@lib/answerlattice/billingDocumentIdBoundary';

export type AnswerlatticeBillingScope = {
    tId: unknown;
    sId: unknown;
};

const hasExactProductIdentity = (record: Record<string, unknown>): boolean => {
    const productValues = [record.pId, record.productId].filter((value) => value !== undefined);
    return productValues.length > 0
        && productValues.every((value) => value === PRODUCT_IDS.ANSWERLATTICE);
};

const hasExactNumericScope = (
    record: Record<string, unknown>,
    fields: readonly [string, string],
    expected: number,
): boolean => {
    const values = fields.map((field) => record[field]).filter((value) => value !== undefined);
    return values.length > 0
        && values.every((value) => typeof value === 'number'
            && Number.isSafeInteger(value)
            && value > 0
            && value === expected);
};

const isAnswerlatticeBillingRecordInScope = (
    value: unknown,
    scope: AnswerlatticeBillingScope,
): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) return false;

    return hasExactProductIdentity(record)
        && hasExactNumericScope(record, ['tId', 'tenantId'], tenantScope.numericId)
        && hasExactNumericScope(record, ['sId', 'storeId'], storeScope.numericId);
};

export const isAnswerlatticeSubscriptionInScope = (
    value: unknown,
    scope: AnswerlatticeBillingScope,
): boolean => isAnswerlatticeBillingRecordInScope(value, scope);

export const isAnswerlatticePaymentHistoryItemInScope = (
    value: unknown,
    scope: AnswerlatticeBillingScope,
): boolean => isAnswerlatticeBillingRecordInScope(value, scope);
