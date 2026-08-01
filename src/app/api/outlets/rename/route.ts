export const dynamic = 'force-dynamic';

/**
 * POST /api/outlets/rename — change an outlet's outletSlug
 *
 * G-07 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): outlet slug rename chain.
 * Mirrors the project-slug rename mechanism:
 *   - Assigns a new outletSlug (validated, slugified, uniqueness-checked)
 *   - Appends the previous outletSlug to `previousOutletSlugs[]` (capped at 5)
 *   - Writes the storesSummary in the same transaction
 *
 * Constraints:
 *   - Only the master store of the tenant can initiate a rename.
 *   - Target outlet must belong to the caller's tenant.
 *   - New slug must not collide with:
 *       · another store's current outletSlug in the same tenant
 *       · any other store's previousOutletSlugs (avoids stealing chains)
 *       · the reserved outlet-slug list
 *
 * Desktop and mobile Locations both call this route and update their local
 * tenant store summaries only after a bounded success acknowledgement.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { isReservedOutletSlug } from '@constant/reservedSlugs';
import { admin } from '@lib/firebase/firebaseAdmin';
import { runStorePublicTruthPostCommitEffects } from '@lib/cache/storePublicTruthPostCommit';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import {
    getBoundedMultiOutletStringContext,
    logMultiOutletFailure,
    type MultiOutletLogContext,
} from '@lib/multiOutlet/diagnostics';
import { getOutletSessionScope, normalizeOutletDocumentId } from '@lib/multiOutlet/outletSessionScope';
import { isMultiOutletTenantStoreListEntryInScope } from '@lib/multiOutlet/projectIdBoundary';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { requireAnyStorePermissionForStoreData } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { touchDigitalScreenContentVersionForStoreServer } from '@lib/screen/serverScreenInvalidation';
import {
    isOutletSlugUnavailableError,
    isValidOutletSlugClaimCandidate,
    readOutletSlugReservationInTransaction,
    writeCurrentOutletSlugClaim,
    writeRedirectOutletSlugClaim,
} from '@lib/routing/outletSlugClaim';
import { slugify } from '@lib/utils/slugify';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTenantAccess, withAuth } from '../../../../middleware/auth';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';

const MAX_PREVIOUS_OUTLET_SLUGS = 5;

const schema = z.object({
    outletStoreId: z.union([z.string(), z.number()]),
    newOutletName: z.string().trim().min(1).max(200).optional(),
    newOutletSlug: z.string().trim().min(1).max(60).optional(),
}).refine(
    (v) => Boolean(v.newOutletName || v.newOutletSlug),
    { message: 'Either newOutletName or newOutletSlug is required.' },
);
const OUTLET_ACTION_MAX_BODY_BYTES = 8 * 1024;
const OUTLET_RENAME_EFFECT_CHUNK_SIZE = 1;
const OUTLET_RENAME_CONFLICT_CODE = 'OUTLET_RENAME_CONFLICT';

class OutletRenameConflictError extends Error {
    readonly code = OUTLET_RENAME_CONFLICT_CODE;
    readonly reason: 'NOOP' | 'SCOPE_CHANGED';

    constructor(reason: 'NOOP' | 'SCOPE_CHANGED') {
        super(OUTLET_RENAME_CONFLICT_CODE);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'OutletRenameConflictError';
        this.reason = reason;
    }
}

const isOutletRenameConflictError = (error: unknown): error is OutletRenameConflictError => (
    error instanceof OutletRenameConflictError
    || (
        Boolean(error)
        && typeof error === 'object'
        && (error as { code?: unknown }).code === OUTLET_RENAME_CONFLICT_CODE
    )
);

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: 'Multi-outlet disabled' }, { status: 403 });
    }
    const scope = getOutletSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    let failureContext: MultiOutletLogContext = {
        endpoint: '/api/outlets/rename',
        ...getBoundedMultiOutletStringContext('tenantId', tenantDocumentId),
        ...getBoundedMultiOutletStringContext('storeId', storeDocumentId),
        ...getBoundedMultiOutletStringContext('userId', session.uId || session.user?.id),
    };
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);
    const rl = await checkRateLimit({ key: `outlet-rename:${tenantRateLimitHash}`, limit: 10, window: 3600 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, OUTLET_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const v = validateAPIInput(schema, body);
        if (!v.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }
        const { outletStoreId, newOutletName, newOutletSlug } = v.data;
        const outletStoreIdStr = normalizeOutletDocumentId(outletStoreId);
        if (!outletStoreIdStr) {
            return NextResponse.json({ error: 'Invalid outlet' }, { status: 400 });
        }
        failureContext = {
            ...failureContext,
            ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreIdStr),
            ...getBoundedMultiOutletStringContext('newOutletName', newOutletName),
            ...getBoundedMultiOutletStringContext('newOutletSlug', newOutletSlug),
        };

        const db = admin.firestore();

        // Caller must be the master store of this tenant.
        const masterStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeDocumentId}`);
        const masterSnap = await masterStoreRef.get();
        const masterStore = masterSnap.data();
        const permissionError = await requireAnyStorePermissionForStoreData(
            request,
            session,
            masterStore,
            [PERMISSIONS.MANAGE_OUTLETS],
            'Outlet rename',
            Number(storeId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;
        if (
            !masterSnap.exists
            || masterStore?.isMaster !== true
            || Number(masterStore?.tenantId) !== Number(tenantId)
            || masterStore?.active === false
            || masterStore?.deleted === true
            || isPlatformEntityBlocked(masterStore)
        ) {
            return NextResponse.json({ error: 'Only master store can rename outlets' }, { status: 403 });
        }

        const outletRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreIdStr}`);
        const outletSnap = await outletRef.get();
        if (!outletSnap.exists) {
            return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
        }
        const outlet = outletSnap.data()!;
        if (Number(outlet.tenantId) !== Number(tenantId)) {
            return NextResponse.json({ error: 'Outlet belongs to a different tenant' }, { status: 403 });
        }
        if (outlet.isMaster) {
            return NextResponse.json({ error: 'Cannot rename master store via this endpoint' }, { status: 400 });
        }
        if (outlet.active === false) {
            return NextResponse.json({ error: 'Cannot rename an inactive outlet' }, { status: 400 });
        }
        if (outlet.deleted === true || isPlatformEntityBlocked(outlet)) {
            return NextResponse.json({ error: 'Outlet not available' }, { status: 403 });
        }

        // Derive the proposed slug. Explicit slug overrides the name-derived
        // one so owners can pick a custom slug when the derived form is
        // undesirable (e.g., renaming "Pune Central" but keeping slug "pune").
        const derived = newOutletSlug || (newOutletName ? slugify(newOutletName) : '');
        const proposed = slugify(derived);
        if (!proposed || !isValidOutletSlugClaimCandidate(proposed)) {
            return NextResponse.json({ error: 'Unable to derive a valid slug' }, { status: 400 });
        }
        if (isReservedOutletSlug(proposed)) {
            return NextResponse.json({ error: 'That outlet slug is reserved' }, { status: 400 });
        }

        const currentSlug = typeof outlet.outletSlug === 'string' ? outlet.outletSlug.toLowerCase() : '';
        if (proposed === currentSlug) {
            return NextResponse.json({ error: 'New slug matches current slug', currentSlug }, { status: 400 });
        }
        const now = admin.firestore.Timestamp.now();
        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`);
        const renameResult = await db.runTransaction(async (tx) => {
            const [freshMasterSnap, tenantDoc, freshOutletSnap] = await Promise.all([
                tx.get(masterStoreRef),
                tx.get(tenantRef),
                tx.get(outletRef),
            ]);
            const freshMaster = freshMasterSnap.exists ? freshMasterSnap.data() || {} : {};
            const freshOutlet = freshOutletSnap.exists ? freshOutletSnap.data() || {} : {};
            const storesList = Array.isArray(tenantDoc.data()?.storesList) ? tenantDoc.data()?.storesList : [];
            const freshMasterSummary = storesList.find((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })
            ));
            const freshOutletSummary = storesList.find((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(outletStoreId) })
            ));
            if (
                !freshMasterSnap.exists
                || !tenantDoc.exists
                || !freshOutletSnap.exists
                || Number(freshMaster.tenantId) !== Number(tenantId)
                || freshMaster.isMaster !== true
                || freshMaster.active === false
                || freshMaster.deleted === true
                || isPlatformEntityBlocked(freshMaster)
                || tenantDoc.data()?.active === false
                || tenantDoc.data()?.deleted === true
                || isPlatformEntityBlocked(tenantDoc.data())
                || !freshMasterSummary
                || freshMasterSummary.isMaster !== true
                || freshMasterSummary.active === false
                || !freshOutletSummary
                || freshOutletSummary.isMaster === true
                || freshOutletSummary.active === false
                || Number(freshOutlet.tenantId) !== Number(tenantId)
                || freshOutlet.isMaster === true
                || freshOutlet.active === false
                || freshOutlet.deleted === true
                || isPlatformEntityBlocked(freshOutlet)
            ) {
                throw new OutletRenameConflictError('SCOPE_CHANGED');
            }
            const freshPermissionError = await requireAnyStorePermissionForStoreData(
                request,
                session,
                freshMaster,
                [PERMISSIONS.MANAGE_OUTLETS],
                'Outlet rename',
                Number(storeId),
                Number(tenantId),
            );
            if (freshPermissionError) throw new OutletRenameConflictError('SCOPE_CHANGED');
            const freshCurrentSlug = typeof freshOutlet.outletSlug === 'string'
                ? freshOutlet.outletSlug.toLowerCase()
                : '';
            if (freshCurrentSlug === proposed) throw new OutletRenameConflictError('NOOP');

            const newReservation = await readOutletSlugReservationInTransaction({
                db,
                outletSlug: proposed,
                storeId: outletStoreIdStr,
                tenantId: tenantDocumentId,
                transaction: tx,
            });
            const oldReservation = freshCurrentSlug && isValidOutletSlugClaimCandidate(freshCurrentSlug)
                ? await readOutletSlugReservationInTransaction({
                    db,
                    outletSlug: freshCurrentSlug,
                    storeId: outletStoreIdStr,
                    tenantId: tenantDocumentId,
                    transaction: tx,
                })
                : null;
            const previousSlugs = Array.isArray(freshOutlet.previousOutletSlugs)
                ? freshOutlet.previousOutletSlugs
                    .filter((value): value is string => typeof value === 'string')
                    .map((value) => value.toLowerCase())
                : [];
            const nextChain = previousSlugs.filter((slug) => slug !== proposed);
            if (freshCurrentSlug) nextChain.push(freshCurrentSlug);
            const cappedChain = Array.from(new Set(nextChain)).slice(-MAX_PREVIOUS_OUTLET_SLUGS);
            const updatePayload: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
                outletSlug: proposed,
                previousOutletSlugs: cappedChain,
                modifiedOn: now,
                ...(newOutletName ? { name: newOutletName } : {}),
            };
            const updatedStoresList = storesList.map((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(outletStoreId) })
                    ? {
                        ...store,
                        ...(newOutletName ? { name: newOutletName } : {}),
                        outletSlug: proposed,
                        previousOutletSlugs: cappedChain,
                    }
                    : store
            ));
            tx.update(outletRef, updatePayload);
            writeCurrentOutletSlugClaim(tx, newReservation, now);
            if (oldReservation) writeRedirectOutletSlugClaim(tx, oldReservation, now);
            const summaryRef = db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`);
            const summaryStorePatch: Record<string, unknown> = {
                outletSlug: proposed,
                modifiedOn: now,
            };
            if (newOutletName) {
                summaryStorePatch.name = newOutletName;
            }
            const summaryPayload: Record<string, unknown> = {
                lastUpdated: now,
                stores: {
                    [outletStoreIdStr]: summaryStorePatch,
                },
            };
            tx.set(summaryRef, summaryPayload, { merge: true });
            tx.update(tenantRef, { storesList: updatedStoresList });
            return { cappedChain, previousSlug: freshCurrentSlug };
        });
        const postCommit = await runStorePublicTruthPostCommitEffects({
            chunkSize: OUTLET_RENAME_EFFECT_CHUNK_SIZE,
            storeIds: [outletStoreIdStr],
            tenantId: tenantDocumentId,
            deps: {
                invalidateAssistant: (storeId, tenantId) => (
                    invalidateOwnerBusinessAssistantPacketCache({ tId: tenantId, sId: storeId })
                ),
                revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                touchScreen: (storeId) => touchDigitalScreenContentVersionForStoreServer(storeId, 'outletRename'),
            },
        });
        if (postCommit.effectsPending) {
            logMultiOutletFailure('outlet_rename_post_commit_effect_failed', postCommit.firstError, {
                ...failureContext,
                failedEffectCount: postCommit.failedEffectCount,
            });
        }

        return NextResponse.json({
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
            success: true,
            outletStoreId: outletStoreIdStr,
            outletSlug: proposed,
            previousOutletSlugs: renameResult.cappedChain,
        });
    } catch (error) {
        if (isOutletSlugUnavailableError(error)) {
            return NextResponse.json({ error: 'Another outlet is already using that slug' }, { status: 409 });
        }
        if (isOutletRenameConflictError(error)) {
            return NextResponse.json(
                { error: error.reason === 'NOOP' ? 'New slug matches current slug' : 'Outlet scope changed during rename' },
                { status: 409 },
            );
        }
        logMultiOutletFailure('outlet_rename_route_failed', error, failureContext);
        return NextResponse.json({ error: 'Outlet rename failed' }, { status: 500 });
    }
});
