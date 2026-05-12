import type { PlatformBlockDetails } from '@type/platform/blocking';

export function isPlatformEntityBlocked(entity: any): boolean {
    return entity?.blocked === true || entity?.blockDetails?.blocked === true;
}

function cleanUndefined<T extends Record<string, any>>(value: T): T {
    return Object.fromEntries(
        Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
    ) as T;
}

export function buildPlatformBlockDetails({
    actorEmail,
    actorUserId,
    blocked,
    previousBlockDetails,
    reason,
}: {
    actorEmail?: string;
    actorUserId?: string;
    blocked: boolean;
    previousBlockDetails?: PlatformBlockDetails;
    reason: string;
}): PlatformBlockDetails {
    const now = new Date().toISOString();
    const trimmedReason = reason.trim();
    const base = {
        blocked,
        reason: trimmedReason,
        source: 'platform_settings' as const,
        blockedAt: previousBlockDetails?.blockedAt,
        blockedByEmail: previousBlockDetails?.blockedByEmail,
        blockedByUserId: previousBlockDetails?.blockedByUserId,
        blockedReason: previousBlockDetails?.blockedReason || previousBlockDetails?.reason,
        updatedAt: now,
        updatedByEmail: actorEmail,
        updatedByUserId: actorUserId,
    };

    if (blocked) {
        return cleanUndefined({
            ...base,
            blockedAt: now,
            blockedByEmail: actorEmail,
            blockedByUserId: actorUserId,
            blockedReason: trimmedReason,
        });
    }

    return cleanUndefined({
        ...base,
        unblockedReason: trimmedReason,
        unblockedAt: now,
        unblockedByEmail: actorEmail,
        unblockedByUserId: actorUserId,
    });
}
