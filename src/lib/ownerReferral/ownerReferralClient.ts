import { OWNER_APP_URL } from '@constant/urls';
import {
    OWNER_REFERRAL_REFERRED_CREDITS,
    OWNER_REFERRAL_REFERRER_CREDITS,
    type OwnerReferralOwnerStatus,
} from '@data/shared/ownerReferralPolicy';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

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
    'issued',
]);
const OWNER_REFERRAL_OWNER_RESPONSE_MAX_BYTES = 16 * 1024;

const isFinitePositiveNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value) && value > 0
);

export const isOwnerReferralOwnerResponse = (value: unknown): value is OwnerReferralOwnerResponse => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const response = value as Record<string, unknown>;
    if (response.eligible !== true || typeof response.inviteUrl !== 'string') return false;
    try {
        const inviteUrl = new URL(response.inviteUrl);
        const expectedOrigin = new URL(OWNER_APP_URL).origin;
        const referralToken = new URLSearchParams(inviteUrl.hash.replace(/^#/, '')).get('r') || '';
        if (
            inviteUrl.origin !== expectedOrigin
            || inviteUrl.pathname !== '/invite'
            || inviteUrl.search !== ''
            || inviteUrl.username !== ''
            || inviteUrl.password !== ''
            || referralToken.length < 32
            || referralToken.length > 1024
        ) return false;
    } catch {
        return false;
    }
    const policy = response.policy;
    if (
        !policy
        || typeof policy !== 'object'
        || Array.isArray(policy)
    ) {
        return false;
    }
    const policyRecord = policy as Record<string, unknown>;
    if (
        !isFinitePositiveNumber(policyRecord.referrerCredits)
        || policyRecord.referrerCredits !== OWNER_REFERRAL_REFERRER_CREDITS
        || !isFinitePositiveNumber(policyRecord.referredCredits)
        || policyRecord.referredCredits !== OWNER_REFERRAL_REFERRED_CREDITS
        || policyRecord.paymentOnly !== true
        || policyRecord.rewardCap !== null
    ) return false;
    if (!Array.isArray(response.recent) || response.recent.length > 10) return false;
    return response.recent.every((item: unknown) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const record = item as Record<string, unknown>;
        if (
            typeof record.businessName !== 'string'
            || record.businessName.trim().length === 0
            || record.businessName.length > 100
            || !OWNER_REFERRAL_STATUSES.has(record.status as OwnerReferralOwnerStatus)
            || typeof record.date !== 'string'
        ) return false;
        const parsedDate = new Date(record.date);
        return Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString() === record.date;
    });
};

export const fetchOwnerReferral = async (): Promise<OwnerReferralOwnerResponse> => {
    const response = await fetch('/api/owner-referrals', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
    const body = await readJsonResponseWithLimit<unknown>(
        response,
        OWNER_REFERRAL_OWNER_RESPONSE_MAX_BYTES,
    ).catch((): null => null);
    if (!response.ok || !isOwnerReferralOwnerResponse(body)) {
        throw new Error(response.status === 404 ? 'owner_referral_unavailable' : 'owner_referral_load_failed');
    }
    return body;
};

export const getOwnerReferralShareMessage = (inviteUrl: string, locale?: string): string => (
    String(locale || '').toLowerCase().startsWith('hi')
        ? `हम अपनी मेन्यू और बिज़नेस जानकारी को एक जगह से अपडेट रखने के लिए MenuList का उपयोग करते हैं। मुझे लगा यह आपके बिज़नेस के लिए भी उपयोगी हो सकता है: ${inviteUrl}\n\nदोनों MenuList सब्सक्रिप्शन का भुगतान होने पर दोनों बिज़नेस को क्रेडिट मिलते हैं।`
        : `We use MenuList to keep our menu and business information current from one place. I thought it could help your business too: ${inviteUrl}\n\nMenuList adds credits to both businesses after both MenuList subscriptions are paid.`
);

export const getOwnerReferralShareTitle = (locale?: string): string => (
    String(locale || '').toLowerCase().startsWith('hi')
        ? 'अपने जानने वाले बिज़नेस मालिक को MenuList पर आमंत्रित करें'
        : 'Invite a business owner you know to MenuList'
);
