export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    getBoundedSignalDeskStringContext,
    getSignalDeskAccessLogContext,
    isSignalDeskMobileRequest,
    logSignalDeskFailure,
    logSignalDeskValidationFailure,
    parseSignalDeskJsonBody,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
    signalDeskPrivateJson,
    withSignalDeskPrivateHeaders,
} from "@lib/signaldesk/apiGuards";
import { recordSignalDeskMobileActionBlockedServer } from "@lib/signaldesk/server";
import { normalizeSignalDeskDocumentId } from "@lib/signaldesk/documentIdBoundary";
import {
    SignalDeskSourcePolicyCreateSchema,
    SignalDeskSourcePolicyRenewSchema,
} from "@lib/signaldesk/sourcePolicyContracts";
import { SignalDeskManualTargetImportSchema } from "@lib/signaldesk/targetContracts";
import {
    captureSignalDeskDemandSignalServer,
    captureSignalDeskReplyServer,
    createSignalDeskApprovalPacketServer,
    createSignalDeskContentAssetServer,
    createSignalDeskDailyGrowthMissionServer,
    createSignalDeskExperimentCardServer,
    prepareSignalDeskChannelHandoffServer,
    qualifySignalDeskRevenueAccountServer,
    createSignalDeskProviderEvaluationServer,
    createSignalDeskResearchAgentRunServer,
    createSignalDeskRouteTokenServer,
    createSignalDeskDraftServer,
    createSignalDeskEvidenceServer,
    createSignalDeskSourceQualitySnapshotServer,
    generateSignalDeskContentDistributionDraftsServer,
    createSignalDeskSequencerHandoffServer,
    createSignalDeskTrustPartnerBriefServer,
    createSignalDeskTrustPartnerNicheTestServer,
    createSignalDeskWeeklyStrategistMemoServer,
    createSignalDeskSourcePolicyServer,
    exportSignalDeskMessageServer,
    importSignalDeskTargetsServer,
    recommendSignalDeskMarketPodPlanServer,
    reviewSignalDeskMarketPodServer,
    recordSignalDeskTrustPartnerDeliverableServer,
    recordSignalDeskTrustPartnerMetricsServer,
    recordSignalDeskContentPerformanceServer,
    renewSignalDeskSourcePolicyServer,
    recordSignalDeskManualContactServer,
    refreshSignalDeskProviderSourceRetentionServer,
    recordSignalDeskOutcomeServer,
    revokeSignalDeskRouteTokenServer,
    refreshSignalDeskActivationWatchServer,
    runSignalDeskEnrichmentWaterfallServer,
    reviewSignalDeskExperimentCardServer,
    reviewSignalDeskGrowthMissionServer,
    reviewSignalDeskApprovalServer,
    reviewSignalDeskAiShadowRunServer,
    reviewSignalDeskContentAssetServer,
    reviewSignalDeskTrustPartnerDealServer,
    reviewSignalDeskTrustPartnerRenewalServer,
    runSignalDeskAiAssistServer,
    runSignalDeskAiVolumeBatchServer,
    runSignalDeskSourceProviderServer,
    scoreSignalDeskTargetServer,
    seedSignalDeskDefaultsServer,
    sendSignalDeskOwnedSequenceStepServer,
    sendSignalDeskApprovedMessageServer,
    reviewSignalDeskContentDistributionDraftServer,
    upsertSignalDeskAudienceSegmentServer,
    upsertSignalDeskBudgetPolicyServer,
    upsertSignalDeskChannelWindowStateServer,
    upsertSignalDeskConnectorSettingServer,
    upsertSignalDeskCommercialOfferServer,
    upsertSignalDeskCommercialOpportunityServer,
    scheduleSignalDeskContentDistributionDraftServer,
    upsertSignalDeskEnrichmentWaterfallServer,
    upsertSignalDeskModelRouteServer,
    upsertSignalDeskProviderAccountServer,
    upsertSignalDeskTeamMemberServer,
    upsertSignalDeskOfferCtaServer,
    upsertSignalDeskOperatingEnvelopeServer,
    upsertSignalDeskReplyPlaybookServer,
    upsertSignalDeskSelfServiceCtaServer,
    upsertSignalDeskSenderDomainServer,
    upsertSignalDeskContentSourceServer,
    upsertSignalDeskProofPermissionServer,
    upsertSignalDeskTrustPartnerProfileServer,
} from "@lib/signaldesk/workflowServer";
import type { SignalDeskPermission } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { z } from "zod";

// A bounded volume run can make up to 45 provider calls with per-pair dependencies
// across three concurrent workers. Keep the route finite while allowing the
// founder-approved batch to finish and persist its parent summary.
export const maxDuration = 300;

const ActionEnvelopeSchema = z.object({
    action: z.enum([
        "seed-defaults",
        "create-source-policy",
        "renew-source-policy",
        "import-targets",
        "score-target",
        "create-evidence",
        "create-draft",
        "review-approval",
        "export-message",
        "record-manual-contact",
        "capture-reply",
        "record-outcome",
        "create-route-token",
        "revoke-route-token",
        "capture-demand-signal",
        "run-source-provider",
        "run-ai-assist",
        "run-ai-volume-batch",
        "review-ai-shadow-run",
        "prepare-channel-handoff",
        "upsert-channel-window-state",
        "send-approved-message",
        "upsert-provider-account",
        "upsert-budget-policy",
        "upsert-connector-setting",
        "upsert-model-route",
        "upsert-enrichment-waterfall",
        "upsert-audience-segment",
        "recommend-market-pod-plan",
        "review-market-pod",
        "upsert-sender-domain",
        "upsert-self-service-cta",
        "create-daily-growth-mission",
        "review-growth-mission",
        "create-experiment-card",
        "review-experiment-card",
        "upsert-offer-cta",
        "qualify-revenue-account",
        "upsert-commercial-opportunity",
        "upsert-commercial-offer",
        "upsert-operating-envelope",
        "refresh-activation-watch",
        "upsert-reply-playbook",
        "create-source-quality-snapshot",
        "create-research-agent-run",
        "refresh-provider-source-retention",
        "create-weekly-strategist-memo",
        "create-provider-evaluation",
        "run-enrichment-waterfall",
        "create-approval-packet",
        "create-sequencer-handoff",
        "send-owned-sequence-step",
        "upsert-content-source",
        "upsert-proof-permission",
        "create-content-asset",
        "review-content-asset",
        "generate-content-distribution-drafts",
        "review-content-distribution-draft",
        "schedule-content-distribution-draft",
        "record-content-performance",
        "upsert-trust-partner-profile",
        "create-trust-partner-niche-test",
        "create-trust-partner-brief",
        "review-trust-partner-deal",
        "record-trust-partner-deliverable",
        "record-trust-partner-metrics",
        "review-trust-partner-renewal",
        "upsert-team-member",
    ]),
    payload: z.unknown().default({}),
});

const signalDeskDocumentIdSchema = (maxLength = 180, minLength = 3) => z.string()
    .min(minLength)
    .max(maxLength)
    .refine(
        (value) => normalizeSignalDeskDocumentId(value, maxLength) !== null,
        "Invalid document identity",
    );

const TargetSchema = z.object({
    targetId: signalDeskDocumentIdSchema(160),
});

const DraftSchema = z.object({
    targetId: signalDeskDocumentIdSchema(160),
    templateId: signalDeskDocumentIdSchema(160).optional(),
});

const ApprovalRejectionReasonSchema = z.enum([
    "evidence-weak-or-stale",
    "identity-uncertain",
    "no-customer-truth-gap",
    "contact-route-not-allowed",
    "already-solved",
    "wrong-segment",
    "duplicate",
    "other",
]);

const ReviewApprovalSchema = z.object({
    approvalId: signalDeskDocumentIdSchema(160),
    reason: z.string().trim().max(500).optional(),
    rejectionReason: ApprovalRejectionReasonSchema.optional(),
    status: z.enum(["approved", "rejected"]),
}).superRefine((value, context) => {
    if (value.status === "rejected" && !value.rejectionReason) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Rejection reason is required", path: ["rejectionReason"] });
    }
    if (value.status === "rejected" && value.rejectionReason === "other" && !value.reason?.trim()) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Rejection note is required", path: ["reason"] });
    }
});

const ExportMessageSchema = z.object({
    approvalId: signalDeskDocumentIdSchema(160),
});

const ManualContactSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    note: z.string().trim().max(300).optional(),
    occurredAt: z.string().datetime({ offset: true }),
    result: z.enum(["contacted", "no-answer", "wrong-contact", "requested-later", "declined", "introduced"]),
    route: z.enum(["email-export", "partner-intro"]),
    sourcePolicyId: signalDeskDocumentIdSchema(160),
    targetId: signalDeskDocumentIdSchema(160),
});

const CaptureReplySchema = z.object({
    conversationId: signalDeskDocumentIdSchema(200),
    idempotencyKey: z.string().trim().min(8).max(180),
    message: z.string().trim().min(1).max(4000),
}).strict();

const RecordOutcomeSchema = z.object({
    channel: z.enum(["email", "manual", "qr", "share", "claim"]),
    evidenceRef: z.string().trim().min(3).max(500),
    idempotencyKey: z.string().trim().min(8).max(180),
    outcomeType: z.enum(["route_created", "upload_started", "preview_prepared", "published", "two_surface_activation"]),
    ownerQualifiedAt: z.string().datetime({ offset: true }).optional(),
    ownerReviewedAt: z.string().datetime({ offset: true }).optional(),
    source: z.enum(["manual", "demand-signal"]),
    sourceEventId: signalDeskDocumentIdSchema(180).refine(
        (value) => /^demand_[a-f0-9]{32}$/.test(value),
        "Invalid demand source identity",
    ).optional(),
    surfaces: z.array(z.enum(["qr", "whatsapp", "google-profile", "instagram", "website", "print", "other"])).max(7).default([]),
    targetId: signalDeskDocumentIdSchema(160),
}).strict().superRefine((value, context) => {
    if (value.source === "demand-signal" && !value.sourceEventId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Demand source event is required", path: ["sourceEventId"] });
    }
    if (value.source === "manual" && value.sourceEventId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Manual outcomes cannot claim demand-source lineage", path: ["sourceEventId"] });
    }
    if (value.outcomeType === "two_surface_activation") {
        if (!value.ownerQualifiedAt || !value.ownerReviewedAt) context.addIssue({ code: z.ZodIssueCode.custom, message: "Owner review is required", path: ["ownerReviewedAt"] });
        if (new Set(value.surfaces).size < 2) context.addIssue({ code: z.ZodIssueCode.custom, message: "Two distinct surfaces are required", path: ["surfaces"] });
    }
});

const RouteTokenSchema = z.object({
    actionId: signalDeskDocumentIdSchema(160).optional(),
    channel: z.enum(["email", "manual", "qr", "share", "claim"]),
    ctaId: signalDeskDocumentIdSchema(180).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    targetId: signalDeskDocumentIdSchema(160),
    templateId: signalDeskDocumentIdSchema(160).optional(),
}).strict();

const RevokeRouteTokenSchema = z.object({
    reason: z.string().trim().min(3).max(500),
    routeTokenId: signalDeskDocumentIdSchema(180).refine(
        (value) => /^route_[a-f0-9]{32}$/.test(value),
        "Invalid route token identity",
    ),
});

const CaptureDemandSignalSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    signalType: z.enum(["qr_scan", "link_click", "share", "claim_attempt", "referral"]),
    sourceSurface: z.enum(["menu", "qr", "website", "manual", "other"]),
    targetId: signalDeskDocumentIdSchema(160).optional(),
    targetName: z.string().trim().max(180).optional(),
}).strict().superRefine((value, context) => {
    if (!value.targetId && value.targetName) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Target name requires target identity." });
    }
});

const SourceProviderRunSchema = z.object({
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    maxResults: z.number().int().min(1).max(30).default(10),
    provider: z.enum(["google-places", "foursquare", "apify", "fhrs-fhis"]),
    query: z.string().trim().min(3).max(180),
    sourcePolicyId: signalDeskDocumentIdSchema(160),
});

const AiAssistSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    instruction: z.string().trim().max(500).optional(),
    targetId: signalDeskDocumentIdSchema(160),
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit"]),
});

const AiVolumeBatchSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    instruction: z.string().trim().max(500).optional(),
    maxEstimatedCostUsd: z.number().min(0.01).max(5),
    targetIds: z.array(signalDeskDocumentIdSchema(160)).min(1).max(5)
        .refine((targetIds) => new Set(targetIds).size === targetIds.length, "Target IDs must be unique"),
    tasks: z.array(z.enum(["score", "evidence", "draft", "reply-classification"])).min(1).max(3)
        .refine((tasks) => new Set(tasks).size === tasks.length, "Tasks must be unique"),
});

const AiShadowReviewSchema = z.object({
    aiRunId: signalDeskDocumentIdSchema(180),
    decision: z.enum(["accepted", "edited", "rejected", "held"]),
    founderAttentionMinutes: z.number().int().min(0).max(1440),
    reason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
    if (value.decision !== "accepted" && !value.reason) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Reason is required for this decision",
            path: ["reason"],
        });
    }
});

const ChannelActionSchema = z.object({
    approvalId: signalDeskDocumentIdSchema(160),
    channel: z.enum(["email", "whatsapp", "instagram", "messenger"]),
});

const ProviderSendActionSchema = z.object({
    approvalId: signalDeskDocumentIdSchema(160),
    channel: z.literal("email"),
});

const ChannelWindowStateSchema = z.object({
    channel: z.enum(["whatsapp", "instagram", "messenger"]),
    expiresAt: z.string().trim().max(80).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    reason: z.string().trim().max(500).optional(),
    source: z.enum(["inbound", "opt-in", "ad-click", "template", "manual"]),
    status: z.enum(["open", "closed", "expired", "blocked", "needs-template"]),
    targetId: signalDeskDocumentIdSchema(160).optional(),
});

const ProviderIdSchema = z.enum([
    "google-places",
    "foursquare",
    "apify",
    "fhrs-fhis",
    "manual",
    "owned-email",
    "apollo",
    "hunter",
    "zerobounce",
    "firecrawl",
    "tavily",
    "exa",
    "postmark",
    "resend",
    "smartlead",
    "instantly",
    "lemlist",
    "gemini",
    "openai",
    "anthropic",
]);

const ProviderAccountSchema = z.object({
    credentialState: z.enum(["missing", "configured", "not_required"]),
    dailyBudgetUsd: z.number().min(0).max(10000),
    disabledReason: z.string().trim().max(500).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    monthlyBudgetUsd: z.number().min(0).max(100000),
    ownerApproved: z.boolean(),
    perRunBudgetUsd: z.number().min(0).max(1000),
    provider: ProviderIdSchema,
    status: z.enum(["approved", "blocked", "evaluation", "disabled"]),
    use: z.enum(["discovery", "enrichment", "verification", "research", "sender", "sequencer", "ai"]),
}).refine((value) => value.perRunBudgetUsd <= value.dailyBudgetUsd && value.dailyBudgetUsd <= value.monthlyBudgetUsd, {
    message: "Provider budgets must satisfy per-run <= daily <= monthly",
    path: ["perRunBudgetUsd"],
});

const BudgetPolicySchema = z.object({
    dailyBudgetUsd: z.number().min(0).max(10000),
    idempotencyKey: z.string().trim().min(8).max(180),
    monthlyBudgetUsd: z.number().min(0).max(100000),
    name: z.string().trim().min(2).max(120),
    perRunBudgetUsd: z.number().min(0).max(1000),
    provider: ProviderIdSchema.optional(),
    scope: z.enum(["global", "provider", "market-pod", "model-route", "sequencer", "trust-partner"]),
    scopeId: z.string().trim().max(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
}).refine((value) => value.perRunBudgetUsd <= value.dailyBudgetUsd && value.dailyBudgetUsd <= value.monthlyBudgetUsd, {
    message: "Policy budgets must satisfy per-run <= daily <= monthly",
    path: ["perRunBudgetUsd"],
});

const ModelRouteSchema = z.object({
    confidenceThreshold: z.enum(["high", "medium", "low"]),
    defaultModel: z.string().trim().min(2).max(120),
    defaultProvider: z.enum(["gemini", "openai", "anthropic"]),
    escalationModel: z.string().trim().max(120).optional(),
    escalationProvider: z.enum(["gemini", "openai", "anthropic"]).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    maxCostUsd: z.number().min(0).max(100),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit", "quality-critic"]),
}).refine((value) => Boolean(value.escalationProvider) === Boolean(value.escalationModel), {
    message: "Escalation provider and model must be supplied together",
    path: ["escalationProvider"],
});

const EnrichmentWaterfallSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    maxCostUsd: z.number().min(0).max(1000),
    maxCredits: z.number().int().min(1).max(50),
    name: z.string().trim().min(2).max(120),
    providerOrder: z.array(ProviderIdSchema).min(1).max(12),
    requestedField: z.enum(["email", "phone", "company", "website", "evidence"]),
    retentionDays: z.number().int().min(1).max(365),
    sourcePolicyId: signalDeskDocumentIdSchema(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    stopCondition: z.enum(["first-verified", "first-candidate", "manual-review"]),
    verificationRequired: z.boolean(),
}).superRefine((value, context) => {
    if (new Set(value.providerOrder).size !== value.providerOrder.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Provider order must not contain duplicates", path: ["providerOrder"] });
    }
    if (value.stopCondition === "first-verified" && !value.verificationRequired) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Verified stop condition requires verification", path: ["verificationRequired"] });
    }
});

const AudienceSegmentSchema = z.object({
    criteriaSummary: z.string().trim().min(2).max(500),
    idempotencyKey: z.string().trim().min(8).max(180),
    marketPodId: signalDeskDocumentIdSchema(160).optional(),
    name: z.string().trim().min(2).max(120),
    sourcePolicyId: signalDeskDocumentIdSchema(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    triggerType: z.enum(["demand-signal", "source-run", "outcome", "manual", "website-evidence"]),
});

const MarketPodRecommendationSchema = z.object({
    marketPodId: signalDeskDocumentIdSchema(160).optional(),
});

const MarketPodReviewSchema = z.object({
    decision: z.enum(["approved", "held", "rejected"]),
    idempotencyKey: z.string().trim().min(8).max(180),
    marketPodId: signalDeskDocumentIdSchema(160),
    reason: z.string().trim().min(3).max(500),
});

const ProviderSourceRetentionRefreshSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    notes: z.string().trim().max(500).optional(),
    providerSourceRetentionId: signalDeskDocumentIdSchema(180),
    status: z.enum(["refreshed", "refresh-due", "expired", "blocked"]),
});

const WeeklyStrategistMemoSchema = z.object({
    weekStart: z.string().trim().max(20).optional(),
});

const ProviderEvaluationSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    provider: ProviderIdSchema,
    use: z.enum(["discovery", "enrichment", "verification", "research", "sender", "sequencer", "ai"]),
});

const SenderDomainNameSchema = z.string().trim().min(3).max(253).superRefine((value, context) => {
    const domain = value.toLowerCase().replace(/\.$/, "");
    const labels = domain.split(".");
    if (
        labels.length < 2
        || !labels.every((label) => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
        || !/[a-z]/.test(labels[labels.length - 1] || "")
        || (labels[labels.length - 1]?.length || 0) < 2
    ) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid sender domain" });
    }
});

const SenderDomainSchema = z.object({
    authenticationState: z.enum(["missing", "partial", "ready"]),
    bounceRate: z.number().min(0).max(1),
    brandRisk: z.enum(["low", "medium", "high"]),
    complaintRate: z.number().min(0).max(1),
    domain: SenderDomainNameSchema,
    idempotencyKey: z.string().trim().min(8).max(180),
    provider: ProviderIdSchema.optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    unsubscribeReady: z.boolean(),
    volumeRampState: z.enum(["not_started", "low_volume", "paused", "ready"]),
});

const ConnectorSettingSchema = z.object({
    appId: z.string().trim().max(180).optional(),
    connectorKind: z.enum(["email-smtp", "meta-whatsapp", "meta-instagram", "meta-messenger", "smartlead", "apify"]),
    displayName: z.string().trim().min(2).max(120),
    fromName: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    instagramPageId: z.string().trim().max(180).optional(),
    messengerPageId: z.string().trim().max(180).optional(),
    notes: z.string().trim().max(500).optional(),
    phoneNumber: z.string().trim().max(40).optional(),
    phoneNumberId: z.string().trim().max(180).optional(),
    replyToEmail: z.string().trim().email().max(180).optional(),
    senderDomain: z.string().trim().max(180).optional(),
    senderEmail: z.string().trim().email().max(180).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const SelfServiceCtaSchema = z.object({
    copy: z.string().trim().min(2).max(500),
    ctaType: z.enum(["preview", "route-draft", "menu-health", "qr-public-menu", "claim-start", "two-surface-proof"]),
    idempotencyKey: z.string().trim().min(8).max(180),
    label: z.string().trim().min(2).max(80),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const GrowthMissionDaySchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid calendar day");

const DailyGrowthMissionSchema = z.object({
    day: GrowthMissionDaySchema.optional(),
    marketPodId: signalDeskDocumentIdSchema(160, 1).optional(),
});

const GrowthMissionReviewSchema = z.object({
    growthMissionId: signalDeskDocumentIdSchema(180).refine(
        (value) => /^growth_mission_\d{4}-\d{2}-\d{2}$/.test(value),
        "Invalid growth mission identity",
    ),
    ownerDecision: z.enum(["approved", "hold", "redirected", "completed"]),
    ownerDecisionNote: z.string().trim().max(800).optional(),
    status: z.enum(["draft", "ready", "approved", "held", "completed"]).optional(),
}).superRefine((value, context) => {
    const day = value.growthMissionId.slice("growth_mission_".length);
    const parsedDay = GrowthMissionDaySchema.safeParse(day);
    if (!parsedDay.success) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid mission day", path: ["growthMissionId"] });
    }
    const requiredStatus = value.ownerDecision === "approved"
        ? "approved"
        : value.ownerDecision === "hold"
            ? "held"
            : value.ownerDecision === "completed"
                ? "completed"
                : "ready";
    if (value.status && value.status !== requiredStatus) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Mission status conflicts with owner decision", path: ["status"] });
    }
});

const ExperimentReadbackWindowSchema = z.object({
    endAt: z.string().datetime({ offset: true }),
    startAt: z.string().datetime({ offset: true }),
}).strict();

const ExperimentReadbackPlanSchema = z.object({
    baselineWindow: ExperimentReadbackWindowSchema,
    candidateWindow: ExperimentReadbackWindowSchema,
    confounders: z.array(z.string().trim().min(2).max(240)).max(8).refine((items) => new Set(items).size === items.length, "Confounders must be unique"),
    nextReadbackAt: z.string().datetime({ offset: true }),
    primaryMetric: z.string().trim().min(2).max(160),
}).strict().superRefine((value, context) => {
    const baselineStart = Date.parse(value.baselineWindow.startAt);
    const baselineEnd = Date.parse(value.baselineWindow.endAt);
    const candidateStart = Date.parse(value.candidateWindow.startAt);
    const candidateEnd = Date.parse(value.candidateWindow.endAt);
    const nextReadback = Date.parse(value.nextReadbackAt);
    if (baselineStart >= baselineEnd) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Baseline window must end after it starts", path: ["baselineWindow", "endAt"] });
    }
    if (baselineEnd > candidateStart) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Baseline and candidate windows cannot overlap", path: ["candidateWindow", "startAt"] });
    }
    if (candidateStart >= candidateEnd) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Candidate window must end after it starts", path: ["candidateWindow", "endAt"] });
    }
    if (candidateEnd > nextReadback) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Next readback cannot precede the candidate window end", path: ["nextReadbackAt"] });
    }
});

const ExperimentCardSchema = z.object({
    channel: z.enum(["email", "manual", "content", "partner", "referral", "other"]),
    contentAssetId: z.string().refine((value) => normalizeSignalDeskDocumentId(value) !== null).optional(),
    ctaId: z.string().refine((value) => normalizeSignalDeskDocumentId(value) !== null).optional(),
    expectedOutcome: z.string().trim().min(2).max(240),
    hypothesis: z.string().trim().min(5).max(500),
    marketPodId: z.string().refine((value) => normalizeSignalDeskDocumentId(value, 160) !== null).optional(),
    proofAssetSummary: z.string().trim().max(500).optional(),
    readbackPlan: ExperimentReadbackPlanSchema,
    sourcePolicyId: z.string().refine((value) => normalizeSignalDeskDocumentId(value) !== null).optional(),
    status: z.enum(["planned", "active", "paused", "completed", "stopped"]).optional(),
    stopRule: z.string().trim().min(5).max(500),
    targetCount: z.number().int().min(1).max(500),
});

const ExperimentReviewSchema = z.object({
    experimentCardId: z.string().refine((value) => {
        const normalized = normalizeSignalDeskDocumentId(value);
        return normalized !== null && normalized.length >= 3;
    }),
    ownerDecision: z.enum(["repeat", "narrow", "stop", "hold", "complete"]),
    resultSummary: z.string().trim().min(2).max(1000),
    status: z.enum(["planned", "active", "paused", "completed", "stopped"]).optional(),
});

const OfferCtaSchema = z.object({
    activationSurface: z.enum(["claim", "upload", "preview", "qr", "whatsapp", "google-profile", "manual"]),
    approvedAsk: z.string().trim().min(5).max(500),
    blockedClaims: z.array(z.string().trim().min(2).max(180)).max(10).default([]),
    ctaId: z.string().refine((value) => normalizeSignalDeskDocumentId(value) !== null).optional(),
    marketPodId: z.string().refine((value) => normalizeSignalDeskDocumentId(value, 160) !== null).optional(),
    offerCtaId: z.string().refine((value) => normalizeSignalDeskDocumentId(value) !== null).optional(),
    proofMatchRule: z.string().trim().min(5).max(500),
    segment: z.enum(["restaurant-owner", "agency-partner", "trust-partner", "local-operator", "general"]),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    title: z.string().trim().min(2).max(160),
});

const ReplyPlaybookSchema = z.object({
    approvedReply: z.string().trim().min(5).max(1000),
    escalationRequired: z.boolean(),
    intent: z.enum(["send-details", "pricing", "who-are-you", "not-now", "wrong-person", "stop", "call-me", "interested", "other"]),
    nextRoute: z.enum(["self-serve-preview", "manual-reply", "suppress", "schedule-follow-up", "founder-review"]),
    playbookId: signalDeskDocumentIdSchema(180).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    suppressionRequired: z.boolean(),
    title: z.string().trim().min(2).max(160),
}).superRefine((value, context) => {
    const suppressionOnly = value.suppressionRequired && value.nextRoute === "suppress";
    if ((value.intent === "stop") !== suppressionOnly) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Stop playbooks must use the suppression route",
            path: ["nextRoute"],
        });
    }
});

const RevenueAccountQualificationSchema = z.object({
    locationType: z.enum(["single-location", "headquarters", "branch"]),
    organizationName: z.string().trim().max(160).optional(),
    targetId: signalDeskDocumentIdSchema(180),
});

const CommercialOpportunitySchema = z.object({
    commercialOfferId: signalDeskDocumentIdSchema(180).optional(),
    expectedCloseAt: z.string().datetime().optional(),
    founderAttentionMinutes: z.number().int().min(0).max(100000),
    nextAction: z.string().trim().min(3).max(500),
    nextActionDueAt: z.string().datetime().optional(),
    opportunityId: signalDeskDocumentIdSchema(180),
    probabilityPercent: z.number().int().min(0).max(100),
    stage: z.enum(["qualified", "discovery", "offer", "decision", "lost", "nurture"]),
    stalledReason: z.string().trim().max(500).optional(),
    status: z.enum(["open", "lost", "nurture"]),
    valueMinor: z.number().int().min(0).max(1000000000),
    winLossReason: z.string().trim().max(500).optional(),
});

const CommercialOfferSchema = z.object({
    allowedDiscountBps: z.number().int().min(0).max(10000),
    billingCadence: z.enum(["one-time", "monthly", "annual"]),
    commercialOfferId: signalDeskDocumentIdSchema(180).optional(),
    contents: z.array(z.string().trim().min(1).max(240)).min(1).max(30),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/),
    eligibilitySummary: z.string().trim().min(3).max(1000),
    founderApprovalConditions: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
    name: z.string().trim().min(2).max(160),
    offerCtaId: signalDeskDocumentIdSchema(180).optional(),
    priceMinor: z.number().int().min(0).max(1000000000),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    version: z.number().int().min(1).max(10000),
}).superRefine((value, context) => {
    for (const field of ["contents", "founderApprovalConditions"] as const) {
        if (new Set(value[field]).size !== value[field].length) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${field} must not contain duplicates`,
                path: [field],
            });
        }
    }
});

const OperatingEnvelopeSchema = z.object({
    budgetPolicyId: signalDeskDocumentIdSchema(180).optional(),
    channel: z.enum(["email", "manual", "content", "partner", "referral"]),
    commercialOfferId: signalDeskDocumentIdSchema(180),
    dailyVolumeCap: z.number().int().min(1).max(500),
    expiresAt: z.string().datetime(),
    fallbackAction: z.enum(["hold", "pause", "founder-review"]),
    marketPodId: signalDeskDocumentIdSchema(180),
    maxCostUsd: z.number().min(0).max(1000000),
    name: z.string().trim().min(2).max(160),
    operatingEnvelopeId: signalDeskDocumentIdSchema(180).optional(),
    requestedApprovalMode: z.enum(["manual", "recommendation-only", "prepare-and-approve-each", "approve-batch", "approve-sample", "exception-only"]),
    senderDomainId: signalDeskDocumentIdSchema(180).optional(),
    sourcePolicyIds: z.array(signalDeskDocumentIdSchema(160)).min(1).max(10),
    startsAt: z.string().datetime(),
    status: z.enum(["draft", "shadow", "approved", "held", "paused", "expired"]),
    stopConditions: z.array(z.string().trim().min(3).max(300)).min(1).max(20),
    templateIds: z.array(signalDeskDocumentIdSchema(160)).min(1).max(10),
    totalVolumeCap: z.number().int().min(1).max(5000),
    version: z.number().int().min(1).max(10000),
}).superRefine((value, context) => {
    for (const field of ["sourcePolicyIds", "stopConditions", "templateIds"] as const) {
        if (new Set(value[field]).size !== value[field].length) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${field} must not contain duplicates`,
                path: [field],
            });
        }
    }
});

const ActivationWatchSchema = z.object({
    targetId: signalDeskDocumentIdSchema(180),
});

const SourceQualitySnapshotSchema = z.object({
    sourcePolicyId: signalDeskDocumentIdSchema(160).optional(),
    sourceRunId: signalDeskDocumentIdSchema(160).optional(),
});

const ResearchAgentRunSchema = z.object({
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    marketPodId: signalDeskDocumentIdSchema(180).optional(),
    maxResults: z.number().int().min(1).max(30).default(10),
    prompt: z.string().trim().min(5).max(600),
    provider: z.enum(["google-places", "apify", "fhrs-fhis"]).optional(),
    researchType: z.enum(["business-prospect", "market-map", "partner-list"]).default("business-prospect"),
    sourcePolicyId: signalDeskDocumentIdSchema(180),
});

const RunWaterfallSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    targetId: signalDeskDocumentIdSchema(160),
    waterfallId: signalDeskDocumentIdSchema(160),
});

const ApprovalPacketSchema = z.object({
    approvalId: signalDeskDocumentIdSchema(160).optional(),
    targetId: signalDeskDocumentIdSchema(160).optional(),
}).refine((value) => Boolean(value.approvalId) !== Boolean(value.targetId), {
    message: "Exactly one approval or target is required",
});

const SequencerHandoffSchema = z.object({
    approvalId: signalDeskDocumentIdSchema(160),
    provider: z.enum(["owned-email", "smartlead", "instantly", "lemlist"]),
    senderDomainId: signalDeskDocumentIdSchema(160).optional(),
});

const OwnedSequenceStepSchema = z.object({
    sequencerHandoffId: signalDeskDocumentIdSchema(180),
});

const ContentAudienceSchema = z.enum(["restaurant-owner", "agency-partner", "trust-partner", "local-operator", "general"]);

const ContentSourceTypeSchema = z.enum(["manual", "blog", "changelog", "proof-page", "demo", "case-note", "customer-story", "youtube", "podcast", "other"]);

const ContentChannelSchema = z.enum(["linkedin", "x", "email", "newsletter", "partner-brief", "blog", "short-video", "other"]);

const ProofPermissionScopeSchema = z.enum([
    "internal-learning",
    "anonymous-aggregate",
    "business-name",
    "logo",
    "quotation",
    "before-after-screenshots",
    "public-case-study",
    "partner-material",
]);

const PublicProofScopeSchema = z.enum([
    "business-name",
    "logo",
    "quotation",
    "before-after-screenshots",
    "public-case-study",
    "partner-material",
]);

const ContentHttpUrlSchema = z.string().trim().url().max(500).superRefine((value, context) => {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "URL must be a valid HTTP(S) URL" });
        return;
    }
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "URL must use HTTP(S) without credentials" });
    }
});

const ContentSourceSchema = z.object({
    contentSourceId: z.string().refine((value) => normalizeSignalDeskDocumentId(value) !== null).optional(),
    defaultAudience: ContentAudienceSchema,
    defaultMarketPodId: z.string().refine((value) => normalizeSignalDeskDocumentId(value, 160) !== null).nullable().optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    sourceType: ContentSourceTypeSchema,
    sourceUrl: ContentHttpUrlSchema.optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    title: z.string().trim().min(2).max(160),
});

const ContentAssetSchema = z.object({
    canonicalMessage: z.string().trim().min(10).max(2000),
    contentAssetId: signalDeskDocumentIdSchema(180).optional(),
    ctaId: signalDeskDocumentIdSchema(160).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    marketPodId: signalDeskDocumentIdSchema(160).optional(),
    primaryAudience: ContentAudienceSchema,
    proofLevel: z.enum(["owned", "customer-proof", "market-research", "internal-note"]),
    proofPermissionId: signalDeskDocumentIdSchema(180).optional(),
    proofScopes: z.array(PublicProofScopeSchema).max(6).default([]),
    riskNotes: z.array(z.string().trim().max(240)).max(6).default([]),
    sourceId: signalDeskDocumentIdSchema(180).optional(),
    sourceNotes: z.string().trim().max(800).optional(),
    sourceType: ContentSourceTypeSchema,
    sourceUrl: ContentHttpUrlSchema.optional(),
    status: z.enum(["draft", "ready", "distributed", "hold", "archived"]).optional(),
    title: z.string().trim().min(2).max(180),
}).superRefine((value, context) => {
    if (value.proofLevel === "customer-proof" && !value.proofPermissionId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Proof permission is required", path: ["proofPermissionId"] });
    }
    if (value.proofLevel === "customer-proof" && value.proofScopes.length === 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "At least one public proof scope is required", path: ["proofScopes"] });
    }
    if (value.proofLevel !== "customer-proof" && value.proofPermissionId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Proof permission is only valid for customer proof", path: ["proofPermissionId"] });
    }
    if (value.proofLevel !== "customer-proof" && value.proofScopes.length > 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Proof scopes are only valid for customer proof", path: ["proofScopes"] });
    }
});

const ContentAssetReviewSchema = z.object({
    contentAssetId: signalDeskDocumentIdSchema(180),
    idempotencyKey: z.string().trim().min(8).max(180),
    reason: z.string().trim().min(3).max(500),
    status: z.enum(["ready", "hold", "archived"]),
});

const ProofPermissionSchema = z.object({
    evidenceRef: z.string().trim().min(3).max(500),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    grantedAt: z.string().datetime({ offset: true }).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    notes: z.string().trim().max(500).optional(),
    proofPermissionId: signalDeskDocumentIdSchema(180).optional(),
    scopes: z.array(ProofPermissionScopeSchema).min(1).max(8),
    status: z.enum(["active", "hold", "revoked", "expired"]),
    targetId: signalDeskDocumentIdSchema(160),
});

const ContentDistributionDraftSchema = z.object({
    channels: z.array(ContentChannelSchema).min(1).max(8),
    contentAssetId: signalDeskDocumentIdSchema(180),
    idempotencyKey: z.string().trim().min(8).max(180),
});

const ContentDraftReviewSchema = z.object({
    approvalStatus: z.enum(["approved", "rejected", "hold"]),
    contentDraftId: signalDeskDocumentIdSchema(180),
    idempotencyKey: z.string().trim().min(8).max(180),
    reviewReason: z.string().trim().max(500).optional(),
});

const ContentDraftScheduleSchema = z.object({
    contentDraftId: signalDeskDocumentIdSchema(180),
    idempotencyKey: z.string().trim().min(8).max(180),
    // Historical claims may contain a pre-hardening string; the server validates
    // new writes only after durable replay has been checked.
    scheduledFor: z.string().trim().max(80).optional(),
    status: z.enum(["queued", "approved", "hold"]).optional(),
});

const ContentPerformanceSchema = z.object({
    activations: z.number().int().min(0).max(100000),
    channel: ContentChannelSchema,
    clicks: z.number().int().min(0).max(100000000),
    contentAssetId: signalDeskDocumentIdSchema(180),
    contentDraftId: signalDeskDocumentIdSchema(180).optional(),
    currentListSubmissions: z.number().int().min(0).max(100000),
    engagementQuality: z.enum(["high", "medium", "low"]),
    idempotencyKey: z.string().trim().min(8).max(180),
    ownerLeads: z.number().int().min(0).max(100000),
    publicationUrl: ContentHttpUrlSchema.optional(),
    publishedAt: z.string().datetime({ offset: true }).optional(),
    views: z.number().int().min(0).max(100000000),
});

const TrustPartnerProfileSchema = z.object({
    audienceFitScore: z.number().int().min(0).max(100),
    baselineReachScore: z.number().int().min(0).max(100),
    believableUsageScore: z.number().int().min(0).max(100),
    channel: z.enum(["instagram", "youtube", "tiktok", "linkedin", "newsletter", "community", "offline", "other"]),
    commentQualityScore: z.number().int().min(0).max(100),
    displayName: z.string().trim().min(2).max(160),
    geography: z.string().trim().max(160).optional(),
    idempotencyKey: z.string().trim().min(8).max(180).optional(),
    partnerType: z.enum(["restaurant-consultant", "menu-photographer", "local-business-creator", "agency-freelancer", "pos-payment-partner", "operator-advocate", "generic-creator"]),
    sourceNotes: z.string().trim().min(2).max(800),
    status: z.enum(["candidate", "approved", "hold", "rejected", "active"]).optional(),
    trustFeelScore: z.number().int().min(0).max(100),
});

const TrustPartnerNicheTestSchema = z.object({
    angle: z.string().trim().min(2).max(240),
    intendedAttempts: z.number().int().min(1).max(5),
    idempotencyKey: z.string().trim().min(8).max(180).optional(),
    marketPodId: signalDeskDocumentIdSchema(160).optional(),
    nicheName: z.string().trim().min(2).max(160),
    partnerIds: z.array(signalDeskDocumentIdSchema(180)).max(5).default([]),
});

const TrustPartnerBriefSchema = z.object({
    approvedClaims: z.array(z.string().trim().min(2).max(240)).min(1).max(8),
    bannedClaims: z.array(z.string().trim().min(2).max(240)).min(1).max(8),
    ctaId: signalDeskDocumentIdSchema(160).optional(),
    dealId: signalDeskDocumentIdSchema(180).optional(),
    disclosureText: z.string().trim().min(5).max(500),
    onePageBrief: z.string().trim().min(20).max(2000),
    partnerId: signalDeskDocumentIdSchema(180),
});

const TrustPartnerDealSchema = z.object({
    approvalStatus: z.enum(["approved", "rejected", "blocked"]),
    budgetPolicyId: signalDeskDocumentIdSchema(180).optional(),
    deliverableCount: z.number().int().min(1).max(10),
    dueDate: z.string().trim().max(80).optional(),
    flatFeeUsd: z.number().min(0).max(100000),
    founderApproved: z.boolean(),
    nicheTestId: signalDeskDocumentIdSchema(180).optional(),
    partnerId: signalDeskDocumentIdSchema(180),
    pricingModel: z.enum(["flat-fee", "per-view", "barter"]),
});

const TrustPartnerDeliverableSchema = z.object({
    dealId: signalDeskDocumentIdSchema(180).optional(),
    disclosurePresent: z.boolean(),
    dueDate: z.string().trim().max(80).optional(),
    idempotencyKey: z.string().trim().min(8).max(180).optional(),
    partnerId: signalDeskDocumentIdSchema(180),
    postUrl: ContentHttpUrlSchema.optional(),
    reviewState: z.enum(["pending", "approved", "risk", "rejected"]),
    status: z.enum(["scheduled", "submitted", "live", "missed", "paused"]),
});

const TrustPartnerMetricsSchema = z.object({
    activations: z.number().int().min(0).max(100000),
    commentQuality: z.enum(["high", "medium", "low"]),
    comments: z.number().int().min(0).max(100000000),
    currentListSubmissions: z.number().int().min(0).max(100000),
    deliverableId: signalDeskDocumentIdSchema(180).optional(),
    idempotencyKey: z.string().trim().min(8).max(180),
    ownerLeads: z.number().int().min(0).max(100000),
    partnerId: signalDeskDocumentIdSchema(180),
    views: z.number().int().min(0).max(100000000),
});

const TrustPartnerRenewalSchema = z.object({
    evidenceSummary: z.string().trim().min(5).max(1000),
    idempotencyKey: z.string().trim().min(8).max(180).optional(),
    nicheTestId: signalDeskDocumentIdSchema(180).optional(),
    ownerDecision: z.enum(["approved", "rejected", "pending"]).optional(),
    partnerId: signalDeskDocumentIdSchema(180),
    recommendation: z.enum(["renew", "hold", "cut", "retest"]),
});

const TeamMemberSchema = z.object({
    active: z.boolean(),
    email: z.string().trim().email().max(180),
    name: z.string().trim().max(120).optional(),
    role: z.enum(["founder-admin", "growth-manager", "operator", "compliance-reviewer", "readonly-analyst"]),
    teamMemberId: signalDeskDocumentIdSchema(180).optional(),
    userId: signalDeskDocumentIdSchema(180).optional(),
});

const permissionForAction = (action: z.infer<typeof ActionEnvelopeSchema>["action"]): SignalDeskPermission => {
    if (action === "seed-defaults") return "signaldesk.configure";
    if (action === "create-source-policy") return "signaldesk.configure";
    if (action === "renew-source-policy") return "signaldesk.configure";
    if (action === "import-targets") return "target.review";
    if (action === "score-target") return "target.review";
    if (action === "create-evidence") return "target.review";
    if (action === "create-draft") return "draft.create";
    if (action === "review-approval") return "draft.approve";
    if (action === "export-message") return "message.export";
    if (action === "record-manual-contact") return "target.review";
    if (action === "capture-reply") return "target.review";
    if (action === "record-outcome") return "target.review";
    if (action === "create-route-token") return "target.review";
    if (action === "revoke-route-token") return "signaldesk.configure";
    if (action === "run-source-provider") return "source.configure";
    if (action === "run-ai-assist") return "target.review";
    if (action === "run-ai-volume-batch") return "signaldesk.configure";
    if (action === "review-ai-shadow-run") return "signaldesk.configure";
    if (action === "prepare-channel-handoff") return "message.export";
    if (action === "upsert-channel-window-state") return "channel.configure";
    if (action === "send-approved-message") return "message.send";
    if (action === "upsert-provider-account") return "signaldesk.configure";
    if (action === "upsert-budget-policy") return "signaldesk.configure";
    if (action === "upsert-connector-setting") return "channel.configure";
    if (action === "upsert-model-route") return "signaldesk.configure";
    if (action === "upsert-enrichment-waterfall") return "source.configure";
    if (action === "upsert-audience-segment") return "source.configure";
    if (action === "recommend-market-pod-plan") return "source.configure";
    if (action === "review-market-pod") return "signaldesk.configure";
    if (action === "upsert-sender-domain") return "channel.configure";
    if (action === "upsert-self-service-cta") return "signaldesk.configure";
    if (action === "create-daily-growth-mission") return "target.review";
    if (action === "review-growth-mission") return "target.review";
    if (action === "create-experiment-card") return "target.review";
    if (action === "review-experiment-card") return "target.review";
    if (action === "upsert-offer-cta") return "signaldesk.configure";
    if (action === "qualify-revenue-account") return "target.review";
    if (action === "upsert-commercial-opportunity") return "target.review";
    if (action === "upsert-commercial-offer") return "signaldesk.configure";
    if (action === "upsert-operating-envelope") return "signaldesk.configure";
    if (action === "refresh-activation-watch") return "target.review";
    if (action === "upsert-reply-playbook") return "draft.create";
    if (action === "create-source-quality-snapshot") return "source.configure";
    if (action === "create-research-agent-run") return "source.configure";
    if (action === "refresh-provider-source-retention") return "source.configure";
    if (action === "create-weekly-strategist-memo") return "target.review";
    if (action === "create-provider-evaluation") return "signaldesk.configure";
    if (action === "run-enrichment-waterfall") return "target.review";
    if (action === "create-approval-packet") return "target.review";
    if (action === "create-sequencer-handoff") return "message.export";
    if (action === "send-owned-sequence-step") return "message.send";
    if (action === "upsert-content-source") return "source.configure";
    if (action === "upsert-proof-permission") return "signaldesk.configure";
    if (action === "create-content-asset") return "draft.create";
    if (action === "review-content-asset") return "draft.approve";
    if (action === "generate-content-distribution-drafts") return "draft.create";
    if (action === "review-content-distribution-draft") return "draft.approve";
    if (action === "schedule-content-distribution-draft") return "draft.approve";
    if (action === "record-content-performance") return "target.review";
    if (action === "upsert-trust-partner-profile") return "source.configure";
    if (action === "create-trust-partner-niche-test") return "policy.approve";
    if (action === "create-trust-partner-brief") return "draft.create";
    if (action === "review-trust-partner-deal") return "signaldesk.configure";
    if (action === "record-trust-partner-deliverable") return "source.configure";
    if (action === "record-trust-partner-metrics") return "source.configure";
    if (action === "review-trust-partner-renewal") return "policy.approve";
    if (action === "upsert-team-member") return "signaldesk.configure";
    return "target.review";
};

type SignalDeskMobileActionClass =
    | "approve"
    | "configure"
    | "emergency_pause"
    | "export"
    | "mutate_policy"
    | "provider_run"
    | "read"
    | "reveal_pii"
    | "schedule"
    | "send"
    | "spend";

const SIGNALDESK_MOBILE_ACTION_CLASS: Record<z.infer<typeof ActionEnvelopeSchema>["action"], SignalDeskMobileActionClass> = {
    "capture-demand-signal": "configure",
    "capture-reply": "configure",
    "create-approval-packet": "approve",
    "create-content-asset": "configure",
    "review-content-asset": "approve",
    "create-daily-growth-mission": "configure",
    "create-draft": "approve",
    "create-evidence": "configure",
    "create-experiment-card": "configure",
    "create-provider-evaluation": "provider_run",
    "create-research-agent-run": "provider_run",
    "create-sequencer-handoff": "export",
    "create-source-policy": "mutate_policy",
    "renew-source-policy": "mutate_policy",
    "create-source-quality-snapshot": "configure",
    "create-trust-partner-brief": "configure",
    "create-trust-partner-niche-test": "configure",
    "create-weekly-strategist-memo": "provider_run",
    "export-message": "export",
    "generate-content-distribution-drafts": "configure",
    "import-targets": "configure",
    "prepare-channel-handoff": "export",
    "record-manual-contact": "configure",
    "recommend-market-pod-plan": "configure",
    "review-market-pod": "approve",
    "review-ai-shadow-run": "approve",
    "record-content-performance": "configure",
    "record-outcome": "configure",
    "create-route-token": "configure",
    "revoke-route-token": "mutate_policy",
    "refresh-activation-watch": "configure",
    "record-trust-partner-deliverable": "configure",
    "record-trust-partner-metrics": "configure",
    "refresh-provider-source-retention": "provider_run",
    "review-approval": "approve",
    "review-content-distribution-draft": "approve",
    "review-experiment-card": "approve",
    "review-growth-mission": "approve",
    "review-trust-partner-deal": "spend",
    "review-trust-partner-renewal": "spend",
    "run-ai-assist": "provider_run",
    "run-ai-volume-batch": "provider_run",
    "run-enrichment-waterfall": "provider_run",
    "run-source-provider": "provider_run",
    "schedule-content-distribution-draft": "schedule",
    "score-target": "configure",
    "seed-defaults": "configure",
    "send-approved-message": "send",
    "send-owned-sequence-step": "send",
    "upsert-audience-segment": "configure",
    "upsert-budget-policy": "spend",
    "upsert-channel-window-state": "configure",
    "upsert-connector-setting": "configure",
    "upsert-content-source": "configure",
    "upsert-proof-permission": "mutate_policy",
    "upsert-enrichment-waterfall": "provider_run",
    "upsert-model-route": "provider_run",
    "upsert-offer-cta": "configure",
    "qualify-revenue-account": "configure",
    "upsert-commercial-opportunity": "configure",
    "upsert-commercial-offer": "mutate_policy",
    "upsert-operating-envelope": "mutate_policy",
    "upsert-provider-account": "configure",
    "upsert-reply-playbook": "configure",
    "upsert-self-service-cta": "configure",
    "upsert-sender-domain": "configure",
    "upsert-team-member": "configure",
    "upsert-trust-partner-profile": "configure",
};

const SAFE_ACTION_ERRORS = new Set([
    "AUDIENCE_SEGMENT_IDEMPOTENCY_CONFLICT",
    "AUDIENCE_SEGMENT_IDEMPOTENCY_KEY_REQUIRED",
    "AUDIENCE_SEGMENT_MARKET_POD_INVALID",
    "AUDIENCE_SEGMENT_MARKET_POD_NOT_FOUND",
    "AUDIENCE_SEGMENT_REPLAY_MISSING",
    "AUDIENCE_SEGMENT_SOURCE_POLICY_INVALID",
    "AUDIENCE_SEGMENT_SOURCE_POLICY_NOT_FOUND",
    "ENRICHMENT_WATERFALL_CONFIG_IDEMPOTENCY_CONFLICT",
    "ENRICHMENT_WATERFALL_CONFIG_IDEMPOTENCY_KEY_REQUIRED",
    "ENRICHMENT_WATERFALL_CONFIG_REPLAY_MISSING",
    "ENRICHMENT_WATERFALL_CONFIG_SHAPE_INVALID",
    "ENRICHMENT_WATERFALL_CONFIG_SOURCE_POLICY_INVALID",
    "ENRICHMENT_WATERFALL_CONFIG_SOURCE_POLICY_NOT_FOUND",
    "MODEL_ROUTE_IDEMPOTENCY_CONFLICT",
    "MODEL_ROUTE_IDEMPOTENCY_KEY_REQUIRED",
    "MODEL_ROUTE_CURRENT_SHAPE_INVALID",
    "MODEL_ROUTE_REPLAY_MISSING",
    "MODEL_ROUTE_SHAPE_INVALID",
    "PROVIDER_ACCOUNT_IDEMPOTENCY_CONFLICT",
    "PROVIDER_ACCOUNT_IDEMPOTENCY_KEY_REQUIRED",
    "PROVIDER_ACCOUNT_REPLAY_MISSING",
    "BUDGET_POLICY_IDEMPOTENCY_CONFLICT",
    "BUDGET_POLICY_IDEMPOTENCY_KEY_REQUIRED",
    "BUDGET_POLICY_REPLAY_MISSING",
    "CONNECTOR_SETTING_CURRENT_SHAPE_INVALID",
    "CONNECTOR_SETTING_IDEMPOTENCY_CONFLICT",
    "CONNECTOR_SETTING_IDEMPOTENCY_KEY_REQUIRED",
    "CONNECTOR_SETTING_REPLAY_MISSING",
    "CONNECTOR_SETTING_SHAPE_INVALID",
    "Active source policy is required",
    "Active template is required",
    "Assisted handoff requires an approval for the selected channel",
    "Approval is not pending",
    "Approval must be approved before export",
    "Approval not found",
    "Approval rejection note is required for other",
    "Approval rejection reason is required",
    "Contact use is not approved for this target",
    "Draft is required before export",
    "Draft must be approved before export",
    "Draft personalization is not approved for this target",
    "Draft has unsupported claims",
    "DRAFT_EVIDENCE_LINEAGE_STALE",
    "DRAFT_TEMPLATE_AUTHORITY_STALE",
    "DRAFT_TEMPLATE_CHANNEL_INVALID",
    "DRAFT_TEMPLATE_VARIABLE_INVALID",
    "DRAFT_UNSUPPORTED_CLAIMS",
    "Evidence packet is required before draft",
    "Evidence use is not approved for this source policy",
    "Evidence use is not approved for this target",
    "Channel provider is not configured",
    "Channel recipient is not configured",
    "Channel window is not ready",
    "Content asset is not ready",
    "Content asset not found",
    "Content distribution is paused",
    "Content draft must be approved before scheduling",
    "Content draft not found",
    "Content Distribution Rail is disabled",
    "Content CTA is not active",
    "Content CTA not found",
    "Content URL must be a valid credential-free HTTP(S) URL",
    "Content source is not active",
    "Content source not found",
    "CONTENT_ASSET_PUBLICATION_HISTORY_UNBOUNDED",
    "CONTENT_ASSET_PUBLICATION_MARKER_INVALID",
    "CONTENT_ASSET_PUBLICATION_REVIEW_REQUIRED",
    "CONTENT_ASSET_ACTIVE_CTA_REQUIRED",
    "CONTENT_ASSET_CTA_BACKFILL_CONFLICT",
    "CONTENT_ASSET_CTA_BACKFILL_UNBOUNDED",
    "CONTENT_ASSET_IDEMPOTENCY_CONFLICT",
    "CONTENT_ASSET_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_ASSET_IDENTITY_AMBIGUOUS",
    "CONTENT_ASSET_PRODUCT_MISMATCH",
    "CONTENT_ASSET_PROVENANCE_IMMUTABLE",
    "CONTENT_ASSET_PROVENANCE_INVALID",
    "CONTENT_ASSET_REFERENCED_IMMUTABLE",
    "CONTENT_ASSET_REPLAY_MISSING",
    "CONTENT_ASSET_READINESS_BLOCKED",
    "CONTENT_ASSET_REVIEW_IDEMPOTENCY_CONFLICT",
    "CONTENT_ASSET_REVIEW_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_ASSET_REVIEW_REPLAY_MISSING",
    "CONTENT_ASSET_SHAPE_INVALID",
    "CONTENT_ASSET_STATUS_NOT_ALLOWED",
    "CONTENT_ASSET_STATUS_TRANSITION_INVALID",
    "CONTENT_ASSET_TERMINAL_IMMUTABLE",
    "CONTENT_DRAFT_GENERATION_IDEMPOTENCY_CONFLICT",
    "CONTENT_DRAFT_GENERATION_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_DRAFT_GENERATION_REPLAY_MISSING",
    "CONTENT_DRAFT_ACTIVE_CTA_REQUIRED",
    "CONTENT_DRAFT_ALREADY_ADVANCED",
    "CONTENT_DRAFT_ALREADY_EXISTS",
    "CONTENT_DRAFT_ALREADY_REVIEWED",
    "CONTENT_DRAFT_CHANNELS_INVALID",
    "CONTENT_DRAFT_CTA_STALE",
    "CONTENT_DRAFT_HEAD_INVALID",
    "CONTENT_DRAFT_IDENTITY_COLLISION",
    "CONTENT_DRAFT_REVISION_LIMIT",
    "CONTENT_DRAFT_REVISION_REFERENCED",
    "CONTENT_DRAFT_SHAPE_INVALID",
    "CONTENT_CALENDAR_SHAPE_INVALID",
    "CONTENT_CALENDAR_IDENTITY_MISMATCH",
    "CONTENT_PERFORMANCE_APPROVED_DRAFT_REQUIRED",
    "CONTENT_PERFORMANCE_AUTHORITY_TIME_INVALID",
    "CONTENT_PERFORMANCE_AUTHORITY_TIME_MISSING",
    "CONTENT_PERFORMANCE_CALENDAR_MISMATCH",
    "CONTENT_PERFORMANCE_CALENDAR_NOT_READY",
    "CONTENT_PERFORMANCE_CALENDAR_REQUIRED",
    "CONTENT_PERFORMANCE_DRAFT_MISMATCH",
    "CONTENT_PERFORMANCE_DRAFT_NOT_APPROVED",
    "CONTENT_PERFORMANCE_IDEMPOTENCY_CONFLICT",
    "CONTENT_PERFORMANCE_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_PERFORMANCE_PUBLICATION_DRAFT_REQUIRED",
    "CONTENT_PERFORMANCE_PUBLICATION_EVIDENCE_REQUIRED",
    "CONTENT_PERFORMANCE_PUBLICATION_MISMATCH",
    "CONTENT_PERFORMANCE_PUBLICATION_STATE_INVALID",
    "CONTENT_PERFORMANCE_PUBLISHED_AT_INVALID",
    "CONTENT_PERFORMANCE_PREDATES_AUTHORITY",
    "CONTENT_PERFORMANCE_REPLAY_MISSING",
    "CONTENT_PERFORMANCE_SHAPE_INVALID",
    "CONTENT_REVIEW_IDEMPOTENCY_CONFLICT",
    "CONTENT_REVIEW_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_REVIEW_REPLAY_MISSING",
    "CONTENT_SCHEDULE_IDEMPOTENCY_CONFLICT",
    "CONTENT_SCHEDULE_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_SCHEDULE_REPLAY_MISSING",
    "CONTENT_SCHEDULE_AFTER_PROOF_EXPIRY",
    "CONTENT_SCHEDULE_PROOF_TIME_INVALID",
    "CONTENT_SCHEDULE_STATUS_INVALID",
    "CONTENT_SCHEDULED_AT_INVALID",
    "CONTENT_SOURCE_AUDIENCE_MISMATCH",
    "CONTENT_SOURCE_IDEMPOTENCY_CONFLICT",
    "CONTENT_SOURCE_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_SOURCE_IDENTITY_AMBIGUOUS",
    "CONTENT_SOURCE_MARKET_POD_MISMATCH",
    "CONTENT_SOURCE_PRODUCT_MISMATCH",
    "CONTENT_SOURCE_PROVENANCE_IMMUTABLE",
    "CONTENT_SOURCE_PROVENANCE_INVALID",
    "CONTENT_SOURCE_REFERENCED_IMMUTABLE",
    "CONTENT_SOURCE_REPLAY_MISSING",
    "CONTENT_SOURCE_SHAPE_INVALID",
    "CONTENT_SOURCE_TYPE_MISMATCH",
    "CONTENT_SOURCE_URL_MISMATCH",
    "DEMAND_SIGNAL_CLAIM_INVALID",
    "DEMAND_SIGNAL_EVENT_INVALID",
    "DEMAND_SIGNAL_REPLAY_MISSING",
    "DEMAND_SIGNAL_SUMMARY_INVALID",
    "DEMAND_SIGNAL_SUMMARY_LINEAGE_INVALID",
    "DEMAND_SIGNAL_TARGET_NAME_REQUIRES_TARGET",
    "SOURCE_POLICY_PRODUCT_MISMATCH",
    "SOURCE_POLICY_IDENTITY_MISMATCH",
    "SOURCE_POLICY_SHAPE_INVALID",
    "SOURCE_POLICY_INPUT_INVALID",
    "SOURCE_POLICY_IDEMPOTENCY_CONFLICT",
    "SOURCE_POLICY_REPLAY_MISSING",
    "SOURCE_POLICY_RENEWAL_BLOCKED",
    "SOURCE_POLICY_RENEWAL_IDEMPOTENCY_CONFLICT",
    "SOURCE_POLICY_RENEWAL_INPUT_INVALID",
    "SOURCE_POLICY_RENEWAL_WINDOW_INVALID",
    "SOURCE_POLICY_NOT_FOUND",
    "TARGET_IMPORT_INPUT_INVALID",
    "TARGET_IMPORT_IDEMPOTENCY_CONFLICT",
    "TARGET_IMPORT_PERMISSION_EVIDENCE_REQUIRED",
    "TARGET_IMPORT_DIVERGENT_DUPLICATE",
    "TARGET_IMPORT_ORPHANED_IDENTITY",
    "TARGET_IMPORT_ORPHANED_TARGET",
    "TARGET_IMPORT_PROVIDER_LINEAGE_REQUIRED",
    "TARGET_IMPORT_SOURCE_RUN_CONFLICT",
    "TARGET_IDENTITY_MISMATCH",
    "TARGET_IDENTITY_REBIND",
    "TARGET_PRODUCT_MISMATCH",
    "TARGET_SHAPE_INVALID",
    "TARGET_DETAIL_SHAPE_INVALID",
    "TARGET_SCORE_IDENTITY_MISMATCH",
    "TARGET_SCORE_PRODUCT_MISMATCH",
    "TARGET_SCORE_SHAPE_INVALID",
    "TARGET_IDENTITY_INDEX_SHAPE_INVALID",
    "TARGET_SOURCE_POLICY_REBIND",
    "CONTACT_IDENTITY_IMPORT_COLLISION",
    "CONTACT_IDENTITY_REBIND",
    "CONTACT_IDENTITY_PERMISSION_EVIDENCE_CONFLICT",
    "CONTACT_IDENTITY_PRODUCT_MISMATCH",
    "CONTACT_IDENTITY_SHAPE_INVALID",
    "SOURCE_CANDIDATE_LINEAGE_CONFLICT",
    "SOURCE_CANDIDATE_PRODUCT_MISMATCH",
    "SOURCE_CANDIDATE_SHAPE_INVALID",
    "RESEARCH_SOURCE_POLICY_ID_REQUIRED",
    "SOURCE_PROVIDER_IDEMPOTENCY_CONFLICT",
    "SOURCE_PROVIDER_LINEAGE_CONFLICT",
    "SOURCE_PROVIDER_RETENTION_LINEAGE_CONFLICT",
    "SOURCE_PROVIDER_REQUEST_FAILED",
    "SOURCE_PROVIDER_TIMEOUT",
    "TEMPLATE_PRODUCT_MISMATCH",
    "TEMPLATE_SHAPE_INVALID",
    "PROVIDER_ACCOUNT_PRODUCT_MISMATCH",
    "PROVIDER_ACCOUNT_SHAPE_INVALID",
    "BUDGET_POLICY_PRODUCT_MISMATCH",
    "BUDGET_POLICY_SHAPE_INVALID",
    "MODEL_ROUTE_PRODUCT_MISMATCH",
    "MODEL_ROUTE_SHAPE_INVALID",
    "AUDIENCE_SEGMENT_PRODUCT_MISMATCH",
    "AUDIENCE_SEGMENT_SHAPE_INVALID",
    "REPLY_PLAYBOOK_PRODUCT_MISMATCH",
    "REPLY_PLAYBOOK_SHAPE_INVALID",
    "SOURCE_QUALITY_POLICY_RUN_MISMATCH",
    "SOURCE_QUALITY_SNAPSHOT_SHAPE_INVALID",
    "Source policy not found",
    "Source run not found",
    "ENRICHMENT_WATERFALL_PRODUCT_MISMATCH",
    "ENRICHMENT_WATERFALL_SHAPE_INVALID",
    "SIGNALDESK_SEED_DEFAULT_REGISTRY_INVALID",
    "Market pod is not founder-approved",
    "Market pod not found",
    "MARKET_POD_PRODUCT_MISMATCH",
    "MARKET_POD_SHAPE_INVALID",
    "MARKET_POD_REVIEW_IDEMPOTENCY_CONFLICT",
    "MARKET_POD_REVIEW_IDEMPOTENCY_KEY_REQUIRED",
    "PROOF_PERMISSION_REQUIRED",
    "PROOF_PERMISSION_IDEMPOTENCY_CONFLICT",
    "PROOF_PERMISSION_IDEMPOTENCY_KEY_REQUIRED",
    "PROOF_PERMISSION_EXPIRES_AT_INVALID",
    "PROOF_PERMISSION_EXPIRY_ORDER_INVALID",
    "PROOF_PERMISSION_GRANTED_AT_INVALID",
    "PROOF_PERMISSION_NOT_ALLOWED",
    "PROOF_PERMISSION_REPLAY_MISSING",
    "PROOF_PERMISSION_PRODUCT_MISMATCH",
    "PROOF_PERMISSION_REACTIVATION_GRANT_INVALID",
    "PROOF_PERMISSION_REACTIVATION_GRANT_REQUIRED",
    "PROOF_PERMISSION_SCOPE_NOT_ALLOWED",
    "PROOF_PERMISSION_SHAPE_INVALID",
    "PROOF_PERMISSION_TARGET_IMMUTABLE",
    "CONTENT_AUTHORITY_RECONCILIATION_MISSING",
    "CONTENT_AUTHORITY_RECONCILIATION_PENDING",
    "CONTENT_AUTHORITY_RECONCILIATION_SUPERSEDED",
    "CONTENT_AUTHORITY_RECONCILIATION_TOKEN_MISSING",
    "CONTENT_AUTHORITY_CONTROL_ROOM_SHAPE_INVALID",
    "CONTENT_AUTHORITY_INCIDENT_MISSING",
    "CONTENT_AUTHORITY_INCIDENT_SHAPE_INVALID",
    "CONTENT_CTA_IDEMPOTENCY_CONFLICT",
    "CONTENT_CTA_IDEMPOTENCY_KEY_REQUIRED",
    "CONTENT_CTA_ACTIVE_AMBIGUOUS",
    "CONTENT_CTA_ALIAS_CANONICAL_MISSING",
    "CONTENT_CTA_ALIAS_SHAPE_INVALID",
    "CONTENT_CTA_DEFAULT_IDENTITY_INVALID",
    "CONTENT_CTA_IDENTITY_INCIDENT_MISSING",
    "CONTENT_CTA_IDENTITY_INCIDENT_SHAPE_INVALID",
    "CONTENT_CTA_LEGACY_IDENTITY_AMBIGUOUS",
    "CONTENT_CTA_LEGACY_IDENTITY_CONFLICT",
    "CONTENT_CTA_LINEAGE_REQUIRED",
    "CONTENT_CTA_NOT_ACTIVE",
    "CONTENT_CTA_NOT_FOUND",
    "CONTENT_CTA_PRODUCT_MISMATCH",
    "CONTENT_CTA_REPLAY_MISSING",
    "CONTENT_CTA_SHAPE_INVALID",
    "CONTENT_CTA_STALE",
    "EXPERIMENT_DEPENDENCY_SHAPE_INVALID",
    "OFFER_CTA_DEPENDENCY_SHAPE_INVALID",
    "TRUST_PARTNER_BRIEF_CLAIMS_REQUIRED",
    "TRUST_PARTNER_BRIEF_CLAIM_CONFLICT",
    "TRUST_PARTNER_BRIEF_DEPENDENCY_SHAPE_INVALID",
    "TRUST_PARTNER_BRIEF_IDENTITY_CONFLICT",
    "TRUST_PARTNER_BRIEF_PRODUCT_MISMATCH",
    "TRUST_PARTNER_BRIEF_SHAPE_INVALID",
    "TRUST_PARTNER_DELIVERABLE_DUE_DATE_INVALID",
    "TRUST_PARTNER_DELIVERABLE_IDEMPOTENCY_CONFLICT",
    "TRUST_PARTNER_DELIVERABLE_REPLAY_MISSING",
    "TRUST_PARTNER_DEAL_IDENTITY_MISMATCH",
    "TRUST_PARTNER_DEAL_NOT_APPROVED",
    "TRUST_PARTNER_DEAL_PRODUCT_MISMATCH",
    "TRUST_PARTNER_IDENTITY_MISMATCH",
    "TRUST_PARTNER_FOUNDER_APPROVAL_REQUIRED",
    "TRUST_PARTNER_LIVE_POST_URL_REQUIRED",
    "TRUST_PARTNER_MARKET_POD_NOT_APPROVED",
    "TRUST_PARTNER_METRICS_IDEMPOTENCY_CONFLICT",
    "TRUST_PARTNER_METRICS_LIVE_DELIVERABLE_REQUIRED",
    "TRUST_PARTNER_METRICS_REPLAY_MISSING",
    "TRUST_PARTNER_METRICS_SHAPE_INVALID",
    "TRUST_PARTNER_NICHE_IDEMPOTENCY_CONFLICT",
    "TRUST_PARTNER_NICHE_PARTNERS_INVALID",
    "TRUST_PARTNER_NICHE_REPLAY_MISSING",
    "TRUST_PARTNER_NICHE_SHAPE_INVALID",
    "TRUST_PARTNER_NICHE_TERMS_CONFLICT",
    "TRUST_PARTNER_NOT_APPROVED",
    "TRUST_PARTNER_NOT_ELIGIBLE",
    "TRUST_PARTNER_PROFILE_IDEMPOTENCY_CONFLICT",
    "TRUST_PARTNER_PROFILE_REPLAY_MISSING",
    "TRUST_PARTNER_PROFILE_SHAPE_INVALID",
    "TRUST_PARTNER_PROFILE_STATUS_INVALID",
    "TRUST_PARTNER_PRODUCT_MISMATCH",
    "TRUST_PARTNER_RAIL_PAUSED",
    "TRUST_PARTNER_RENEWAL_IDEMPOTENCY_CONFLICT",
    "TRUST_PARTNER_RENEWAL_RECOMMENDATION_MISMATCH",
    "TRUST_PARTNER_RENEWAL_REPLAY_MISSING",
    "Founder approval is required for proof permissions",
    "Founder approval is required to archive content assets",
    "Proof permission expiry must be in the future",
    "Email provider is not configured",
    "Enrichment waterfall is not active",
    "Enrichment waterfall not found",
    "Apify provider is not configured",
    "Apify source broker is disabled",
    "Foursquare provider is blocked pending source approval",
    "Google Places provider is not configured",
    "Meta provider is not configured",
    "MOBILE_READ_ONLY_ACTION_BLOCKED",
    "Manual contact result does not match route",
    "Manual contact idempotency conflict",
    "Manual contact route is not allowed",
    "Manual contact source policy changed",
    "Manual contact timestamp is invalid",
    "No valid target rows supplied",
    "No provider results returned",
    "Owned email sequencer is disabled",
    "Owned sequence is not ready",
    "Owned sequence not found",
    "Owned sequence step is not due",
    "Owned sequence step not found",
    "Outbound export is paused",
    "Outbound contact is paused",
    "Partner introduction permission evidence is required",
    "Prepared email export is required",
    "Provider source policy is required",
    "Provider account is not registered",
    "Provider account is not approved",
    "Provider account credentials are not configured",
    "Provider per-run budget exceeded",
    "Provider daily budget exceeded",
    "Provider monthly budget exceeded",
    "Reply conversation has no outbound lineage",
    "Reply conversation is not current for target",
    "Reply conversation not found",
    "Reply conversation is required",
    "Provider budget policy is not active",
    "Provider source retention record not found",
    "Sender domain is not ready",
    "DRAFT_SENDER_AUTHORITY_STALE",
    "DIRECT_PROVIDER_SEND_EMAIL_ONLY",
    "EMAIL_PHYSICAL_ADDRESS_INVALID",
    "EMAIL_REPLY_TO_INVALID",
    "EMAIL_SENDER_DOMAIN_AUTHORITY_MISMATCH",
    "EMAIL_SENDER_DOMAIN_AUTHORITY_REQUIRED",
    "EMAIL_SENDER_FROM_INVALID",
    "EMAIL_SMTP_PORT_INVALID",
    "EMAIL_SMTP_SECURE_INVALID",
    "EMAIL_UNSUBSCRIBE_URL_INVALID",
    "SENDER_DOMAIN_IDEMPOTENCY_CONFLICT",
    "SENDER_DOMAIN_IDEMPOTENCY_KEY_REQUIRED",
    "SENDER_DOMAIN_INVALID",
    "SENDER_DOMAIN_PRODUCT_MISMATCH",
    "SENDER_DOMAIN_REPLAY_MISSING",
    "SENDER_DOMAIN_SCAN_LIMIT_EXCEEDED",
    "SENDER_DOMAIN_SHAPE_INVALID",
    "SEQUENCER_SENDER_AUTHORITY_MISMATCH",
    "SignalDesk campaign rail is paused",
    "SignalDesk AI provider calls are disabled",
    "SignalDesk AI Volume Mode is disabled",
    "Founder approval is required for AI volume runs",
    "SignalDesk AI volume run is already active",
    "AI volume batch limits are invalid",
    "AI volume projected cost exceeds founder maximum",
    "SignalDesk AI critic route is not active",
    "SignalDesk AI provider is not configured",
    "SignalDesk AI route is not active",
    "SignalDesk AI route provider is not enabled",
    "SignalDesk AI workers are paused",
    "Founder approval is required for AI shadow review",
    "AI shadow review reason is required",
    "AI run not found",
    "AI model evaluation not found",
    "Only provider-backed AI assist runs can be reviewed",
    "SignalDesk assisted channels are disabled",
    "SignalDesk Firebase is not configured",
    "SignalDesk Operating Layer is disabled",
    "SignalDesk Revenue Operating Layer is disabled",
    "SignalDesk Demand Signals is disabled",
    "Revenue account not found",
    "Route token not found",
    "Target source policy changed; retry qualification",
    "Commercial opportunity not found",
    "Commercial opportunity stage and status do not match",
    "Commercial opportunity win or loss reason is required",
    "Commercial offer is required for valued opportunity",
    "Commercial opportunity currency does not match revenue pipeline",
    "Commercial offer is not active",
    "Commercial offer approval conditions are required",
    "Commercial offer ID does not match name and version",
    "Commercial offer version already exists with different terms",
    "Market pod is required for operating envelope",
    "Market pod is not active",
    "Operating envelope dates are invalid",
    "Operating envelope total volume must cover the daily cap",
    "Revenue budget policy is not active",
    "Budget policy is not eligible for revenue envelope",
    "Operating envelope exceeds the remaining budget policy",
    "Operating envelope version already exists with different terms",
    "Operating envelope ID does not match name and version",
    "Sender domain is required for email envelope",
    "SignalDesk provider send is disabled",
    "SignalDesk research agent table is disabled",
    "SignalDesk team member cannot deactivate own access",
    "SignalDesk team member email is required",
    "SIGNALDESK_TEAM_MEMBER_IDENTITY_CONFLICT",
    "SIGNALDESK_TEAM_MEMBER_NOT_FOUND",
    "SIGNALDESK_TEAM_MEMBER_ROLE_INVALID",
    "SIGNALDESK_TEAM_MEMBER_SHAPE_INVALID",
    "SignalDesk source providers are disabled",
    "SignalDesk target imports are disabled",
    "SignalDesk source providers are paused",
    "SOURCE_POLICY_EXPIRED",
    "SOURCE_POLICY_RETENTION_MISSING",
    "SOURCE_POLICY_REVIEW_REQUIRED",
    "SOURCE_POLICY_USE_NOT_ALLOWED",
    "ACTIVATION_EVIDENCE_REQUIRED",
    "ACTIVATION_OWNER_REVIEW_REQUIRED",
    "OUTCOME_IDEMPOTENCY_CONFLICT",
    "OUTCOME_TIMESTAMP_INVALID",
    "OUTCOME_CURRENT_EVIDENCE_REQUIRED",
    "OUTCOME_EVIDENCE_STALE",
    "OUTCOME_DEMAND_SOURCE_EVENT_INVALID",
    "OUTCOME_DEMAND_SOURCE_EVENT_REQUIRED",
    "OUTCOME_EVIDENCE_REQUIRED",
    "OUTCOME_MANUAL_SOURCE_EVENT_NOT_ALLOWED",
    "OUTCOME_TARGET_REQUIRED",
    "OUTCOME_TARGET_SOURCE_LIFECYCLE_INACTIVE",
    "OUTCOME_TARGET_SOURCE_POLICY_LINEAGE_MISMATCH",
    "ACTIVATION_TWO_DISTINCT_SURFACES_REQUIRED",
    "OUTCOME_BRIDGE_SIGNATURE_REQUIRED",
    "OUTCOME_IDEMPOTENCY_KEY_REQUIRED",
    "Activation target is required",
    "OWNER_QUALIFIED_INTENT_REQUIRED",
    "ROUTE_TOKEN_IDEMPOTENCY_CONFLICT",
    "ROUTE_TOKEN_SOURCE_ACTION_INVALID",
    "ROUTE_TOKEN_SOURCE_ACTION_LINEAGE_INVALID",
    "ROUTE_TOKEN_SOURCE_ACTION_REQUIRED",
    "ROUTE_TOKEN_SOURCE_APPROVAL_INVALID",
    "ROUTE_TOKEN_SOURCE_DRAFT_INVALID",
    "MenuList outcome bridge is paused",
    "Source policy is expired",
    "Target contact is not export-ready",
    "Target has prior contact or outcome",
    "Target is not draft-ready",
    "Target is not eligible for manual contact",
    "Target is suppressed",
    "Target not found",
    "Template is inactive",
    "Experiment card not found",
    "EXPERIMENT_CARD_IDENTITY_CONFLICT",
    "EXPERIMENT_CARD_PRODUCT_MISMATCH",
    "EXPERIMENT_CARD_SHAPE_INVALID",
    "EXPERIMENT_CREATE_STATUS_INVALID",
    "EXPERIMENT_ACTIVE_AUTHORITY_REQUIRED",
    "EXPERIMENT_SOURCE_POLICY_PRODUCT_MISMATCH",
    "EXPERIMENT_SOURCE_POLICY_IDENTITY_MISMATCH",
    "EXPERIMENT_MARKET_POD_SHAPE_INVALID",
    "EXPERIMENT_OFFER_MARKET_POD_MISMATCH",
    "EXPERIMENT_ASSET_MARKET_POD_MISMATCH",
    "EXPERIMENT_OFFER_ASSET_PROVENANCE_MISMATCH",
    "EXPERIMENT_READBACK_PLAN_INVALID",
    "EXPERIMENT_REVIEW_DECISION_INVALID",
    "EXPERIMENT_REVIEW_RESULT_REQUIRED",
    "EXPERIMENT_REVIEW_STATUS_MISMATCH",
    "EXPERIMENT_TERMINAL_REOPEN_NOT_ALLOWED",
    "EXPERIMENT_TERMINAL_MUTATION_NOT_ALLOWED",
    "Experiment market pod not found",
    "Experiment market pod is not founder-approved",
    "Experiment source policy not found",
    "Growth mission not found",
    "GROWTH_MISSION_DAY_INVALID",
    "GROWTH_MISSION_DECISION_INVALID",
    "GROWTH_MISSION_DECISION_NOTE_INVALID",
    "GROWTH_MISSION_ID_INVALID",
    "GROWTH_MISSION_MARKET_POD_INVALID",
    "GROWTH_MISSION_PRODUCT_MISMATCH",
    "GROWTH_MISSION_REQUEST_CONFLICT",
    "GROWTH_MISSION_SHAPE_INVALID",
    "GROWTH_MISSION_STATE_CONFLICT",
    "GROWTH_MISSION_TERMINAL",
    "Offer CTA is blocked",
    "Offer CTA not found",
    "Offer CTA is not active",
    "OFFER_CTA_PRODUCT_MISMATCH",
    "OFFER_CTA_SHAPE_INVALID",
    "OFFER_CTA_ACTIVE_AUTHORITY_REQUIRED",
    "OFFER_CTA_SEED_IDENTITY_CONFLICT",
    "OFFER_CTA_SELF_SERVICE_CTA_SHAPE_INVALID",
    "OFFER_CTA_MARKET_POD_SHAPE_INVALID",
    "Offer CTA self-service CTA not found",
    "Offer CTA self-service CTA is not active",
    "Offer CTA market pod not found",
    "Offer CTA market pod is not founder-approved",
    "Trust Partner Rail is disabled",
    "Trust partner not found",
    "Trust partner budget is not approved",
    "Trust partner deal not found",
    "Trust partner disclosure is required",
    "Trust partner renewal requires outcome evidence",
    "Trust partner per-view pricing is blocked",
]);

const getSafeActionErrorMessage = (error: unknown) => {
    if (error instanceof Error && SAFE_ACTION_ERRORS.has(error.message)) return error.message;
    return "SignalDesk action failed";
};

const validatePayload = <Schema extends z.ZodTypeAny>(schema: Schema, payload: unknown, context: {
    action?: string;
    request: NextRequest;
    session: any;
}) => {
    const validation = schema.safeParse(payload);
    if (validation.success !== true) {
        logSignalDeskValidationFailure({
            action: context.action,
            request: context.request,
            session: context.session,
        });
        return {
            response: signalDeskPrivateJson({ error: "Invalid input" }, { status: 400 }),
            success: false as const,
        };
    }
    return {
        data: validation.data,
        success: true as const,
    };
};

export const POST = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return withSignalDeskPrivateHeaders(disabled);

    const body = await parseSignalDeskJsonBody({ request, session });
    if (!body.success) return withSignalDeskPrivateHeaders(body.response);

    const envelope = validatePayload(ActionEnvelopeSchema, body.data, {
        action: "action-envelope",
        request,
        session,
    });
    if (!envelope.success) return withSignalDeskPrivateHeaders(envelope.response);

    const rateLimit = await applySignalDeskRateLimit({
        feature: envelope.data.action === "run-ai-volume-batch"
            ? "BATCH_OPERATION"
            : envelope.data.action === "score-target" || envelope.data.action === "run-ai-assist"
                ? "AI_OPERATION"
                : "DATA_WRITE",
        keyPrefix: `action:${envelope.data.action}`,
        request,
        session,
    });
    if (rateLimit) return withSignalDeskPrivateHeaders(rateLimit);

    const accessResult = await requireSignalDeskAccess(request, session, permissionForAction(envelope.data.action));
    if ("response" in accessResult) return withSignalDeskPrivateHeaders(accessResult.response);

    if (isSignalDeskMobileRequest(request)) {
        const mobileAction = ActionEnvelopeSchema.shape.action.parse(envelope.data.action);
        const actionClass = SIGNALDESK_MOBILE_ACTION_CLASS[mobileAction] || "configure";
        await recordSignalDeskMobileActionBlockedServer({
            access: accessResult.access,
            action: envelope.data.action,
            actionClass,
        });
        return signalDeskPrivateJson({ actionClass, error: "MOBILE_READ_ONLY_ACTION_BLOCKED" }, { status: 403 });
    }

    try {
        if (envelope.data.action === "seed-defaults") {
            return signalDeskPrivateJson({ data: await seedSignalDeskDefaultsServer(accessResult.access) });
        }
        if (envelope.data.action === "create-source-policy") {
            const payload = validatePayload(SignalDeskSourcePolicyCreateSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskSourcePolicyServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "renew-source-policy") {
            const payload = validatePayload(SignalDeskSourcePolicyRenewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await renewSignalDeskSourcePolicyServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "import-targets") {
            const payload = validatePayload(SignalDeskManualTargetImportSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await importSignalDeskTargetsServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "score-target") {
            const payload = validatePayload(TargetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await scoreSignalDeskTargetServer(accessResult.access, payload.data.targetId) });
        }
        if (envelope.data.action === "create-evidence") {
            const payload = validatePayload(TargetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskEvidenceServer(accessResult.access, payload.data.targetId) });
        }
        if (envelope.data.action === "create-draft") {
            const payload = validatePayload(DraftSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskDraftServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "review-approval") {
            const payload = validatePayload(ReviewApprovalSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskApprovalServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "export-message") {
            const payload = validatePayload(ExportMessageSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await exportSignalDeskMessageServer(accessResult.access, payload.data.approvalId) });
        }
        if (envelope.data.action === "record-manual-contact") {
            const payload = validatePayload(ManualContactSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({
                data: await recordSignalDeskManualContactServer(accessResult.access, {
                    idempotencyKey: payload.data.idempotencyKey,
                    note: payload.data.note,
                    occurredAt: payload.data.occurredAt,
                    result: payload.data.result,
                    route: payload.data.route,
                    sourcePolicyId: payload.data.sourcePolicyId,
                    targetId: payload.data.targetId,
                }),
            });
        }
        if (envelope.data.action === "capture-reply") {
            const payload = validatePayload(CaptureReplySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await captureSignalDeskReplyServer(accessResult.access, {
                conversationId: payload.data.conversationId,
                idempotencyKey: payload.data.idempotencyKey,
                message: payload.data.message,
            }) });
        }
        if (envelope.data.action === "record-outcome") {
            const payload = validatePayload(RecordOutcomeSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            if (!payload.data.channel || !payload.data.outcomeType || !payload.data.source) {
                return signalDeskPrivateJson({ error: "Invalid input" }, { status: 400 });
            }
            return signalDeskPrivateJson({
                data: await recordSignalDeskOutcomeServer(accessResult.access, {
                    channel: payload.data.channel,
                    evidenceRef: payload.data.evidenceRef,
                    idempotencyKey: payload.data.idempotencyKey,
                    outcomeType: payload.data.outcomeType,
                    ownerQualifiedAt: payload.data.ownerQualifiedAt,
                    ownerReviewedAt: payload.data.ownerReviewedAt,
                    source: payload.data.source,
                    sourceEventId: payload.data.sourceEventId,
                    surfaces: payload.data.surfaces,
                    targetId: payload.data.targetId,
                }),
            });
        }
        if (envelope.data.action === "create-route-token") {
            const payload = validatePayload(RouteTokenSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            if (!payload.data.channel || !payload.data.targetId) {
                return signalDeskPrivateJson({ error: "Invalid input" }, { status: 400 });
            }
            return signalDeskPrivateJson({
                data: await createSignalDeskRouteTokenServer(accessResult.access, {
                    actionId: payload.data.actionId,
                    channel: payload.data.channel,
                    ctaId: payload.data.ctaId,
                    idempotencyKey: payload.data.idempotencyKey,
                    targetId: payload.data.targetId,
                    templateId: payload.data.templateId,
                }),
            });
        }
        if (envelope.data.action === "revoke-route-token") {
            const payload = validatePayload(RevokeRouteTokenSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            if (!payload.data.reason || !payload.data.routeTokenId) {
                return signalDeskPrivateJson({ error: "Invalid input" }, { status: 400 });
            }
            return signalDeskPrivateJson({
                data: await revokeSignalDeskRouteTokenServer(accessResult.access, {
                    reason: payload.data.reason,
                    routeTokenId: payload.data.routeTokenId,
                }),
            });
        }
        if (envelope.data.action === "run-source-provider") {
            const payload = validatePayload(SourceProviderRunSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await runSignalDeskSourceProviderServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "run-ai-assist") {
            const payload = validatePayload(AiAssistSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await runSignalDeskAiAssistServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "run-ai-volume-batch") {
            const payload = validatePayload(AiVolumeBatchSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await runSignalDeskAiVolumeBatchServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "review-ai-shadow-run") {
            const payload = validatePayload(AiShadowReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskAiShadowRunServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "prepare-channel-handoff") {
            const payload = validatePayload(ChannelActionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await prepareSignalDeskChannelHandoffServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-channel-window-state") {
            const payload = validatePayload(ChannelWindowStateSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            if (!payload.data.channel || !payload.data.idempotencyKey || !payload.data.source || !payload.data.status) {
                return signalDeskPrivateJson({ error: "Invalid input" }, { status: 400 });
            }
            return signalDeskPrivateJson({ data: await upsertSignalDeskChannelWindowStateServer(accessResult.access, {
                channel: payload.data.channel,
                expiresAt: payload.data.expiresAt,
                idempotencyKey: payload.data.idempotencyKey,
                reason: payload.data.reason,
                source: payload.data.source,
                status: payload.data.status,
                targetId: payload.data.targetId,
            }) });
        }
        if (envelope.data.action === "send-approved-message") {
            const payload = validatePayload(ProviderSendActionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await sendSignalDeskApprovedMessageServer(accessResult.access, {
                approvalId: payload.data.approvalId,
                channel: payload.data.channel,
            }) });
        }
        if (envelope.data.action === "upsert-provider-account") {
            const payload = validatePayload(ProviderAccountSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskProviderAccountServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-budget-policy") {
            const payload = validatePayload(BudgetPolicySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskBudgetPolicyServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-connector-setting") {
            const payload = validatePayload(ConnectorSettingSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskConnectorSettingServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-model-route") {
            const payload = validatePayload(ModelRouteSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskModelRouteServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-enrichment-waterfall") {
            const payload = validatePayload(EnrichmentWaterfallSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskEnrichmentWaterfallServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-audience-segment") {
            const payload = validatePayload(AudienceSegmentSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskAudienceSegmentServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "recommend-market-pod-plan") {
            const payload = validatePayload(MarketPodRecommendationSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await recommendSignalDeskMarketPodPlanServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "review-market-pod") {
            const payload = validatePayload(MarketPodReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskMarketPodServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-sender-domain") {
            const payload = validatePayload(SenderDomainSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({
                data: await upsertSignalDeskSenderDomainServer(accessResult.access, {
                    authenticationState: payload.data.authenticationState,
                    bounceRate: payload.data.bounceRate,
                    brandRisk: payload.data.brandRisk,
                    complaintRate: payload.data.complaintRate,
                    domain: payload.data.domain,
                    idempotencyKey: payload.data.idempotencyKey,
                    provider: payload.data.provider,
                    status: payload.data.status,
                    unsubscribeReady: payload.data.unsubscribeReady,
                    volumeRampState: payload.data.volumeRampState,
                }),
            });
        }
        if (envelope.data.action === "upsert-self-service-cta") {
            const payload = validatePayload(SelfServiceCtaSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskSelfServiceCtaServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-daily-growth-mission") {
            const payload = validatePayload(DailyGrowthMissionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskDailyGrowthMissionServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "review-growth-mission") {
            const payload = validatePayload(GrowthMissionReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskGrowthMissionServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-experiment-card") {
            const payload = validatePayload(ExperimentCardSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskExperimentCardServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "review-experiment-card") {
            const payload = validatePayload(ExperimentReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskExperimentCardServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-offer-cta") {
            const payload = validatePayload(OfferCtaSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskOfferCtaServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "qualify-revenue-account") {
            const payload = validatePayload(RevenueAccountQualificationSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await qualifySignalDeskRevenueAccountServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-commercial-opportunity") {
            const payload = validatePayload(CommercialOpportunitySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskCommercialOpportunityServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-commercial-offer") {
            const payload = validatePayload(CommercialOfferSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskCommercialOfferServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-operating-envelope") {
            const payload = validatePayload(OperatingEnvelopeSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskOperatingEnvelopeServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "refresh-activation-watch") {
            const payload = validatePayload(ActivationWatchSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await refreshSignalDeskActivationWatchServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-reply-playbook") {
            const payload = validatePayload(ReplyPlaybookSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskReplyPlaybookServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-source-quality-snapshot") {
            const payload = validatePayload(SourceQualitySnapshotSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskSourceQualitySnapshotServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-research-agent-run") {
            const payload = validatePayload(ResearchAgentRunSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskResearchAgentRunServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "refresh-provider-source-retention") {
            const payload = validatePayload(ProviderSourceRetentionRefreshSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await refreshSignalDeskProviderSourceRetentionServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-weekly-strategist-memo") {
            const payload = validatePayload(WeeklyStrategistMemoSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskWeeklyStrategistMemoServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-provider-evaluation") {
            const payload = validatePayload(ProviderEvaluationSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskProviderEvaluationServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "run-enrichment-waterfall") {
            const payload = validatePayload(RunWaterfallSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await runSignalDeskEnrichmentWaterfallServer(accessResult.access, {
                idempotencyKey: payload.data.idempotencyKey,
                targetId: payload.data.targetId,
                waterfallId: payload.data.waterfallId,
            }) });
        }
        if (envelope.data.action === "create-approval-packet") {
            const payload = validatePayload(ApprovalPacketSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskApprovalPacketServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-sequencer-handoff") {
            const payload = validatePayload(SequencerHandoffSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskSequencerHandoffServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "send-owned-sequence-step") {
            const payload = validatePayload(OwnedSequenceStepSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await sendSignalDeskOwnedSequenceStepServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-content-source") {
            const payload = validatePayload(ContentSourceSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskContentSourceServer(accessResult.access, {
                contentSourceId: payload.data.contentSourceId,
                defaultAudience: payload.data.defaultAudience,
                defaultMarketPodId: payload.data.defaultMarketPodId,
                idempotencyKey: payload.data.idempotencyKey,
                sourceType: payload.data.sourceType,
                sourceUrl: payload.data.sourceUrl,
                status: payload.data.status,
                title: payload.data.title,
            }) });
        }
        if (envelope.data.action === "upsert-proof-permission") {
            const payload = validatePayload(ProofPermissionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskProofPermissionServer(accessResult.access, {
                evidenceRef: payload.data.evidenceRef,
                expiresAt: payload.data.expiresAt,
                grantedAt: payload.data.grantedAt,
                idempotencyKey: payload.data.idempotencyKey,
                notes: payload.data.notes,
                proofPermissionId: payload.data.proofPermissionId,
                scopes: payload.data.scopes,
                status: payload.data.status,
                targetId: payload.data.targetId,
            }) });
        }
        if (envelope.data.action === "create-content-asset") {
            const payload = validatePayload(ContentAssetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskContentAssetServer(accessResult.access, {
                canonicalMessage: payload.data.canonicalMessage,
                contentAssetId: payload.data.contentAssetId,
                ctaId: payload.data.ctaId,
                idempotencyKey: payload.data.idempotencyKey,
                marketPodId: payload.data.marketPodId,
                primaryAudience: payload.data.primaryAudience,
                proofLevel: payload.data.proofLevel,
                proofPermissionId: payload.data.proofPermissionId,
                proofScopes: payload.data.proofScopes,
                riskNotes: payload.data.riskNotes,
                sourceId: payload.data.sourceId,
                sourceNotes: payload.data.sourceNotes,
                sourceType: payload.data.sourceType,
                sourceUrl: payload.data.sourceUrl,
                status: payload.data.status,
                title: payload.data.title,
            }) });
        }
        if (envelope.data.action === "review-content-asset") {
            const payload = validatePayload(ContentAssetReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskContentAssetServer(accessResult.access, {
                contentAssetId: payload.data.contentAssetId,
                idempotencyKey: payload.data.idempotencyKey,
                reason: payload.data.reason,
                status: payload.data.status,
            }) });
        }
        if (envelope.data.action === "generate-content-distribution-drafts") {
            const payload = validatePayload(ContentDistributionDraftSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            const drafts = await generateSignalDeskContentDistributionDraftsServer(accessResult.access, {
                channels: payload.data.channels,
                contentAssetId: payload.data.contentAssetId,
                idempotencyKey: payload.data.idempotencyKey,
            });
            return signalDeskPrivateJson({ data: { drafts } });
        }
        if (envelope.data.action === "review-content-distribution-draft") {
            const payload = validatePayload(ContentDraftReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskContentDistributionDraftServer(accessResult.access, {
                approvalStatus: payload.data.approvalStatus,
                contentDraftId: payload.data.contentDraftId,
                idempotencyKey: payload.data.idempotencyKey,
                reviewReason: payload.data.reviewReason,
            }) });
        }
        if (envelope.data.action === "schedule-content-distribution-draft") {
            const payload = validatePayload(ContentDraftScheduleSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await scheduleSignalDeskContentDistributionDraftServer(accessResult.access, {
                contentDraftId: payload.data.contentDraftId,
                idempotencyKey: payload.data.idempotencyKey,
                scheduledFor: payload.data.scheduledFor,
                status: payload.data.status,
            }) });
        }
        if (envelope.data.action === "record-content-performance") {
            const payload = validatePayload(ContentPerformanceSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            if (!payload.data.channel || !payload.data.contentAssetId || !payload.data.engagementQuality || !payload.data.idempotencyKey) return signalDeskPrivateJson({ error: "Invalid input" }, { status: 400 });
            return signalDeskPrivateJson({ data: await recordSignalDeskContentPerformanceServer(accessResult.access, {
                activations: payload.data.activations || 0, channel: payload.data.channel, clicks: payload.data.clicks || 0,
                contentAssetId: payload.data.contentAssetId, contentDraftId: payload.data.contentDraftId,
                currentListSubmissions: payload.data.currentListSubmissions || 0, engagementQuality: payload.data.engagementQuality,
                idempotencyKey: payload.data.idempotencyKey, ownerLeads: payload.data.ownerLeads || 0,
                publicationUrl: payload.data.publicationUrl, publishedAt: payload.data.publishedAt, views: payload.data.views || 0,
            }) });
        }
        if (envelope.data.action === "upsert-trust-partner-profile") {
            const payload = validatePayload(TrustPartnerProfileSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskTrustPartnerProfileServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-trust-partner-niche-test") {
            const payload = validatePayload(TrustPartnerNicheTestSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskTrustPartnerNicheTestServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "create-trust-partner-brief") {
            const payload = validatePayload(TrustPartnerBriefSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await createSignalDeskTrustPartnerBriefServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "review-trust-partner-deal") {
            const payload = validatePayload(TrustPartnerDealSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskTrustPartnerDealServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "record-trust-partner-deliverable") {
            const payload = validatePayload(TrustPartnerDeliverableSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await recordSignalDeskTrustPartnerDeliverableServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "record-trust-partner-metrics") {
            const payload = validatePayload(TrustPartnerMetricsSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            if (!payload.data.commentQuality || !payload.data.idempotencyKey || !payload.data.partnerId) return signalDeskPrivateJson({ error: "Invalid input" }, { status: 400 });
            return signalDeskPrivateJson({ data: await recordSignalDeskTrustPartnerMetricsServer(accessResult.access, {
                activations: payload.data.activations || 0, commentQuality: payload.data.commentQuality,
                comments: payload.data.comments || 0, currentListSubmissions: payload.data.currentListSubmissions || 0,
                deliverableId: payload.data.deliverableId, idempotencyKey: payload.data.idempotencyKey,
                ownerLeads: payload.data.ownerLeads || 0, partnerId: payload.data.partnerId, views: payload.data.views || 0,
            }) });
        }
        if (envelope.data.action === "review-trust-partner-renewal") {
            const payload = validatePayload(TrustPartnerRenewalSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await reviewSignalDeskTrustPartnerRenewalServer(accessResult.access, payload.data) });
        }
        if (envelope.data.action === "upsert-team-member") {
            const payload = validatePayload(TeamMemberSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return signalDeskPrivateJson({ data: await upsertSignalDeskTeamMemberServer(accessResult.access, payload.data) });
        }

        const payload = validatePayload(CaptureDemandSignalSchema, envelope.data.payload, {
            action: envelope.data.action,
            request,
            session,
        });
        if (!payload.success) return payload.response;
        return signalDeskPrivateJson({
            data: await captureSignalDeskDemandSignalServer(accessResult.access, {
                idempotencyKey: payload.data.idempotencyKey,
                signalType: payload.data.signalType,
                sourceSurface: payload.data.sourceSurface,
                targetId: payload.data.targetId,
                targetName: payload.data.targetName,
            }),
        });
    } catch (error) {
        logSignalDeskFailure(
            "signaldesk_action_route_failed",
            error,
            {
                route: "/api/signaldesk/actions",
                ...getSignalDeskAccessLogContext(accessResult.access),
                ...getBoundedSignalDeskStringContext("action", envelope.data.action),
                mobileRequest: isSignalDeskMobileRequest(request),
            },
        );
        const message = getSafeActionErrorMessage(error);
        return signalDeskPrivateJson({ error: message }, { status: message === "SignalDesk action failed" ? 500 : 400 });
    }
});
