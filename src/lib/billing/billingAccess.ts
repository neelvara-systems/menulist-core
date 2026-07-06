import { DB_COLLECTIONS } from "@constant/database";
import { ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { logger } from "@lib/monitoring/logger";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { getBoundedRazorpaySecurityContext, getBoundedRazorpayStringContext } from "@lib/billing/razorpayDiagnostics";
import { NextRequest } from "next/server";

export type BillingMutationScopeDocumentId = {
    numericId: number;
    documentId: string;
};

const getSessionStoreRoleId = (session: any): string | undefined => {
    const storeId = session?.user?.storeId ?? session?.sId;
    const storeMembership = session?.user?.stores?.find(
        (store: any) => String(store?.storeId) === String(storeId)
    );

    return storeMembership?.role || session?.user?.role || session?.role;
};

export function normalizeBillingMutationScopeDocumentId(value: unknown): BillingMutationScopeDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

export const canManageBillingMutation = async (
    session: any,
    request: NextRequest,
    endpoint: string,
): Promise<boolean> => {
    if (
        session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
        || session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
    ) {
        return true;
    }

    const storeId = session?.user?.storeId ?? session?.sId;
    const tenantId = session?.user?.tenantId ?? session?.tId;
    const roleId = getSessionStoreRoleId(session);
    const tenantScope = normalizeBillingMutationScopeDocumentId(tenantId);
    const storeScope = normalizeBillingMutationScopeDocumentId(storeId);

    if (!tenantScope || !storeScope || !roleId) {
        logger.security('Billing Mutation Authorization Failed', {
            ...getBoundedRazorpaySecurityContext(session, request),
            endpoint,
            error: 'Missing tenant, store, or role for billing mutation',
            ...getBoundedRazorpayStringContext('billingTenantId', tenantId),
            ...getBoundedRazorpayStringContext('billingStoreId', storeId),
            ...getBoundedRazorpayStringContext('roleId', roleId),
        }, 'high');
        return false;
    }

    const storeSnap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();
    const storeData = storeSnap.exists ? storeSnap.data() : null;
    if (
        !storeData
        || Number(storeData?.tenantId) !== tenantScope.numericId
        || storeData.active === false
        || storeData.deleted === true
        || isPlatformEntityBlocked(storeData)
    ) {
        logger.security('Billing Mutation Authorization Failed', {
            ...getBoundedRazorpaySecurityContext(session, request),
            endpoint,
            error: 'Store unavailable for billing mutation',
            ...getBoundedRazorpayStringContext('billingTenantId', tenantId),
            ...getBoundedRazorpayStringContext('billingStoreId', storeId),
            ...getBoundedRazorpayStringContext('roleId', roleId),
        }, 'high');
        return false;
    }

    const storeRole = storeData?.roles?.find(
        (role: any) => role?.active !== false && role?.id === roleId
    );

    if (!storeRole?.permissions && roleId === 'owner') {
        return true;
    }

    if (storeRole?.permissions?.canManageSubscription === true) {
        return true;
    }

    logger.security('Billing Mutation Authorization Failed', {
        ...getBoundedRazorpaySecurityContext(session, request),
        endpoint,
        error: 'User lacks canManageSubscription permission',
        ...getBoundedRazorpayStringContext('billingStoreId', storeId),
        ...getBoundedRazorpayStringContext('roleId', roleId),
    }, 'high');

    return false;
};
