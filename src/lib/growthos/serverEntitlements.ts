import { getActiveSubscriptionForStoreServer } from "@database/subscriptions/server";
import { readGrowthOSStoreDataServer } from "@database/growthos/server";
import { evaluateGrowthOSEntitlement } from "@lib/growthos/entitlements";
import type { GrowthOSEntitlementResult } from "@lib/growthos/entitlements";

export async function evaluateGrowthOSServerEntitlement(params: {
    session: any;
    storeData?: any;
}): Promise<GrowthOSEntitlementResult> {
    const tenantId = Number(params.session?.tId);
    const storeId = Number(params.session?.sId);
    const storeData = params.storeData || (Number.isFinite(storeId) ? await readGrowthOSStoreDataServer(storeId) : null);
    const preliminary = evaluateGrowthOSEntitlement({
        storeDetails: storeData,
        storeId,
    });
    if (preliminary.reason !== "not_paid") {
        return preliminary;
    }

    const activeSubscription = Number.isFinite(tenantId) && Number.isFinite(storeId)
        ? await getActiveSubscriptionForStoreServer(tenantId, storeId)
        : null;

    return evaluateGrowthOSEntitlement({
        activeSubscription,
        storeDetails: storeData,
        storeId,
    });
}
