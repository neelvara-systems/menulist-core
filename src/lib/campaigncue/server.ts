import {
    CAMPAIGNCUE_APPROVAL_ID_PREFIX,
    CAMPAIGNCUE_ASSET_ID_PREFIX,
    CAMPAIGNCUE_CAMPAIGN_ID_PREFIX,
    CAMPAIGNCUE_COLLECTIONS,
    CAMPAIGNCUE_DASHBOARD_SUMMARY_ID,
    CAMPAIGNCUE_EVENT_ID_PREFIX,
    CAMPAIGNCUE_IDEMPOTENCY_RETENTION_MS,
    CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES,
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
import {
    campaignCueOutputIntentSupportsOwnerGoal,
    getCampaignCueOutputPickerItem,
} from "@constant/campaigncue/outputPicker";
import { CAMPAIGNCUE_PRODUCT_CODE } from "@constant/campaigncue/product";
import { buildCampaignCueAuthLaunchUrl as buildCampaignCueAuthLaunchUrlFromSignIn } from "@constant/campaigncue/routes";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";
import {
    CAMPAIGNCUE_DEFAULT_LOCALE,
    CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
    CAMPAIGNCUE_DEFAULT_TIMEZONE,
} from "@constant/campaigncue/workspace";
import { DB_COLLECTIONS } from "@constant/database";
import { SIGNIN_URL } from "@constant/urls";
import { FEATURE_FLAGS } from "@config/features";
import {
    buildCampaignCueDailyDesk,
    dailyDeskRecipeForBusiness,
    uniqueCompactStrings,
} from "@lib/campaigncue/dailyDesk";
import { buildCampaignCueDecisions, campaignCueRecipeById } from "@lib/campaigncue/decisionEngine";
import {
    isCampaignCueWorkspaceStoragePath,
    parseCampaignCueAssetRecord,
} from "@lib/campaigncue/assetBoundary";
import {
    assertCampaignCueIdempotencyClaimOwnership,
    buildCampaignCueIdempotencyRequestHash,
    CampaignCueIdempotencyIdentityError,
    getCampaignCueIdempotencyClaimDecision,
} from "@lib/campaigncue/idempotency";
import {
    assertCampaignCueBusinessBrainRecordScope,
    assertCampaignCueStoreRecordScope,
    assertCampaignCueWorkspaceRecordScope,
    CampaignCueWorkspaceScopeError,
} from "@lib/campaigncue/workspaceScope";
import {
    parseCampaignCueAnalyticsSummaryRecord,
    parseCampaignCueCampaignRecord,
    parseCampaignCueLocationRecord,
    parseCampaignCueScheduleRecord,
    parseCampaignCueSourceInputRecord,
    parseCampaignCueSourceSnapshotRecord,
    parseCampaignCueTrustReportRecord,
} from "@lib/campaigncue/recordBoundary";
import { getUnresolvedCampaignCueOutputIntentRequirements } from "@lib/campaigncue/pack-templates/factSlotReadiness";
import {
    buildCampaignCuePatternCueBrief,
    buildCampaignCuePatternCueObservation,
    getLatestCampaignCuePatternCueSource,
    isCampaignCuePatternCueSourceInput,
} from "@lib/campaigncue/patternCue";
import {
    buildCampaignCueExperimentSuggestion,
    buildCampaignCuePackFreshness,
    evaluateCampaignCuePackFreshness,
    isCampaignCueDecisionSourceInput,
    isCampaignCueOperatingPulseCurrent,
    normalizeCampaignCueCommercialPolicy,
    normalizeCampaignCueLanguagePolicy,
    normalizeCampaignCueOperatingPulse,
    normalizeCampaignCuePresenceProfile,
} from "@lib/campaigncue/operatingLoop";
import {
    admin,
    campaigncueFirestoreAdmin as firestoreAdmin,
    campaigncueStorageAdmin,
} from "@lib/firebase/campaigncueFirebaseAdmin";
import { firestoreAdmin as menuListFirestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore as sanitizeFirestoreValue } from "@lib/firestore/sanitizeForFirestore";
import { logger } from "@lib/monitoring/logger";
import type {
    CampaignCueActionType,
    CampaignCueAnalyticsSummary,
    CampaignCueAsset,
    CampaignCueBrandPlaybook,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueChannel,
    CampaignCueCommercialGate,
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
import {
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

export interface CampaignCueSessionScope {
    email?: string;
    name?: string;
    sId: string;
    tId: string;
    userId: string;
}

const nowTimestamp = () => admin.firestore.Timestamp.now();
const CAMPAIGNCUE_IDEMPOTENCY_LEASE_MS = 5 * 60 * 1000;
type CampaignCueFirestoreBatch = ReturnType<typeof firestoreAdmin.batch>;

const compactString = (value: unknown, fallback = ""): string => {
    if (typeof value === "string") return value.trim() || fallback;
    if (value == null) return fallback;
    return String(value).trim() || fallback;
};

type CampaignCueLogMetadata = Record<string, boolean | number | string | null | undefined>;

const getCampaignCueSourceErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getCampaignCueSourceErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getCampaignCueSourceErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const toCampaignCueFailureCode = (message: string): string => {
    const normalized = message
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 96);
    return normalized.startsWith("campaigncue_") ? normalized : `campaigncue_${normalized || "api_failed"}`;
};

const isCampaignCueIdentifierLogKey = (key: string): boolean => (
    /(?:^|_)(user|tenant|store|workspace|campaign|asset|source|location|design|job|export|request|session)id$/i.test(key)
    || /(user|tenant|store|workspace|campaign|asset|source|location|design|job|export|request|session).*id/i.test(key)
);

const getCampaignCueBoundedStringContext = (key: string, value: unknown): CampaignCueLogMetadata => {
    const text = typeof value === "string" || typeof value === "number"
        ? String(value)
        : "";
    const trimmed = text.trim();
    return {
        [`${key}Present`]: trimmed.length > 0,
        [`${key}Length`]: trimmed.length,
    };
};

const getCampaignCueSafeLogMetadata = (metadata: Record<string, unknown>): CampaignCueLogMetadata => (
    Object.entries(metadata).reduce<CampaignCueLogMetadata>((acc, [key, value]) => {
        if (value === undefined || value === null || typeof value === "boolean" || typeof value === "number") {
            acc[key] = value as boolean | number | null | undefined;
            return acc;
        }
        if (typeof value === "string") {
            if (isCampaignCueIdentifierLogKey(key)) {
                Object.assign(acc, getCampaignCueBoundedStringContext(key, value));
            } else {
                acc[key] = value.slice(0, 128);
            }
            return acc;
        }
        acc[`${key}Present`] = true;
        return acc;
    }, {})
);

const getCampaignCueSourceErrorContext = (error: unknown): CampaignCueLogMetadata => ({
    sourceErrorName: getCampaignCueSourceErrorName(error),
    sourceErrorCode: getCampaignCueSourceErrorCode(error),
    sourceStatusCode: getCampaignCueSourceErrorStatus(error),
});

const sanitizeForAdminFirestore = (value: unknown) => sanitizeFirestoreValue(value, {
    dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
    undefinedObjectValue: "omit",
});

const stableHash = (value: unknown) => (
    createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24)
);

const timestampToIsoString = (value: unknown) => {
    if (!value) return "";
    const date = value instanceof Date
        ? value
        : typeof value === "string" || typeof value === "number"
            ? new Date(value)
            : typeof (value as { toDate?: unknown }).toDate === "function"
                ? (value as { toDate: () => Date }).toDate()
                : null;
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
};

const buildId = (prefix: string) => createTimestampedRuntimeId(prefix, 8);

const hasOwn = <T extends object, K extends PropertyKey>(value: T, key: K) => (
    Object.prototype.hasOwnProperty.call(value, key)
);

const normalizeBrandPlaybookList = (value: unknown, limit: number) => {
    if (!Array.isArray(value)) return [];
    return uniqueCompactStrings(value.map((item) => compactString(item)), limit);
};

const normalizeBrandPlaybook = (value: unknown): CampaignCueBrandPlaybook => {
    const playbook = (value || {}) as Partial<CampaignCueBrandPlaybook>;
    return {
        targetAudience: compactString(playbook.targetAudience) || undefined,
        brandFeel: normalizeBrandPlaybookList(playbook.brandFeel, 8),
        inspirationNotes: normalizeBrandPlaybookList(playbook.inspirationNotes, 8),
        visualMotifs: normalizeBrandPlaybookList(playbook.visualMotifs, 8),
        avoidList: normalizeBrandPlaybookList(playbook.avoidList, 10),
        productFocus: normalizeBrandPlaybookList(playbook.productFocus, 10),
        typographyNotes: compactString(playbook.typographyNotes) || undefined,
    };
};

const hasBrandPlaybookSignal = (playbook: CampaignCueBrandPlaybook) => Boolean(
    playbook.targetAudience
    || playbook.typographyNotes
    || playbook.brandFeel.length
    || playbook.inspirationNotes.length
    || playbook.visualMotifs.length
    || playbook.avoidList.length
    || playbook.productFocus.length,
);

const brandPlaybookSourceRefs = (businessBrain: CampaignCueBusinessBrain) => (
    hasBrandPlaybookSignal(businessBrain.brandKit.playbook) ? ["brand_playbook"] : []
);

const isCampaignSourceInputRef = (sourceRef?: string) => Boolean(
    sourceRef && sourceRef !== "store_profile" && sourceRef !== "brand_playbook",
);

const isCampaignPatternRef = (sourceRef?: string) => Boolean(sourceRef?.startsWith("pattern:"));
const isCampaignPatternSourceRef = (sourceRef?: string) => (
    sourceRef === "cc_source_pattern_current" || isCampaignPatternRef(sourceRef)
);

const mergeBrandPlaybookPatch = (
    current: CampaignCueBrandPlaybook,
    input: CampaignCueBusinessPatchInput,
): CampaignCueBrandPlaybook => normalizeBrandPlaybook({
    targetAudience: hasOwn(input, "targetAudience") ? input.targetAudience : current.targetAudience,
    brandFeel: hasOwn(input, "brandFeel") ? input.brandFeel : current.brandFeel,
    inspirationNotes: hasOwn(input, "inspirationNotes") ? input.inspirationNotes : current.inspirationNotes,
    visualMotifs: hasOwn(input, "visualMotifs") ? input.visualMotifs : current.visualMotifs,
    avoidList: hasOwn(input, "avoidList") ? input.avoidList : current.avoidList,
    productFocus: hasOwn(input, "productFocus") ? input.productFocus : current.productFocus,
    typographyNotes: hasOwn(input, "typographyNotes") ? input.typographyNotes : current.typographyNotes,
});

const brandPlaybookBriefLine = (businessBrain: CampaignCueBusinessBrain) => {
    const playbook = businessBrain.brandKit.playbook;
    if (!hasBrandPlaybookSignal(playbook)) return "";
    return uniqueCompactStrings([
        playbook.targetAudience ? `Audience: ${playbook.targetAudience}` : undefined,
        playbook.brandFeel.length ? `Feel: ${playbook.brandFeel.join(", ")}` : undefined,
        playbook.visualMotifs.length ? `Visual motifs: ${playbook.visualMotifs.join(", ")}` : undefined,
        playbook.productFocus.length ? `Focus: ${playbook.productFocus.join(", ")}` : undefined,
        playbook.avoidList.length ? `Avoid: ${playbook.avoidList.join(", ")}` : undefined,
    ], 5).join(" | ");
};

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
    clientMessage: string;
    code = CAMPAIGNCUE_ERROR_CODES.IDEMPOTENCY_CONFLICT;
    status = 409 as const;

    constructor(message = "This CampaignCue request is already running or the idempotency key was reused.") {
        super(message);
        this.clientMessage = message;
        this.name = "CampaignCueIdempotencyConflictError";
    }
}

class CampaignCueDecisionGateError extends Error {
    clientMessage: string;
    code = CAMPAIGNCUE_ERROR_CODES.DECISION_GATE;
    status = 409 as const;

    constructor(message = "Confirm required campaign details before creating this pack.") {
        super(message);
        this.clientMessage = message;
        this.name = "CampaignCueDecisionGateError";
    }
}

class CampaignCueAssetAccessError extends Error {
    clientMessage: string;
    status: 404 | 409;

    constructor(message: string, status: 404 | 409) {
        super(message);
        this.clientMessage = message;
        this.name = "CampaignCueAssetAccessError";
        this.status = status;
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

async function assertCurrentCampaignCueWorkspaceAccess(
    transaction: FirebaseFirestore.Transaction,
    scope: CampaignCueSessionScope,
    workspaceId: string,
) {
    const currentWorkspaceSnap = await transaction.get(workspaceRef(workspaceId));
    return normalizeCampaignCueWorkspace(assertCampaignCueWorkspaceRecordScope(
        currentWorkspaceSnap.exists ? currentWorkspaceSnap.data() : null,
        { ...scope, workspaceId },
    ));
}

const defaultBusinessBrainId = "default";
const defaultSourceSnapshotId = "current";

async function readStoreData(scope: CampaignCueSessionScope): Promise<any | null> {
    const snap = await menuListFirestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(scope.sId).get();
    if (!snap.exists) throw new CampaignCueWorkspaceScopeError();
    return assertCampaignCueStoreRecordScope(snap.data(), scope);
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
    if (raw.includes("retail") || raw.includes("shop") || raw.includes("store") || raw.includes("boutique")) return "retail";
    if (raw.includes("fitness") || raw.includes("gym") || raw.includes("yoga") || raw.includes("pilates")) return "fitness";
    if (raw.includes("clinic") || raw.includes("dental") || raw.includes("doctor") || raw.includes("health")) return "clinic";
    if (raw.includes("service") || raw.includes("repair") || raw.includes("clean") || raw.includes("plumb") || raw.includes("electric")) return "local_service";
    if (raw.includes("agency")) return "agency_client";
    return "restaurant";
}

function isServiceBusinessType(businessType: CampaignCueBusinessBrain["businessType"]) {
    return businessType === "salon"
        || businessType === "local_service"
        || businessType === "fitness"
        || businessType === "clinic";
}

function primaryItemLabelForBusiness(businessType: CampaignCueBusinessBrain["businessType"]) {
    if (businessType === "retail") return "Featured product";
    return "Featured item";
}

function primaryServiceLabelForBusiness(businessType: CampaignCueBusinessBrain["businessType"]) {
    if (businessType === "salon") return "Featured service";
    if (businessType === "fitness") return "Featured class";
    if (businessType === "clinic") return "Appointment type";
    if (businessType === "local_service") return "Featured service";
    return "Catering inquiry";
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
    const whatsapp = compactString(
        storeData?.whatsapp
        || storeData?.whatsappNumber
        || storeData?.publicPresence?.whatsappNumber
        || storeData?.phoneNumber
        || storeData?.phone
        || storeData?.contactNumber
        || "",
    );
    const serviceFallback = {
        id: "service_1",
        name: primaryServiceLabelForBusiness(businessType),
        category: isServiceBusinessType(businessType) ? "Services" : "Service",
        available: true,
        sourceRefs: ["store_profile"],
    };
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (!businessName) blockers.push("Business name is missing.");
    if (!publicMenuUrl && businessType === "restaurant") warnings.push("Public menu link is not connected.");
    if (!website && !phone && !whatsapp && !storeData?.bookingUrl) {
        warnings.push("Campaign CTA needs a website, booking link, phone, WhatsApp, or menu link.");
    }
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
            whatsapp,
            bookingUrl: compactString(storeData?.bookingUrl || ""),
            publicMenuUrl,
        },
        brandKit: {
            primaryColor: compactString(storeData?.brandColor || storeData?.primaryColor || CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR),
            logoUrl: compactString(storeData?.logo || storeData?.logoUrl || ""),
            voice: "friendly",
            playbook: normalizeBrandPlaybook(null),
        },
        locale: compactString(storeData?.locale || CAMPAIGNCUE_DEFAULT_LOCALE),
        timezone: compactString(storeData?.timezone || CAMPAIGNCUE_DEFAULT_TIMEZONE),
        catalog: {
            items: buildDefaultItems(storeData).map((item, index) => ({
                ...item,
                name: index === 0 && item.name === "Featured item" ? primaryItemLabelForBusiness(businessType) : item.name,
            })),
            services: [serviceFallback],
        },
        operatingPulse: normalizeCampaignCueOperatingPulse(null),
        commercialPolicy: normalizeCampaignCueCommercialPolicy(null),
        presence: normalizeCampaignCuePresenceProfile(null),
        languagePolicy: normalizeCampaignCueLanguagePolicy(null, compactString(storeData?.locale || CAMPAIGNCUE_DEFAULT_LOCALE)),
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
    const facts = buildSourceFacts(businessBrain, sourceInputs).sort((a, b) => a.id.localeCompare(b.id));
    const missingFacts = buildMissingSourceFacts(businessBrain, sourceInputs);
    const verticalRisks = buildVerticalRisks(businessBrain);
    const businessSourceInputs = sourceInputs.filter((input) => input.sourceType !== "inspiration_pattern");
    const patternRefs = sourceInputs.flatMap((input) => input.sourceRefs.filter(isCampaignPatternRef)).sort();
    return {
        id: defaultSourceSnapshotId,
        workspaceId: businessBrain.workspaceId,
        sourceType: businessSourceInputs.length ? "manual" : "menulist",
        sourceHash: stableHash(facts),
        sourceRefs: Array.from(new Set([
            "store_profile",
            ...brandPlaybookSourceRefs(businessBrain),
            ...sourceInputs.map((input) => input.id),
            ...patternRefs,
        ])),
        confidence: businessBrain.sourceConfidence,
        freshness: missingFacts.length ? "unknown" : "fresh",
        summary: `${businessBrain.name} ${businessBrain.locality ? `in ${businessBrain.locality}` : ""} · ${facts.length} saved facts`.trim(),
        facts,
        missingFacts,
        verticalRisks,
    };
}

function buildSourceSnapshotFromExistingSnapshot(params: {
    businessBrain: CampaignCueBusinessBrain;
    existingSnapshot?: CampaignCueSourceSnapshot | null;
    sourceInput?: CampaignCueSourceInput;
}): CampaignCueSourceSnapshot {
    const baseFacts = buildSourceFacts(params.businessBrain);
    const baseFactIds = new Set(baseFacts.map((fact) => fact.id));
    const previousInputFacts = (params.existingSnapshot?.facts || [])
        .filter((fact) => isCampaignSourceInputRef(fact.sourceRef) && !baseFactIds.has(fact.id));
    const nextFacts = params.sourceInput ? sourceInputToFacts(params.sourceInput) : [];
    const factsById = new Map<string, CampaignCueSourceFact>();
    [...baseFacts, ...previousInputFacts, ...nextFacts].forEach((fact) => {
        factsById.set(fact.id, fact);
    });
    const facts = Array.from(factsById.values()).sort((a, b) => a.id.localeCompare(b.id));
    const sourceRefs = Array.from(new Set([
        "store_profile",
        ...brandPlaybookSourceRefs(params.businessBrain),
        ...(params.existingSnapshot?.sourceRefs || []).filter((sourceRef) => (
            isCampaignSourceInputRef(sourceRef)
            && !(params.sourceInput?.sourceType === "inspiration_pattern" && isCampaignPatternRef(sourceRef))
        )),
        params.sourceInput?.id,
        ...(params.sourceInput?.sourceRefs || []).filter(isCampaignPatternRef),
    ].filter(Boolean) as string[]));
    const hasManualSourceInput = sourceRefs.some((sourceRef) => (
        isCampaignSourceInputRef(sourceRef) && !isCampaignPatternSourceRef(sourceRef)
    ));
    const hasActiveSourceInput = facts.some((fact) => isCampaignSourceInputRef(fact.sourceRef) && fact.risk === "low");
    const missingFacts = buildMissingSourceFactsFromState(params.businessBrain, hasActiveSourceInput);
    const verticalRisks = buildVerticalRisks(params.businessBrain);
    return {
        id: defaultSourceSnapshotId,
        workspaceId: params.businessBrain.workspaceId,
        sourceType: hasManualSourceInput ? "manual" : "menulist",
        sourceHash: stableHash(facts),
        sourceRefs,
        confidence: params.businessBrain.sourceConfidence,
        freshness: missingFacts.length ? "unknown" : "fresh",
        summary: `${params.businessBrain.name} ${params.businessBrain.locality ? `in ${params.businessBrain.locality}` : ""} · ${facts.length} saved facts`.trim(),
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
    if (input.sourceType === "inspiration_pattern") return [];
    const ready = input.status === "active";
    const expiry = timestampToIsoString(input.expiresAt);
    const fact = buildSourceFact({
        id: `${input.id}_fact`,
        label: input.label,
        value: input.value,
        sourceRef: input.id,
        sourceType: sourceTypeToFactType(input.sourceType),
        confidence: input.confidence,
        freshness: ready ? "fresh" : "unknown",
        risk: ready ? "low" : "needs_review",
    });
    const validityFact = expiry ? buildSourceFact({
        id: `${input.id}_valid_until`,
        label: `${input.label} valid until`,
        value: expiry,
        sourceRef: input.id,
        sourceType: "policy",
        confidence: input.confidence,
        freshness: ready ? "fresh" : "unknown",
        risk: ready ? "low" : "needs_review",
    }) : null;
    return [fact, validityFact].filter(Boolean) as CampaignCueSourceFact[];
}

function buildSourceFacts(
    businessBrain: CampaignCueBusinessBrain,
    sourceInputs: CampaignCueSourceInput[] = [],
): CampaignCueSourceFact[] {
    const item = businessBrain.catalog.items.find((entry) => entry.available) || businessBrain.catalog.items[0];
    const service = businessBrain.catalog.services.find((entry) => entry.available) || businessBrain.catalog.services[0];
    const playbook = businessBrain.brandKit.playbook;
    const operatingPulse = normalizeCampaignCueOperatingPulse(businessBrain.operatingPulse);
    const commercialPolicy = normalizeCampaignCueCommercialPolicy(businessBrain.commercialPolicy);
    const presence = normalizeCampaignCuePresenceProfile(businessBrain.presence);
    const languagePolicy = normalizeCampaignCueLanguagePolicy(businessBrain.languagePolicy, businessBrain.locale);
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
            label: isServiceBusinessType(businessBrain.businessType) ? "Primary service" : "Primary item",
            value: isServiceBusinessType(businessBrain.businessType) ? service?.name : item?.name,
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
        buildSourceFact({
            id: "brand_target_audience",
            label: "Brand audience",
            value: playbook.targetAudience,
            sourceRef: "brand_playbook",
            sourceType: "business_profile",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "brand_feel",
            label: "Brand feel",
            value: playbook.brandFeel.join(", "),
            sourceRef: "brand_playbook",
            sourceType: "business_profile",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "brand_visual_motifs",
            label: "Brand visual motifs",
            value: playbook.visualMotifs.join(", "),
            sourceRef: "brand_playbook",
            sourceType: "business_profile",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "brand_product_focus",
            label: "Brand product focus",
            value: playbook.productFocus.join(", "),
            sourceRef: "brand_playbook",
            sourceType: "business_profile",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "brand_avoid_list",
            label: "Brand avoid list",
            value: playbook.avoidList.join(", "),
            sourceRef: "brand_playbook",
            sourceType: "policy",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "brand_typography",
            label: "Brand typography",
            value: playbook.typographyNotes,
            sourceRef: "brand_playbook",
            sourceType: "business_profile",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "operating_pulse",
            label: "Owner operating pulse",
            value: [
                `business ${operatingPulse.businessState}`,
                `capacity ${operatingPulse.capacityStatus}`,
                `stock ${operatingPulse.stockStatus}`,
                operatingPulse.localMoment,
                operatingPulse.note,
            ].filter(Boolean).join("; "),
            sourceRef: "business_brain_operating_pulse",
            sourceType: "policy",
            confidence: "manual",
            freshness: isCampaignCueOperatingPulseCurrent(operatingPulse) ? "fresh" : "stale",
            risk: isCampaignCueOperatingPulseCurrent(operatingPulse) ? "low" : "needs_review",
        }),
        buildSourceFact({
            id: "operating_pulse_valid_until",
            label: "Owner pulse valid until",
            value: timestampToIsoString(operatingPulse.validUntil),
            sourceRef: "business_brain_operating_pulse",
            sourceType: "policy",
            confidence: "manual",
            freshness: isCampaignCueOperatingPulseCurrent(operatingPulse) ? "fresh" : "stale",
            risk: isCampaignCueOperatingPulseCurrent(operatingPulse) ? "low" : "needs_review",
        }),
        buildSourceFact({
            id: "commercial_policy",
            label: "Commercial safety policy",
            value: [
                commercialPolicy.promotionsAllowed ? "promotions allowed" : "promotions paused",
                commercialPolicy.discountsAllowed ? "discounts allowed" : "discounts disabled",
                commercialPolicy.discountApprovalRequired ? "discount approval required" : "discount approval not required",
                commercialPolicy.maxDiscountPercent == null ? undefined : `maximum discount ${commercialPolicy.maxDiscountPercent}%`,
                commercialPolicy.minimumPromotedPrice == null ? undefined : `minimum promoted price ${commercialPolicy.minimumPromotedPrice} ${commercialPolicy.currencyCode}`,
                `currency ${commercialPolicy.currencyCode}`,
                commercialPolicy.doNotPromote.length ? `do not promote: ${commercialPolicy.doNotPromote.join(", ")}` : undefined,
            ].filter(Boolean).join("; "),
            sourceRef: "business_brain_commercial_policy",
            sourceType: "policy",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "presence_google_profile",
            label: "Google Business Profile",
            value: presence.googleBusinessProfileUrl,
            sourceRef: "business_brain_presence",
            sourceType: "contact",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "presence_google_review",
            label: "Google review destination",
            value: presence.googleReviewUrl,
            sourceRef: "business_brain_presence",
            sourceType: "contact",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "presence_apple_profile",
            label: "Apple Business Connect",
            value: presence.appleBusinessConnectUrl,
            sourceRef: "business_brain_presence",
            sourceType: "contact",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "presence_instagram",
            label: "Instagram",
            value: presence.instagramUrl,
            sourceRef: "business_brain_presence",
            sourceType: "contact",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "presence_facebook",
            label: "Facebook",
            value: presence.facebookUrl,
            sourceRef: "business_brain_presence",
            sourceType: "contact",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "presence_whatsapp_catalog",
            label: "WhatsApp catalog",
            value: presence.whatsappCatalogUrl,
            sourceRef: "business_brain_presence",
            sourceType: "contact",
            confidence: "manual",
        }),
        buildSourceFact({
            id: "language_policy",
            label: "Campaign languages",
            value: [languagePolicy.sourceLocale, ...languagePolicy.targetLocales].join(", "),
            sourceRef: "business_brain_language_policy",
            sourceType: "policy",
            confidence: "manual",
        }),
    ].filter(Boolean) as CampaignCueSourceFact[];
    return [
        ...baseFacts,
        ...sourceInputs.flatMap((sourceInput) => sourceInputToFacts(sourceInput)),
    ];
}

function campaignCueBusinessHasCta(businessBrain: CampaignCueBusinessBrain) {
    return Boolean(
        businessBrain.contacts.bookingUrl
        || businessBrain.contacts.publicMenuUrl
        || businessBrain.contacts.website
        || businessBrain.contacts.whatsapp
        || businessBrain.contacts.phone,
    );
}

function buildMissingSourceFacts(
    businessBrain: CampaignCueBusinessBrain,
    sourceInputs: CampaignCueSourceInput[] = [],
): string[] {
    return buildMissingSourceFactsFromState(
        businessBrain,
        sourceInputs.some((input) => isCampaignCueDecisionSourceInput(input)),
    );
}

function buildMissingSourceFactsFromState(
    businessBrain: CampaignCueBusinessBrain,
    hasActiveSourceInput: boolean,
): string[] {
    const missing: string[] = [];
    const hasCta = campaignCueBusinessHasCta(businessBrain);
    if (!hasCta) missing.push("Add one contact, booking, menu, or website link before posting.");
    if (businessBrain.businessType === "restaurant" && !businessBrain.contacts.publicMenuUrl) {
        missing.push("Add a public menu link so price and item details stay easy to verify.");
    }
    if (isServiceBusinessType(businessBrain.businessType) && !businessBrain.contacts.bookingUrl && !businessBrain.contacts.whatsapp && !businessBrain.contacts.phone) {
        missing.push("Add a booking, WhatsApp, phone, or website contact before running service campaigns.");
    }
    if (!hasActiveSourceInput) {
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
    if (businessBrain.businessType === "fitness") {
        return [
            "Class date, time, capacity, and booking path must be verified before sharing.",
            "Body, health, transformation, and member-image claims need proof and consent.",
        ];
    }
    if (businessBrain.businessType === "clinic") {
        return [
            "Appointment reminders must avoid diagnosis, cure, emergency, or medical advice claims.",
            "Patient privacy and staff/image consent must be confirmed before use.",
        ];
    }
    if (businessBrain.businessType === "local_service") {
        return [
            "Service area, contact path, and any price/date details must be verified before posting.",
            "Do not guarantee repair, legal, financial, safety, or regulated outcomes.",
        ];
    }
    if (businessBrain.businessType === "retail") {
        return [
            "Price, stock, offer date, and product photo must match the current store truth.",
            "Do not imply unavailable inventory, discounts, or product guarantees.",
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
        productId: CAMPAIGNCUE_PRODUCT_CODE,
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

function normalizeCampaignCueBusinessBrain(businessBrain: CampaignCueBusinessBrain): CampaignCueBusinessBrain {
    const brandKit = (businessBrain.brandKit || {}) as {
        logoUrl?: string;
        playbook?: Partial<CampaignCueBrandPlaybook>;
        primaryColor?: string;
        voice?: CampaignCueBusinessBrain["brandKit"]["voice"];
    };
    return {
        ...businessBrain,
        contacts: businessBrain.contacts || {},
        brandKit: {
            primaryColor: compactString(brandKit.primaryColor || CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR),
            logoUrl: compactString(brandKit.logoUrl) || undefined,
            voice: brandKit.voice || "friendly",
            playbook: normalizeBrandPlaybook(brandKit.playbook),
        },
        locale: compactString(businessBrain.locale, CAMPAIGNCUE_DEFAULT_LOCALE),
        timezone: compactString(businessBrain.timezone, CAMPAIGNCUE_DEFAULT_TIMEZONE),
        catalog: {
            items: businessBrain.catalog?.items || [],
            services: businessBrain.catalog?.services || [],
        },
        operatingPulse: normalizeCampaignCueOperatingPulse(businessBrain.operatingPulse),
        commercialPolicy: normalizeCampaignCueCommercialPolicy(businessBrain.commercialPolicy),
        presence: normalizeCampaignCuePresenceProfile(businessBrain.presence),
        languagePolicy: normalizeCampaignCueLanguagePolicy(businessBrain.languagePolicy, compactString(businessBrain.locale, CAMPAIGNCUE_DEFAULT_LOCALE)),
        readiness: businessBrain.readiness || {
            status: "limited",
            blockers: [],
            warnings: [],
        },
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
    const storeData = await readStoreData(scope);
    const ref = workspaceRef(workspaceId);
    const workspace = await firestoreAdmin.runTransaction(async (transaction) => {
        const workspaceSnap = await transaction.get(ref);
        if (workspaceSnap.exists) {
            return normalizeCampaignCueWorkspace(assertCampaignCueWorkspaceRecordScope(
                workspaceSnap.data(),
                { ...scope, workspaceId },
            ));
        }
        const created = buildWorkspace({ scope, storeData, workspaceId });
        transaction.create(ref, sanitizeForAdminFirestore(created));
        return created;
    });

    const businessRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS)
        .doc(defaultBusinessBrainId);
    const businessSnap = await businessRef.get();
    if (businessSnap.exists) {
        return {
            workspace,
            businessBrain: normalizeCampaignCueBusinessBrain(
                assertCampaignCueBusinessBrainRecordScope(businessSnap.data(), workspaceId),
            ),
        };
    }

    return firestoreAdmin.runTransaction(async (transaction) => {
        const sourceRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS)
            .doc(defaultSourceSnapshotId);
        const summaryRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
            .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID);
        const [currentWorkspaceSnap, currentBusinessSnap, sourceSnap, summarySnap] = await Promise.all([
            transaction.get(ref),
            transaction.get(businessRef),
            transaction.get(sourceRef),
            transaction.get(summaryRef),
        ]);
        const currentWorkspace = normalizeCampaignCueWorkspace(assertCampaignCueWorkspaceRecordScope(
            currentWorkspaceSnap.exists ? currentWorkspaceSnap.data() : null,
            { ...scope, workspaceId },
        ));
        const businessBrain = currentBusinessSnap.exists
            ? normalizeCampaignCueBusinessBrain(
                assertCampaignCueBusinessBrainRecordScope(currentBusinessSnap.data(), workspaceId),
            )
            : buildBusinessBrain({ scope, storeData, workspaceId });
        if (!currentBusinessSnap.exists) {
            transaction.create(businessRef, sanitizeForAdminFirestore(businessBrain));
        }
        if (!sourceSnap.exists) {
            transaction.create(sourceRef, sanitizeForAdminFirestore(buildSourceSnapshot(businessBrain)));
        }
        if (!summarySnap.exists) {
            transaction.create(summaryRef, sanitizeForAdminFirestore(dashboardSummarySeed(workspaceId)));
        }
        return { workspace: currentWorkspace, businessBrain };
    });
}

async function ensureCampaignCueWorkspaceOnlyServer(scope: CampaignCueSessionScope): Promise<CampaignCueWorkspace> {
    const workspaceId = buildCampaignCueWorkspaceId(scope);
    await readStoreData(scope);
    const snap = await workspaceRef(workspaceId).get();
    if (snap.exists) {
        return normalizeCampaignCueWorkspace(assertCampaignCueWorkspaceRecordScope(
            snap.data(),
            { ...scope, workspaceId },
        ));
    }
    const created = await ensureCampaignCueWorkspaceServer(scope);
    return created.workspace;
}

export function buildCampaignCueOpportunities(params: {
    analytics?: CampaignCueAnalyticsSummary;
    assets?: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaigns?: CampaignCueCampaign[];
    locations?: CampaignCueLocation[];
    schedules?: CampaignCueSchedule[];
    sourceInputs?: CampaignCueSourceInput[];
    sourceSnapshot?: CampaignCueSourceSnapshot;
    workspaceId: string;
}): CampaignCueOpportunity[] {
    const { analytics, assets = [], businessBrain, campaigns = [], locations = [], schedules = [], sourceInputs = [], workspaceId } = params;
    const primaryItem = businessBrain.catalog.items.find((item) => item.available) || businessBrain.catalog.items[0];
    const primaryService = businessBrain.catalog.services.find((service) => service.available) || businessBrain.catalog.services[0];
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const businessSourceInputs = sourceInputs.filter((input) => input.sourceType !== "inspiration_pattern");
    const activeInputs = businessSourceInputs.filter((input) => isCampaignCueDecisionSourceInput(input, nowDate));
    const sourceSnapshot = params.sourceSnapshot || buildSourceSnapshot(businessBrain, sourceInputs);
    const snapshotSourceRefs = businessSourceInputs.length
        ? []
        : sourceSnapshot.sourceRefs.filter((sourceRef) => (
            isCampaignSourceInputRef(sourceRef) && !isCampaignPatternSourceRef(sourceRef)
        ));
    const snapshotReadyFactCount = businessSourceInputs.length
        ? 0
        : sourceSnapshot.facts.filter((fact) => (
            isCampaignSourceInputRef(fact.sourceRef) && fact.risk === "low"
        )).length;
    const readySourceCount = activeInputs.length || snapshotReadyFactCount;
    const sourceReferences = [
        businessBrain.sourceSnapshotId || defaultSourceSnapshotId,
        ...(activeInputs.length
            ? activeInputs.slice(0, 4).map((input) => input.id)
            : snapshotSourceRefs.slice(0, 4)),
    ];
    const needsReviewInputs = businessSourceInputs.filter((input) => input.status === "needs_review");
    const restrictedAssets = assets.filter((asset) => asset.rights.status === "restricted");
    const reviewAssets = assets.filter((asset) => asset.rights.status === "needs_review");
    const activeLocations = locations.filter((location) => location.status === "active");
    const dueSchedules = schedules.filter((schedule) => schedule.status === "due" || schedule.status === "scheduled");
    const usefulCampaign = campaigns.find((campaign) => Number(campaign.resultMemory?.usefulCount || 0) > 0);
    const notUsefulCampaign = campaigns.find((campaign) => Number(campaign.resultMemory?.notUsefulCount || 0) > 0);
    const hasGoogleOutput = campaigns.some((campaign) => campaign.outputs.some((output) => output.channel === "google_local"));
    const presence = normalizeCampaignCuePresenceProfile(businessBrain.presence);

    const base: CampaignCueOpportunity[] = [];
    if (isServiceBusinessType(businessBrain.businessType)) {
        base.push({
            id: "cue_booking_fill",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: `${primaryService?.name || primaryServiceLabelForBusiness(businessBrain.businessType)} booking push`,
            reason: "Service and contact details are ready for a booking-focused campaign.",
            type: "booking_fill",
            priority: readySourceCount ? 96 : 88,
            channels: ["whatsapp", "creative", "ugc", "calendar"],
            sourceReferences,
            status: "open",
            actionLabel: businessBrain.businessType === "clinic" ? "Create reminder pack" : "Create booking pack",
            ownerBenefit: businessBrain.businessType === "clinic"
                ? "Prepare a conservative appointment reminder that points to the saved booking or contact path."
                : "Fill open appointment slots with copy that points to the saved booking or WhatsApp contact.",
            evidence: [
                primaryService?.name || primaryServiceLabelForBusiness(businessBrain.businessType),
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
            priority: readySourceCount ? 98 : 90,
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
                `${readySourceCount} ready input${readySourceCount === 1 ? "" : "s"}`,
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

    if (usefulCampaign) {
        base.push({
            id: "cue_repeat_worked_before",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Repeat what worked",
            reason: `${usefulCampaign.title} has a useful owner-reported result.`,
            type: "outcome_followup",
            priority: 89,
            channels: usefulCampaign.channels.length ? usefulCampaign.channels : ["whatsapp", "google_local", "creative"],
            sourceReferences: [usefulCampaign.id, ...sourceReferences],
            status: "open",
            actionLabel: "Create similar pack",
            ownerBenefit: "Use a campaign pattern the owner already reported as useful.",
            evidence: [
                usefulCampaign.resultMemory?.lastNote || "Owner reported a useful result.",
                `${usefulCampaign.resultMemory?.usefulCount || 1} useful result${Number(usefulCampaign.resultMemory?.usefulCount || 1) === 1 ? "" : "s"}`,
            ],
            createdAt: now,
            updatedAt: now,
        });
    }

    if (notUsefulCampaign) {
        base.push({
            id: "cue_adjust_after_not_useful",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Adjust the next pack",
            reason: `${notUsefulCampaign.title} was marked not useful.`,
            type: "source_fix",
            priority: 83,
            channels: ["creative", "calendar"],
            sourceReferences: [notUsefulCampaign.id, ...sourceReferences],
            status: "open",
            actionLabel: "Review inputs",
            ownerBenefit: "Change the offer, channel, photo, or missing facts before preparing the next pack.",
            evidence: [
                notUsefulCampaign.resultMemory?.lastNote || "Owner marked a campaign as not useful.",
            ],
            createdAt: now,
            updatedAt: now,
        });
    }

    const localVisibilityNeedsReview = !hasGoogleOutput || !businessBrain.locality || !campaignCueBusinessHasCta(businessBrain);
    base.push({
        id: "cue_local_visibility_refresh",
        workspaceId,
        businessBrainId: businessBrain.businessBrainId,
        title: "Refresh local visibility",
        reason: localVisibilityNeedsReview
            ? "Local discovery needs current facts, a fresh Google-ready update, and a clear destination."
            : "Local discovery can still use a fresh manual Google-ready update from current facts.",
        type: "local_visibility",
        priority: localVisibilityNeedsReview ? (!businessBrain.locality || !campaignCueBusinessHasCta(businessBrain) ? 91 : 79) : 62,
        channels: ["google_local", "creative", "whatsapp", "calendar"],
        sourceReferences,
        status: "open",
        actionLabel: "Create visibility pack",
        ownerBenefit: "Keep local search and customer-facing updates current without direct provider posting.",
        evidence: [
            businessBrain.locality || "Area or city needs review",
            hasGoogleOutput ? "Google draft exists" : "No Google-ready draft yet",
            campaignCueBusinessHasCta(businessBrain) ? "Destination exists" : "Destination needs review",
        ],
        createdAt: now,
        updatedAt: now,
    });

    base.push(
        {
            id: "cue_review_request",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Customer review request",
            reason: presence.googleReviewUrl
                ? "A verified review destination is ready for an owner-controlled customer follow-up."
                : "Add and verify a review destination before asking recent customers for an honest review.",
            type: "review_request",
            priority: presence.googleReviewUrl ? 77 : 58,
            channels: ["whatsapp", "google_local", "creative", "calendar"],
            sourceReferences,
            status: "open",
            actionLabel: presence.googleReviewUrl ? "Create review pack" : "Add review link",
            ownerBenefit: "Prepare a compliant review request, staff script, and counter handoff without storing customer contacts.",
            evidence: [
                presence.googleReviewUrl ? "Review destination verified" : "Review destination missing",
                "Owner sends manually after a real customer visit or completed service",
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            id: "cue_return_customer",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Return-customer reminder",
            reason: "Prepare one current reason for past customers to return through an owner-managed channel.",
            type: "retention",
            priority: usefulCampaign ? 81 : readySourceCount ? 72 : 55,
            channels: ["whatsapp", "creative", "google_local", "calendar"],
            sourceReferences,
            status: "open",
            actionLabel: "Create return pack",
            ownerBenefit: "Prepare reminder copy and staff follow-up without importing a CRM or customer contact list.",
            evidence: [
                readySourceCount ? `${readySourceCount} current input${readySourceCount === 1 ? "" : "s"}` : "Current reason to return needs input",
                usefulCampaign?.resultMemory?.lastNote || "No prior positive result is required",
            ],
            createdAt: now,
            updatedAt: now,
        },
    );

    if (dueSchedules.length) {
        base.push({
            id: "cue_scheduled_manual_post",
            workspaceId,
            businessBrainId: businessBrain.businessBrainId,
            title: "Finish scheduled manual post",
            reason: "A scheduled manual task is waiting to be downloaded, posted, or marked used.",
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

async function listSubcollection<T>(
    workspaceId: string,
    collection: string,
    parseRecord: (value: unknown, workspaceId: string) => T,
    limitCount = CAMPAIGNCUE_PAGE_SIZE,
): Promise<T[]> {
    const snap = await workspaceSubcollection(workspaceId, collection)
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();
    const records: T[] = [];
    let invalidCount = 0;
    snap.docs.forEach((doc) => {
        try {
            records.push(parseRecord(doc.data(), workspaceId));
        } catch {
            invalidCount += 1;
        }
    });
    if (invalidCount) {
        logCampaignCueServerError("CampaignCue invalid persisted records omitted", new Error("persisted_record_invalid"), {
            collection,
            invalidCount,
            workspaceId,
        });
    }
    return records;
}

async function listCampaignCueAssetRecords(workspaceId: string): Promise<CampaignCueAsset[]> {
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS)
        .orderBy("createdAt", "desc")
        .limit(CAMPAIGNCUE_PAGE_SIZE)
        .get();
    const assets: CampaignCueAsset[] = [];
    let invalidCount = 0;
    snap.docs.forEach((doc) => {
        try {
            assets.push(parseCampaignCueAssetRecord({ assetId: doc.id, value: doc.data(), workspaceId }));
        } catch {
            invalidCount += 1;
        }
    });
    if (invalidCount) {
        logCampaignCueServerError("CampaignCue invalid asset records omitted", new Error("asset_record_invalid"), {
            invalidCount,
            workspaceId,
        });
    }
    return assets;
}

const withCampaignCuePatternSource = (
    workspace: CampaignCueWorkspace,
    sourceInputs: CampaignCueSourceInput[],
): CampaignCueSourceInput[] => {
    const patternCueSource = FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PATTERN_CUE ? workspace.patternCueSource : undefined;
    if (!patternCueSource || !isCampaignCuePatternCueSourceInput(patternCueSource)) return sourceInputs;
    return [patternCueSource, ...sourceInputs.filter((input) => input.id !== patternCueSource.id)];
};

async function readDashboardSummary(workspaceId: string): Promise<CampaignCueAnalyticsSummary> {
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
        .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID)
        .get();
    const seed = dashboardSummarySeed(workspaceId);
    if (!snap.exists) return seed;
    try {
        return parseCampaignCueAnalyticsSummaryRecord(snap.data(), workspaceId);
    } catch {
        logCampaignCueServerError("CampaignCue invalid analytics summary replaced with safe seed", new Error("analytics_summary_invalid"), {
            workspaceId,
        });
        return seed;
    }
}

async function readSourceSnapshot(workspaceId: string): Promise<CampaignCueSourceSnapshot | null> {
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS)
        .doc(defaultSourceSnapshotId)
        .get();
    if (!snap.exists) return null;
    try {
        return parseCampaignCueSourceSnapshotRecord(snap.data(), workspaceId);
    } catch {
        logCampaignCueServerError("CampaignCue invalid source snapshot omitted", new Error("source_snapshot_invalid"), {
            workspaceId,
        });
        return null;
    }
}

const campaignCueDecisionQuery = (workspaceId: string, collection: string) => (
    workspaceSubcollection(workspaceId, collection)
        .orderBy("createdAt", "desc")
        .limit(CAMPAIGNCUE_PAGE_SIZE)
);

const campaignCueDecisionAuthorityHash = (params: {
    analytics: FirebaseFirestore.DocumentSnapshot;
    assets: FirebaseFirestore.QuerySnapshot;
    businessBrain: FirebaseFirestore.DocumentSnapshot;
    campaigns: FirebaseFirestore.QuerySnapshot;
    locations: FirebaseFirestore.QuerySnapshot;
    schedules: FirebaseFirestore.QuerySnapshot;
    sourceInputs: FirebaseFirestore.QuerySnapshot;
    workspace: FirebaseFirestore.DocumentSnapshot;
}) => stableHash({
    analytics: params.analytics.exists ? params.analytics.data() : null,
    assets: params.assets.docs.map((doc) => ({ id: doc.id, value: doc.data() })),
    businessBrain: params.businessBrain.exists ? params.businessBrain.data() : null,
    campaigns: params.campaigns.docs.map((doc) => ({ id: doc.id, value: doc.data() })),
    locations: params.locations.docs.map((doc) => ({ id: doc.id, value: doc.data() })),
    schedules: params.schedules.docs.map((doc) => ({ id: doc.id, value: doc.data() })),
    sourceInputs: params.sourceInputs.docs.map((doc) => ({ id: doc.id, value: doc.data() })),
    workspace: params.workspace.exists ? params.workspace.data() : null,
});

async function loadCampaignCueDecisionAuthority(
    scope: CampaignCueSessionScope,
    workspaceId: string,
) {
    const workspaceDocument = workspaceRef(workspaceId);
    const businessDocument = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS)
        .doc(defaultBusinessBrainId);
    const analyticsDocument = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
        .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID);
    const [workspaceSnap, businessSnap, sourceInputsSnap, assetsSnap, locationsSnap, schedulesSnap, campaignsSnap, analyticsSnap] = await Promise.all([
        workspaceDocument.get(),
        businessDocument.get(),
        campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS).get(),
        campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS).get(),
        campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS).get(),
        campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES).get(),
        campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).get(),
        analyticsDocument.get(),
    ]);
    const workspace = normalizeCampaignCueWorkspace(assertCampaignCueWorkspaceRecordScope(
        workspaceSnap.exists ? workspaceSnap.data() : null,
        { ...scope, workspaceId },
    ));
    const businessBrain = normalizeCampaignCueBusinessBrain(assertCampaignCueBusinessBrainRecordScope(
        businessSnap.exists ? businessSnap.data() : null,
        workspaceId,
    ));
    const assets: CampaignCueAsset[] = [];
    assetsSnap.docs.forEach((doc) => {
        assets.push(parseCampaignCueAssetRecord({ assetId: doc.id, value: doc.data(), workspaceId }));
    });
    return {
        analytics: analyticsSnap.exists
            ? parseCampaignCueAnalyticsSummaryRecord(analyticsSnap.data(), workspaceId)
            : dashboardSummarySeed(workspaceId),
        assets,
        authorityHash: campaignCueDecisionAuthorityHash({
            analytics: analyticsSnap,
            assets: assetsSnap,
            businessBrain: businessSnap,
            campaigns: campaignsSnap,
            locations: locationsSnap,
            schedules: schedulesSnap,
            sourceInputs: sourceInputsSnap,
            workspace: workspaceSnap,
        }),
        businessBrain,
        campaigns: campaignsSnap.docs.map((doc) => parseCampaignCueCampaignRecord(doc.data(), { workspaceId })),
        locations: locationsSnap.docs.map((doc) => parseCampaignCueLocationRecord(doc.data(), workspaceId)),
        schedules: schedulesSnap.docs.map((doc) => parseCampaignCueScheduleRecord(doc.data(), workspaceId)),
        storedSourceInputs: sourceInputsSnap.docs.map((doc) => parseCampaignCueSourceInputRecord(doc.data(), workspaceId)),
        workspace,
    };
}

export async function listCampaignCueCampaignsServer(scope: CampaignCueSessionScope): Promise<CampaignCueCampaign[]> {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    return listSubcollection(
        workspace.workspaceId,
        CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS,
        (value, workspaceId) => parseCampaignCueCampaignRecord(value, { workspaceId }),
    );
}

export async function listCampaignCueAssetsServer(scope: CampaignCueSessionScope): Promise<CampaignCueAsset[]> {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    return listCampaignCueAssetRecords(workspace.workspaceId);
}

export async function listCampaignCueSourceInputsServer(scope: CampaignCueSessionScope): Promise<CampaignCueSourceInput[]> {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    const sourceInputs = await listSubcollection(
        workspace.workspaceId,
        CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS,
        parseCampaignCueSourceInputRecord,
    );
    return withCampaignCuePatternSource(workspace, sourceInputs);
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
    return listSubcollection(
        workspace.workspaceId,
        CAMPAIGNCUE_COLLECTIONS.LOCATIONS,
        parseCampaignCueLocationRecord,
    );
}

export async function readCampaignCueAnalyticsServer(scope: CampaignCueSessionScope) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(scope);
    const analytics = await readDashboardSummary(workspace.workspaceId);
    return {
        analytics,
        cost: {
            readsPerLoad: 3,
            writesPerCampaignCreate: 6,
            realtimeListeners: 0,
            notes: [
                "Analytics endpoint verifies one MenuList store, reads one workspace document, and reads one precomputed summary document.",
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
            detail: "Text download, pack export, approval, scheduling, and mark-used actions are available without provider APIs.",
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
    const [storedSourceInputs, campaigns, assets, schedules, locations, analytics] = await Promise.all([
        listSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS, parseCampaignCueSourceInputRecord),
        listSubcollection(
            workspaceId,
            CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS,
            (value, currentWorkspaceId) => parseCampaignCueCampaignRecord(value, { workspaceId: currentWorkspaceId }),
        ),
        listCampaignCueAssetRecords(workspaceId),
        listSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES, parseCampaignCueScheduleRecord),
        listSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS, parseCampaignCueLocationRecord),
        readDashboardSummary(workspaceId),
    ]);
    const sourceInputs = withCampaignCuePatternSource(workspace, storedSourceInputs);
    const opportunities = buildCampaignCueOpportunities({
        analytics,
        assets,
        businessBrain,
        campaigns,
        locations,
        schedules,
        sourceInputs,
        workspaceId,
    });
    const sourceFacts = buildSourceFacts(businessBrain, sourceInputs);
    const dailyDesk = buildCampaignCueDailyDesk({
        analytics,
        assets,
        businessBrain,
        campaigns,
        locations,
        opportunities,
        schedules,
        sourceFacts,
        sourceInputs,
        workspace,
    });

    return {
        workspace,
        businessBrain,
        sourceInputs,
        opportunities,
        campaigns,
        assets,
        schedules,
        locations,
        analytics,
        providers: providerStatuses(),
        providerConnections: [],
        deliveryPolicy: buildDeliveryPolicy(),
        dailyDesk,
        launchReadiness: buildLaunchReadiness(),
        sourceHash: stableHash([...sourceFacts].sort((a, b) => a.id.localeCompare(b.id))),
        sourceFacts,
        cost: {
            readsPerLoad: 9,
            writesPerCampaignCreate: 6,
            realtimeListeners: 0,
            notes: [
                "Overview uses one MenuList store-scope verification read plus eight bounded CampaignCue reads and no realtime listeners.",
                "Workspace bootstrap may use the verified MenuList store profile as source input.",
                "Daily Campaign Desk is computed from the same overview documents and does not add a Firestore read.",
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
    campaigns?: CampaignCueCampaign[];
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
        campaigns: params.campaigns,
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

function businessHasCta(businessBrain: CampaignCueBusinessBrain) {
    return Boolean(ctaForBusiness(businessBrain).trim());
}

function primaryThing(businessBrain: CampaignCueBusinessBrain) {
    if (isServiceBusinessType(businessBrain.businessType)) {
        return businessBrain.catalog.services.find((service) => service.available)?.name || "featured service";
    }
    return businessBrain.catalog.items.find((item) => item.available)?.name || "featured item";
}

function creatorRoleForBusiness(businessBrain: CampaignCueBusinessBrain) {
    if (businessBrain.businessType === "restaurant") return "owner, staff member, regular creator, or source-approved customer";
    if (businessBrain.businessType === "salon") return "owner, stylist, booked creator, or source-approved client";
    if (businessBrain.businessType === "fitness") return "owner, coach, staff member, booked creator, or source-approved member";
    if (businessBrain.businessType === "clinic") return "owner, front-desk staff, clinician-approved spokesperson, or booked creator";
    if (businessBrain.businessType === "retail") return "owner, staff member, booked creator, or source-approved shopper";
    return "owner, staff member, booked creator, or source-approved customer";
}

function cameraPlanForChannel(channel: CampaignCueChannel, businessBrain: CampaignCueBusinessBrain) {
    const feel = businessBrain.brandKit.playbook.brandFeel.slice(0, 3).join(", ");
    const style = feel ? `, matching this feel: ${feel}` : "";
    if (channel === "video") {
        return `9:16 phone video, natural light, handheld or simple stationary setup, product/service visible, center-safe framing${style}`;
    }
    return `9:16 phone-style clip, medium close-up, center eye line, natural pauses, product/service visible without overproduced polish${style}`;
}

function productPlacementBrief(businessBrain: CampaignCueBusinessBrain, thing: string) {
    const focus = businessBrain.brandKit.playbook.productFocus.slice(0, 3).join(", ");
    const source = focus ? `${thing} with focus on ${focus}` : thing;
    return `Use an owner-approved photo or real filmed product/service moment for ${source}. Do not use stock people or synthetic customers as real proof.`;
}

function buildUgcDialogueActionBrief(businessBrain: CampaignCueBusinessBrain, thing: string) {
    const location = businessBrain.locality ? ` in ${businessBrain.locality}` : "";
    return [
        `1. Dialogue: "Here at ${businessBrain.name}${location}, this is what we are featuring today." Action: open on the real storefront, counter, product, service setup, or staff member.`,
        `2. Dialogue: "The useful thing to notice is ${thing}." Action: show the product, service moment, menu, booking screen, or approved visual proof.`,
        "3. Dialogue: \"Check the details before you come in or book.\" Action: show the CTA, menu, booking link, phone, or final frame.",
        "Guardrail: do not say the speaker personally used it, got results, or recommends it unless that real person approved the claim and the source is attached.",
    ].join("\n");
}

function buildVideoShotPlan(businessBrain: CampaignCueBusinessBrain, thing: string) {
    const location = businessBrain.locality ? ` in ${businessBrain.locality}` : "";
    return [
        `0-2s hook: show ${thing} or the business entrance${location}.`,
        "3-7s proof: show a close product shot, service action, menu/booking proof, or staff preparation moment.",
        "8-12s context: show the business name, location cue, or owner-approved source detail.",
        "Final frame: show the CTA clearly; do not imply CampaignCue rendered or published the video.",
    ].join("\n");
}

function buildBrollChecklist(businessBrain: CampaignCueBusinessBrain, thing: string) {
    return uniqueCompactStrings([
        `${thing} close-up`,
        businessBrain.name ? `${businessBrain.name} sign or counter` : undefined,
        businessBrain.locality ? `${businessBrain.locality} context shot` : undefined,
        "staff or creator hands using the product/service with consent",
        "CTA screen, booking page, menu, phone, or WhatsApp contact",
    ], 5).join(" | ");
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
    patternCueSource?: CampaignCueSourceInput;
    title: string;
}) {
    const { businessBrain, channel, title } = params;
    const thing = primaryThing(businessBrain);
    const cta = ctaForBusiness(businessBrain);
    const location = businessBrain.locality ? ` in ${businessBrain.locality}` : "";
    const ctaLine = cta ? `\n\nNext step: ${cta}` : "";
    const brandLine = brandPlaybookBriefLine(businessBrain);
    const brandDirection = brandLine ? `\n\nBrand direction: ${brandLine}` : "";
    const patternBrief = buildCampaignCuePatternCueBrief(params.patternCueSource);
    if (channel === "whatsapp") {
        return `${businessBrain.name}: ${thing} is ready${location}. Reply here or open the link to check details.${ctaLine}`;
    }
    if (channel === "google_local") {
        return `${businessBrain.name} update: ${thing} is available${location}. ${params.brief || title}.${ctaLine}\n\nManual note: product-style posts must be handled manually when direct API support is unavailable.`;
    }
    if (channel === "creative") {
        return `Creative brief: lead with ${thing}, show the business name clearly, keep the CTA visible, and avoid unsupported result claims.${ctaLine}${brandDirection}`;
    }
    if (channel === "video") {
        return [
            "Reel brief:",
            `Camera plan: ${cameraPlanForChannel(channel, businessBrain)}.`,
            `Shot plan:\n${buildVideoShotPlan(businessBrain, thing)}`,
            `B-roll checklist: ${buildBrollChecklist(businessBrain, thing)}.`,
            `Product placement: ${productPlacementBrief(businessBrain, thing)}`,
            patternBrief,
            "Boundary: this is a shoot/edit brief only, not a rendered video or provider upload.",
            ctaLine.trim(),
            brandDirection.trim(),
        ].filter(Boolean).join("\n\n");
    }
    if (channel === "ugc") {
        return [
            "UGC creator brief:",
            `Persona: ${creatorRoleForBusiness(businessBrain)}.`,
            `Camera plan: ${cameraPlanForChannel(channel, businessBrain)}.`,
            `Product placement: ${productPlacementBrief(businessBrain, thing)}`,
            `Dialogue/action beats:\n${buildUgcDialogueActionBrief(businessBrain, thing)}`,
            patternBrief,
            "Disclosure: use a real owner, staff member, creator, or source-approved customer; do not present an AI avatar, stock person, or fictional customer as real experience.",
            ctaLine.trim(),
            brandDirection.trim(),
        ].filter(Boolean).join("\n\n");
    }
    if (channel === "ads") {
        return `Ad handoff: promote ${thing} for ${businessBrain.name}. Audience: ${businessBrain.brandKit.playbook.targetAudience || "nearby customers"}. Budget: owner-approved only. UTM: campaigncue_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.`;
    }
    return `Manual task: review and use the approved campaign pack for ${thing}.${ctaLine}`;
}

const handoffField = (params: {
    id: string;
    label: string;
    value?: string;
    copyable?: boolean;
    required?: boolean;
}): NonNullable<CampaignCueOutputFields["handoffFields"]>[number] => {
    const value = compactString(params.value);
    const required = params.required !== false;
    return {
        id: params.id,
        label: params.label,
        value: value || (required ? "Needs owner input" : "Optional"),
        copyable: params.copyable !== false && Boolean(value),
        required,
        status: value ? "ready" : required ? "missing" : "needs_review",
    };
};

function outputFieldsForChannel(params: {
    businessBrain: CampaignCueBusinessBrain;
    brief: string;
    channel: CampaignCueChannel;
    patternCueSource?: CampaignCueSourceInput;
    text: string;
    title: string;
}): CampaignCueOutputFields {
    const { businessBrain, channel, text, title } = params;
    const recipe = dailyDeskRecipeForBusiness(businessBrain.businessType);
    const thing = primaryThing(businessBrain);
    const cta = ctaForBusiness(businessBrain);
    const location = businessBrain.locality ? ` in ${businessBrain.locality}` : "";
    const destination = businessBrain.contacts.publicMenuUrl
        || businessBrain.contacts.bookingUrl
        || businessBrain.contacts.website
        || "";
    const brandLine = brandPlaybookBriefLine(businessBrain);
    const patternCue = params.patternCueSource?.patternCue;
    const brandBrief = brandLine ? ` Brand direction: ${brandLine}.` : "";
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
            "Follow the dialogue/action beats and keep camera direction phone-native.",
            "Use only real experiences and approved claims; do not present synthetic or fictional people as real customers.",
            "Attach consent when a customer, staff member, or transformation appears.",
        ],
        video: [
            "Shoot the listed moments on a phone using the camera plan and B-roll checklist.",
            "Keep the CTA visible in the final frame.",
            "Avoid before/after, personal-experience, or result claims without proof and consent.",
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
    const ownerUseCaseByChannel: Record<CampaignCueChannel, string> = {
        ads: "Hand this to a media buyer or ad account owner after budget approval.",
        calendar: "Use this as a reminder so manual posting does not get missed.",
        creative: "Turn the same campaign into a square post, story, flyer, or counter sign.",
        google_local: "Paste into Google Business Profile after checking post type, dates, and link.",
        ugc: "Give staff or a creator a short script that stays true to the business.",
        video: "Shoot a simple reel on a phone without a video-render provider.",
        whatsapp: "Paste into an expected customer conversation or broadcast workflow managed outside CampaignCue.",
    };
    const outputFormatsByChannel: Record<CampaignCueChannel, string[]> = {
        ads: ["Ad handoff copy", "Destination checklist", "Budget approval note"],
        calendar: ["Manual posting reminder", "Owner task note", "Follow-up result prompt"],
        creative: recipe.outputFormats,
        google_local: ["Google update draft", "Offer/event verification checklist", "Local caption"],
        ugc: ["Creator script", "Dialogue/action beat sheet", "Product-placement note", "Consent reminder"],
        video: ["Reel shot list", "Phone camera plan", "B-roll checklist", "Final-frame CTA"],
        whatsapp: ["WhatsApp text", "Staff sharing text", "Reply prompt"],
    };
    const handoffFieldsByChannel: Record<CampaignCueChannel, NonNullable<CampaignCueOutputFields["handoffFields"]>> = {
        ads: [
            handoffField({ id: "headline", label: "Headline", value: `${thing} from ${businessBrain.name}` }),
            handoffField({ id: "copy", label: "Ad copy", value: text }),
            handoffField({ id: "destination", label: "Destination", value: destination }),
            handoffField({ id: "budget", label: "Budget", value: "Owner approves budget in the ad account.", required: false }),
            handoffField({ id: "utm", label: "UTM", value: utm, required: false }),
        ],
        calendar: [
            handoffField({ id: "task", label: "Task", value: text }),
            handoffField({ id: "channel", label: "Channel", value: "Owner chooses the manual channel.", required: false }),
            handoffField({ id: "follow_up", label: "Follow-up", value: recipe.resultQuestion, required: false }),
        ],
        creative: [
            handoffField({ id: "caption", label: "Caption", value: text }),
            handoffField({ id: "square", label: "Square", value: recipe.outputFormats.find((format) => /square/i.test(format)) || "Square post", required: false }),
            handoffField({ id: "story", label: "Story", value: recipe.outputFormats.find((format) => /story/i.test(format)) || "Story/reel format", required: false }),
            handoffField({ id: "print", label: "Print", value: recipe.printFormats[0], required: false }),
            handoffField({ id: "brand_direction", label: "Brand direction", value: brandLine, required: false }),
            handoffField({ id: "cta", label: "CTA", value: cta }),
        ],
        google_local: [
            handoffField({ id: "post_type", label: "Post type", value: "Update / Offer / Event" }),
            handoffField({ id: "title", label: "Title", value: `${thing} from ${businessBrain.name}` }),
            handoffField({ id: "description", label: "Description", value: text }),
            handoffField({ id: "date_range", label: "Date range", value: "Confirm offer or event dates before posting.", required: false }),
            handoffField({ id: "photo", label: "Photo", value: `Use an approved image that matches ${thing}.`, required: false }),
            handoffField({ id: "button_link", label: "Button link", value: destination }),
            handoffField({ id: "terms", label: "Terms", value: "Add offer terms when the post is an offer.", required: false }),
        ],
        ugc: [
            handoffField({ id: "script", label: "Script", value: text }),
            ...(patternCue ? [
                handoffField({ id: "pattern_summary", label: "Example format", value: patternCue.summary, required: false }),
                handoffField({ id: "original_hooks", label: "Original hook options", value: patternCue.candidateHooks.join("\n"), required: false }),
                handoffField({ id: "originality_boundary", label: "Originality boundary", value: patternCue.adaptationGuardrails[0], required: false }),
            ] : []),
            handoffField({ id: "persona", label: "Persona", value: creatorRoleForBusiness(businessBrain), required: false }),
            handoffField({
                id: "creator_fit_check",
                label: "Creator fit check",
                value: "Check baseline views, real comment quality, local audience fit, customer intent, and whether this creator naturally covers this kind of business.",
                required: false,
            }),
            handoffField({
                id: "creator_brief",
                label: "Lightweight creator brief",
                value: `Give the creator only the checked business facts, the campaign angle, the CTA, what not to claim, and the required disclosure. Let the content stay native to their audience.`,
                required: false,
            }),
            handoffField({ id: "camera_plan", label: "Camera plan", value: cameraPlanForChannel(channel, businessBrain), required: false }),
            handoffField({ id: "product_placement", label: "Product placement", value: productPlacementBrief(businessBrain, thing), required: false }),
            handoffField({ id: "dialogue_action_beats", label: "Dialogue/action beats", value: buildUgcDialogueActionBrief(businessBrain, thing), required: false }),
            handoffField({
                id: "test_plan",
                label: "3-test plan",
                value: "Run a small local test before repeating the angle: test three creators, three hooks, or three nearby audiences, then keep only the one that gets useful replies, clicks, calls, visits, saves, or owner-observed demand.",
                required: false,
            }),
            handoffField({
                id: "pricing_boundary",
                label: "Pricing boundary",
                value: "Use flat-fee guidance only. CampaignCue does not broker creator deals, manage contracts, process payments, or guarantee reach or revenue.",
                required: false,
            }),
            handoffField({ id: "brand_direction", label: "Brand direction", value: brandLine, required: false }),
            handoffField({ id: "disclosure", label: "Disclosure", value: "Use a real owner, staff member, creator, or source-approved customer. Disclose paid, gifted, agency, employee, or incentivized participation where relevant. Do not present synthetic or fictional people as real customers.", required: false }),
            handoffField({ id: "consent", label: "Consent", value: "Use only real experiences and approved claims.", required: false }),
            handoffField({ id: "cta", label: "CTA", value: cta }),
        ],
        video: [
            handoffField({ id: "shot_list", label: "Shot list", value: text }),
            ...(patternCue ? [
                handoffField({ id: "pattern_summary", label: "Example format", value: patternCue.summary, required: false }),
                handoffField({ id: "original_hooks", label: "Original hook options", value: patternCue.candidateHooks.join("\n"), required: false }),
                handoffField({ id: "originality_boundary", label: "Originality boundary", value: patternCue.adaptationGuardrails[0], required: false }),
            ] : []),
            handoffField({ id: "camera_plan", label: "Camera plan", value: cameraPlanForChannel(channel, businessBrain), required: false }),
            handoffField({ id: "b_roll", label: "B-roll checklist", value: buildBrollChecklist(businessBrain, thing), required: false }),
            handoffField({ id: "product_placement", label: "Product placement", value: productPlacementBrief(businessBrain, thing), required: false }),
            handoffField({ id: "brand_direction", label: "Brand direction", value: brandLine, required: false }),
            handoffField({ id: "final_frame", label: "Final frame", value: cta }),
            handoffField({ id: "consent", label: "Consent", value: "Confirm people or customer images before filming.", required: false }),
        ],
        whatsapp: [
            handoffField({ id: "image", label: "Image", value: `Use an approved image that matches ${thing}.`, required: false }),
            handoffField({ id: "short_message", label: "Short message", value: text }),
            handoffField({ id: "status_text", label: "Status text", value: `${thing} is ready${location}. ${cta || "Reply for details."}` }),
            handoffField({ id: "reply_text", label: "Customer reply text", value: cta || "Reply here for details." }),
            handoffField({ id: "catalog_link", label: "Catalog or menu link", value: businessBrain.contacts.publicMenuUrl || businessBrain.contacts.website, required: false }),
        ],
    };
    const reviewChecklist = uniqueCompactStrings([
        "Business name is correct",
        "CTA link, phone, or booking path is correct",
        channel === "google_local" ? "Google post type, date, price, and photo are checked" : undefined,
        channel === "whatsapp" ? "Recipients expect business messages" : undefined,
        channel === "ads" ? "Budget and audience are approved outside CampaignCue" : undefined,
        channel === "ugc" ? "Creator audience fit is checked before spending or repeating the angle" : undefined,
        channel === "video" || channel === "ugc" ? "People, staff, or customer images have consent" : undefined,
        channel === "ugc" ? "Dialogue/action beats do not invent personal experience" : undefined,
        channel === "video" || channel === "ugc" ? (patternCue ? "Example format is adapted without copying source wording, footage, music, or creator identity" : undefined) : undefined,
        channel === "ugc" ? "Paid or incentivized creator participation has disclosure guidance" : undefined,
        channel === "video" ? "Shot list remains a brief; no rendered video is implied" : undefined,
        brandLine ? "Brand direction and avoid list are checked" : undefined,
        ...recipe.guardrails.slice(0, 2),
    ], 8);
    return {
        headline: `${thing} from ${businessBrain.name}`,
        body: text,
        cta: cta || "Add a phone, booking, menu, or website link before posting.",
        imageBrief: channel === "video"
            ? `Show ${thing}, the business name, and a clear final CTA.${brandBrief}`
            : `Use an approved image that matches ${thing}; avoid unrelated or unavailable items.${brandBrief}`,
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
                : channel === "ugc" || channel === "video"
                    ? "Do not add guarantees, fake testimonials, synthetic personal experiences, or unsupported result claims."
                    : "Do not add guarantees, fake testimonials, or unsupported result claims.",
        destination,
        utm,
        approvalNote: "Owner or assigned reviewer should approve source details, CTA, and claims before use.",
        manualSteps: manualStepsByChannel[channel],
        ownerUseCase: ownerUseCaseByChannel[channel],
        outputFormats: outputFormatsByChannel[channel],
        printFormats: channel === "creative" ? recipe.printFormats : [],
        photoTasks: channel === "creative" || channel === "video" || channel === "ugc" ? recipe.photoTasks : [],
        handoffFields: handoffFieldsByChannel[channel],
        reviewChecklist,
    };
}

function buildOutputs(params: {
    businessBrain: CampaignCueBusinessBrain;
    brief: string;
    channels: CampaignCueChannel[];
    patternCueSource?: CampaignCueSourceInput;
    sourceReferences: string[];
    title: string;
}): CampaignCueOutput[] {
    return params.channels.map((channel) => {
        const text = lineForChannel({
            businessBrain: params.businessBrain,
            brief: params.brief,
            channel,
            patternCueSource: params.patternCueSource,
            title: params.title,
        });
        const sourceReferences = uniqueCompactStrings([
            ...params.sourceReferences,
            params.patternCueSource && (channel === "video" || channel === "ugc") ? params.patternCueSource.id : undefined,
        ], 8);
        return {
            id: `${channel}_draft`,
            channel,
            label: CAMPAIGNCUE_CHANNEL_LABELS[channel],
            mode: channel === "video" ? "brief" : channel === "ads" ? "manual_handoff" : "manual_export",
            text,
            sourceReferences,
            providerMode: providerModeForChannel(channel),
            trustGate: "warning",
            fields: outputFieldsForChannel({
                businessBrain: params.businessBrain,
                brief: params.brief,
                channel,
                patternCueSource: params.patternCueSource,
                text,
                title: params.title,
            }),
            metadata: (channel === "video" || channel === "ugc") && params.patternCueSource?.patternCue
                ? {
                    patternCue: {
                        sourceInputId: params.patternCueSource.id,
                        sourceHash: params.patternCueSource.patternCue.sourceHash,
                        platform: params.patternCueSource.patternCue.platform,
                        rightsStatus: params.patternCueSource.patternCue.rightsStatus,
                    },
                    directMutationEnabled: false,
                }
                : channel === "ads"
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
    commercialGate?: CampaignCueCommercialGate;
    outputs: CampaignCueOutput[];
    sourceFacts: CampaignCueSourceFact[];
    workspaceId: string;
}): CampaignCueTrustReport {
    const findings: CampaignCueTrustFinding[] = [];
    const missingDestination = !ctaForBusiness(params.businessBrain);
    const unreviewedFacts = params.sourceFacts.filter((fact) => fact.risk === "needs_review");
    const blockedFacts = params.sourceFacts.filter((fact) => fact.risk === "blocked");
    const assetFacts = params.sourceFacts.filter((fact) => fact.sourceType === "asset");
    const avoidTerms = params.businessBrain.brandKit.playbook.avoidList
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 3);
    params.commercialGate?.findings.forEach((finding, index) => {
        findings.push({
            id: `commercial_policy_${index}`,
            severity: params.commercialGate?.status === "blocked" ? "blocked" : "warning",
            ruleId: "commercial_safety_policy",
            message: finding,
            recommendation: "Update the owner pulse, commercial policy, or current campaign input before public use.",
            sourceReferences: ["business_brain_commercial_policy", "business_brain_operating_pulse"],
        });
    });
    for (const output of params.outputs) {
        const outputTrustText = [
            output.text,
            output.fields.body,
            output.fields.policyNote,
            ...(output.fields.handoffFields || []).map((field) => field.value),
        ].join("\n").toLowerCase();
        const text = output.text.toLowerCase();
        const publicLikeOutput = output.channel === "whatsapp" || output.channel === "google_local" || output.channel === "ads";
        if ((output.channel === "ugc" || output.channel === "video") && output.metadata?.patternCue) {
            findings.push({
                id: `${output.id}_pattern_cue_originality`,
                severity: "info",
                ruleId: "pattern_cue_originality",
                message: `${output.label} uses an example as structural inspiration only.`,
                recommendation: "Keep the new script, footage, music, creator identity, claims, and CTA original and source-backed.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (/(guaranteed|100%|cure|best in|#1)/.test(outputTrustText)) {
            findings.push({
                id: `${output.id}_blocked_claim`,
                severity: "blocked",
                ruleId: "unsupported_absolute_claim",
                message: `${output.label} includes an unsupported absolute or result claim.`,
                recommendation: "Remove guarantee, medical/result, or ranking language before export or handoff.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (/\breview\b/.test(outputTrustText) && /(five[- ]star|5[- ]star|positive review|reward for|discount for|only happy customers|fabricat)/.test(outputTrustText)) {
            findings.push({
                id: `${output.id}_review_manipulation`,
                severity: "blocked",
                ruleId: "review_manipulation",
                message: `${output.label} contains incentivized, selective, or fabricated review language.`,
                recommendation: "Ask real customers for an honest review without requiring a positive rating or offering a reward.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (/(upload|import|store).{0,24}(customer|contact).{0,24}(list|phone|csv)/.test(outputTrustText)) {
            findings.push({
                id: `${output.id}_customer_list_boundary`,
                severity: "needs_fix",
                ruleId: "customer_contact_boundary",
                message: `${output.label} suggests storing or importing a customer contact list.`,
                recommendation: "Keep customer selection and sending in the owner's existing consented workflow. CampaignCue prepares the pack only.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (
            (output.channel === "ugc" || output.channel === "video")
            && /\b(i have been using|i've been using|i absolutely love|i absolutely recommend|i recommend this|got me hooked|my results|changed my life|worked for me)\b/.test(outputTrustText)
        ) {
            findings.push({
                id: `${output.id}_fake_personal_experience`,
                severity: "needs_fix",
                ruleId: "fake_personal_experience",
                message: `${output.label} contains first-person experience or recommendation wording that needs source proof.`,
                recommendation: "Replace it with a role-neutral creator brief, or attach approved testimonial source, consent, and disclosure before handoff.",
                sourceReferences: output.sourceReferences,
            });
        }
        const avoidedTerm = publicLikeOutput ? avoidTerms.find((term) => text.includes(term)) : undefined;
        if (avoidedTerm) {
            findings.push({
                id: `${output.id}_brand_avoid_term`,
                severity: "warning",
                ruleId: "brand_playbook_avoid_term",
                message: `${output.label} uses a term from the Brand Playbook avoid list.`,
                recommendation: `Review or remove "${avoidedTerm}" before export.`,
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
                recommendation: "Use as download/share material only; do not treat it as a system-sent campaign.",
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
        if (params.businessBrain.businessType === "fitness" && (output.channel === "video" || output.channel === "ugc" || output.channel === "ads")) {
            findings.push({
                id: `${output.id}_fitness_consent_review`,
                severity: "warning",
                ruleId: "fitness_consent_review",
                message: "Fitness content may involve class members, body-result claims, or dated sessions.",
                recommendation: "Confirm consent, capacity, date, time, and avoid guaranteed body or health outcomes.",
                sourceReferences: output.sourceReferences,
            });
        }
        if (params.businessBrain.businessType === "clinic") {
            findings.push({
                id: `${output.id}_clinic_claim_review`,
                severity: "warning",
                ruleId: "clinic_claim_review",
                message: "Clinic and health-adjacent content needs conservative wording and privacy review.",
                recommendation: "Avoid diagnosis, cure, emergency, treatment-result, or medical advice claims before manual use.",
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
    if (!snap.exists) return null;
    try {
        return parseCampaignCueCampaignRecord(snap.data(), { campaignId, workspaceId });
    } catch {
        logCampaignCueServerError("CampaignCue invalid campaign record omitted", new Error("campaign_record_invalid"), {
            campaignId,
            workspaceId,
        });
        return null;
    }
}

async function checkIdempotency(params: {
    action: string;
    idempotencyKey: string;
    requestIdentity: unknown;
    scope: CampaignCueSessionScope;
    workspaceId: string;
}) {
    const ref = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS).doc(params.idempotencyKey);
    const requestHash = buildCampaignCueIdempotencyRequestHash(params.requestIdentity);
    const claimId = buildId("idem_claim");
    const nowMillis = Date.now();
    try {
        const result = await firestoreAdmin.runTransaction(async (transaction) => {
            const [snap] = await Promise.all([
                transaction.get(ref),
                assertCurrentCampaignCueWorkspaceAccess(
                    transaction,
                    params.scope,
                    params.workspaceId,
                ),
            ]);
            const expected = {
                action: params.action,
                actorId: params.scope.userId,
                requestHash,
            };
            const decision = getCampaignCueIdempotencyClaimDecision(
                snap.exists ? snap.data() : null,
                expected,
                nowMillis,
            );
            if (decision.kind === "replay") return { claimId: null, replay: decision.replay };
            if (decision.kind === "conflict") throw new CampaignCueIdempotencyIdentityError();
            const now = admin.firestore.Timestamp.fromMillis(nowMillis);
            transaction.set(ref, sanitizeForAdminFirestore({
                id: params.idempotencyKey,
                action: params.action,
                actorId: params.scope.userId,
                claimId,
                requestHash,
                status: "in_progress",
                createdAt: snap.exists ? snap.data()?.createdAt || now : now,
                updatedAt: now,
                leaseExpiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + CAMPAIGNCUE_IDEMPOTENCY_LEASE_MS),
                expiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + CAMPAIGNCUE_IDEMPOTENCY_RETENTION_MS),
            }));
            return { claimId, replay: null };
        });
        return { ...result, requestHash };
    } catch (identityError) {
        if (identityError instanceof CampaignCueIdempotencyIdentityError) {
            throw new CampaignCueIdempotencyConflictError(identityError.message);
        }
        throw identityError;
    }
}

async function completeIdempotency(params: {
    action: string;
    actorId: string;
    claimId: string | null;
    idempotencyKey: string;
    requestHash: string | null;
    responseError?: string;
    responseStatus?: number;
    resultId: string;
    updatedAt?: unknown;
    workspaceId: string;
}) {
    if (!params.claimId || !params.requestHash) return;
    const claimId = params.claimId;
    const requestHash = params.requestHash;
    const ref = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS).doc(params.idempotencyKey);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        assertCampaignCueIdempotencyClaimOwnership(snap.exists ? snap.data() : null, {
            action: params.action,
            actorId: params.actorId,
            requestHash,
        }, claimId);
        transaction.set(ref, sanitizeForAdminFirestore({
            action: params.action,
            actorId: params.actorId,
            claimId: params.claimId,
            responseError: params.responseError,
            responseStatus: params.responseStatus,
            resultId: params.resultId,
            status: "completed",
            updatedAt: params.updatedAt || nowTimestamp(),
        }), { merge: true });
    });
}

function enqueueEvent(batch: CampaignCueFirestoreBatch, params: {
    action: string;
    campaignId?: string;
    channel?: CampaignCueChannel;
    createdAt?: unknown;
    metadata?: Record<string, unknown>;
    outputId?: string;
    scope: CampaignCueSessionScope;
    workspaceId: string;
}) {
    const eventRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    batch.set(eventRef, sanitizeForAdminFirestore({
        id: eventRef.id,
        workspaceId: params.workspaceId,
        actorId: params.scope.userId,
        action: params.action,
        campaignId: params.campaignId,
        channel: params.channel,
        outputId: params.outputId,
        metadata: params.metadata || {},
        confidence: "observed",
        createdAt: params.createdAt || nowTimestamp(),
    }));
}

function buildDashboardSummaryIncrement(params: {
    action?: CampaignCueActionType | "campaign_created";
    updatedAt: unknown;
    workspaceId: string;
}) {
    const increment = admin.firestore.FieldValue.increment;
    const next: Record<string, unknown> = {
        id: CAMPAIGNCUE_DASHBOARD_SUMMARY_ID,
        workspaceId: params.workspaceId,
        confidence: "observed",
        latestEventAt: params.updatedAt,
        updatedAt: params.updatedAt,
    };
    if (params.action === "campaign_created") next.campaignCount = increment(1);
    if (params.action === "mark_used") next.usedCount = increment(1);
    if (params.action === "download" || params.action === "export") {
        next.exportCount = increment(1);
    }
    if (params.action === "request_approval") next.approvalRequestCount = increment(1);
    if (params.action === "record_outcome") next.ownerReportedOutcomeCount = increment(1);
    return next;
}

function enqueueDashboardSummaryIncrement(batch: CampaignCueFirestoreBatch, params: {
    action?: CampaignCueActionType | "campaign_created";
    updatedAt?: unknown;
    workspaceId: string;
}) {
    const timestamp = params.updatedAt || nowTimestamp();
    const summaryRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
        .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID);
    batch.set(summaryRef, buildDashboardSummaryIncrement({
        action: params.action,
        updatedAt: timestamp,
        workspaceId: params.workspaceId,
    }), { merge: true });
}

const campaignCueResultMetricTotal = (campaign: CampaignCueCampaign) => (
    Object.values(campaign.resultMemory?.lastReceipt?.metrics || {})
        .reduce((total, value) => total + (typeof value === "number" ? value : 0), 0)
);

const campaignCueCanBeSafelyReused = (campaign: CampaignCueCampaign) => (
    campaign.status !== "archived"
    && campaign.trustGate !== "blocked"
    && campaign.trustGate !== "needs_fix"
    && Boolean(campaign.pack?.recipeId)
    && Number(campaign.resultMemory?.usefulCount || 0) > Number(campaign.resultMemory?.notUsefulCount || 0)
    && (Number(campaign.resultMemory?.usefulCount || 0) > 0 || campaignCueResultMetricTotal(campaign) > 0)
);

export async function createCampaignCueCampaignServer(params: {
    input: CampaignCueCreateCampaignInput;
    scope: CampaignCueSessionScope;
}): Promise<{ campaign: CampaignCueCampaign; trustReport: CampaignCueTrustReport; replayed?: boolean }> {
    const ensured = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = ensured.workspace.workspaceId;
    const idempotency = await checkIdempotency({
        action: "create_campaign",
        idempotencyKey: params.input.idempotencyKey,
        requestIdentity: { ...params.input, idempotencyKey: undefined },
        scope: params.scope,
        workspaceId,
    });
    const replay = idempotency.replay;
    if (replay?.resultId) {
        if (replay.responseError) {
            throw new CampaignCueDecisionGateError(replay.responseError);
        }
        const existing = await readCampaign(workspaceId, replay.resultId);
        const trustSnap = existing?.trustReportId
            ? await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.TRUST_REPORTS).doc(existing.trustReportId).get()
            : null;
        if (existing && trustSnap?.exists) {
            return {
                campaign: existing,
                trustReport: parseCampaignCueTrustReportRecord(trustSnap.data(), {
                    campaignId: existing.id,
                    trustReportId: trustSnap.id,
                    workspaceId,
                }),
                replayed: true,
            };
        }
        throw new CampaignCueIdempotencyConflictError("This campaign request already completed, but its result is unavailable.");
    }

    const outputIntent = getCampaignCueOutputPickerItem(params.input.outputIntentId);
    if (params.input.outputIntentId && !outputIntent) {
        throw new CampaignCueDecisionGateError("This campaign output request is unavailable.");
    }
    if (outputIntent?.id === "custom_size" || outputIntent?.id === "reuse_old_asset") {
        const message = outputIntent.id === "custom_size"
            ? "Use the creative editor to create a custom-size asset."
            : "Use Reuse old image to upload and preserve the original asset.";
        await completeIdempotency({
            action: "create_campaign",
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            idempotencyKey: params.input.idempotencyKey,
            requestHash: idempotency.requestHash,
            responseError: message,
            responseStatus: 409,
            resultId: `output_intent_${outputIntent.id}`,
            workspaceId,
        });
        throw new CampaignCueDecisionGateError(message);
    }

    const {
        analytics,
        assets,
        authorityHash,
        businessBrain,
        campaigns,
        locations,
        schedules,
        storedSourceInputs,
        workspace,
    } = await loadCampaignCueDecisionAuthority(params.scope, workspaceId);
    const sourceInputs = withCampaignCuePatternSource(workspace, storedSourceInputs);
    const sourceFacts = buildSourceFacts(businessBrain, sourceInputs);
    const unresolvedOutputIntentRequirements = outputIntent
        ? getUnresolvedCampaignCueOutputIntentRequirements(outputIntent, {
            assets,
            businessBrain,
            sourceFacts,
            sourceInputs,
        })
        : [];
    if (unresolvedOutputIntentRequirements.length) {
        const message = unresolvedOutputIntentRequirements[0].ownerQuestion;
        await completeIdempotency({
            action: "create_campaign",
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            idempotencyKey: params.input.idempotencyKey,
            requestHash: idempotency.requestHash,
            responseError: message,
            responseStatus: 409,
            resultId: `output_intent_${outputIntent?.id || "unknown"}`,
            workspaceId,
        });
        throw new CampaignCueDecisionGateError(message);
    }
    const decisionOpportunities = buildCampaignCueOpportunities({
        analytics,
        assets,
        businessBrain,
        campaigns,
        locations,
        schedules,
        sourceInputs,
        workspaceId,
    });
    const decisionCandidates = buildCampaignCueDecisions({
        analytics,
        assets,
        businessBrain,
        campaigns,
        locations,
        opportunities: decisionOpportunities,
        schedules,
        sourceFacts,
        sourceInputs,
        workspace,
    });
    const reuseCampaign = params.input.reuseCampaignId
        ? campaigns.find((campaign) => campaign.id === params.input.reuseCampaignId)
        : undefined;
    if (params.input.reuseCampaignId && (!reuseCampaign || !campaignCueCanBeSafelyReused(reuseCampaign))) {
        const message = reuseCampaign
            ? "This campaign does not have a useful, trust-safe result to reuse."
            : "The campaign selected for reuse is unavailable.";
        await completeIdempotency({
            action: "create_campaign",
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            idempotencyKey: params.input.idempotencyKey,
            requestHash: idempotency.requestHash,
            responseError: message,
            responseStatus: 409,
            resultId: params.input.reuseCampaignId,
            workspaceId,
        });
        throw new CampaignCueDecisionGateError(message);
    }
    const fallbackOpportunity = resolveOpportunity({
        analytics,
        assets,
        businessBrain,
        campaigns,
        input: params.input,
        locations,
        schedules,
        sourceInputs,
        workspaceId,
    });
    const reuseDecision = reuseCampaign?.pack?.recipeId
        ? decisionCandidates.find((decision) => decision.recipeId === reuseCampaign.pack?.recipeId)
        : undefined;
    if (reuseCampaign && !reuseDecision) {
        const message = "This campaign recipe no longer matches the current business context.";
        await completeIdempotency({
            action: "create_campaign",
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            idempotencyKey: params.input.idempotencyKey,
            requestHash: idempotency.requestHash,
            responseError: message,
            responseStatus: 409,
            resultId: reuseCampaign.id,
            workspaceId,
        });
        throw new CampaignCueDecisionGateError(message);
    }
    const outputIntentDecisions = outputIntent?.ownerGoals.length
        ? decisionCandidates.filter((decision) => campaignCueOutputIntentSupportsOwnerGoal(outputIntent, decision.ownerGoal))
        : [];
    const outputIntentDecision = outputIntentDecisions.find((decision) => (
        decision.opportunityId === params.input.opportunityId
    )) || outputIntentDecisions.find((decision) => decision.decisionStatus === "ready_to_prepare") || outputIntentDecisions[0];
    if (outputIntent?.ownerGoals.length && !outputIntentDecision) {
        const message = "This output does not match a current campaign opportunity for this business.";
        await completeIdempotency({
            action: "create_campaign",
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            idempotencyKey: params.input.idempotencyKey,
            requestHash: idempotency.requestHash,
            responseError: message,
            responseStatus: 409,
            resultId: `output_intent_${outputIntent.id}`,
            workspaceId,
        });
        throw new CampaignCueDecisionGateError(message);
    }
    const selectedDecision = reuseDecision
        || outputIntentDecision
        || decisionCandidates.find((decision) => decision.opportunityId === fallbackOpportunity.id)
        || decisionCandidates[0];
    if (selectedDecision && selectedDecision.decisionStatus !== "ready_to_prepare") {
        const firstMissingInput = selectedDecision.missingInputs.find((input) => input.required) || selectedDecision.missingInputs[0];
        const decisionGateMessage = firstMissingInput?.ownerQuestion
            || (selectedDecision.decisionStatus === "blocked"
                ? "Review blocked campaign risk before creating this pack."
                : "Confirm required campaign details before creating this pack.");
        await completeIdempotency({
            action: "create_campaign",
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            idempotencyKey: params.input.idempotencyKey,
            requestHash: idempotency.requestHash,
            responseError: decisionGateMessage,
            responseStatus: 409,
            resultId: selectedDecision.decisionId,
            workspaceId,
        });
        throw new CampaignCueDecisionGateError(decisionGateMessage);
    }
    const opportunity = decisionOpportunities.find((item) => item.id === selectedDecision?.opportunityId)
        || fallbackOpportunity;
    const recipe = selectedDecision ? campaignCueRecipeById(selectedDecision.recipeId) : dailyDeskRecipeForBusiness(businessBrain.businessType);
    const title = compactString(
        outputIntent ? selectedDecision?.recommendationTitle : params.input.title,
        reuseCampaign ? `${selectedDecision?.recommendationTitle || recipe.title} refresh` : opportunity.title,
    );
    const brief = compactString(params.input.brief, opportunity.reason);
    const channels = (
        outputIntent?.id !== "recommended_pack" && outputIntent?.channels.length
            ? outputIntent.channels
            : params.input.channels?.length
                ? params.input.channels
                : reuseCampaign?.channels.length
                    ? reuseCampaign.channels
                    : opportunity.channels
    ) as CampaignCueChannel[];
    const currentPatternCueSource = FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PATTERN_CUE
        ? getLatestCampaignCuePatternCueSource(sourceInputs)
        : undefined;
    const patternCueSource = channels.some((channel) => channel === "video" || channel === "ugc")
        ? currentPatternCueSource
        : undefined;
    const campaignId = buildId(CAMPAIGNCUE_CAMPAIGN_ID_PREFIX);
    const outputsDraft = buildOutputs({
        businessBrain,
        brief,
        channels,
        patternCueSource,
        sourceReferences: opportunity.sourceReferences,
        title,
    });
    const sourceSnapshot = buildSourceSnapshot(businessBrain, sourceInputs);
    const createdAt = new Date();
    const trustReport = buildTrustReport({
        businessBrain,
        campaignId,
        commercialGate: selectedDecision?.commercialGate,
        outputs: outputsDraft,
        sourceFacts,
        workspaceId,
    });
    const outputs = applyTrustToOutputs(outputsDraft, trustReport);
    const now = admin.firestore.Timestamp.fromDate(createdAt);
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
        pack: {
            ownerGoal: recipe.ownerGoal,
            recipeId: recipe.id,
            decision: selectedDecision,
            reason: opportunity.ownerBenefit || opportunity.reason,
            sourceFactIds: sourceFacts.slice(0, 12).map((fact) => fact.id),
            missingInputIds: [
                ...sourceInputs.filter((input) => input.status === "needs_review").map((input) => input.id),
                ...sourceSnapshot.missingFacts.map((_, index) => `missing_fact_${index}`),
            ].slice(0, 12),
            deliveryCardIds: outputs.map((output) => `${campaignId}_${output.id}_handoff`),
            resultQuestion: recipe.resultQuestion,
            patternCueSourceInputId: patternCueSource?.id,
            patternCueSourceHash: patternCueSource?.patternCue?.sourceHash,
            reusedFromCampaignId: reuseCampaign?.id,
            reuseMode: reuseCampaign ? "rebuild_from_current_truth" : undefined,
            sourceTemplateId: params.input.sourceTemplateId,
            outputIntentId: outputIntent?.id === "recommended_pack" ? undefined : outputIntent?.id,
            requestedOutputTypes: outputIntent?.id === "recommended_pack" ? undefined : outputIntent?.outputTypes,
            freshness: buildCampaignCuePackFreshness({
                businessBrain,
                now: createdAt,
                recipe,
                sourceHash: sourceSnapshot.sourceHash,
                sourceInputs,
            }),
            commercialGate: selectedDecision?.commercialGate || { status: "ready", findings: [] },
            experiment: selectedDecision?.experiment || buildCampaignCueExperimentSuggestion({
                assets,
                businessBrain,
                campaigns,
                recipe,
            }),
        },
        createdAt: now,
        updatedAt: now,
    };

    const idempotencyRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(params.input.idempotencyKey);
    const committed = await firestoreAdmin.runTransaction(async (transaction) => {
        const businessDocument = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS)
            .doc(defaultBusinessBrainId);
        const analyticsDocument = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
            .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID);
        const [
            idempotencySnap,
            currentWorkspaceSnap,
            currentBusinessSnap,
            currentSourceInputsSnap,
            currentAssetsSnap,
            currentLocationsSnap,
            currentSchedulesSnap,
            currentCampaignsSnap,
            currentAnalyticsSnap,
        ] = await Promise.all([
            transaction.get(idempotencyRef),
            transaction.get(workspaceRef(workspaceId)),
            transaction.get(businessDocument),
            transaction.get(campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS)),
            transaction.get(campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS)),
            transaction.get(campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS)),
            transaction.get(campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES)),
            transaction.get(campaignCueDecisionQuery(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS)),
            transaction.get(analyticsDocument),
        ]);
        if (idempotency.claimId && idempotency.requestHash) {
            assertCampaignCueIdempotencyClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
                action: "create_campaign",
                actorId: params.scope.userId,
                requestHash: idempotency.requestHash,
            }, idempotency.claimId);
        }
        const currentAuthorityHash = campaignCueDecisionAuthorityHash({
            analytics: currentAnalyticsSnap,
            assets: currentAssetsSnap,
            businessBrain: currentBusinessSnap,
            campaigns: currentCampaignsSnap,
            locations: currentLocationsSnap,
            schedules: currentSchedulesSnap,
            sourceInputs: currentSourceInputsSnap,
            workspace: currentWorkspaceSnap,
        });
        if (currentAuthorityHash !== authorityHash) {
            transaction.set(idempotencyRef, sanitizeForAdminFirestore({
                action: "create_campaign",
                actorId: params.scope.userId,
                claimId: idempotency.claimId,
                responseError: "Campaign facts changed while this pack was being prepared. Try again with the current workspace.",
                responseStatus: 409,
                resultId: campaign.id,
                status: "completed",
                updatedAt: now,
            }), { merge: true });
            return false;
        }
        transaction.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).doc(campaign.id),
            sanitizeForAdminFirestore(campaign),
        );
        transaction.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.TRUST_REPORTS).doc(trustReport.id),
            sanitizeForAdminFirestore(trustReport),
        );
        transaction.set(
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
        transaction.set(
            analyticsDocument,
            buildDashboardSummaryIncrement({ action: "campaign_created", updatedAt: now, workspaceId }),
            { merge: true },
        );
        transaction.set(idempotencyRef, sanitizeForAdminFirestore({
            action: "create_campaign",
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            resultId: campaign.id,
            status: "completed",
            updatedAt: now,
        }), { merge: true });
        return true;
    });
    if (!committed) {
        throw new CampaignCueDecisionGateError(
            "Campaign facts changed while this pack was being prepared. Try again with the current workspace.",
        );
    }

    return { campaign, trustReport };
}

const CAMPAIGNCUE_APPROVAL_RESOLUTION_ROLES = new Set<CampaignCueWorkspace["defaultRole"]>([
    "owner",
    "admin",
    "reviewer",
    "local_manager",
]);

type CampaignCueApprovalAction = "request_approval" | "approve" | "reject";

const campaignCueApprovalId = (campaignId: string) => `${CAMPAIGNCUE_APPROVAL_ID_PREFIX}_${campaignId}`;

const campaignCueWorkspaceRole = (workspace: CampaignCueWorkspace, userId: string) => (
    workspace.members?.[userId]?.role
);

async function recordCampaignCueApprovalActionTransactional(params: {
    action: CampaignCueApprovalAction;
    campaignId: string;
    claimId: string | null;
    idempotencyKey: string;
    note?: string;
    outputId?: string;
    scope: CampaignCueSessionScope;
    requestHash: string | null;
    workspaceId: string;
}): Promise<{
    campaign?: CampaignCueCampaign;
    error?: string;
    replayed?: boolean;
    status?: 404 | 409;
}> {
    const campaignRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).doc(params.campaignId);
    const approvalRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.APPROVAL_REQUESTS)
        .doc(campaignCueApprovalId(params.campaignId));
    const eventRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS)
        .doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    const idempotencyRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(params.idempotencyKey);
    const summaryRef = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
        .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID);
    const now = nowTimestamp();

    const result = await firestoreAdmin.runTransaction(async (transaction) => {
        const campaignSnap = await transaction.get(campaignRef);
        if (!campaignSnap.exists) {
            return { error: "Campaign not found", status: 404 as const };
        }
        const current = parseCampaignCueCampaignRecord(campaignSnap.data(), {
            campaignId: params.campaignId,
            workspaceId: params.workspaceId,
        });
        if (params.claimId && params.requestHash) {
            const idempotencySnap = await transaction.get(idempotencyRef);
            assertCampaignCueIdempotencyClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
                action: params.action,
                actorId: params.scope.userId,
                requestHash: params.requestHash,
            }, params.claimId);
        }
        if (params.action === "request_approval" && (current.status === "used" || current.status === "archived")) {
            return {
                error: "Completed or archived campaign packs cannot start a new approval request.",
                status: 409 as const,
            };
        }
        if (params.action === "request_approval" && current.ownerApprovalState === "requested") {
            if (idempotencyRef) {
                transaction.set(idempotencyRef, sanitizeForAdminFirestore({
                    action: params.action,
                    resultId: current.id,
                    status: "completed",
                    updatedAt: now,
                }), { merge: true });
            }
            return { campaign: current, replayed: true };
        }
        if (params.action === "request_approval" && current.ownerApprovalState === "approved") {
            return {
                error: "This campaign pack is already approved.",
                status: 409 as const,
            };
        }
        if (params.action !== "request_approval" && current.ownerApprovalState !== "requested") {
            return {
                error: "This approval request was already resolved or is no longer waiting.",
                status: 409 as const,
            };
        }

        const ownerApprovalState: CampaignCueCampaign["ownerApprovalState"] = params.action === "request_approval"
            ? "requested"
            : params.action === "approve" ? "approved" : "rejected";
        const updates: Partial<CampaignCueCampaign> = {
            actionCounts: {
                ...(current.actionCounts || {}),
                [params.action]: Number(current.actionCounts?.[params.action] || 0) + 1,
            },
            ownerApprovalState,
            updatedAt: now,
        };
        transaction.set(campaignRef, sanitizeForAdminFirestore(updates), { merge: true });
        transaction.set(approvalRef, sanitizeForAdminFirestore({
            id: approvalRef.id,
            workspaceId: params.workspaceId,
            campaignId: current.id,
            outputId: params.outputId,
            status: ownerApprovalState,
            requestedBy: params.action === "request_approval" ? params.scope.userId : undefined,
            requestedAt: params.action === "request_approval" ? now : undefined,
            decidedBy: params.action === "request_approval" ? null : params.scope.userId,
            decidedAt: params.action === "request_approval" ? null : now,
            decisionNote: params.action === "request_approval" ? null : params.note || null,
            createdAt: params.action === "request_approval" && current.ownerApprovalState === "not_requested"
                ? now
                : undefined,
            updatedAt: now,
        }), { merge: true });
        transaction.set(eventRef, sanitizeForAdminFirestore({
            id: eventRef.id,
            workspaceId: params.workspaceId,
            actorId: params.scope.userId,
            action: `campaign_${params.action}`,
            campaignId: current.id,
            outputId: params.outputId,
            metadata: { approvalState: ownerApprovalState },
            confidence: "observed",
            createdAt: now,
        }));
        if (params.action === "request_approval") {
            transaction.set(summaryRef, buildDashboardSummaryIncrement({
                action: params.action,
                updatedAt: now,
                workspaceId: params.workspaceId,
            }), { merge: true });
        }
        transaction.set(idempotencyRef, sanitizeForAdminFirestore({
            action: params.action,
            resultId: current.id,
            status: "completed",
            updatedAt: now,
        }), { merge: true });
        return {
            campaign: {
                ...current,
                ...updates,
                actionCounts: updates.actionCounts || current.actionCounts,
                ownerApprovalState,
                updatedAt: now,
            },
        };
    });

    if (result.error) {
        await completeIdempotency({
            action: params.action,
            actorId: params.scope.userId,
            claimId: params.claimId,
            idempotencyKey: params.idempotencyKey,
            requestHash: params.requestHash,
            responseError: result.error,
            responseStatus: result.status,
            resultId: params.campaignId,
            updatedAt: now,
            workspaceId: params.workspaceId,
        });
    }
    return result;
}

const CAMPAIGNCUE_TRUST_GATED_ACTIONS = new Set<CampaignCueActionType>([
    "download",
    "export",
    "mark_used",
    "schedule",
]);

function assertCampaignActionAllowed(
    campaign: CampaignCueCampaign,
    action: CampaignCueActionType,
    workspace: CampaignCueWorkspace,
) {
    if ((campaign.trustGate === "blocked" || campaign.trustGate === "needs_fix") && CAMPAIGNCUE_TRUST_GATED_ACTIONS.has(action)) {
        return "This campaign has a blocking trust issue.";
    }
    if (CAMPAIGNCUE_TRUST_GATED_ACTIONS.has(action)) {
        if (campaign.ownerApprovalState === "requested") {
            return "This campaign is waiting for approval before manual use.";
        }
        if (campaign.ownerApprovalState === "rejected") {
            return "This campaign was rejected. Review it and request approval again before manual use.";
        }
        if (workspace.agencyMode && campaign.ownerApprovalState !== "approved") {
            return "Owner or client approval is required before manual use in this agency workspace.";
        }
    }
    return null;
}

const CAMPAIGNCUE_APPROVAL_ACTIONS = new Set<CampaignCueActionType>([
    "request_approval",
    "approve",
    "reject",
]);

const buildCampaignCueActionUpdates = (params: {
    campaign: CampaignCueCampaign;
    input: CampaignCueCampaignActionInput;
    now: unknown;
}): Partial<CampaignCueCampaign> => {
    const updates: Partial<CampaignCueCampaign> = {
        actionCounts: {
            ...(params.campaign.actionCounts || {}),
            [params.input.action]: Number(params.campaign.actionCounts?.[params.input.action] || 0) + 1,
        },
        updatedAt: params.now,
    };
    if (params.input.action === "mark_used") updates.status = "used";
    if (params.input.action === "record_outcome") {
        const resultSignalId = params.input.resultSignalId;
        const isNotUseful = resultSignalId === "not_useful";
        const isNotUsed = resultSignalId === "not_used";
        const receipt = params.input.resultReceipt;
        updates.status = isNotUsed ? params.campaign.status : "used";
        updates.resultMemory = {
            ...(params.campaign.resultMemory || {}),
            lastSignalId: resultSignalId,
            lastNote: params.input.note || "Owner reported a result.",
            lastRecordedAt: params.now,
            usefulCount: Number(params.campaign.resultMemory?.usefulCount || 0) + (!isNotUseful && !isNotUsed ? 1 : 0),
            notUsefulCount: Number(params.campaign.resultMemory?.notUsefulCount || 0) + (isNotUseful ? 1 : 0),
            lastReceipt: {
                signalId: resultSignalId,
                channel: params.input.channel,
                usedAt: isNotUsed ? undefined : receipt?.usedAt || params.now,
                metrics: isNotUsed ? {} : receipt?.metrics || {},
                evidenceNote: receipt?.evidenceNote || params.input.note,
                experimentVariable: receipt?.experimentVariable || params.campaign.pack?.experiment?.variable,
                confidence: "owner_reported",
                recordedAt: params.now,
            },
        };
    }
    if (params.input.action === "schedule") updates.status = "scheduled";
    return updates;
};

export async function recordCampaignCueActionServer(params: {
    campaignId: string;
    input: CampaignCueCampaignActionInput;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    if (CAMPAIGNCUE_APPROVAL_ACTIONS.has(params.input.action)) {
        if (
            (params.input.action === "approve" || params.input.action === "reject")
            && !CAMPAIGNCUE_APPROVAL_RESOLUTION_ROLES.has(campaignCueWorkspaceRole(workspace, params.scope.userId))
        ) {
            return { error: "This workspace role cannot approve or reject campaign packs.", status: 403 as const };
        }
        const approvalIdempotency = await checkIdempotency({
            action: params.input.action,
            idempotencyKey: params.input.idempotencyKey,
            requestIdentity: {
                campaignId: params.campaignId,
                input: { ...params.input, idempotencyKey: undefined },
            },
            scope: params.scope,
            workspaceId,
        });
        const approvalReplay = approvalIdempotency.replay;
        if (approvalReplay?.resultId) {
            if (approvalReplay.resultId !== params.campaignId) {
                throw new CampaignCueIdempotencyConflictError("This idempotency key was already used for another campaign.");
            }
            if (approvalReplay.responseError) {
                return {
                    error: approvalReplay.responseError,
                    replayed: true,
                    status: approvalReplay.responseStatus === 404 ? 404 as const : 409 as const,
                };
            }
            const replayCampaign = await readCampaign(workspaceId, params.campaignId);
            return replayCampaign
                ? { campaign: replayCampaign, replayed: true }
                : { error: "Campaign not found", status: 404 as const };
        }
        return recordCampaignCueApprovalActionTransactional({
            action: params.input.action as CampaignCueApprovalAction,
            campaignId: params.campaignId,
            claimId: approvalIdempotency.claimId,
            idempotencyKey: params.input.idempotencyKey,
            note: params.input.note,
            outputId: params.input.outputId,
            scope: params.scope,
            requestHash: approvalIdempotency.requestHash,
            workspaceId,
        });
    }

    const idempotency = await checkIdempotency({
        action: params.input.action,
        idempotencyKey: params.input.idempotencyKey,
        requestIdentity: {
            campaignId: params.campaignId,
            input: { ...params.input, idempotencyKey: undefined },
        },
        scope: params.scope,
        workspaceId,
    });
    const replay = idempotency.replay;
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
        const replayCampaign = await readCampaign(workspaceId, params.campaignId);
        return replayCampaign
            ? { campaign: replayCampaign, replayed: true }
            : { error: "Campaign not found", status: 404 as const };
    }

    const now = nowTimestamp();
    const campaignRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).doc(params.campaignId);
    const eventRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    const scheduleRef = params.input.action === "schedule"
        ? workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SCHEDULES).doc(buildId(CAMPAIGNCUE_SCHEDULE_ID_PREFIX))
        : null;
    const idempotencyRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(params.input.idempotencyKey);
    const summaryRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ANALYTICS_SUMMARIES)
        .doc(CAMPAIGNCUE_DASHBOARD_SUMMARY_ID);
    const sourceSnapshotRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS)
        .doc(defaultSourceSnapshotId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const currentSnap = await transaction.get(campaignRef);
        if (idempotency.claimId && idempotency.requestHash) {
            const idempotencySnap = await transaction.get(idempotencyRef);
            assertCampaignCueIdempotencyClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
                action: params.input.action,
                actorId: params.scope.userId,
                requestHash: idempotency.requestHash,
            }, idempotency.claimId);
        }
        if (!currentSnap.exists) {
            transaction.set(idempotencyRef, sanitizeForAdminFirestore({
                action: params.input.action,
                responseError: "Campaign not found",
                responseStatus: 404,
                resultId: params.campaignId,
                status: "completed",
                updatedAt: now,
            }), { merge: true });
            return { error: "Campaign not found", status: 404 as const };
        }
        const current = parseCampaignCueCampaignRecord(currentSnap.data(), {
            campaignId: params.campaignId,
            workspaceId,
        });
        let currentWorkspace = workspace;
        let currentSourceSnapshot: CampaignCueSourceSnapshot | null = null;
        let finalActionError: string | null = null;
        if (CAMPAIGNCUE_TRUST_GATED_ACTIONS.has(params.input.action)) {
            const currentWorkspaceSnap = await transaction.get(workspaceRef(workspaceId));
            if (!currentWorkspaceSnap.exists) {
                finalActionError = "Campaign workspace unavailable";
            } else {
                currentWorkspace = normalizeCampaignCueWorkspace(assertCampaignCueWorkspaceRecordScope(
                    currentWorkspaceSnap.data(),
                    { ...params.scope, workspaceId },
                ));
            }
            if (current.pack?.freshness?.sourceHash) {
                const currentSourceSnapshotSnap = await transaction.get(sourceSnapshotRef);
                currentSourceSnapshot = currentSourceSnapshotSnap.exists
                    ? parseCampaignCueSourceSnapshotRecord(currentSourceSnapshotSnap.data(), workspaceId)
                    : null;
            }
        }

        finalActionError ||= assertCampaignActionAllowed(current, params.input.action, currentWorkspace);
        if (!finalActionError && CAMPAIGNCUE_TRUST_GATED_ACTIONS.has(params.input.action) && current.pack?.patternCueSourceHash) {
            const currentPatternHash = currentWorkspace.patternCueSource?.patternCue?.sourceHash;
            if (!currentPatternHash || currentPatternHash !== current.pack.patternCueSourceHash) {
                finalActionError = "The example format changed after this pack was created. Create a fresh pack before public use.";
            }
        }
        if (!finalActionError && CAMPAIGNCUE_TRUST_GATED_ACTIONS.has(params.input.action) && current.pack?.freshness?.sourceHash) {
            if (!currentSourceSnapshot?.sourceHash) {
                finalActionError = "Campaign facts could not be rechecked. Refresh the workspace before public use.";
            } else {
                const freshness = evaluateCampaignCuePackFreshness({
                    currentSourceHash: currentSourceSnapshot.sourceHash,
                    freshness: current.pack.freshness,
                });
                if (freshness.status === "stale") {
                    finalActionError = "Business facts changed after this pack was created. Create a fresh pack before public use.";
                } else if (freshness.status === "expired") {
                    finalActionError = "This pack has expired. Confirm current stock, slots, dates, and offers, then create a fresh pack.";
                }
            }
        }
        if (finalActionError) {
            transaction.set(eventRef, sanitizeForAdminFirestore({
                id: eventRef.id,
                workspaceId,
                actorId: params.scope.userId,
                action: "export_action_blocked",
                campaignId: current.id,
                channel: params.input.channel,
                outputId: params.input.outputId,
                metadata: { blockedAction: params.input.action, reason: finalActionError },
                confidence: "observed",
                createdAt: now,
            }));
            transaction.set(idempotencyRef, sanitizeForAdminFirestore({
                action: params.input.action,
                responseError: finalActionError,
                responseStatus: 409,
                resultId: current.id,
                status: "completed",
                updatedAt: now,
            }), { merge: true });
            return { error: finalActionError, status: 409 as const };
        }

        const updates = buildCampaignCueActionUpdates({ campaign: current, input: params.input, now });
        transaction.set(campaignRef, sanitizeForAdminFirestore(updates), { merge: true });

        let schedule: CampaignCueSchedule | null = null;
        if (scheduleRef) {
            schedule = {
                id: scheduleRef.id,
                workspaceId,
                campaignId: current.id,
                outputId: params.input.outputId,
                channel: params.input.channel || current.channels[0],
                mode: "manual_task",
                status: "scheduled",
                scheduledAt: params.input.scheduledAt || null,
                timezone: currentWorkspace.settings.timezone,
                note: params.input.note || "Manual CampaignCue task",
                taskType: params.input.taskType || "post",
                assigneeLabel: params.input.staffAssignee,
                createdAt: now,
                updatedAt: now,
            };
            transaction.set(scheduleRef, sanitizeForAdminFirestore(schedule));
        }

        transaction.set(eventRef, sanitizeForAdminFirestore({
            id: eventRef.id,
            workspaceId,
            actorId: params.scope.userId,
            action: params.input.action === "mark_used"
                ? "manual_export_used"
                : params.input.action === "record_outcome"
                    ? "owner_outcome_recorded"
                    : `campaign_${params.input.action}`,
            campaignId: current.id,
            channel: params.input.channel,
            outputId: params.input.outputId,
            metadata: params.input.action === "record_outcome" ? {
                note: params.input.note || "Owner reported a result.",
                resultSignalId: params.input.resultSignalId,
                metrics: updates.resultMemory?.lastReceipt?.metrics || {},
                experimentVariable: updates.resultMemory?.lastReceipt?.experimentVariable,
            } : {},
            confidence: params.input.action === "record_outcome" ? "owner_reported" : "observed",
            createdAt: now,
        }));
        transaction.set(summaryRef, buildDashboardSummaryIncrement({
            action: params.input.action,
            updatedAt: now,
            workspaceId,
        }), { merge: true });
        transaction.set(idempotencyRef, sanitizeForAdminFirestore({
            action: params.input.action,
            resultId: current.id,
            status: "completed",
            updatedAt: now,
        }), { merge: true });
        const updated: CampaignCueCampaign = {
            ...current,
            ...updates,
            actionCounts: updates.actionCounts || current.actionCounts,
            ownerApprovalState: updates.ownerApprovalState || current.ownerApprovalState,
            resultMemory: updates.resultMemory || current.resultMemory,
            status: updates.status || current.status,
            updatedAt: now,
        };
        return { campaign: updated, schedule };
    });
}

function assertCampaignCueAssetBinding(
    campaign: CampaignCueCampaign,
    input: CampaignCueAssetInput,
) {
    const linkedOutput = input.outputId
        ? campaign.outputs.find((output) => output.id === input.outputId)
        : undefined;
    if (input.outputId && !linkedOutput) {
        throw new CampaignCueDecisionGateError("The campaign output selected for this asset is unavailable.");
    }
    if (input.channel && !campaign.channels.includes(input.channel)) {
        throw new CampaignCueDecisionGateError("The selected channel does not belong to this campaign.");
    }
    if (input.channel && linkedOutput && linkedOutput.channel !== input.channel) {
        throw new CampaignCueDecisionGateError("The selected output and channel do not match.");
    }
}

export async function createCampaignCueAssetServer(params: {
    input: CampaignCueAssetInput;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    if (params.input.storagePath && !isCampaignCueWorkspaceStoragePath(params.input.storagePath, workspaceId)) {
        throw new CampaignCueDecisionGateError("This asset file does not belong to the current CampaignCue workspace.");
    }
    let linkedCampaign: CampaignCueCampaign | null = null;
    if (params.input.campaignId) {
        linkedCampaign = await readCampaign(workspaceId, params.input.campaignId);
        if (!linkedCampaign) throw new CampaignCueDecisionGateError("The campaign selected for this asset is unavailable.");
        assertCampaignCueAssetBinding(linkedCampaign, params.input);
    }
    let file: CampaignCueAsset["file"];
    if (params.input.storagePath) {
        try {
            const [metadata] = await campaigncueStorageAdmin.bucket().file(params.input.storagePath).getMetadata();
            const sizeBytes = Number(metadata.size);
            const mimeType = metadata.contentType || params.input.mimeType;
            const storageGeneration = String(metadata.generation || "");
            if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0 || sizeBytes > CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES) {
                throw new CampaignCueDecisionGateError("This asset file size is unavailable or unsupported.");
            }
            if (mimeType && mimeType.length > 120) {
                throw new CampaignCueDecisionGateError("This asset file type is unsupported.");
            }
            if (!/^[1-9][0-9]{0,29}$/.test(storageGeneration)) {
                throw new CampaignCueDecisionGateError("This asset file version is unavailable.");
            }
            file = {
                storagePath: params.input.storagePath,
                storageGeneration,
                mimeType,
                sizeBytes,
            };
        } catch (error) {
            if (error instanceof CampaignCueDecisionGateError) throw error;
            throw new CampaignCueDecisionGateError("This asset file could not be verified in CampaignCue Storage.");
        }
    } else if (params.input.mimeType || params.input.sizeBytes !== undefined) {
        file = {
            mimeType: params.input.mimeType,
            sizeBytes: params.input.sizeBytes,
        };
    }
    const { idempotencyKey, ...requestInput } = params.input;
    const idempotencyAction = "asset_create";
    const idempotency = await checkIdempotency({
        action: idempotencyAction,
        idempotencyKey,
        requestIdentity: { action: idempotencyAction, input: requestInput },
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay?.resultId) {
        const replaySnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS)
            .doc(idempotency.replay.resultId)
            .get();
        if (!replaySnap.exists) {
            throw new CampaignCueIdempotencyConflictError("The saved asset retry result is unavailable.");
        }
        return parseCampaignCueAssetRecord({
            assetId: replaySnap.id,
            value: replaySnap.data(),
            workspaceId,
        });
    }
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
        tags: Array.from(new Set(params.input.tags || [])),
        ...(file ? { file } : {}),
        usageRefs: params.input.campaignId ? [{
            campaignId: params.input.campaignId,
            outputId: params.input.outputId,
            channel: params.input.channel,
        }] : [],
        createdAt: now,
        updatedAt: now,
    };
    const assetRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS).doc(asset.id);
    const eventRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS)
        .doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    const idempotencyRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(idempotencyKey);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const [idempotencySnap, campaignSnap] = await Promise.all([
            transaction.get(idempotencyRef),
            params.input.campaignId
                ? transaction.get(
                    workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS)
                        .doc(params.input.campaignId),
                )
                : Promise.resolve(null),
            assertCurrentCampaignCueWorkspaceAccess(transaction, params.scope, workspaceId),
        ]);
        assertCampaignCueIdempotencyClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
            action: idempotencyAction,
            actorId: params.scope.userId,
            requestHash: idempotency.requestHash,
        }, idempotency.claimId as string);
        if (params.input.campaignId) {
            if (!campaignSnap?.exists) {
                throw new CampaignCueDecisionGateError("The campaign selected for this asset is unavailable.");
            }
            assertCampaignCueAssetBinding(
                parseCampaignCueCampaignRecord(campaignSnap.data(), {
                    campaignId: params.input.campaignId,
                    workspaceId,
                }),
                params.input,
            );
        }
        transaction.set(assetRef, sanitizeForAdminFirestore(asset));
        transaction.set(eventRef, sanitizeForAdminFirestore({
            id: eventRef.id,
            workspaceId,
            actorId: params.scope.userId,
            action: "asset_registered",
            campaignId: params.input.campaignId,
            channel: params.input.channel,
            outputId: params.input.outputId,
            metadata: { assetId: asset.id, assetType: asset.assetType, rightsStatus: asset.rights.status },
            confidence: "observed",
            createdAt: now,
        }));
        transaction.set(idempotencyRef, sanitizeForAdminFirestore({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            requestHash: idempotency.requestHash,
            resultId: asset.id,
            status: "completed",
            updatedAt: now,
        }), { merge: true });
    });
    return asset;
}

export async function createCampaignCueAssetDownloadServer(params: {
    assetId: string;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS)
        .doc(params.assetId)
        .get();
    if (!snap.exists) throw new CampaignCueAssetAccessError("Asset not found.", 404);
    let asset: CampaignCueAsset;
    try {
        asset = parseCampaignCueAssetRecord({ assetId: snap.id, value: snap.data(), workspaceId });
    } catch {
        throw new CampaignCueAssetAccessError("This asset record is unavailable.", 409);
    }
    if (asset.status === "blocked") throw new CampaignCueAssetAccessError("This asset is blocked.", 409);
    const storagePath = asset.file?.storagePath;
    if (!storagePath) {
        throw new CampaignCueAssetAccessError("This asset does not have a downloadable file.", 409);
    }
    const storageGeneration = asset.file?.storageGeneration;
    if (!storageGeneration) {
        throw new CampaignCueAssetAccessError("This legacy asset must be registered again before download.", 409);
    }
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const [url] = await campaigncueStorageAdmin.bucket().file(storagePath, {
        generation: storageGeneration,
    }).getSignedUrl({
        action: "read",
        expires: expiresAt,
    });
    return {
        assetId: asset.id,
        expiresAt,
        mimeType: asset.file.mimeType,
        name: asset.name,
        url,
    };
}

export async function createCampaignCueSourceInputServer(params: {
    input: CampaignCueSourceInputData;
    scope: CampaignCueSessionScope;
}) {
    const { workspace } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const id = params.input.sourceType === "inspiration_pattern"
        ? "cc_source_pattern_current"
        : buildId("cc_source");
    if (params.input.sourceType === "inspiration_pattern" && !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PATTERN_CUE) {
        throw new Error("Pattern Cue is disabled");
    }
    const { idempotencyKey, ...requestInput } = params.input;
    const idempotencyAction = "source_input_create";
    const idempotency = await checkIdempotency({
        action: idempotencyAction,
        idempotencyKey,
        requestIdentity: { action: idempotencyAction, input: requestInput },
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay?.resultId) {
        if (idempotency.replay.resultId === "cc_source_pattern_current") {
            const currentWorkspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
            if (!isCampaignCuePatternCueSourceInput(currentWorkspace.patternCueSource)) {
                throw new CampaignCueIdempotencyConflictError("The saved example-pattern retry result is unavailable.");
            }
            return currentWorkspace.patternCueSource;
        }
        const replaySnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS)
            .doc(idempotency.replay.resultId)
            .get();
        if (!replaySnap.exists) {
            throw new CampaignCueIdempotencyConflictError("The saved source retry result is unavailable.");
        }
        return parseCampaignCueSourceInputRecord(replaySnap.data(), workspaceId);
    }
    const now = nowTimestamp();
    const businessRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS)
        .doc(defaultBusinessBrainId);
    const sourceSnapshotRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS)
        .doc(defaultSourceSnapshotId);
    const sourceInputRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_INPUTS).doc(id);
    const eventRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS)
        .doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    const idempotencyRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(idempotencyKey);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const [idempotencySnap, businessSnap, sourceSnapshotSnap] = await Promise.all([
            transaction.get(idempotencyRef),
            transaction.get(businessRef),
            transaction.get(sourceSnapshotRef),
            assertCurrentCampaignCueWorkspaceAccess(transaction, params.scope, workspaceId),
        ]);
        assertCampaignCueIdempotencyClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
            action: idempotencyAction,
            actorId: params.scope.userId,
            requestHash: idempotency.requestHash,
        }, idempotency.claimId as string);
        const currentBusinessBrain = normalizeCampaignCueBusinessBrain(
            assertCampaignCueBusinessBrainRecordScope(
                businessSnap.exists ? businessSnap.data() : null,
                workspaceId,
            ),
        );
        const patternCue = params.input.sourceType === "inspiration_pattern" && params.input.inspiration
            ? buildCampaignCuePatternCueObservation({
                businessBrain: currentBusinessBrain,
                durationSeconds: params.input.inspiration.durationSeconds,
                ownerTakeaway: params.input.inspiration.ownerTakeaway,
                platform: params.input.inspiration.platform,
                rightsStatus: params.input.inspiration.rightsStatus,
                sourceUrl: params.input.inspiration.sourceUrl,
                transcriptOrNotes: params.input.inspiration.transcriptOrNotes,
            })
            : undefined;
        const sourceInput: CampaignCueSourceInput = {
            id,
            workspaceId,
            sourceType: params.input.sourceType,
            label: params.input.label,
            value: patternCue?.summary || params.input.value,
            status: params.input.status,
            confidence: patternCue ? "estimated" : params.input.status === "active" ? "manual" : "estimated",
            sourceRefs: patternCue ? [`pattern:${patternCue.sourceHash}`] : ["owner_input"],
            facts: [],
            patternCue,
            expiresAt: params.input.expiresAt
                ? admin.firestore.Timestamp.fromDate(new Date(params.input.expiresAt))
                : null,
            createdAt: now,
            updatedAt: now,
        };
        sourceInput.facts = sourceInputToFacts(sourceInput);
        const existingSnapshot = sourceSnapshotSnap.exists
            ? parseCampaignCueSourceSnapshotRecord(sourceSnapshotSnap.data(), workspaceId)
            : null;
        const sourceSnapshot = buildSourceSnapshotFromExistingSnapshot({
            businessBrain: currentBusinessBrain,
            existingSnapshot,
            sourceInput,
        });
        if (patternCue) {
            transaction.set(
                workspaceRef(workspaceId),
                sanitizeForAdminFirestore({
                    patternCueSource: sourceInput,
                    updatedAt: now,
                }),
                { merge: true },
            );
        } else {
            transaction.create(sourceInputRef, sanitizeForAdminFirestore(sourceInput));
        }
        transaction.set(sourceSnapshotRef, sanitizeForAdminFirestore(sourceSnapshot));
        transaction.set(eventRef, sanitizeForAdminFirestore({
            id: eventRef.id,
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
        }));
        transaction.set(idempotencyRef, sanitizeForAdminFirestore({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            requestHash: idempotency.requestHash,
            resultId: sourceInput.id,
            status: "completed",
            updatedAt: now,
        }), { merge: true });
        return sourceInput;
    });
}

export async function createCampaignCueLocationServer(params: {
    input: CampaignCueLocationInput;
    scope: CampaignCueSessionScope;
}) {
    const workspace = await ensureCampaignCueWorkspaceOnlyServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const { idempotencyKey, ...requestInput } = params.input;
    const idempotencyAction = "location_create";
    const idempotency = await checkIdempotency({
        action: idempotencyAction,
        idempotencyKey,
        requestIdentity: { action: idempotencyAction, input: requestInput },
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay?.resultId) {
        const replaySnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS)
            .doc(idempotency.replay.resultId)
            .get();
        if (!replaySnap.exists) {
            throw new CampaignCueIdempotencyConflictError("The saved location retry result is unavailable.");
        }
        return parseCampaignCueLocationRecord(replaySnap.data(), workspaceId);
    }
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
    const locationRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.LOCATIONS).doc(location.id);
    const eventRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS)
        .doc(buildId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    const idempotencyRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(idempotencyKey);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const [idempotencySnap] = await Promise.all([
            transaction.get(idempotencyRef),
            assertCurrentCampaignCueWorkspaceAccess(transaction, params.scope, workspaceId),
        ]);
        assertCampaignCueIdempotencyClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
            action: idempotencyAction,
            actorId: params.scope.userId,
            requestHash: idempotency.requestHash,
        }, idempotency.claimId as string);
        transaction.create(locationRef, sanitizeForAdminFirestore(location));
        transaction.set(eventRef, sanitizeForAdminFirestore({
            id: eventRef.id,
            workspaceId,
            actorId: params.scope.userId,
            action: "location_draft_added",
            metadata: {
                locationId: location.id,
                status: location.status,
            },
            confidence: "observed",
            createdAt: now,
        }));
        transaction.set(idempotencyRef, sanitizeForAdminFirestore({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            requestHash: idempotency.requestHash,
            resultId: location.id,
            status: "completed",
            updatedAt: now,
        }), { merge: true });
    });
    return location;
}

export async function patchCampaignCueBusinessServer(params: {
    input: CampaignCueBusinessPatchInput;
    scope: CampaignCueSessionScope;
}): Promise<{
    businessBrain: CampaignCueBusinessBrain;
    opportunities: CampaignCueOpportunity[];
    sourceHash: string;
    sourceFacts: CampaignCueSourceFact[];
    workspace: CampaignCueWorkspace;
}> {
    const { workspace } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const { idempotencyKey, ...requestInput } = params.input;
    const idempotencyAction = "business_patch";
    const idempotency = await checkIdempotency({
        action: idempotencyAction,
        idempotencyKey,
        requestIdentity: { action: idempotencyAction, input: requestInput },
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay?.resultId) {
        const { businessBrain: replayBusinessBrain, workspace: replayWorkspace } = await ensureCampaignCueWorkspaceServer(params.scope);
        if (replayBusinessBrain.businessBrainId !== idempotency.replay.resultId) {
            throw new CampaignCueIdempotencyConflictError("The saved business retry result is unavailable.");
        }
        const replaySourceSnapshot = await readSourceSnapshot(workspaceId);
        if (!replaySourceSnapshot) {
            throw new CampaignCueIdempotencyConflictError("The saved business source snapshot is unavailable.");
        }
        return {
            businessBrain: replayBusinessBrain,
            opportunities: buildCampaignCueOpportunities({
                businessBrain: replayBusinessBrain,
                sourceSnapshot: replaySourceSnapshot,
                workspaceId,
            }),
            sourceHash: replaySourceSnapshot.sourceHash,
            sourceFacts: replaySourceSnapshot.facts,
            workspace: replayWorkspace,
        };
    }
    const businessRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS)
        .doc(defaultBusinessBrainId);
    const sourceSnapshotRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS)
        .doc(defaultSourceSnapshotId);
    const idempotencyRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS)
        .doc(idempotencyKey);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const [idempotencySnap, businessSnap, sourceSnapshotSnap, currentWorkspace] = await Promise.all([
            transaction.get(idempotencyRef),
            transaction.get(businessRef),
            transaction.get(sourceSnapshotRef),
            assertCurrentCampaignCueWorkspaceAccess(transaction, params.scope, workspaceId),
        ]);
        assertCampaignCueIdempotencyClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
            action: idempotencyAction,
            actorId: params.scope.userId,
            requestHash: idempotency.requestHash,
        }, idempotency.claimId as string);
        const currentBusinessBrain = normalizeCampaignCueBusinessBrain(
            assertCampaignCueBusinessBrainRecordScope(
                businessSnap.exists ? businessSnap.data() : null,
                workspaceId,
            ),
        );
        const existingSnapshot = sourceSnapshotSnap.exists
            ? parseCampaignCueSourceSnapshotRecord(sourceSnapshotSnap.data(), workspaceId)
            : null;
        const updatedAt = nowTimestamp();
        const nextLocale = params.input.locale ?? currentBusinessBrain.locale;
        const next: CampaignCueBusinessBrain = {
            ...currentBusinessBrain,
            businessType: params.input.businessType || currentBusinessBrain.businessType,
            name: params.input.name || currentBusinessBrain.name,
            locality: params.input.locality ?? currentBusinessBrain.locality,
            contacts: {
                ...currentBusinessBrain.contacts,
                website: patchOptionalUrl(params.input, "website", currentBusinessBrain.contacts.website),
                phone: params.input.phone ?? currentBusinessBrain.contacts.phone,
                whatsapp: params.input.whatsapp ?? currentBusinessBrain.contacts.whatsapp,
                bookingUrl: patchOptionalUrl(params.input, "bookingUrl", currentBusinessBrain.contacts.bookingUrl),
                publicMenuUrl: patchOptionalUrl(params.input, "publicMenuUrl", currentBusinessBrain.contacts.publicMenuUrl),
            },
            brandKit: {
                ...currentBusinessBrain.brandKit,
                primaryColor: params.input.primaryColor ?? currentBusinessBrain.brandKit.primaryColor,
                logoUrl: patchOptionalUrl(params.input, "logoUrl", currentBusinessBrain.brandKit.logoUrl),
                voice: params.input.voice ?? currentBusinessBrain.brandKit.voice,
                playbook: mergeBrandPlaybookPatch(currentBusinessBrain.brandKit.playbook, params.input),
            },
            locale: nextLocale,
            timezone: params.input.timezone ?? currentBusinessBrain.timezone,
            operatingPulse: normalizeCampaignCueOperatingPulse({
                ...currentBusinessBrain.operatingPulse,
                ...(params.input.operatingPulse || {}),
                updatedAt: params.input.operatingPulse
                    ? updatedAt
                    : currentBusinessBrain.operatingPulse?.updatedAt,
            }),
            commercialPolicy: normalizeCampaignCueCommercialPolicy({
                ...currentBusinessBrain.commercialPolicy,
                ...(params.input.commercialPolicy || {}),
            }),
            presence: normalizeCampaignCuePresenceProfile({
                ...currentBusinessBrain.presence,
                ...(params.input.presence || {}),
            }),
            languagePolicy: normalizeCampaignCueLanguagePolicy({
                ...currentBusinessBrain.languagePolicy,
                targetLocales: params.input.targetLocales
                    ?? currentBusinessBrain.languagePolicy?.targetLocales,
            }, nextLocale),
            updatedAt,
        };
        const sourceSnapshot = buildSourceSnapshotFromExistingSnapshot({
            businessBrain: next,
            existingSnapshot,
        });
        const workspaceUpdate: Partial<CampaignCueWorkspace> = {
            agencyMode: params.input.agencyMode ?? currentWorkspace.agencyMode,
            multiLocationMode: params.input.multiLocationMode ?? currentWorkspace.multiLocationMode,
            settings: {
                ...currentWorkspace.settings,
                timezone: params.input.timezone ?? currentWorkspace.settings.timezone,
                locale: params.input.locale ?? currentWorkspace.settings.locale,
                deliveryMode: CAMPAIGNCUE_DELIVERY_MODE,
                billingEnabled: Boolean(FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_BILLING),
            },
            updatedAt,
        };
        transaction.set(
            workspaceRef(workspaceId),
            sanitizeForAdminFirestore(workspaceUpdate),
            { merge: true },
        );
        transaction.set(businessRef, sanitizeForAdminFirestore(next));
        transaction.set(sourceSnapshotRef, sanitizeForAdminFirestore(sourceSnapshot));
        transaction.set(idempotencyRef, sanitizeForAdminFirestore({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            requestHash: idempotency.requestHash,
            resultId: next.businessBrainId,
            status: "completed",
            updatedAt,
        }), { merge: true });
        const updatedWorkspace = {
            ...currentWorkspace,
            ...workspaceUpdate,
            settings: workspaceUpdate.settings || currentWorkspace.settings,
            updatedAt: workspaceUpdate.updatedAt,
        };
        return {
            businessBrain: next,
            opportunities: buildCampaignCueOpportunities({
                businessBrain: next,
                sourceSnapshot,
                workspaceId,
            }),
            sourceHash: sourceSnapshot.sourceHash,
            sourceFacts: sourceSnapshot.facts,
            workspace: updatedWorkspace,
        };
    });
}

export function buildCampaignCueAuthLaunchUrl() {
    return buildCampaignCueAuthLaunchUrlFromSignIn(SIGNIN_URL);
}

const isStructuredErrorRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object");

const getStructuredErrorField = (value: unknown, key: string) => {
    if (!isStructuredErrorRecord(value)) return "";
    const field = value[key];
    if (typeof field === "string" || typeof field === "number") return String(field);
    return "";
};

const collectCampaignCueFirebaseErrorIndicators = (value: unknown): Set<string> => {
    const indicators = new Set<string>();
    const add = (item: unknown) => {
        if (typeof item === "string" || typeof item === "number") {
            const normalized = String(item).trim().toLowerCase();
            if (normalized) indicators.add(normalized);
        }
    };
    const collectRecord = (record: Record<string, unknown>) => {
        ["code", "status", "statusCode", "name", "reason", "domain", "service"].forEach(key => add(record[key]));
        const metadata = record.metadata;
        if (isStructuredErrorRecord(metadata)) {
            ["reason", "domain", "service"].forEach(key => add(metadata[key]));
        }
    };

    if (!isStructuredErrorRecord(value)) return indicators;
    collectRecord(value);

    const details = value.details;
    if (Array.isArray(details)) {
        details.forEach((detail) => {
            if (isStructuredErrorRecord(detail)) collectRecord(detail);
        });
    } else if (isStructuredErrorRecord(details)) {
        collectRecord(details);
    }

    const errorInfoMetadata = value.errorInfoMetadata;
    if (isStructuredErrorRecord(errorInfoMetadata)) collectRecord(errorInfoMetadata);

    return indicators;
};

export function isCampaignCueFirebaseUnavailableError(error: unknown) {
    const indicators = collectCampaignCueFirebaseErrorIndicators(error);
    const serviceUnavailable = indicators.has("consumer_invalid")
        || indicators.has("firestore.googleapis.com");
    const deniedFirestore = indicators.has("permission_denied")
        && indicators.has("firestore.googleapis.com");

    return indicators.has("7") || serviceUnavailable || deniedFirestore;
}

export function buildCampaignCueApiError(error: unknown, fallbackMessage: string) {
    if (error instanceof CampaignCueWorkspaceScopeError) {
        return {
            body: { error: "Forbidden" },
            status: 403,
        };
    }
    if (error instanceof CampaignCueAssetAccessError) {
        return {
            body: { error: error.clientMessage },
            status: error.status,
        };
    }
    if (error instanceof CampaignCueIdempotencyConflictError) {
        return {
            body: {
                code: error.code,
                error: error.clientMessage,
            },
            status: error.status,
        };
    }

    if (error instanceof CampaignCueDecisionGateError) {
        return {
            body: {
                code: error.code,
                error: error.clientMessage,
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
    const failureCode = toCampaignCueFailureCode(message);
    logger.error(message, new Error(failureCode), {
        productId: CAMPAIGNCUE_PRODUCT_CODE,
        failureCode,
        ...getCampaignCueSafeLogMetadata(metadata),
        ...getCampaignCueSourceErrorContext(error),
    });
}
