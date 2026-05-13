import type { PlatformBlockEntityType } from '@type/platform/blocking';

export async function updatePlatformEntityBlockState({
    blocked,
    entity,
    entityId,
    entityType,
    reason,
}: {
    blocked: boolean;
    entity?: any;
    entityId: string | number;
    entityType: PlatformBlockEntityType;
    reason: string;
}) {
    const response = await fetch('/api/platform/entity-blocks', {
        body: JSON.stringify({
            blocked,
            entity,
            entityId,
            entityType,
            reason,
        }),
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });

    let payload: any = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error || 'Could not update block status');
    }

    return payload?.entity;
}
