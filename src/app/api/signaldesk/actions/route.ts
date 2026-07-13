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
} from "@lib/signaldesk/apiGuards";
import { recordSignalDeskMobileActionBlockedServer } from "@lib/signaldesk/server";
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
import { validateAPIInput } from "@lib/security/inputValidation";
import type { SignalDeskPermission } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// A bounded volume run can make up to 45 provider calls with per-pair dependencies
// across three concurrent workers. Keep the route finite while allowing the
// founder-approved batch to finish and persist its parent summary.
export const maxDuration = 300;

const ActionEnvelopeSchema = z.object({
    action: z.enum([
        "seed-defaults",
        "create-source-policy",
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

const SourcePolicySchema = z.object({
    accessMethod: z.enum(["owner-supplied", "permissioned-referral", "licensed-api", "open-data", "manual-public-research", "other"]),
    allowContact: z.boolean(),
    allowEvidence: z.boolean(),
    allowPersonalization: z.boolean(),
    allowedFields: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
    attributionRequirements: z.array(z.string().trim().min(1).max(240)).max(10).default([]),
    blockedFields: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    expiresAt: z.string().trim().max(80).optional(),
    lastReviewedAt: z.string().datetime({ offset: true }).optional(),
    name: z.string().trim().min(2).max(120),
    notes: z.string().trim().max(500).optional(),
    policyOwner: z.string().trim().min(2).max(180),
    prohibitedUses: z.array(z.string().trim().min(1).max(240)).min(1).max(20),
    provider: z.enum([
        "manual",
        "google-places",
        "foursquare",
        "apify",
        "fhrs-fhis",
        "apollo",
        "hunter",
        "zerobounce",
        "firecrawl",
        "tavily",
        "exa",
        "postmark",
        "resend",
        "owned-email",
        "smartlead",
        "instantly",
        "lemlist",
        "gemini",
        "openai",
        "anthropic",
    ]).optional(),
    retentionDays: z.number().int().min(1).max(365),
    rawPayloadPolicy: z.enum(["never-store", "transient-only", "retention-bound"]),
    refreshMethod: z.enum(["manual-review", "provider-refresh", "owner-refresh", "no-refresh"]),
    sourceType: z.enum(["manual-csv", "manual-research", "owned-demand", "provider", "other"]),
    termsUrl: z.string().trim().url().max(500).optional(),
    termsVersion: z.string().trim().max(120).optional(),
});

const ImportTargetsSchema = z.object({
    rows: z.array(z.object({
        category: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        country: z.string().trim().max(120).optional(),
        currentListUrl: z.string().trim().max(500).optional(),
        displayName: z.string().trim().min(2).max(180),
        email: z.string().trim().max(180).optional(),
        instagram: z.string().trim().max(180).optional(),
        notes: z.string().trim().max(500).optional(),
        phone: z.string().trim().max(80).optional(),
        website: z.string().trim().max(500).optional(),
    })).min(1).max(50),
    sourceName: z.string().trim().min(2).max(160),
    sourcePolicyId: z.string().trim().min(3).max(160),
});

const TargetSchema = z.object({
    targetId: z.string().trim().min(3).max(160),
});

const DraftSchema = z.object({
    targetId: z.string().trim().min(3).max(160),
    templateId: z.string().trim().min(3).max(160).optional(),
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
    approvalId: z.string().trim().min(3).max(160),
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
    approvalId: z.string().trim().min(3).max(160),
});

const ManualContactSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    note: z.string().trim().max(300).optional(),
    occurredAt: z.string().datetime({ offset: true }),
    result: z.enum(["contacted", "no-answer", "wrong-contact", "requested-later", "declined", "introduced"]),
    route: z.enum(["email-export", "partner-intro"]),
    sourcePolicyId: z.string().trim().min(3).max(160),
    targetId: z.string().trim().min(3).max(160),
});

const CaptureReplySchema = z.object({
    channel: z.enum(["email", "manual", "whatsapp", "instagram", "messenger"]),
    message: z.string().trim().min(1).max(4000),
    targetId: z.string().trim().min(3).max(160),
});

const RecordOutcomeSchema = z.object({
    channel: z.enum(["email", "manual", "qr", "share", "claim"]),
    evidenceRef: z.string().trim().max(500).optional(),
    idempotencyKey: z.string().trim().min(8).max(180).optional(),
    outcomeType: z.enum(["route_created", "upload_started", "preview_prepared", "published", "two_surface_activation"]),
    ownerQualifiedAt: z.string().datetime({ offset: true }).optional(),
    ownerReviewedAt: z.string().datetime({ offset: true }).optional(),
    source: z.enum(["manual", "demand-signal"]),
    surfaces: z.array(z.enum(["qr", "whatsapp", "google-profile", "instagram", "website", "print", "other"])).max(7).default([]),
    targetId: z.string().trim().min(3).max(160).optional(),
}).superRefine((value, context) => {
    if (value.outcomeType !== "two_surface_activation") return;
    if (!value.targetId) context.addIssue({ code: z.ZodIssueCode.custom, message: "Activation target is required", path: ["targetId"] });
    if (!value.idempotencyKey) context.addIssue({ code: z.ZodIssueCode.custom, message: "Outcome idempotency key is required", path: ["idempotencyKey"] });
    if (!value.evidenceRef) context.addIssue({ code: z.ZodIssueCode.custom, message: "Activation evidence is required", path: ["evidenceRef"] });
    if (!value.ownerQualifiedAt || !value.ownerReviewedAt) context.addIssue({ code: z.ZodIssueCode.custom, message: "Owner review is required", path: ["ownerReviewedAt"] });
    if (new Set(value.surfaces).size < 2) context.addIssue({ code: z.ZodIssueCode.custom, message: "Two distinct surfaces are required", path: ["surfaces"] });
});

const RouteTokenSchema = z.object({
    actionId: z.string().trim().min(3).max(160).optional(),
    channel: z.enum(["email", "manual", "qr", "share", "claim"]),
    ctaId: z.string().trim().max(160).optional(),
    targetId: z.string().trim().min(3).max(160),
    templateId: z.string().trim().max(160).optional(),
});

const RevokeRouteTokenSchema = z.object({
    reason: z.string().trim().min(3).max(500),
    routeTokenId: z.string().trim().regex(/^route_[a-f0-9]{32}$/),
});

const CaptureDemandSignalSchema = z.object({
    signalType: z.enum(["qr_scan", "link_click", "share", "claim_attempt", "referral"]),
    sourceSurface: z.enum(["menu", "qr", "website", "manual", "other"]),
    targetId: z.string().trim().min(3).max(160).optional(),
    targetName: z.string().trim().max(180).optional(),
});

const SourceProviderRunSchema = z.object({
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    maxResults: z.number().int().min(1).max(30).default(10),
    provider: z.enum(["google-places", "foursquare", "apify", "fhrs-fhis"]),
    query: z.string().trim().min(3).max(180),
    sourcePolicyId: z.string().trim().min(3).max(160),
});

const AiAssistSchema = z.object({
    instruction: z.string().trim().max(500).optional(),
    targetId: z.string().trim().min(3).max(160),
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit"]),
});

const AiVolumeBatchSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    instruction: z.string().trim().max(500).optional(),
    maxEstimatedCostUsd: z.number().min(0.01).max(5),
    targetIds: z.array(z.string().trim().min(3).max(160)).min(1).max(5)
        .refine((targetIds) => new Set(targetIds).size === targetIds.length, "Target IDs must be unique"),
    tasks: z.array(z.enum(["score", "evidence", "draft", "reply-classification"])).min(1).max(3)
        .refine((tasks) => new Set(tasks).size === tasks.length, "Tasks must be unique"),
});

const AiShadowReviewSchema = z.object({
    aiRunId: z.string().trim().min(3).max(180),
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
    approvalId: z.string().trim().min(3).max(160),
    channel: z.enum(["email", "whatsapp", "instagram", "messenger"]),
});

const ChannelWindowStateSchema = z.object({
    channel: z.enum(["whatsapp", "instagram", "messenger"]),
    expiresAt: z.string().trim().max(80).optional(),
    reason: z.string().trim().max(500).optional(),
    source: z.enum(["inbound", "opt-in", "ad-click", "template", "manual"]),
    status: z.enum(["open", "closed", "expired", "blocked", "needs-template"]),
    targetId: z.string().trim().min(3).max(160).optional(),
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
    monthlyBudgetUsd: z.number().min(0).max(100000),
    ownerApproved: z.boolean(),
    perRunBudgetUsd: z.number().min(0).max(1000),
    provider: ProviderIdSchema,
    status: z.enum(["approved", "blocked", "evaluation", "disabled"]),
    use: z.enum(["discovery", "enrichment", "verification", "research", "sender", "sequencer", "ai"]),
});

const BudgetPolicySchema = z.object({
    dailyBudgetUsd: z.number().min(0).max(10000),
    monthlyBudgetUsd: z.number().min(0).max(100000),
    name: z.string().trim().min(2).max(120),
    perRunBudgetUsd: z.number().min(0).max(1000),
    provider: ProviderIdSchema.optional(),
    scope: z.enum(["global", "provider", "market-pod", "model-route", "sequencer", "trust-partner"]),
    scopeId: z.string().trim().max(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const ModelRouteSchema = z.object({
    confidenceThreshold: z.enum(["high", "medium", "low"]),
    defaultModel: z.string().trim().min(2).max(120),
    defaultProvider: z.enum(["gemini", "openai", "anthropic"]),
    escalationModel: z.string().trim().max(120).optional(),
    escalationProvider: z.enum(["gemini", "openai", "anthropic"]).optional(),
    maxCostUsd: z.number().min(0).max(100),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit", "quality-critic"]),
});

const EnrichmentWaterfallSchema = z.object({
    maxCostUsd: z.number().min(0).max(1000),
    maxCredits: z.number().int().min(1).max(50),
    name: z.string().trim().min(2).max(120),
    providerOrder: z.array(ProviderIdSchema).min(1).max(12),
    requestedField: z.enum(["email", "phone", "company", "website", "evidence"]),
    retentionDays: z.number().int().min(1).max(365),
    sourcePolicyId: z.string().trim().max(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    stopCondition: z.enum(["first-verified", "first-candidate", "manual-review"]),
    verificationRequired: z.boolean(),
});

const AudienceSegmentSchema = z.object({
    criteriaSummary: z.string().trim().min(2).max(500),
    marketPodId: z.string().trim().max(160).optional(),
    name: z.string().trim().min(2).max(120),
    sourcePolicyId: z.string().trim().max(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    triggerType: z.enum(["demand-signal", "source-run", "outcome", "manual", "website-evidence"]),
});

const MarketPodRecommendationSchema = z.object({
    marketPodId: z.string().trim().min(3).max(160).optional(),
});

const MarketPodReviewSchema = z.object({
    decision: z.enum(["approved", "held", "rejected"]),
    marketPodId: z.string().trim().min(3).max(160),
    reason: z.string().trim().min(3).max(500),
});

const ProviderSourceRetentionRefreshSchema = z.object({
    notes: z.string().trim().max(500).optional(),
    providerSourceRetentionId: z.string().trim().min(3).max(180),
    status: z.enum(["refreshed", "refresh-due", "expired", "blocked"]),
});

const WeeklyStrategistMemoSchema = z.object({
    weekStart: z.string().trim().max(20).optional(),
});

const ProviderEvaluationSchema = z.object({
    provider: ProviderIdSchema,
    use: z.enum(["discovery", "enrichment", "verification", "research", "sender", "sequencer", "ai"]),
});

const SenderDomainSchema = z.object({
    authenticationState: z.enum(["missing", "partial", "ready"]),
    bounceRate: z.number().min(0).max(1),
    brandRisk: z.enum(["low", "medium", "high"]),
    complaintRate: z.number().min(0).max(1),
    domain: z.string().trim().min(2).max(180),
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
    instagramPageId: z.string().trim().max(180).optional(),
    messengerPageId: z.string().trim().max(180).optional(),
    notes: z.string().trim().max(500).optional(),
    phoneNumber: z.string().trim().max(80).optional(),
    phoneNumberId: z.string().trim().max(180).optional(),
    replyToEmail: z.string().trim().max(180).optional(),
    senderDomain: z.string().trim().max(180).optional(),
    senderEmail: z.string().trim().max(180).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const SelfServiceCtaSchema = z.object({
    copy: z.string().trim().min(2).max(500),
    ctaType: z.enum(["preview", "route-draft", "menu-health", "qr-public-menu", "claim-start", "two-surface-proof"]),
    label: z.string().trim().min(2).max(80),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const DailyGrowthMissionSchema = z.object({
    day: z.string().trim().max(20).optional(),
    marketPodId: z.string().trim().max(160).optional(),
});

const GrowthMissionReviewSchema = z.object({
    growthMissionId: z.string().trim().min(3).max(180),
    ownerDecision: z.enum(["pending", "approved", "hold", "redirected", "completed"]),
    ownerDecisionNote: z.string().trim().max(800).optional(),
    status: z.enum(["draft", "ready", "approved", "held", "completed"]).optional(),
});

const ExperimentCardSchema = z.object({
    channel: z.enum(["email", "manual", "content", "partner", "referral", "other"]),
    contentAssetId: z.string().trim().max(180).optional(),
    ctaId: z.string().trim().max(180).optional(),
    expectedOutcome: z.string().trim().min(2).max(240),
    hypothesis: z.string().trim().min(5).max(500),
    marketPodId: z.string().trim().max(160).optional(),
    proofAssetSummary: z.string().trim().max(500).optional(),
    sourcePolicyId: z.string().trim().max(180).optional(),
    status: z.enum(["planned", "active", "paused", "completed", "stopped"]).optional(),
    stopRule: z.string().trim().min(5).max(500),
    targetCount: z.number().int().min(1).max(500),
});

const ExperimentReviewSchema = z.object({
    experimentCardId: z.string().trim().min(3).max(180),
    ownerDecision: z.enum(["pending", "repeat", "narrow", "stop", "hold", "complete"]),
    resultSummary: z.string().trim().max(1000).optional(),
    status: z.enum(["planned", "active", "paused", "completed", "stopped"]).optional(),
});

const OfferCtaSchema = z.object({
    activationSurface: z.enum(["claim", "upload", "preview", "qr", "whatsapp", "google-profile", "manual"]),
    approvedAsk: z.string().trim().min(5).max(500),
    blockedClaims: z.array(z.string().trim().min(2).max(180)).max(10).default([]),
    ctaId: z.string().trim().max(180).optional(),
    marketPodId: z.string().trim().max(160).optional(),
    offerCtaId: z.string().trim().max(180).optional(),
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
    playbookId: z.string().trim().max(180).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    suppressionRequired: z.boolean(),
    title: z.string().trim().min(2).max(160),
});

const RevenueAccountQualificationSchema = z.object({
    locationType: z.enum(["single-location", "headquarters", "branch"]),
    organizationName: z.string().trim().max(160).optional(),
    targetId: z.string().trim().min(3).max(180),
});

const CommercialOpportunitySchema = z.object({
    commercialOfferId: z.string().trim().max(180).optional(),
    expectedCloseAt: z.string().datetime().optional(),
    founderAttentionMinutes: z.number().int().min(0).max(100000),
    nextAction: z.string().trim().min(3).max(500),
    nextActionDueAt: z.string().datetime().optional(),
    opportunityId: z.string().trim().min(3).max(180),
    probabilityPercent: z.number().int().min(0).max(100),
    stage: z.enum(["qualified", "discovery", "offer", "decision", "won", "lost", "nurture"]),
    stalledReason: z.string().trim().max(500).optional(),
    status: z.enum(["open", "won", "lost", "nurture"]),
    valueMinor: z.number().int().min(0).max(1000000000),
    winLossReason: z.string().trim().max(500).optional(),
});

const CommercialOfferSchema = z.object({
    allowedDiscountBps: z.number().int().min(0).max(10000),
    billingCadence: z.enum(["one-time", "monthly", "annual"]),
    commercialOfferId: z.string().trim().max(180).optional(),
    contents: z.array(z.string().trim().min(1).max(240)).min(1).max(30),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/),
    eligibilitySummary: z.string().trim().min(3).max(1000),
    founderApprovalConditions: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
    name: z.string().trim().min(2).max(160),
    offerCtaId: z.string().trim().max(180).optional(),
    priceMinor: z.number().int().min(0).max(1000000000),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    version: z.number().int().min(1).max(10000),
});

const OperatingEnvelopeSchema = z.object({
    budgetPolicyId: z.string().trim().max(180).optional(),
    channel: z.enum(["email", "manual", "content", "partner", "referral"]),
    commercialOfferId: z.string().trim().min(3).max(180),
    dailyVolumeCap: z.number().int().min(1).max(500),
    expiresAt: z.string().datetime(),
    fallbackAction: z.enum(["hold", "pause", "founder-review"]),
    marketPodId: z.string().trim().min(3).max(180),
    maxCostUsd: z.number().min(0).max(1000000),
    name: z.string().trim().min(2).max(160),
    operatingEnvelopeId: z.string().trim().max(180).optional(),
    requestedApprovalMode: z.enum(["manual", "recommendation-only", "prepare-and-approve-each", "approve-batch", "approve-sample", "exception-only"]),
    senderDomainId: z.string().trim().max(180).optional(),
    sourcePolicyIds: z.array(z.string().trim().min(3).max(180)).min(1).max(10),
    startsAt: z.string().datetime(),
    status: z.enum(["draft", "shadow", "approved", "held", "paused", "expired"]),
    stopConditions: z.array(z.string().trim().min(3).max(300)).min(1).max(20),
    templateIds: z.array(z.string().trim().min(3).max(180)).min(1).max(10),
    totalVolumeCap: z.number().int().min(1).max(5000),
    version: z.number().int().min(1).max(10000),
});

const ActivationWatchSchema = z.object({
    targetId: z.string().trim().min(3).max(180),
});

const SourceQualitySnapshotSchema = z.object({
    sourcePolicyId: z.string().trim().max(180).optional(),
    sourceRunId: z.string().trim().max(180).optional(),
});

const ResearchAgentRunSchema = z.object({
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().max(180).optional(),
    marketPodId: z.string().trim().max(180).optional(),
    maxResults: z.number().int().min(1).max(30).default(10),
    prompt: z.string().trim().min(5).max(600),
    provider: z.enum(["google-places", "apify", "fhrs-fhis"]).optional(),
    researchType: z.enum(["business-prospect", "market-map", "partner-list"]).default("business-prospect"),
    sourcePolicyId: z.string().trim().max(180).optional(),
});

const RunWaterfallSchema = z.object({
    targetId: z.string().trim().min(3).max(160),
    waterfallId: z.string().trim().min(3).max(160),
});

const ApprovalPacketSchema = z.object({
    approvalId: z.string().trim().min(3).max(160).optional(),
    targetId: z.string().trim().min(3).max(160).optional(),
});

const SequencerHandoffSchema = z.object({
    approvalId: z.string().trim().min(3).max(160),
    provider: z.enum(["owned-email", "smartlead", "instantly", "lemlist"]),
    senderDomainId: z.string().trim().max(160).optional(),
});

const OwnedSequenceStepSchema = z.object({
    sequencerHandoffId: z.string().trim().min(3).max(180),
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

const ContentSourceSchema = z.object({
    contentSourceId: z.string().trim().max(180).optional(),
    defaultAudience: ContentAudienceSchema,
    defaultMarketPodId: z.string().trim().max(160).optional(),
    sourceType: ContentSourceTypeSchema,
    sourceUrl: z.string().trim().max(500).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    title: z.string().trim().min(2).max(160),
});

const ContentAssetSchema = z.object({
    canonicalMessage: z.string().trim().min(10).max(2000),
    contentAssetId: z.string().trim().max(180).optional(),
    ctaId: z.string().trim().max(160).optional(),
    marketPodId: z.string().trim().max(160).optional(),
    primaryAudience: ContentAudienceSchema,
    proofLevel: z.enum(["owned", "customer-proof", "market-research", "internal-note"]),
    proofPermissionId: z.string().trim().max(180).optional(),
    proofScopes: z.array(PublicProofScopeSchema).max(6).default([]),
    riskNotes: z.array(z.string().trim().max(240)).max(6).default([]),
    sourceId: z.string().trim().max(180).optional(),
    sourceNotes: z.string().trim().max(800).optional(),
    sourceType: ContentSourceTypeSchema,
    sourceUrl: z.string().trim().max(500).optional(),
    status: z.enum(["draft", "ready", "distributed", "hold", "archived"]).optional(),
    title: z.string().trim().min(2).max(180),
}).superRefine((value, context) => {
    if (value.proofLevel === "customer-proof" && !value.proofPermissionId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Proof permission is required", path: ["proofPermissionId"] });
    }
    if (value.proofLevel === "customer-proof" && value.proofScopes.length === 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "At least one public proof scope is required", path: ["proofScopes"] });
    }
});

const ProofPermissionSchema = z.object({
    evidenceRef: z.string().trim().min(3).max(500),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    grantedAt: z.string().datetime({ offset: true }).optional(),
    notes: z.string().trim().max(500).optional(),
    proofPermissionId: z.string().trim().max(180).optional(),
    scopes: z.array(ProofPermissionScopeSchema).min(1).max(8),
    status: z.enum(["active", "hold", "revoked", "expired"]),
    targetId: z.string().trim().min(3).max(160),
});

const ContentDistributionDraftSchema = z.object({
    channels: z.array(ContentChannelSchema).min(1).max(8),
    contentAssetId: z.string().trim().min(3).max(180),
});

const ContentDraftReviewSchema = z.object({
    approvalStatus: z.enum(["approved", "rejected", "hold"]),
    contentDraftId: z.string().trim().min(3).max(180),
    reviewReason: z.string().trim().max(500).optional(),
});

const ContentDraftScheduleSchema = z.object({
    contentDraftId: z.string().trim().min(3).max(180),
    scheduledFor: z.string().trim().max(80).optional(),
    status: z.enum(["queued", "approved", "hold"]).optional(),
});

const ContentPerformanceSchema = z.object({
    activations: z.number().int().min(0).max(100000),
    channel: ContentChannelSchema,
    clicks: z.number().int().min(0).max(100000000),
    contentAssetId: z.string().trim().min(3).max(180),
    contentDraftId: z.string().trim().max(180).optional(),
    currentListSubmissions: z.number().int().min(0).max(100000),
    engagementQuality: z.enum(["high", "medium", "low"]),
    ownerLeads: z.number().int().min(0).max(100000),
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
    partnerType: z.enum(["restaurant-consultant", "menu-photographer", "local-business-creator", "agency-freelancer", "pos-payment-partner", "operator-advocate", "generic-creator"]),
    sourceNotes: z.string().trim().min(2).max(800),
    status: z.enum(["candidate", "approved", "hold", "rejected", "active"]).optional(),
    trustFeelScore: z.number().int().min(0).max(100),
});

const TrustPartnerNicheTestSchema = z.object({
    angle: z.string().trim().min(2).max(240),
    intendedAttempts: z.number().int().min(1).max(5),
    marketPodId: z.string().trim().max(160).optional(),
    nicheName: z.string().trim().min(2).max(160),
    partnerIds: z.array(z.string().trim().min(3).max(180)).max(5).default([]),
});

const TrustPartnerBriefSchema = z.object({
    approvedClaims: z.array(z.string().trim().min(2).max(240)).min(1).max(8),
    bannedClaims: z.array(z.string().trim().min(2).max(240)).min(1).max(8),
    ctaId: z.string().trim().max(160).optional(),
    dealId: z.string().trim().max(180).optional(),
    disclosureText: z.string().trim().min(5).max(500),
    onePageBrief: z.string().trim().min(20).max(2000),
    partnerId: z.string().trim().min(3).max(180),
});

const TrustPartnerDealSchema = z.object({
    approvalStatus: z.enum(["approved", "rejected", "blocked"]),
    budgetPolicyId: z.string().trim().max(180).optional(),
    deliverableCount: z.number().int().min(1).max(10),
    dueDate: z.string().trim().max(80).optional(),
    flatFeeUsd: z.number().min(0).max(100000),
    founderApproved: z.boolean(),
    nicheTestId: z.string().trim().max(180).optional(),
    partnerId: z.string().trim().min(3).max(180),
    pricingModel: z.enum(["flat-fee", "per-view", "barter"]),
});

const TrustPartnerDeliverableSchema = z.object({
    dealId: z.string().trim().max(180).optional(),
    disclosurePresent: z.boolean(),
    dueDate: z.string().trim().max(80).optional(),
    partnerId: z.string().trim().min(3).max(180),
    postUrl: z.string().trim().max(500).optional(),
    reviewState: z.enum(["pending", "approved", "risk", "rejected"]),
    status: z.enum(["scheduled", "submitted", "live", "missed", "paused"]),
});

const TrustPartnerMetricsSchema = z.object({
    activations: z.number().int().min(0).max(100000),
    commentQuality: z.enum(["high", "medium", "low"]),
    comments: z.number().int().min(0).max(100000000),
    currentListSubmissions: z.number().int().min(0).max(100000),
    deliverableId: z.string().trim().max(180).optional(),
    ownerLeads: z.number().int().min(0).max(100000),
    partnerId: z.string().trim().min(3).max(180),
    views: z.number().int().min(0).max(100000000),
});

const TrustPartnerRenewalSchema = z.object({
    evidenceSummary: z.string().trim().min(5).max(1000),
    nicheTestId: z.string().trim().max(180).optional(),
    ownerDecision: z.enum(["approved", "rejected", "pending"]).optional(),
    partnerId: z.string().trim().min(3).max(180),
    recommendation: z.enum(["renew", "hold", "cut", "retest"]),
});

const TeamMemberSchema = z.object({
    active: z.boolean(),
    email: z.string().trim().email().max(180),
    name: z.string().trim().max(120).optional(),
    role: z.enum(["founder-admin", "growth-manager", "operator", "compliance-reviewer", "readonly-analyst", "system-worker"]),
    teamMemberId: z.string().trim().max(180).optional(),
    userId: z.string().trim().max(180).optional(),
});

const permissionForAction = (action: z.infer<typeof ActionEnvelopeSchema>["action"]): SignalDeskPermission => {
    if (action === "seed-defaults") return "signaldesk.configure";
    if (action === "create-source-policy") return "signaldesk.configure";
    if (action === "import-targets") return "target.review";
    if (action === "score-target") return "target.review";
    if (action === "create-evidence") return "target.review";
    if (action === "create-draft") return "draft.create";
    if (action === "review-approval") return "draft.approve";
    if (action === "export-message") return "message.export";
    if (action === "record-manual-contact") return "target.review";
    if (action === "capture-reply") return "message.export";
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
    "create-daily-growth-mission": "configure",
    "create-draft": "approve",
    "create-evidence": "configure",
    "create-experiment-card": "configure",
    "create-provider-evaluation": "provider_run",
    "create-research-agent-run": "provider_run",
    "create-sequencer-handoff": "export",
    "create-source-policy": "mutate_policy",
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
    "Active source policy is required",
    "Active template is required",
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
    "Content source not found",
    "PROOF_PERMISSION_REQUIRED",
    "PROOF_PERMISSION_SCOPE_NOT_ALLOWED",
    "PROOF_PERMISSION_TARGET_IMMUTABLE",
    "Founder approval is required for proof permissions",
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
    "Prepared email export is required",
    "Provider source policy is required",
    "Provider account is not registered",
    "Provider account is not approved",
    "Provider account credentials are not configured",
    "Provider per-run budget exceeded",
    "Provider daily budget exceeded",
    "Provider monthly budget exceeded",
    "Provider budget policy is not active",
    "Provider source retention record not found",
    "Sender domain is not ready",
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
    "SignalDesk source providers are disabled",
    "SignalDesk source providers are paused",
    "SOURCE_POLICY_EXPIRED",
    "SOURCE_POLICY_RETENTION_MISSING",
    "SOURCE_POLICY_REVIEW_REQUIRED",
    "SOURCE_POLICY_USE_NOT_ALLOWED",
    "ACTIVATION_EVIDENCE_REQUIRED",
    "ACTIVATION_OWNER_REVIEW_REQUIRED",
    "OUTCOME_IDEMPOTENCY_CONFLICT",
    "OUTCOME_TIMESTAMP_INVALID",
    "ACTIVATION_TWO_DISTINCT_SURFACES_REQUIRED",
    "OUTCOME_BRIDGE_SIGNATURE_REQUIRED",
    "OUTCOME_IDEMPOTENCY_KEY_REQUIRED",
    "Activation target is required",
    "OWNER_QUALIFIED_INTENT_REQUIRED",
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
    "Growth mission not found",
    "Offer CTA is blocked",
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

const validatePayload = <T>(schema: z.ZodType<T>, payload: unknown, context: {
    action?: string;
    request: NextRequest;
    session: any;
}) => {
    const validation = validateAPIInput(schema, payload);
    if (validation.success !== true) {
        logSignalDeskValidationFailure({
            action: context.action,
            request: context.request,
            session: context.session,
        });
        return {
            response: NextResponse.json({ error: "Invalid input" }, { status: 400 }),
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
    if (disabled) return disabled;

    const body = await parseSignalDeskJsonBody({ request, session });
    if (!body.success) return body.response;

    const envelope = validatePayload(ActionEnvelopeSchema, body.data, {
        action: "action-envelope",
        request,
        session,
    });
    if (!envelope.success) return envelope.response;

    const accessResult = await requireSignalDeskAccess(request, session, permissionForAction(envelope.data.action));
    if ("response" in accessResult) return accessResult.response;

    if (isSignalDeskMobileRequest(request)) {
        const actionClass = SIGNALDESK_MOBILE_ACTION_CLASS[envelope.data.action] || "configure";
        await recordSignalDeskMobileActionBlockedServer({
            access: accessResult.access,
            action: envelope.data.action,
            actionClass,
        });
        return NextResponse.json({ actionClass, error: "MOBILE_READ_ONLY_ACTION_BLOCKED" }, { status: 403 });
    }

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
    if (rateLimit) return rateLimit;

    try {
        if (envelope.data.action === "seed-defaults") {
            return NextResponse.json({ data: await seedSignalDeskDefaultsServer(accessResult.access) });
        }
        if (envelope.data.action === "create-source-policy") {
            const payload = validatePayload(SourcePolicySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskSourcePolicyServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "import-targets") {
            const payload = validatePayload(ImportTargetsSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await importSignalDeskTargetsServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "score-target") {
            const payload = validatePayload(TargetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await scoreSignalDeskTargetServer(accessResult.access, payload.data.targetId) });
        }
        if (envelope.data.action === "create-evidence") {
            const payload = validatePayload(TargetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskEvidenceServer(accessResult.access, payload.data.targetId) });
        }
        if (envelope.data.action === "create-draft") {
            const payload = validatePayload(DraftSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskDraftServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-approval") {
            const payload = validatePayload(ReviewApprovalSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskApprovalServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "export-message") {
            const payload = validatePayload(ExportMessageSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await exportSignalDeskMessageServer(accessResult.access, payload.data.approvalId) });
        }
        if (envelope.data.action === "record-manual-contact") {
            const payload = validatePayload(ManualContactSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({
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
            return NextResponse.json({ data: await captureSignalDeskReplyServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "record-outcome") {
            const payload = validatePayload(RecordOutcomeSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            if (!payload.data.channel || !payload.data.outcomeType || !payload.data.source) {
                return NextResponse.json({ error: "Invalid input" }, { status: 400 });
            }
            return NextResponse.json({
                data: await recordSignalDeskOutcomeServer(accessResult.access, {
                    channel: payload.data.channel,
                    evidenceRef: payload.data.evidenceRef,
                    idempotencyKey: payload.data.idempotencyKey,
                    outcomeType: payload.data.outcomeType,
                    ownerQualifiedAt: payload.data.ownerQualifiedAt,
                    ownerReviewedAt: payload.data.ownerReviewedAt,
                    source: payload.data.source,
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
                return NextResponse.json({ error: "Invalid input" }, { status: 400 });
            }
            return NextResponse.json({
                data: await createSignalDeskRouteTokenServer(accessResult.access, {
                    actionId: payload.data.actionId,
                    channel: payload.data.channel,
                    ctaId: payload.data.ctaId,
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
                return NextResponse.json({ error: "Invalid input" }, { status: 400 });
            }
            return NextResponse.json({
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
            return NextResponse.json({ data: await runSignalDeskSourceProviderServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "run-ai-assist") {
            const payload = validatePayload(AiAssistSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await runSignalDeskAiAssistServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "run-ai-volume-batch") {
            const payload = validatePayload(AiVolumeBatchSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await runSignalDeskAiVolumeBatchServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-ai-shadow-run") {
            const payload = validatePayload(AiShadowReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskAiShadowRunServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "prepare-channel-handoff") {
            const payload = validatePayload(ChannelActionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await prepareSignalDeskChannelHandoffServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-channel-window-state") {
            const payload = validatePayload(ChannelWindowStateSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskChannelWindowStateServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "send-approved-message") {
            const payload = validatePayload(ChannelActionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await sendSignalDeskApprovedMessageServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-provider-account") {
            const payload = validatePayload(ProviderAccountSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskProviderAccountServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-budget-policy") {
            const payload = validatePayload(BudgetPolicySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskBudgetPolicyServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-connector-setting") {
            const payload = validatePayload(ConnectorSettingSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskConnectorSettingServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-model-route") {
            const payload = validatePayload(ModelRouteSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskModelRouteServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-enrichment-waterfall") {
            const payload = validatePayload(EnrichmentWaterfallSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskEnrichmentWaterfallServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-audience-segment") {
            const payload = validatePayload(AudienceSegmentSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskAudienceSegmentServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "recommend-market-pod-plan") {
            const payload = validatePayload(MarketPodRecommendationSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await recommendSignalDeskMarketPodPlanServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-market-pod") {
            const payload = validatePayload(MarketPodReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskMarketPodServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-sender-domain") {
            const payload = validatePayload(SenderDomainSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskSenderDomainServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-self-service-cta") {
            const payload = validatePayload(SelfServiceCtaSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskSelfServiceCtaServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-daily-growth-mission") {
            const payload = validatePayload(DailyGrowthMissionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskDailyGrowthMissionServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-growth-mission") {
            const payload = validatePayload(GrowthMissionReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskGrowthMissionServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-experiment-card") {
            const payload = validatePayload(ExperimentCardSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskExperimentCardServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-experiment-card") {
            const payload = validatePayload(ExperimentReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskExperimentCardServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-offer-cta") {
            const payload = validatePayload(OfferCtaSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskOfferCtaServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "qualify-revenue-account") {
            const payload = validatePayload(RevenueAccountQualificationSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await qualifySignalDeskRevenueAccountServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-commercial-opportunity") {
            const payload = validatePayload(CommercialOpportunitySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskCommercialOpportunityServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-commercial-offer") {
            const payload = validatePayload(CommercialOfferSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskCommercialOfferServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-operating-envelope") {
            const payload = validatePayload(OperatingEnvelopeSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskOperatingEnvelopeServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "refresh-activation-watch") {
            const payload = validatePayload(ActivationWatchSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await refreshSignalDeskActivationWatchServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-reply-playbook") {
            const payload = validatePayload(ReplyPlaybookSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskReplyPlaybookServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-source-quality-snapshot") {
            const payload = validatePayload(SourceQualitySnapshotSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskSourceQualitySnapshotServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-research-agent-run") {
            const payload = validatePayload(ResearchAgentRunSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskResearchAgentRunServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "refresh-provider-source-retention") {
            const payload = validatePayload(ProviderSourceRetentionRefreshSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await refreshSignalDeskProviderSourceRetentionServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-weekly-strategist-memo") {
            const payload = validatePayload(WeeklyStrategistMemoSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskWeeklyStrategistMemoServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-provider-evaluation") {
            const payload = validatePayload(ProviderEvaluationSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskProviderEvaluationServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "run-enrichment-waterfall") {
            const payload = validatePayload(RunWaterfallSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await runSignalDeskEnrichmentWaterfallServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-approval-packet") {
            const payload = validatePayload(ApprovalPacketSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskApprovalPacketServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-sequencer-handoff") {
            const payload = validatePayload(SequencerHandoffSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskSequencerHandoffServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "send-owned-sequence-step") {
            const payload = validatePayload(OwnedSequenceStepSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await sendSignalDeskOwnedSequenceStepServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-content-source") {
            const payload = validatePayload(ContentSourceSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskContentSourceServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-proof-permission") {
            const payload = validatePayload(ProofPermissionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskProofPermissionServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-content-asset") {
            const payload = validatePayload(ContentAssetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskContentAssetServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "generate-content-distribution-drafts") {
            const payload = validatePayload(ContentDistributionDraftSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await generateSignalDeskContentDistributionDraftsServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-content-distribution-draft") {
            const payload = validatePayload(ContentDraftReviewSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskContentDistributionDraftServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "schedule-content-distribution-draft") {
            const payload = validatePayload(ContentDraftScheduleSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await scheduleSignalDeskContentDistributionDraftServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "record-content-performance") {
            const payload = validatePayload(ContentPerformanceSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await recordSignalDeskContentPerformanceServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-trust-partner-profile") {
            const payload = validatePayload(TrustPartnerProfileSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskTrustPartnerProfileServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-trust-partner-niche-test") {
            const payload = validatePayload(TrustPartnerNicheTestSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskTrustPartnerNicheTestServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-trust-partner-brief") {
            const payload = validatePayload(TrustPartnerBriefSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskTrustPartnerBriefServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-trust-partner-deal") {
            const payload = validatePayload(TrustPartnerDealSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskTrustPartnerDealServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "record-trust-partner-deliverable") {
            const payload = validatePayload(TrustPartnerDeliverableSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await recordSignalDeskTrustPartnerDeliverableServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "record-trust-partner-metrics") {
            const payload = validatePayload(TrustPartnerMetricsSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await recordSignalDeskTrustPartnerMetricsServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-trust-partner-renewal") {
            const payload = validatePayload(TrustPartnerRenewalSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskTrustPartnerRenewalServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-team-member") {
            const payload = validatePayload(TeamMemberSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskTeamMemberServer(accessResult.access, payload.data as any) });
        }

        const payload = validatePayload(CaptureDemandSignalSchema, envelope.data.payload, {
            action: envelope.data.action,
            request,
            session,
        });
        if (!payload.success) return payload.response;
        return NextResponse.json({ data: await captureSignalDeskDemandSignalServer(accessResult.access, payload.data as any) });
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
        return NextResponse.json({ error: message }, { status: message === "SignalDesk action failed" ? 500 : 400 });
    }
});
