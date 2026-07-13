import { DB_COLLECTIONS } from '@constant/database';
import { normalizeStoreSummaryNumericDocumentId } from '@data/shared/storeSummaryBoundary';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';

const BRAND_SUBDOMAIN_TENANT_FIELDS = ['tenantId', 'tId'] as const;

export type SubdomainOwnerScopeErrorReason = 'INVALID_SCOPE' | 'MASTER_REQUIRED';

export class SubdomainOwnerScopeError extends Error {
    readonly code = 'SUBDOMAIN_OWNER_SCOPE';
    readonly reason: SubdomainOwnerScopeErrorReason;

    constructor(reason: SubdomainOwnerScopeErrorReason) {
        super(reason === 'MASTER_REQUIRED' ? 'subdomain_master_store_required' : 'subdomain_store_scope_invalid');
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'SubdomainOwnerScopeError';
        this.reason = reason;
    }
}

export function isSubdomainOwnerScopeError(error: unknown): error is SubdomainOwnerScopeError {
    if (error instanceof SubdomainOwnerScopeError) return true;
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; reason?: unknown };
    return candidate.code === 'SUBDOMAIN_OWNER_SCOPE'
        && (candidate.reason === 'INVALID_SCOPE' || candidate.reason === 'MASTER_REQUIRED');
}

export async function readSubdomainOwnerStoreInTransaction(params: {
    db: FirebaseFirestore.Firestore;
    storeId: string;
    tenantId: string;
    transaction: FirebaseFirestore.Transaction;
}): Promise<{
    storeData: Record<string, unknown>;
    storeRef: FirebaseFirestore.DocumentReference;
}> {
    const { db, transaction } = params;
    const storeId = normalizeStoreSummaryNumericDocumentId(params.storeId);
    const tenantId = normalizeStoreSummaryNumericDocumentId(params.tenantId);
    if (!storeId || !tenantId || storeId !== params.storeId || tenantId !== params.tenantId) {
        throw new SubdomainOwnerScopeError('INVALID_SCOPE');
    }

    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);
    const storeSnap = await transaction.get(storeRef);
    const storeData: Record<string, unknown> = storeSnap.exists ? storeSnap.data() || {} : {};
    const storedTenantId = normalizeStoreSummaryNumericDocumentId(storeData.tenantId ?? storeData.tId);
    if (
        !storeSnap.exists
        || storedTenantId !== tenantId
        || storeData.active === false
        || storeData.deleted === true
        || isPlatformEntityBlocked(storeData)
    ) {
        throw new SubdomainOwnerScopeError('INVALID_SCOPE');
    }

    if (storeData.isMaster === true) return { storeData, storeRef };
    if (storeData.isMaster === false) throw new SubdomainOwnerScopeError('MASTER_REQUIRED');

    const canonicalStoreIds = new Set<string>();
    const tenantValues: Array<string | number> = [tenantId, Number(tenantId)];
    for (const field of BRAND_SUBDOMAIN_TENANT_FIELDS) {
        for (const value of tenantValues) {
            const snapshot = await transaction.get(
                db.collection(DB_COLLECTIONS.STORES).where(field, '==', value).limit(2),
            );
            for (const candidate of snapshot.docs) canonicalStoreIds.add(candidate.id);
        }
    }

    if (canonicalStoreIds.size !== 1 || !canonicalStoreIds.has(storeId)) {
        throw new SubdomainOwnerScopeError('MASTER_REQUIRED');
    }

    return { storeData, storeRef };
}
