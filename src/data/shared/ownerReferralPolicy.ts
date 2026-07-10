export const OWNER_REFERRAL_PROGRAM_VERSION = 2 as const;
export const OWNER_REFERRAL_TOKEN_TTL_DAYS = 30;
export const OWNER_REFERRAL_COOKIE_NAME = 'ml_owner_referral';
export const OWNER_REFERRAL_REFERRER_CREDITS = 100;
export const OWNER_REFERRAL_REFERRED_CREDITS = 50;
export const OWNER_REFERRAL_RECENT_LIMIT = 10;
export const OWNER_REFERRAL_PENDING_REPAIR_LIMIT = 100;
export const OWNER_REFERRAL_BUSINESS_NAME_MAX_LENGTH = 100;
export const OWNER_REFERRAL_ONBOARDING_SOURCE_MAX_LENGTH = 48;

export const OWNER_REFERRAL_STATUS = {
    ATTRIBUTED: 'attributed',
    PAYMENT_PENDING: 'payment_pending',
    REWARD_ISSUED: 'reward_issued',
} as const;

export type OwnerReferralStatus = typeof OWNER_REFERRAL_STATUS[keyof typeof OWNER_REFERRAL_STATUS];

export const OWNER_REFERRAL_LEDGER_EVENT = 'owner_referral.reward_issued' as const;
export const OWNER_REFERRAL_LEDGER_TRANSACTION_TYPE = 'reward_credit' as const;
export const OWNER_REFERRAL_REWARD_TYPE = 'owner_referral' as const;

export const OWNER_REFERRAL_OWNER_STATUS = {
    WAITING_FOR_PAYMENT: 'waiting_for_payment',
    WAITING_FOR_BOTH_PAYMENTS: 'waiting_for_both_payments',
    ISSUED: 'issued',
} as const;

export type OwnerReferralOwnerStatus = typeof OWNER_REFERRAL_OWNER_STATUS[keyof typeof OWNER_REFERRAL_OWNER_STATUS];
