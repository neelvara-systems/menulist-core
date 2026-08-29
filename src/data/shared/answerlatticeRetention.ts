export const ANSWERLATTICE_RETENTION_DAYS = {
    signalEvents: 365,
    schedulerRunLogs: 90,
    notificationLogs: 90,
    ownerNotificationEvents: 90,
    ownerNotificationDeliveries: 90,
    ownerNotificationRateLimits: 2,
    contactEnquiries: 365,
    earlyAccessRequests: 365,
    queryEmbeddings: 30,
    aiSearchHistory: 90,
    contentFeedback: 365,
} as const;

export const ANSWERLATTICE_RETENTION_DAY_MS = 24 * 60 * 60 * 1000;

export type AnswerlatticeRetentionKey = keyof typeof ANSWERLATTICE_RETENTION_DAYS;

export const getAnswerlatticeRetentionExpiryMillis = (
    key: AnswerlatticeRetentionKey,
    fromMillis = Date.now(),
): number => fromMillis + ANSWERLATTICE_RETENTION_DAYS[key] * ANSWERLATTICE_RETENTION_DAY_MS;
