export const dynamic = 'force-dynamic';
/**
 * POST /api/outlets/create — internal outlet creation
 * Billing-first: Razorpay-managed accounts update provider quantity before
 * creation; manual/offline accounts must already have prepaid capacity.
 * @see __docs__/multi-outlet-consistency/store-onboarding-billing_impl.md §5
 */
import { getDefaultTimeSlotPresets } from "@config/defaultTimeSlotPresets";
import { FEATURE_FLAGS } from "@config/features";
import { resolveStoreBusinessCategory } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { isReservedOutletSlug } from "@constant/reservedSlugs";
import { createDefaultRoles, getOwnerRoleId } from "@data/defaultRoles";
import { getActiveSubscriptionForStore, updateSubscription } from "@database/subscriptions/server";
import { admin } from "@lib/firebase/firebaseAdmin";
import {
    getRazorpayManagedSubscriptionId,
    isRazorpayQuantityUpdateUnsupported,
    updateRazorpaySubscriptionQuantity,
} from "@lib/billing/subscriptionProviderSync";
import { buildUserStoreAccessUpdate } from "@lib/multiOutlet/serverStoreAccess";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { buildSummaryProjectPayload } from "@lib/firestore/summaryProjectsWriter";
import { DEFAULT_OUTLET_POLICY } from "@type/multiOutlet.types";
import { slugify } from "@lib/utils/slugify";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const schema = z.object({ outletName: z.string().min(1).max(200) });

class OutletBillingUpdateError extends Error {
    reason: "UPI_SUBSCRIPTION_QUANTITY_UNSUPPORTED" | "PROVIDER_QUANTITY_UPDATE_FAILED";

    constructor(
        cause: unknown,
        reason: "UPI_SUBSCRIPTION_QUANTITY_UNSUPPORTED" | "PROVIDER_QUANTITY_UPDATE_FAILED",
    ) {
        super("OUTLET_BILLING_UPDATE_FAILED");
        this.name = "OutletBillingUpdateError";
        this.cause = cause;
        this.reason = reason;
    }
}

const resolveSummaryNameForSlug = (value: unknown, fallback: string): string => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        const preferred = record.en || record["en-US"] || Object.values(record).find((entry) => (
            typeof entry === "string" && entry.trim()
        ));
        if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
    }
    return fallback;
};

const normalizeOutletSlugBase = (outletName: string): string => {
    const base = slugify(outletName) || `outlet-${Date.now().toString(36)}`;
    return isReservedOutletSlug(base) ? `${base}-outlet` : base;
};

const outletSlugExists = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    outletSlug: string,
): Promise<boolean> => {
    const [directSnap, historySnap] = await Promise.all([
        db.collection(DB_COLLECTIONS.STORES)
            .where("tenantId", "==", tenantId)
            .where("outletSlug", "==", outletSlug)
            .where("active", "==", true)
            .limit(1)
            .get(),
        db.collection(DB_COLLECTIONS.STORES)
            .where("tenantId", "==", tenantId)
            .where("previousOutletSlugs", "array-contains", outletSlug)
            .limit(1)
            .get(),
    ]);
    return !directSnap.empty || !historySnap.empty;
};

const buildUniqueOutletSlug = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    outletName: string,
): Promise<string> => {
    const base = normalizeOutletSlugBase(outletName);
    let candidate = base;
    let suffix = 2;

    while (await outletSlugExists(db, tenantId, candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
        if (suffix > 100) {
            candidate = `${base}-${Date.now().toString(36)}`;
            if (!(await outletSlugExists(db, tenantId, candidate))) return candidate;
        }
    }

    return candidate;
};

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
    let newQty = 1;
    let subId: string | undefined;
    let providerSubId: string | undefined;
    let masterPromoted = false;
    let lockAcquired = false;
    let subscriptionQuantityUpdated = false;

    try {
        const body = await request.json();
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { outletName } = v.data;

        const masterStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeId}`);
        const storeSnap = await masterStoreRef.get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }
        let masterStore = storeSnap.data()!;
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            masterStore,
            [PERMISSIONS.MANAGE_OUTLETS],
            "Outlet creation",
            Number(storeId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;

        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`);
        const initialTenantSnap = await tenantRef.get();
        const initialStoresList = initialTenantSnap.data()?.storesList || [];
        const activeStoreCount = initialStoresList.filter((s: any) => s?.active !== false).length || 1;
        const targetQty = activeStoreCount + 1;
        const hasMasterStore = initialStoresList.some((s: any) => s?.isMaster === true);
        const masterListRepairNeeded = masterStore.isMaster === true && !hasMasterStore;
        masterPromoted = (
            masterStore.isMaster !== true
            && !hasMasterStore
            && initialStoresList.length === 1
            && Number(initialStoresList[0]?.storeId) === Number(storeId)
        );

        // Validate: current store must be master. Legacy single-store tenants
        // are promoted atomically during first outlet creation.
        if (masterStore.isMaster !== true && !masterPromoted) {
            return NextResponse.json({ error: "Only master store can add outlets" }, { status: 403 });
        }
        if (masterPromoted) {
            masterStore = {
                ...masterStore,
                isMaster: true,
                outletPolicy: masterStore.outletPolicy || DEFAULT_OUTLET_POLICY,
            };
        }
        const shouldMarkCurrentStoreAsMasterInTenant = masterPromoted || masterListRepairNeeded;

        // Enforce outlet count limit (excludes master store)
        const maxOutlets = FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT;
        if (maxOutlets > 0) {
            const currentOutlets = initialStoresList.filter((s: any) => (
                Number(s?.storeId) !== Number(storeId) && !s.isMaster
            )).length;
            if (currentOutlets >= maxOutlets) {
                return NextResponse.json({ error: `Maximum ${maxOutlets} outlets reached` }, { status: 400 });
            }
        }

        const sub = await getActiveSubscriptionForStore(tenantId, storeId);
        if (FEATURE_FLAGS.ENABLE_OUTLET_BILLING) {
            if (!sub) {
                return NextResponse.json(
                    { error: "Choose an active plan before adding another location" },
                    { status: 402 },
                );
            }
            if (sub.status !== 'active') {
                return NextResponse.json(
                    { error: "Billing needs attention before adding another location" },
                    { status: 402 },
                );
            }
            subId = sub.id;
            providerSubId = getRazorpayManagedSubscriptionId(sub) || undefined;
            previousQty = Math.max(1, Number(sub.quantity || 1));

            const hasPrepaidCapacity = previousQty >= targetQty;
            if (!hasPrepaidCapacity && !providerSubId) {
                const manualCapacityMessage = sub.billingMode === 'manual'
                    ? "Ask your reseller to add prepaid location capacity before adding another location"
                    : "Billing needs attention before adding another location";
                return NextResponse.json(
                    { error: manualCapacityMessage },
                    { status: 402 },
                );
            }
        } else if (sub) {
            subId = sub.id;
            providerSubId = getRazorpayManagedSubscriptionId(sub) || undefined;
            previousQty = Math.max(1, Number(sub.quantity || 1));
        }

        // Acquire creation lock ATOMICALLY via transaction (Architecture Audit §3.2a)
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
        lockAcquired = true;

        // ═══ PATH 1: BILLING (must succeed BEFORE internal creation — Rule 3) ═══
        newQty = Math.max(previousQty, targetQty);
        const hasExistingBillingCapacity = previousQty >= targetQty;
        if (FEATURE_FLAGS.ENABLE_OUTLET_BILLING && sub?.status === 'active' && providerSubId && !hasExistingBillingCapacity) {
            try {
                await updateRazorpaySubscriptionQuantity(providerSubId, newQty);
                billingUpdated = true;
            } catch (billingError) {
                throw new OutletBillingUpdateError(
                    billingError,
                    isRazorpayQuantityUpdateUnsupported(billingError)
                        ? "UPI_SUBSCRIPTION_QUANTITY_UNSUPPORTED"
                        : "PROVIDER_QUANTITY_UPDATE_FAILED",
                );
            }
        }
        if (subId && newQty !== previousQty) {
            await updateSubscription(subId, { quantity: newQty });
            subscriptionQuantityUpdated = true;
        }

        // Pre-fetch master projects OUTSIDE transaction (Firestore requirement)
        const masterProjectsSnap = await db
            .collection(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`)
            .where('deleted', '!=', true)
            .get();
        const masterProjectsSummarySnap = await db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`projects_${storeId}`)
            .get();
        const masterProjectsSummary = masterProjectsSummarySnap.exists
            ? parseSummaryProjects(masterProjectsSummarySnap.data())
            : {};
        const outletSlug = await buildUniqueOutletSlug(db, tenantId, outletName);

        // Read current tenant data for storesList
        const tenantData = (await tenantRef.get()).data();

        // ═══ PATH 2: INTERNAL CREATION (atomic transaction) ═══
        const summaryRef = db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/summary`);
        const result = await db.runTransaction(async (tx) => {
            const summary = await tx.get(summaryRef);
            const userRef = session.uId ? db.doc(`${DB_COLLECTIONS.USERS}/${session.uId}`) : null;
            const userSnap = userRef ? await tx.get(userRef) : null;
            const newStoreId = (summary.data()?.stores?.count || 0) + 1;
            const storeKey = outletName.toLowerCase().replaceAll(" ", "_");
            const businessType = masterStore.businessType || 'restaurant';
            const businessCategory = resolveStoreBusinessCategory(businessType, masterStore.businessCategory);
            const defaultPresets = getDefaultTimeSlotPresets(businessType, tenantId, newStoreId, businessCategory);
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
            const storesSummaryPayload: Record<string, any> = {
                lastUpdated: now,
                stores: {
                    [newStoreId]: {
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
                },
            };
            if (shouldMarkCurrentStoreAsMasterInTenant) {
                storesSummaryPayload.stores[storeId] = {
                    isMaster: true,
                    modifiedOn: now,
                };
            }
            tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`), storesSummaryPayload, { merge: true });

            if (masterPromoted) {
                tx.set(masterStoreRef, {
                    isMaster: true,
                    outletPolicy: masterStore.outletPolicy || DEFAULT_OUTLET_POLICY,
                    modifiedOn: now,
                }, { merge: true });
            }

            // Update tenant storesList
            const currentStoresList = tenantData?.storesList || [];
            const normalizedStoresList = currentStoresList.map((store: any) => (
                shouldMarkCurrentStoreAsMasterInTenant && Number(store?.storeId) === Number(storeId)
                    ? { ...store, isMaster: true }
                    : store
            ));
            tx.update(tenantRef, {
                storesList: [...normalizedStoresList, {
                    active: true,
                    storeId: newStoreId,
                    name: outletName,
                    tenantName,
                    isMaster: false,
                    outletSlug,
                    previousOutletSlugs: [],
                }],
                outletCreationLock: false,
            });

            const userAccessUpdate = userSnap
                ? buildUserStoreAccessUpdate(userSnap.data(), newStoreId, outletName, getOwnerRoleId(newStoreId))
                : null;
            if (userRef && userAccessUpdate) {
                tx.set(userRef, userAccessUpdate, { merge: true });
            }

            // Update platform summary counts
            tx.update(summaryRef, { 'stores.count': newStoreId });

            // Replicate master projects to outlet (data already fetched outside tx)
            for (let pi = 0; pi < masterProjectsSnap.docs.length; pi++) {
                const projDoc = masterProjectsSnap.docs[pi];
                const masterProject = projDoc.data();
                const masterProjectId = projDoc.id;
                const masterSummary = masterProjectsSummary[masterProjectId] || {};
                const timestamp = Date.now().toString(36);
                const outletProjectId = `${tenantId}-${timestamp}${pi > 0 ? pi : ''}-${newStoreId}`;
                const masterSummaryName = masterSummary.name || masterProject.name || projDoc.id;
                const outletProjectSlug = typeof masterSummary.slug === "string" && masterSummary.slug.trim()
                    ? masterSummary.slug.trim()
                    : slugify(resolveSummaryNameForSlug(masterSummaryName, projDoc.id));
                const outletSummaryData = Object.fromEntries(
                    Object.entries({
                        ...masterSummary,
                        projectId: outletProjectId,
                        masterProjectId,
                        name: masterSummaryName,
                        active: masterSummary.active !== false && masterProject.active !== false,
                        isDefault: masterSummary.isDefault === true,
                        slug: outletProjectSlug || undefined,
                    }).filter(([, value]) => value !== undefined),
                );

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
                    ...buildSummaryProjectPayload(outletProjectId, outletSummaryData),
                }, { merge: true });
            }

            return { newStoreId, outletSlug, tenantName };
        });
        revalidateTag(`menu-store-${result.newStoreId}`);
        revalidateTag(`store-${result.newStoreId}`);
        if (masterPromoted) {
            revalidateTag(`menu-store-${storeId}`);
            revalidateTag(`store-${storeId}`);
        }
        revalidateTag('client-stores');

        return NextResponse.json({
            success: true,
            storeId: result.newStoreId,
            outletSlug: result.outletSlug,
            outletName,
            masterPromoted,
            outletPolicy: masterPromoted ? masterStore.outletPolicy || DEFAULT_OUTLET_POLICY : null,
            tenantName: result.tenantName,
            quantity: subId ? newQty : null,
        });
    } catch (error) {
        const errMsg = (error as Error).message;
        const isBillingUpdateError = error instanceof OutletBillingUpdateError;

        // Handle lock contention gracefully
        if (errMsg === "LOCK_HELD") {
            return NextResponse.json({ error: "Another outlet is being created" }, { status: 409 });
        }

        secureError(
            isBillingUpdateError ? "[Outlets] Billing provider quantity update failed" : "[Outlets] Create failed",
            error as Error,
            { tenantId, storeId },
        );

        // BE1: If billing updated but internal creation failed, revert Razorpay quantity
        if (billingUpdated && providerSubId) {
            try {
                await updateRazorpaySubscriptionQuantity(providerSubId, previousQty);
            } catch (revertErr) {
                secureError("[Outlets] CRITICAL: Billing revert failed", revertErr as Error, {
                    tenantId, storeId, previousQty,
                });
            }
        }
        if (subscriptionQuantityUpdated && subId) {
            try {
                await updateSubscription(subId, { quantity: previousQty });
            } catch (revertErr) {
                secureError("[Outlets] CRITICAL: Subscription quantity revert failed", revertErr as Error, {
                    tenantId, storeId, previousQty,
                });
            }
        }

        // Best-effort lock release
        if (lockAcquired) {
            try {
                await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).update({ outletCreationLock: false });
            } catch (_) { /* best-effort */ }
        }

        if (isBillingUpdateError) {
            const billingError = error as OutletBillingUpdateError;
            const needsCheckout = billingError.reason === "UPI_SUBSCRIPTION_QUANTITY_UNSUPPORTED";
            return NextResponse.json(
                {
                    error: needsCheckout
                        ? "Add one paid location from Billing, then create this location."
                        : "Billing needs attention before adding another location",
                    code: needsCheckout
                        ? "OUTLET_LOCATION_PAYMENT_REQUIRED"
                        : "OUTLET_BILLING_UPDATE_FAILED",
                    billingAction: needsCheckout ? "ADD_PAID_LOCATION" : "CONTACT_SUPPORT",
                    reason: billingError.reason,
                    currentQuantity: previousQty,
                    targetQuantity: newQty,
                },
                { status: 402 },
            );
        }

        return NextResponse.json(
            { error: "Outlet creation failed" },
            { status: 500 },
        );
    }
});
