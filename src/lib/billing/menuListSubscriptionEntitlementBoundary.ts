import { DEFAULT_PRODUCT_ID } from '@constant/product';
import { normalizeBillingSubscriptionScopeDocumentId } from '@lib/billing/subscriptionDocumentIdBoundary';

export type MenuListSubscriptionEntitlementScope = {
    storeId: number;
    tenantId: number;
};

const getExactPersistedNumericAlias = (left: unknown, right: unknown): number | null => {
    if (typeof left !== 'number' || typeof right !== 'number' || left !== right) return null;
    return normalizeBillingSubscriptionScopeDocumentId(left)?.numericId ?? null;
};

export const getMenuListSubscriptionEntitlementScope = (
    subscription: unknown,
): MenuListSubscriptionEntitlementScope | null => {
    if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) return null;
    const record = subscription as Record<string, unknown>;
    if (record.pId !== DEFAULT_PRODUCT_ID || record.productId !== DEFAULT_PRODUCT_ID) return null;

    const tenantId = getExactPersistedNumericAlias(record.tenantId, record.tId);
    const storeId = getExactPersistedNumericAlias(record.storeId, record.sId);
    return tenantId && storeId ? { tenantId, storeId } : null;
};

export const isMenuListSubscriptionEntitledForTenant = (
    subscription: unknown,
    tenantId: unknown,
): boolean => {
    const expectedTenantId = normalizeBillingSubscriptionScopeDocumentId(tenantId)?.numericId;
    const subscriptionScope = getMenuListSubscriptionEntitlementScope(subscription);
    return Boolean(expectedTenantId && subscriptionScope?.tenantId === expectedTenantId);
};
