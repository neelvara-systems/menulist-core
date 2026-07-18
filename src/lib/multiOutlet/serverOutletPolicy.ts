import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import {
    normalizeMultiOutletNumericDocumentId,
    normalizeMultiOutletProjectId,
    type MultiOutletNumericDocumentId,
} from "@lib/multiOutlet/projectIdBoundary";
import {
    DEFAULT_OUTLET_POLICY,
    LOCAL_CATEGORY_PREFIX,
    LOCAL_ITEM_PREFIX,
    type OutletPolicy,
} from "@type/multiOutlet.types";

type OutletPolicyAction = "description" | "image" | "translation";

type SessionLike = {
    tId?: number | string;
    sId?: number | string;
    user?: {
        tenantId?: number | string;
        storeId?: number | string;
    };
};

const getSessionTenantScope = (session: SessionLike): MultiOutletNumericDocumentId | null => (
    normalizeMultiOutletNumericDocumentId(session.tId ?? session.user?.tenantId)
);

const getSessionStoreScope = (session: SessionLike): MultiOutletNumericDocumentId | null => (
    normalizeMultiOutletNumericDocumentId(session.sId ?? session.user?.storeId)
);

const hasInheritedTargets = (itemIds: string[]) => {
    if (!itemIds.length) return true;
    return itemIds.some((itemId) => itemId && !itemId.startsWith(LOCAL_ITEM_PREFIX));
};

const hasInheritedCategoryTargets = (categoryIds: string[]) => (
    categoryIds.some((categoryId) => categoryId && !categoryId.startsWith(LOCAL_CATEGORY_PREFIX))
);

const hasInheritedTranslationItemTargets = (itemIds: string[]) => (
    itemIds.some((itemId) => itemId && !itemId.startsWith(LOCAL_ITEM_PREFIX))
);

const getPolicyBlockReason = (
    policy: OutletPolicy,
    action: OutletPolicyAction,
    itemIds: string[],
    categoryIds: string[] = [],
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

    if (action === "translation") {
        if (hasInheritedTranslationItemTargets(itemIds) || hasInheritedCategoryTargets(categoryIds)) {
            return "Translations for inherited menu content stay connected to the master menu";
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
    categoryIds = [],
    itemIds = [],
    projectId,
    session,
}: {
    action: OutletPolicyAction;
    categoryIds?: string[];
    itemIds?: string[];
    projectId?: string | null;
    session: SessionLike;
}): Promise<string | null> {
    if (!projectId) return null;

    const tenantScope = getSessionTenantScope(session);
    const storeScope = getSessionStoreScope(session);
    if (!tenantScope || !storeScope) {
        return "Store access is required";
    }

    const projectScope = normalizeMultiOutletProjectId(projectId);
    if (
        !projectScope
        || projectScope.tId !== tenantScope.numericId
        || projectScope.sId !== storeScope.numericId
    ) {
        return "Project not found";
    }

    const db = admin.firestore();
    const projectSnap = await db
        .doc(`${DB_COLLECTIONS.PROJECTS}/${tenantScope.documentId}/${storeScope.documentId}/${projectScope.projectId}`)
        .get();
    if (!projectSnap.exists || projectSnap.data()?.deleted === true) {
        return "Project not found";
    }

    const project = projectSnap.data();
    const masterProjectId = project?.masterProjectId;
    if (!masterProjectId) return null;

    const masterProjectScope = normalizeMultiOutletProjectId(masterProjectId);
    if (!masterProjectScope || masterProjectScope.tId !== tenantScope.numericId) {
        return "Store access is required";
    }
    if (masterProjectScope.sId === storeScope.numericId) return null;

    const masterStoreSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${masterProjectScope.storeDocumentId}`).get();
    const masterTenantScope = normalizeMultiOutletNumericDocumentId(masterStoreSnap.data()?.tenantId);
    if (
        !masterTenantScope
        || masterTenantScope.numericId !== tenantScope.numericId
        || masterStoreSnap.data()?.isMaster !== true
        || masterStoreSnap.data()?.active === false
        || masterStoreSnap.data()?.deleted === true
        || isPlatformEntityBlocked(masterStoreSnap.data())
    ) {
        return "Store access is required";
    }
    const policy: OutletPolicy = {
        ...DEFAULT_OUTLET_POLICY,
        ...(masterStoreSnap.data()?.outletPolicy || {}),
    };

    return getPolicyBlockReason(policy, action, itemIds.filter(Boolean), categoryIds.filter(Boolean));
}
