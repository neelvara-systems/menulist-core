import { isValidBillingPeriodKey } from '@lib/billing/billingPeriod';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeBillingScopeDocumentId } from '@lib/answerlattice/billingDocumentIdBoundary';
import { getNonNegativeCreditInteger } from '@data/shared/aiCreditScalarContract';

export function isAnswerlatticeIntakeLedgerInScope(
    ledger: unknown,
    scope: { sId: unknown; tId: unknown },
): boolean {
    if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) return false;
    const data = ledger as Record<string, unknown>;
    const ledgerTenantId = normalizeAnswerlatticeBillingScopeDocumentId(data.tId);
    const ledgerStoreId = normalizeAnswerlatticeBillingScopeDocumentId(data.sId);
    const tenantId = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeId = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    return data.pId === PRODUCT_IDS.ANSWERLATTICE
        && tenantId !== null
        && storeId !== null
        && ledgerTenantId?.numericId === tenantId.numericId
        && ledgerStoreId?.numericId === storeId.numericId;
}

export function resolveAnswerlatticeIntakeRefundAllocation(params: {
    currentBillingPeriod: unknown;
    currentMonthlyCredits: unknown;
    monthlyCreditsAllowance: unknown;
    refundMonthlyCredits: unknown;
    refundTopUpCredits: unknown;
    reservedBillingPeriod: unknown;
}): {
    expiredMonthlyCredits: number;
    refundedMonthlyCredits: number;
    refundedTopUpCredits: number;
} | null {
    if (
        !isValidBillingPeriodKey(params.currentBillingPeriod)
        || !isValidBillingPeriodKey(params.reservedBillingPeriod)
    ) {
        return null;
    }
    const refundMonthlyCredits = getNonNegativeCreditInteger(params.refundMonthlyCredits);
    const refundTopUpCredits = getNonNegativeCreditInteger(params.refundTopUpCredits);
    const currentMonthlyCredits = getNonNegativeCreditInteger(params.currentMonthlyCredits);
    const monthlyCreditsAllowance = getNonNegativeCreditInteger(params.monthlyCreditsAllowance);
    if (
        refundMonthlyCredits === null
        || refundTopUpCredits === null
        || currentMonthlyCredits === null
        || monthlyCreditsAllowance === null
        || currentMonthlyCredits > monthlyCreditsAllowance
    ) return null;

    const refundedMonthlyCredits = params.currentBillingPeriod === params.reservedBillingPeriod
        ? Math.min(refundMonthlyCredits, monthlyCreditsAllowance - currentMonthlyCredits)
        : 0;
    return {
        expiredMonthlyCredits: refundMonthlyCredits - refundedMonthlyCredits,
        refundedMonthlyCredits,
        refundedTopUpCredits: refundTopUpCredits,
    };
}
