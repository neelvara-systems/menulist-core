import { CAMPAIGNCUE_CHANNELS } from "@constant/campaigncue/channels";
import { CAMPAIGNCUE_EXPORT_ACTIONS } from "@constant/campaigncue/delivery";
import { normalizeCampaignCuePatternCueUrl } from "@lib/campaigncue/patternCue";
import type {
    CampaignCueAnalyticsSummary,
    CampaignCueCampaign,
    CampaignCueLocation,
    CampaignCueSchedule,
    CampaignCueSourceInput,
    CampaignCueSourceSnapshot,
    CampaignCueTrustReport,
} from "@type/campaigncue";
import { z } from "zod";

const boundedId = z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(2).max(160);
const boundedText = (max: number) => z.string().max(max);
const boundedNonEmptyText = (max: number) => boundedText(max).trim().min(1);
const timestamp = z.unknown().optional();
const requiredTimestamp = z.unknown().refine((value) => value !== undefined && value !== null);
const nonNegativeCount = z.number().int().min(0).max(1_000_000_000);
const channel = z.enum(CAMPAIGNCUE_CHANNELS);
const confidence = z.enum(["observed", "imported", "manual", "estimated", "owner_reported"]);
const ownerGoal = z.enum([
    "bring_people_today",
    "fill_slots",
    "sell_product",
    "book_service",
    "remind_customers",
    "prepare_local_pack",
    "collect_reviews",
    "bring_back_customers",
]);
const decisionOutputType = z.enum([
    "whatsapp_image",
    "whatsapp_message",
    "instagram_square",
    "instagram_story",
    "google_update",
    "google_offer",
    "poster_pdf",
    "flyer_pdf",
    "staff_share_text",
    "ad_handoff_copy",
    "creator_script",
    "reel_brief",
    "campaign_proof_deck_pdf",
    "manual_task",
]);
const missingInputType = z.enum([
    "business_cta",
    "current_offer",
    "price_or_date",
    "offer_end_date",
    "available_time_slot",
    "booking_link",
    "branch_location",
    "menu_service_item",
    "approved_asset",
    "asset_rights",
    "photo",
    "logo",
    "terms",
    "destination_url",
    "location_detail",
    "approval",
    "result_note",
    "local_visibility",
    "commercial_policy",
    "capacity_or_stock",
    "review_destination",
    "completed_customer_interaction",
    "owner_managed_audience",
    "target_language",
]);
const commercialGate = z.object({
    status: z.enum(["ready", "needs_review", "blocked"]),
    findings: z.array(boundedText(2000)).max(40),
}).strict();
const experiment = z.object({
    variable: z.enum(["channel", "timing", "offer", "photo", "cta", "format"]),
    instruction: boundedText(2000),
    reason: boundedText(2000),
}).strict();

const sourceFact = z.object({
    id: boundedId,
    label: boundedText(240),
    value: boundedText(4000),
    sourceRef: boundedText(500),
    sourceType: z.enum(["business_profile", "contact", "menu_or_service", "offer", "event", "asset", "policy", "manual"]),
    confidence,
    freshness: z.enum(["fresh", "stale", "unknown"]),
    risk: z.enum(["low", "needs_review", "blocked"]),
}).strict();

const outputFields = z.object({
    headline: boundedText(1000),
    body: boundedText(12_000),
    cta: boundedText(1000),
    imageBrief: boundedText(4000),
    dimensions: boundedText(120),
    postType: z.enum(["whatsapp_message", "google_update", "social_post", "reel_brief", "creator_script", "ad_handoff", "manual_task"]),
    consentNote: boundedText(2000),
    policyNote: boundedText(2000),
    destination: boundedText(1000),
    utm: boundedText(1000),
    approvalNote: boundedText(2000),
    manualSteps: z.array(boundedText(1000)).max(40),
    ownerUseCase: boundedText(1000).optional(),
    outputFormats: z.array(boundedText(120)).max(30).optional(),
    printFormats: z.array(boundedText(120)).max(30).optional(),
    photoTasks: z.array(boundedText(1000)).max(30).optional(),
    reviewChecklist: z.array(boundedText(1000)).max(40).optional(),
    handoffFields: z.array(z.object({
        id: boundedId,
        label: boundedText(240),
        value: boundedText(12_000),
        copyable: z.boolean(),
        required: z.boolean(),
        status: z.enum(["ready", "needs_review", "missing"]),
    }).strict()).max(40).optional(),
}).strict();

const output = z.object({
    id: boundedId,
    channel,
    label: boundedText(240),
    mode: z.enum(["draft", "manual_export", "manual_handoff", "brief", "schedule_task"]),
    text: boundedText(20_000),
    sourceReferences: z.array(boundedText(500)).max(80),
    providerMode: z.enum(["manual_export", "manual_handoff", "brief_only", "disabled"]),
    trustGate: z.enum(["clear", "warning", "needs_fix", "blocked"]),
    fields: outputFields,
    metadata: z.object({
        patternCue: z.object({
            sourceInputId: boundedId,
            sourceHash: boundedText(160),
            platform: z.enum(["instagram", "tiktok", "youtube", "other"]),
            rightsStatus: z.enum(["reference_only", "owner_authorized"]),
        }).strict().optional(),
        directMutationEnabled: z.literal(false).optional(),
        spendChanging: z.literal(false).optional(),
        productPostApiFallback: z.literal(true).optional(),
        directPublishEnabled: z.literal(false).optional(),
    }).strict().optional(),
}).strict();

const decision = z.object({
    decisionId: boundedId,
    workspaceId: boundedId,
    businessBrainId: boundedId,
    recommendationTitle: boundedText(500),
    ownerGoal,
    recipeId: boundedId,
    opportunityId: boundedId.optional(),
    decisionStatus: z.enum(["ready_to_prepare", "needs_owner_input", "safe_evergreen_only", "blocked"]),
    confidence: z.enum(["high", "medium", "low"]),
    factsUsed: z.object({
        businessFactRefs: z.array(boundedId).max(100),
        offerFactRefs: z.array(boundedId).max(100),
        contactFactRefs: z.array(boundedId).max(100),
        locationFactRefs: z.array(boundedId).max(100),
        assetRefs: z.array(boundedId).max(100),
        resultMemoryRefs: z.array(boundedId).max(100),
    }).strict(),
    missingInputs: z.array(z.object({
        type: missingInputType,
        ownerQuestion: boundedText(2000),
        required: z.boolean(),
        unlocks: z.array(decisionOutputType).max(14),
    }).strict()).max(100),
    score: z.object({
        relevance: z.number().finite().min(0).max(100),
        urgency: z.number().finite().min(0).max(100),
        expectedImpact: z.number().finite().min(0).max(100),
        factReadiness: z.number().finite().min(0).max(100),
        assetReadiness: z.number().finite().min(0).max(100),
        channelReadiness: z.number().finite().min(0).max(100),
        resultMemoryBoost: z.number().finite().min(0).max(100),
        ownerEffortPenalty: z.number().finite().min(0).max(100),
        repetitionPenalty: z.number().finite().min(0).max(100),
        trustRiskPenalty: z.number().finite().min(0).max(100),
        finalScore: z.number().finite().min(0).max(100),
    }).strict(),
    explanation: z.object({
        whyThis: z.array(boundedText(2000)).max(20),
        whyNow: z.array(boundedText(2000)).max(20),
        whyNotOthers: z.array(boundedText(2000)).max(20),
        risks: z.array(boundedText(2000)).max(20),
    }).strict(),
    recommendedOutputs: z.array(z.object({
        outputType: decisionOutputType,
        reason: boundedText(2000),
    }).strict()).max(14),
    trustPreflight: z.object({
        status: z.enum(["ready", "needs_review", "blocked"]),
        findings: z.array(boundedText(2000)).max(40),
    }).strict(),
    ownerPrimaryActionLabel: boundedText(240),
    commercialGate: commercialGate.optional(),
    experiment: experiment.optional(),
    pulseEvidence: z.array(boundedText(2000)).max(20).optional(),
}).strict();

const campaignRecord = z.object({
    id: boundedId,
    workspaceId: boundedId,
    businessBrainId: boundedId,
    opportunityId: boundedId.optional(),
    title: boundedText(500),
    brief: boundedText(5000),
    status: z.enum(["draft", "generated", "scheduled", "used", "archived"]),
    channels: z.array(channel).min(1).max(CAMPAIGNCUE_CHANNELS.length),
    outputs: z.array(output).max(40),
    sourceSnapshotId: boundedId.optional(),
    trustReportId: boundedId.optional(),
    trustGate: z.enum(["clear", "warning", "needs_fix", "blocked"]),
    credits: z.object({
        estimate: nonNegativeCount,
        reserved: nonNegativeCount,
        captured: nonNegativeCount,
        refunded: nonNegativeCount,
        currency: z.literal("credits"),
    }).strict(),
    actionCounts: z.record(z.enum(CAMPAIGNCUE_EXPORT_ACTIONS), nonNegativeCount),
    ownerApprovalState: z.enum(["not_requested", "requested", "approved", "rejected"]),
    locationId: boundedId.optional(),
    pack: z.object({
        ownerGoal,
        reason: boundedText(4000),
        recipeId: boundedId.optional(),
        decision: decision.optional(),
        sourceFactIds: z.array(boundedId).max(40),
        missingInputIds: z.array(boundedId).max(40),
        deliveryCardIds: z.array(boundedId).max(80),
        resultQuestion: boundedText(2000),
        patternCueSourceInputId: boundedId.optional(),
        patternCueSourceHash: boundedText(160).optional(),
        reusedFromCampaignId: boundedId.optional(),
        reuseMode: z.literal("rebuild_from_current_truth").optional(),
        sourceTemplateId: boundedId.optional(),
        outputIntentId: z.enum([
            "recommended_pack",
            "source_to_channel_pack",
            "whatsapp_sales_pack",
            "booking_push_pack",
            "google_local_update",
            "instagram_post_story",
            "print_in_store",
            "staff_share_pack",
            "ad_handoff_pack",
            "local_creator_test_brief",
            "campaign_proof_deck",
            "reuse_old_asset",
            "custom_size",
        ]).optional(),
        requestedOutputTypes: z.array(decisionOutputType).max(14).optional(),
        freshness: z.object({
            sourceHash: boundedText(160),
            status: z.enum(["current", "stale", "expired", "unknown"]),
            validatedAt: z.unknown().optional(),
            expiresAt: z.unknown().optional(),
            recheckActions: z.array(z.enum(["download", "export", "mark_used", "schedule"])).max(4),
        }).strict().optional(),
        commercialGate: commercialGate.optional(),
        experiment: experiment.optional(),
    }).strict().optional(),
    resultMemory: z.object({
        lastSignalId: boundedId.optional(),
        lastNote: boundedText(2000).optional(),
        lastRecordedAt: z.unknown().optional(),
        usefulCount: nonNegativeCount.optional(),
        notUsefulCount: nonNegativeCount.optional(),
        lastReceipt: z.object({
            signalId: boundedId.optional(),
            channel: channel.optional(),
            usedAt: z.unknown().optional(),
            metrics: z.object({
                replies: nonNegativeCount.optional(),
                calls: nonNegativeCount.optional(),
                bookings: nonNegativeCount.optional(),
                orders: nonNegativeCount.optional(),
                walkIns: nonNegativeCount.optional(),
                linkClicks: nonNegativeCount.optional(),
            }).strict(),
            evidenceNote: boundedText(2000).optional(),
            experimentVariable: z.enum(["channel", "timing", "offer", "photo", "cta", "format"]).optional(),
            confidence: z.literal("owner_reported"),
            recordedAt: z.unknown().optional(),
            videoProjectId: boundedId.optional(),
            videoRenderReceiptId: boundedId.optional(),
        }).strict().optional(),
    }).strict().optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const sourceInputRecord = z.object({
    id: boundedId,
    workspaceId: boundedId,
    sourceType: z.enum(["manual_note", "menu_link", "booking_link", "offer", "event", "upload_metadata", "inspiration_pattern"]),
    label: boundedText(240),
    value: boundedText(5000),
    status: z.enum(["active", "needs_review", "archived"]),
    confidence,
    sourceRefs: z.array(boundedText(500)).max(80),
    facts: z.array(sourceFact).max(100),
    patternCue: z.object({
        schemaVersion: z.literal(1),
        sourceUrl: z.string().url().max(1000).refine((value) => normalizeCampaignCuePatternCueUrl(value) === value),
        sourceHash: z.string().regex(/^[a-f0-9]{24}$/),
        platform: z.enum(["instagram", "tiktok", "youtube", "other"]),
        rightsStatus: z.enum(["reference_only", "owner_authorized"]),
        analysisMode: z.enum(["deterministic", "model_candidate"]),
        hookType: z.enum(["question", "curiosity", "demonstration", "offer", "story", "direct_benefit"]),
        format: z.enum(["talking_head", "demonstration", "montage", "screen_recording", "mixed"]),
        pacing: z.enum(["calm", "steady", "fast"]),
        durationBand: z.enum(["under_15_seconds", "15_to_30_seconds", "31_to_60_seconds", "over_60_seconds", "unknown"]),
        structure: z.array(boundedNonEmptyText(600)).max(8),
        visualBeats: z.array(boundedNonEmptyText(600)).max(8),
        ctaPattern: z.enum(["book", "call", "message", "visit", "link", "comment", "none"]),
        candidateHooks: z.array(boundedNonEmptyText(600)).max(4),
        ownerTakeaway: boundedText(320).optional(),
        adaptationGuardrails: z.array(boundedNonEmptyText(600)).max(6),
        summary: boundedNonEmptyText(300),
    }).strict().optional(),
    expiresAt: z.unknown().optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const locationRecord = z.object({
    id: boundedId,
    workspaceId: boundedId,
    name: boundedText(240),
    locality: boundedText(240).optional(),
    status: z.enum(["active", "draft", "disabled"]),
    sourceRefs: z.array(boundedText(500)).max(40),
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const scheduleRecord = z.object({
    id: boundedId,
    workspaceId: boundedId,
    campaignId: boundedId,
    outputId: boundedId.optional(),
    channel,
    mode: z.literal("manual_task"),
    status: z.enum(["scheduled", "due", "completed", "failed", "cancelled"]),
    scheduledAt: requiredTimestamp,
    timezone: boundedText(120),
    note: boundedText(2000),
    taskType: z.enum(["post", "print", "staff_share", "follow_up", "result_check"]).optional(),
    assigneeLabel: boundedText(240).optional(),
    completionNote: boundedText(2000).optional(),
    completedAt: z.unknown().optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const sourceSnapshotRecord = z.object({
    id: z.literal("current"),
    workspaceId: boundedId,
    sourceType: z.enum(["menulist", "manual", "upload", "website", "google", "whatsapp", "meta"]),
    sourceHash: boundedText(160),
    sourceRefs: z.array(boundedText(500)).max(120),
    confidence: z.number().finite().min(0).max(1),
    freshness: z.enum(["fresh", "stale", "unknown"]),
    summary: boundedText(5000),
    facts: z.array(sourceFact).max(200),
    missingFacts: z.array(boundedText(1000)).max(100),
    verticalRisks: z.array(boundedText(1000)).max(100),
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const analyticsSummaryRecord = z.object({
    id: z.literal("dashboard"),
    workspaceId: boundedId,
    campaignCount: nonNegativeCount,
    usedCount: nonNegativeCount,
    exportCount: nonNegativeCount,
    approvalRequestCount: nonNegativeCount,
    manualFallbackCount: nonNegativeCount,
    ownerReportedOutcomeCount: nonNegativeCount,
    latestEventAt: z.unknown().optional(),
    confidence,
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const trustReportRecord = z.object({
    id: boundedId,
    workspaceId: boundedId,
    campaignId: boundedId,
    outputVersionId: boundedId,
    gate: z.enum(["clear", "warning", "needs_fix", "blocked"]),
    ruleVersion: boundedText(120),
    findings: z.array(z.object({
        id: boundedId,
        severity: z.enum(["info", "warning", "needs_fix", "blocked"]),
        ruleId: boundedId,
        message: boundedText(2000),
        recommendation: boundedText(2000),
        sourceReferences: z.array(boundedText(500)).max(80),
    }).strict()).max(200),
    createdAt: timestamp,
    updatedAt: timestamp,
}).strict();

const stripLegacyNullObjectFields = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripLegacyNullObjectFields);
    if (!value || typeof value !== "object") return value;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(
        Object.entries(value)
            .filter(([, nested]) => nested !== null)
            .map(([key, nested]) => [key, stripLegacyNullObjectFields(nested)]),
    );
};

const parseScoped = <T>(
    schema: z.ZodTypeAny,
    value: unknown,
    expected: { id?: string; workspaceId: string },
): T => {
    const parsed = schema.parse(stripLegacyNullObjectFields(value));
    if (
        parsed.workspaceId !== expected.workspaceId
        || (expected.id !== undefined && parsed.id !== expected.id)
    ) {
        throw new Error("CampaignCue persisted record scope is invalid.");
    }
    return parsed as T;
};

export const parseCampaignCueCampaignRecord = (
    value: unknown,
    expected: { campaignId?: string; workspaceId: string },
) => parseScoped<CampaignCueCampaign>(campaignRecord, value, {
    id: expected.campaignId,
    workspaceId: expected.workspaceId,
});

export const parseCampaignCueSourceInputRecord = (value: unknown, workspaceId: string) => (
    parseScoped<CampaignCueSourceInput>(sourceInputRecord, value, { workspaceId })
);

export const parseCampaignCueLocationRecord = (value: unknown, workspaceId: string) => (
    parseScoped<CampaignCueLocation>(locationRecord, value, { workspaceId })
);

export const parseCampaignCueScheduleRecord = (value: unknown, workspaceId: string) => (
    parseScoped<CampaignCueSchedule>(scheduleRecord, value, { workspaceId })
);

export const parseCampaignCueSourceSnapshotRecord = (value: unknown, workspaceId: string) => (
    parseScoped<CampaignCueSourceSnapshot>(sourceSnapshotRecord, value, { id: "current", workspaceId })
);

export const parseCampaignCueAnalyticsSummaryRecord = (value: unknown, workspaceId: string) => (
    parseScoped<CampaignCueAnalyticsSummary>(analyticsSummaryRecord, value, { id: "dashboard", workspaceId })
);

export const parseCampaignCueTrustReportRecord = (
    value: unknown,
    expected: { campaignId: string; trustReportId: string; workspaceId: string },
) => {
    const parsed = parseScoped<CampaignCueTrustReport>(trustReportRecord, value, {
        id: expected.trustReportId,
        workspaceId: expected.workspaceId,
    });
    if (parsed.campaignId !== expected.campaignId) {
        throw new Error("CampaignCue trust report campaign identity is invalid.");
    }
    return parsed;
};
