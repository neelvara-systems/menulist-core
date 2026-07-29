import type { PlatformBlockDetails } from '@type/platform/blocking';

type SafeReadResult = {
    ok: boolean;
    value?: unknown;
};

const safeRead = (value: unknown, key: string): SafeReadResult => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: true, value: undefined };
    }

    try {
        return { ok: true, value: Reflect.get(value, key) };
    } catch {
        return { ok: false };
    }
};

export function isPlatformEntityBlocked(entity: unknown): boolean {
    const blocked = safeRead(entity, 'blocked');
    const tenantBlocked = safeRead(entity, 'tenantBlocked');
    const blockDetails = safeRead(entity, 'blockDetails');
    if (!blocked.ok || !tenantBlocked.ok || !blockDetails.ok) return true;

    const nestedBlocked = safeRead(blockDetails.value, 'blocked');
    return !nestedBlocked.ok
        || blocked.value === true
        || tenantBlocked.value === true
        || nestedBlocked.value === true;
}

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
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
