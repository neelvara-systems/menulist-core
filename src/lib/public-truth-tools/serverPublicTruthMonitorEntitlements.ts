import { getActiveSubscriptionForStoreServer } from "@database/subscriptions/server";
import { readPublicTruthMonitorStoreDataServer } from "@database/publicTruthMonitor/server";
import {
    evaluatePublicTruthMonitorEntitlement,
    type PublicTruthMonitorEntitlementInput,
} from "@lib/public-truth-tools/publicTruthMonitorEntitlements";
import type { PublicTruthMonitorEntitlementResult } from "@type/publicTruthMonitor";

export async function evaluatePublicTruthMonitorServerEntitlement(params: {
    session: any;
    storeData?: PublicTruthMonitorEntitlementInput["storeDetails"];
}): Promise<PublicTruthMonitorEntitlementResult> {
    const tenantId = Number(params.session?.tId);
    const storeId = Number(params.session?.sId);
    const storeData = params.storeData || (Number.isFinite(storeId) ? await readPublicTruthMonitorStoreDataServer(storeId) : null);
    const preliminary = evaluatePublicTruthMonitorEntitlement({
        storeDetails: storeData,
        storeId,
    });
    if (preliminary.reason !== "not_paid") {
        return preliminary;
    }

    const activeSubscription = Number.isFinite(tenantId) && Number.isFinite(storeId)
        ? await getActiveSubscriptionForStoreServer(tenantId, storeId)
        : null;

    return evaluatePublicTruthMonitorEntitlement({
        activeSubscription,
        storeDetails: storeData,
        storeId,
    });
}
