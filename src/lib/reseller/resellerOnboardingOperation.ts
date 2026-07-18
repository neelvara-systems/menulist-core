import { createHash } from 'node:crypto';

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

export function isMatchingResellerOnboardingOperation(params: {
    fingerprint: string;
    operationData: unknown;
    operationId: string;
    resellerId: string;
}): boolean {
    if (!params.operationData || typeof params.operationData !== 'object' || Array.isArray(params.operationData)) {
        return false;
    }

    const data = params.operationData as Record<string, unknown>;
    return data.action === 'ONBOARD'
        && data.operationId === params.operationId
        && data.operationFingerprint === params.fingerprint
        && data.resellerId === params.resellerId
        && Number.isSafeInteger(Number(data.storeId))
        && Number(data.storeId) > 0
        && Number.isSafeInteger(Number(data.tenantId))
        && Number(data.tenantId) > 0
        && typeof data.subscriptionId === 'string'
        && data.subscriptionId.length > 0;
}
