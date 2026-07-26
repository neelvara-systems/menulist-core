import { createHash } from 'node:crypto';
import { getMenuListSubscriptionEntitlementScope } from '@lib/billing/menuListSubscriptionEntitlementBoundary';
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from '@lib/publicTruth/entityEligibility';

export type ResellerOnboardingOperationInput = {
    billingInterval: 'MONTH' | 'YEAR';
    businessName: string;
    businessType: string;
    commitmentMonths: number | null;
    locationCount: number;
    ownerLoginEmail: string;
    ownerPassword: string;
    ownerUsername: string;
    paymentMode: 'online' | 'offline';
    pricingTier: string;
};

/**
 * Binds a retry UUID to one normalized onboarding intent without persisting
 * owner credentials or other raw request fields in the operation ledger.
 */
export function getResellerOnboardingOperationFingerprint(
    input: ResellerOnboardingOperationInput,
): string {
    return createHash('sha256')
        .update(JSON.stringify([
            input.billingInterval,
            input.businessName,
            input.businessType,
            input.commitmentMonths,
            input.locationCount,
            input.ownerLoginEmail,
            input.ownerPassword,
            input.ownerUsername,
            input.paymentMode,
            input.pricingTier,
        ]))
        .digest('hex');
}

export type MatchingResellerOnboardingOperation = {
    storeId: number;
    subscriptionId: string;
    tenantId: number;
};

export function getMatchingResellerOnboardingOperation(params: {
    fingerprint: string;
    operationData: unknown;
    operationId: string;
    resellerId: string;
}): MatchingResellerOnboardingOperation | null {
    if (!params.operationData || typeof params.operationData !== 'object' || Array.isArray(params.operationData)) {
        return null;
    }

    const data = params.operationData as Record<string, unknown>;
    const matches = data.action === 'ONBOARD'
        && data.operationId === params.operationId
        && data.operationFingerprint === params.fingerprint
        && data.resellerId === params.resellerId
        && typeof data.storeId === 'number'
        && Number.isSafeInteger(data.storeId)
        && data.storeId > 0
        && typeof data.tenantId === 'number'
        && Number.isSafeInteger(data.tenantId)
        && data.tenantId > 0
        && typeof data.subscriptionId === 'string'
        && data.subscriptionId.length > 0;
    if (!matches) return null;

    return {
        storeId: data.storeId as number,
        subscriptionId: data.subscriptionId as string,
        tenantId: data.tenantId as number,
    };
}

export function isMatchingResellerOnboardingOperation(params: {
    fingerprint: string;
    operationData: unknown;
    operationId: string;
    resellerId: string;
}): boolean {
    return getMatchingResellerOnboardingOperation(params) !== null;
}

export function isMatchingResellerOnboardingReplayResources(params: {
    resellerId: string;
    storeData: unknown;
    storeId: number;
    subscriptionData: unknown;
    tenantId: number;
}): boolean {
    if (
        !params.storeData
        || typeof params.storeData !== 'object'
        || Array.isArray(params.storeData)
        || !params.subscriptionData
        || typeof params.subscriptionData !== 'object'
        || Array.isArray(params.subscriptionData)
    ) {
        return false;
    }
    const store = params.storeData as Record<string, unknown>;
    const subscription = params.subscriptionData as Record<string, unknown>;
    const subscriptionScope = getMenuListSubscriptionEntitlementScope(subscription);
    const storeTenantScope = normalizeMenuListPublicEntityIdentityAliases([
        store.tenantId,
        store.tId,
    ]);
    return subscriptionScope?.storeId === params.storeId
        && subscriptionScope.tenantId === params.tenantId
        && subscription.resellerId === params.resellerId
        && storeTenantScope?.numericId === params.tenantId
        && isMenuListPublicEntityEligible(store);
}
