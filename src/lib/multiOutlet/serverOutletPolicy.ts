import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { DEFAULT_OUTLET_POLICY, LOCAL_ITEM_PREFIX, type OutletPolicy } from "@type/multiOutlet.types";

type OutletPolicyAction = "description" | "image";

type SessionLike = {
    tId?: number | string;
    sId?: number | string;
    user?: {
        tenantId?: number | string;
        storeId?: number | string;
    };
};

const parseStoreIdFromProjectId = (projectId: string): number | null => {
    const parts = projectId.split("-");
    const parsed = Number(parts[parts.length - 1]);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const getSessionTenantId = (session: SessionLike): number | null => {
    const parsed = Number(session.tId ?? session.user?.tenantId);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const getSessionStoreId = (session: SessionLike): number | null => {
    const parsed = Number(session.sId ?? session.user?.storeId);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const hasInheritedTargets = (itemIds: string[]) => {
    if (!itemIds.length) return true;
    return itemIds.some((itemId) => itemId && !itemId.startsWith(LOCAL_ITEM_PREFIX));
};

const getPolicyBlockReason = (
    policy: OutletPolicy,
    action: OutletPolicyAction,
    itemIds: string[],
) => {
    if (action === "description") {
        if (policy.canGenerateDescriptions === false) {
            return "Description generation is disabled for this outlet";
        }
        if (policy.descriptionOverride !== true && hasInheritedTargets(itemIds)) {
            return "Description changes for inherited items are disabled for this outlet";
        }
        return null;
    }

    if (policy.canGenerateImages === false) {
        return "Image generation is disabled for this outlet";
    }
    if (policy.imageOverride !== true && hasInheritedTargets(itemIds)) {
        return "Image changes for inherited items are disabled for this outlet";
    }
    return null;
};

export async function getLinkedOutletPolicyBlockReason({
    action,
    itemIds = [],
    projectId,
    session,
}: {
    action: OutletPolicyAction;
    itemIds?: string[];
    projectId?: string | null;
    session: SessionLike;
}): Promise<string | null> {
    if (!projectId) return null;

    const tenantId = getSessionTenantId(session);
    const storeId = getSessionStoreId(session);
    if (!tenantId || !storeId) {
        return "Store access is required";
    }

    const db = admin.firestore();
    const projectSnap = await db
        .doc(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}/${projectId}`)
        .get();
    if (!projectSnap.exists) {
        return "Project not found";
    }

    const project = projectSnap.data();
    const masterProjectId = project?.masterProjectId;
    if (!masterProjectId) return null;

    const masterStoreId = parseStoreIdFromProjectId(masterProjectId);
    if (!masterStoreId || masterStoreId === storeId) return null;

    const masterStoreSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${masterStoreId}`).get();
    const policy: OutletPolicy = {
        ...DEFAULT_OUTLET_POLICY,
        ...(masterStoreSnap.data()?.outletPolicy || {}),
    };

    return getPolicyBlockReason(policy, action, itemIds.filter(Boolean));
}
