export const dynamic = 'force-dynamic';
/**
 * POST /api/outlets/create — internal outlet creation
 * Billing-first: Razorpay-managed accounts update provider quantity before
 * creation; manual/offline accounts must already have prepaid capacity.
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding-billing_impl.md §5
 */
import { getDefaultTimeSlotPresets } from "@config/defaultTimeSlotPresets";
import { FEATURE_FLAGS } from "@config/features";
import { FALLBACK_BUSINESS_TYPE, resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import {
    findNextAvailablePlatformEntityId,
    LEGACY_PLATFORM_COUNTER_DOCUMENT_ID,
    PLATFORM_COUNTER_DOCUMENT_ID,
    resolvePlatformCounterFloor,
} from "@data/shared/platformCounterBoundary";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { MENULIST_B2C_PLAN_IDS } from "@constant/menulistPlans";
import { resolveMenuListQuantityCreditUpdate } from "@data/shared/contentCreditPolicy";
import { resizeMenuListTaxSnapshot, type MenuListTaxSnapshot } from "@data/shared/billingTaxPolicy";
import { isReservedOutletSlug } from "@constant/reservedSlugs";
import { createDefaultRoles, getOwnerRoleId } from "@data/defaultRoles";
import { getActiveSubscriptionForStore, updateSubscription } from "@database/subscriptions/server";
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { admin } from "@lib/firebase/firebaseAdmin";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import {
    getRazorpayManagedSubscriptionId,
    isRazorpayQuantityUpdateUnsupported,
    updateRazorpaySubscriptionQuantity,
} from "@lib/billing/subscriptionProviderSync";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { getOutletSessionScope } from "@lib/multiOutlet/outletSessionScope";
import { isMultiOutletTenantStoreListEntryInScope } from "@lib/multiOutlet/projectIdBoundary";
import { normalizePersistedOutletPolicy } from "@lib/multiOutlet/outletPolicyBoundary";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import {
    buildUserStoreAccessUpdate,
    normalizeUserStoreAccessDocumentId,
} from "@lib/multiOutlet/serverStoreAccess";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { buildSummaryProjectPayload } from "@lib/firestore/summaryProjectsWriter";
import {
    isOutletSlugUnavailableError,
    isValidOutletSlugClaimCandidate,
    readOutletSlugReservationInTransaction,
    type OutletSlugReservation,
    writeCurrentOutletSlugClaim,
} from "@lib/routing/outletSlugClaim";
import { slugify } from "@lib/utils/slugify";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

const OUTLET_SESSION_DOCUMENT_ID_MAX_LENGTH = 160;
const schema = z.object({
    expectedStoreId: z.string().trim().min(1).max(OUTLET_SESSION_DOCUMENT_ID_MAX_LENGTH),
    expectedTenantId: z.string().trim().min(1).max(OUTLET_SESSION_DOCUMENT_ID_MAX_LENGTH),
    outletName: z.string().trim().min(1).max(200),
}).strict();
const OUTLET_ACTION_MAX_BODY_BYTES = 8 * 1024;
const OUTLET_CREATE_EFFECT_CHUNK_SIZE = 2;
const MAX_OUTLET_CREATION_MASTER_PROJECTS = 200;
const OUTLET_CREATE_LOCK_HELD_CODE = "LOCK_HELD";
const OUTLET_CREATE_SCOPE_CHANGED_CODE = "OUTLET_CREATE_SCOPE_CHANGED";

class OutletCreateLockHeldError extends Error {
    readonly code = OUTLET_CREATE_LOCK_HELD_CODE;

    constructor() {
        super(OUTLET_CREATE_LOCK_HELD_CODE);
        this.name = "OutletCreateLockHeldError";
    }
}

const isOutletCreateLockHeldError = (error: unknown): error is OutletCreateLockHeldError => (
    error instanceof OutletCreateLockHeldError
    || (
        typeof error === "object"
        && error !== null
        && (error as { code?: unknown }).code === OUTLET_CREATE_LOCK_HELD_CODE
    )
);

class OutletCreateScopeChangedError extends Error {
    readonly code = OUTLET_CREATE_SCOPE_CHANGED_CODE;

    constructor() {
        super(OUTLET_CREATE_SCOPE_CHANGED_CODE);
        this.name = "OutletCreateScopeChangedError";
    }
}

const isOutletCreateScopeChangedError = (error: unknown): error is OutletCreateScopeChangedError => (
    error instanceof OutletCreateScopeChangedError
    || (
        typeof error === "object"
        && error !== null
        && (error as { code?: unknown }).code === OUTLET_CREATE_SCOPE_CHANGED_CODE
    )
);

class OutletBillingUpdateError extends Error {
    cause: unknown;
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

const getOutletCreateLogContext = (
    tenantId: string | number,
    storeId: string | number,
    extra: Record<string, boolean | number | string | null | undefined> = {},
) => ({
    ...getBoundedMultiOutletStringContext("tenantId", tenantId),
    ...getBoundedMultiOutletStringContext("storeId", storeId),
    ...extra,
});

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
    const rawBase = slugify(outletName).slice(0, 60).replace(/-+$/g, '') || 'outlet';
    const base = isReservedOutletSlug(rawBase) ? `${rawBase.slice(0, 53).replace(/-+$/g, '')}-outlet` : rawBase;
    return isValidOutletSlugClaimCandidate(base) ? base : 'outlet';
};

const buildOutletSlugCandidates = (
    outletName: string,
    storeId: number,
): string[] => {
    const base = normalizeOutletSlugBase(outletName);
    const withSuffix = (suffix: string) => `${base.slice(0, 60 - suffix.length).replace(/-+$/g, '')}${suffix}`;
    return Array.from(new Set([
        base,
        ...Array.from({ length: 9 }, (_, index) => withSuffix(`-${index + 2}`)),
        withSuffix(`-${storeId}`),
        `outlet-${storeId}`,
    ])).filter((candidate) => (
        isValidOutletSlugClaimCandidate(candidate) && !isReservedOutletSlug(candidate)
    ));
};

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_OUTLET_CREATION) {
        return NextResponse.json({ error: "Outlet creation disabled" }, { status: 403 });
    }
    const scope = getOutletSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);
    const rlResult = await checkRateLimit({ key: `outlet:${tenantRateLimitHash}`, limit: 5, window: 3600 });
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
    let previousTaxSnapshot: MenuListTaxSnapshot | undefined;
    let previousQuantityCreditState: {
        monthlyCredits: number;
        monthlyCreditsAllowance: number;
    } | null = null;
    let masterPromoted = false;
    let lockAcquired = false;
    let subscriptionQuantityUpdated = false;

    try {
        const bodyResult = await readBoundedJsonBody(request, OUTLET_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: "Invalid input",
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data;
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { expectedStoreId, expectedTenantId, outletName } = v.data;
        if (expectedStoreId !== storeDocumentId || expectedTenantId !== tenantDocumentId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const sessionUserDocumentId = normalizeUserStoreAccessDocumentId(session.uId || session.user?.id);
        if (!sessionUserDocumentId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const masterStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeDocumentId}`);
        const storeSnap = await masterStoreRef.get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }
        let masterStore = storeSnap.data()!;
        if (
            Number(masterStore.tenantId) !== Number(tenantId)
            || masterStore.active === false
            || masterStore.deleted === true
            || isPlatformEntityBlocked(masterStore)
        ) {
            return NextResponse.json({ error: "Store not available" }, { status: 403 });
        }
        const permissionError = await requireAnyStorePermissionForStoreData(
            request,
            session,
            masterStore,
            [PERMISSIONS.MANAGE_OUTLETS],
            "Outlet creation",
            Number(storeId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;

        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`);
        const initialTenantSnap = await tenantRef.get();
        const initialTenant = initialTenantSnap.data();
        if (
            !initialTenantSnap.exists
            || initialTenant?.active === false
            || initialTenant?.deleted === true
            || isPlatformEntityBlocked(initialTenant)
        ) {
            return NextResponse.json({ error: "Account not available" }, { status: 403 });
        }
        const initialStoresList = Array.isArray(initialTenant?.storesList) ? initialTenant.storesList : [];
        const activeStoreCount = initialStoresList.filter((store: unknown) => (
            isMultiOutletTenantStoreListEntryInScope(store, {})
        )).length || 1;
        const targetQty = activeStoreCount + 1;
        const hasMasterStore = initialStoresList.some((store: unknown) => (
            isMultiOutletTenantStoreListEntryInScope(store, { isMaster: true })
        ));
        masterPromoted = (
            masterStore.isMaster !== true
            && !hasMasterStore
            && initialStoresList.length === 1
            && isMultiOutletTenantStoreListEntryInScope(initialStoresList[0], {
                storeId: Number(storeId),
            })
        );

        // Validate: current store must be master. Legacy single-store tenants
        // are promoted atomically during first outlet creation.
        if (masterStore.isMaster !== true && !masterPromoted) {
            return NextResponse.json({ error: "Only master store can add outlets" }, { status: 403 });
        }
        if (masterPromoted) {
            const promotedOutletPolicy = normalizePersistedOutletPolicy(masterStore.outletPolicy);
            if (!promotedOutletPolicy) {
                return NextResponse.json({ error: "Store not available" }, { status: 409 });
            }
            masterStore = {
                ...masterStore,
                isMaster: true,
                outletPolicy: promotedOutletPolicy,
            };
        }
        // Enforce outlet count limit against active outlets only. Deactivated
        // outlets preserve history, but should not block replacement locations.
        const maxOutlets = FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT;
        if (maxOutlets > 0) {
            const currentOutlets = initialStoresList.filter((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { isMaster: false })
                && !isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })
            )).length;
            if (currentOutlets >= maxOutlets) {
                return NextResponse.json({ error: `Maximum ${maxOutlets} outlets reached` }, { status: 400 });
            }
        }

        const sub = await getActiveSubscriptionForStore(tenantId as number, storeId as number);
        previousTaxSnapshot = sub?.taxSnapshot;
        if (sub?.planId === MENULIST_B2C_PLAN_IDS.MULTI_LOCATION) {
            previousQuantityCreditState = {
                monthlyCredits: Number(sub.monthlyCredits || 0),
                monthlyCreditsAllowance: Number(sub.monthlyCreditsAllowance || 0),
            };
        }
        if (FEATURE_FLAGS.ENABLE_OUTLET_BILLING) {
            if (!sub) {
                return NextResponse.json(
                    { error: "Choose an active plan before adding another location" },
                    { status: 402 },
                );
            }
            if (sub.status !== 'active' || !hasValidSubscriptionAccess(sub)) {
                return NextResponse.json(
                    { error: "Billing needs attention before adding another location" },
                    { status: 402 },
                );
            }
            if (sub.billingMode !== 'manual' && sub.planId !== MENULIST_B2C_PLAN_IDS.MULTI_LOCATION) {
                return NextResponse.json(
                    { error: "Choose the Multi-location plan before adding another location" },
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
            const tenantData = tenantDoc.data();
            if (
                !tenantDoc.exists
                || tenantData?.active === false
                || tenantData?.deleted === true
                || isPlatformEntityBlocked(tenantData)
            ) {
                throw new OutletCreateScopeChangedError();
            }
            if (tenantData?.outletCreationLock) {
                const lockAge = Date.now() - (tenantData.outletCreationLockAt?.toMillis() || 0);
                if (lockAge < 300_000) throw new OutletCreateLockHeldError();
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
        if (FEATURE_FLAGS.ENABLE_OUTLET_BILLING && subId && newQty !== previousQty) {
            await updateSubscription(subId, {
                quantity: newQty,
                ...(sub?.taxSnapshot ? {
                    taxSnapshot: resizeMenuListTaxSnapshot(sub.taxSnapshot, newQty),
                } : {}),
                ...(sub?.planId === MENULIST_B2C_PLAN_IDS.MULTI_LOCATION
                    ? resolveMenuListQuantityCreditUpdate({
                        currentMonthlyCredits: sub.monthlyCredits,
                        currentMonthlyCreditsAllowance: sub.monthlyCreditsAllowance,
                        planId: sub.planId,
                        quantity: newQty,
                    })
                    : {}),
            });
            subscriptionQuantityUpdated = true;
        }

        const masterProjectsQuery = db.collection(
            `${DB_COLLECTIONS.PROJECTS}/${tenantDocumentId}/${storeDocumentId}`,
        );
        const masterProjectsSummaryRef = db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`projects_${storeDocumentId}`);
        // ═══ PATH 2: INTERNAL CREATION (atomic transaction) ═══
        const summaryRef = db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/${PLATFORM_COUNTER_DOCUMENT_ID}`);
        const legacySummaryRef = db.doc(
            `${DB_COLLECTIONS.PLATFORM_SUMMARY}/${LEGACY_PLATFORM_COUNTER_DOCUMENT_ID}`,
        );
        const storesSummaryRef = db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`);
        const result = await db.runTransaction(async (tx) => {
            const userRef = db.collection(DB_COLLECTIONS.USERS).doc(sessionUserDocumentId);
            const [
                summary,
                legacySummary,
                storesSummary,
                userSnap,
                freshTenantSnap,
                freshMasterSnap,
                freshMasterProjectsSnap,
                freshMasterProjectsSummarySnap,
            ] = await Promise.all([
                tx.get(summaryRef),
                tx.get(legacySummaryRef),
                tx.get(storesSummaryRef),
                tx.get(userRef),
                tx.get(tenantRef),
                tx.get(masterStoreRef),
                tx.get(masterProjectsQuery),
                tx.get(masterProjectsSummaryRef),
            ]);
            if (!freshTenantSnap.exists || !userSnap.exists || !freshMasterSnap.exists) {
                throw new OutletCreateScopeChangedError();
            }
            const freshTenantData = freshTenantSnap.data() || {};
            const freshMasterStore = freshMasterSnap.data() || {};
            if (
                freshTenantData.active === false
                || freshTenantData.deleted === true
                || isPlatformEntityBlocked(freshTenantData)
                || Number(freshMasterStore.tenantId) !== Number(tenantId)
                || freshMasterStore.active === false
                || freshMasterStore.deleted === true
                || isPlatformEntityBlocked(freshMasterStore)
            ) {
                throw new OutletCreateScopeChangedError();
            }
            const freshPermissionError = await requireAnyStorePermissionForStoreData(
                request,
                session,
                freshMasterStore,
                [PERMISSIONS.MANAGE_OUTLETS],
                "Outlet creation",
                Number(storeId),
                Number(tenantId),
            );
            if (freshPermissionError) throw new OutletCreateScopeChangedError();
            const currentStoresList = Array.isArray(freshTenantData.storesList) ? freshTenantData.storesList : [];
            const freshCurrentStoreSummary = currentStoresList.find((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })
            ));
            const freshHasMasterStore = currentStoresList.some((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { isMaster: true })
            ));
            const freshMasterPromoted = (
                freshMasterStore.isMaster !== true
                && !freshHasMasterStore
                && currentStoresList.length === 1
                && isMultiOutletTenantStoreListEntryInScope(currentStoresList[0], {
                    storeId: Number(storeId),
                })
            );
            if (freshMasterStore.isMaster !== true && !freshMasterPromoted) {
                throw new OutletCreateScopeChangedError();
            }
            if (
                !freshCurrentStoreSummary
                || freshCurrentStoreSummary.active === false
                || (
                    freshHasMasterStore
                    && freshMasterStore.isMaster === true
                    && freshCurrentStoreSummary.isMaster !== true
                )
            ) {
                throw new OutletCreateScopeChangedError();
            }
            const freshMasterListRepairNeeded = freshMasterStore.isMaster === true && !freshHasMasterStore;
            const shouldMarkCurrentStoreAsMasterInTenant = freshMasterPromoted || freshMasterListRepairNeeded;
            const freshActiveStoreCount = currentStoresList.filter((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, {})
            )).length || 1;
            if (FEATURE_FLAGS.ENABLE_OUTLET_BILLING && freshActiveStoreCount + 1 > newQty) {
                throw new OutletCreateScopeChangedError();
            }
            const freshOutletCount = currentStoresList.filter((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { isMaster: false })
                && !isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })
            )).length;
            if (maxOutlets > 0 && freshOutletCount >= maxOutlets) {
                throw new OutletCreateScopeChangedError();
            }
            masterPromoted = freshMasterPromoted;
            const freshOutletPolicy = normalizePersistedOutletPolicy(freshMasterStore.outletPolicy);
            if (freshMasterPromoted && !freshOutletPolicy) {
                throw new OutletCreateScopeChangedError();
            }
            masterStore = freshMasterPromoted
                ? {
                    ...freshMasterStore,
                    isMaster: true,
                    outletPolicy: freshOutletPolicy,
                }
                : freshMasterStore;
            const masterProjectsSummary = freshMasterProjectsSummarySnap.exists
                ? parseSummaryProjects(freshMasterProjectsSummarySnap.data())
                : {};
            const masterProjectDocs = freshMasterProjectsSnap.docs.filter((projectDocument) => {
                const project = projectDocument.data();
                return project.deleted !== true
                    && !project.masterProjectId
                    && project.projectType !== 'localOnly';
            });
            if (masterProjectDocs.length > MAX_OUTLET_CREATION_MASTER_PROJECTS) {
                throw new OutletCreateScopeChangedError();
            }
            const storeCounterFloor = resolvePlatformCounterFloor(
                summary.data(),
                legacySummary.data(),
                storesSummary.data(),
                'store',
            );
            const newStoreId = await findNextAvailablePlatformEntityId(
                storeCounterFloor,
                async (candidateId) => (
                    await tx.get(db.doc(`${DB_COLLECTIONS.STORES}/${candidateId}`))
                ).exists,
            );
            const newStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${newStoreId}`);
            let outletSlug = '';
            let outletSlugReservation: OutletSlugReservation | null = null;
            for (const candidate of buildOutletSlugCandidates(outletName, newStoreId)) {
                try {
                    outletSlugReservation = await readOutletSlugReservationInTransaction({
                        db,
                        outletSlug: candidate,
                        storeId: String(newStoreId),
                        tenantId: tenantDocumentId,
                        transaction: tx,
                    });
                    outletSlug = candidate;
                    break;
                } catch (error) {
                    if (isOutletSlugUnavailableError(error)) continue;
                    throw error;
                }
            }
            if (!outletSlug || !outletSlugReservation) throw new Error('outlet_slug_allocation_exhausted');
            const storeKey = outletName.toLowerCase().replaceAll(" ", "_");
            const businessType = masterStore.businessType || FALLBACK_BUSINESS_TYPE;
            const businessCategory = resolveStoreBusinessCategory(businessType, masterStore.businessCategory);
            const defaultPresets = getDefaultTimeSlotPresets(businessType, tenantId as number, newStoreId, businessCategory);
            const roles = createDefaultRoles(newStoreId, session.user?.email || 'system');
            const tenantName = freshTenantData.name || masterStore.tenantName || '';

            // Create outlet store doc
            // Copy brand identity from master store so outlets render correctly
            // without needing a tenant-level fetch. Location-specific fields
            // (name, addressLine, workingHours) are set by outlet owner later.
            // @see __docs__/official-business-page/official-business-page_impl.md §2
            tx.set(newStoreRef, {
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
            writeCurrentOutletSlugClaim(tx, outletSlugReservation, now);

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
                storesSummaryPayload.stores[storeDocumentId] = {
                    isMaster: true,
                    modifiedOn: now,
                };
            }
            tx.set(storesSummaryRef, storesSummaryPayload, { merge: true });

            if (masterPromoted) {
                tx.set(masterStoreRef, {
                    isMaster: true,
                    outletPolicy: masterStore.outletPolicy,
                    modifiedOn: now,
                }, { merge: true });
            }

            // Update tenant storesList
            const normalizedStoresList = currentStoresList.map((store: unknown) => (
                shouldMarkCurrentStoreAsMasterInTenant
                    && isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })
                    ? { ...store, isMaster: true }
                    : store
            ));
            tx.update(tenantRef, {
                storesList: [...normalizedStoresList, {
                    active: true,
                    storeId: newStoreId,
                    storeKey,
                    name: outletName,
                    tenantName,
                    isMaster: false,
                    outletSlug,
                    previousOutletSlugs: [],
                }],
                outletCreationLock: false,
            });

            const userAccessUpdate = buildUserStoreAccessUpdate(
                userSnap.data(),
                newStoreId,
                outletName,
                getOwnerRoleId(newStoreId),
            );
            if (!userAccessUpdate) throw new OutletCreateScopeChangedError();
            tx.set(userRef, userAccessUpdate, { merge: true });

            // Update platform summary counts
            tx.set(summaryRef, {
                stores: { count: newStoreId },
                modifiedOn: now,
            }, { merge: true });

            // Replicate master projects to outlet (data already fetched outside tx)
            for (let pi = 0; pi < masterProjectDocs.length; pi++) {
                const projDoc = masterProjectDocs[pi];
                const masterProject = projDoc.data();
                const masterProjectId = projDoc.id;
                const masterSummary = masterProjectsSummary[masterProjectId] || {};
                const timestamp = Date.now().toString(36);
                const outletProjectId = `${tenantDocumentId}-${timestamp}${pi > 0 ? pi : ''}-${newStoreId}`;
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
                    db.doc(`${DB_COLLECTIONS.PROJECTS}/${tenantDocumentId}/${newStoreId}/${outletProjectId}`),
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

            return { newStoreId, outletSlug, storeKey, tenantName };
        });
        const newStoreDocumentId = String(result.newStoreId);
        const postCommit = await runStorePublicTruthPostCommitEffects({
            chunkSize: OUTLET_CREATE_EFFECT_CHUNK_SIZE,
            storeIds: [newStoreDocumentId, ...(masterPromoted ? [storeDocumentId] : [])],
            tenantId: tenantDocumentId,
            deps: {
                invalidateAssistant: (effectStoreId, effectTenantId) => (
                    invalidateOwnerBusinessAssistantPacketCache({ tId: effectTenantId, sId: effectStoreId })
                ),
                revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                touchScreen: (effectStoreId) => touchDigitalScreenContentVersionForStoreServer(
                    effectStoreId,
                    effectStoreId === newStoreDocumentId ? 'outletCreate' : 'outletCreateMasterPromoted',
                ),
            },
        });
        if (postCommit.effectsPending) {
            logMultiOutletFailure('multi_outlet_create_post_commit_effect_failed', postCommit.firstError, {
                ...getOutletCreateLogContext(tenantDocumentId, storeDocumentId, {
                    failedEffectCount: postCommit.failedEffectCount,
                    masterPromoted,
                }),
                newStoreId: result.newStoreId,
            });
        }

        return NextResponse.json({
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
            success: true,
            storeId: result.newStoreId,
            storeKey: result.storeKey,
            outletSlug: result.outletSlug,
            outletName,
            masterPromoted,
            outletPolicy: masterPromoted ? masterStore.outletPolicy : null,
            tenantName: result.tenantName,
            quantity: subId ? newQty : null,
        });
    } catch (error) {
        const isBillingUpdateError = error instanceof OutletBillingUpdateError;
        const isScopeChangedError = isOutletCreateScopeChangedError(error);

        // Handle lock contention gracefully
        if (isOutletCreateLockHeldError(error)) {
            return NextResponse.json({ error: "Another outlet is being created" }, { status: 409 });
        }

        if (isBillingUpdateError) {
            const billingError = error as OutletBillingUpdateError;
            logMultiOutletFailure(
                billingError.reason === "UPI_SUBSCRIPTION_QUANTITY_UNSUPPORTED"
                    ? "multi_outlet_billing_upi_quantity_update_unsupported"
                    : "multi_outlet_billing_provider_quantity_update_failed",
                billingError.cause,
                getOutletCreateLogContext(tenantDocumentId, storeDocumentId, {
                    reason: billingError.reason,
                    previousQty,
                    newQty,
                    ...getBoundedMultiOutletStringContext("providerSubscriptionId", providerSubId),
                }),
            );
        } else if (!isScopeChangedError) {
            logMultiOutletFailure(
                "multi_outlet_create_failed",
                error,
                getOutletCreateLogContext(tenantDocumentId, storeDocumentId, {
                    lockAcquired,
                    billingUpdated,
                    subscriptionQuantityUpdated,
                }),
            );
        }

        // BE1: If billing updated but internal creation failed, revert Razorpay quantity
        if (billingUpdated && providerSubId) {
            try {
                await updateRazorpaySubscriptionQuantity(providerSubId, previousQty);
            } catch (revertErr) {
                logMultiOutletFailure(
                    "multi_outlet_billing_provider_quantity_revert_failed",
                    revertErr,
                    getOutletCreateLogContext(tenantDocumentId, storeDocumentId, {
                        previousQty,
                        ...getBoundedMultiOutletStringContext("providerSubscriptionId", providerSubId),
                    }),
                );
            }
        }
        if (subscriptionQuantityUpdated && subId) {
            try {
                await updateSubscription(subId, {
                    quantity: previousQty,
                    ...(previousTaxSnapshot ? {
                        taxSnapshot: resizeMenuListTaxSnapshot(previousTaxSnapshot, previousQty),
                    } : {}),
                    ...(previousQuantityCreditState || {}),
                });
            } catch (revertErr) {
                logMultiOutletFailure(
                    "multi_outlet_subscription_quantity_revert_failed",
                    revertErr,
                    getOutletCreateLogContext(tenantDocumentId, storeDocumentId, {
                        previousQty,
                        ...getBoundedMultiOutletStringContext("subscriptionId", subId),
                    }),
                );
            }
        }

        // Best-effort lock release
        if (lockAcquired) {
            try {
                await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`).update({ outletCreationLock: false });
            } catch (lockReleaseError) {
                logMultiOutletFailure(
                    "multi_outlet_create_lock_release_failed",
                    lockReleaseError,
                    getOutletCreateLogContext(tenantDocumentId, storeDocumentId, {
                        billingUpdated,
                        subscriptionQuantityUpdated,
                    }),
                );
            }
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

        if (isScopeChangedError) {
            return NextResponse.json(
                { error: "Outlet setup changed. Refresh and try again." },
                { status: 409 },
            );
        }

        return NextResponse.json(
            { error: "Outlet creation failed" },
            { status: 500 },
        );
    }
});
