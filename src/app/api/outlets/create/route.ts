export const dynamic = 'force-dynamic';
/**
 * POST /api/outlets/create — internal outlet creation
 * Billing sync is optional for now, so multi-branch settings stay available
 * even when no active subscription is present.
 * @see __docs__/multi-outlet-consistency/store-onboarding-billing_impl.md §5
 */
import { getDefaultTimeSlotPresets } from "@config/defaultTimeSlotPresets";
import { FEATURE_FLAGS } from "@config/features";
import { resolveBusinessCategory } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { isReservedOutletSlug } from "@constant/reservedSlugs";
import { createDefaultRoles } from "@data/defaultRoles";
import { getActiveSubscriptionForStore, updateSubscription } from "@database/subscriptions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { checkRateLimit } from "@lib/rateLimit";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { slugify } from "@lib/utils/slugify";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const schema = z.object({ outletName: z.string().min(1).max(200) });

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_OUTLET_CREATION) {
        return NextResponse.json({ error: "Outlet creation disabled" }, { status: 403 });
    }
    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rlResult = await checkRateLimit({ key: `outlet:${tenantId}`, limit: 5, window: 3600 });
    if (!rlResult.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    let billingUpdated = false;
    let previousQty = 1;
    let subId: string | undefined;
    let providerSubId: string | undefined;

    try {
        const body = await request.json();
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { outletName } = v.data;

        // Validate: current store must be master
        const storeSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${storeId}`).get();
        if (!storeSnap.exists || !storeSnap.data()?.isMaster) {
            return NextResponse.json({ error: "Only master store can add outlets" }, { status: 403 });
        }
        const masterStore = storeSnap.data()!;

        // Enforce outlet count limit (excludes master store)
        const maxOutlets = FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT;
        if (maxOutlets > 0) {
            const tenantSnap = await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).get();
            const currentOutlets = (tenantSnap.data()?.storesList || []).filter((s: any) => !s.isMaster).length;
            if (currentOutlets >= maxOutlets) {
                return NextResponse.json({ error: `Maximum ${maxOutlets} outlets reached` }, { status: 400 });
            }
        }

        const sub = await getActiveSubscriptionForStore(tenantId, storeId);
        if (sub) {
            if (FEATURE_FLAGS.ENABLE_OUTLET_BILLING && sub.status !== 'active') {
                return NextResponse.json(
                    { error: "Billing needs attention before adding another location" },
                    { status: 402 },
                );
            }
            subId = sub.id;
            providerSubId = sub.providerSubscriptionId;
        }

        // Acquire creation lock ATOMICALLY via transaction (Architecture Audit §3.2a)
        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`);
        await db.runTransaction(async (t) => {
            const tenantDoc = await t.get(tenantRef);
            const data = tenantDoc.data();
            if (data?.outletCreationLock) {
                const lockAge = Date.now() - (data.outletCreationLockAt?.toMillis() || 0);
                if (lockAge < 300_000) throw new Error("LOCK_HELD");
            }
            t.update(tenantRef, {
                outletCreationLock: true,
                outletCreationLockAt: now,
            });
        });

        // ═══ PATH 1: BILLING (must succeed BEFORE internal creation — Rule 3) ═══
        previousQty = sub?.quantity || 1;
        const newQty = previousQty + 1;
        if (FEATURE_FLAGS.ENABLE_OUTLET_BILLING && sub?.status === 'active' && sub.providerSubscriptionId) {
            await razorpayClient.subscriptions.update(sub.providerSubscriptionId, {
                quantity: newQty,
            });
            billingUpdated = true;
        }
        if (subId) {
            await updateSubscription(subId, { quantity: newQty });
        }

        // Pre-fetch master projects OUTSIDE transaction (Firestore requirement)
        const masterProjectsSnap = await db
            .collection(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`)
            .where('deleted', '!=', true)
            .get();

        // Read current tenant data for storesList
        const tenantData = (await tenantRef.get()).data();

        // ═══ PATH 2: INTERNAL CREATION (atomic transaction) ═══
        const summaryRef = db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/summary`);
        const result = await db.runTransaction(async (tx) => {
            const summary = await tx.get(summaryRef);
            const newStoreId = (summary.data()?.stores?.count || 0) + 1;
            const storeKey = outletName.toLowerCase().replaceAll(" ", "_");
            // URL Routing Architecture — ADR-1: Auto-generate outletSlug for path routing
            let outletSlug = slugify(outletName);
            if (isReservedOutletSlug(outletSlug)) {
                outletSlug = `${outletSlug}-outlet`;
            }
            const businessType = masterStore.businessType || 'restaurant';
            const businessCategory = resolveBusinessCategory(businessType, masterStore.businessCategory) || 'specialty';
            const defaultPresets = getDefaultTimeSlotPresets(businessType, tenantId, newStoreId);
            const roles = createDefaultRoles(newStoreId, session.user?.email || 'system');
            const tenantName = tenantData?.name || masterStore.tenantName || '';

            // Create outlet store doc
            // Copy brand identity from master store so outlets render correctly
            // without needing a tenant-level fetch. Location-specific fields
            // (name, addressLine, workingHours) are set by outlet owner later.
            // @see __docs__/official-business-page/official-business-page_impl.md §2
            tx.set(db.doc(`${DB_COLLECTIONS.STORES}/${newStoreId}`), {
                name: outletName,
                tenantName,
                businessType,
                businessCategory,
                email: masterStore.email || '',
                phoneNumber: masterStore.phoneNumber || '',
                logo: masterStore.logo || '',
                currencyCode: masterStore.currencyCode || 'INR',
                currencySymbol: masterStore.currencySymbol || '₹',
                country: masterStore.country || '',
                timeZone: masterStore.timeZone || '',
                schedulerHour: masterStore.schedulerHour ?? 2, // Inherit from master (default 2 = 2:30 AM UTC)
                defaultLanguage: masterStore.defaultLanguage || 'en',
                active: true,
                verified: false,
                tenantId,
                storeId: newStoreId,
                storeKey,
                timeSlotPresets: defaultPresets,
                roles,
                isMaster: false,
                outletSlug,
                createdOn: now,
                modifiedOn: now,
            });

            // Sync to storesSummary
            tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`), {
                lastUpdated: now,
                [`stores.${newStoreId}`]: {
                    tId: tenantId,
                    businessType,
                    businessCategory,
                    active: true,
                    name: outletName,
                    tenantName,
                    isMaster: false,
                    outletSlug,
                    city: '',
                    addressLine: '',
                    logo: masterStore.logo || '',
                    workingHours: {},
                    timeZone: masterStore.timeZone || '',
                    businessDayEndTime: masterStore.businessDayEndTime || '',
                    schedulerHour: masterStore.schedulerHour ?? 2, // Inherit from master
                    modifiedOn: now,
                },
            }, { merge: true });

            // Update tenant storesList
            const currentStoresList = tenantData?.storesList || [];
            tx.update(tenantRef, {
                storesList: [...currentStoresList, {
                    storeId: newStoreId,
                    name: outletName,
                    tenantName,
                    isMaster: false,
                }],
                outletCreationLock: false,
            });

            // Update platform summary counts
            tx.update(summaryRef, { 'stores.count': newStoreId });

            // Replicate master projects to outlet (data already fetched outside tx)
            for (let pi = 0; pi < masterProjectsSnap.docs.length; pi++) {
                const projDoc = masterProjectsSnap.docs[pi];
                const masterProject = projDoc.data();
                const masterProjectId = projDoc.id;
                const timestamp = Date.now().toString(36);
                const outletProjectId = `${tenantId}-${timestamp}${pi > 0 ? pi : ''}-${newStoreId}`;

                tx.set(
                    db.doc(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${newStoreId}/${outletProjectId}`),
                    {
                        projectId: outletProjectId,
                        masterProjectId,
                        projectType: 'inherited',
                        outletStatus: 'active',
                        files: [],
                        active: true,
                        deleted: false,
                        overrides: { items: {}, categories: {}, attributes: {} },
                        config: masterProject.config || {},
                    },
                );

                tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/projects_${newStoreId}`), {
                    lastUpdated: now,
                    [`projects.${outletProjectId}`]: {
                        name: masterProject.name || projDoc.id,
                        active: true,
                    },
                }, { merge: true });
            }

            return { newStoreId, outletSlug, tenantName };
        });
        revalidateTag(`menu-store-${result.newStoreId}`);
        revalidateTag(`store-${result.newStoreId}`);
        revalidateTag('client-stores');

        return NextResponse.json({
            success: true,
            storeId: result.newStoreId,
            outletSlug: result.outletSlug,
            outletName,
            tenantName: result.tenantName,
            quantity: subId ? newQty : null,
        });
    } catch (error) {
        const errMsg = (error as Error).message;

        // Handle lock contention gracefully
        if (errMsg === "LOCK_HELD") {
            return NextResponse.json({ error: "Another outlet is being created" }, { status: 409 });
        }

        secureError("[Outlets] Create failed", error as Error, { tenantId, storeId });

        // BE1: If billing updated but internal creation failed, revert Razorpay quantity
        if (billingUpdated && providerSubId) {
            try {
                await razorpayClient.subscriptions.update(providerSubId, {
                    quantity: previousQty,
                });
                if (subId) await updateSubscription(subId, { quantity: previousQty });
            } catch (revertErr) {
                secureError("[Outlets] CRITICAL: Billing revert failed", revertErr as Error, {
                    tenantId, storeId, previousQty,
                });
            }
        }

        // Best-effort lock release
        try {
            await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).update({ outletCreationLock: false });
        } catch (_) { /* best-effort */ }

        return NextResponse.json({ error: "Outlet creation failed" }, { status: 500 });
    }
});
