import type { ProductId } from '@constant/product';
import { getAnswerlatticeBillingRecordScope } from '@lib/answerlattice/billingScopeBoundary';
import { getMenuListSubscriptionEntitlementScope } from './menuListSubscriptionEntitlementBoundary';
import { isAnswerlatticeBillingProduct, isProductBillingDisabled } from './productBillingPlans';

export type ProductSubscriptionBillingScope = {
    tenantId: number;
    storeId: number;
};

export const getProductSubscriptionBillingScope = (
    productId: ProductId,
    subscription: unknown,
): ProductSubscriptionBillingScope | null => {
    if (isProductBillingDisabled(productId)) return null;
    if (isAnswerlatticeBillingProduct(productId)) {
        const scope = getAnswerlatticeBillingRecordScope(subscription);
        return scope ? { tenantId: scope.tId, storeId: scope.sId } : null;
    }
    return getMenuListSubscriptionEntitlementScope(subscription);
};
