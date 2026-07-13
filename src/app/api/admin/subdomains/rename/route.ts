export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/subdomains/rename — change a store's subdomain
 *
 * T1-N-05 / A-03 PUBLIC-ROUTING-DOCTRINE: subdomain rename escape hatch.
 *
 * Owners cannot rename a subdomain after first publish (G-08 server guard).
 * This admin-tier endpoint is the ONLY path that can mutate a published
 * store's subdomain — used for trademark disputes, acquisitions, or legal
 * orders. It requires:
 *   1. Platform-role authentication (`requiredPlatformRole: 'PLATFORM'`).
 *   2. Explicit `reason` text (logged to the audit collection).
 *   3. An `ackRef` — the support ticket or written acknowledgement the owner
 *      provided accepting that their printed QRs will eventually stop
 *      resolving after the 12-month redirect window lapses.
 *
 * Request body:
 *   {
 *     tenantId: number,
 *     storeId: string | number,
 *     newSubdomain: string,
 *     reason: string,
 *     ackRef: string,
 *   }
 *
 * Behavior:
 *   - Validates the new subdomain (not reserved, not in use, slug-clean).
 *   - Atomic update: rewrites `subdomain`, appends the old subdomain to
 *     `previousSubdomains[]` with a 12-month `expiresAt`, and refreshes
 *     the denormalized `previousSubdomainSlugs[]` shadow index used by the
 *     resolver's chain-lookup fallback.
 *   - Writes an audit record to `subdomainRenameLog/{autoId}` with who
 *     performed the rename, when, why, and both values.
 *
 * @see __docs__/client-menu/public-routing-doctrine.md §A-03, T1-N-05
 * @see src/lib/firestore/clientStoreLookup.ts — chain fallback consumer
 */

import { DB_COLLECTIONS } from '@constant/database';
import { isReservedSubdomain } from '@constant/reservedSlugs';
import { normalizeStoreSummaryNumericDocumentId } from '@data/shared/storeSummaryBoundary';
import { admin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { logger } from '@lib/monitoring/logger';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { validateAPIInput } from '@lib/security/inputValidation';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import {
    getBoundedSecurityRouteContext,
    getBoundedSecurityStringContext,
    logSecurityFailure,
} from '@lib/security/securityDiagnostics';
import { touchDigitalScreenContentVersionForStoreServer } from '@lib/screen/serverScreenInvalidation';
import {
    getSubdomainClaimDocumentId,
    isSubdomainUnavailableError,
    isValidSubdomainClaimCandidate,
    readSubdomainReservationInTransaction,
    writeCurrentSubdomainClaim,
    writeRedirectSubdomainClaim,
} from '@lib/routing/subdomainClaim';
import { slugify } from '@lib/utils/slugify';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_PREVIOUS_SUBDOMAINS = 10;
const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const ADMIN_SUBDOMAIN_RENAME_MAX_BODY_BYTES = 8 * 1024;
const ADMIN_SUBDOMAIN_RENAME_RATE_LIMIT_KEY = 'admin-subdomain-rename';

type AdminSubdomainRenameScopeDocumentId = {
    documentId: string;
    numericId: number;
};

const schema = z.object({
    tenantId: z.number().int().positive(),
    storeId: z.union([z.string(), z.number()]),
    newSubdomain: z.string().trim().min(3).max(63),
    reason: z.string().trim().min(10).max(500),
    ackRef: z.string().trim().min(3).max(100),
});

type SubdomainRenameLogContext = Record<string, boolean | number | string | null | undefined>;

const getOperatorLogContext = (session: any): SubdomainRenameLogContext => ({
    route: '/api/admin/subdomains/rename',
    ...getBoundedSecurityStringContext('operatorUserId', session?.user?.id),
    ...getBoundedSecurityStringContext('operatorEmail', session?.user?.email),
});

function getAdminSubdomainRenameOperatorId(session: any): string {
    return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

function normalizeAdminSubdomainRenameScopeDocumentId(value: unknown): AdminSubdomainRenameScopeDocumentId | null {
    const documentId = typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
            ? value
            : '';

    if (
        !documentId
        || documentId !== documentId.trim()
        || !isValidFirestoreDocumentId(documentId)
    ) {
        return null;
    }

    const numericId = Number(documentId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0 || String(numericId) !== documentId) {
        return null;
    }

    return { documentId, numericId };
}

function timestampToMillis(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    try {
        const toMillis = (value as { toMillis?: unknown }).toMillis;
        if (typeof toMillis !== 'function') return 0;
        const millis = Number(toMillis.call(value));
        return Number.isFinite(millis) ? millis : 0;
    } catch {
        return 0;
    }
}

export const POST = withAuth(
    async (request, session) => {
        let failureContext: SubdomainRenameLogContext = getOperatorLogContext(session);
        try {
            const rateLimitConfig = getRateLimitForFeature('ADMIN_SUBDOMAIN_RENAME_MUTATION');
            const operatorRateLimitHash = hashPublicRateLimitValue(getAdminSubdomainRenameOperatorId(session));
            const rateLimit = await checkRateLimit({
                key: `${ADMIN_SUBDOMAIN_RENAME_RATE_LIMIT_KEY}:${operatorRateLimitHash}`,
                ...rateLimitConfig,
            });
            if (!rateLimit.allowed) {
                const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
                logger.security('Rate Limit Exceeded - Admin Subdomain Rename', {
                    ...getBoundedSecurityRouteContext(session, request),
                    ...failureContext,
                    endpoint: '/api/admin/subdomains/rename',
                    error: 'Too many admin subdomain rename attempts',
                    feature: 'ADMIN_SUBDOMAIN_RENAME_MUTATION',
                    limit: rateLimitConfig.limit,
                    waitSeconds,
                    window: rateLimitConfig.window,
                }, 'high');

                return NextResponse.json(
                    { error: 'Too many subdomain rename attempts. Please try again later.', retryAfter: waitSeconds },
                    {
                        status: 429,
                        headers: {
                            'Retry-After': String(waitSeconds),
                            'X-RateLimit-Limit': String(rateLimitConfig.limit),
                            'X-RateLimit-Remaining': String(rateLimit.remaining),
                            'X-RateLimit-Reset': String(rateLimit.resetAt),
                        },
                    },
                );
            }

            const bodyResult = await readBoundedJsonBody(request, ADMIN_SUBDOMAIN_RENAME_MAX_BODY_BYTES, {
                invalidJsonMessage: 'Invalid input',
            });
            if (bodyResult.ok === false) return bodyResult.response;

            const v = validateAPIInput(schema, bodyResult.data);
            if (!v.success) {
                return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
            }
            const { tenantId: rawTenantId, storeId, newSubdomain, reason, ackRef } = v.data;
            const tenantScope = normalizeAdminSubdomainRenameScopeDocumentId(rawTenantId);
            const storeScope = normalizeAdminSubdomainRenameScopeDocumentId(storeId);
            if (!tenantScope || !storeScope) {
                return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
            }
            const tenantId = tenantScope.numericId;
            const storeIdStr = storeScope.documentId;
            failureContext = {
                ...failureContext,
                ...getBoundedSecurityStringContext('tenantId', tenantId),
                ...getBoundedSecurityStringContext('storeId', storeIdStr),
                ...getBoundedSecurityStringContext('newSubdomainInput', newSubdomain),
                reasonPresent: reason.length > 0,
                reasonLength: reason.length,
                ackRefPresent: ackRef.length > 0,
                ackRefLength: ackRef.length,
            };

            // Normalize and validate the proposed subdomain shape.
            const proposed = slugify(newSubdomain).toLowerCase();
            failureContext = {
                ...failureContext,
                ...getBoundedSecurityStringContext('proposedSubdomain', proposed),
            };
            if (!proposed || !SUBDOMAIN_PATTERN.test(proposed)) {
                return NextResponse.json(
                    { error: 'Invalid subdomain shape' },
                    { status: 400 },
                );
            }
            if (isReservedSubdomain(proposed)) {
                return NextResponse.json(
                    { error: 'That subdomain is reserved' },
                    { status: 400 },
                );
            }

            const db = admin.firestore();
            const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeIdStr);
            const storeSnap = await storeRef.get();
            if (!storeSnap.exists) {
                return NextResponse.json({ error: 'Store not found' }, { status: 404 });
            }
            const store = storeSnap.data() as Record<string, unknown>;
            if (normalizeStoreSummaryNumericDocumentId(store?.tenantId ?? store?.tId) !== tenantScope.documentId) {
                return NextResponse.json(
                    { error: 'Store belongs to a different tenant' },
                    { status: 403 },
                );
            }
            const currentSubdomain = typeof store?.subdomain === 'string'
                ? store.subdomain.toLowerCase()
                : '';
            failureContext = {
                ...failureContext,
                hasCurrentSubdomain: currentSubdomain.length > 0,
                currentSubdomainLength: currentSubdomain.length,
            };
            if (proposed === currentSubdomain) {
                return NextResponse.json(
                    { error: 'New subdomain matches current subdomain', currentSubdomain },
                    { status: 400 },
                );
            }

            const now = admin.firestore.Timestamp.now();
            const nowMs = now.toMillis();

            // Transaction: reserve the unique slug, refresh the redirect
            // chain, update canonical/summary state and write the audit record.
            const auditRef = db.collection(DB_COLLECTIONS.SUBDOMAIN_RENAME_LOG).doc();
            const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
            const renameResult = await db.runTransaction(async (tx) => {
                const freshStoreSnap = await tx.get(storeRef);
                const freshStore = freshStoreSnap.exists ? freshStoreSnap.data() || {} : {};
                if (
                    !freshStoreSnap.exists
                    || normalizeStoreSummaryNumericDocumentId(freshStore.tenantId ?? freshStore.tId) !== tenantScope.documentId
                ) {
                    throw new Error('admin_subdomain_store_scope_changed');
                }
                const freshCurrentSubdomain = typeof freshStore.subdomain === 'string'
                    ? freshStore.subdomain.toLowerCase()
                    : '';
                if (freshCurrentSubdomain === proposed) throw new Error('admin_subdomain_unchanged');

                const reservation = await readSubdomainReservationInTransaction({
                    db,
                    nowMillis: nowMs,
                    storeId: storeIdStr,
                    subdomain: proposed,
                    tenantId: tenantScope.documentId,
                    transaction: tx,
                });
                const oldClaimRef = freshCurrentSubdomain
                    && isValidSubdomainClaimCandidate(freshCurrentSubdomain)
                    ? db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getSubdomainClaimDocumentId(freshCurrentSubdomain))
                    : null;
                const oldClaimSnap = oldClaimRef ? await tx.get(oldClaimRef) : null;
                const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs + TWELVE_MONTHS_MS);
                const newHistoryEntry = {
                    subdomain: freshCurrentSubdomain,
                    renamedAt: now,
                    expiresAt,
                    reason,
                    ackRef,
                };
                const existingHistory: Array<Record<string, unknown>> = Array.isArray(freshStore.previousSubdomains)
                    ? freshStore.previousSubdomains.filter(
                        (entry): entry is Record<string, unknown> => Boolean(entry)
                            && typeof entry === 'object'
                            && !Array.isArray(entry),
                    )
                    : [];
                const prunedHistory = existingHistory.filter((entry) => (
                    timestampToMillis(entry.expiresAt) > nowMs
                ));
                const nextHistory = freshCurrentSubdomain
                    ? [...prunedHistory, newHistoryEntry].slice(-MAX_PREVIOUS_SUBDOMAINS)
                    : prunedHistory;
                const nextHistorySlugs = nextHistory
                    .map((entry) => String(entry?.subdomain || '').toLowerCase())
                    .filter(Boolean);

                tx.update(storeRef, {
                    subdomain: proposed,
                    previousSubdomains: nextHistory,
                    previousSubdomainSlugs: nextHistorySlugs,
                    modifiedOn: now,
                });
                tx.set(summaryRef, {
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    stores: {
                        [storeIdStr]: {
                            modifiedOn: now,
                            subdomain: proposed,
                        },
                    },
                }, { merge: true });
                writeCurrentSubdomainClaim(tx, reservation, now);
                if (
                    oldClaimRef
                    && (!oldClaimSnap?.exists || String(oldClaimSnap.data()?.storeId || '') === storeIdStr)
                ) {
                    writeRedirectSubdomainClaim({
                        claimRef: oldClaimRef,
                        expiresAt,
                        now,
                        storeId: storeIdStr,
                        subdomain: freshCurrentSubdomain,
                        tenantId: tenantScope.documentId,
                        transaction: tx,
                    });
                }
                tx.set(auditRef, {
                    storeId: storeIdStr,
                    tenantId,
                    previousSubdomain: freshCurrentSubdomain,
                    newSubdomain: proposed,
                    renamedAt: now,
                    expiresAt,
                    reason,
                    ackRef,
                    operatorEmail: session?.user?.email || 'unknown',
                    operatorUserId: session?.user?.id || null,
                });
                return {
                    expiresAt,
                    historyEntryCount: nextHistory.length,
                    previousSubdomain: freshCurrentSubdomain,
                };
            });

            revalidateTag(`menu-store-${storeIdStr}`);
            revalidateTag(`store-${storeIdStr}`);
            revalidateTag('client-stores');
            revalidateTag('screen-data');
            await touchDigitalScreenContentVersionForStoreServer(storeIdStr, 'adminSubdomainRename');
            await invalidateOwnerBusinessAssistantPacketCache({
                tId: tenantId,
                sId: storeIdStr,
            });

            logger.security(
                'Admin subdomain rename',
                {
                    ...failureContext,
                    auditIdPresent: auditRef.id.length > 0,
                    auditIdLength: auditRef.id.length,
                    previousSubdomainPresent: renameResult.previousSubdomain.length > 0,
                    previousSubdomainLength: renameResult.previousSubdomain.length,
                    historyEntryCount: renameResult.historyEntryCount,
                    cacheInvalidated: true,
                    screenInvalidated: true,
                    ownerAssistantPacketInvalidated: true,
                },
                'high',
            );

            return NextResponse.json({
                success: true,
                storeId: storeIdStr,
                previousSubdomain: renameResult.previousSubdomain,
                newSubdomain: proposed,
                expiresAt: renameResult.expiresAt.toDate().toISOString(),
                auditId: auditRef.id,
            });
        } catch (error) {
            if (isSubdomainUnavailableError(error)) {
                return NextResponse.json({ error: 'That subdomain is already reserved' }, { status: 409 });
            }
            if (error instanceof Error && error.message === 'admin_subdomain_unchanged') {
                return NextResponse.json({ error: 'New subdomain matches current subdomain' }, { status: 409 });
            }
            if (error instanceof Error && error.message === 'admin_subdomain_store_scope_changed') {
                return NextResponse.json({ error: 'Store scope changed during rename' }, { status: 409 });
            }
            logSecurityFailure('admin_subdomain_rename_failed', error, failureContext);
            return NextResponse.json(
                { error: 'Subdomain rename failed' },
                { status: 500 },
            );
        }
    },
    { requiredPlatformRole: 'PLATFORM' },
);
