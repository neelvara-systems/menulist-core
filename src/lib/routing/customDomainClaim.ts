import { DB_COLLECTIONS } from '@constant/database';
import { getKnownProductDomains, type DeploymentProductId } from '@constant/deploymentTargets';
import { ALL_PRODUCT_DOMAINS } from '@constant/productDomains';

const CUSTOM_DOMAIN_CLAIM_DOCUMENT_PREFIX = 'customDomainClaim_';
const CUSTOM_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const CUSTOM_DOMAIN_MAX_LENGTH = 253;
const CUSTOM_DOMAIN_LABEL_MAX_LENGTH = 63;
export const CUSTOM_DOMAIN_RESERVATION_TTL_MS = 15 * 60 * 1000;
const DEPLOYMENT_PRODUCT_IDS: DeploymentProductId[] = [
    'menulist',
    'neelvara',
    'answerlattice',
    'campaigncue',
    'mycodex',
    'signaldesk',
];

export class CustomDomainUnavailableError extends Error {
    readonly code = 'CUSTOM_DOMAIN_UNAVAILABLE';

    constructor() {
        super('custom_domain_unavailable');
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'CustomDomainUnavailableError';
    }
}

export function isCustomDomainUnavailableError(error: unknown): error is CustomDomainUnavailableError {
    return error instanceof CustomDomainUnavailableError
        || (
            Boolean(error)
            && typeof error === 'object'
            && (error as { code?: unknown }).code === 'CUSTOM_DOMAIN_UNAVAILABLE'
        );
}

export function normalizeCustomDomainClaimCandidate(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const domain = value.toLowerCase().trim();
    return domain === value
        && domain.length >= 4
        && domain.length <= CUSTOM_DOMAIN_MAX_LENGTH
        && CUSTOM_DOMAIN_PATTERN.test(domain)
        && domain.split('.').every((label) => label.length <= CUSTOM_DOMAIN_LABEL_MAX_LENGTH)
        ? domain
        : null;
}

const RESERVED_CUSTOM_DOMAIN_ROOTS = Array.from(new Set([
    ...ALL_PRODUCT_DOMAINS,
    ...DEPLOYMENT_PRODUCT_IDS.flatMap((productId) => getKnownProductDomains(productId)),
])).filter((domain) => normalizeCustomDomainClaimCandidate(domain));

/** Platform/product roots and every hostname below them are not tenant claims. */
export function isReservedCustomDomainClaimCandidate(value: unknown): boolean {
    const domain = normalizeCustomDomainClaimCandidate(value);
    if (!domain) return false;
    return RESERVED_CUSTOM_DOMAIN_ROOTS.some((root) => (
        domain === root || domain.endsWith(`.${root}`)
    ));
}

export function getCustomDomainClaimDocumentId(domain: string): string {
    const normalized = normalizeCustomDomainClaimCandidate(domain);
    if (!normalized) throw new Error('custom_domain_claim_input_invalid');
    return `${CUSTOM_DOMAIN_CLAIM_DOCUMENT_PREFIX}${normalized}`;
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
    reservationId: string | null,
    storeId: string,
    nowMillis: number,
): boolean {
    if (!claimExists || claim.status === 'released') return false;
    const sameStore = String(claim.storeId || '') === storeId;
    if (claim.status === 'current') return !sameStore;
    if (claim.status !== 'reserved' && claim.status !== 'releasing') return true;
    const expiresAtMillis = timestampMillis(claim.expiresAt);
    if (expiresAtMillis !== null && expiresAtMillis <= nowMillis) return false;
    return claim.status !== 'reserved'
        || !sameStore
        || !reservationId
        || String(claim.reservationId || '') !== reservationId;
}

export type CustomDomainReservation = {
    claimOwner: string | null;
    claimRef: FirebaseFirestore.DocumentReference;
    claimStatus: string | null;
    domain: string;
    reservationId: string | null;
    storeId: string;
    tenantId: string;
};

export async function readCustomDomainReservationInTransaction(params: {
    db: FirebaseFirestore.Firestore;
    domain: string;
    nowMillis: number;
    reservationId?: string;
    storeId: string;
    tenantId: string;
    transaction: FirebaseFirestore.Transaction;
}): Promise<CustomDomainReservation> {
    const domain = normalizeCustomDomainClaimCandidate(params.domain);
    if (!domain) throw new Error('custom_domain_claim_input_invalid');
    const claimRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getCustomDomainClaimDocumentId(domain));
    const directQuery = params.db.collection(DB_COLLECTIONS.STORES)
        .where('customDomain', '==', domain)
        .limit(2);
    const [claimSnap, directSnap] = await Promise.all([
        params.transaction.get(claimRef),
        params.transaction.get(directQuery),
    ]);
    const claimData = claimSnap.exists ? claimSnap.data() || {} : {};
    const directConflict = directSnap.docs.some((snapshot) => snapshot.id !== params.storeId);
    const reservationId = typeof params.reservationId === 'string' && params.reservationId.length > 0
        ? params.reservationId
        : null;
    if (
        claimBlocksStore(claimSnap.exists, claimData, reservationId, params.storeId, params.nowMillis)
        || directConflict
    ) {
        throw new CustomDomainUnavailableError();
    }
    return {
        claimOwner: claimSnap.exists ? String(claimData.storeId || '') : null,
        claimRef,
        claimStatus: claimSnap.exists ? String(claimData.status || '') : null,
        domain,
        reservationId,
        storeId: params.storeId,
        tenantId: params.tenantId,
    };
}

export function writeReservedCustomDomainClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: CustomDomainReservation,
    now: FirebaseFirestore.Timestamp,
    expiresAt: FirebaseFirestore.Timestamp,
): void {
    if (!reservation.reservationId) throw new Error('custom_domain_reservation_id_missing');
    transaction.set(reservation.claimRef, {
        claimedAt: now,
        customDomain: reservation.domain,
        expiresAt,
        modifiedOn: now,
        releasedAt: null,
        reservationId: reservation.reservationId,
        status: 'reserved',
        storeId: reservation.storeId,
        tId: reservation.tenantId,
    }, { merge: true });
}

export function writeCurrentCustomDomainClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: CustomDomainReservation,
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
): void {
    transaction.set(reservation.claimRef, {
        claimedAt: now,
        customDomain: reservation.domain,
        expiresAt: null,
        modifiedOn: now,
        releasedAt: null,
        reservationId: null,
        status: 'current',
        storeId: reservation.storeId,
        tId: reservation.tenantId,
    }, { merge: true });
}

export function writeReleasingCustomDomainClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: CustomDomainReservation,
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
    expiresAt: FirebaseFirestore.Timestamp,
): void {
    transaction.set(reservation.claimRef, {
        customDomain: reservation.domain,
        expiresAt,
        modifiedOn: now,
        releasedAt: null,
        reservationId: reservation.reservationId,
        status: 'releasing',
        storeId: reservation.storeId,
        tId: reservation.tenantId,
    }, { merge: true });
}

export function writeReleasedCustomDomainClaim(
    transaction: FirebaseFirestore.Transaction,
    reservation: CustomDomainReservation,
    now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
): void {
    transaction.set(reservation.claimRef, {
        customDomain: reservation.domain,
        expiresAt: now,
        modifiedOn: now,
        releasedAt: now,
        reservationId: null,
        status: 'released',
        storeId: reservation.storeId,
        tId: reservation.tenantId,
    }, { merge: true });
}
