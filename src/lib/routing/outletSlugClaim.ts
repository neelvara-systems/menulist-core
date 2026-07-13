import { DB_COLLECTIONS } from '@constant/database';

const OUTLET_SLUG_CLAIM_DOCUMENT_PREFIX = 'outletSlugClaim_';
const OUTLET_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OUTLET_SLUG_MAX_LENGTH = 60;
const OUTLET_HISTORY_QUERY_LIMIT = 20;
const NUMERIC_DOCUMENT_ID_PATTERN = /^[1-9][0-9]*$/;

export class OutletSlugUnavailableError extends Error {
    readonly code = 'OUTLET_SLUG_UNAVAILABLE';

    constructor() {
        super('outlet_slug_unavailable');
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'OutletSlugUnavailableError';
    }
}

export function isOutletSlugUnavailableError(error: unknown): error is OutletSlugUnavailableError {
    return error instanceof OutletSlugUnavailableError
        || (
            Boolean(error)
            && typeof error === 'object'
            && (error as { code?: unknown }).code === 'OUTLET_SLUG_UNAVAILABLE'
        );
}

export function isValidOutletSlugClaimCandidate(value: string): boolean {
    return value.length <= OUTLET_SLUG_MAX_LENGTH && OUTLET_SLUG_PATTERN.test(value);
}

function requireNumericDocumentId(value: string): string {
    if (!NUMERIC_DOCUMENT_ID_PATTERN.test(value)) throw new Error('outlet_slug_claim_scope_invalid');
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric) || numeric <= 0 || String(numeric) !== value) {
        throw new Error('outlet_slug_claim_scope_invalid');
    }
    return value;
}

export function getOutletSlugClaimDocumentId(tenantId: string, outletSlug: string): string {
    const normalizedTenantId = requireNumericDocumentId(tenantId);
    if (!isValidOutletSlugClaimCandidate(outletSlug)) throw new Error('outlet_slug_claim_input_invalid');
    return `${OUTLET_SLUG_CLAIM_DOCUMENT_PREFIX}${normalizedTenantId}_${outletSlug}`;
}

export type OutletSlugReservation = {
    claimRef: FirebaseFirestore.DocumentReference;
    outletSlug: string;
    storeId: string;
    tenantId: string;
};

export async function readOutletSlugReservationInTransaction(params: {
    db: FirebaseFirestore.Firestore;
    outletSlug: string;
    storeId: string;
    tenantId: string;
    transaction: FirebaseFirestore.Transaction;
}): Promise<OutletSlugReservation> {
    const { db, outletSlug, transaction } = params;
    const tenantId = requireNumericDocumentId(params.tenantId);
    const storeId = requireNumericDocumentId(params.storeId);
    const claimRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getOutletSlugClaimDocumentId(tenantId, outletSlug));
    const directQuery = db.collection(DB_COLLECTIONS.STORES)
        .where('tenantId', '==', Number(tenantId))
        .where('outletSlug', '==', outletSlug)
        .where('active', '==', true)
        .limit(2);
    const historyQuery = db.collection(DB_COLLECTIONS.STORES)
        .where('tenantId', '==', Number(tenantId))
        .where('previousOutletSlugs', 'array-contains', outletSlug)
        .limit(OUTLET_HISTORY_QUERY_LIMIT);
    const [claimSnap, directSnap, historySnap] = await Promise.all([
        transaction.get(claimRef),
        transaction.get(directQuery),
        transaction.get(historyQuery),
    ]);

    const claimOwner = claimSnap.exists ? String(claimSnap.data()?.storeId || '') : '';
    const claimStatus = claimSnap.exists ? String(claimSnap.data()?.status || '') : '';
    const claimConflict = claimSnap.exists && claimStatus !== 'released' && claimOwner !== storeId;
    const directConflict = directSnap.docs.some((snapshot) => snapshot.id !== storeId);
    const historyConflict = historySnap.size >= OUTLET_HISTORY_QUERY_LIMIT
        || historySnap.docs.some((snapshot) => snapshot.id !== storeId);
    if (claimConflict || directConflict || historyConflict) {
        throw new OutletSlugUnavailableError();
    }

    return { claimRef, outletSlug, storeId, tenantId };
}

export function writeCurrentOutletSlugClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: OutletSlugReservation,
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
): void {
    transaction.set(reservation.claimRef, {
        claimedAt: now,
        modifiedOn: now,
        releasedAt: null,
        status: 'current',
        storeId: reservation.storeId,
        outletSlug: reservation.outletSlug,
        tId: reservation.tenantId,
    }, { merge: true });
}

export function writeRedirectOutletSlugClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: OutletSlugReservation,
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
): void {
    transaction.set(reservation.claimRef, {
        claimedAt: now,
        modifiedOn: now,
        releasedAt: null,
        status: 'redirect',
        storeId: reservation.storeId,
        outletSlug: reservation.outletSlug,
        tId: reservation.tenantId,
    }, { merge: true });
}

export function writeReleasedOutletSlugClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: OutletSlugReservation,
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
): void {
    transaction.set(reservation.claimRef, {
        modifiedOn: now,
        releasedAt: now,
        status: 'released',
        storeId: reservation.storeId,
        outletSlug: reservation.outletSlug,
        tId: reservation.tenantId,
    }, { merge: true });
}
