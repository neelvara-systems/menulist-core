import { getAllStoresByTenantId, updateStore } from '@database/stores';
import { updateTenant } from '@database/tenants';
import { updatePlatformUser } from '@database/users';
import { revalidatePublicClientCache } from '@lib/cache/publicClientCache';
import { buildPlatformBlockDetails } from '@lib/platform/entityBlock';
import type { PlatformBlockEntityType } from '@type/platform/blocking';

export async function updatePlatformEntityBlockState({
    actorEmail,
    actorUserId,
    blocked,
    entity,
    entityId,
    entityType,
    reason,
}: {
    actorEmail?: string;
    actorUserId?: string;
    blocked: boolean;
    entity?: any;
    entityId: string | number;
    entityType: PlatformBlockEntityType;
    reason: string;
}) {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
        throw new Error('Block reason is required');
    }

    const blockDetails = buildPlatformBlockDetails({
        actorEmail,
        actorUserId,
        blocked,
        previousBlockDetails: entity?.blockDetails,
        reason: trimmedReason,
    });

    if (entityType === 'tenant') {
        const tenantId = Number(entity?.tenantId ?? entityId);
        const updatedTenant = await updateTenant({
            tenantId,
            blocked,
            blockDetails,
        });
        const tenantStores = await getAllStoresByTenantId(tenantId);
        await Promise.all(
            (tenantStores || []).map((store: any) =>
                revalidatePublicClientCache(store?.storeId, 'updatePlatformTenantBlockState'),
            ),
        );
        return updatedTenant;
    }

    if (entityType === 'store') {
        const storeId = Number(entity?.storeId ?? entityId);
        return updateStore({
            storeId,
            tenantId: entity?.tenantId,
            blocked,
            blockDetails,
            modifiedOn: blockDetails.updatedAt,
        });
    }

    return updatePlatformUser({
        id: String(entity?.id ?? entityId),
        blocked,
        blockDetails,
    });
}
