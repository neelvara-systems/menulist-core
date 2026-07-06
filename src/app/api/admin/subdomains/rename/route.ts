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
import { slugify } from '@lib/utils/slugify';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_PREVIOUS_SUBDOMAINS = 10;
const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
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
            const store = storeSnap.data() as Record<string, any>;
            if (String(store?.tenantId) !== tenantScope.documentId && String(store?.tId) !== tenantScope.documentId) {
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

            // Uniqueness: reject if another active store already uses the proposed
            // subdomain as its current value.
            const directCollision = await db
                .collection(DB_COLLECTIONS.STORES)
                .where('subdomain', '==', proposed)
                .where('active', '==', true)
                .limit(1)
                .get();
            if (!directCollision.empty) {
                return NextResponse.json(
                    { error: 'Another active store is already using that subdomain' },
                    { status: 409 },
                );
            }

            // Uniqueness: reject if the proposed subdomain is someone else's
            // unexpired rename chain entry (a 301 target cannot be stolen).
            const chainCollision = await db
                .collection(DB_COLLECTIONS.STORES)
                .where('previousSubdomainSlugs', 'array-contains', proposed)
                .limit(5)
                .get();
            const now = admin.firestore.Timestamp.now();
            const nowMs = now.toMillis();
            const foreignActiveChain = chainCollision.docs.find((d) => {
                if (d.id === storeIdStr) return false;
                const data = d.data() as Record<string, any>;
                const history: Array<{ subdomain?: string; expiresAt?: any }> = Array.isArray(
                    data?.previousSubdomains,
                )
                    ? data.previousSubdomains
                    : [];
                return history.some((entry) => {
                    if ((entry?.subdomain || '').toLowerCase() !== proposed) return false;
                    const expiresAtMs = entry?.expiresAt?.toMillis?.() ?? 0;
                    return expiresAtMs > nowMs;
                });
            });
            if (foreignActiveChain) {
                return NextResponse.json(
                    { error: 'That subdomain is still reserved by another store\'s rename history' },
                    { status: 409 },
                );
            }

            // Build the new rename-chain entry. The chain itself is capped at
            // MAX_PREVIOUS_SUBDOMAINS entries — expired entries drop off on
            // subsequent renames; no background cleanup required.
            const newHistoryEntry = {
                subdomain: currentSubdomain,
                renamedAt: now,
                expiresAt: admin.firestore.Timestamp.fromMillis(nowMs + TWELVE_MONTHS_MS),
                reason,
                ackRef,
            };
            const existingHistory: Array<Record<string, any>> = Array.isArray(store?.previousSubdomains)
                ? store.previousSubdomains
                : [];
            const prunedHistory = existingHistory.filter((entry) => {
                const expiresAtMs = entry?.expiresAt?.toMillis?.() ?? 0;
                return expiresAtMs > nowMs;
            });
            const nextHistory = currentSubdomain
                ? [...prunedHistory, newHistoryEntry].slice(-MAX_PREVIOUS_SUBDOMAINS)
                : prunedHistory;
            const nextHistorySlugs = nextHistory
                .map((entry) => (entry?.subdomain || '').toLowerCase())
                .filter(Boolean);

            // Transaction: update the store and write the audit record in
            // one atomic batch so the two documents never drift.
            const auditRef = db.collection(DB_COLLECTIONS.SUBDOMAIN_RENAME_LOG).doc();
            const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
            await db.runTransaction(async (tx) => {
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
                tx.set(auditRef, {
                    storeId: storeIdStr,
                    tenantId,
                    previousSubdomain: currentSubdomain,
                    newSubdomain: proposed,
                    renamedAt: now,
                    expiresAt: newHistoryEntry.expiresAt,
                    reason,
                    ackRef,
                    operatorEmail: session?.user?.email || 'unknown',
                    operatorUserId: session?.user?.id || null,
                });
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
                    previousSubdomainPresent: currentSubdomain.length > 0,
                    previousSubdomainLength: currentSubdomain.length,
                    historyEntryCount: nextHistory.length,
                    cacheInvalidated: true,
                    screenInvalidated: true,
                    ownerAssistantPacketInvalidated: true,
                },
                'high',
            );

            return NextResponse.json({
                success: true,
                storeId: storeIdStr,
                previousSubdomain: currentSubdomain,
                newSubdomain: proposed,
                expiresAt: newHistoryEntry.expiresAt.toDate().toISOString(),
                auditId: auditRef.id,
            });
        } catch (error) {
            logSecurityFailure('admin_subdomain_rename_failed', error, failureContext);
            return NextResponse.json(
                { error: 'Subdomain rename failed' },
                { status: 500 },
            );
        }
    },
    { requiredPlatformRole: 'PLATFORM' },
);
