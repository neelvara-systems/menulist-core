import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/scopeDocumentId";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";

export function isCurrentPublicTruthMonitorStoreScope(params: {
    storeData: Record<string, unknown> | undefined;
    tenantData: Record<string, unknown> | undefined;
    tenantDocumentId: string;
}): boolean {
    const persistedTenantId = normalizeStorePermissionScopeDocumentId(
        params.storeData?.tenantId ?? params.storeData?.tId,
    )?.documentId;

    return Boolean(
        params.storeData
        && params.tenantData
        && persistedTenantId === params.tenantDocumentId
        && params.storeData.active !== false
        && params.storeData.deleted !== true
        && !isPlatformEntityBlocked(params.storeData)
        && params.tenantData.active !== false
        && params.tenantData.deleted !== true
        && !isPlatformEntityBlocked(params.tenantData)
    );
}
