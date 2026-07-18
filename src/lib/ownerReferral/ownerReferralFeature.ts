import { FEATURE_FLAGS } from '@config/features';

const getOwnerReferralPilotStoreIds = (): string[] => (
    (FEATURE_FLAGS.OWNER_REFERRAL_PILOT_STORE_IDS || [])
        .map((value) => Number(value))
        .filter((value) => Number.isSafeInteger(value) && value > 0)
        .map(String)
);

export const isOwnerReferralPilotConfigured = (): boolean => (
    getOwnerReferralPilotStoreIds().length > 0
);

export const isOwnerReferralAcquisitionEnabled = (): boolean => (
    FEATURE_FLAGS.ENABLE_OWNER_REFERRAL
    && FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING
    && isOwnerReferralPilotConfigured()
);

export const isOwnerReferralPilotStoreAllowed = (storeId: unknown): boolean => {
    const normalizedStoreId = Number(storeId);
    if (!Number.isSafeInteger(normalizedStoreId) || normalizedStoreId <= 0) return false;

    return getOwnerReferralPilotStoreIds().includes(String(normalizedStoreId));
};

export const isOwnerReferralAcquisitionEnabledForStore = (storeId: unknown): boolean => (
    isOwnerReferralAcquisitionEnabled() && isOwnerReferralPilotStoreAllowed(storeId)
);
