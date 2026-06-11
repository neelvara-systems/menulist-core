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
    CampaignCueLocation,
    CampaignCueOutput,
    CampaignCueOverview,
    CampaignCueOpportunity,
    CampaignCueProviderConnection,
    CampaignCueProviderMode,
    CampaignCueProviderStatus,
    CampaignCueSchedule,
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
    CampaignCueIntegrationActionInput,
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
    const facts = {
        businessType: businessBrain.businessType,
        contacts: businessBrain.contacts,
        items: businessBrain.catalog.items.map((item) => item.name),
        locality: businessBrain.locality,
        name: businessBrain.name,
        services: businessBrain.catalog.services.map((service) => service.name),
        sourceInputs: sourceInputs.map((input) => ({
            label: input.label,
            sourceType: input.sourceType,
            value: input.value,
        })),
    };
    return {
        id: defaultSourceSnapshotId,
        workspaceId: businessBrain.workspaceId,
        sourceType: sourceInputs.length ? "manual" : "menulist",
        sourceHash: stableHash(facts),
        sourceRefs: ["store_profile", ...sourceInputs.map((input) => input.id)],
        confidence: businessBrain.sourceConfidence,
        freshness: "fresh",
        summary: `${businessBrain.name} ${businessBrain.locality ? `in ${businessBrain.locality}` : ""}`.trim(),
    };
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
            directPublishingEnabled: false,
            providerGenerationEnabled: false,
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
        const workspace = workspaceSnap.data() as CampaignCueWorkspace;
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
        ? workspaceSnap.data() as CampaignCueWorkspace
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
    if (snap.exists) return snap.data() as CampaignCueWorkspace;
    const created = await ensureCampaignCueWorkspaceServer(scope);
    return created.workspace;
}

export function buildCampaignCueOpportunities(params: {
    businessBrain: CampaignCueBusinessBrain;
    workspaceId: string;
}): CampaignCueOpportunity[] {
    const { businessBrain, workspaceId } = params;
    const primaryItem = businessBrain.catalog.items.find((item) => item.available) || businessBrain.catalog.items[0];
    const primaryService = businessBrain.catalog.services.find((service) => service.available) || businessBrain.catalog.services[0];
    const sourceReferences = [businessBrain.sourceSnapshotId || defaultSourceSnapshotId];
    const now = new Date().toISOString();

    const base: CampaignCueOpportunity[] = [];
    if (businessBrain.businessType === "salon") {
        base.push({
            id: "cue_booking_fill",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: `${primaryService?.name || "Featured service"} booking push`,
            reason: "Service and contact details are ready for a booking-focused campaign.",
            type: "booking_fill",
            priority: 95,
            channels: ["whatsapp", "creative", "ugc", "calendar"],
            sourceReferences,
            status: "open",
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
            priority: 98,
            channels: ["whatsapp", "google_local", "creative", "video", "calendar"],
            sourceReferences,
            status: "open",
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
            createdAt: now,
            updatedAt: now,
        },
    );

    if (businessBrain.readiness.warnings.length || businessBrain.readiness.blockers.length) {
        base.push({
            id: "cue_source_fix",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Fix campaign source readiness",
            reason: [...businessBrain.readiness.blockers, ...businessBrain.readiness.warnings][0],
            type: "source_fix",
            priority: 100,
            channels: ["creative", "calendar"],
            sourceReferences,
            status: "open",
            createdAt: now,
            updatedAt: now,
        });
    }

    return base.sort((a, b) => b.priority - a.priority);
}

function providerStatuses(): CampaignCueProviderStatus[] {
    return [
        {
            provider: "whatsapp",
            label: "WhatsApp",
            mode: "manual_export",
            status: "manual_only",
            reason: "Direct send remains disabled until opt-in, template approval, stop-list, and webhook verification are configured.",
        },
        {
            provider: "google_business_profile",
            label: "Google Business Profile",
            mode: "manual_fallback",
            status: "manual_only",
            reason: "Google local posts can be prepared; connected publish requires approved OAuth access and location capability checks.",
        },
        {
            provider: "google_ads",
            label: "Google Ads",
            mode: "manual_handoff",
            status: "manual_only",
            reason: "Ad packs are handoff-only until account mapping, validate-only checks, spend approval, and billing controls are active.",
        },
        {
            provider: "meta_ads",
            label: "Meta Ads",
            mode: "manual_handoff",
            status: "manual_only",
            reason: "Spend-changing mutations are blocked by default.",
        },
        {
            provider: "video_render",
            label: "Video rendering",
            mode: "brief_only",
            status: "manual_only",
            reason: "Brief mode works now; rendered output needs a metered provider adapter and credit reservation.",
        },
    ];
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
    return snap.exists ? snap.data() as CampaignCueAnalyticsSummary : dashboardSummarySeed(workspaceId);
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
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    const providerConnections = await listSubcollection<CampaignCueProviderConnection>(
        workspace.workspaceId,
        CAMPAIGNCUE_COLLECTIONS.PROVIDER_CONNECTIONS,
    );
    return {
        connections: providerConnections,
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
                "Direct provider actions are disabled, so no paid provider call runs from analytics load.",
            ],
        },
        providers: providerStatuses(),
    };
}

export async function loadCampaignCueOverviewServer(scope: CampaignCueSessionScope): Promise<CampaignCueOverview> {
    const { workspace, businessBrain } = await ensureCampaignCueWorkspaceServer(scope);
    const workspaceId = workspace.workspaceId;
    const [sourceInputs, campaigns, assets, schedules, locations, providerConnections, analytics] = await Promise.all([
        listSubcollection<CampaignCueSourceInput>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS),
        listSubcollection<CampaignCueCampaign>(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS),
        listSubcollection<CampaignCueAsset>(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS),
        listSubcollection<CampaignCueSchedule>(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES),
        listSubcollection<CampaignCueLocation>(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS),
        listSubcollection<CampaignCueProviderConnection>(workspaceId, CAMPAIGNCUE_COLLECTIONS.PROVIDER_CONNECTIONS),
        readDashboardSummary(workspaceId),
    ]);

    return {
        workspace,
        businessBrain,
        sourceInputs,
        opportunities: buildCampaignCueOpportunities({ businessBrain, workspaceId }),
        campaigns,
        assets,
        schedules,
        locations,
        analytics,
        providers: providerStatuses(),
        providerConnections,
        cost: {
            readsPerLoad: 9,
            writesPerCampaignCreate: 6,
            realtimeListeners: 0,
            notes: [
                "Overview uses bounded server reads and no realtime listeners.",
                "Workspace bootstrap may read one MenuList store profile as source input.",
                "Owner campaign creation writes idempotency placeholder/completion, campaign, trust report, event, and dashboard summary.",
                "Direct provider actions are disabled, so no paid provider call runs from page load.",
            ],
        },
    };
}

function resolveOpportunity(params: {
    businessBrain: CampaignCueBusinessBrain;
    input: CampaignCueCreateCampaignInput;
    workspaceId: string;
}) {
    const opportunities = buildCampaignCueOpportunities({
        businessBrain: params.businessBrain,
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
    if (channel === "google_local") return "manual_fallback";
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

function buildOutputs(params: {
    businessBrain: CampaignCueBusinessBrain;
    brief: string;
    channels: CampaignCueChannel[];
    sourceReferences: string[];
    title: string;
}): CampaignCueOutput[] {
    return params.channels.map((channel) => ({
        id: `${channel}_draft`,
        channel,
        label: CAMPAIGNCUE_CHANNEL_LABELS[channel],
        mode: channel === "video" ? "brief" : channel === "ads" ? "manual_handoff" : "manual_export",
        text: lineForChannel({
            businessBrain: params.businessBrain,
            brief: params.brief,
            channel,
            title: params.title,
        }),
        sourceReferences: params.sourceReferences,
        providerMode: providerModeForChannel(channel),
        trustGate: "warning",
        metadata: channel === "ads"
            ? { spendChanging: false, directMutationEnabled: false }
            : channel === "google_local"
                ? { productPostApiFallback: true, directPublishEnabled: false }
                : undefined,
    }));
}

function buildTrustReport(params: {
    campaignId: string;
    outputs: CampaignCueOutput[];
    workspaceId: string;
}): CampaignCueTrustReport {
    const findings: CampaignCueTrustFinding[] = [];
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
    if (params.action === "direct_publish" || params.action === "direct_send") {
        next.manualFallbackCount = increment(1);
    }
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

    const opportunity = resolveOpportunity({ businessBrain, input: params.input, workspaceId });
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
    const trustReport = buildTrustReport({
        campaignId,
        outputs: outputsDraft,
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

function assertCampaignActionAllowed(campaign: CampaignCueCampaign, action: CampaignCueActionType) {
    if (action === "direct_publish" || action === "direct_send") {
        return "Direct provider actions are disabled. Use manual export or handoff.";
    }
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
    const actionError = assertCampaignActionAllowed(campaign, params.input.action);
    if (actionError) {
        await Promise.all([
            writeEvent({
                action: "manual_fallback_shown",
                campaignId: campaign.id,
                channel: params.input.channel,
                metadata: { blockedAction: params.input.action, reason: actionError },
                outputId: params.input.outputId,
                scope: params.scope,
                workspaceId,
            }),
            updateDashboardSummary({ action: params.input.action, workspaceId }),
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
            action: params.input.action === "mark_used" ? "manual_fallback_completed" : `campaign_${params.input.action}`,
            campaignId: campaign.id,
            channel: params.input.channel,
            outputId: params.input.outputId,
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
        },
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
        createdAt: now,
        updatedAt: now,
    };
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

export async function recordCampaignCueIntegrationServer(params: {
    input: CampaignCueIntegrationActionInput;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const provider = providerStatuses().find((item) => item.provider === params.input.provider);
    const now = nowTimestamp();
    const connection: CampaignCueProviderConnection = {
        id: params.input.provider,
        workspaceId,
        provider: params.input.provider,
        label: provider?.label || params.input.provider,
        mode: provider?.mode || "disabled",
        status: params.input.action === "request_setup" ? "setup_requested" : "manual_only",
        requestedBy: params.scope.userId,
        reason: params.input.note || provider?.reason || "Provider stays manual until external setup is complete.",
        createdAt: now,
        updatedAt: now,
    };
    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.PROVIDER_CONNECTIONS).doc(connection.id),
        sanitizeForAdminFirestore(connection),
        { merge: true },
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX)),
        sanitizeForAdminFirestore({
            workspaceId,
            actorId: params.scope.userId,
            action: params.input.action === "request_setup" ? "integration_setup_requested" : "integration_manual_confirmed",
            metadata: {
                provider: params.input.provider,
                note: params.input.note,
            },
            confidence: "observed",
            createdAt: now,
        }),
    );
    await batch.commit();
    return connection;
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
    const directPublishingEnabled = params.input.directPublishingEnabled === undefined
        ? workspace.settings.directPublishingEnabled
        : Boolean(params.input.directPublishingEnabled && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PUBLISHING);
    const providerGenerationEnabled = params.input.providerGenerationEnabled === undefined
        ? workspace.settings.providerGenerationEnabled
        : Boolean(params.input.providerGenerationEnabled && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_GENERATION);
    const workspaceUpdate: Partial<CampaignCueWorkspace> = {
        agencyMode: params.input.agencyMode ?? workspace.agencyMode,
        multiLocationMode: params.input.multiLocationMode ?? workspace.multiLocationMode,
        settings: {
            ...workspace.settings,
            timezone: params.input.timezone ?? workspace.settings.timezone,
            locale: params.input.locale ?? workspace.settings.locale,
            directPublishingEnabled,
            providerGenerationEnabled,
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
        opportunities: buildCampaignCueOpportunities({ businessBrain: next, workspaceId }),
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
