export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    isSignalDeskMobileRequest,
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
    createSignalDeskProviderEvaluationServer,
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
    recordSignalDeskTrustPartnerDeliverableServer,
    recordSignalDeskTrustPartnerMetricsServer,
    recordSignalDeskContentPerformanceServer,
    refreshSignalDeskProviderSourceRetentionServer,
    recordSignalDeskOutcomeServer,
    runSignalDeskEnrichmentWaterfallServer,
    reviewSignalDeskExperimentCardServer,
    reviewSignalDeskGrowthMissionServer,
    reviewSignalDeskApprovalServer,
    reviewSignalDeskTrustPartnerDealServer,
    reviewSignalDeskTrustPartnerRenewalServer,
    runSignalDeskAiAssistServer,
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
    scheduleSignalDeskContentDistributionDraftServer,
    upsertSignalDeskEnrichmentWaterfallServer,
    upsertSignalDeskModelRouteServer,
    upsertSignalDeskProviderAccountServer,
    upsertSignalDeskTeamMemberServer,
    upsertSignalDeskOfferCtaServer,
    upsertSignalDeskReplyPlaybookServer,
    upsertSignalDeskSelfServiceCtaServer,
    upsertSignalDeskSenderDomainServer,
    upsertSignalDeskContentSourceServer,
    upsertSignalDeskTrustPartnerProfileServer,
} from "@lib/signaldesk/workflowServer";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import type { SignalDeskPermission } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

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
        "capture-reply",
        "record-outcome",
        "capture-demand-signal",
        "run-source-provider",
        "run-ai-assist",
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
        "upsert-sender-domain",
        "upsert-self-service-cta",
        "create-daily-growth-mission",
        "review-growth-mission",
        "create-experiment-card",
        "review-experiment-card",
        "upsert-offer-cta",
        "upsert-reply-playbook",
        "create-source-quality-snapshot",
        "refresh-provider-source-retention",
        "create-weekly-strategist-memo",
        "create-provider-evaluation",
        "run-enrichment-waterfall",
        "create-approval-packet",
        "create-sequencer-handoff",
        "send-owned-sequence-step",
        "upsert-content-source",
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
    allowContact: z.boolean(),
    allowEvidence: z.boolean(),
    allowPersonalization: z.boolean(),
    expiresAt: z.string().trim().max(80).optional(),
    name: z.string().trim().min(2).max(120),
    notes: z.string().trim().max(500).optional(),
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
    sourceType: z.enum(["manual-csv", "manual-research", "owned-demand", "provider", "other"]),
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

const ReviewApprovalSchema = z.object({
    approvalId: z.string().trim().min(3).max(160),
    reason: z.string().trim().max(500).optional(),
    status: z.enum(["approved", "rejected"]),
});

const ExportMessageSchema = z.object({
    approvalId: z.string().trim().min(3).max(160),
});

const CaptureReplySchema = z.object({
    channel: z.enum(["email", "manual", "whatsapp", "instagram", "messenger"]),
    message: z.string().trim().min(1).max(4000),
    targetId: z.string().trim().min(3).max(160),
});

const RecordOutcomeSchema = z.object({
    channel: z.enum(["email", "manual", "qr", "share", "claim"]),
    outcomeType: z.enum(["route_created", "upload_started", "preview_prepared", "published", "two_surface_activation"]),
    source: z.enum(["manual", "route-token", "demand-signal"]),
    targetId: z.string().trim().min(3).max(160).optional(),
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
    maxResults: z.number().int().min(1).max(20).default(10),
    provider: z.enum(["google-places", "foursquare", "apify", "fhrs-fhis"]),
    query: z.string().trim().min(3).max(180),
    sourcePolicyId: z.string().trim().min(3).max(160),
});

const AiAssistSchema = z.object({
    instruction: z.string().trim().max(500).optional(),
    targetId: z.string().trim().min(3).max(160),
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit"]),
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
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit"]),
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

const SourceQualitySnapshotSchema = z.object({
    sourcePolicyId: z.string().trim().max(180).optional(),
    sourceRunId: z.string().trim().max(180).optional(),
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
    riskNotes: z.array(z.string().trim().max(240)).max(6).default([]),
    sourceId: z.string().trim().max(180).optional(),
    sourceNotes: z.string().trim().max(800).optional(),
    sourceType: ContentSourceTypeSchema,
    sourceUrl: z.string().trim().max(500).optional(),
    status: z.enum(["draft", "ready", "distributed", "hold", "archived"]).optional(),
    title: z.string().trim().min(2).max(180),
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
    if (action === "create-source-policy") return "source.configure";
    if (action === "import-targets") return "target.review";
    if (action === "score-target") return "target.review";
    if (action === "create-evidence") return "target.review";
    if (action === "create-draft") return "draft.create";
    if (action === "review-approval") return "draft.approve";
    if (action === "export-message") return "message.export";
    if (action === "capture-reply") return "message.export";
    if (action === "record-outcome") return "target.review";
    if (action === "run-source-provider") return "source.configure";
    if (action === "run-ai-assist") return "target.review";
    if (action === "prepare-channel-handoff") return "message.export";
    if (action === "upsert-channel-window-state") return "channel.configure";
    if (action === "send-approved-message") return "message.send";
    if (action === "upsert-provider-account") return "signaldesk.configure";
    if (action === "upsert-budget-policy") return "policy.approve";
    if (action === "upsert-connector-setting") return "channel.configure";
    if (action === "upsert-model-route") return "signaldesk.configure";
    if (action === "upsert-enrichment-waterfall") return "source.configure";
    if (action === "upsert-audience-segment") return "source.configure";
    if (action === "recommend-market-pod-plan") return "source.configure";
    if (action === "upsert-sender-domain") return "channel.configure";
    if (action === "upsert-self-service-cta") return "signaldesk.configure";
    if (action === "create-daily-growth-mission") return "target.review";
    if (action === "review-growth-mission") return "target.review";
    if (action === "create-experiment-card") return "target.review";
    if (action === "review-experiment-card") return "target.review";
    if (action === "upsert-offer-cta") return "signaldesk.configure";
    if (action === "upsert-reply-playbook") return "draft.create";
    if (action === "create-source-quality-snapshot") return "source.configure";
    if (action === "refresh-provider-source-retention") return "source.configure";
    if (action === "create-weekly-strategist-memo") return "target.review";
    if (action === "create-provider-evaluation") return "signaldesk.configure";
    if (action === "run-enrichment-waterfall") return "target.review";
    if (action === "create-approval-packet") return "target.review";
    if (action === "create-sequencer-handoff") return "message.export";
    if (action === "send-owned-sequence-step") return "message.send";
    if (action === "upsert-content-source") return "source.configure";
    if (action === "create-content-asset") return "draft.create";
    if (action === "generate-content-distribution-drafts") return "draft.create";
    if (action === "review-content-distribution-draft") return "draft.approve";
    if (action === "schedule-content-distribution-draft") return "draft.approve";
    if (action === "record-content-performance") return "target.review";
    if (action === "upsert-trust-partner-profile") return "source.configure";
    if (action === "create-trust-partner-niche-test") return "policy.approve";
    if (action === "create-trust-partner-brief") return "draft.create";
    if (action === "review-trust-partner-deal") return "policy.approve";
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
    "recommend-market-pod-plan": "configure",
    "record-content-performance": "configure",
    "record-outcome": "configure",
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
    "upsert-enrichment-waterfall": "provider_run",
    "upsert-model-route": "provider_run",
    "upsert-offer-cta": "configure",
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
    "Email provider is not configured",
    "Enrichment waterfall is not active",
    "Enrichment waterfall not found",
    "Apify provider is not configured",
    "Apify source broker is disabled",
    "Foursquare provider is blocked pending source approval",
    "Google Places provider is not configured",
    "Meta provider is not configured",
    "MOBILE_READ_ONLY_ACTION_BLOCKED",
    "No valid target rows supplied",
    "No provider results returned",
    "Owned email sequencer is disabled",
    "Owned sequence is not ready",
    "Owned sequence not found",
    "Owned sequence step is not due",
    "Owned sequence step not found",
    "Outbound export is paused",
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
    "SignalDesk AI provider is not configured",
    "SignalDesk AI route is not active",
    "SignalDesk AI route provider is not enabled",
    "SignalDesk AI workers are paused",
    "SignalDesk assisted channels are disabled",
    "SignalDesk Firebase is not configured",
    "SignalDesk Operating Layer is disabled",
    "SignalDesk provider send is disabled",
    "SignalDesk team member cannot deactivate own access",
    "SignalDesk team member email is required",
    "SignalDesk source providers are disabled",
    "SignalDesk source providers are paused",
    "SOURCE_POLICY_EXPIRED",
    "SOURCE_POLICY_RETENTION_MISSING",
    "SOURCE_POLICY_REVIEW_REQUIRED",
    "SOURCE_POLICY_USE_NOT_ALLOWED",
    "Source policy is expired",
    "Target contact is not export-ready",
    "Target has prior contact or outcome",
    "Target is not draft-ready",
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
            details: validation.error,
            request: context.request,
            session: context.session,
        });
        return {
            response: NextResponse.json({ error: "Invalid input", details: validation.error }, { status: 400 }),
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
        feature: envelope.data.action === "score-target" || envelope.data.action === "run-ai-assist" ? "AI_OPERATION" : "DATA_WRITE",
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
            return NextResponse.json({ data: await recordSignalDeskOutcomeServer(accessResult.access, payload.data as any) });
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
        secureError("[SignalDesk API] Action failed", error as Error, {
            action: envelope.data.action,
            userId: accessResult.access.userId,
        });
        const message = getSafeActionErrorMessage(error);
        return NextResponse.json({ error: message }, { status: message === "SignalDesk action failed" ? 500 : 400 });
    }
});
