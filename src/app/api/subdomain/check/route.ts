export const dynamic = 'force-dynamic';
/**
 * GET /api/subdomain/check?subdomain=joes-pizza
 * 
 * Checks if a subdomain is available for use.
 * Returns: { available: boolean, reason?: string }
 * 
 * URL Routing Architecture — Phase 2
 * @see __docs__/url-routing-architecture/README.md
 */
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { isReservedSubdomain } from "@constant/reservedSlugs";
import { getMenuUrl } from "@constant/urls";
import { admin } from "@lib/firebase/firebaseAdmin";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import { getOutletSessionScope } from "@lib/multiOutlet/outletSessionScope";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import {
    getSubdomainClaimDocumentId,
    isSubdomainUnavailableError,
    isValidSubdomainClaimCandidate,
    readSubdomainReservationInTransaction,
    writeCurrentSubdomainClaim,
    writeReleasedSubdomainClaim,
} from "@lib/routing/subdomainClaim";
import {
    isSubdomainOwnerScopeError,
    readSubdomainOwnerStoreInTransaction,
} from "@lib/routing/subdomainOwnerScope";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { logSecurityFailure } from "@lib/security/securityDiagnostics";
import { validateAPIInput } from "@lib/security/inputValidation";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { slugify } from "@lib/utils/slugify";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

// Minimum subdomain length
const MIN_SUBDOMAIN_LENGTH = 3;
const MAX_SUBDOMAIN_LENGTH = 63; // DNS label max
const SUBDOMAIN_CHECK_RATE_LIMIT_KEY = "subdomain-check";
const SUBDOMAIN_ASSIGN_RATE_LIMIT_KEY = "subdomain-assign";
const SUBDOMAIN_ASSIGN_MAX_BODY_BYTES = 8 * 1024;
const assignSchema = z.object({ subdomain: z.string().min(1).max(128) }).strict();

const checkSubdomainReadRateLimit = async (session: any) => {
    const rateLimitConfig = getRateLimitForFeature("DATA_READ");
    const userId = session?.uId || session?.user?.id || "unknown";
    const tenantId = session?.tId || session?.user?.tenantId || "unknown";
    const storeId = session?.sId || session?.user?.storeId || "unknown";
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);

    const rateLimit = await checkRateLimit({
        key: `${SUBDOMAIN_CHECK_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        {
            available: false,
            reason: "Too many requests. Please try again later.",
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            headers: {
                "Retry-After": String(waitSeconds),
                "X-RateLimit-Limit": String(rateLimitConfig.limit),
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": String(rateLimit.resetAt),
            },
            status: 429,
        },
    );
};

const checkSubdomainWriteRateLimit = async (session: any) => {
    const rateLimitConfig = getRateLimitForFeature("DATA_WRITE");
    const userHash = hashPublicRateLimitValue(session?.uId || session?.user?.id || "unknown");
    const storeHash = hashPublicRateLimitValue(session?.sId || session?.user?.storeId || "unknown");
    const rateLimit = await checkRateLimit({
        key: `${SUBDOMAIN_ASSIGN_RATE_LIMIT_KEY}:${userHash}:${storeHash}`,
        ...rateLimitConfig,
    });
    if (rateLimit.allowed) return null;
    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfter: waitSeconds },
        { headers: { "Retry-After": String(waitSeconds) }, status: 429 },
    );
};

function normalizeSubdomainInput(value: string): string {
    return slugify(value).toLowerCase();
}

export const GET = withAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await checkSubdomainReadRateLimit(session);
    if (rateLimitResponse) return rateLimitResponse;

    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE], "Subdomain");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const rawSubdomain = searchParams.get('subdomain');

    if (!rawSubdomain) {
        return NextResponse.json(
            { available: false, reason: 'Subdomain is required' },
            { status: 400 }
        );
    }

    // Normalize: slugify the input
    const subdomain = normalizeSubdomainInput(rawSubdomain);

    // Validate format
    if (!subdomain || subdomain.length < MIN_SUBDOMAIN_LENGTH) {
        return NextResponse.json({
            available: false,
            reason: `Subdomain must be at least ${MIN_SUBDOMAIN_LENGTH} characters`,
            normalized: subdomain,
        });
    }

    if (subdomain.length > MAX_SUBDOMAIN_LENGTH) {
        return NextResponse.json({
            available: false,
            reason: `Subdomain must be at most ${MAX_SUBDOMAIN_LENGTH} characters`,
            normalized: subdomain,
        });
    }

    // Check reserved list
    if (isReservedSubdomain(subdomain)) {
        return NextResponse.json({
            available: false,
            reason: 'This name is reserved',
            normalized: subdomain,
        });
    }

    const scope = getOutletSessionScope(session);
    if (!scope) return NextResponse.json({ available: false, reason: "Account is not ready" }, { status: 400 });

    // This is advisory only. The POST assignment repeats the same reads inside
    // the write transaction and owns the durable claim decision.
    const db = admin.firestore();
    try {
        await db.runTransaction(async (transaction) => {
            await readSubdomainOwnerStoreInTransaction({
                db,
                storeId: scope.storeDocumentId,
                tenantId: scope.tenantDocumentId,
                transaction,
            });
            await readSubdomainReservationInTransaction({
                db,
                nowMillis: Date.now(),
                storeId: scope.storeDocumentId,
                subdomain,
                tenantId: scope.tenantDocumentId,
                transaction,
            });
        });
    } catch (error) {
        if (isSubdomainOwnerScopeError(error)) {
            return NextResponse.json({
                available: false,
                reason: error.reason === 'MASTER_REQUIRED'
                    ? 'Public link is managed from the main location'
                    : 'Store access is no longer available',
                normalized: subdomain,
            }, { status: 403 });
        }
        if (!isSubdomainUnavailableError(error)) throw error;
        return NextResponse.json({
            available: false,
            reason: 'This subdomain is already taken',
            normalized: subdomain,
        });
    }

    return NextResponse.json({
        available: true,
        normalized: subdomain,
        preview: getMenuUrl(subdomain).replace(/^https?:\/\//, ''),
    });
});

export const POST = withAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await checkSubdomainWriteRateLimit(session);
    if (rateLimitResponse) return rateLimitResponse;

    const permissionError = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.MANAGE_PUBLIC_PRESENCE],
        "Subdomain",
    );
    if (permissionError) return permissionError;

    const scope = getOutletSessionScope(session);
    if (!scope) return NextResponse.json({ error: "Account is not ready" }, { status: 400 });
    const bodyResult = await readBoundedJsonBody(request, SUBDOMAIN_ASSIGN_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid input",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const validation = validateAPIInput(assignSchema, bodyResult.data);
    if (!validation.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const subdomain = normalizeSubdomainInput(validation.data.subdomain);
    if (
        !subdomain
        || subdomain.length < MIN_SUBDOMAIN_LENGTH
        || subdomain.length > MAX_SUBDOMAIN_LENGTH
        || isReservedSubdomain(subdomain)
    ) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = admin.firestore();
    try {
        await db.runTransaction(async (transaction) => {
            const { storeData, storeRef } = await readSubdomainOwnerStoreInTransaction({
                db,
                storeId: scope.storeDocumentId,
                tenantId: scope.tenantDocumentId,
                transaction,
            });

            const currentSubdomain = typeof storeData.subdomain === 'string'
                ? storeData.subdomain.toLowerCase()
                : '';
            if (currentSubdomain !== subdomain && storeData.lastPublishedAt) {
                throw new Error('subdomain_locked_after_publish');
            }

            const now = admin.firestore.Timestamp.now();
            const reservation = await readSubdomainReservationInTransaction({
                db,
                nowMillis: now.toMillis(),
                storeId: scope.storeDocumentId,
                subdomain,
                tenantId: scope.tenantDocumentId,
                transaction,
            });
            const oldClaimRef = currentSubdomain
                && currentSubdomain !== subdomain
                && isValidSubdomainClaimCandidate(currentSubdomain)
                ? db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getSubdomainClaimDocumentId(currentSubdomain))
                : null;
            const oldClaimSnap = oldClaimRef ? await transaction.get(oldClaimRef) : null;

            transaction.update(storeRef, { modifiedOn: now, subdomain });
            transaction.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
                lastUpdated: now,
                stores: {
                    [scope.storeDocumentId]: { modifiedOn: now, subdomain },
                },
            }, { merge: true });
            writeCurrentSubdomainClaim(transaction, reservation, now);
            if (
                oldClaimRef
                && (!oldClaimSnap?.exists || String(oldClaimSnap.data()?.storeId || '') === scope.storeDocumentId)
            ) {
                writeReleasedSubdomainClaim({
                    claimRef: oldClaimRef,
                    now,
                    storeId: scope.storeDocumentId,
                    subdomain: currentSubdomain,
                    tenantId: scope.tenantDocumentId,
                    transaction,
                });
            }
        });

        const postCommit = await runStorePublicTruthPostCommitEffects({
            chunkSize: 1,
            storeIds: [scope.storeDocumentId],
            tenantId: scope.tenantDocumentId,
            deps: {
                invalidateAssistant: (storeId, tenantId) => (
                    invalidateOwnerBusinessAssistantPacketCache({ tId: tenantId, sId: storeId })
                ),
                revalidate: (tag) => revalidateTag(tag),
                touchScreen: (storeId) => touchDigitalScreenContentVersionForStoreServer(storeId, 'subdomainAssign'),
            },
        });
        if (postCommit.effectsPending) {
            logSecurityFailure('subdomain_assign_post_commit_effect_failed', postCommit.firstError, {
                failedEffectCount: postCommit.failedEffectCount,
                route: '/api/subdomain/check',
                storeIdLength: scope.storeDocumentId.length,
                tenantIdLength: scope.tenantDocumentId.length,
            });
        }
        return NextResponse.json({
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
            subdomain,
            success: true,
        });
    } catch (error) {
        if (isSubdomainOwnerScopeError(error)) {
            return NextResponse.json({
                error: error.reason === 'MASTER_REQUIRED'
                    ? 'Public link is managed from the main location'
                    : 'Store access is no longer available',
            }, { status: 403 });
        }
        if (isSubdomainUnavailableError(error)) {
            return NextResponse.json({ error: "This subdomain is already taken" }, { status: 409 });
        }
        if (error instanceof Error && error.message === 'subdomain_locked_after_publish') {
            return NextResponse.json({ error: "This public link is locked after first publish" }, { status: 409 });
        }
        logSecurityFailure('subdomain_assign_failed', error, {
            route: '/api/subdomain/check',
            subdomainLength: subdomain.length,
        });
        return NextResponse.json({ error: "Could not save public link" }, { status: 500 });
    }
});
