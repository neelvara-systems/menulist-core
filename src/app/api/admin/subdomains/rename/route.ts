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
 * @see __docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md §A-03, T1-N-05
 * @see src/lib/firestore/clientStoreLookup.ts — chain fallback consumer
 */

import { DB_COLLECTIONS } from '@constant/database';
import { isReservedSubdomain } from '@constant/reservedSlugs';
import { admin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { validateAPIInput } from '@lib/security/inputValidation';
import { secureError } from '@lib/security/secureLogger';
import { slugify } from '@lib/utils/slugify';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_PREVIOUS_SUBDOMAINS = 10;
const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

const schema = z.object({
    tenantId: z.number().int().positive(),
    storeId: z.union([z.string(), z.number()]),
    newSubdomain: z.string().trim().min(3).max(63),
    reason: z.string().trim().min(10).max(500),
    ackRef: z.string().trim().min(3).max(100),
});

export const POST = withAuth(
    async (request, session) => {
        try {
            const body = await request.json();
            const v = validateAPIInput(schema, body);
            if (!v.success) {
                return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
            }
            const { tenantId, storeId, newSubdomain, reason, ackRef } = v.data;

            // Normalize and validate the proposed subdomain shape.
            const proposed = slugify(newSubdomain).toLowerCase();
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
            const storeIdStr = String(storeId);
            const storeRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeIdStr}`);
            const storeSnap = await storeRef.get();
            if (!storeSnap.exists) {
                return NextResponse.json({ error: 'Store not found' }, { status: 404 });
            }
            const store = storeSnap.data() as Record<string, any>;
            if (Number(store?.tenantId) !== Number(tenantId)) {
                return NextResponse.json(
                    { error: 'Store belongs to a different tenant' },
                    { status: 403 },
                );
            }
            const currentSubdomain = typeof store?.subdomain === 'string'
                ? store.subdomain.toLowerCase()
                : '';
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
            const auditRef = db.collection('subdomainRenameLog').doc();
            await db.runTransaction(async (tx) => {
                tx.update(storeRef, {
                    subdomain: proposed,
                    previousSubdomains: nextHistory,
                    previousSubdomainSlugs: nextHistorySlugs,
                    modifiedOn: now,
                });
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

            logger.security(
                'Admin subdomain rename',
                {
                    storeId: storeIdStr,
                    tenantId,
                    previousSubdomain: currentSubdomain,
                    newSubdomain: proposed,
                    operator: session?.user?.email,
                    reason,
                    ackRef,
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
            secureError('[Admin] Subdomain rename failed', error as Error);
            return NextResponse.json(
                { error: 'Subdomain rename failed' },
                { status: 500 },
            );
        }
    },
    { requiredPlatformRole: 'PLATFORM' },
);
