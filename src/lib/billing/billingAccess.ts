import { DB_COLLECTIONS } from "@constant/database";
import { ANSWERLATTICE_PERMISSION_KEYS } from "@constant/answerlattice/permissions";
import { MENULIST_PLATFORM_USER_ROLE } from "@constant/user";
import {
    resolveExactSessionPlatformRole,
    resolveExactSessionStoreRole,
} from "@lib/auth/sessionPlatformRole";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { requireAnswerlatticePermission } from "@lib/answerlattice/accessControl";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { logger } from "@lib/monitoring/logger";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import {
    isSensitiveStoreRecordInScope,
    resolveSensitiveSessionStoreScope,
} from "@lib/security/sensitiveStoreScope";
import { getBoundedRazorpaySecurityContext, getBoundedRazorpayStringContext } from "@lib/billing/razorpayDiagnostics";
import { NextRequest } from "next/server";

export type BillingMutationScopeDocumentId = {
    numericId: number;
    documentId: string;
};

const getSessionStoreRoleId = (session: any, storeId: number): string | undefined => {
    const storeMembership = session?.user?.stores?.find(
        (store: any) => String(store?.storeId) === String(storeId)
    );

    return storeMembership?.role || resolveExactSessionStoreRole(session) || undefined;
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
    if (resolveExactSessionPlatformRole(session) === MENULIST_PLATFORM_USER_ROLE) {
        const currentPlatformUser = await getCurrentPlatformUser(session);
        if (currentPlatformUser) {
            return true;
        }
        logger.security('Billing Mutation Authorization Failed', {
            ...getBoundedRazorpaySecurityContext(session, request),
            endpoint,
            error: 'Current platform authority unavailable for billing mutation',
        }, 'high');
        return false;
    }

    const sessionScope = resolveSensitiveSessionStoreScope({
        tenantValues: [session?.tId, session?.user?.tenantId],
        storeValues: [session?.sId, session?.user?.storeId],
    });
    const tenantScope = sessionScope?.tenantScope;
    const storeScope = sessionScope?.storeScope;
    const tenantId = tenantScope?.numericId;
    const storeId = storeScope?.numericId;
    const roleId = storeId ? getSessionStoreRoleId(session, storeId) : undefined;

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
        || !isSensitiveStoreRecordInScope({
            storeData,
            storeDocumentId: storeScope.documentId,
            tenantDocumentId: tenantScope.documentId,
        })
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

/**
 * Answerlattice billing is narrower than the general management gate. Resolve
 * the current persisted workspace membership and role definition so a stale
 * session role, a default manager, or a custom role without canManageBilling
 * cannot call the shared Razorpay mutation routes directly.
 */
export const canManageAnswerlatticeBillingMutation = async (
    session: any,
    request: NextRequest,
): Promise<boolean> => {
    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    );
    return permission.response === null;
};
