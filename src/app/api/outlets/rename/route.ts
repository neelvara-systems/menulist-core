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
 * NOTE: the Owner Dashboard UI for triggering rename is a separate product
 * task. This endpoint is ready for that UI and for direct API use.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { isReservedOutletSlug } from '@constant/reservedSlugs';
import { admin } from '@lib/firebase/firebaseAdmin';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { requireAnyStorePermissionForStoreData } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { validateAPIInput } from '@lib/security/inputValidation';
import { secureError } from '@lib/security/secureLogger';
import { slugify } from '@lib/utils/slugify';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTenantAccess, withAuth } from '../../../../middleware/auth';

const MAX_PREVIOUS_OUTLET_SLUGS = 5;

const schema = z.object({
    outletStoreId: z.union([z.string(), z.number()]),
    newOutletName: z.string().trim().min(1).max(200).optional(),
    newOutletSlug: z.string().trim().min(1).max(60).optional(),
}).refine(
    (v) => Boolean(v.newOutletName || v.newOutletSlug),
    { message: 'Either newOutletName or newOutletSlug is required.' },
);

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: 'Multi-outlet disabled' }, { status: 403 });
    }
    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rl = await checkRateLimit({ key: `outlet-rename:${tenantId}`, limit: 10, window: 3600 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const v = validateAPIInput(schema, body);
        if (!v.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }
        const { outletStoreId, newOutletName, newOutletSlug } = v.data;

        const db = admin.firestore();

        // Caller must be the master store of this tenant.
        const masterSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${storeId}`).get();
        const masterStore = masterSnap.data();
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            masterStore,
            [PERMISSIONS.MANAGE_OUTLETS],
            'Outlet rename',
            Number(storeId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;
        if (!masterSnap.exists || masterStore?.isMaster !== true) {
            return NextResponse.json({ error: 'Only master store can rename outlets' }, { status: 403 });
        }

        const outletStoreIdStr = String(outletStoreId);
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

        // Derive the proposed slug. Explicit slug overrides the name-derived
        // one so owners can pick a custom slug when the derived form is
        // undesirable (e.g., renaming "Pune Central" but keeping slug "pune").
        const derived = newOutletSlug || (newOutletName ? slugify(newOutletName) : '');
        const proposed = slugify(derived);
        if (!proposed) {
            return NextResponse.json({ error: 'Unable to derive a valid slug' }, { status: 400 });
        }
        if (isReservedOutletSlug(proposed)) {
            return NextResponse.json({ error: 'That outlet slug is reserved' }, { status: 400 });
        }

        const currentSlug = (outlet.outletSlug || '').toLowerCase();
        if (proposed === currentSlug) {
            return NextResponse.json({ error: 'New slug matches current slug', currentSlug }, { status: 400 });
        }

        // Uniqueness: no other outlet in the tenant may use the proposed slug
        // as its current outletSlug. We allow reclaiming a slug only if it
        // lives in THIS outlet's own previousOutletSlugs[] (undoing a rename).
        const directCollisionSnap = await db
            .collection(DB_COLLECTIONS.STORES)
            .where('tenantId', '==', tenantId)
            .where('outletSlug', '==', proposed)
            .where('active', '==', true)
            .limit(1)
            .get();
        if (!directCollisionSnap.empty) {
            return NextResponse.json({ error: 'Another outlet is already using that slug' }, { status: 409 });
        }

        // Uniqueness: no other outlet may have the proposed slug in its
        // previousOutletSlugs[] — stealing another outlet's chain would
        // break that other outlet's physical QRs.
        const chainCollisionSnap = await db
            .collection(DB_COLLECTIONS.STORES)
            .where('tenantId', '==', tenantId)
            .where('previousOutletSlugs', 'array-contains', proposed)
            .limit(5)
            .get();
        const foreignChain = chainCollisionSnap.docs.find((d) => d.id !== outletStoreIdStr);
        if (foreignChain) {
            return NextResponse.json(
                { error: 'That slug is reserved by another outlet\'s rename history' },
                { status: 409 },
            );
        }

        const previousSlugs: string[] = Array.isArray(outlet.previousOutletSlugs)
            ? outlet.previousOutletSlugs.map((s: any) => String(s).toLowerCase())
            : [];

        // Append current slug to the chain (capped). If the chain already
        // contains the proposed slug (owner reclaiming old name), remove that
        // entry — the proposed slug is becoming the new current.
        const nextChain = [...previousSlugs.filter((s) => s !== proposed)];
        if (currentSlug) nextChain.push(currentSlug);
        const cappedChain = nextChain.slice(-MAX_PREVIOUS_OUTLET_SLUGS);

        const now = admin.firestore.Timestamp.now();
        const updatePayload: Record<string, any> = {
            outletSlug: proposed,
            previousOutletSlugs: cappedChain,
            modifiedOn: now,
        };
        if (newOutletName) {
            updatePayload.name = newOutletName;
        }

        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`);
        await db.runTransaction(async (tx) => {
            const tenantDoc = await tx.get(tenantRef);
            const storesList = tenantDoc.data()?.storesList || [];
            const updatedStoresList = storesList.map((store: any) => (
                Number(store.storeId) === Number(outletStoreId)
                    ? {
                        ...store,
                        ...(newOutletName ? { name: newOutletName } : {}),
                        outletSlug: proposed,
                        previousOutletSlugs: cappedChain,
                    }
                    : store
            ));
            tx.update(outletRef, updatePayload);
            const summaryRef = db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`);
            const summaryStorePatch: Record<string, any> = {
                outletSlug: proposed,
                modifiedOn: now,
            };
            if (newOutletName) {
                summaryStorePatch.name = newOutletName;
            }
            const summaryPayload: Record<string, any> = {
                lastUpdated: now,
                stores: {
                    [outletStoreIdStr]: summaryStorePatch,
                },
            }
            tx.set(summaryRef, summaryPayload, { merge: true });
            tx.update(tenantRef, { storesList: updatedStoresList });
        });
        revalidateTag(`menu-store-${outletStoreIdStr}`);
        revalidateTag(`store-${outletStoreIdStr}`);
        revalidateTag('client-stores');
        await invalidateOwnerBusinessAssistantPacketCache({
            tId: tenantId,
            sId: outletStoreIdStr,
        });

        return NextResponse.json({
            success: true,
            outletStoreId: outletStoreIdStr,
            outletSlug: proposed,
            previousOutletSlugs: cappedChain,
        });
    } catch (error) {
        secureError('[Outlets] Rename failed', error as Error, { tenantId, storeId });
        return NextResponse.json({ error: 'Outlet rename failed' }, { status: 500 });
    }
});
