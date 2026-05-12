export type PlatformBlockEntityType = 'tenant' | 'store' | 'user';

export type PlatformBlockDetails = {
    blocked: boolean;
    entityType?: PlatformBlockEntityType;
    entityId?: string | number;
    reason: string;
    blockedReason?: string;
    unblockedReason?: string;
    source: 'platform_settings';
    blockedAt?: string;
    blockedByUserId?: string;
    blockedByEmail?: string;
    unblockedAt?: string;
    unblockedByUserId?: string;
    unblockedByEmail?: string;
    updatedAt: string;
    updatedByUserId?: string;
    updatedByEmail?: string;
};
