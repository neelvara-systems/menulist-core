import { FEATURE_FLAGS } from '@config/features';

export const isOwnerReferralAcquisitionEnabled = (): boolean => (
    FEATURE_FLAGS.ENABLE_OWNER_REFERRAL
    && FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING
);

export const isOwnerReferralPilotStoreAllowed = (storeId: unknown): boolean => {
    const normalizedStoreId = Number(storeId);
    if (!Number.isSafeInteger(normalizedStoreId) || normalizedStoreId <= 0) return false;

    const allowedStoreIds = (FEATURE_FLAGS.OWNER_REFERRAL_PILOT_STORE_IDS || [])
        .map((value) => String(value).trim())
        .filter(Boolean);
    return allowedStoreIds.length === 0 || allowedStoreIds.includes(String(normalizedStoreId));
};

export const isOwnerReferralAcquisitionEnabledForStore = (storeId: unknown): boolean => (
    isOwnerReferralAcquisitionEnabled() && isOwnerReferralPilotStoreAllowed(storeId)
);
