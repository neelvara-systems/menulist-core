import {
    CAMPAIGNCUE_APPROVAL_ID_PREFIX,
    CAMPAIGNCUE_ASSET_ID_PREFIX,
    CAMPAIGNCUE_CAMPAIGN_ID_PREFIX,
    CAMPAIGNCUE_COLLECTIONS,
    CAMPAIGNCUE_DASHBOARD_SUMMARY_ID,
    CAMPAIGNCUE_EVENT_ID_PREFIX,
    CAMPAIGNCUE_PAGE_SIZE,
    CAMPAIGNCUE_SCHEDULE_ID_PREFIX,
    CAMPAIGNCUE_WORKSPACE_ID_PREFIX,
} from "@constant/campaigncue/database";
import { CAMPAIGNCUE_CHANNEL_LABELS } from "@constant/campaigncue/channels";
import {
    CAMPAIGNCUE_DAY_ONE_DELIVERY,
    CAMPAIGNCUE_DELIVERY_MODE,
    CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS,
    CAMPAIGNCUE_EXPORT_ACTIONS,
    CAMPAIGNCUE_FUTURE_PROVIDER_LAYER,
    CAMPAIGNCUE_PROVIDER_POSTURES,
} from "@constant/campaigncue/delivery";
import { CAMPAIGNCUE_ERROR_CODES } from "@constant/campaigncue/errors";
import { CAMPAIGNCUE_PRODUCT_ID } from "@constant/campaigncue/product";
import { buildCampaignCueAuthLaunchUrl as buildCampaignCueAuthLaunchUrlFromSignIn } from "@constant/campaigncue/routes";
import {
    CAMPAIGNCUE_DEFAULT_LOCALE,
    CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
    CAMPAIGNCUE_DEFAULT_TIMEZONE,
} from "@constant/campaigncue/workspace";
import { DB_COLLECTIONS } from "@constant/database";
import { SIGNIN_URL } from "@constant/urls";
import { FEATURE_FLAGS } from "@config/features";
import { admin, campaigncueFirestoreAdmin as firestoreAdmin } from "@lib/firebase/campaigncueFirebaseAdmin";
import { firestoreAdmin as menuListFirestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import type {
    CampaignCueActionType,
    CampaignCueAnalyticsSummary,
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueChannel,
    CampaignCueDeliveryPolicy,
    CampaignCueLaunchReadiness,
    CampaignCueLocation,
    CampaignCueMetricConfidence,
    CampaignCueOutput,
    CampaignCueOutputFields,
    CampaignCueOverview,
    CampaignCueOpportunity,
    CampaignCueProviderConnection,
    CampaignCueProviderMode,
    CampaignCueProviderStatus,
    CampaignCueSchedule,
    CampaignCueSourceFact,
    CampaignCueSourceInput,
    CampaignCueSourceSnapshot,
    CampaignCueTrustFinding,
    CampaignCueTrustGate,
    CampaignCueTrustReport,
    CampaignCueWorkspace,
} from "@type/campaigncue";
import type {
    CampaignCueAssetInput,
    CampaignCueBusinessPatchInput,
    CampaignCueCampaignActionInput,
    CampaignCueCreateCampaignInput,
    CampaignCueLocationInput,
    CampaignCueSourceInputData,
} from "@lib/validation/campaigncueSchemas";
import { createHash } from "crypto";

export interface CampaignCueSessionScope {
    email?: string;
    name?: string;
    sId: string;
    tId: string;
    userId: string;
}

const nowTimestamp = () => admin.firestore.Timestamp.now();

const compactString = (value: unknown, fallback = ""): string => {
    if (typeof value === "string") return value.trim() || fallback;
    if (value == null) return fallback;
    return String(value).trim() || fallback;
};

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value !== "object") return value;
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    if (typeof value?.toDate === "function" && typeof value?.seconds === "number") {
        return admin.firestore.Timestamp.fromDate(value.toDate());
    }
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, sanitizeForAdminFirestore(nested)]),
    );
};

const stableHash = (value: unknown) => (
    createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24)
);

const buildId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const hasOwn = <T extends object, K extends PropertyKey>(value: T, key: K) => (
    Object.prototype.hasOwnProperty.call(value, key)
);

const patchOptionalUrl = (
    input: CampaignCueBusinessPatchInput,
    key: "bookingUrl" | "logoUrl" | "publicMenuUrl" | "website",
    current?: string,
): string | undefined => {
    if (!hasOwn(input, key)) return current;
    const next = input[key];
    return next || undefined;
};

class CampaignCueIdempotencyConflictError extends Error {
    code = CAMPAIGNCUE_ERROR_CODES.IDEMPOTENCY_CONFLICT;
    status = 409 as const;

    constructor(message = "This CampaignCue request is already running or the idempotency key was reused.") {
        super(message);
        this.name = "CampaignCueIdempotencyConflictError";
    }
}

export const buildCampaignCueWorkspaceId = (scope: Pick<CampaignCueSessionScope, "tId" | "sId">) => (
    `${CAMPAIGNCUE_WORKSPACE_ID_PREFIX}_${scope.tId}_${scope.sId}`
);

const workspaceRef = (workspaceId: string) => (
    firestoreAdmin.collection(CAMPAIGNCUE_COLLECTIONS.WORKSPACES).doc(workspaceId)
);

const workspaceSubcollection = (workspaceId: string, collection: string) => (
    workspaceRef(workspaceId).collection(collection)
);

const defaultBusinessBrainId = "default";
const defaultSourceSnapshotId = "current";

async function readStoreData(scope: CampaignCueSessionScope): Promise<any | null> {
    const snap = await menuListFirestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(scope.sId).get();
    return snap.exists ? snap.data() : null;
}

function buildPublicMenuUrl(storeData: any): string | undefined {
    const directUrl = compactString(storeData?.publicMenuUrl || storeData?.menuUrl || storeData?.storeUrl);
    if (directUrl.startsWith("http://") || directUrl.startsWith("https://")) return directUrl;
    const subdomain = compactString(storeData?.subdomain || storeData?.storeUrlSlug || storeData?.slug);
    if (!subdomain) return undefined;
    return `https://${subdomain}.menulist.ai`;
}

function buildDefaultItems(storeData: any) {
    const candidates = [
        storeData?.featuredItemName,
        storeData?.bestSellerName,
        storeData?.primaryItemName,
        storeData?.name ? `${storeData.name} special` : "",
    ].filter(Boolean);
    const names = Array.from(new Set(candidates.length ? candidates : ["Featured item", "Daily offer"]));
    return names.slice(0, 4).map((name, index) => ({
        id: `item_${index + 1}`,
        name: compactString(name, `Item ${index + 1}`),
        category: index === 0 ? "Featured" : "Menu",
        priceLabel: compactString(storeData?.currencySymbol || storeData?.currency || ""),
        available: true,
        imageUrl: compactString(storeData?.logo || storeData?.logoUrl || ""),
        sourceRefs: ["store_profile"],
    }));
}

function inferBusinessType(storeData: any): CampaignCueBusinessBrain["businessType"] {
    const raw = compactString(
        storeData?.businessType || storeData?.type || storeData?.category || storeData?.storeType,
    ).toLowerCase();
    if (raw.includes("salon") || raw.includes("spa") || raw.includes("beauty")) return "salon";
    return "restaurant";
}

function buildBusinessBrain(params: {
    scope: CampaignCueSessionScope;
    storeData: any;
    workspaceId: string;
}): CampaignCueBusinessBrain {
    const { scope, storeData, workspaceId } = params;
    const businessType = inferBusinessType(storeData);
    const publicMenuUrl = buildPublicMenuUrl(storeData);
    const businessName = compactString(
        storeData?.businessName || storeData?.name || storeData?.storeName,
        scope.name || "CampaignCue business",
    );
    const locality = compactString(storeData?.locality || storeData?.city || storeData?.area || storeData?.address?.city);
    const website = compactString(storeData?.website || storeData?.websiteUrl || storeData?.domain || "");
    const phone = compactString(storeData?.phone || storeData?.phoneNumber || storeData?.contactNumber || "");
    const serviceFallback = {
        id: "service_1",
        name: businessType === "salon" ? "Featured service" : "Catering inquiry",
        category: businessType === "salon" ? "Services" : "Service",
        available: true,
        sourceRefs: ["store_profile"],
    };
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (!businessName) blockers.push("Business name is missing.");
    if (!publicMenuUrl && businessType === "restaurant") warnings.push("Public menu link is not connected.");
    if (!website && !phone) warnings.push("Campaign CTA needs a website, booking link, phone, or menu link.");
    const readinessStatus: CampaignCueBusinessBrain["readiness"]["status"] = blockers.length
        ? "blocked"
        : warnings.length
            ? "limited"
            : "ready";

    return {
        id: defaultBusinessBrainId,
        workspaceId,
        businessBrainId: defaultBusinessBrainId,
        businessType,
        name: businessName,
        locality,
        contacts: {
            phone,
            website: website.startsWith("http") ? website : undefined,
            whatsapp: phone,
            bookingUrl: compactString(storeData?.bookingUrl || ""),
            publicMenuUrl,
        },
        brandKit: {
            primaryColor: compactString(storeData?.brandColor || storeData?.primaryColor || CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR),
            logoUrl: compactString(storeData?.logo || storeData?.logoUrl || ""),
            voice: "friendly",
        },
        locale: compactString(storeData?.locale || CAMPAIGNCUE_DEFAULT_LOCALE),
        timezone: compactString(storeData?.timezone || CAMPAIGNCUE_DEFAULT_TIMEZONE),
        catalog: {
            items: buildDefaultItems(storeData),
            services: [serviceFallback],
        },
        sourceConfidence: publicMenuUrl || website || phone ? 0.72 : 0.54,
        readiness: {
            status: readinessStatus,
            blockers,
            warnings,
        },
        sourceSnapshotId: defaultSourceSnapshotId,
    };
}

function buildSourceSnapshot(
    businessBrain: CampaignCueBusinessBrain,
    sourceInputs: CampaignCueSourceInput[] = [],
): CampaignCueSourceSnapshot {
    const facts = buildSourceFacts(businessBrain, sourceInputs);
    const missingFacts = buildMissingSourceFacts(businessBrain, sourceInputs);
    const verticalRisks = buildVerticalRisks(businessBrain);
    return {
        id: defaultSourceSnapshotId,
        workspaceId: businessBrain.workspaceId,
        sourceType: sourceInputs.length ? "manual" : "menulist",
        sourceHash: stableHash(facts),
        sourceRefs: ["store_profile", ...sourceInputs.map((input) => input.id)],
        confidence: businessBrain.sourceConfidence,
        freshness: missingFacts.length ? "unknown" : "fresh",
        summary: `${businessBrain.name} ${businessBrain.locality ? `in ${businessBrain.locality}` : ""} · ${facts.length} saved facts`.trim(),
        facts,
        missingFacts,
        verticalRisks,
    };
}

function buildSourceFact(params: {
    confidence?: CampaignCueMetricConfidence;
    freshness?: CampaignCueSourceFact["freshness"];
    id: string;
    label: string;
    risk?: CampaignCueSourceFact["risk"];
    sourceRef: string;
    sourceType: CampaignCueSourceFact["sourceType"];
    value?: string;
}): CampaignCueSourceFact | null {
    const value = compactString(params.value);
    if (!value) return null;
    return {
        id: params.id,
        label: params.label,
        value,
        sourceRef: params.sourceRef,
        sourceType: params.sourceType,
        confidence: params.confidence || "observed",
        freshness: params.freshness || "fresh",
        risk: params.risk || "low",
    };
}

function sourceTypeToFactType(sourceType: CampaignCueSourceInput["sourceType"]): CampaignCueSourceFact["sourceType"] {
    if (sourceType === "offer") return "offer";
    if (sourceType === "event") return "event";
    if (sourceType === "upload_metadata") return "asset";
    if (sourceType === "menu_link" || sourceType === "booking_link") return "contact";
    return "manual";
}

function sourceInputToFacts(input: CampaignCueSourceInput): CampaignCueSourceFact[] {
    const fact = buildSourceFact({
        id: `${input.id}_fact`,
        label: input.label,
        value: input.value,
        sourceRef: input.id,
        sourceType: sourceTypeToFactType(input.sourceType),
        confidence: input.confidence,
        risk: input.status === "active" ? "low" : "needs_review",
    });
    return fact ? [fact] : [];
}

function buildSourceFacts(
    businessBrain: CampaignCueBusinessBrain,
    sourceInputs: CampaignCueSourceInput[] = [],
): CampaignCueSourceFact[] {
    const item = businessBrain.catalog.items.find((entry) => entry.available) || businessBrain.catalog.items[0];
    const service = businessBrain.catalog.services.find((entry) => entry.available) || businessBrain.catalog.services[0];
    const baseFacts = [
        buildSourceFact({
            id: "business_name",
            label: "Business name",
            value: businessBrain.name,
            sourceRef: "store_profile",
            sourceType: "business_profile",
        }),
        buildSourceFact({
            id: "business_area",
            label: "Area or city",
            value: businessBrain.locality,
            sourceRef: "store_profile",
            sourceType: "business_profile",
        }),
        buildSourceFact({
            id: "business_phone",
            label: "Phone",
            value: businessBrain.contacts.phone,
            sourceRef: "store_profile",
            sourceType: "contact",
        }),
        buildSourceFact({
            id: "business_whatsapp",
            label: "WhatsApp",
            value: businessBrain.contacts.whatsapp,
            sourceRef: "store_profile",
            sourceType: "contact",
        }),
        buildSourceFact({
            id: "business_booking",
            label: "Booking link",
            value: businessBrain.contacts.bookingUrl,
            sourceRef: "store_profile",
            sourceType: "contact",
        }),
        buildSourceFact({
            id: "business_menu",
            label: "Menu or service link",
            value: businessBrain.contacts.publicMenuUrl,
            sourceRef: "store_profile",
            sourceType: "contact",
        }),
        buildSourceFact({
            id: "primary_item",
            label: businessBrain.businessType === "salon" ? "Primary service" : "Primary item",
            value: businessBrain.businessType === "salon" ? service?.name : item?.name,
            sourceRef: "store_profile",
            sourceType: "menu_or_service",
        }),
        buildSourceFact({
            id: "brand_logo",
            label: "Logo or photo",
            value: businessBrain.brandKit.logoUrl,
            sourceRef: "store_profile",
            sourceType: "asset",
            risk: "needs_review",
        }),
    ].filter(Boolean) as CampaignCueSourceFact[];
    return [
        ...baseFacts,
        ...sourceInputs.flatMap(sourceInputToFacts),
    ];
}

function buildMissingSourceFacts(
    businessBrain: CampaignCueBusinessBrain,
    sourceInputs: CampaignCueSourceInput[] = [],
): string[] {
    const missing: string[] = [];
    const hasCta = Boolean(
        businessBrain.contacts.bookingUrl
        || businessBrain.contacts.publicMenuUrl
        || businessBrain.contacts.website
        || businessBrain.contacts.whatsapp
        || businessBrain.contacts.phone,
    );
    if (!hasCta) missing.push("Add one contact, booking, menu, or website link before posting.");
    if (businessBrain.businessType === "restaurant" && !businessBrain.contacts.publicMenuUrl) {
        missing.push("Add a public menu link so price and item details stay easy to verify.");
    }
    if (businessBrain.businessType === "salon" && !businessBrain.contacts.bookingUrl) {
        missing.push("Add a booking link or WhatsApp number before running booking-slot campaigns.");
    }
    if (!sourceInputs.some((input) => input.status === "active")) {
        missing.push("Add at least one ready offer, event, service, or menu note for today.");
    }
    return missing;
}

function buildVerticalRisks(businessBrain: CampaignCueBusinessBrain): string[] {
    if (businessBrain.businessType === "salon") {
        return [
            "Before/after photos need explicit consent before use.",
            "Beauty, wellness, or result claims must avoid guaranteed outcomes.",
        ];
    }
    return [
        "Menu price, item availability, and offer dates must match the saved source before posting.",
        "Food photos should not imply unavailable items or incorrect portion sizes.",
    ];
}

function buildWorkspace(params: {
    scope: CampaignCueSessionScope;
    storeData: any;
    workspaceId: string;
}): CampaignCueWorkspace {
    const createdAt = nowTimestamp();
    const name = compactString(
        params.storeData?.businessName || params.storeData?.name || params.storeData?.storeName,
        params.scope.name || "CampaignCue workspace",
    );
    return {
        id: params.workspaceId,
        workspaceId: params.workspaceId,
        productId: CAMPAIGNCUE_PRODUCT_ID,
        tId: params.scope.tId,
        sId: params.scope.sId,
        name,
        status: "active",
        billingStatus: "manual_beta",
        defaultRole: "owner",
        agencyMode: false,
        multiLocationMode: false,
        settings: {
            timezone: compactString(params.storeData?.timezone || CAMPAIGNCUE_DEFAULT_TIMEZONE),
            locale: compactString(params.storeData?.locale || CAMPAIGNCUE_DEFAULT_LOCALE),
            deliveryMode: CAMPAIGNCUE_DELIVERY_MODE,
            billingEnabled: FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_BILLING,
        },
        members: {
            [params.scope.userId]: {
                role: "owner",
                joinedAt: createdAt,
            },
        },
        createdAt,
        updatedAt: createdAt,
    };
}

function normalizeCampaignCueWorkspace(workspace: CampaignCueWorkspace): CampaignCueWorkspace {
    const settings = (workspace.settings || {}) as Partial<CampaignCueWorkspace["settings"]>;
    return {
        ...workspace,
        settings: {
            timezone: compactString(settings.timezone, CAMPAIGNCUE_DEFAULT_TIMEZONE),
            locale: compactString(settings.locale, CAMPAIGNCUE_DEFAULT_LOCALE),
            deliveryMode: CAMPAIGNCUE_DELIVERY_MODE,
            billingEnabled: Boolean(
                (settings.billingEnabled ?? FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_BILLING)
                && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_BILLING,
            ),
        },
        members: workspace.members || {},
    };
}

function dashboardSummarySeed(workspaceId: string): CampaignCueAnalyticsSummary {
    const now = nowTimestamp();
    return {
        id: CAMPAIGNCUE_DASHBOARD_SUMMARY_ID,
        workspaceId,
        campaignCount: 0,
        usedCount: 0,
        exportCount: 0,
        approvalRequestCount: 0,
        manualFallbackCount: 0,
        ownerReportedOutcomeCount: 0,
        latestEventAt: null,
        confidence: "observed",
        createdAt: now,
        updatedAt: now,
    };
}

export async function ensureCampaignCueWorkspaceServer(scope: CampaignCueSessionScope) {
    const workspaceId = buildCampaignCueWorkspaceId(scope);
    const ref = workspaceRef(workspaceId);
    const workspaceSnap = await ref.get();
    if (workspaceSnap.exists) {
        const workspace = normalizeCampaignCueWorkspace(workspaceSnap.data() as CampaignCueWorkspace);
        const businessSnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS)
            .doc(defaultBusinessBrainId)
            .get();
        if (businessSnap.exists) {
            return {
                workspace,
                businessBrain: businessSnap.data() as CampaignCueBusinessBrain,
            };
        }
    }

    const storeData = await readStoreData(scope);
    const workspace = workspaceSnap.exists
        ? normalizeCampaignCueWorkspace(workspaceSnap.data() as CampaignCueWorkspace)
        : buildWorkspace({ scope, storeData, workspaceId });
    const businessBrain = buildBusinessBrain({ scope, storeData, workspaceId });
    const sourceSnapshot = buildSourceSnapshot(businessBrain);
    const batch = firestoreAdmin.batch();
    batch.set(ref, sanitizeForAdminFirestore({
        ...workspace,
        updatedAt: nowTimestamp(),
        members: {
            ...(workspace.members || {}),
            [scope.userId]: {
                role: "owner",
                joinedAt: nowTimestamp(),
            },
        },
    }), { merge: true });
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS).doc(defaultBusinessBrainId),
        sanitizeForAdminFirestore(businessBrain),
        { merge: true },
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS).doc(defaultSourceSnapshotId),
        sanitizeForAdminFirestore(sourceSnapshot),
        { merge: true },
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES).doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID),
        sanitizeForAdminFirestore(dashboardSummarySeed(workspaceId)),
        { merge: true },
    );
    await batch.commit();
    return { workspace, businessBrain };
}

async function ensureCampaignCueWorkspaceOnlyServer(scope: CampaignCueSessionScope): Promise<CampaignCueWorkspace> {
    const workspaceId = buildCampaignCueWorkspaceId(scope);
    const snap = await workspaceRef(workspaceId).get();
    if (snap.exists) return normalizeCampaignCueWorkspace(snap.data() as CampaignCueWorkspace);
    const created = await ensureCampaignCueWorkspaceServer(scope);
    return created.workspace;
}

export function buildCampaignCueOpportunities(params: {
    analytics?: CampaignCueAnalyticsSummary;
    assets?: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    locations?: CampaignCueLocation[];
    schedules?: CampaignCueSchedule[];
    sourceInputs?: CampaignCueSourceInput[];
    workspaceId: string;
}): CampaignCueOpportunity[] {
    const { analytics, assets = [], businessBrain, locations = [], schedules = [], sourceInputs = [], workspaceId } = params;
    const primaryItem = businessBrain.catalog.items.find((item) => item.available) || businessBrain.catalog.items[0];
    const primaryService = businessBrain.catalog.services.find((service) => service.available) || businessBrain.catalog.services[0];
    const now = new Date().toISOString();
    const activeInputs = sourceInputs.filter((input) => input.status === "active");
    const sourceReferences = [
        businessBrain.sourceSnapshotId || defaultSourceSnapshotId,
        ...activeInputs.slice(0, 4).map((input) => input.id),
    ];
    const needsReviewInputs = sourceInputs.filter((input) => input.status === "needs_review");
    const restrictedAssets = assets.filter((asset) => asset.rights.status === "restricted");
    const reviewAssets = assets.filter((asset) => asset.rights.status === "needs_review");
    const activeLocations = locations.filter((location) => location.status === "active");
    const dueSchedules = schedules.filter((schedule) => schedule.status === "due" || schedule.status === "scheduled");

    const base: CampaignCueOpportunity[] = [];
    if (businessBrain.businessType === "salon") {
        base.push({
            id: "cue_booking_fill",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: `${primaryService?.name || "Featured service"} booking push`,
            reason: "Service and contact details are ready for a booking-focused campaign.",
            type: "booking_fill",
            priority: activeInputs.length ? 96 : 88,
            channels: ["whatsapp", "creative", "ugc", "calendar"],
            sourceReferences,
            status: "open",
            actionLabel: "Create booking pack",
            ownerBenefit: "Fill open appointment slots with copy that points to the saved booking or WhatsApp contact.",
            evidence: [
                primaryService?.name || "Featured service",
                businessBrain.contacts.bookingUrl || businessBrain.contacts.whatsapp || "Booking contact needs review",
            ],
            createdAt: now,
            updatedAt: now,
        });
    } else {
        base.push({
            id: "cue_menu_push",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: `${primaryItem?.name || "Featured item"} campaign pack`,
            reason: "Menu item, business name, and CTA context are available for local campaign output.",
            type: "menu_push",
            priority: activeInputs.length ? 98 : 90,
            channels: ["whatsapp", "google_local", "creative", "video", "calendar"],
            sourceReferences,
            status: "open",
            actionLabel: "Create item pack",
            ownerBenefit: "Turn one menu or offer fact into WhatsApp, Google, social, and manual posting copy.",
            evidence: [
                primaryItem?.name || "Featured item",
                businessBrain.contacts.publicMenuUrl || "Menu link needs review",
            ],
            createdAt: now,
            updatedAt: now,
        });
    }

    base.push(
        {
            id: "cue_weekly_pack",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Weekly local campaign pack",
            reason: "Prepare one approved pack for WhatsApp, Google, creative, ad handoff, and reports.",
            type: "weekly_pack",
            priority: 82,
            channels: ["whatsapp", "google_local", "creative", "ads", "ugc"],
            sourceReferences,
            status: "open",
            actionLabel: "Create weekly pack",
            ownerBenefit: "Prepare one owner-approved pack for the week instead of creating each channel separately.",
            evidence: [
                `${activeInputs.length} ready input${activeInputs.length === 1 ? "" : "s"}`,
                `${assets.length} asset record${assets.length === 1 ? "" : "s"}`,
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            id: "cue_video_prompt",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Short reel brief",
            reason: "A brief-mode reel is available without video provider credentials.",
            type: "video_prompt",
            priority: 74,
            channels: ["video", "creative", "ugc"],
            sourceReferences,
            status: "open",
            actionLabel: "Create reel brief",
            ownerBenefit: "Give staff or a creator a short shoot plan without paying for rendered video.",
            evidence: [
                primaryService?.name || primaryItem?.name || "Featured item or service",
                businessBrain.locality || "Location not set",
            ],
            createdAt: now,
            updatedAt: now,
        },
    );

    const sourceSnapshot = buildSourceSnapshot(businessBrain, sourceInputs);
    if (sourceSnapshot.missingFacts.length || needsReviewInputs.length || businessBrain.readiness.warnings.length || businessBrain.readiness.blockers.length) {
        base.push({
            id: "cue_source_fix",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Fix campaign source readiness",
            reason: [
                ...sourceSnapshot.missingFacts,
                ...businessBrain.readiness.blockers,
                ...businessBrain.readiness.warnings,
                needsReviewInputs.length ? `${needsReviewInputs.length} input${needsReviewInputs.length === 1 ? "" : "s"} need review.` : "",
            ].filter(Boolean)[0] || "Review source details before posting.",
            type: "source_fix",
            priority: 100,
            channels: ["creative", "calendar"],
            sourceReferences,
            status: "open",
            actionLabel: "Fix source",
            ownerBenefit: "Avoid posting with missing links, stale offers, or unreviewed facts.",
            evidence: sourceSnapshot.missingFacts.slice(0, 3),
            createdAt: now,
            updatedAt: now,
        });
    }

    if (reviewAssets.length || restrictedAssets.length) {
        base.push({
            id: "cue_asset_rights",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Review photos and rights",
            reason: restrictedAssets.length
                ? "One or more assets are restricted and should not be used in campaign packs."
                : "Some photos or files need owner confirmation before use.",
            type: "asset_rights",
            priority: restrictedAssets.length ? 99 : 86,
            channels: ["creative", "video", "ugc"],
            sourceReferences: [...sourceReferences, ...reviewAssets.slice(0, 3).map((asset) => asset.id)],
            status: "open",
            actionLabel: "Review assets",
            ownerBenefit: "Prevent unapproved photos, before/after images, or creator content from going live.",
            evidence: [...restrictedAssets, ...reviewAssets].slice(0, 3).map((asset) => asset.name),
            createdAt: now,
            updatedAt: now,
        });
    }

    if (activeLocations.length > 1) {
        base.push({
            id: "cue_local_variant",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Prepare location variants",
            reason: `${activeLocations.length} active locations can use the same pack with local area details.`,
            type: "local_variant",
            priority: 84,
            channels: ["whatsapp", "google_local", "creative", "calendar"],
            sourceReferences,
            status: "open",
            actionLabel: "Create local variants",
            ownerBenefit: "Keep one campaign consistent while changing only the area, contact, or local note.",
            evidence: activeLocations.slice(0, 3).map((location) => location.name),
            createdAt: now,
            updatedAt: now,
        });
    }

    if ((analytics?.usedCount || 0) > (analytics?.ownerReportedOutcomeCount || 0)) {
        base.push({
            id: "cue_outcome_followup",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Record result for used campaign",
            reason: "A pack was marked used, but the result has not been recorded yet.",
            type: "outcome_followup",
            priority: 80,
            channels: ["calendar"],
            sourceReferences,
            status: "open",
            actionLabel: "Record result",
            ownerBenefit: "Help CampaignCue learn what owners actually used and what happened after posting.",
            evidence: [
                `${analytics?.usedCount || 0} used`,
                `${analytics?.ownerReportedOutcomeCount || 0} results recorded`,
            ],
            createdAt: now,
            updatedAt: now,
        });
    }

    if (dueSchedules.length) {
        base.push({
            id: "cue_scheduled_manual_post",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Finish scheduled manual post",
            reason: "A scheduled manual task is waiting to be copied, posted, or marked used.",
            type: "weekly_pack",
            priority: 87,
            channels: ["calendar", "whatsapp", "google_local"],
            sourceReferences,
            status: "open",
            actionLabel: "Open calendar",
            ownerBenefit: "Keep manual posting reliable without direct platform publishing.",
            evidence: dueSchedules.slice(0, 3).map((schedule) => schedule.note),
            createdAt: now,
            updatedAt: now,
        });
    }

    return base.sort((a, b) => b.priority - a.priority);
}

function providerStatuses(): CampaignCueProviderStatus[] {
    return CAMPAIGNCUE_PROVIDER_POSTURES.map((provider) => ({ ...provider }));
}

function buildDeliveryPolicy(): CampaignCueDeliveryPolicy {
    return {
        activeMode: CAMPAIGNCUE_DELIVERY_MODE,
        allowedActions: [...CAMPAIGNCUE_EXPORT_ACTIONS],
        disabledProviderActions: [...CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS],
        dayOneSummary: CAMPAIGNCUE_DAY_ONE_DELIVERY.ownerSummary,
        futureProviderSummary: CAMPAIGNCUE_FUTURE_PROVIDER_LAYER.ownerSummary,
        activationGate: [...CAMPAIGNCUE_FUTURE_PROVIDER_LAYER.activationGate],
    };
}

async function listSubcollection<T>(workspaceId: string, collection: string, limitCount = CAMPAIGNCUE_PAGE_SIZE): Promise<T[]> {
    const snap = await workspaceSubcollection(workspaceId, collection)
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();
    return snap.docs.map((doc) => doc.data() as T);
}

async function readDashboardSummary(workspaceId: string): Promise<CampaignCueAnalyticsSummary> {
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
        .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID)
        .get();
    const seed = dashboardSummarySeed(workspaceId);
    return snap.exists
        ? { ...seed, ...snap.data(), id: CAMPAIGNCUE_DASHBOARD_SUMMARY_ID, workspaceId } as CampaignCueAnalyticsSummary
        : seed;
}

export async function listCampaignCueCampaignsServer(scope: CampaignCueSessionScope): Promise<CampaignCueCampaign[]> {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    return listSubcollection<CampaignCueCampaign>(workspace.workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS);
}

export async function listCampaignCueAssetsServer(scope: CampaignCueSessionScope): Promise<CampaignCueAsset[]> {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    return listSubcollection<CampaignCueAsset>(workspace.workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS);
}

export async function listCampaignCueSourceInputsServer(scope: CampaignCueSessionScope): Promise<CampaignCueSourceInput[]> {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    return listSubcollection<CampaignCueSourceInput>(workspace.workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS);
}

export async function listCampaignCueProviderConnectionsServer(scope: CampaignCueSessionScope) {
    await ensureCampaignCueWorkspaceOnlyServer(scope);
    return {
        connections: [] as CampaignCueProviderConnection[],
        deliveryPolicy: buildDeliveryPolicy(),
        providers: providerStatuses(),
    };
}

export async function listCampaignCueLocationsServer(scope: CampaignCueSessionScope): Promise<CampaignCueLocation[]> {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    return listSubcollection<CampaignCueLocation>(workspace.workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS);
}

export async function readCampaignCueAnalyticsServer(scope: CampaignCueSessionScope) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    const analytics = await readDashboardSummary(workspace.workspaceId);
    return {
        analytics,
        cost: {
            readsPerLoad: 2,
            writesPerCampaignCreate: 6,
            realtimeListeners: 0,
            notes: [
                "Analytics endpoint reads one workspace document and one precomputed summary document.",
                "It does not scan raw campaign, event, asset, source, location, or provider collections.",
                "Provider posting is not part of the active runtime, so no paid provider call runs from analytics load.",
            ],
        },
        providers: providerStatuses(),
    };
}

function buildLaunchReadiness(): CampaignCueLaunchReadiness {
    const hasServerProject = Boolean(process.env.CAMPAIGNCUE_FIREBASE_PROJECT_ID);
    const hasPublicProject = Boolean(process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID);
    const hasAdminCredential = Boolean(
        process.env.CAMPAIGNCUE_FIREBASE_CLIENT_EMAIL
        && (process.env.CAMPAIGNCUE_FIREBASE_PRIVATE_KEY || process.env.CAMPAIGNCUE_GOOGLE_APPLICATION_CREDENTIALS),
    );
    const checks: CampaignCueLaunchReadiness["checks"] = [
        {
            id: "firebase_project",
            label: "CampaignCue Firebase project",
            status: hasServerProject && hasPublicProject ? "ready" : "blocked",
            detail: hasServerProject && hasPublicProject
                ? "Dedicated CampaignCue Firebase project ids are configured."
                : "Set CampaignCue public and server Firebase project ids before launch.",
        },
        {
            id: "firebase_admin",
            label: "Server credential",
            status: hasAdminCredential ? "ready" : "blocked",
            detail: hasAdminCredential
                ? "Server credential shape is present for CampaignCue Admin writes."
                : "Add CampaignCue Admin credentials or application credentials before launch.",
        },
        {
            id: "manual_runtime",
            label: "Export/download runtime",
            status: "ready",
            detail: "Copy, text download, pack export, approval, scheduling, and mark-used actions are available without provider APIs.",
        },
        {
            id: "direct_provider_actions",
            label: "Future provider posting",
            status: "manual",
            detail: "Direct WhatsApp send, Google publish, ad spend, social posting, paid generation, and video render are not part of the active product.",
        },
    ];
    return {
        status: checks.some((check) => check.status === "blocked") ? "blocked_external_setup" : "ready_in_repo",
        checks,
    };
}

export async function loadCampaignCueOverviewServer(scope: CampaignCueSessionScope): Promise<CampaignCueOverview> {
    const { workspace, businessBrain } = await ensureCampaignCueWorkspaceServer(scope);
    const workspaceId = workspace.workspaceId;
    const [sourceInputs, campaigns, assets, schedules, locations, analytics] = await Promise.all([
        listSubcollection<CampaignCueSourceInput>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS),
        listSubcollection<CampaignCueCampaign>(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS),
        listSubcollection<CampaignCueAsset>(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS),
        listSubcollection<CampaignCueSchedule>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES),
        listSubcollection<CampaignCueLocation>(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS),
        readDashboardSummary(workspaceId),
    ]);

    return {
        workspace,
        businessBrain,
        sourceInputs,
        opportunities: buildCampaignCueOpportunities({
            analytics,
            assets,
            businessBrain,
            locations,
            schedules,
            sourceInputs,
            workspaceId,
        }),
        campaigns,
        assets,
        schedules,
        locations,
        analytics,
        providers: providerStatuses(),
        providerConnections: [],
        deliveryPolicy: buildDeliveryPolicy(),
        launchReadiness: buildLaunchReadiness(),
        sourceFacts: buildSourceFacts(businessBrain, sourceInputs),
        cost: {
            readsPerLoad: 8,
            writesPerCampaignCreate: 6,
            realtimeListeners: 0,
            notes: [
                "Overview uses bounded server reads and no realtime listeners.",
                "Workspace bootstrap may read one MenuList store profile as source input.",
                "Owner campaign creation writes idempotency placeholder/completion, campaign, trust report, event, and dashboard summary.",
                "Provider connections are not loaded in the active export/download runtime, so no social-integration read or paid provider call runs from page load.",
            ],
        },
    };
}

function resolveOpportunity(params: {
    analytics?: CampaignCueAnalyticsSummary;
    assets?: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    input: CampaignCueCreateCampaignInput;
    locations?: CampaignCueLocation[];
    schedules?: CampaignCueSchedule[];
    sourceInputs?: CampaignCueSourceInput[];
    workspaceId: string;
}) {
    const opportunities = buildCampaignCueOpportunities({
        analytics: params.analytics,
        assets: params.assets,
        businessBrain: params.businessBrain,
        locations: params.locations,
        schedules: params.schedules,
        sourceInputs: params.sourceInputs,
        workspaceId: params.workspaceId,
    });
    return opportunities.find((opportunity) => opportunity.id === params.input.opportunityId) || opportunities[0];
}

function ctaForBusiness(businessBrain: CampaignCueBusinessBrain) {
    return businessBrain.contacts.publicMenuUrl
        || businessBrain.contacts.bookingUrl
        || businessBrain.contacts.website
        || (businessBrain.contacts.phone ? `Call ${businessBrain.contacts.phone}` : "");
}

function primaryThing(businessBrain: CampaignCueBusinessBrain) {
    if (businessBrain.businessType === "salon") {
        return businessBrain.catalog.services.find((service) => service.available)?.name || "featured service";
    }
    return businessBrain.catalog.items.find((item) => item.available)?.name || "featured item";
}

function providerModeForChannel(channel: CampaignCueChannel): CampaignCueProviderMode {
    if (channel === "video") return "brief_only";
    if (channel === "ads") return "manual_handoff";
    return "manual_export";
}

function lineForChannel(params: {
    businessBrain: CampaignCueBusinessBrain;
    brief: string;
    channel: CampaignCueChannel;
    title: string;
}) {
    const { businessBrain, channel, title } = params;
    const thing = primaryThing(businessBrain);
    const cta = ctaForBusiness(businessBrain);
    const location = businessBrain.locality ? ` in ${businessBrain.locality}` : "";
    const ctaLine = cta ? `\n\nNext step: ${cta}` : "";
    if (channel === "whatsapp") {
        return `${businessBrain.name}: ${thing} is ready${location}. Reply here or open the link to check details.${ctaLine}`;
    }
    if (channel === "google_local") {
        return `${businessBrain.name} update: ${thing} is available${location}. ${params.brief || title}.${ctaLine}\n\nManual note: product-style posts must be handled manually when direct API support is unavailable.`;
    }
    if (channel === "creative") {
        return `Creative brief: lead with ${thing}, show the business name clearly, keep the CTA visible, and avoid unsupported result claims.${ctaLine}`;
    }
    if (channel === "video") {
        return `Reel brief: 0-2s hook on ${thing}; 3-7s close shot or service moment; 8-12s business/location proof; final frame with CTA.${ctaLine}`;
    }
    if (channel === "ugc") {
        return `Creator script: "I am at ${businessBrain.name}${location}. The useful thing to notice is ${thing}." Keep it as a creator brief, not a fake customer testimonial.${ctaLine}`;
    }
    if (channel === "ads") {
        return `Ad handoff: promote ${thing} for ${businessBrain.name}. Audience: nearby customers. Budget: owner-approved only. UTM: campaigncue_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.`;
    }
    return `Manual task: review and use the approved campaign pack for ${thing}.${ctaLine}`;
}

function outputFieldsForChannel(params: {
    businessBrain: CampaignCueBusinessBrain;
    brief: string;
    channel: CampaignCueChannel;
    text: string;
    title: string;
}): CampaignCueOutputFields {
    const { businessBrain, channel, text, title } = params;
    const thing = primaryThing(businessBrain);
    const cta = ctaForBusiness(businessBrain);
    const destination = businessBrain.contacts.publicMenuUrl
        || businessBrain.contacts.bookingUrl
        || businessBrain.contacts.website
        || "";
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const utm = destination ? `utm_source=campaigncue&utm_medium=${channel}&utm_campaign=${base || "manual_pack"}` : "";
    const manualStepsByChannel: Record<CampaignCueChannel, string[]> = {
        ads: [
            "Review destination, budget, audience, and policy in the ad account.",
            "Paste the copy into the ad draft manually.",
            "Start spend only after owner approval.",
        ],
        calendar: [
            "Open the scheduled task.",
            "Use the attached channel copy.",
            "Mark the pack used after posting.",
        ],
        creative: [
            "Pick a current approved photo or simple background.",
            "Place the business name and CTA clearly.",
            "Copy the caption text after checking source details.",
        ],
        google_local: [
            "Open Google Business Profile.",
            "Choose update, offer, or event based on the saved source.",
            "Paste the draft and verify dates, price, photo, and link before publishing.",
        ],
        ugc: [
            "Share this as a creator or staff brief.",
            "Use only real experiences and approved claims.",
            "Attach consent when a customer, staff member, or transformation appears.",
        ],
        video: [
            "Shoot the listed moments on a phone.",
            "Keep the CTA visible in the final frame.",
            "Avoid before/after or result claims without proof and consent.",
        ],
        whatsapp: [
            "Send only to people who expect business messages from this business.",
            "Paste the copy manually.",
            "Respect replies asking not to receive more messages.",
        ],
    };
    const postTypeByChannel: Record<CampaignCueChannel, CampaignCueOutputFields["postType"]> = {
        ads: "ad_handoff",
        calendar: "manual_task",
        creative: "social_post",
        google_local: "google_update",
        ugc: "creator_script",
        video: "reel_brief",
        whatsapp: "whatsapp_message",
    };
    return {
        headline: `${thing} from ${businessBrain.name}`,
        body: text,
        cta: cta || "Add a phone, booking, menu, or website link before posting.",
        imageBrief: channel === "video"
            ? `Show ${thing}, the business name, and a clear final CTA.`
            : `Use an approved image that matches ${thing}; avoid unrelated or unavailable items.`,
        dimensions: channel === "video" ? "9:16 reel" : channel === "google_local" ? "Google Business Profile post" : "Channel native format",
        postType: postTypeByChannel[channel],
        consentNote: channel === "whatsapp"
            ? "Use only where the owner has consent or an existing customer conversation."
            : channel === "ugc" || channel === "video"
                ? "Use real people only with owner-confirmed consent."
                : "Use owner-approved assets and claims.",
        policyNote: channel === "ads"
            ? "No spend starts from CampaignCue. Check platform policy before launching."
            : channel === "google_local"
                ? "Verify offer dates, price, and post type before publishing manually."
                : "Do not add guarantees, fake testimonials, or unsupported result claims.",
        destination,
        utm,
        approvalNote: "Owner or assigned reviewer should approve source details, CTA, and claims before use.",
        manualSteps: manualStepsByChannel[channel],
    };
}

function buildOutputs(params: {
    businessBrain: CampaignCueBusinessBrain;
    brief: string;
    channels: CampaignCueChannel[];
    sourceReferences: string[];
    title: string;
}): CampaignCueOutput[] {
    return params.channels.map((channel) => {
        const text = lineForChannel({
            businessBrain: params.businessBrain,
            brief: params.brief,
            channel,
            title: params.title,
        });
        return {
            id: `${channel}_draft`,
            channel,
            label: CAMPAIGNCUE_CHANNEL_LABELS[channel],
            mode: channel === "video" ? "brief" : channel === "ads" ? "manual_handoff" : "manual_export",
            text,
            sourceReferences: params.sourceReferences,
            providerMode: providerModeForChannel(channel),
            trustGate: "warning",
            fields: outputFieldsForChannel({
                businessBrain: params.businessBrain,
                brief: params.brief,
                channel,
                text,
                title: params.title,
            }),
            metadata: channel === "ads"
                ? { spendChanging: false, directMutationEnabled: false }
                : channel === "google_local"
                    ? { productPostApiFallback: true, directPublishEnabled: false }
                    : undefined,
        };
    });
}

function buildTrustReport(params: {
    businessBrain: CampaignCueBusinessBrain;
    campaignId: string;
    outputs: CampaignCueOutput[];
    sourceFacts: CampaignCueSourceFact[];
    workspaceId: string;
}): CampaignCueTrustReport {
    const findings: CampaignCueTrustFinding[] = [];
    const missingDestination = !ctaForBusiness(params.businessBrain);
    const unreviewedFacts = params.sourceFacts.filter((fact) => fact.risk === "needs_review");
    const blockedFacts = params.sourceFacts.filter((fact) => fact.risk === "blocked");
    const assetFacts = params.sourceFacts.filter((fact) => fact.sourceType === "asset");
    for (const output of params.outputs) {
        const text = output.text.toLowerCase();
        if (/(guaranteed|100%|cure|best in|#1)/.test(text)) {
            findings.push({
                id: `${output.id}_blocked_claim`,
                severity: "blocked",
                ruleId: "unsupported_absolute_claim",
                message: `${output.label} includes an unsupported absolute or result claim.`,
                recommendation: "Remove guarantee, medical/result, or ranking language before export or handoff.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (blockedFacts.length) {
            findings.push({
                id: `${output.id}_blocked_source_fact`,
                severity: "blocked",
                ruleId: "blocked_source_fact",
                message: `${output.label} references source material that is blocked for use.`,
                recommendation: "Remove restricted photos, claims, or source records before using this pack.",
                sourceReferences: blockedFacts.slice(0, 3).map((fact) => fact.sourceRef),
            });
        }
        if (missingDestination && (output.channel === "whatsapp" || output.channel === "google_local" || output.channel === "ads")) {
            findings.push({
                id: `${output.id}_missing_cta_destination`,
                severity: "needs_fix",
                ruleId: "missing_cta_destination",
                message: `${output.label} needs a phone, WhatsApp, booking, menu, or website destination.`,
                recommendation: "Add one clear next step in Business details before posting this channel.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (!output.sourceReferences.length) {
            findings.push({
                id: `${output.id}_missing_source`,
                severity: "needs_fix",
                ruleId: "missing_source_reference",
                message: `${output.label} has no source reference.`,
                recommendation: "Attach a Business Brain fact or source snapshot before use.",
                sourceReferences: [],
            });
        }
        if (output.channel === "whatsapp") {
            findings.push({
                id: `${output.id}_manual_consent`,
                severity: "warning",
                ruleId: "whatsapp_manual_consent",
                message: "WhatsApp output is manual export only until opt-in and template handling are configured.",
                recommendation: "Use as copy/share material only; do not treat it as a system-sent campaign.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (output.channel === "google_local") {
            findings.push({
                id: `${output.id}_google_manual_verify`,
                severity: params.businessBrain.businessType === "restaurant" && !params.businessBrain.contacts.publicMenuUrl
                    ? "needs_fix"
                    : "warning",
                ruleId: "google_local_manual_verification",
                message: "Google local output needs manual verification before publishing.",
                recommendation: "Check post type, price, date, photo, and business link inside Google Business Profile.",
                sourceReferences: output.sourceReferences,
            });
        }
        if ((output.channel === "video" || output.channel === "ugc" || output.channel === "creative") && !assetFacts.length) {
            findings.push({
                id: `${output.id}_asset_proof_missing`,
                severity: "warning",
                ruleId: "asset_proof_missing",
                message: `${output.label} has no approved photo or video asset attached.`,
                recommendation: "Use owner-approved media or register a photo with rights before posting.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (params.businessBrain.businessType === "salon" && (output.channel === "video" || output.channel === "ugc" || output.channel === "ads")) {
            findings.push({
                id: `${output.id}_salon_consent_review`,
                severity: "warning",
                ruleId: "salon_consent_review",
                message: "Salon content may involve before/after images, personal appearance, or result claims.",
                recommendation: "Confirm consent and avoid guaranteed transformation, health, or beauty-result promises.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (params.businessBrain.businessType === "restaurant" && output.channel !== "calendar" && !params.businessBrain.contacts.publicMenuUrl) {
            findings.push({
                id: `${output.id}_restaurant_menu_verify`,
                severity: "warning",
                ruleId: "restaurant_menu_verify",
                message: "Restaurant campaign copy should point to a current menu or verified item source.",
                recommendation: "Add a public menu link or current item note before posting widely.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (output.channel === "ads") {
            findings.push({
                id: `${output.id}_spend_handoff`,
                severity: "warning",
                ruleId: "ad_spend_manual_approval",
                message: "Ad output is a spend-safe handoff. CampaignCue will not start spend.",
                recommendation: "Review destination, budget, and policy in the ad account before launch.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (unreviewedFacts.length) {
            findings.push({
                id: `${output.id}_source_review_needed`,
                severity: "warning",
                ruleId: "source_review_needed",
                message: `${output.label} includes facts that are saved but not marked ready.`,
                recommendation: "Review current offers, events, links, or upload notes before posting.",
                sourceReferences: unreviewedFacts.slice(0, 3).map((fact) => fact.sourceRef),
            });
        }
    }

    const gate: CampaignCueTrustGate = findings.some((finding) => finding.severity === "blocked")
        ? "blocked"
        : findings.some((finding) => finding.severity === "needs_fix")
            ? "needs_fix"
            : findings.some((finding) => finding.severity === "warning")
                ? "warning"
                : "clear";
    return {
        id: `${params.campaignId}_trust_v1`,
        workspaceId: params.workspaceId,
        campaignId: params.campaignId,
        outputVersionId: "v1",
        gate,
        ruleVersion: "campaigncue-trust-v1",
        findings,
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
    };
}

function applyTrustToOutputs(outputs: CampaignCueOutput[], trustReport: CampaignCueTrustReport): CampaignCueOutput[] {
    return outputs.map((output) => {
        const outputFindings = trustReport.findings.filter((finding) => finding.id.startsWith(output.id));
        const trustGate: CampaignCueTrustGate = outputFindings.some((finding) => finding.severity === "blocked")
            ? "blocked"
            : outputFindings.some((finding) => finding.severity === "needs_fix")
                ? "needs_fix"
                : outputFindings.some((finding) => finding.severity === "warning")
                    ? "warning"
                    : "clear";
        return { ...output, trustGate };
    });
}

async function readCampaign(workspaceId: string, campaignId: string): Promise<CampaignCueCampaign | null> {
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).doc(campaignId).get();
    return snap.exists ? snap.data() as CampaignCueCampaign : null;
}

async function checkIdempotency(params: {
    action: string;
    idempotencyKey?: string;
    scope: CampaignCueSessionScope;
    workspaceId: string;
}): Promise<{
    action?: string;
    responseError?: string;
    responseStatus?: number;
    resultId?: string;
    status?: "in_progress" | "completed";
} | null> {
    if (!params.idempotencyKey) return null;
    const ref = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS).doc(params.idempotencyKey);
    try {
        await ref.create(sanitizeForAdminFirestore({
            id: params.idempotencyKey,
            action: params.action,
            status: "in_progress",
            createdAt: nowTimestamp(),
            actorId: params.scope.userId,
        }));
        return null;
    } catch (error) {
        const message = stringifyErrorField((error as Record<string, unknown>)?.message).toLowerCase();
        const code = (error as Record<string, unknown>)?.code;
        const alreadyExists = code === 6 || code === "already-exists" || message.includes("already exists");
        if (!alreadyExists) throw error;

        const snap = await ref.get();
        const existing = snap.exists
            ? snap.data() as {
                action?: string;
                responseError?: string;
                responseStatus?: number;
                resultId?: string;
                status?: "in_progress" | "completed";
            }
            : null;
        if (existing?.action && existing.action !== params.action) {
            throw new CampaignCueIdempotencyConflictError("This idempotency key was already used for another CampaignCue action.");
        }
        if (existing?.resultId) return existing;
        throw new CampaignCueIdempotencyConflictError();
    }
}

async function completeIdempotency(params: {
    action: string;
    idempotencyKey?: string;
    responseError?: string;
    responseStatus?: number;
    resultId: string;
    workspaceId: string;
}) {
    if (!params.idempotencyKey) return;
    await workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(params.idempotencyKey)
        .set(sanitizeForAdminFirestore({
            action: params.action,
            responseError: params.responseError,
            responseStatus: params.responseStatus,
            resultId: params.resultId,
            status: "completed",
            updatedAt: nowTimestamp(),
        }), { merge: true });
}

async function writeEvent(params: {
    action: string;
    campaignId?: string;
    channel?: CampaignCueChannel;
    metadata?: Record<string, unknown>;
    outputId?: string;
    scope: CampaignCueSessionScope;
    workspaceId: string;
}) {
    const eventRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    await eventRef.set(sanitizeForAdminFirestore({
        id: eventRef.id,
        workspaceId: params.workspaceId,
        actorId: params.scope.userId,
        action: params.action,
        campaignId: params.campaignId,
        channel: params.channel,
        outputId: params.outputId,
        metadata: params.metadata || {},
        confidence: "observed",
        createdAt: nowTimestamp(),
    }));
}

async function updateDashboardSummary(params: {
    action?: CampaignCueActionType | "campaign_created";
    workspaceId: string;
}) {
    const summaryRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
        .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID);
    const now = nowTimestamp();
    const increment = admin.firestore.FieldValue.increment;
    const next: Record<string, unknown> = {
        id: CAMPAIGNCUE_DASHBOARD_SUMMARY_ID,
        workspaceId: params.workspaceId,
        confidence: "observed",
        latestEventAt: now,
        updatedAt: now,
    };
    if (params.action === "campaign_created") next.campaignCount = increment(1);
    if (params.action === "mark_used") next.usedCount = increment(1);
    if (params.action === "copy" || params.action === "download" || params.action === "export") {
        next.exportCount = increment(1);
    }
    if (params.action === "request_approval") next.approvalRequestCount = increment(1);
    if (params.action === "record_outcome") next.ownerReportedOutcomeCount = increment(1);
    await summaryRef.set(next, { merge: true });
}

export async function createCampaignCueCampaignServer(params: {
    input: CampaignCueCreateCampaignInput;
    scope: CampaignCueSessionScope;
}): Promise<{ campaign: CampaignCueCampaign; trustReport: CampaignCueTrustReport; replayed?: boolean }> {
    const { workspace, businessBrain } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const replay = await checkIdempotency({
        action: "create_campaign",
        idempotencyKey: params.input.idempotencyKey,
        scope: params.scope,
        workspaceId,
    });
    if (replay?.resultId) {
        const existing = await readCampaign(workspaceId, replay.resultId);
        const trustSnap = existing?.trustReportId
            ? await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.TRUST_REPORTS).doc(existing.trustReportId).get()
            : null;
        if (existing && trustSnap?.exists) {
            return {
                campaign: existing,
                trustReport: trustSnap.data() as CampaignCueTrustReport,
                replayed: true,
            };
        }
        throw new CampaignCueIdempotencyConflictError("This campaign request already completed, but its result is unavailable.");
    }

    const [sourceInputs, assets, locations, schedules, analytics] = await Promise.all([
        listSubcollection<CampaignCueSourceInput>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS),
        listSubcollection<CampaignCueAsset>(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS),
        listSubcollection<CampaignCueLocation>(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS),
        listSubcollection<CampaignCueSchedule>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES),
        readDashboardSummary(workspaceId),
    ]);
    const opportunity = resolveOpportunity({
        analytics,
        assets,
        businessBrain,
        input: params.input,
        locations,
        schedules,
        sourceInputs,
        workspaceId,
    });
    const title = compactString(params.input.title, opportunity.title);
    const brief = compactString(params.input.brief, opportunity.reason);
    const channels = (params.input.channels?.length ? params.input.channels : opportunity.channels) as CampaignCueChannel[];
    const campaignId = buildId(CAMPAIGNCUE_CAMPAIGN_ID_PREFIX);
    const outputsDraft = buildOutputs({
        businessBrain,
        brief,
        channels,
        sourceReferences: opportunity.sourceReferences,
        title,
    });
    const sourceFacts = buildSourceFacts(businessBrain, sourceInputs);
    const trustReport = buildTrustReport({
        businessBrain,
        campaignId,
        outputs: outputsDraft,
        sourceFacts,
        workspaceId,
    });
    const outputs = applyTrustToOutputs(outputsDraft, trustReport);
    const now = nowTimestamp();
    const campaign: CampaignCueCampaign = {
        id: campaignId,
        workspaceId,
        businessBrainId: businessBrain.businessBrainId,
        opportunityId: opportunity.id,
        title,
        brief,
        status: "generated",
        channels,
        outputs,
        sourceSnapshotId: businessBrain.sourceSnapshotId || defaultSourceSnapshotId,
        trustReportId: trustReport.id,
        trustGate: trustReport.gate,
        credits: {
            estimate: 0,
            reserved: 0,
            captured: 0,
            refunded: 0,
            currency: "credits",
        },
        actionCounts: {},
        ownerApprovalState: "not_requested",
        createdAt: now,
        updatedAt: now,
    };

    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).doc(campaign.id),
        sanitizeForAdminFirestore(campaign),
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.TRUST_REPORTS).doc(trustReport.id),
        sanitizeForAdminFirestore(trustReport),
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX)),
        sanitizeForAdminFirestore({
            workspaceId,
            actorId: params.scope.userId,
            action: "campaign_pack_generated",
            campaignId: campaign.id,
            channels,
            confidence: "observed",
            createdAt: now,
        }),
    );
    await batch.commit();
    await Promise.all([
        updateDashboardSummary({ action: "campaign_created", workspaceId }),
        completeIdempotency({
            action: "create_campaign",
            idempotencyKey: params.input.idempotencyKey,
            resultId: campaign.id,
            workspaceId,
        }),
    ]);

    return { campaign, trustReport };
}

function assertCampaignActionAllowed(campaign: CampaignCueCampaign) {
    if (campaign.trustGate === "blocked") {
        return "This campaign has a blocking trust issue.";
    }
    return null;
}

export async function recordCampaignCueActionServer(params: {
    campaignId: string;
    input: CampaignCueCampaignActionInput;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const campaign = await readCampaign(workspaceId, params.campaignId);
    if (!campaign) {
        return { error: "Campaign not found", status: 404 as const };
    }

    const replay = await checkIdempotency({
        action: params.input.action,
        idempotencyKey: params.input.idempotencyKey,
        scope: params.scope,
        workspaceId,
    });
    if (replay?.resultId) {
        if (replay.resultId !== params.campaignId) {
            throw new CampaignCueIdempotencyConflictError("This idempotency key was already used for another campaign.");
        }
        if (replay.responseError) {
            return {
                error: replay.responseError,
                replayed: true,
                status: (replay.responseStatus || 409) as 409,
            };
        }
        return { campaign, replayed: true };
    }
    const actionError = assertCampaignActionAllowed(campaign);
    if (actionError) {
        await Promise.all([
            writeEvent({
                action: "export_action_blocked",
                campaignId: campaign.id,
                channel: params.input.channel,
                metadata: { blockedAction: params.input.action, reason: actionError },
                outputId: params.input.outputId,
                scope: params.scope,
                workspaceId,
            }),
            completeIdempotency({
                action: params.input.action,
                idempotencyKey: params.input.idempotencyKey,
                responseError: actionError,
                responseStatus: 409,
                resultId: campaign.id,
                workspaceId,
            }),
        ]);
        return { error: actionError, status: 409 as const };
    }

    const now = nowTimestamp();
    const updates: Partial<CampaignCueCampaign> = {
        actionCounts: {
            ...(campaign.actionCounts || {}),
            [params.input.action]: Number(campaign.actionCounts?.[params.input.action] || 0) + 1,
        },
        updatedAt: now,
    };
    if (params.input.action === "mark_used") updates.status = "used";
    if (params.input.action === "record_outcome") updates.status = "used";
    if (params.input.action === "schedule") updates.status = "scheduled";
    if (params.input.action === "request_approval") updates.ownerApprovalState = "requested";

    const batch = firestoreAdmin.batch();
    const campaignRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).doc(campaign.id);
    batch.set(campaignRef, sanitizeForAdminFirestore(updates), { merge: true });

    let schedule: CampaignCueSchedule | null = null;
    if (params.input.action === "schedule") {
        schedule = {
            id: buildId(CAMPAIGNCUE_SCHEDULE_ID_PREFIX),
            workspaceId,
            campaignId: campaign.id,
            outputId: params.input.outputId,
            channel: params.input.channel || campaign.channels[0],
            mode: "manual_task",
            status: "scheduled",
            scheduledAt: params.input.scheduledAt || null,
            timezone: workspace.settings.timezone,
            note: params.input.note || "Manual CampaignCue task",
            createdAt: now,
            updatedAt: now,
        };
        batch.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES).doc(schedule.id),
            sanitizeForAdminFirestore(schedule),
        );
    }

    if (params.input.action === "request_approval") {
        const approvalId = buildId(CAMPAIGNCUE_APPROVAL_ID_PREFIX);
        batch.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.APPROVAL_REQUESTS).doc(approvalId),
            sanitizeForAdminFirestore({
                id: approvalId,
                workspaceId,
                campaignId: campaign.id,
                outputId: params.input.outputId,
                status: "requested",
                actorId: params.scope.userId,
                createdAt: now,
                updatedAt: now,
            }),
        );
    }

    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX)),
        sanitizeForAdminFirestore({
            workspaceId,
            actorId: params.scope.userId,
            action: params.input.action === "mark_used"
                ? "manual_export_used"
                : params.input.action === "record_outcome"
                    ? "owner_outcome_recorded"
                    : `campaign_${params.input.action}`,
            campaignId: campaign.id,
            channel: params.input.channel,
            outputId: params.input.outputId,
            metadata: params.input.action === "record_outcome" ? { note: params.input.note || "Owner reported a result." } : {},
            confidence: "observed",
            createdAt: now,
        }),
    );
    await batch.commit();
    await Promise.all([
        updateDashboardSummary({ action: params.input.action, workspaceId }),
        completeIdempotency({
            action: params.input.action,
            idempotencyKey: params.input.idempotencyKey,
            resultId: campaign.id,
            workspaceId,
        }),
    ]);
    const updated: CampaignCueCampaign = {
        ...campaign,
        ...updates,
        actionCounts: updates.actionCounts || campaign.actionCounts,
        ownerApprovalState: updates.ownerApprovalState || campaign.ownerApprovalState,
        status: updates.status || campaign.status,
        updatedAt: now,
    };
    return { campaign: updated, schedule };
}

export async function createCampaignCueAssetServer(params: {
    input: CampaignCueAssetInput;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const id = buildId(CAMPAIGNCUE_ASSET_ID_PREFIX);
    const now = nowTimestamp();
    const asset: CampaignCueAsset = {
        id,
        workspaceId,
        name: params.input.name,
        assetType: params.input.assetType,
        status: params.input.rightsStatus === "restricted" ? "blocked" : "ready",
        source: params.input.source,
        rights: {
            status: params.input.rightsStatus,
            note: params.input.rightsNote,
            consentType: params.input.consentType,
        },
        tags: params.input.tags || [],
        file: {
            storagePath: params.input.storagePath,
            downloadUrl: params.input.downloadUrl,
            mimeType: params.input.mimeType,
            sizeBytes: params.input.sizeBytes,
        },
        usageRefs: params.input.campaignId ? [{
            campaignId: params.input.campaignId,
            outputId: params.input.outputId,
            channel: params.input.channel,
        }] : [],
        createdAt: now,
        updatedAt: now,
    };
    await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS)
        .doc(asset.id)
        .set(sanitizeForAdminFirestore(asset));
    await writeEvent({
        action: "asset_registered",
        campaignId: params.input.campaignId,
        channel: params.input.channel,
        outputId: params.input.outputId,
        scope: params.scope,
        workspaceId,
        metadata: { assetId: asset.id, assetType: asset.assetType, rightsStatus: asset.rights.status },
    });
    return asset;
}

export async function createCampaignCueSourceInputServer(params: {
    input: CampaignCueSourceInputData;
    scope: CampaignCueSessionScope;
}) {
    const { businessBrain, workspace } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const now = nowTimestamp();
    const id = buildId("cc_source");
    const sourceInput: CampaignCueSourceInput = {
        id,
        workspaceId,
        sourceType: params.input.sourceType,
        label: params.input.label,
        value: params.input.value,
        status: params.input.status,
        confidence: params.input.status === "active" ? "manual" : "estimated",
        sourceRefs: ["owner_input"],
        facts: [],
        expiresAt: params.input.expiresAt
            ? admin.firestore.Timestamp.fromDate(new Date(params.input.expiresAt))
            : null,
        createdAt: now,
        updatedAt: now,
    };
    sourceInput.facts = sourceInputToFacts(sourceInput);
    const existingInputs = await listSubcollection<CampaignCueSourceInput>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS);
    const sourceSnapshot = buildSourceSnapshot(businessBrain, [sourceInput, ...existingInputs]);
    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS).doc(sourceInput.id),
        sanitizeForAdminFirestore(sourceInput),
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS).doc(defaultSourceSnapshotId),
        sanitizeForAdminFirestore(sourceSnapshot),
        { merge: true },
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX)),
        sanitizeForAdminFirestore({
            workspaceId,
            actorId: params.scope.userId,
            action: "source_input_added",
            metadata: {
                sourceInputId: sourceInput.id,
                sourceType: sourceInput.sourceType,
                status: sourceInput.status,
            },
            confidence: "observed",
            createdAt: now,
        }),
    );
    await batch.commit();
    return sourceInput;
}

export async function createCampaignCueLocationServer(params: {
    input: CampaignCueLocationInput;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const now = nowTimestamp();
    const location: CampaignCueLocation = {
        id: buildId("cc_location"),
        workspaceId,
        name: params.input.name,
        locality: params.input.locality,
        status: params.input.status,
        sourceRefs: ["owner_input"],
        createdAt: now,
        updatedAt: now,
    };
    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS).doc(location.id),
        sanitizeForAdminFirestore(location),
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX)),
        sanitizeForAdminFirestore({
            workspaceId,
            actorId: params.scope.userId,
            action: "location_draft_added",
            metadata: {
                locationId: location.id,
                status: location.status,
            },
            confidence: "observed",
            createdAt: now,
        }),
    );
    await batch.commit();
    return location;
}

export async function patchCampaignCueBusinessServer(params: {
    input: CampaignCueBusinessPatchInput;
    scope: CampaignCueSessionScope;
}): Promise<{
    businessBrain: CampaignCueBusinessBrain;
    opportunities: CampaignCueOpportunity[];
    workspace: CampaignCueWorkspace;
}> {
    const { workspace, businessBrain } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const sourceInputs = await listSubcollection<CampaignCueSourceInput>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS);
    const next: CampaignCueBusinessBrain = {
        ...businessBrain,
        businessType: params.input.businessType || businessBrain.businessType,
        name: params.input.name || businessBrain.name,
        locality: params.input.locality ?? businessBrain.locality,
        contacts: {
            ...businessBrain.contacts,
            website: patchOptionalUrl(params.input, "website", businessBrain.contacts.website),
            phone: params.input.phone ?? businessBrain.contacts.phone,
            whatsapp: params.input.whatsapp ?? businessBrain.contacts.whatsapp,
            bookingUrl: patchOptionalUrl(params.input, "bookingUrl", businessBrain.contacts.bookingUrl),
            publicMenuUrl: patchOptionalUrl(params.input, "publicMenuUrl", businessBrain.contacts.publicMenuUrl),
        },
        brandKit: {
            ...businessBrain.brandKit,
            primaryColor: params.input.primaryColor ?? businessBrain.brandKit.primaryColor,
            logoUrl: patchOptionalUrl(params.input, "logoUrl", businessBrain.brandKit.logoUrl),
            voice: params.input.voice ?? businessBrain.brandKit.voice,
        },
        locale: params.input.locale ?? businessBrain.locale,
        timezone: params.input.timezone ?? businessBrain.timezone,
        updatedAt: nowTimestamp(),
    };
    const sourceSnapshot = buildSourceSnapshot(next, sourceInputs);
    const workspaceUpdate: Partial<CampaignCueWorkspace> = {
        agencyMode: params.input.agencyMode ?? workspace.agencyMode,
        multiLocationMode: params.input.multiLocationMode ?? workspace.multiLocationMode,
        settings: {
            ...workspace.settings,
            timezone: params.input.timezone ?? workspace.settings.timezone,
            locale: params.input.locale ?? workspace.settings.locale,
            deliveryMode: CAMPAIGNCUE_DELIVERY_MODE,
            billingEnabled: Boolean(FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_BILLING),
        },
        updatedAt: nowTimestamp(),
    };
    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceRef(workspaceId),
        sanitizeForAdminFirestore(workspaceUpdate),
        { merge: true },
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS).doc(next.businessBrainId),
        sanitizeForAdminFirestore(next),
        { merge: true },
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS).doc(defaultSourceSnapshotId),
        sanitizeForAdminFirestore(sourceSnapshot),
        { merge: true },
    );
    await batch.commit();
    const updatedWorkspace = {
        ...workspace,
        ...workspaceUpdate,
        settings: workspaceUpdate.settings || workspace.settings,
        updatedAt: workspaceUpdate.updatedAt,
    };
    return {
        businessBrain: next,
        opportunities: buildCampaignCueOpportunities({ businessBrain: next, sourceInputs, workspaceId }),
        workspace: updatedWorkspace,
    };
}

export function buildCampaignCueAuthLaunchUrl() {
    return buildCampaignCueAuthLaunchUrlFromSignIn(SIGNIN_URL);
}

const stringifyErrorField = (value: unknown) => {
    if (typeof value === "string") return value;
    if (value == null) return "";
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

export function isCampaignCueFirebaseUnavailableError(error: unknown) {
    const record = error as Record<string, unknown>;
    const haystack = [
        stringifyErrorField(record?.message),
        stringifyErrorField(record?.details),
        stringifyErrorField(record?.reason),
        stringifyErrorField(record?.domain),
        stringifyErrorField(record?.errorInfoMetadata),
    ].join(" ").toLowerCase();

    return (
        record?.code === 7 ||
        haystack.includes("consumer_invalid") ||
        haystack.includes("firestore.googleapis.com") ||
        haystack.includes("permission denied on resource project campaigncue")
    );
}

export function buildCampaignCueApiError(error: unknown, fallbackMessage: string) {
    if (error instanceof CampaignCueIdempotencyConflictError) {
        return {
            body: {
                code: error.code,
                error: error.message,
            },
            status: error.status,
        };
    }

    if (isCampaignCueFirebaseUnavailableError(error)) {
        return {
            body: {
                code: CAMPAIGNCUE_ERROR_CODES.FIREBASE_UNAVAILABLE,
                error: "CampaignCue Firebase project is not reachable from this environment.",
            },
            status: 503,
        };
    }

    return {
        body: {
            code: CAMPAIGNCUE_ERROR_CODES.RUNTIME_ERROR,
            error: fallbackMessage,
        },
        status: 500,
    };
}

export function logCampaignCueServerError(message: string, error: unknown, metadata: Record<string, unknown>) {
    logger.error(message, error, {
        productId: CAMPAIGNCUE_PRODUCT_ID,
        ...metadata,
    });
}
