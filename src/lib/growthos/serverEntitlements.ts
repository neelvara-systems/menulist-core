import { getActiveSubscriptionForStoreServer } from "@database/subscriptions/server";
import { readGrowthOSStoreDataServer } from "@database/growthos/server";
import { evaluateGrowthOSEntitlement } from "@lib/growthos/entitlements";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";
import type { GrowthOSEntitlementResult } from "@lib/growthos/entitlements";

export async function evaluateGrowthOSServerEntitlement(params: {
    session: any;
    storeData?: any;
}): Promise<GrowthOSEntitlementResult> {
    const scope = resolveStorePermissionSessionScope(params.session);
    const tenantId = scope?.tenantScope.numericId ?? null;
    const storeId = scope?.storeScope.numericId ?? null;
    const storeData = params.storeData || (storeId ? await readGrowthOSStoreDataServer(storeId) : null);
    const preliminary = evaluateGrowthOSEntitlement({
        storeDetails: storeData,
        storeId,
        tenantId,
    });
    if (preliminary.reason !== "not_paid") {
        return preliminary;
    }

    const activeSubscription = tenantId && storeId
        ? await getActiveSubscriptionForStoreServer(tenantId, storeId)
        : null;

    return evaluateGrowthOSEntitlement({
        activeSubscription,
        storeDetails: storeData,
        storeId,
        tenantId,
    });
}
