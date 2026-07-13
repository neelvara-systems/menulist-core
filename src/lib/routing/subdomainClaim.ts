import { DB_COLLECTIONS } from '@constant/database';

const SUBDOMAIN_CLAIM_DOCUMENT_PREFIX = 'subdomainClaim_';
const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const PREVIOUS_SUBDOMAIN_QUERY_LIMIT = 20;

export class SubdomainUnavailableError extends Error {
    readonly code = 'SUBDOMAIN_UNAVAILABLE';

    constructor() {
        super('subdomain_unavailable');
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'SubdomainUnavailableError';
    }
}

export function isSubdomainUnavailableError(error: unknown): error is SubdomainUnavailableError {
    return error instanceof SubdomainUnavailableError
        || (
            Boolean(error)
            && typeof error === 'object'
            && (error as { code?: unknown }).code === 'SUBDOMAIN_UNAVAILABLE'
        );
}

export type SubdomainReservation = {
    claimRef: FirebaseFirestore.DocumentReference;
    storeId: string;
    subdomain: string;
    tenantId: string;
};

export function isValidSubdomainClaimCandidate(subdomain: string): boolean {
    return SUBDOMAIN_PATTERN.test(subdomain);
}

function timestampMillis(value: unknown): number | null {
    if (!value || typeof value !== 'object') return null;
    try {
        const toMillis = (value as { toMillis?: unknown }).toMillis;
        if (typeof toMillis === 'function') {
            const millis = Number(toMillis.call(value));
            return Number.isFinite(millis) ? millis : null;
        }
        const seconds = Number((value as { seconds?: unknown }).seconds);
        return Number.isFinite(seconds) ? seconds * 1000 : null;
    } catch {
        return null;
    }
}

function claimBlocksStore(
    claimExists: boolean,
    claim: Record<string, unknown>,
    storeId: string,
    nowMillis: number,
): boolean {
    if (!claimExists) return false;
    if (String(claim.storeId || '') === storeId) return false;
    if (claim.status === 'released') return false;
    const expiresAtMillis = timestampMillis(claim.expiresAt);
    return expiresAtMillis === null || expiresAtMillis > nowMillis;
}

function previousReservationIsActive(
    store: Record<string, unknown>,
    subdomain: string,
    nowMillis: number,
): boolean {
    if (!Array.isArray(store.previousSubdomains)) return false;
    return store.previousSubdomains.some((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
        const record = entry as Record<string, unknown>;
        return String(record.subdomain || '').toLowerCase() === subdomain
            && (timestampMillis(record.expiresAt) ?? 0) > nowMillis;
    });
}

export function getSubdomainClaimDocumentId(subdomain: string): string {
    if (!isValidSubdomainClaimCandidate(subdomain)) throw new Error('subdomain_claim_input_invalid');
    return `${SUBDOMAIN_CLAIM_DOCUMENT_PREFIX}${subdomain}`;
}

export async function readSubdomainReservationInTransaction(params: {
    db: FirebaseFirestore.Firestore;
    nowMillis: number;
    storeId: string;
    subdomain: string;
    tenantId: string;
    transaction: FirebaseFirestore.Transaction;
}): Promise<SubdomainReservation> {
    const { db, nowMillis, storeId, subdomain, tenantId, transaction } = params;
    const claimRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getSubdomainClaimDocumentId(subdomain));
    const directQuery = db.collection(DB_COLLECTIONS.STORES)
        .where('subdomain', '==', subdomain)
        .limit(2);
    const previousQuery = db.collection(DB_COLLECTIONS.STORES)
        .where('previousSubdomainSlugs', 'array-contains', subdomain)
        .limit(PREVIOUS_SUBDOMAIN_QUERY_LIMIT);
    const [claimSnap, directSnap, previousSnap] = await Promise.all([
        transaction.get(claimRef),
        transaction.get(directQuery),
        transaction.get(previousQuery),
    ]);

    const claimData = claimSnap.exists ? claimSnap.data() || {} : {};
    const directConflict = directSnap.docs.some((snapshot) => snapshot.id !== storeId);
    const previousConflict = previousSnap.size >= PREVIOUS_SUBDOMAIN_QUERY_LIMIT
        || previousSnap.docs.some((snapshot) => (
            snapshot.id !== storeId
            && previousReservationIsActive(snapshot.data() || {}, subdomain, nowMillis)
        ));
    if (claimBlocksStore(claimSnap.exists, claimData, storeId, nowMillis) || directConflict || previousConflict) {
        throw new SubdomainUnavailableError();
    }

    return { claimRef, storeId, subdomain, tenantId };
}

export function writeCurrentSubdomainClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: SubdomainReservation,
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
): void {
    transaction.set(reservation.claimRef, {
        claimedAt: now,
        expiresAt: null,
        modifiedOn: now,
        releasedAt: null,
        status: 'current',
        storeId: reservation.storeId,
        subdomain: reservation.subdomain,
        tId: reservation.tenantId,
    }, { merge: true });
}

export function writeReleasedSubdomainClaim(params: {
    claimRef: FirebaseFirestore.DocumentReference;
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
    storeId: string;
    subdomain: string;
    tenantId: string;
    transaction: FirebaseFirestore.Transaction;
}): void {
    params.transaction.set(params.claimRef, {
        expiresAt: params.now,
        modifiedOn: params.now,
        releasedAt: params.now,
        status: 'released',
        storeId: params.storeId,
        subdomain: params.subdomain,
        tId: params.tenantId,
    }, { merge: true });
}

export function writeRedirectSubdomainClaim(params: {
    claimRef: FirebaseFirestore.DocumentReference;
    expiresAt: FirebaseFirestore.Timestamp;
    now: FirebaseFirestore.Timestamp;
    storeId: string;
    subdomain: string;
    tenantId: string;
    transaction: FirebaseFirestore.Transaction;
}): void {
    params.transaction.set(params.claimRef, {
        expiresAt: params.expiresAt,
        modifiedOn: params.now,
        releasedAt: null,
        status: 'redirect',
        storeId: params.storeId,
        subdomain: params.subdomain,
        tId: params.tenantId,
    }, { merge: true });
}
