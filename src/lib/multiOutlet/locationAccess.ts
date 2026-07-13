import { FEATURE_FLAGS } from "@config/features";
import { normalizeStoreSwitchStoreId } from "@lib/multiOutlet/storeSwitchAccess";
import type { RolePermissions } from "@type/platform/roles";

type StoreSummary = {
    active?: boolean;
    isMaster?: boolean;
    storeId?: number | string;
};

type LocationAccessContext = {
    isMasterUser?: boolean;
    storeDetails?: { isMaster?: boolean; storeId?: number | string } | null;
    tenantDetails?: { storesList?: StoreSummary[] } | null;
    userPermissions?: RolePermissions | null;
};

export const hasMasterStoreInTenant = (
    tenantDetails?: LocationAccessContext["tenantDetails"],
) => Boolean(tenantDetails?.storesList?.some((store) => store?.isMaster === true));

/**
 * Legacy compatibility for accounts created before the first store was marked
 * with isMaster=true. The only safe automatic inference is a tenant with one
 * store and no existing master; multi-store legacy tenants require explicit
 * admin repair because choosing a master would be ambiguous.
 */
export const isLegacySingleStoreMasterCandidate = ({
    storeDetails,
    tenantDetails,
}: Pick<LocationAccessContext, "storeDetails" | "tenantDetails">) => {
    const storeId = normalizeStoreSwitchStoreId(storeDetails?.storeId);
    const storesList = tenantDetails?.storesList || [];

    if (!storeId || storesList.length !== 1 || hasMasterStoreInTenant(tenantDetails)) {
        return false;
    }

    const onlyStore = storesList[0];
    return onlyStore?.active !== false && normalizeStoreSwitchStoreId(onlyStore?.storeId) === storeId;
};

export const isMasterLocationContext = ({
    isMasterUser,
    storeDetails,
    tenantDetails,
}: Pick<LocationAccessContext, "isMasterUser" | "storeDetails" | "tenantDetails">) => (
    isMasterUser === true
    || storeDetails?.isMaster === true
    || isLegacySingleStoreMasterCandidate({ storeDetails, tenantDetails })
);

export const canManageLocationSettings = (context: LocationAccessContext) => (
    FEATURE_FLAGS.ENABLE_CHAIN_CONTROL_PANEL === true
    && context.userPermissions?.canManageOutlets === true
    && isMasterLocationContext(context)
);

export const canCreateOutletLocation = (context: LocationAccessContext) => (
    FEATURE_FLAGS.ENABLE_OUTLET_CREATION === true
    && canManageLocationSettings(context)
);
