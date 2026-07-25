import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/scopeDocumentId";
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from "@lib/publicTruth/entityEligibility";

const CAMPAIGNS_SUMMARY_ID_PATTERN = /^campaigns_(\d+)$/;

export function resolveUniqueLegacyScreenSeenStoreId(
    summaryDocumentIds: readonly string[],
): string | null {
    if (summaryDocumentIds.length !== 1) return null;
    const match = summaryDocumentIds[0]?.match(CAMPAIGNS_SUMMARY_ID_PATTERN);
    return match
        ? normalizeStorePermissionScopeDocumentId(match[1])?.documentId || null
        : null;
}

export function isCurrentScreenSeenPublicScope(params: {
    storeData: Record<string, unknown> | undefined;
    storeDocumentId: string;
    tenantData: Record<string, unknown> | undefined;
    tenantDocumentId: string;
}): boolean {
    if (!params.storeData || !params.tenantData) return false;
    const storeDocumentScope = normalizeStorePermissionScopeDocumentId(params.storeDocumentId);
    const storedStoreScope = normalizeMenuListPublicEntityIdentityAliases([
        params.storeData.storeId,
        params.storeData.sId,
    ]);
    const storedTenantScope = normalizeMenuListPublicEntityIdentityAliases([
        params.storeData.tenantId,
        params.storeData.tId,
    ]);
    if (
        !storeDocumentScope
        || !storedStoreScope
        || !storedTenantScope
        || storedStoreScope.documentId !== storeDocumentScope.documentId
        || storedTenantScope.documentId !== params.tenantDocumentId
        || !isMenuListPublicEntityEligible(params.storeData)
        || !isMenuListPublicEntityEligible(params.tenantData)
    ) {
        return false;
    }

    const tenantIdentityValues = [
        params.tenantData.tenantId,
        params.tenantData.tId,
    ].filter((value) => value !== undefined && value !== null);
    return tenantIdentityValues.length === 0
        || normalizeMenuListPublicEntityIdentityAliases(tenantIdentityValues)?.documentId === params.tenantDocumentId;
}
