import { getActiveSubscriptionForStoreServer } from "@database/subscriptions/server";
import { readPublicTruthMonitorStoreDataServer } from "@database/publicTruthMonitor/server";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import {
    evaluatePublicTruthMonitorEntitlement,
    type PublicTruthMonitorEntitlementInput,
} from "@lib/public-truth-tools/publicTruthMonitorEntitlements";
import type { PublicTruthMonitorEntitlementResult } from "@type/publicTruthMonitor";

type PublicTruthMonitorSessionScopeDocumentId = {
    documentId: string;
    numericId: number;
};

export type PublicTruthMonitorSessionScope = {
    tenantScope: PublicTruthMonitorSessionScopeDocumentId;
    storeScope: PublicTruthMonitorSessionScopeDocumentId;
};

export function normalizePublicTruthMonitorSessionScopeDocumentId(
    value: unknown,
): PublicTruthMonitorSessionScopeDocumentId | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    if (documentId !== raw || !/^[1-9]\d*$/.test(documentId) || !isValidFirestoreDocumentId(documentId)) {
        return null;
    }

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { documentId, numericId }
        : null;
}

export function getPublicTruthMonitorSessionScope(session: any): PublicTruthMonitorSessionScope | null {
    const tenantScope = normalizePublicTruthMonitorSessionScopeDocumentId(session?.tId);
    const storeScope = normalizePublicTruthMonitorSessionScopeDocumentId(session?.sId);
    return tenantScope && storeScope ? { tenantScope, storeScope } : null;
}

export async function evaluatePublicTruthMonitorServerEntitlement(params: {
    session: any;
    storeData?: PublicTruthMonitorEntitlementInput["storeDetails"];
}): Promise<PublicTruthMonitorEntitlementResult> {
    const sessionScope = getPublicTruthMonitorSessionScope(params.session);
    const storeData = params.storeData || (sessionScope ? await readPublicTruthMonitorStoreDataServer(sessionScope.storeScope.documentId) : null);
    const preliminary = evaluatePublicTruthMonitorEntitlement({
        storeDetails: storeData,
        storeId: sessionScope?.storeScope.numericId,
        tenantId: sessionScope?.tenantScope.numericId,
    });
    if (preliminary.reason !== "not_paid") {
        return preliminary;
    }

    const activeSubscription = sessionScope
        ? await getActiveSubscriptionForStoreServer(sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId)
        : null;

    return evaluatePublicTruthMonitorEntitlement({
        activeSubscription,
        storeDetails: storeData,
        storeId: sessionScope?.storeScope.numericId,
        tenantId: sessionScope?.tenantScope.numericId,
    });
}
