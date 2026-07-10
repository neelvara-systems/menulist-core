import type { OwnerReferralOwnerStatus } from '@data/shared/ownerReferralPolicy';

export type OwnerReferralRecentItem = {
    businessName: string;
    status: OwnerReferralOwnerStatus;
    date: string;
};

export type OwnerReferralOwnerResponse = {
    eligible: true;
    inviteUrl: string;
    policy: {
        referrerCredits: number;
        referredCredits: number;
        paymentOnly: true;
        rewardCap: null;
    };
    recent: OwnerReferralRecentItem[];
};

const OWNER_REFERRAL_STATUSES = new Set<OwnerReferralOwnerStatus>([
    'waiting_for_payment',
    'waiting_for_both_payments',
    'issued',
]);

const isFinitePositiveNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value) && value > 0
);

export const isOwnerReferralOwnerResponse = (value: unknown): value is OwnerReferralOwnerResponse => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const response = value as Record<string, any>;
    if (response.eligible !== true || typeof response.inviteUrl !== 'string') return false;
    try {
        const inviteUrl = new URL(response.inviteUrl);
        if (!['https:', 'http:'].includes(inviteUrl.protocol) || inviteUrl.pathname !== '/invite') return false;
    } catch {
        return false;
    }
    const policy = response.policy;
    if (
        !policy
        || !isFinitePositiveNumber(policy.referrerCredits)
        || !isFinitePositiveNumber(policy.referredCredits)
        || policy.paymentOnly !== true
        || policy.rewardCap !== null
    ) {
        return false;
    }
    if (!Array.isArray(response.recent) || response.recent.length > 10) return false;
    return response.recent.every((item: any) => (
        item
        && typeof item.businessName === 'string'
        && item.businessName.length <= 100
        && OWNER_REFERRAL_STATUSES.has(item.status)
        && typeof item.date === 'string'
        && Number.isFinite(Date.parse(item.date))
    ));
};

export const fetchOwnerReferral = async (): Promise<OwnerReferralOwnerResponse> => {
    const response = await fetch('/api/owner-referrals', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !isOwnerReferralOwnerResponse(body)) {
        throw new Error(response.status === 404 ? 'owner_referral_unavailable' : 'owner_referral_load_failed');
    }
    return body;
};

export const getOwnerReferralShareMessage = (inviteUrl: string, locale?: string): string => (
    String(locale || '').toLowerCase().startsWith('hi')
        ? `हम अपनी मेन्यू और बिज़नेस जानकारी को एक जगह से अपडेट रखने के लिए MenuList का उपयोग करते हैं। आप अपना यहाँ सेट अप कर सकते हैं: ${inviteUrl}\n\nदोनों MenuList सब्सक्रिप्शन का भुगतान होने पर दोनों बिज़नेस को क्रेडिट मिलते हैं।`
        : `We use MenuList to keep our menu and business information current from one place. You can set up yours here: ${inviteUrl}\n\nMenuList adds credits to both businesses after both MenuList subscriptions are paid.`
);
