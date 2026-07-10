import type { OwnerReferralStatus } from '@data/shared/ownerReferralPolicy';

export interface OwnerReferralTokenPayload {
    version: 2;
    referrerTenantId: number;
    referrerStoreId: number;
    issuedAt: number;
    expiresAt: number;
    tokenId: string;
}

export interface OwnerReferralDocument {
    programVersion: 2;
    status: OwnerReferralStatus;
    referrerTenantId: number;
    referrerStoreId: number;
    referrerBusinessNameSnapshot: string;
    referredTenantId: number;
    referredStoreId: number;
    referredBusinessNameSnapshot: string;
    attributionSource: 'owner_invite';
    onboardingSource: string;
    attributionTokenIdHash: string;
    attributedAt: FirebaseFirestore.Timestamp;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
    referredFirstPaidAt?: FirebaseFirestore.Timestamp;
    referredFirstPaidSubscriptionId?: string;
    referredPaymentEvidenceHash?: string;
    paymentPendingAt?: FirebaseFirestore.Timestamp;
    rewardIssueId?: string;
    rewardIssuedAt?: FirebaseFirestore.Timestamp;
    referrerSubscriptionIdAtIssue?: string;
    referredSubscriptionIdAtIssue?: string;
    referrerCreditsAdded?: number;
    referredCreditsAdded?: number;
    referrerTopUpBefore?: number;
    referrerTopUpAfter?: number;
    referredTopUpBefore?: number;
    referredTopUpAfter?: number;
    referrerRewardTransactionId?: string;
    referredRewardTransactionId?: string;
}

export type OwnerReferralScope = {
    tenantId: number;
    storeId: number;
};

export type OwnerReferralResolvedToken = {
    payload: OwnerReferralTokenPayload;
    referrerBusinessName: string;
};
