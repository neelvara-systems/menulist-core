import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
import {
    normalizeStorePermissionScopeDocumentId,
    resolveStorePermissionSessionScope,
} from "@lib/permissions/scopeDocumentId";
import { canUserAccessStore } from "@lib/multiOutlet/storeSwitchAccess";

export type DigitalScreenSelectedStoreResolution =
    | { ok: false; reason: "forbidden" | "invalid_request" | "not_onboarded" }
    | { ok: true; scope: { storeId: string; tenantId: string } };

export function resolveDigitalScreenSelectedStoreScope(
    session: any,
    requestedStoreId: unknown,
): DigitalScreenSelectedStoreResolution {
    const sessionScope = resolveStorePermissionSessionScope(session);
    if (!sessionScope) return { ok: false, reason: "not_onboarded" };

    const requestedStoreScope = requestedStoreId === undefined
        ? sessionScope.storeScope
        : normalizeStorePermissionScopeDocumentId(requestedStoreId);
    if (!requestedStoreScope) return { ok: false, reason: "invalid_request" };

    const canAccessRequestedStore = requestedStoreScope.numericId === sessionScope.storeScope.numericId
        || canUserAccessStore({
            sessionUser: {
                ...(session?.user || {}),
                platformRole: resolveExactSessionPlatformRole(session) || undefined,
                storeId: session?.user?.storeId || sessionScope.storeScope.numericId,
                storeIds: session?.user?.storeIds || session?.storeIds,
                stores: session?.user?.stores || session?.stores,
            },
            storeId: requestedStoreScope.numericId,
        });
    if (!canAccessRequestedStore) return { ok: false, reason: "forbidden" };

    return {
        ok: true,
        scope: {
            storeId: requestedStoreScope.documentId,
            tenantId: sessionScope.tenantScope.documentId,
        },
    };
}
