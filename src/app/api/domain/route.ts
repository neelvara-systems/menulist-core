export const dynamic = 'force-dynamic';
/**
 * Custom Domain Management API
 * 
 * POST /api/domain — Add a custom domain to the Vercel project
 * GET /api/domain — Get domain status/verification info
 * DELETE /api/domain — Remove a custom domain
 * 
 * Uses Vercel API v9 for domain management.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID env vars.
 * 
 * URL Routing Architecture — Phase 2 (Custom Domain)
 * @see __docs__/url-routing-architecture/README.md
 */
import { getBoundedLogValueContext, getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { isAnswerlatticeHostedHelpCandidateHostname } from "@constant/answerlattice/hostedHelp";
import { admin } from "@lib/firebase/firebaseAdmin";
import {
    addDomainToVercelProject,
    getVercelDomainConfig,
    getVercelProjectDomain,
    isVercelDomainConfigured,
    isVercelDomainExplicitlyMisconfigured,
    removeDomainFromVercelProject,
} from "@lib/domains/vercelDomains";
import { revalidateMenuCache } from "@lib/actions/revalidateMenuCache";
import {
    normalizeStorePermissionScopeDocumentId,
    requireAnyStorePermissionForStoreData,
} from "@lib/permissions/server";
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from "@lib/publicTruth/entityEligibility";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import {
    CUSTOM_DOMAIN_RESERVATION_TTL_MS,
    CustomDomainReservation,
    getCustomDomainClaimDocumentId,
    isCustomDomainUnavailableError,
    isReservedCustomDomainClaimCandidate,
    normalizeCustomDomainClaimCandidate,
    readCustomDomainReservationInTransaction,
    writeCurrentCustomDomainClaim,
    writeReleasedCustomDomainClaim,
    writeReleasingCustomDomainClaim,
    writeReservedCustomDomainClaim,
} from "@lib/routing/customDomainClaim";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withAuth } from "../../../middleware/auth";

// Validation
const AddDomainSchema = z.object({
    domain: z.string()
        .min(4)
        .max(253)
        .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, {
            message: "Invalid domain format. Example: yourbusiness.com",
        }),
});
const DOMAIN_ACTION_MAX_BODY_BYTES = 4 * 1024;
const DOMAIN_PROVIDER_FAILURE_MESSAGE = "Failed to add domain to Vercel";
const DOMAIN_STATUS_PROVIDER_FAILURE_MESSAGE = "Failed to check domain status with Vercel";
const DOMAIN_REMOVE_PROVIDER_FAILURE_MESSAGE = "Failed to remove domain from Vercel";

class CustomDomainLegacyConflictError extends Error {
    readonly code = 'CUSTOM_DOMAIN_LEGACY_CONFLICT';

    constructor() {
        super('custom_domain_legacy_conflict');
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'CustomDomainLegacyConflictError';
    }
}

const getBoundedDomainRouteStringContext = (label: string, value: unknown) => {
    return getBoundedLogValueContext(label, value);
};

const normalizeDomainRouteFailure = (error: unknown, message: string): Error => {
    const normalized = new Error(message);
    const errorName = getBoundedErrorName(error);
    if (errorName) {
        normalized.name = errorName;
    }
    return normalized;
};

const buildDomainRouteLogContext = (
    domain: unknown,
    storeId: unknown,
    tenantId: unknown,
    metadata: Record<string, boolean | number | string | undefined> = {},
) => ({
    ...getBoundedDomainRouteStringContext('domain', domain),
    ...getBoundedDomainRouteStringContext('storeId', storeId),
    ...getBoundedDomainRouteStringContext('tenantId', tenantId),
    ...metadata,
});

function normalizeDomainSessionDocumentId(value: unknown): string | null {
    return normalizeStorePermissionScopeDocumentId(value)?.documentId ?? null;
}

function getDomainSessionScope(session: any): { tenantId: string; storeId: string } | null {
    const tenantId = normalizeDomainSessionDocumentId(session?.tId);
    const storeId = normalizeDomainSessionDocumentId(session?.sId);
    return tenantId && storeId ? { tenantId, storeId } : null;
}

async function checkDomainManagementRateLimit(session: any, storeId: string) {
    const config = getRateLimitForFeature('DOMAIN_MANAGEMENT');
    const userId = session?.uId || session?.user?.id || session?.userId || 'unknown';
    const userRateLimitHash = hashPublicRateLimitValue(userId || session.user?.id || 'unknown');
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const result = await checkRateLimit({
        failClosedOnProviderError: true,
        key: `domain-management:${userRateLimitHash}:${storeRateLimitHash}`,
        ...config,
    });

    if (result.allowed) return null;

    const providerUnavailable = result.reason === 'provider_unavailable';
    const waitSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        {
            error: providerUnavailable
                ? "Domain service temporarily unavailable. Please try again shortly."
                : "Too many domain requests. Please try again later.",
            retryAfter: waitSeconds,
        },
        {
            status: providerUnavailable ? 503 : 429,
            headers: {
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(config.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(result.resetAt),
            },
        },
    );
}

async function checkDomainAvailabilityRateLimit(session: any, storeId: string) {
    const config = getRateLimitForFeature('DATA_READ');
    const userId = session?.uId || session?.user?.id || session?.userId || 'unknown';
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const result = await checkRateLimit({
        failClosedOnProviderError: true,
        key: `domain-availability:${userRateLimitHash}:${storeRateLimitHash}`,
        ...config,
    });

    if (result.allowed) return null;

    const providerUnavailable = result.reason === 'provider_unavailable';
    const waitSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        {
            available: false,
            reason: providerUnavailable
                ? "Domain availability is temporarily unavailable. Please try again shortly."
                : "Too many requests. Please try again later.",
            retryAfter: waitSeconds,
        },
        {
            status: providerUnavailable ? 503 : 429,
            headers: { 'Retry-After': String(waitSeconds) },
        },
    );
}

type DomainScope = { tenantId: string; storeId: string };

type AuthorizedDomainState = {
    permissionError: NextResponse | null;
    storeData: Record<string, any> | null;
};

async function readAuthorizedDomainStateInTransaction(params: {
    db: FirebaseFirestore.Firestore;
    request: NextRequest;
    scope: DomainScope;
    session: any;
    transaction: FirebaseFirestore.Transaction;
}): Promise<AuthorizedDomainState> {
    const tenantRef = params.db.collection(DB_COLLECTIONS.TENANTS).doc(params.scope.tenantId);
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(params.scope.storeId);
    const [tenantSnapshot, storeSnapshot] = await Promise.all([
        params.transaction.get(tenantRef),
        params.transaction.get(storeRef),
    ]);
    const tenantData = tenantSnapshot.data();
    const storeData = storeSnapshot.data();
    const storedStoreScope = normalizeStorePermissionScopeDocumentId(storeData?.storeId ?? storeData?.sId);
    const storedTenantScope = normalizeStorePermissionScopeDocumentId(storeData?.tenantId ?? storeData?.tId);
    const tenantIdentityValue = tenantData?.tenantId ?? tenantData?.tId;
    const tenantIdentityScope = tenantIdentityValue === undefined || tenantIdentityValue === null
        ? { documentId: params.scope.tenantId }
        : normalizeStorePermissionScopeDocumentId(tenantIdentityValue);
    const storeIdentityAliasesMatch = normalizeMenuListPublicEntityIdentityAliases([
        storeData?.storeId,
        storeData?.sId,
    ])?.documentId === params.scope.storeId;
    const storeTenantAliasesMatch = normalizeMenuListPublicEntityIdentityAliases([
        storeData?.tenantId,
        storeData?.tId,
    ])?.documentId === params.scope.tenantId;
    const tenantIdentityValues = [tenantData?.tenantId, tenantData?.tId]
        .filter((value) => value !== undefined && value !== null);
    const tenantIdentityAliasesMatch = tenantIdentityValues.length === 0
        || normalizeMenuListPublicEntityIdentityAliases(tenantIdentityValues)?.documentId === params.scope.tenantId;
    if (
        !tenantSnapshot.exists
        || !storeSnapshot.exists
        || !isMenuListPublicEntityEligible(tenantData)
        || !isMenuListPublicEntityEligible(storeData)
        || storedStoreScope?.documentId !== params.scope.storeId
        || storedTenantScope?.documentId !== params.scope.tenantId
        || tenantIdentityScope?.documentId !== params.scope.tenantId
        || !storeIdentityAliasesMatch
        || !storeTenantAliasesMatch
        || !tenantIdentityAliasesMatch
    ) {
        return {
            permissionError: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
            storeData: null,
        };
    }

    const permissionError = requireAnyStorePermissionForStoreData(
        params.request,
        params.session,
        storeData,
        [PERMISSIONS.MANAGE_PUBLIC_PRESENCE],
        "Custom domain",
        params.scope.storeId,
        params.scope.tenantId,
    );
    return { permissionError, storeData: permissionError ? null : storeData };
}

function claimMatchesReservation(
    claim: FirebaseFirestore.DocumentData | undefined,
    reservation: CustomDomainReservation,
    status: 'reserved' | 'releasing',
): boolean {
    return String(claim?.storeId || '') === reservation.storeId
        && String(claim?.customDomain || '') === reservation.domain
        && String(claim?.reservationId || '') === String(reservation.reservationId || '')
        && claim?.status === status;
}

async function settlePendingDomainReservation(
    db: FirebaseFirestore.Firestore,
    reservation: CustomDomainReservation,
    expectedStatus: 'reserved' | 'releasing',
): Promise<void> {
    await db.runTransaction(async (transaction) => {
        const claimSnapshot = await transaction.get(reservation.claimRef);
        const claim = claimSnapshot.data();
        if (!claimSnapshot.exists || !claimMatchesReservation(claim, reservation, expectedStatus)) return;
        const now = admin.firestore.Timestamp.now();
        if (reservation.claimOwner === reservation.storeId && reservation.claimStatus === 'current') {
            writeCurrentCustomDomainClaim(transaction, reservation, now);
        } else {
            writeReleasedCustomDomainClaim(transaction, reservation, now);
        }
    });
}

async function markPendingDomainReservationReleasing(
    db: FirebaseFirestore.Firestore,
    reservation: CustomDomainReservation,
): Promise<boolean> {
    return db.runTransaction(async (transaction) => {
        const claimSnapshot = await transaction.get(reservation.claimRef);
        if (!claimSnapshot.exists || !claimMatchesReservation(claimSnapshot.data(), reservation, 'reserved')) {
            return false;
        }
        const now = admin.firestore.Timestamp.now();
        writeReleasingCustomDomainClaim(
            transaction,
            reservation,
            now,
            admin.firestore.Timestamp.fromMillis(now.toMillis() + CUSTOM_DOMAIN_RESERVATION_TTL_MS),
        );
        return true;
    });
}

async function releaseReleasingDomainClaim(
    db: FirebaseFirestore.Firestore,
    reservation: CustomDomainReservation,
): Promise<boolean> {
    return db.runTransaction(async (transaction) => {
        const claimSnapshot = await transaction.get(reservation.claimRef);
        if (!claimSnapshot.exists || !claimMatchesReservation(claimSnapshot.data(), reservation, 'releasing')) {
            return false;
        }
        writeReleasedCustomDomainClaim(
            transaction,
            reservation,
            admin.firestore.Timestamp.now(),
        );
        return true;
    });
}

async function removeDomainFromProviderBestEffort(
    domain: string,
    storeId: string,
    tenantId: string,
): Promise<boolean> {
    try {
        const removeResult = await removeDomainFromVercelProject(domain);
        if (!removeResult.ok && removeResult.status !== 404) {
            secureError(
                "[Domain] Vercel remove API error",
                new Error(DOMAIN_REMOVE_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(domain, storeId, tenantId, {
                    removeProviderStatus: removeResult.status,
                }),
            );
            return false;
        }
        return true;
    } catch (error) {
        secureError(
            "[Domain] Error removing domain from Vercel",
            normalizeDomainRouteFailure(error, "Domain remove failed"),
            buildDomainRouteLogContext(domain, storeId, tenantId),
        );
        return false;
    }
}

async function compensatePendingDomainReservation(params: {
    db: FirebaseFirestore.Firestore;
    providerAdded: boolean;
    reservation: CustomDomainReservation;
    storeId: string;
    tenantId: string;
}): Promise<void> {
    const restoresExistingCurrentClaim = params.reservation.claimOwner === params.reservation.storeId
        && params.reservation.claimStatus === 'current';
    if (!params.providerAdded || restoresExistingCurrentClaim) {
        await settlePendingDomainReservation(params.db, params.reservation, 'reserved');
        return;
    }
    const markedReleasing = await markPendingDomainReservationReleasing(params.db, params.reservation);
    if (!markedReleasing) return;
    const removed = await removeDomainFromProviderBestEffort(
        params.reservation.domain,
        params.storeId,
        params.tenantId,
    );
    if (removed) {
        await settlePendingDomainReservation(params.db, params.reservation, 'releasing');
    }
}

/**
 * POST /api/domain — Add custom domain to Vercel project + store in Firestore
 */
export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = getDomainSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    const { tenantId, storeId } = scope;

    const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(request, DOMAIN_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid domain",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const body = bodyResult.data;
    const validation = AddDomainSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Invalid domain", details: getSafeZodValidationDetails(validation.error) },
            { status: 400 }
        );
    }

    const { domain } = validation.data;
    const normalizedDomain = domain.toLowerCase().trim();
    if (!normalizeCustomDomainClaimCandidate(normalizedDomain)) {
        return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }
    if (isReservedCustomDomainClaimCandidate(normalizedDomain)) {
        return NextResponse.json(
            { error: "This domain is reserved for MenuList services" },
            { status: 409 },
        );
    }
    if (isAnswerlatticeHostedHelpCandidateHostname(normalizedDomain)) {
        return NextResponse.json(
            { error: "Support-style domains are reserved for Answerlattice hosted help" },
            { status: 409 },
        );
    }

    const db = admin.firestore();
    const reservationId = randomUUID();
    let reservation: CustomDomainReservation | null = null;
    let providerAdded = false;
    let finalized = false;
    try {
        const reservationNow = admin.firestore.Timestamp.now();
        const reservationResult = await db.runTransaction(async (transaction) => {
            const authorizedState = await readAuthorizedDomainStateInTransaction({
                db,
                request,
                scope,
                session,
                transaction,
            });
            if (authorizedState.permissionError) {
                return {
                    permissionError: authorizedState.permissionError,
                    reservation: null,
                    storeAlreadyUsesDomain: false,
                };
            }
            const currentReservation = await readCustomDomainReservationInTransaction({
                db,
                domain: normalizedDomain,
                nowMillis: reservationNow.toMillis(),
                reservationId,
                storeId,
                tenantId,
                transaction,
            });
            writeReservedCustomDomainClaim(
                transaction,
                currentReservation,
                reservationNow,
                admin.firestore.Timestamp.fromMillis(
                    reservationNow.toMillis() + CUSTOM_DOMAIN_RESERVATION_TTL_MS,
                ),
            );
            return {
                permissionError: null,
                reservation: currentReservation,
                storeAlreadyUsesDomain: normalizeCustomDomainClaimCandidate(
                    authorizedState.storeData?.customDomain,
                ) === normalizedDomain,
            };
        });
        if (reservationResult.permissionError) return reservationResult.permissionError;
        reservation = reservationResult.reservation;
        if (!reservation) throw new Error('custom_domain_reservation_missing');

        const result = await addDomainToVercelProject(normalizedDomain);
        if (!result.ok && result.status !== 409) {
            await settlePendingDomainReservation(db, reservation, 'reserved');
            secureError(
                "[Domain] Vercel API error",
                new Error(DOMAIN_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(normalizedDomain, storeId, tenantId, {
                    providerStatus: result.status,
                }),
            );
            return NextResponse.json(
                { error: DOMAIN_PROVIDER_FAILURE_MESSAGE },
                { status: result.status >= 400 && result.status <= 599 ? result.status : 502 }
            );
        }
        providerAdded = result.ok;
        let projectDomainData = result.ok ? result.data : null;
        if (!result.ok) {
            const providerConflictHasMenuListProvenance = reservationResult.storeAlreadyUsesDomain
                || Boolean(reservation.claimStatus);
            if (!providerConflictHasMenuListProvenance) {
                await settlePendingDomainReservation(db, reservation, 'reserved');
                return NextResponse.json(
                    { error: "This domain is already connected and needs support review" },
                    { status: 409 },
                );
            }
            const existingProjectDomain = await getVercelProjectDomain(normalizedDomain);
            if (!existingProjectDomain.ok) {
                await settlePendingDomainReservation(db, reservation, 'reserved');
                secureError(
                    "[Domain] Vercel domain conflict is outside the configured project",
                    new Error(DOMAIN_PROVIDER_FAILURE_MESSAGE),
                    buildDomainRouteLogContext(normalizedDomain, storeId, tenantId, {
                        providerStatus: result.status,
                        projectDomainStatus: existingProjectDomain.status,
                    }),
                );
                return NextResponse.json(
                    { error: "This domain is already connected to another Vercel project" },
                    { status: 409 },
                );
            }
            projectDomainData = existingProjectDomain.data;
        }

        const configResult = await getVercelDomainConfig(normalizedDomain);
        if (!configResult.ok) {
            secureError(
                "[Domain] Vercel status API error after add",
                new Error(DOMAIN_STATUS_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(normalizedDomain, storeId, tenantId, {
                    statusProviderStatus: configResult.status,
                }),
            );
        }
        const providerConfigured = configResult.ok && isVercelDomainConfigured(configResult.data);
        const providerMisconfigured = configResult.ok
            && isVercelDomainExplicitlyMisconfigured(configResult.data);
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);
        const finalizedAt = admin.firestore.Timestamp.now();
        const finalizeResult = await db.runTransaction(async (transaction) => {
            const authorizedState = await readAuthorizedDomainStateInTransaction({
                db,
                request,
                scope,
                session,
                transaction,
            });
            if (authorizedState.permissionError || !authorizedState.storeData) {
                return {
                    domainVerified: false,
                    legacyCleanupSkipped: false,
                    oldReservation: null,
                    permissionError: authorizedState.permissionError
                        || NextResponse.json({ error: "Forbidden" }, { status: 403 }),
                    verifiedAt: null,
                };
            }
            const currentReservation = await readCustomDomainReservationInTransaction({
                db,
                domain: normalizedDomain,
                nowMillis: finalizedAt.toMillis(),
                reservationId,
                storeId,
                tenantId,
                transaction,
            });
            const rawOldDomain = authorizedState.storeData.customDomain;
            const oldDomain = normalizeCustomDomainClaimCandidate(rawOldDomain);
            const legacyCleanupSkipped = Boolean(rawOldDomain) && !oldDomain;
            let oldReservation: CustomDomainReservation | null = null;
            if (oldDomain && oldDomain !== normalizedDomain) {
                const oldClaimRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                    .doc(getCustomDomainClaimDocumentId(oldDomain));
                const oldDomainQuery = db.collection(DB_COLLECTIONS.STORES)
                    .where('customDomain', '==', oldDomain)
                    .limit(2);
                const [oldClaimSnapshot, oldDomainSnapshot] = await Promise.all([
                    transaction.get(oldClaimRef),
                    transaction.get(oldDomainQuery),
                ]);
                const oldClaim = oldClaimSnapshot.data();
                const oldClaimOwner = oldClaimSnapshot.exists ? String(oldClaim?.storeId || '') : null;
                const oldClaimStatus = oldClaimSnapshot.exists ? String(oldClaim?.status || '') : null;
                const hasOtherStore = oldDomainSnapshot.docs.some((snapshot) => snapshot.id !== storeId);
                const claimStateIsReplaceable = !oldClaimSnapshot.exists
                    || oldClaimStatus === 'current'
                    || oldClaimStatus === 'released';
                if (hasOtherStore || oldClaimOwner && oldClaimOwner !== storeId || !claimStateIsReplaceable) {
                    throw new CustomDomainLegacyConflictError();
                }
                oldReservation = {
                    claimOwner: oldClaimOwner,
                    claimRef: oldClaimRef,
                    claimStatus: oldClaimStatus,
                    domain: oldDomain,
                    reservationId: typeof oldClaim?.reservationId === 'string'
                        ? oldClaim.reservationId
                        : null,
                    storeId,
                    tenantId,
                };
                writeReleasingCustomDomainClaim(
                    transaction,
                    oldReservation,
                    finalizedAt,
                    admin.firestore.Timestamp.fromMillis(
                        finalizedAt.toMillis() + CUSTOM_DOMAIN_RESERVATION_TTL_MS,
                    ),
                );
            }

            const sameDomain = oldDomain === normalizedDomain;
            const domainVerified = sameDomain
                && (
                    providerConfigured
                    || (!providerMisconfigured && authorizedState.storeData.domainVerified === true)
                );
            const existingVerifiedAt = sameDomain
                ? authorizedState.storeData.domainVerifiedAt
                : null;
            transaction.update(storeRef, {
                customDomain: normalizedDomain,
                domainVerified,
                domainAddedAt: finalizedAt,
                domainVerifiedAt: domainVerified
                    ? existingVerifiedAt || finalizedAt
                    : admin.firestore.FieldValue.delete(),
                modifiedOn: finalizedAt,
            });
            writeCurrentCustomDomainClaim(transaction, currentReservation, finalizedAt);
            return {
                domainVerified,
                legacyCleanupSkipped,
                oldReservation,
                permissionError: null,
                verifiedAt: domainVerified ? existingVerifiedAt || finalizedAt : null,
            };
        });
        if (finalizeResult.permissionError) {
            await compensatePendingDomainReservation({
                db,
                providerAdded,
                reservation,
                storeId,
                tenantId,
            });
            return finalizeResult.permissionError;
        }
        finalized = true;

        let claimReleasePending = false;
        let providerCleanupPending = finalizeResult.legacyCleanupSkipped;
        if (finalizeResult.oldReservation) {
            const oldProviderRemoved = await removeDomainFromProviderBestEffort(
                finalizeResult.oldReservation.domain,
                storeId,
                tenantId,
            );
            if (oldProviderRemoved) {
                try {
                    claimReleasePending = !(await releaseReleasingDomainClaim(
                        db,
                        finalizeResult.oldReservation,
                    ));
                } catch (error) {
                    claimReleasePending = true;
                    secureError(
                        "[Domain] Prior claim release failed after replacement",
                        normalizeDomainRouteFailure(error, "Prior domain claim release failed"),
                        buildDomainRouteLogContext(
                            finalizeResult.oldReservation.domain,
                            storeId,
                            tenantId,
                        ),
                    );
                }
            } else {
                providerCleanupPending = true;
            }
        }

        let refreshPending = false;
        try {
            await revalidateMenuCache(storeId, { tId: tenantId });
        } catch (error) {
            refreshPending = true;
            secureError(
                "[Domain] Cache invalidation failed after add",
                normalizeDomainRouteFailure(error, "Domain add cache invalidation failed"),
                buildDomainRouteLogContext(normalizedDomain, storeId, tenantId),
            );
        }

        return NextResponse.json({
            claimReleasePending,
            success: true,
            domain: normalizedDomain,
            legacyCleanupSkipped: finalizeResult.legacyCleanupSkipped,
            providerCleanupPending,
            refreshPending,
            verified: finalizeResult.domainVerified,
            verifiedAt: finalizeResult.verifiedAt,
            verification: configResult.ok ? configResult.data : null,
            message: "Domain added. Configure your DNS records to complete setup.",
            projectDomain: projectDomainData,
        });
    } catch (error) {
        if (reservation && !finalized) {
            try {
                await compensatePendingDomainReservation({
                    db,
                    providerAdded,
                    reservation,
                    storeId,
                    tenantId,
                });
            } catch (cleanupError) {
                secureError(
                    "[Domain] Reservation cleanup failed",
                    normalizeDomainRouteFailure(cleanupError, "Domain reservation cleanup failed"),
                    buildDomainRouteLogContext(normalizedDomain, storeId, tenantId),
                );
            }
        }
        if (isCustomDomainUnavailableError(error)) {
            return NextResponse.json(
                { error: "This domain is already linked to another store" },
                { status: 409 },
            );
        }
        if (error instanceof CustomDomainLegacyConflictError) {
            return NextResponse.json(
                { error: "The existing custom-domain mapping needs support review before it can be changed" },
                { status: 409 },
            );
        }
        secureError(
            "[Domain] Error adding domain",
            normalizeDomainRouteFailure(error, "Domain add failed"),
            buildDomainRouteLogContext(normalizedDomain, storeId, tenantId),
        );
        return NextResponse.json(
            { error: "Failed to add domain. Please try again." },
            { status: 500 }
        );
    }
});

/**
 * GET /api/domain — Check domain verification status
 */
export const GET = withAuth(async (request: NextRequest, session) => {
    const scope = getDomainSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    const { tenantId, storeId } = scope;

    const candidateParam = request.nextUrl.searchParams.get('candidate');
    if (candidateParam !== null) {
        const rateLimitResponse = await checkDomainAvailabilityRateLimit(session, storeId);
        if (rateLimitResponse) return rateLimitResponse;

        const candidate = normalizeCustomDomainClaimCandidate(candidateParam);
        if (!candidate) {
            return NextResponse.json({
                available: false,
                normalized: candidateParam.toLowerCase().trim().slice(0, 253),
                reason: "Invalid domain format. Example: yourbusiness.com",
            });
        }
        if (isReservedCustomDomainClaimCandidate(candidate)) {
            return NextResponse.json({
                available: false,
                normalized: candidate,
                reason: "This domain is reserved for MenuList services",
            });
        }
        if (isAnswerlatticeHostedHelpCandidateHostname(candidate)) {
            return NextResponse.json({
                available: false,
                normalized: candidate,
                reason: "Support-style domains are reserved for Answerlattice hosted help",
            });
        }

        const db = admin.firestore();
        try {
            const availability = await db.runTransaction(async (transaction) => {
                const authorizedState = await readAuthorizedDomainStateInTransaction({
                    db,
                    request,
                    scope,
                    session,
                    transaction,
                });
                if (authorizedState.permissionError) {
                    return { permissionError: authorizedState.permissionError };
                }
                await readCustomDomainReservationInTransaction({
                    db,
                    domain: candidate,
                    nowMillis: Date.now(),
                    storeId,
                    tenantId,
                    transaction,
                });
                return { permissionError: null };
            });
            if (availability.permissionError) return availability.permissionError;
            return NextResponse.json({ available: true, normalized: candidate });
        } catch (error) {
            if (isCustomDomainUnavailableError(error)) {
                return NextResponse.json({
                    available: false,
                    normalized: candidate,
                    reason: "This domain is already linked to another store",
                });
            }
            secureError(
                "[Domain] Error checking domain availability",
                normalizeDomainRouteFailure(error, "Domain availability check failed"),
                buildDomainRouteLogContext(candidate, storeId, tenantId),
            );
            return NextResponse.json(
                { available: false, reason: "Could not check domain right now." },
                { status: 500 },
            );
        }
    }

    const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);
    if (rateLimitResponse) return rateLimitResponse;

    const db = admin.firestore();
    let initialState: {
        domain: string | null;
        domainVerified: boolean;
        domainVerifiedAt: unknown;
        permissionError: NextResponse | null;
    };
    try {
        const claimNow = admin.firestore.Timestamp.now();
        initialState = await db.runTransaction(async (transaction) => {
            const authorizedState = await readAuthorizedDomainStateInTransaction({
                db,
                request,
                scope,
                session,
                transaction,
            });
            if (authorizedState.permissionError || !authorizedState.storeData) {
                return {
                    domain: null,
                    domainVerified: false,
                    domainVerifiedAt: null,
                    permissionError: authorizedState.permissionError
                        || NextResponse.json({ error: "Forbidden" }, { status: 403 }),
                };
            }
            const rawDomain = authorizedState.storeData.customDomain;
            if (!rawDomain) {
                return {
                    domain: null,
                    domainVerified: false,
                    domainVerifiedAt: null,
                    permissionError: null,
                };
            }
            const domain = normalizeCustomDomainClaimCandidate(rawDomain);
            if (!domain) {
                return {
                    domain: null,
                    domainVerified: false,
                    domainVerifiedAt: null,
                    permissionError: NextResponse.json(
                        { error: "Stored domain is invalid" },
                        { status: 409 },
                    ),
                };
            }
            const reservation = await readCustomDomainReservationInTransaction({
                db,
                domain,
                nowMillis: claimNow.toMillis(),
                storeId,
                tenantId,
                transaction,
            });
            if (reservation.claimOwner !== storeId || reservation.claimStatus !== 'current') {
                writeCurrentCustomDomainClaim(transaction, reservation, claimNow);
            }
            return {
                domain,
                domainVerified: authorizedState.storeData.domainVerified === true,
                domainVerifiedAt: authorizedState.storeData.domainVerifiedAt || null,
                permissionError: null,
            };
        });
    } catch (error) {
        if (isCustomDomainUnavailableError(error)) {
            return NextResponse.json(
                { error: "This domain is linked to more than one store" },
                { status: 409 },
            );
        }
        secureError(
            "[Domain] Error reading domain status",
            normalizeDomainRouteFailure(error, "Domain status read failed"),
            buildDomainRouteLogContext('', storeId, tenantId),
        );
        return NextResponse.json({ error: "Failed to read domain status" }, { status: 500 });
    }
    if (initialState.permissionError) return initialState.permissionError;
    if (!initialState.domain) {
        return NextResponse.json({ hasDomain: false });
    }
    const domain = initialState.domain;

    try {
        const [configOutcome, projectDomainOutcome] = await Promise.allSettled([
            getVercelDomainConfig(domain),
            getVercelProjectDomain(domain),
        ]);
        const configResult = configOutcome.status === 'fulfilled' ? configOutcome.value : null;
        const projectDomainResult = projectDomainOutcome.status === 'fulfilled'
            ? projectDomainOutcome.value
            : null;
        if (!configResult?.ok) {
            secureError(
                "[Domain] Vercel status API error",
                new Error(DOMAIN_STATUS_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(domain, storeId, tenantId, {
                    statusProviderStatus: configResult?.status,
                    statusProviderThrown: configOutcome.status === 'rejected',
                }),
            );
        }
        if (!projectDomainResult?.ok && projectDomainResult?.status !== 404) {
            secureError(
                "[Domain] Vercel project-domain lookup error",
                new Error(DOMAIN_STATUS_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(domain, storeId, tenantId, {
                    projectDomainProviderStatus: projectDomainResult?.status,
                    projectDomainProviderThrown: projectDomainOutcome.status === 'rejected',
                }),
            );
        }

        const isConfigured = Boolean(configResult?.ok)
            && isVercelDomainConfigured(configResult?.data);
        const isExplicitlyMisconfigured = Boolean(configResult?.ok)
            && isVercelDomainExplicitlyMisconfigured(configResult?.data);
        const providerConfirmsProjectAssignment = projectDomainResult?.ok === true;
        const providerConfirmsProjectAbsence = projectDomainResult?.status === 404;
        const providerStatusPending = !(isConfigured && providerConfirmsProjectAssignment)
            && !isExplicitlyMisconfigured
            && !providerConfirmsProjectAbsence;
        const nextVerified = isConfigured && providerConfirmsProjectAssignment
            ? true
            : isExplicitlyMisconfigured || providerConfirmsProjectAbsence
                ? false
                : initialState.domainVerified;
        let verifiedAt = initialState.domainVerifiedAt;
        let refreshPending = false;

        if (nextVerified !== initialState.domainVerified) {
            const verificationCheckedAt = admin.firestore.Timestamp.now();
            const verificationResult = await db.runTransaction(async (transaction) => {
                const authorizedState = await readAuthorizedDomainStateInTransaction({
                    db,
                    request,
                    scope,
                    session,
                    transaction,
                });
                if (authorizedState.permissionError || !authorizedState.storeData) {
                    return {
                        permissionError: authorizedState.permissionError
                            || NextResponse.json({ error: "Forbidden" }, { status: 403 }),
                        stale: false,
                    };
                }
                if (normalizeCustomDomainClaimCandidate(authorizedState.storeData.customDomain) !== domain) {
                    return { permissionError: null, stale: true };
                }
                const reservation = await readCustomDomainReservationInTransaction({
                    db,
                    domain,
                    nowMillis: verificationCheckedAt.toMillis(),
                    storeId,
                    tenantId,
                    transaction,
                });
                transaction.update(db.collection(DB_COLLECTIONS.STORES).doc(storeId), {
                    domainVerified: nextVerified,
                    domainVerifiedAt: nextVerified
                        ? verificationCheckedAt
                        : admin.firestore.FieldValue.delete(),
                    modifiedOn: verificationCheckedAt,
                });
                if (reservation.claimOwner !== storeId || reservation.claimStatus !== 'current') {
                    writeCurrentCustomDomainClaim(transaction, reservation, verificationCheckedAt);
                }
                return { permissionError: null, stale: false };
            });
            if (verificationResult.permissionError) return verificationResult.permissionError;
            if (verificationResult.stale) {
                return NextResponse.json(
                    { error: "Domain changed. Refresh and try again." },
                    { status: 409 },
                );
            }
            verifiedAt = nextVerified ? verificationCheckedAt : null;
            try {
                await revalidateMenuCache(storeId, { tId: tenantId });
            } catch (error) {
                refreshPending = true;
                secureError(
                    "[Domain] Cache invalidation failed after verification update",
                    normalizeDomainRouteFailure(error, "Domain verification cache invalidation failed"),
                    buildDomainRouteLogContext(domain, storeId, tenantId, { verified: nextVerified }),
                );
            }
        }

        return NextResponse.json({
            hasDomain: true,
            domain,
            providerStatusPending,
            refreshPending,
            verified: nextVerified,
            verifiedAt,
            config: configResult?.ok ? configResult.data : null,
            projectDomain: projectDomainResult?.ok ? projectDomainResult.data : null,
        }, { status: providerStatusPending ? 502 : 200 });
    } catch (error) {
        if (isCustomDomainUnavailableError(error)) {
            return NextResponse.json(
                { error: "Domain state changed. Refresh and try again." },
                { status: 409 },
            );
        }
        secureError(
            "[Domain] Error checking domain status",
            normalizeDomainRouteFailure(error, "Domain status check failed"),
            buildDomainRouteLogContext(domain, storeId, tenantId),
        );
        return NextResponse.json(
            { error: "Could not update domain status" },
            { status: 500 },
        );
    }
});

/**
 * DELETE /api/domain — Remove custom domain from Vercel + Firestore
 */
export const DELETE = withAuth(async (request: NextRequest, session) => {
    const scope = getDomainSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    const { tenantId, storeId } = scope;

    const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);
    if (rateLimitResponse) return rateLimitResponse;

    const db = admin.firestore();
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);
    let removalState: {
        domain: string | null;
        legacyCleanupSkipped: boolean;
        permissionError: NextResponse | null;
        reservation: CustomDomainReservation | null;
        shouldRemoveProvider: boolean;
    };
    try {
        const removalStartedAt = admin.firestore.Timestamp.now();
        removalState = await db.runTransaction(async (transaction) => {
            const authorizedState = await readAuthorizedDomainStateInTransaction({
                db,
                request,
                scope,
                session,
                transaction,
            });
            if (authorizedState.permissionError || !authorizedState.storeData) {
                return {
                    domain: null,
                    legacyCleanupSkipped: false,
                    permissionError: authorizedState.permissionError
                        || NextResponse.json({ error: "Forbidden" }, { status: 403 }),
                    reservation: null,
                    shouldRemoveProvider: false,
                };
            }
            const rawDomain = authorizedState.storeData.customDomain;
            if (!rawDomain) {
                return {
                    domain: null,
                    legacyCleanupSkipped: false,
                    permissionError: null,
                    reservation: null,
                    shouldRemoveProvider: false,
                };
            }
            const domain = normalizeCustomDomainClaimCandidate(rawDomain);
            const domainForResult = domain || String(rawDomain);
            const legacyCleanupSkipped = !domain;
            let reservation: CustomDomainReservation | null = null;
            let shouldRemoveProvider = false;
            if (domain) {
                const claimRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                    .doc(getCustomDomainClaimDocumentId(domain));
                const duplicateQuery = db.collection(DB_COLLECTIONS.STORES)
                    .where('customDomain', '==', domain)
                    .limit(2);
                const [claimSnapshot, duplicateSnapshot] = await Promise.all([
                    transaction.get(claimRef),
                    transaction.get(duplicateQuery),
                ]);
                const claimOwner = claimSnapshot.exists
                    ? String(claimSnapshot.data()?.storeId || '')
                    : null;
                const claimStatus = claimSnapshot.exists
                    ? String(claimSnapshot.data()?.status || '')
                    : null;
                const hasOtherStore = duplicateSnapshot.docs.some((snapshot) => snapshot.id !== storeId);
                const claimStateIsRemovable = !claimSnapshot.exists
                    || claimStatus === 'current'
                    || claimStatus === 'released';
                if (hasOtherStore || claimOwner && claimOwner !== storeId || !claimStateIsRemovable) {
                    throw new CustomDomainLegacyConflictError();
                }
                reservation = {
                    claimOwner,
                    claimRef,
                    claimStatus,
                    domain,
                    reservationId: typeof claimSnapshot.data()?.reservationId === 'string'
                        ? claimSnapshot.data()?.reservationId
                        : null,
                    storeId,
                    tenantId,
                };
                writeReleasingCustomDomainClaim(
                    transaction,
                    reservation,
                    removalStartedAt,
                    admin.firestore.Timestamp.fromMillis(
                        removalStartedAt.toMillis() + CUSTOM_DOMAIN_RESERVATION_TTL_MS,
                    ),
                );
                shouldRemoveProvider = true;
            }
            transaction.update(storeRef, {
                customDomain: admin.firestore.FieldValue.delete(),
                domainVerified: admin.firestore.FieldValue.delete(),
                domainAddedAt: admin.firestore.FieldValue.delete(),
                domainVerifiedAt: admin.firestore.FieldValue.delete(),
                modifiedOn: removalStartedAt,
            });
            return {
                domain: domainForResult,
                legacyCleanupSkipped,
                permissionError: null,
                reservation,
                shouldRemoveProvider,
            };
        });
    } catch (error) {
        if (error instanceof CustomDomainLegacyConflictError) {
            return NextResponse.json(
                { error: "This custom-domain mapping needs support review before it can be removed" },
                { status: 409 },
            );
        }
        secureError(
            "[Domain] Error preparing domain removal",
            normalizeDomainRouteFailure(error, "Domain removal preparation failed"),
            buildDomainRouteLogContext('', storeId, tenantId),
        );
        return NextResponse.json({ error: "Failed to remove domain" }, { status: 500 });
    }
    if (removalState.permissionError) return removalState.permissionError;
    if (!removalState.domain) {
        return NextResponse.json({ error: "No custom domain to remove" }, { status: 404 });
    }

    let cacheError: unknown = null;
    try {
        await revalidateMenuCache(storeId, { tId: tenantId });
    } catch (error) {
        cacheError = error;
        secureError(
            "[Domain] Cache invalidation failed after removal",
            normalizeDomainRouteFailure(error, "Domain removal cache invalidation failed"),
            buildDomainRouteLogContext(removalState.domain, storeId, tenantId),
        );
    }

    const providerRemoved = removalState.shouldRemoveProvider
        ? await removeDomainFromProviderBestEffort(removalState.domain, storeId, tenantId)
        : false;
    let claimReleasePending = false;

    if (removalState.reservation && providerRemoved) {
        const removalReservation = removalState.reservation;
        try {
            claimReleasePending = !(await releaseReleasingDomainClaim(db, removalReservation));
        } catch (error) {
            claimReleasePending = true;
            secureError(
                "[Domain] Claim release failed after removal",
                normalizeDomainRouteFailure(error, "Domain claim release failed"),
                buildDomainRouteLogContext(removalState.domain, storeId, tenantId),
            );
        }
    }

    return NextResponse.json({
        claimReleasePending,
        legacyCleanupSkipped: removalState.legacyCleanupSkipped,
        removed: true,
        providerCleanupPending: removalState.legacyCleanupSkipped
            || removalState.shouldRemoveProvider && !providerRemoved,
        refreshPending: Boolean(cacheError),
        success: true,
        message: "Custom domain removed",
    });
});
