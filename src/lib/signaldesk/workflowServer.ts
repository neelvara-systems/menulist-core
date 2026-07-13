import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "@constant/signaldesk/database";
import {
    SIGNALDESK_DEFAULT_AI_MODEL,
    SIGNALDESK_FAST_AI_MODEL,
    SIGNALDESK_INTEGRATION_ENV,
    SIGNALDESK_OUTCOME_ROUTE_SCOPE,
} from "@constant/signaldesk/integrations";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { admin, signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import { sanitizeForFirestore as sanitizeFirestoreValue } from "@lib/firestore/sanitizeForFirestore";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { runSignalDeskAiAssist, runSignalDeskAiCritic } from "@lib/signaldesk/aiProvider";
import { getSignalDeskChannelReadiness, sendSignalDeskProviderMessage } from "@lib/signaldesk/providerAdapters";
import { loadSignalDeskOverviewServer } from "@lib/signaldesk/server";
import { runSignalDeskSourceProvider } from "@lib/signaldesk/sourceProviders";
import { createHash, randomBytes } from "crypto";
import type {
    SignalDeskAccessContext,
    SignalDeskActivationOpportunitySummary,
    SignalDeskAiShadowReviewDecision,
    SignalDeskAiTask,
    SignalDeskAiScoreSummary,
    SignalDeskAiVolumeRunSummary,
    SignalDeskAiVolumeTask,
    SignalDeskAiWorkerRunSummary,
    SignalDeskActivationWatchSummary,
    SignalDeskApprovalItem,
    SignalDeskApprovalPacketSummary,
    SignalDeskApprovalRejectionReason,
    SignalDeskAuditEvent,
    SignalDeskAudienceSegmentSummary,
    SignalDeskBudgetPolicySummary,
    SignalDeskChannelWindowStateSummary,
    SignalDeskChannelHealthSummary,
    SignalDeskConfidence,
    SignalDeskConversationSummary,
    SignalDeskConnectorKind,
    SignalDeskConnectorReadiness,
    SignalDeskConnectorSecretState,
    SignalDeskConnectorSettingSummary,
    SignalDeskCommercialOfferSummary,
    SignalDeskCommercialOpportunitySummary,
    SignalDeskContentAssetSummary,
    SignalDeskContentCalendarItemSummary,
    SignalDeskContentChannel,
    SignalDeskContentDistributionDraftSummary,
    SignalDeskContentPerformanceSummary,
    SignalDeskContentSourceSummary,
    SignalDeskContentSourceType,
    SignalDeskControlStatus,
    SignalDeskCostSummary,
    SignalDeskDemandSignalSummary,
    SignalDeskDraftSummary,
    SignalDeskEnrichmentResultSummary,
    SignalDeskEnrichmentWaterfallSummary,
    SignalDeskEvidencePacketSummary,
    SignalDeskExperimentCardSummary,
    SignalDeskGrowthMissionSummary,
    SignalDeskKillSwitch,
    SignalDeskMarketPodSummary,
    SignalDeskManualContactResult,
    SignalDeskManualContactRoute,
    SignalDeskModelEvalSummary,
    SignalDeskModelRouteSummary,
    SignalDeskNextAction,
    SignalDeskOutboundChannel,
    SignalDeskOutcomeSummary,
    SignalDeskOfferCtaSummary,
    SignalDeskOperatingEnvelopeSummary,
    SignalDeskProviderAccountSummary,
    SignalDeskProviderId,
    SignalDeskProviderEvaluationSummary,
    SignalDeskProviderEventSummary,
    SignalDeskProviderRunSummary,
    SignalDeskProviderSourceRetentionSummary,
    SignalDeskProviderUse,
    SignalDeskPermission,
    SignalDeskResearchProviderId,
    SignalDeskResearchRunSummary,
    SignalDeskResearchTableRowSummary,
    SignalDeskProofPermissionScope,
    SignalDeskProofPermissionSummary,
    SignalDeskRunTimelineSummary,
    SignalDeskRole,
    SignalDeskSection,
    SignalDeskSegment,
    SignalDeskSelfServiceCtaSummary,
    SignalDeskSenderDomainSummary,
    SignalDeskSequencerHandoffSummary,
    SignalDeskSequencerStepSummary,
    SignalDeskSourcePolicy,
    SignalDeskSourceQualitySnapshotSummary,
    SignalDeskSourceRunSummary,
    SignalDeskStrategistMemoSummary,
    SignalDeskSuppressionStatus,
    SignalDeskTargetSummary,
    SignalDeskTeamMemberSummary,
    SignalDeskTemplateSummary,
    SignalDeskReplyPlaybookSummary,
    SignalDeskRevenueAccountSummary,
    SignalDeskRevenueControlSummary,
    SignalDeskTrustPartnerBriefSummary,
    SignalDeskTrustPartnerDealSummary,
    SignalDeskTrustPartnerDeliverableSummary,
    SignalDeskTrustPartnerMetricSummary,
    SignalDeskTrustPartnerNicheTestSummary,
    SignalDeskTrustPartnerProfileSummary,
    SignalDeskTrustPartnerRenewalDecisionSummary,
    SignalDeskTrustPartnerType,
    SignalDeskVendorRunSummary,
    SignalDeskWorkspaceData,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";

type AnyRecord = Record<string, any>;

type TargetImportRow = {
    category?: string;
    city?: string;
    country?: string;
    currentListUrl?: string;
    displayName: string;
    email?: string;
    instagram?: string;
    notes?: string;
    phone?: string;
    providerRecordId?: string;
    providerRecordUrl?: string;
    website?: string;
};

type SourcePolicyInput = {
    accessMethod: NonNullable<SignalDeskSourcePolicy["accessMethod"]>;
    allowContact: boolean;
    allowEvidence: boolean;
    allowPersonalization: boolean;
    allowedFields: string[];
    attributionRequirements: string[];
    blockedFields: string[];
    expiresAt?: string;
    lastReviewedAt?: string;
    name: string;
    notes?: string;
    policyOwner: string;
    prohibitedUses: string[];
    provider?: SignalDeskProviderId;
    rawPayloadPolicy: NonNullable<SignalDeskSourcePolicy["rawPayloadPolicy"]>;
    refreshMethod: NonNullable<SignalDeskSourcePolicy["refreshMethod"]>;
    retentionDays: number;
    sourceType: SignalDeskSourcePolicy["sourceType"];
    termsUrl?: string;
    termsVersion?: string;
};

type SourceProviderRunInput = {
    city?: string;
    country?: string;
    maxResults: number;
    provider: Exclude<SignalDeskProviderId, "manual" | "owned-email" | "apollo" | "hunter" | "zerobounce" | "firecrawl" | "tavily" | "exa" | "postmark" | "resend" | "smartlead" | "instantly" | "lemlist" | "gemini" | "openai" | "anthropic">;
    query: string;
    sourcePolicyId: string;
};

type TeamMemberInput = {
    active: boolean;
    email: string;
    name?: string;
    role: SignalDeskRole;
    teamMemberId?: string;
    userId?: string;
};

type AiAssistInput = {
    instruction?: string;
    multiPass?: boolean;
    targetId: string;
    task: Exclude<SignalDeskAiTask, "quality-critic">;
    volumeRunId?: string;
};

type AiVolumeBatchInput = {
    idempotencyKey: string;
    instruction?: string;
    maxEstimatedCostUsd: number;
    targetIds: string[];
    tasks: SignalDeskAiVolumeTask[];
};

type AiShadowReviewInput = {
    aiRunId: string;
    decision: SignalDeskAiShadowReviewDecision;
    founderAttentionMinutes: number;
    reason?: string;
};

type ChannelActionInput = {
    approvalId: string;
    channel: Exclude<SignalDeskOutboundChannel, "manual">;
};

type ChannelWindowStateInput = {
    channel: SignalDeskChannelWindowStateSummary["channel"];
    expiresAt?: string;
    reason?: string;
    source: SignalDeskChannelWindowStateSummary["source"];
    status: SignalDeskChannelWindowStateSummary["status"];
    targetId?: string;
};

type ProviderAccountInput = {
    credentialState: SignalDeskProviderAccountSummary["credentialState"];
    dailyBudgetUsd: number;
    disabledReason?: string;
    monthlyBudgetUsd: number;
    ownerApproved: boolean;
    perRunBudgetUsd: number;
    provider: SignalDeskProviderId;
    status: SignalDeskProviderAccountSummary["status"];
    use: SignalDeskProviderUse;
};

type BudgetPolicyInput = {
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    name: string;
    perRunBudgetUsd: number;
    provider?: SignalDeskProviderId;
    scope: SignalDeskBudgetPolicySummary["scope"];
    scopeId?: string;
    status: SignalDeskBudgetPolicySummary["status"];
};

type ModelRouteInput = {
    confidenceThreshold: SignalDeskModelRouteSummary["confidenceThreshold"];
    defaultModel: string;
    defaultProvider: SignalDeskModelRouteSummary["defaultProvider"];
    escalationModel?: string;
    escalationProvider?: SignalDeskModelRouteSummary["escalationProvider"];
    maxCostUsd: number;
    status: SignalDeskModelRouteSummary["status"];
    task: SignalDeskAiTask;
};

type EnrichmentWaterfallInput = {
    maxCostUsd: number;
    maxCredits: number;
    name: string;
    providerOrder: SignalDeskProviderId[];
    requestedField: SignalDeskEnrichmentWaterfallSummary["requestedField"];
    retentionDays: number;
    sourcePolicyId?: string;
    status: SignalDeskEnrichmentWaterfallSummary["status"];
    stopCondition: SignalDeskEnrichmentWaterfallSummary["stopCondition"];
    verificationRequired: boolean;
};

type AudienceSegmentInput = {
    criteriaSummary: string;
    marketPodId?: string;
    name: string;
    sourcePolicyId?: string;
    status: SignalDeskAudienceSegmentSummary["status"];
    triggerType: SignalDeskAudienceSegmentSummary["triggerType"];
};

type MarketPodRecommendationInput = {
    marketPodId?: string;
};

type MarketPodReviewInput = {
    decision: NonNullable<SignalDeskMarketPodSummary["reviewDecision"]>;
    marketPodId: string;
    reason: string;
};

type ProviderSourceRetentionRefreshInput = {
    notes?: string;
    providerSourceRetentionId: string;
    status: Extract<SignalDeskProviderSourceRetentionSummary["status"], "refreshed" | "refresh-due" | "expired" | "blocked">;
};

type WeeklyStrategistMemoInput = {
    weekStart?: string;
};

type ProviderEvaluationInput = {
    provider: SignalDeskProviderId;
    use: SignalDeskProviderUse;
};

type SenderDomainInput = {
    authenticationState: SignalDeskSenderDomainSummary["authenticationState"];
    bounceRate: number;
    brandRisk: SignalDeskSenderDomainSummary["brandRisk"];
    complaintRate: number;
    domain: string;
    provider?: SignalDeskProviderId;
    status: SignalDeskSenderDomainSummary["status"];
    unsubscribeReady: boolean;
    volumeRampState: SignalDeskSenderDomainSummary["volumeRampState"];
};

type ConnectorSettingInput = {
    appId?: string;
    connectorKind: SignalDeskConnectorKind;
    displayName: string;
    fromName?: string;
    instagramPageId?: string;
    messengerPageId?: string;
    notes?: string;
    phoneNumber?: string;
    phoneNumberId?: string;
    replyToEmail?: string;
    senderDomain?: string;
    senderEmail?: string;
    status: SignalDeskConnectorSettingSummary["status"];
};

type SelfServiceCtaInput = {
    copy: string;
    ctaType: SignalDeskSelfServiceCtaSummary["ctaType"];
    label: string;
    status: SignalDeskSelfServiceCtaSummary["status"];
};

type DailyGrowthMissionInput = {
    day?: string;
    marketPodId?: string;
};

type GrowthMissionReviewInput = {
    growthMissionId: string;
    ownerDecision: SignalDeskGrowthMissionSummary["ownerDecision"];
    ownerDecisionNote?: string;
    status?: SignalDeskGrowthMissionSummary["status"];
};

type ExperimentCardInput = {
    channel: SignalDeskExperimentCardSummary["channel"];
    contentAssetId?: string;
    ctaId?: string;
    expectedOutcome: string;
    hypothesis: string;
    marketPodId?: string;
    proofAssetSummary?: string;
    sourcePolicyId?: string;
    status?: SignalDeskExperimentCardSummary["status"];
    stopRule: string;
    targetCount: number;
};

type ExperimentReviewInput = {
    experimentCardId: string;
    ownerDecision: SignalDeskExperimentCardSummary["ownerDecision"];
    resultSummary?: string;
    status?: SignalDeskExperimentCardSummary["status"];
};

type OfferCtaInput = {
    activationSurface: SignalDeskOfferCtaSummary["activationSurface"];
    approvedAsk: string;
    blockedClaims: string[];
    ctaId?: string;
    marketPodId?: string;
    offerCtaId?: string;
    proofMatchRule: string;
    segment: SignalDeskOfferCtaSummary["segment"];
    status: SignalDeskOfferCtaSummary["status"];
    title: string;
};

type ReplyPlaybookInput = {
    approvedReply: string;
    escalationRequired: boolean;
    intent: SignalDeskReplyPlaybookSummary["intent"];
    nextRoute: SignalDeskReplyPlaybookSummary["nextRoute"];
    playbookId?: string;
    status: SignalDeskReplyPlaybookSummary["status"];
    suppressionRequired: boolean;
    title: string;
};

type SourceQualitySnapshotInput = {
    sourcePolicyId?: string;
    sourceRunId?: string;
};

type ResearchAgentInput = {
    city?: string;
    country?: string;
    idempotencyKey?: string;
    maxResults: number;
    marketPodId?: string;
    prompt: string;
    provider?: SignalDeskResearchProviderId;
    researchType: SignalDeskResearchRunSummary["researchType"];
    sourcePolicyId?: string;
};

type EnrichmentWaterfallRunInput = {
    targetId: string;
    waterfallId: string;
};

type SequencerHandoffInput = {
    approvalId: string;
    provider: SignalDeskSequencerHandoffSummary["provider"];
    senderDomainId?: string;
};

type OwnedSequenceStepInput = {
    sequencerHandoffId: string;
};

type TrustPartnerProfileInput = {
    audienceFitScore: number;
    baselineReachScore: number;
    believableUsageScore: number;
    channel: SignalDeskTrustPartnerProfileSummary["channel"];
    commentQualityScore: number;
    displayName: string;
    geography?: string;
    partnerType: SignalDeskTrustPartnerType;
    sourceNotes: string;
    status?: SignalDeskTrustPartnerProfileSummary["status"];
    trustFeelScore: number;
};

type TrustPartnerNicheTestInput = {
    angle: string;
    intendedAttempts: number;
    marketPodId?: string;
    nicheName: string;
    partnerIds: string[];
};

type TrustPartnerBriefInput = {
    approvedClaims: string[];
    bannedClaims: string[];
    ctaId?: string;
    dealId?: string;
    disclosureText: string;
    onePageBrief: string;
    partnerId: string;
};

type TrustPartnerDealInput = {
    approvalStatus: "approved" | "rejected" | "blocked";
    budgetPolicyId?: string;
    deliverableCount: number;
    dueDate?: string;
    flatFeeUsd: number;
    founderApproved: boolean;
    nicheTestId?: string;
    partnerId: string;
    pricingModel: SignalDeskTrustPartnerDealSummary["pricingModel"];
};

type TrustPartnerDeliverableInput = {
    dealId?: string;
    disclosurePresent: boolean;
    dueDate?: string;
    partnerId: string;
    postUrl?: string;
    reviewState: SignalDeskTrustPartnerDeliverableSummary["reviewState"];
    status: SignalDeskTrustPartnerDeliverableSummary["status"];
};

type TrustPartnerMetricsInput = {
    activations: number;
    commentQuality: SignalDeskConfidence;
    comments: number;
    currentListSubmissions: number;
    deliverableId?: string;
    ownerLeads: number;
    partnerId: string;
    views: number;
};

type TrustPartnerRenewalInput = {
    evidenceSummary: string;
    nicheTestId?: string;
    ownerDecision?: NonNullable<SignalDeskTrustPartnerRenewalDecisionSummary["ownerDecision"]>;
    partnerId: string;
    recommendation: SignalDeskTrustPartnerRenewalDecisionSummary["recommendation"];
};

type ContentAudience = SignalDeskContentSourceSummary["defaultAudience"];

type ContentSourceInput = {
    contentSourceId?: string;
    defaultAudience: ContentAudience;
    defaultMarketPodId?: string;
    sourceType: SignalDeskContentSourceType;
    sourceUrl?: string;
    status: SignalDeskControlStatus;
    title: string;
};

type ContentAssetInput = {
    canonicalMessage: string;
    contentAssetId?: string;
    ctaId?: string;
    marketPodId?: string;
    primaryAudience: ContentAudience;
    proofLevel: SignalDeskContentAssetSummary["proofLevel"];
    proofPermissionId?: string;
    proofScopes: SignalDeskProofPermissionScope[];
    riskNotes: string[];
    sourceId?: string;
    sourceNotes?: string;
    sourceType: SignalDeskContentSourceType;
    sourceUrl?: string;
    status?: SignalDeskContentAssetSummary["status"];
    title: string;
};

type ProofPermissionInput = {
    evidenceRef: string;
    expiresAt?: string;
    grantedAt?: string;
    notes?: string;
    proofPermissionId?: string;
    scopes: SignalDeskProofPermissionScope[];
    status: SignalDeskProofPermissionSummary["status"];
    targetId: string;
};

type ContentDistributionDraftInput = {
    channels: SignalDeskContentChannel[];
    contentAssetId: string;
};

type ContentDraftReviewInput = {
    approvalStatus: SignalDeskContentDistributionDraftSummary["approvalStatus"];
    contentDraftId: string;
    reviewReason?: string;
};

type ContentDraftScheduleInput = {
    contentDraftId: string;
    scheduledFor?: string;
    status?: Extract<SignalDeskContentDistributionDraftSummary["status"], "queued" | "approved" | "hold">;
};

type ContentPerformanceInput = {
    activations: number;
    channel: SignalDeskContentChannel;
    clicks: number;
    contentAssetId: string;
    contentDraftId?: string;
    currentListSubmissions: number;
    engagementQuality: SignalDeskConfidence;
    ownerLeads: number;
    views: number;
};

type RevenueAccountQualificationInput = {
    locationType: SignalDeskRevenueAccountSummary["locationType"];
    organizationName?: string;
    targetId: string;
};

type CommercialOpportunityInput = {
    commercialOfferId?: string;
    expectedCloseAt?: string;
    founderAttentionMinutes: number;
    nextAction: string;
    nextActionDueAt?: string;
    opportunityId: string;
    probabilityPercent: number;
    stage: SignalDeskCommercialOpportunitySummary["stage"];
    stalledReason?: string;
    status: SignalDeskCommercialOpportunitySummary["status"];
    valueMinor: number;
    winLossReason?: string;
};

type CommercialOfferInput = {
    allowedDiscountBps: number;
    billingCadence: SignalDeskCommercialOfferSummary["billingCadence"];
    commercialOfferId?: string;
    contents: string[];
    currency: string;
    eligibilitySummary: string;
    founderApprovalConditions: string[];
    name: string;
    offerCtaId?: string;
    priceMinor: number;
    status: SignalDeskCommercialOfferSummary["status"];
    version: number;
};

type OperatingEnvelopeInput = {
    budgetPolicyId?: string;
    channel: SignalDeskOperatingEnvelopeSummary["channel"];
    commercialOfferId: string;
    dailyVolumeCap: number;
    expiresAt: string;
    fallbackAction: SignalDeskOperatingEnvelopeSummary["fallbackAction"];
    marketPodId: string;
    maxCostUsd: number;
    name: string;
    operatingEnvelopeId?: string;
    requestedApprovalMode: SignalDeskOperatingEnvelopeSummary["requestedApprovalMode"];
    senderDomainId?: string;
    sourcePolicyIds: string[];
    startsAt: string;
    status: SignalDeskOperatingEnvelopeSummary["status"];
    stopConditions: string[];
    templateIds: string[];
    totalVolumeCap: number;
    version: number;
};

type ActivationWatchInput = {
    targetId: string;
};

type ManualContactInput = {
    idempotencyKey: string;
    note?: string;
    occurredAt: string;
    result: SignalDeskManualContactResult;
    route: SignalDeskManualContactRoute;
    sourcePolicyId: string;
    targetId: string;
};

type OutcomeInput = {
    channel: SignalDeskOutcomeSummary["channel"];
    evidenceRef?: string;
    idempotencyKey?: string;
    integrityStatus?: NonNullable<SignalDeskOutcomeSummary["integrityStatus"]>;
    outcomeType: SignalDeskOutcomeSummary["outcomeType"];
    ownerQualifiedAt?: string;
    ownerReviewedAt?: string;
    source: SignalDeskOutcomeSummary["source"];
    sourceEventId?: string;
    surfaces?: NonNullable<SignalDeskOutcomeSummary["surfaces"]>;
    targetId?: string;
    routeTokenValidation?: {
        routeTokenHash: string;
        routeTokenId: string;
    };
};

type RouteTokenInput = {
    actionId?: string;
    channel: SignalDeskOutcomeSummary["channel"];
    ctaId?: string;
    targetId: string;
    templateId?: string;
};

type RouteTokenRevocationInput = {
    reason: string;
    routeTokenId: string;
};

const LIST_LIMIT = 30;
const SIGNALDESK_PROVIDER_BUDGET_BLOCKED_REASON = "provider_budget_blocked";
const SIGNALDESK_RESEARCH_AGENT_BLOCKED_REASON = "research_agent_blocked";

const getSignalDeskDb = () => {
    if (!isSignalDeskFirebaseConfigured && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const db = signaldeskFirestoreAdmin as any;
    return db && typeof db.collection === "function" ? signaldeskFirestoreAdmin : null;
};

const now = () => admin.firestore.Timestamp.now();
const increment = (value: number) => admin.firestore.FieldValue.increment(value);

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const isAlreadyExistsError = (error: unknown) => {
    const code = (error as { code?: unknown } | null)?.code;
    return code === 6 || code === "6" || code === "already-exists" || code === "ALREADY_EXISTS";
};

const normalizeText = (value?: string | null) => (value || "").trim();
const normalizeLower = (value?: string | null) => normalizeText(value).toLowerCase();
const normalizeUrl = (value?: string | null) => normalizeLower(value).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const todayKey = () => new Date().toISOString().slice(0, 10);
const env = (key: string) => process.env[key]?.trim() || "";
const operatingLayerEnabled = () => FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER === true;
const revenueOperatingLayerEnabled = () => FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER === true;
const MANUAL_CONTACT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MANUAL_CONTACT_FUTURE_SKEW_MS = 5 * 60 * 1000;
const APPROVAL_REJECTION_REASONS = new Set<SignalDeskApprovalRejectionReason>([
    "evidence-weak-or-stale",
    "identity-uncertain",
    "no-customer-truth-gap",
    "contact-route-not-allowed",
    "already-solved",
    "wrong-segment",
    "duplicate",
    "other",
]);

const toIso = (value: any): string | null => {
    if (!value) return null;
    const date = typeof value?.toDate === "function"
        ? value.toDate()
        : typeof value?.seconds === "number"
            ? new Date(value.seconds * 1000)
            : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toPlain = (value: any): any => {
    if (!value) return value ?? null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value?.toDate === "function" || typeof value?.seconds === "number") return toIso(value);
    if (Array.isArray(value)) return value.map(toPlain);
    if (typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toPlain(nested)]));
    }
    return value;
};

const sanitizeForFirestore = (value: unknown) => sanitizeFirestoreValue(value, {
    dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
});

const emptyWorkspace = (section: SignalDeskSection): SignalDeskWorkspaceData => ({
    activationOpportunities: [],
    activationWatches: [],
    aiVolumeRuns: [],
    aiWorkerRuns: [],
    approvalPackets: [],
    audienceSegments: [],
    budgetPolicies: [],
    channelWindows: [],
    channelHealth: [],
    approvals: [],
    auditEvents: [],
    conversations: [],
    connectorSettings: [],
    contentAssets: [],
    contentCalendarItems: [],
    contentDistributionDrafts: [],
    contentPerformanceSummaries: [],
    contentSources: [],
    commercialOffers: [],
    commercialOpportunities: [],
    demandSignals: [],
    drafts: [],
    enrichmentResults: [],
    enrichmentWaterfalls: [],
    evidencePackets: [],
    experimentCards: [],
    growthMissions: [],
    imports: [],
    marketPods: [],
    modelEvals: [],
    modelRoutes: [],
    outcomes: [],
    offerCtas: [],
    operatingEnvelopes: [],
    policies: [],
    proofPermissions: [],
    providerAccounts: [],
    providerEvaluations: [],
    providerEvents: [],
    providerRuns: [],
    providerSourceRetentions: [],
    researchRuns: [],
    researchTableRows: [],
    runTimelines: [],
    scores: [],
    section,
    selfServiceCtas: [],
    senderDomains: [],
    sequencerHandoffs: [],
    sequencerSteps: [],
    strategistMemos: [],
    replyPlaybooks: [],
    revenueAccounts: [],
    revenueControlSummaries: [],
    sourceQualitySnapshots: [],
    targets: [],
    teamMembers: [],
    templates: [],
    trustPartnerBriefs: [],
    trustPartnerDeals: [],
    trustPartnerDeliverables: [],
    trustPartnerMetrics: [],
    trustPartnerNicheTests: [],
    trustPartnerProfiles: [],
    trustPartnerRenewalDecisions: [],
    vendorRuns: [],
});

const readList = async <T>(db: any, collection: string, orderField = "updatedAt", limit = LIST_LIMIT): Promise<T[]> => {
    const snap = await db.collection(collection).orderBy(orderField, "desc").limit(limit).get();
    return snap.docs.map((doc: any) => ({ ...toPlain(doc.data()), [`${collection}DocId`]: doc.id })) as T[];
};

const readRecentByTarget = async <T>(db: any, collection: string, targetId: string, limit = 1): Promise<T[]> => {
    const snap = await db.collection(collection).where("targetId", "==", targetId).orderBy("updatedAt", "desc").limit(limit).get();
    return snap.docs.map((doc: any) => toPlain(doc.data())) as T[];
};

const appendAudit = (
    db: any,
    batch: any,
    access: SignalDeskAccessContext,
    action: string,
    entityType: string,
    entityId: string | null,
    reason?: string,
) => {
    const auditRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS).doc();
    batch.set(auditRef, sanitizeForFirestore({
        auditEventId: auditRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        actorId: access.userId,
        actorRole: access.role,
        action,
        entityType,
        entityId,
        reason: reason || null,
        createdAt: now(),
    }));
};

const updateControlSummary = (db: any, batch: any, updates: AnyRecord) => {
    batch.set(
        db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM),
        sanitizeForFirestore({ ...updates, updatedAt: now() }),
        { merge: true },
    );
};

const updateQueueSummary = (db: any, batch: any, updates: AnyRecord) => {
    batch.set(
        db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES),
        sanitizeForFirestore(updates),
        { merge: true },
    );
};

const updateDailyCost = (db: any, batch: any, writes: number, aiCost = 0, providerCost = 0) => {
    batch.set(
        db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(todayKey()),
        sanitizeForFirestore({
            aiCostEstimate: increment(aiCost),
            firestoreWriteEstimate: increment(writes),
            providerCostEstimate: increment(providerCost),
            updatedAt: now(),
        }),
        { merge: true },
    );
};

const requireDb = () => {
    const db = getSignalDeskDb();
    if (!db) throw new Error("SignalDesk Firebase is not configured");
    return db;
};

const requireOperatingLayer = () => {
    if (!operatingLayerEnabled()) throw new Error("SignalDesk Operating Layer is disabled");
};

const requireRevenueOperatingLayer = () => {
    if (!revenueOperatingLayerEnabled()) throw new Error("SignalDesk Revenue Operating Layer is disabled");
};

const requireNoActiveKillSwitch = async (db: any, scope: string, message: string) => {
    const killSwitchSnap = await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${scope}`).get();
    if (killSwitchSnap.data()?.status === "active") throw new Error(message);
};

const resolveAllowedUse = (policy?: Pick<SignalDeskSourcePolicy, "allowedUse"> | null) => ({
    contact: policy?.allowedUse?.contact === true,
    evidence: policy?.allowedUse?.evidence === true,
    import: policy?.allowedUse?.import !== false && policy?.allowedUse?.evidence === true,
    personalization: policy?.allowedUse?.personalization === true,
    providerRun: policy?.allowedUse?.providerRun !== false && policy?.allowedUse?.evidence === true,
    storage: policy?.allowedUse?.storage !== false && policy?.allowedUse?.evidence === true,
});

const toTimestampMillis = (value: any): number | null => {
    if (!value) return null;
    const date = typeof value?.toDate === "function"
        ? value.toDate()
        : typeof value?.seconds === "number"
            ? new Date(value.seconds * 1000)
            : new Date(value);
    const millis = date.getTime();
    return Number.isFinite(millis) ? millis : null;
};

const getSourcePolicyExpiryMillis = (policy?: SignalDeskSourcePolicy | null) => {
    if (!policy) return null;
    const explicitExpiry = toTimestampMillis((policy as AnyRecord).expiresAt);
    if (explicitExpiry) return explicitExpiry;
    const anchor = toTimestampMillis((policy as AnyRecord).approvedAt || (policy as AnyRecord).createdAt);
    const retentionDays = numberOrZero(policy.retentionDays);
    if (!anchor || retentionDays <= 0) return null;
    return anchor + (Math.max(1, Math.min(365, Math.floor(retentionDays))) * 24 * 60 * 60 * 1000);
};

const isSourcePolicyExpired = (policy?: SignalDeskSourcePolicy | null) => {
    const expiryMillis = getSourcePolicyExpiryMillis(policy);
    return Boolean(expiryMillis && expiryMillis <= Date.now());
};

type SourcePolicyUse =
    | "approval"
    | "contact"
    | "draft"
    | "evidence"
    | "export"
    | "handoff"
    | "import"
    | "provider-run"
    | "retention-refresh"
    | "send"
    | "sequence"
    | "storage";

type SourcePolicyAssertionOptions = {
    entityId?: string | null;
    requiredProvider?: SignalDeskProviderId;
    requiredSourceType?: SignalDeskSourcePolicy["sourceType"];
    use: SourcePolicyUse;
};

const SOURCE_POLICY_EXPIRED = "SOURCE_POLICY_EXPIRED";
const SOURCE_POLICY_REVIEW_REQUIRED = "SOURCE_POLICY_REVIEW_REQUIRED";
const SOURCE_POLICY_RETENTION_MISSING = "SOURCE_POLICY_RETENTION_MISSING";
const SOURCE_POLICY_USE_NOT_ALLOWED = "SOURCE_POLICY_USE_NOT_ALLOWED";
const SIGNALDESK_ACTIVATION_WATCH_AUTO_SYNC_FAILED = "signaldesk_activation_watch_auto_sync_failed";
const SIGNALDESK_INTERESTED_REPLY_REVENUE_SYNC_FAILED = "signaldesk_interested_reply_revenue_sync_failed";
const SIGNALDESK_RESEARCH_SOURCE_POLICY_SCAN_FAILED = "signaldesk_research_source_policy_scan_failed";

const sourcePolicyUseAllowed = (policy: SignalDeskSourcePolicy, use: SourcePolicyUse) => {
    const allowed = resolveAllowedUse(policy);
    if (use === "contact" || use === "export" || use === "handoff" || use === "send" || use === "sequence") {
        return use === "contact"
            ? allowed.contact
            : allowed.contact && allowed.evidence && allowed.personalization;
    }
    if (use === "draft" || use === "approval") return allowed.evidence && allowed.personalization;
    if (use === "import") return allowed.import;
    if (use === "provider-run") return allowed.providerRun;
    if (use === "storage" || use === "retention-refresh") return allowed.storage && allowed.evidence;
    return allowed.evidence;
};

const sourcePolicyHasActiveBlock = (policy: SignalDeskSourcePolicy) => (
    policy.status === "blocked"
    || (policy as AnyRecord).blockStatus === "active"
    || (policy as AnyRecord).suppressionStatus === "active"
);

const sourcePolicyHasCompleteRights = (policy: SignalDeskSourcePolicy) => (
    Boolean(policy.accessMethod)
    && Boolean(normalizeText(policy.policyOwner))
    && Boolean(toTimestampMillis(policy.lastReviewedAt))
    && Array.isArray(policy.allowedFields)
    && policy.allowedFields.length > 0
    && Array.isArray(policy.blockedFields)
    && Array.isArray(policy.attributionRequirements)
    && Array.isArray(policy.prohibitedUses)
    && policy.prohibitedUses.length > 0
    && Boolean(policy.rawPayloadPolicy)
    && Boolean(policy.refreshMethod)
    && Boolean(normalizeText(policy.termsUrl) || normalizeText(policy.notes))
);

const sourcePolicyAllowsField = (policy: SignalDeskSourcePolicy, field: string) => {
    const normalizedField = normalizeLower(field);
    const blocked = new Set((policy.blockedFields || []).map(normalizeLower));
    const allowed = new Set((policy.allowedFields || []).map(normalizeLower));
    return !blocked.has(normalizedField) && allowed.has(normalizedField);
};

const sourcePolicyUsabilityError = (
    policy: SignalDeskSourcePolicy | null | undefined,
    options: SourcePolicyAssertionOptions,
): string | null => {
    if (!policy || (policy.status !== "active" && policy.status !== "approved")) {
        return SOURCE_POLICY_REVIEW_REQUIRED;
    }
    if (!policy.sourceType) return SOURCE_POLICY_REVIEW_REQUIRED;
    if (sourcePolicyHasActiveBlock(policy)) return SOURCE_POLICY_USE_NOT_ALLOWED;
    if (options.requiredSourceType && policy.sourceType !== options.requiredSourceType) {
        return SOURCE_POLICY_USE_NOT_ALLOWED;
    }
    if (policy.sourceType === "provider") {
        const provider = (policy as AnyRecord).provider;
        if (options.requiredProvider && provider && provider !== options.requiredProvider) return SOURCE_POLICY_USE_NOT_ALLOWED;
        if (options.requiredProvider && !provider) return SOURCE_POLICY_REVIEW_REQUIRED;
    }
    if (numberOrZero(policy.retentionDays) <= 0) return SOURCE_POLICY_RETENTION_MISSING;
    const expiryMillis = getSourcePolicyExpiryMillis(policy);
    if (!expiryMillis) return SOURCE_POLICY_REVIEW_REQUIRED;
    if (expiryMillis <= Date.now()) return SOURCE_POLICY_EXPIRED;
    if (!sourcePolicyHasCompleteRights(policy)) return SOURCE_POLICY_REVIEW_REQUIRED;
    if (!sourcePolicyUseAllowed(policy, options.use)) return SOURCE_POLICY_USE_NOT_ALLOWED;
    return null;
};

const getSourcePolicyState = (policy?: SignalDeskSourcePolicy | null, nowMillis = Date.now()): NonNullable<SignalDeskSourcePolicy["policyState"]> => {
    if (!policy || policy.status === "review_required" || policy.status === "inactive" || sourcePolicyHasActiveBlock(policy)) return "review_required";
    if (numberOrZero(policy.retentionDays) <= 0) return "review_required";
    const expiryMillis = getSourcePolicyExpiryMillis(policy);
    if (!expiryMillis) return "review_required";
    if (expiryMillis <= nowMillis) return "expired";
    if (!sourcePolicyHasCompleteRights(policy)) return "review_required";
    return expiryMillis - nowMillis <= 14 * 24 * 60 * 60 * 1000 ? "expires_soon" : "active";
};

const annotateSourcePolicy = (policy: SignalDeskSourcePolicy): SignalDeskSourcePolicy => ({
    ...policy,
    policyState: getSourcePolicyState(policy),
});

const annotateOperatingEnvelope = (
    envelope: SignalDeskOperatingEnvelopeSummary,
    nowMillis = Date.now(),
): SignalDeskOperatingEnvelopeSummary => {
    const expiryMillis = toTimestampMillis(envelope.expiresAt);
    if (!expiryMillis || expiryMillis > nowMillis) return envelope;
    return {
        ...envelope,
        executionState: "held",
        status: "expired",
    };
};

const annotateActivationWatch = (
    watch: SignalDeskActivationWatchSummary,
    nowMillis = Date.now(),
): SignalDeskActivationWatchSummary => {
    if (watch.status === "activated" || watch.status === "stalled" || watch.status === "not-started") return watch;
    const deadlineMillis = toTimestampMillis(watch.deadlineAt);
    if (!deadlineMillis || deadlineMillis >= nowMillis) return watch;
    return {
        ...watch,
        nextAction: "Review the stalled MenuList route without changing MenuList truth.",
        status: "stalled",
    };
};

const appendSourcePolicyBlockedAudit = async (
    db: any,
    access: SignalDeskAccessContext,
    policy: SignalDeskSourcePolicy | null | undefined,
    options: SourcePolicyAssertionOptions,
    code: string,
) => {
    const batch = db.batch();
    appendAudit(
        db,
        batch,
        access,
        "source_policy_block",
        "sourcePolicy",
        policy?.sourcePolicyId || options.entityId || null,
        `${code}:${options.use}`,
    );
    await batch.commit();
};

const assertSourcePolicyUsable = async (
    db: any,
    access: SignalDeskAccessContext,
    policy: SignalDeskSourcePolicy | null | undefined,
    options: SourcePolicyAssertionOptions,
) => {
    const fail = async (code: string): Promise<never> => {
        await appendSourcePolicyBlockedAudit(db, access, policy, options, code);
        throw new Error(code);
    };
    const errorCode = sourcePolicyUsabilityError(policy, options);
    if (errorCode) return fail(errorCode);
    return policy;
};

const readSourcePolicy = async (db: any, sourcePolicyId?: string | null): Promise<SignalDeskSourcePolicy | null> => {
    if (!sourcePolicyId) return null;
    const policySnap = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(sourcePolicyId).get();
    if (!policySnap.exists) return null;
    return toPlain(policySnap.data()) as SignalDeskSourcePolicy;
};

const numberOrZero = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const nonNegativeInteger = (value: unknown) => Math.max(0, Math.round(numberOrZero(value)));
const ratio = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : 0;

const annotateModelEvalSummary = (modelEval: SignalDeskModelEvalSummary): SignalDeskModelEvalSummary => {
    const sampleSize = nonNegativeInteger(modelEval.sampleSize);
    const reviewedSampleSize = nonNegativeInteger(modelEval.reviewedSampleSize);
    const hasCumulativeRunCounts = modelEval.passedSampleCount !== undefined || modelEval.rejectedFactSampleCount !== undefined;
    const hasCumulativeReviewCounts = modelEval.reviewedSampleSize !== undefined;
    const passedSampleCount = modelEval.passedSampleCount !== undefined
        ? nonNegativeInteger(modelEval.passedSampleCount)
        : Math.min(sampleSize, nonNegativeInteger(numberOrZero(modelEval.passRate) * sampleSize));
    const rejectedFactSampleCount = modelEval.rejectedFactSampleCount !== undefined
        ? nonNegativeInteger(modelEval.rejectedFactSampleCount)
        : Math.min(sampleSize, nonNegativeInteger(numberOrZero(modelEval.rejectedFactRate) * sampleSize));
    const acceptedCount = nonNegativeInteger(modelEval.acceptedCount);
    const editedCount = nonNegativeInteger(modelEval.editedCount);
    const rejectedCount = nonNegativeInteger(modelEval.rejectedCount);
    const heldCount = nonNegativeInteger(modelEval.heldCount);

    return {
        ...modelEval,
        acceptedCount,
        acceptanceRate: hasCumulativeReviewCounts ? ratio(acceptedCount, reviewedSampleSize) : numberOrZero(modelEval.acceptanceRate),
        editRate: hasCumulativeReviewCounts ? ratio(editedCount, reviewedSampleSize) : numberOrZero(modelEval.editRate),
        editedCount,
        founderAttentionMinutes: nonNegativeInteger(modelEval.founderAttentionMinutes),
        heldCount,
        holdRate: hasCumulativeReviewCounts ? ratio(heldCount, reviewedSampleSize) : numberOrZero(modelEval.holdRate),
        lowConfidenceCount: modelEval.lowConfidenceCount !== undefined
            ? nonNegativeInteger(modelEval.lowConfidenceCount)
            : Math.max(0, sampleSize - passedSampleCount),
        passRate: hasCumulativeRunCounts ? ratio(passedSampleCount, sampleSize) : numberOrZero(modelEval.passRate),
        passedSampleCount,
        rejectedCount,
        rejectedFactRate: hasCumulativeRunCounts ? ratio(rejectedFactSampleCount, sampleSize) : numberOrZero(modelEval.rejectedFactRate),
        rejectedFactSampleCount,
        rejectionRate: hasCumulativeReviewCounts ? ratio(rejectedCount, reviewedSampleSize) : numberOrZero(modelEval.rejectionRate),
        reviewedSampleSize,
        sampleSize,
    };
};

const providerAccountIdFor = (provider: SignalDeskProviderId, use: SignalDeskProviderUse) => `provider_${provider}_${use}`;
const budgetPolicyIdFor = (scope: SignalDeskBudgetPolicySummary["scope"], provider?: SignalDeskProviderId | null, scopeId?: string | null) => [
    "budget",
    scope,
    provider || "all",
    scopeId || "default",
].join("_");
const offerCtaIdFor = (input: Pick<OfferCtaInput, "activationSurface" | "segment" | "title">) => `offer_cta_${hashValue([
    input.segment,
    input.activationSurface,
    normalizeLower(input.title),
].join("|")).slice(0, 16)}`;
const replyPlaybookIdFor = (input: Pick<ReplyPlaybookInput, "intent" | "title">) => `reply_playbook_${hashValue([
    input.intent,
    normalizeLower(input.title),
].join("|")).slice(0, 16)}`;
const experimentCardIdFor = (input: Pick<ExperimentCardInput, "channel" | "hypothesis" | "marketPodId">) => `experiment_${hashValue([
    input.marketPodId || "global",
    input.channel,
    normalizeLower(input.hypothesis),
].join("|")).slice(0, 16)}`;
const sourceQualitySnapshotIdFor = (input: SourceQualitySnapshotInput) => `source_quality_${hashValue([
    input.sourceRunId || "latest",
    input.sourcePolicyId || "any",
    todayKey(),
].join("|")).slice(0, 16)}`;
const researchRunIdFor = (input: Pick<ResearchAgentInput, "city" | "country" | "maxResults" | "prompt" | "provider" | "researchType">) => `research_${hashValue([
    normalizeLower(input.prompt),
    normalizeLower(input.city),
    normalizeLower(input.country),
    input.provider || "auto",
    input.researchType,
    input.maxResults,
    Date.now(),
].join("|")).slice(0, 22)}`;
const researchRowIdFor = (researchRunId: string, targetId: string, index: number) => `research_row_${hashValue([
    researchRunId,
    targetId || index,
].join("|")).slice(0, 22)}`;
const growthMissionIdFor = (day: string) => `growth_mission_${day.replace(/[^a-z0-9_-]/gi, "_")}`;
const revenueAccountIdFor = (targetId: string) => `revenue_account_${hashValue(targetId).slice(0, 22)}`;
const opportunityIdFor = (revenueAccountId: string) => `opportunity_${hashValue(revenueAccountId).slice(0, 22)}`;
const organizationIdFor = (name: string) => `organization_${hashValue(normalizeLower(name)).slice(0, 22)}`;
const commercialOfferIdFor = (name: string, version: number) => `commercial_offer_${hashValue(normalizeLower(name)).slice(0, 16)}_v${version}`;
const operatingEnvelopeIdFor = (name: string, version: number) => `operating_envelope_${hashValue(normalizeLower(name)).slice(0, 16)}_v${version}`;
const activationWatchIdFor = (targetId: string) => `activation_watch_${hashValue(targetId).slice(0, 22)}`;

const readProviderAccount = async (
    db: any,
    provider: SignalDeskProviderId,
    use: SignalDeskProviderUse,
): Promise<SignalDeskProviderAccountSummary | null> => {
    const snap = await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc(providerAccountIdFor(provider, use)).get();
    return snap.exists ? toPlain(snap.data()) as SignalDeskProviderAccountSummary : null;
};

const readBudgetPolicy = async (
    db: any,
    scope: SignalDeskBudgetPolicySummary["scope"],
    provider?: SignalDeskProviderId | null,
    scopeId?: string | null,
): Promise<SignalDeskBudgetPolicySummary | null> => {
    const snap = await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(budgetPolicyIdFor(scope, provider, scopeId)).get();
    return snap.exists ? toPlain(snap.data()) as SignalDeskBudgetPolicySummary : null;
};

const requireProviderBudget = async (
    db: any,
    params: {
        enforcePerRunBudget?: boolean;
        estimatedCostUsd: number;
        provider: SignalDeskProviderId;
        use: SignalDeskProviderUse;
    },
) => {
    const account = await readProviderAccount(db, params.provider, params.use);
    if (!account) throw new Error("Provider account is not registered");
    if (!account.ownerApproved || account.status === "blocked" || account.status === "disabled") {
        throw new Error("Provider account is not approved");
    }
    if (account.credentialState === "missing") throw new Error("Provider account credentials are not configured");
    if (params.enforcePerRunBudget !== false && params.estimatedCostUsd > numberOrZero(account.perRunBudgetUsd)) {
        throw new Error("Provider per-run budget exceeded");
    }
    if (numberOrZero(account.spentTodayUsd) + params.estimatedCostUsd > numberOrZero(account.dailyBudgetUsd)) {
        throw new Error("Provider daily budget exceeded");
    }
    if (numberOrZero(account.spentMonthUsd) + params.estimatedCostUsd > numberOrZero(account.monthlyBudgetUsd)) {
        throw new Error("Provider monthly budget exceeded");
    }

    const providerBudget = await readBudgetPolicy(db, "provider", params.provider);
    if (providerBudget && providerBudget.status !== "active") throw new Error("Provider budget policy is not active");
    if (providerBudget && params.enforcePerRunBudget !== false && params.estimatedCostUsd > numberOrZero(providerBudget.perRunBudgetUsd)) {
        throw new Error("Provider per-run budget exceeded");
    }
    if (providerBudget && numberOrZero(providerBudget.spentTodayUsd) + params.estimatedCostUsd > numberOrZero(providerBudget.dailyBudgetUsd)) {
        throw new Error("Provider daily budget exceeded");
    }
    if (providerBudget && numberOrZero(providerBudget.spentMonthUsd) + params.estimatedCostUsd > numberOrZero(providerBudget.monthlyBudgetUsd)) {
        throw new Error("Provider monthly budget exceeded");
    }

    return { account, providerBudget };
};

const writeProviderSpend = (
    db: any,
    batch: any,
    params: {
        costUsd: number;
        provider: SignalDeskProviderId;
        use: SignalDeskProviderUse;
    },
) => {
    if (!params.costUsd) return;
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc(providerAccountIdFor(params.provider, params.use)), sanitizeForFirestore({
        spentTodayUsd: increment(params.costUsd),
        spentMonthUsd: increment(params.costUsd),
        updatedAt: now(),
    }), { merge: true });
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(budgetPolicyIdFor("provider", params.provider)), sanitizeForFirestore({
        spentTodayUsd: increment(params.costUsd),
        spentMonthUsd: increment(params.costUsd),
        updatedAt: now(),
    }), { merge: true });
};

const readTargetPriorGuard = async (db: any, target: SignalDeskTargetSummary) => {
    const reasons: string[] = [];
    if (target.suppressionStatus !== "clear") reasons.push(`Suppression is ${target.suppressionStatus}.`);
    if (target.status === "contacted" || target.status === "replied" || target.status === "converted") {
        reasons.push(`Target status is ${target.status}.`);
    }
    if (target.latestOutcomeAt) reasons.push("Target already has a MenuList outcome.");
    if (target.latestConversationId) {
        const conversationSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(target.latestConversationId).get();
        if (conversationSnap.exists) {
            const conversation = conversationSnap.data() as AnyRecord;
            if (conversation.state && conversation.state !== "new") reasons.push(`Conversation state is ${conversation.state}.`);
        }
    }
    return {
        clear: reasons.length === 0,
        reasons,
    };
};

const requireNoPriorSpendBlock = async (db: any, target: SignalDeskTargetSummary) => {
    const guard = await readTargetPriorGuard(db, target);
    if (!guard.clear) throw new Error("Target has prior contact or outcome");
    return guard;
};

const writeRunTimeline = (
    db: any,
    batch: any,
    params: {
        entityId: string;
        entityType: SignalDeskRunTimelineSummary["entityType"];
        label: string;
        status: SignalDeskRunTimelineSummary["status"];
        steps: SignalDeskRunTimelineSummary["steps"];
        timelineId?: string;
    },
) => {
    const timelineRef = db.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES).doc(params.timelineId || `${params.entityType}_${params.entityId}`);
    batch.set(timelineRef, sanitizeForFirestore({
        runTimelineId: timelineRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        entityType: params.entityType,
        entityId: params.entityId,
        label: params.label,
        status: params.status,
        steps: params.steps,
        updatedAt: now(),
    }), { merge: true });
    return timelineRef.id;
};

const readDefaultCta = async (db: any): Promise<SignalDeskSelfServiceCtaSummary | null> => {
    const ctaSnap = await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).where("status", "==", "active").limit(1).get();
    return ctaSnap.docs[0] ? toPlain(ctaSnap.docs[0].data()) as SignalDeskSelfServiceCtaSummary : null;
};

const readReadySenderDomain = async (db: any, senderDomainId?: string | null): Promise<SignalDeskSenderDomainSummary | null> => {
    if (senderDomainId) {
        const snap = await db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS).doc(senderDomainId).get();
        return snap.exists ? toPlain(snap.data()) as SignalDeskSenderDomainSummary : null;
    }
    const snap = await db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS).where("status", "==", "active").limit(1).get();
    return snap.docs[0] ? toPlain(snap.docs[0].data()) as SignalDeskSenderDomainSummary : null;
};

const isSenderDomainReady = (sender: SignalDeskSenderDomainSummary | null) => Boolean(
    sender &&
    sender.status === "active" &&
    sender.authenticationState === "ready" &&
    sender.unsubscribeReady &&
    sender.brandRisk !== "high",
);

const isEmailChannelReady = () => getSignalDeskChannelReadiness().email.configured;

const estimateSourceProviderCostUsd = (provider: SourceProviderRunInput["provider"], maxResults: number) => {
    if (provider === "fhrs-fhis") return 0;
    if (provider === "apify") return Math.min(0.3, Math.max(0.05, Math.min(Math.max(maxResults, 1), 30) * 0.01));
    return 0.05;
};

const sequenceStepIdFor = (sequencerHandoffId: string, stepNumber: number) => `${sequencerHandoffId}_step_${stepNumber}`;

const isTimestampDue = (value: any) => {
    const iso = toIso(value);
    if (!iso) return true;
    return new Date(iso).getTime() <= Date.now();
};

const secretState = (value: string, notRequired = false): SignalDeskConnectorSecretState => {
    if (notRequired) return "not_required";
    return value ? "configured" : "missing";
};

const connectorIdFor = (input: ConnectorSettingInput) => {
    const key = [
        input.connectorKind,
        normalizeLower(input.senderEmail),
        normalizeLower(input.phoneNumberId),
        normalizeLower(input.instagramPageId),
        normalizeLower(input.messengerPageId),
        normalizeLower(input.displayName),
    ].filter(Boolean).join("|") || input.connectorKind;
    return `connector_${input.connectorKind}_${hashValue(key).slice(0, 18)}`;
};

const readinessFromMissing = (required: Array<[string, string]>): {
    missingEnv: string[];
    readiness: SignalDeskConnectorReadiness;
} => {
    const missingEnv = required.filter(([, value]) => !value).map(([label]) => label);
    const configured = required.length - missingEnv.length;
    return {
        missingEnv,
        readiness: missingEnv.length === 0 ? "ready" : configured > 0 ? "partial" : "missing",
    };
};

const resolveConnectorRuntime = (input: ConnectorSettingInput) => {
    const emailReadiness = getSignalDeskChannelReadiness().email;
    if (input.connectorKind === "email-smtp") {
        const required = [
            [SIGNALDESK_INTEGRATION_ENV.SMTP_HOST, env(SIGNALDESK_INTEGRATION_ENV.SMTP_HOST)],
            [SIGNALDESK_INTEGRATION_ENV.SMTP_USER, env(SIGNALDESK_INTEGRATION_ENV.SMTP_USER)],
            [SIGNALDESK_INTEGRATION_ENV.SMTP_PASS, env(SIGNALDESK_INTEGRATION_ENV.SMTP_PASS)],
            [SIGNALDESK_INTEGRATION_ENV.EMAIL_FROM, env(SIGNALDESK_INTEGRATION_ENV.EMAIL_FROM)],
            [SIGNALDESK_INTEGRATION_ENV.PHYSICAL_ADDRESS, env(SIGNALDESK_INTEGRATION_ENV.PHYSICAL_ADDRESS)],
            [SIGNALDESK_INTEGRATION_ENV.UNSUBSCRIBE_URL, env(SIGNALDESK_INTEGRATION_ENV.UNSUBSCRIBE_URL)],
        ] as Array<[string, string]>;
        const readiness = readinessFromMissing(required);
        return {
            accessTokenState: secretState("", true),
            apiKeyState: secretState("", true),
            appSecretState: secretState("", true),
            channel: "email" as const,
            envReadiness: emailReadiness.configured ? "ready" as const : readiness.readiness,
            missingEnv: emailReadiness.configured ? [] : readiness.missingEnv,
            provider: "smtp" as const,
            smtpCredentialState: secretState(
                env(SIGNALDESK_INTEGRATION_ENV.SMTP_HOST) &&
                env(SIGNALDESK_INTEGRATION_ENV.SMTP_USER) &&
                env(SIGNALDESK_INTEGRATION_ENV.SMTP_PASS),
            ),
            webhookSecretState: secretState(env(SIGNALDESK_INTEGRATION_ENV.EMAIL_WEBHOOK_SECRET)),
        };
    }

    if (input.connectorKind === "smartlead") {
        const readiness = readinessFromMissing([
            [SIGNALDESK_INTEGRATION_ENV.SMARTLEAD_API_KEY, env(SIGNALDESK_INTEGRATION_ENV.SMARTLEAD_API_KEY)],
            [SIGNALDESK_INTEGRATION_ENV.SMARTLEAD_WEBHOOK_SECRET, env(SIGNALDESK_INTEGRATION_ENV.SMARTLEAD_WEBHOOK_SECRET)],
        ]);
        return {
            accessTokenState: secretState("", true),
            apiKeyState: secretState(env(SIGNALDESK_INTEGRATION_ENV.SMARTLEAD_API_KEY)),
            appSecretState: secretState("", true),
            channel: "sequencer" as const,
            envReadiness: readiness.readiness,
            missingEnv: readiness.missingEnv,
            provider: "smartlead" as const,
            smtpCredentialState: secretState("", true),
            webhookSecretState: secretState(env(SIGNALDESK_INTEGRATION_ENV.SMARTLEAD_WEBHOOK_SECRET)),
        };
    }

    if (input.connectorKind === "apify") {
        const readiness = readinessFromMissing([
            [SIGNALDESK_INTEGRATION_ENV.APIFY_API_TOKEN, env(SIGNALDESK_INTEGRATION_ENV.APIFY_API_TOKEN)],
            [SIGNALDESK_INTEGRATION_ENV.APIFY_SOURCE_ACTOR_ID, env(SIGNALDESK_INTEGRATION_ENV.APIFY_SOURCE_ACTOR_ID)],
            [SIGNALDESK_INTEGRATION_ENV.APIFY_WEBHOOK_SECRET, env(SIGNALDESK_INTEGRATION_ENV.APIFY_WEBHOOK_SECRET)],
        ]);
        return {
            accessTokenState: secretState("", true),
            apiKeyState: secretState(env(SIGNALDESK_INTEGRATION_ENV.APIFY_API_TOKEN)),
            appSecretState: secretState("", true),
            channel: "source" as const,
            envReadiness: readiness.readiness,
            missingEnv: readiness.missingEnv,
            provider: "apify" as const,
            smtpCredentialState: secretState("", true),
            webhookSecretState: secretState(env(SIGNALDESK_INTEGRATION_ENV.APIFY_WEBHOOK_SECRET)),
        };
    }

    const channel = input.connectorKind === "meta-whatsapp"
        ? "whatsapp"
        : input.connectorKind === "meta-instagram"
            ? "instagram"
            : "messenger";
    const channelEnv = channel === "whatsapp"
        ? SIGNALDESK_INTEGRATION_ENV.WHATSAPP_PHONE_NUMBER_ID
        : channel === "instagram"
            ? SIGNALDESK_INTEGRATION_ENV.INSTAGRAM_PAGE_ID
            : SIGNALDESK_INTEGRATION_ENV.MESSENGER_PAGE_ID;
    const readiness = readinessFromMissing([
        [SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN, env(SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN)],
        [SIGNALDESK_INTEGRATION_ENV.META_APP_SECRET, env(SIGNALDESK_INTEGRATION_ENV.META_APP_SECRET)],
        [SIGNALDESK_INTEGRATION_ENV.META_VERIFY_TOKEN, env(SIGNALDESK_INTEGRATION_ENV.META_VERIFY_TOKEN)],
        [channelEnv, env(channelEnv)],
    ]);
    return {
        accessTokenState: secretState(env(SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN)),
        apiKeyState: secretState("", true),
        appSecretState: secretState(env(SIGNALDESK_INTEGRATION_ENV.META_APP_SECRET)),
        channel,
        envReadiness: readiness.readiness,
        missingEnv: readiness.missingEnv,
        provider: "meta" as const,
        smtpCredentialState: secretState("", true),
        webhookSecretState: secretState(env(SIGNALDESK_INTEGRATION_ENV.META_VERIFY_TOKEN)),
    };
};

const channelHealthStatusForConnector = (
    status: SignalDeskConnectorSettingSummary["status"],
    readiness: SignalDeskConnectorReadiness,
): SignalDeskChannelHealthSummary["status"] => {
    if (status === "blocked") return "warning";
    if (status === "hold" || status === "inactive") return "paused";
    if (readiness === "ready") return "healthy";
    if (readiness === "partial") return "warning";
    return "not_configured";
};

const buildApprovalPacketSummary = async (
    db: any,
    input: {
        approval?: SignalDeskApprovalItem | null;
        cta?: SignalDeskSelfServiceCtaSummary | null;
        draft?: SignalDeskDraftSummary | null;
        evidence?: SignalDeskEvidencePacketSummary | null;
        target: SignalDeskTargetSummary;
    },
): Promise<Omit<SignalDeskApprovalPacketSummary, "approvalPacketId" | "updatedAt">> => {
    const sender = await readReadySenderDomain(db);
    const sourcePolicy = await readSourcePolicy(db, input.target.sourcePolicyId);
    const sourcePolicyState = getSourcePolicyState(sourcePolicy);
    const priorGuard = await readTargetPriorGuard(db, input.target);
    const blockedReasons = [
        ...priorGuard.reasons,
        sourcePolicyState === "expired" ? "Source policy is expired." : "",
        sourcePolicyState === "review_required" ? "Source policy review is required." : "",
        sourcePolicyState === "expires_soon" ? "Source policy expires soon." : "",
        input.evidence ? "" : "Evidence packet is missing.",
        input.draft ? "" : "Draft is missing.",
        isSenderDomainReady(sender) ? "" : "Sender domain is not ready.",
    ].filter(Boolean);
    const recommendedAction: SignalDeskApprovalPacketSummary["recommendedAction"] = blockedReasons.length
        ? "hold"
        : input.target.segment === "a" || input.target.segment === "b"
            ? "approve"
            : "hold";
    return {
        approvalId: input.approval?.approvalId || null,
        targetId: input.target.targetId,
        targetName: input.target.displayName,
        status: input.approval?.status === "approved"
            ? "approved"
            : input.approval?.status === "rejected"
                ? "rejected"
                : recommendedAction === "hold"
                    ? "held"
                    : "pending",
        evidencePacketId: input.evidence?.evidencePacketId || null,
        sourcePolicyId: input.target.sourcePolicyId || null,
        suppressionStatus: input.target.suppressionStatus,
        channelReadiness: isSenderDomainReady(sender) ? "ready" : "not_ready",
        costImpactUsd: 0,
        riskSummary: blockedReasons.join(" ") || "Evidence, suppression, sender, and prior-contact guards are clear.",
        recommendedAction,
        ctaId: input.cta?.ctaId || null,
    };
};

const readModelRoute = async (db: any, task: SignalDeskAiTask): Promise<SignalDeskModelRouteSummary | null> => {
    const snap = await db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc(`model_route_${task}`).get();
    return snap.exists ? toPlain(snap.data()) as SignalDeskModelRouteSummary : null;
};

const resolveModelRouteForTask = async (db: any, task: SignalDeskAiTask) => {
    const route = await readModelRoute(db, task);
    if (!route || route.status !== "active") throw new Error("SignalDesk AI route is not active");
    if (route.defaultProvider !== "gemini") throw new Error("SignalDesk AI route provider is not enabled");
    const routeCostCapUsd = numberOrZero(route.maxCostUsd);
    if (routeCostCapUsd <= 0) throw new Error("Provider per-run budget exceeded");
    const estimatedCostUsd = Math.min(routeCostCapUsd, 0.05);
    await requireProviderBudget(db, {
        estimatedCostUsd,
        provider: route.defaultProvider,
        use: "ai",
    });
    return { estimatedCostUsd, route };
};

const providerUseForWaterfall = (
    provider: SignalDeskProviderId,
    requestedField: SignalDeskEnrichmentWaterfallSummary["requestedField"],
): SignalDeskProviderUse => {
    if (provider === "hunter" || provider === "zerobounce") return "verification";
    if (provider === "firecrawl" || provider === "tavily" || provider === "exa") return "research";
    if (requestedField === "evidence" || requestedField === "website") return "research";
    return "enrichment";
};

const previewSensitiveValue = (value: string) => {
    if (!value) return null;
    if (value.includes("@")) {
        const [local, domain] = value.split("@");
        return `${local.slice(0, 2)}***@${domain || "domain"}`;
    }
    if (/^\+?\d[\d\s-]+$/.test(value)) return `${value.slice(0, 4)}***${value.slice(-2)}`;
    return value.length > 36 ? `${value.slice(0, 33)}...` : value;
};

const getExistingEnrichmentValue = (
    target: SignalDeskTargetSummary,
    targetDetail: AnyRecord,
    requestedField: SignalDeskEnrichmentWaterfallSummary["requestedField"],
) => {
    if (requestedField === "email") return normalizeLower(targetDetail.email);
    if (requestedField === "phone") return normalizeText(targetDetail.phone).replace(/[^\d+]/g, "");
    if (requestedField === "website") return normalizeText(target.website || targetDetail.website);
    if (requestedField === "company") return normalizeText(target.displayName);
    return "";
};

const expiresAtForRetention = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + Math.max(1, Math.min(365, Math.floor(numberOrZero(days) || 30))));
    return admin.firestore.Timestamp.fromDate(date);
};

const timestampAfterDays = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return admin.firestore.Timestamp.fromDate(date);
};

const timestampFromIsoOrDefault = (value: string | undefined, defaultDays: number) => {
    const parsed = value ? new Date(value) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) return admin.firestore.Timestamp.fromDate(parsed);
    return timestampAfterDays(defaultDays);
};

const firstDayOfWeekKey = (value?: string) => {
    const parsed = value ? new Date(value) : new Date();
    const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const day = date.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setUTCDate(date.getUTCDate() + diff);
    return date.toISOString().slice(0, 10);
};

const trustPartnerRailEnabled = () => Boolean(FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL);

const requireTrustPartnerRail = () => {
    if (!trustPartnerRailEnabled()) throw new Error("Trust Partner Rail is disabled");
};

const contentDistributionRailEnabled = () => Boolean(FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL);

const requireContentDistributionRail = () => {
    if (!contentDistributionRailEnabled()) throw new Error("Content Distribution Rail is disabled");
};

const trustPartnerIdFor = (displayName: string, channel: string) => (
    `partner_${hashValue(`${normalizeLower(displayName)}|${channel}`).slice(0, 18)}`
);

const contentSourceIdFor = (title: string, sourceType: string, sourceUrl?: string | null) => (
    `content_source_${hashValue(`${normalizeLower(title)}|${sourceType}|${normalizeUrl(sourceUrl)}`).slice(0, 18)}`
);

const contentAssetIdFor = (title: string, sourceUrl?: string | null) => (
    `content_asset_${hashValue(`${normalizeLower(title)}|${normalizeUrl(sourceUrl)}`).slice(0, 18)}`
);

const proofPermissionIdFor = (targetId: string) => (
    `proof_permission_${hashValue(targetId).slice(0, 22)}`
);

const PUBLIC_PROOF_SCOPES = new Set<SignalDeskProofPermissionScope>([
    "business-name",
    "logo",
    "quotation",
    "before-after-screenshots",
    "public-case-study",
    "partner-material",
]);

const isProofPermissionActive = (permission?: SignalDeskProofPermissionSummary | null) => {
    if (!permission || permission.status !== "active") return false;
    const expiresAt = toTimestampMillis(permission.expiresAt);
    if (expiresAt && expiresAt <= Date.now()) return false;
    return true;
};

const isProofPermissionUsable = (
    permission?: SignalDeskProofPermissionSummary | null,
    requiredScopes: SignalDeskProofPermissionScope[] = [],
) => {
    if (!isProofPermissionActive(permission)) return false;
    const requestedScopes = Array.from(new Set(requiredScopes));
    if (!requestedScopes.length) return false;
    const grantedScopes = new Set(permission!.scopes);
    return requestedScopes.every((scope) => PUBLIC_PROOF_SCOPES.has(scope) && grantedScopes.has(scope));
};

const readProofPermission = async (db: any, proofPermissionId?: string | null): Promise<SignalDeskProofPermissionSummary | null> => {
    if (!proofPermissionId) return null;
    const snap = await db.collection(SIGNALDESK_COLLECTIONS.PROOF_PERMISSIONS).doc(proofPermissionId).get();
    return snap.exists ? toPlain(snap.data()) as SignalDeskProofPermissionSummary : null;
};

const contentChannelLabel = (channel: SignalDeskContentChannel) => {
    if (channel === "x") return "X";
    if (channel === "partner-brief") return "Partner brief";
    if (channel === "short-video") return "Short video";
    return channel.charAt(0).toUpperCase() + channel.slice(1);
};

const contentDraftIdFor = (contentAssetId: string, channel: SignalDeskContentChannel) => (
    `content_draft_${hashValue(`${contentAssetId}|${channel}`).slice(0, 24)}`
);

const contentCalendarItemIdFor = (contentDraftId: string) => `content_calendar_${contentDraftId}`;

const buildContentDraftCopy = (
    asset: SignalDeskContentAssetSummary,
    channel: SignalDeskContentChannel,
    cta: SignalDeskSelfServiceCtaSummary | null,
) => {
    const ctaCopy = cta?.copy || "I can send a private MenuList preview for your team to inspect.";
    const proof = asset.proofLevel === "customer-proof"
        ? "customer proof"
        : asset.proofLevel === "market-research"
            ? "market signal"
            : asset.proofLevel === "internal-note"
                ? "internal operating note"
                : "owned MenuList proof";
    const hook = channel === "email"
        ? `${asset.title}: a cleaner current-list path`
        : channel === "short-video"
            ? `Show the before and after: ${asset.title}`
            : `${asset.title} for restaurant owners`;
    const bodyByChannel: Record<SignalDeskContentChannel, string> = {
        blog: `${asset.canonicalMessage}\n\nUse this as a short internal blog outline backed by ${proof}. Close with: ${ctaCopy}`,
        email: `${asset.canonicalMessage}\n\nIf this is useful, ${ctaCopy}`,
        linkedin: `${asset.canonicalMessage}\n\nWhy it matters: owners need a current list customers can trust without extra admin.\n\n${ctaCopy}`,
        newsletter: `${asset.canonicalMessage}\n\nOperator note: keep the proof specific, avoid broad claims, and route interested owners to the private preview.`,
        other: `${asset.canonicalMessage}\n\nCTA: ${ctaCopy}`,
        "partner-brief": `Partner angle: explain ${asset.title} in your own voice. Use only this claim: ${asset.canonicalMessage}. Required CTA: ${ctaCopy}`,
        "short-video": `Opening shot: stale or hard-to-find menu.\nMiddle: current-list proof.\nClose: ${ctaCopy}`,
        x: `${asset.canonicalMessage}\n\n${ctaCopy}`,
    };
    return {
        body: bodyByChannel[channel],
        hook,
        title: `${contentChannelLabel(channel)}: ${asset.title}`,
    };
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(numberOrZero(value))));

const computeTrustScore = (input: Pick<TrustPartnerProfileInput, "audienceFitScore" | "baselineReachScore" | "believableUsageScore" | "commentQualityScore" | "trustFeelScore">) => (
    Math.round((
        clampScore(input.audienceFitScore) +
        clampScore(input.baselineReachScore) +
        clampScore(input.believableUsageScore) +
        clampScore(input.commentQualityScore) +
        clampScore(input.trustFeelScore)
    ) / 5)
);

const channelWindowIdFor = (
    channel: SignalDeskChannelWindowStateSummary["channel"],
    targetId?: string | null,
) => `window_${channel}_${targetId || "global"}`;

const isChannelWindowEligible = (windowState: SignalDeskChannelWindowStateSummary | null) => {
    if (!windowState || !windowState.eligibleForHandoff || windowState.status !== "open") return false;
    if (!windowState.expiresAt) return true;
    return new Date(windowState.expiresAt).getTime() > Date.now();
};

const recommendationFromTrustOutcomes = (metrics: SignalDeskTrustPartnerMetricSummary[]): SignalDeskTrustPartnerRenewalDecisionSummary["recommendation"] => {
    const ownerLeads = metrics.reduce((sum, metric) => sum + numberOrZero(metric.ownerLeads), 0);
    const submissions = metrics.reduce((sum, metric) => sum + numberOrZero(metric.currentListSubmissions), 0);
    const activations = metrics.reduce((sum, metric) => sum + numberOrZero(metric.activations), 0);
    if (activations > 0 || submissions > 0) return "renew";
    if (ownerLeads > 0) return "retest";
    return "cut";
};

const computeTargetIdentity = (row: TargetImportRow, options: { includeContact: boolean }) => {
    const email = options.includeContact ? normalizeLower(row.email) : "";
    const phone = options.includeContact ? normalizeText(row.phone).replace(/[^\d+]/g, "") : "";
    const website = normalizeUrl(row.website);
    const base = [
        normalizeLower(row.displayName),
        normalizeLower(row.city),
        normalizeLower(row.country),
        email,
        phone,
        website,
    ].filter(Boolean).join("|");
    return hashValue(base || normalizeLower(row.displayName));
};

const classifyContactability = (row: TargetImportRow) => {
    if (normalizeText(row.email)) return "ready" as const;
    if (normalizeText(row.phone) || normalizeText(row.instagram) || normalizeText(row.website)) return "limited" as const;
    return "missing" as const;
};

const inferOpportunity = (row: TargetImportRow): SignalDeskTargetSummary["primaryOpportunity"] => {
    if (!normalizeText(row.currentListUrl)) return "missing-current-list";
    if (normalizeText(row.instagram) && !normalizeText(row.website)) return "instagram-only";
    if (/pdf/i.test(normalizeText(row.currentListUrl))) return "pdf-only";
    return "unknown";
};

const inferResearchCategory = (prompt: string) => {
    const text = normalizeLower(prompt);
    if (/\b(cafe|cafes|coffee)\b/.test(text)) return "cafe";
    if (/\b(dessert|bakery|bakeries|sweet)\b/.test(text)) return "dessert";
    if (/\b(takeaway|takeout|cloud kitchen|cloud-kitchen|quick service|qsr)\b/.test(text)) return "quick-service restaurant";
    if (/\b(consultant|photographer|agency|freelancer|creator|partner)\b/.test(text)) return "restaurant partner";
    if (/\b(bar|pub|nightlife)\b/.test(text)) return "bar";
    if (/\b(restaurant|restaurants|food)\b/.test(text)) return "restaurant";
    return "restaurant";
};

const inferResearchLocation = (prompt: string, city?: string, country?: string) => {
    const cityInput = normalizeText(city);
    const countryInput = normalizeText(country);
    if (cityInput || countryInput) return { city: cityInput || null, country: countryInput || null };
    const match = normalizeText(prompt).match(/\bin\s+([^,.]+?)(?:\s+(?:with|who|that|where|having|and)\b|$)/i);
    const inferred = match?.[1]?.trim() || "";
    return { city: inferred || null, country: null };
};

const selectResearchProvider = (
    input: Pick<ResearchAgentInput, "country" | "provider" | "researchType">,
): SignalDeskResearchProviderId => {
    if (input.provider) return input.provider;
    if (normalizeLower(input.country).includes("uk") || normalizeLower(input.country).includes("united kingdom")) return "fhrs-fhis";
    if (input.researchType === "partner-list") return "google-places";
    return "google-places";
};

const buildResearchProviderQuery = (input: {
    category: string;
    city?: string | null;
    prompt: string;
    researchType: SignalDeskResearchRunSummary["researchType"];
}) => {
    const city = normalizeText(input.city);
    if (input.researchType === "partner-list") {
        return normalizeText(`restaurant consultants menu photographers ${city}`.trim()).slice(0, 180);
    }
    const category = normalizeText(input.category || "restaurants");
    return normalizeText(city ? `${category} in ${city}` : category).slice(0, 180) || normalizeText(input.prompt).slice(0, 180);
};

const researchColumnsFor = (researchType: SignalDeskResearchRunSummary["researchType"]) => {
    const base = [
        "business",
        "category",
        "location",
        "website",
        "current-list-gap",
        "contactability",
        "source-ref",
        "fit-decision",
        "next-action",
    ];
    return researchType === "partner-list"
        ? ["partner", "partner-type", "location", "source-ref", "trust-fit", "fit-decision", "next-action"]
        : base;
};

const readUsableResearchSourcePolicy = async (
    db: any,
    access: SignalDeskAccessContext,
    provider: SignalDeskResearchProviderId,
    sourcePolicyId?: string,
) => {
    if (sourcePolicyId) {
        const policy = await readSourcePolicy(db, sourcePolicyId);
        return assertSourcePolicyUsable(db, access, policy, {
            entityId: sourcePolicyId,
            requiredProvider: provider,
            requiredSourceType: "provider",
            use: "provider-run",
        });
    }
    const snap = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES)
        .where("sourceType", "==", "provider")
        .where("provider", "==", provider)
        .limit(20)
        .get();
    let rejectedPolicyCount = 0;
    for (const doc of snap.docs) {
        const policy = toPlain(doc.data()) as SignalDeskSourcePolicy;
        try {
            return await assertSourcePolicyUsable(db, access, policy, {
                entityId: doc.id,
                requiredProvider: provider,
                requiredSourceType: "provider",
                use: "provider-run",
            });
        } catch {
            rejectedPolicyCount += 1;
            // Keep searching for a usable provider policy.
        }
    }
    logRuntimeFailure(SIGNALDESK_RESEARCH_SOURCE_POLICY_SCAN_FAILED, new Error(SIGNALDESK_RESEARCH_SOURCE_POLICY_SCAN_FAILED), {
        candidatePolicyCount: snap.docs.length,
        product: "signaldesk",
        provider,
        rejectedPolicyCount,
    });
    throw new Error("Provider source policy is required");
};

const buildResearchRow = (input: {
    index: number;
    provider: SignalDeskResearchProviderId;
    providerRecordUrl?: string | null;
    researchRunId: string;
    researchType: SignalDeskResearchRunSummary["researchType"];
    sourcePolicyId?: string | null;
    sourcePolicy?: SignalDeskSourcePolicy | null;
    sourceRunId?: string | null;
    target: SignalDeskTargetSummary;
}): SignalDeskResearchTableRowSummary => {
    const category = normalizeLower(input.target.category);
    const foodFit = /(restaurant|cafe|coffee|dessert|bakery|takeaway|bar|pub|food|menu|service)/.test(category);
    const partnerFit = /(consultant|photographer|agency|freelancer|creator|partner|operator)/.test(category);
    const isPartner = input.researchType === "partner-list";
    const currentListGap = input.target.primaryOpportunity;
    const gapStrong = currentListGap === "missing-current-list" || currentListGap === "pdf-only" || currentListGap === "instagram-only" || currentListGap === "no-link";
    const suppressed = input.target.suppressionStatus !== "clear";
    const policyState = getSourcePolicyState(input.sourcePolicy);
    const contactUseAllowed = Boolean(
        input.sourcePolicy
        && policyState !== "expired"
        && policyState !== "review_required"
        && sourcePolicyUseAllowed(input.sourcePolicy, "contact")
    );
    const fitScore = clampScore(
        (isPartner ? (partnerFit ? 72 : 48) : (foodFit ? 72 : 42)) +
        (gapStrong ? 18 : 5) +
        (input.target.contactability === "ready" ? 8 : input.target.contactability === "limited" ? 5 : 0) -
        (suppressed ? 60 : 0),
    );
    const fitDecision: SignalDeskResearchTableRowSummary["fitDecision"] = suppressed || fitScore < 45
        ? "fail"
        : fitScore >= 72
            ? "pass"
            : "unsure";
    const routePermissionState: SignalDeskResearchTableRowSummary["routePermissionState"] = suppressed
        ? "blocked"
        : policyState === "expired"
            ? "expired"
            : policyState === "review_required"
                ? "review_required"
                : contactUseAllowed
                    ? "permissioned"
                    : "research_only";
    const permissionedReferral = input.sourcePolicy?.accessMethod === "permissioned-referral";
    const hardGateFailures = [
        suppressed ? `suppression:${input.target.suppressionStatus}` : "",
        policyState === "expired" ? "source-policy-expired" : "",
        policyState === "review_required" ? "source-policy-review-required" : "",
        !contactUseAllowed ? "contact-use-not-allowed" : "",
        input.target.contactability === "blocked" ? "contactability-blocked" : "",
        input.target.contactability === "missing" && !permissionedReferral ? "contact-route-missing" : "",
        input.target.contactability === "limited" && !permissionedReferral ? "contact-route-unverified" : "",
    ].filter(Boolean);
    const allowedRoute: SignalDeskResearchTableRowSummary["allowedRoute"] = fitDecision === "fail"
        || routePermissionState !== "permissioned"
        || input.target.contactability === "blocked"
        || (input.target.contactability === "missing" && !permissionedReferral)
        ? "none"
        : permissionedReferral
            ? "partner-intro"
            : input.target.contactability === "ready"
                ? "email-export"
                : "none";
    const actionabilityState: SignalDeskResearchTableRowSummary["actionabilityState"] = fitDecision === "fail" || suppressed
        ? "blocked"
        : allowedRoute !== "none"
            ? "actionable"
            : routePermissionState === "research_only"
                ? "research_only"
                : "verify";
    const recommendedNextAction: SignalDeskResearchTableRowSummary["recommendedNextAction"] = fitDecision === "pass"
        ? isPartner ? "partner-review" : "score"
        : fitDecision === "unsure"
            ? isPartner ? "pod-review" : "evidence"
            : "hold";
    const recommendedChannel: NonNullable<SignalDeskResearchTableRowSummary["recommendedChannel"]> = allowedRoute === "none" ? "hold" : allowedRoute;
    const allowedRouteReason = allowedRoute !== "none"
        ? `Source policy permits contact and the ${allowedRoute} route is available.`
        : routePermissionState === "research_only"
            ? "This source may support research and evidence, but it does not grant contact permission."
            : routePermissionState === "expired"
                ? "The source policy expired; review is required before any action."
                : routePermissionState === "review_required"
                    ? "The source-rights record is incomplete or due for review."
                    : suppressed
                        ? "The identity is suppressed and cannot be contacted."
                        : "No allowed, verified contact route is available.";
    const recommendedCta = isPartner
        ? "Ask for a trusted introduction to owners who need one current customer-ready menu link."
        : currentListGap === "pdf-only"
            ? "Offer a private preview that turns the PDF menu into one mobile current link for QR, WhatsApp, Google/Profile, and Instagram."
            : currentListGap === "instagram-only"
                ? "Offer a private preview that keeps Instagram for discovery but gives customers one reviewed current menu link."
                : currentListGap === "missing-current-list" || currentListGap === "no-link"
                    ? "Offer one reviewed current menu link for QR, WhatsApp, Google/Profile, Instagram, and repeat customers."
                    : currentListGap === "stale-menu"
                        ? "Offer a reviewed current-menu refresh so old links and images stop spreading."
                        : "Use only evidence-backed current-list wording and ask for a private MenuList preview.";
    const recommendedMessageAngle = isPartner
        ? "Trusted local operator intro, not follower-count influencer outreach."
        : currentListGap === "pdf-only"
            ? "Your menu exists, but it is trapped in a file that is hard to update and share on mobile."
            : currentListGap === "instagram-only"
                ? "Instagram is useful for discovery, but it should not be the only current menu source."
                : currentListGap === "missing-current-list" || currentListGap === "no-link"
                    ? "Customers can find the business, but need one current menu link they can open and share."
                    : currentListGap === "stale-menu"
                        ? "A reviewed current MenuList preview can reduce outdated customer-facing menu drift."
                        : "MenuList can prepare a reviewed current-list preview before anything is published.";
    const sourceRefs = [
        input.sourceRunId ? `source-run:${input.sourceRunId}` : "",
        input.sourcePolicyId ? `source-policy:${input.sourcePolicyId}` : "",
        input.providerRecordUrl || "",
    ].filter(Boolean);
    const sourceRef = sourceRefs[0] || null;
    const evidenceSummary = [
        gapStrong ? `current-list gap:${currentListGap}` : `current-list gap needs review:${currentListGap}`,
        input.target.website ? "website present" : "website missing/unknown",
        `contactability:${input.target.contactability}`,
        `route-permission:${routePermissionState}`,
        sourceRefs.length ? "source refs attached" : "source refs missing",
    ].join("; ");

    return {
        category: input.target.category || null,
        city: input.target.city || null,
        contactability: input.target.contactability,
        country: input.target.country || null,
        currentListGap,
        displayName: input.target.displayName,
        evidenceSummary,
        enrichment: [
            {
                key: "website",
                label: "Website",
                sourceRef,
                value: input.target.website || "missing",
                verdict: input.target.website ? "pass" : "unsure",
            },
            {
                key: "current-list-gap",
                label: "Current-list gap",
                sourceRef,
                value: currentListGap,
                verdict: gapStrong ? "pass" : "unsure",
            },
            {
                key: "contactability",
                label: "Contactability",
                sourceRef,
                value: input.target.contactability,
                verdict: input.target.contactability === "blocked" ? "fail" : input.target.contactability === "missing" ? "unsure" : "pass",
            },
            {
                key: "source-transparency",
                label: "Source transparency",
                sourceRef,
                value: sourceRefs.join(" | ") || "missing",
                verdict: sourceRefs.length ? "pass" : "fail",
            },
        ],
        fitDecision,
        fitScore,
        actionabilityState,
        allowedRoute,
        allowedRouteReason,
        hardGateFailures,
        provider: input.provider,
        providerRecordUrl: input.providerRecordUrl || null,
        recommendedChannel,
        recommendedCta,
        recommendedMessageAngle,
        recommendedNextAction,
        researchRowId: researchRowIdFor(input.researchRunId, input.target.targetId, input.index),
        researchRunId: input.researchRunId,
        routePermissionState,
        sourcePolicyId: input.sourcePolicyId || null,
        sourceRefs,
        sourceRunId: input.sourceRunId || null,
        targetId: input.target.targetId,
        updatedAt: null,
        website: input.target.website || null,
    };
};

const revalidateResearchRowRoute = (
    row: SignalDeskResearchTableRowSummary,
    policy?: SignalDeskSourcePolicy | null,
    target?: SignalDeskTargetSummary | null,
): SignalDeskResearchTableRowSummary => {
    const policyState = getSourcePolicyState(policy);
    const suppressed = Boolean(target && target.suppressionStatus !== "clear");
    const contactAllowed = Boolean(
        policy
        && !suppressed
        && policyState !== "expired"
        && policyState !== "review_required"
        && sourcePolicyUseAllowed(policy, "contact")
    );
    const routePermissionState: SignalDeskResearchTableRowSummary["routePermissionState"] = suppressed
        ? "blocked"
        : policyState === "expired"
        ? "expired"
        : policyState === "review_required"
            ? "review_required"
            : contactAllowed
                ? "permissioned"
                : "research_only";
    const intendedRoute: SignalDeskResearchTableRowSummary["allowedRoute"] = policy?.accessMethod === "permissioned-referral"
        ? "partner-intro"
        : row.contactability === "ready"
            ? "email-export"
            : "none";
    const allowedRoute: SignalDeskResearchTableRowSummary["allowedRoute"] = row.fitDecision !== "fail"
        && contactAllowed
        && row.contactability !== "blocked"
        && (row.contactability !== "missing" || policy?.accessMethod === "permissioned-referral")
        ? intendedRoute
        : "none";
    const hardGateFailures = Array.from(new Set([
        ...(row.hardGateFailures || []).filter((failure) => (
            !failure.startsWith("source-policy-")
            && failure !== "contact-use-not-allowed"
            && failure !== "contact-route-missing"
            && failure !== "contact-route-unverified"
        )),
        suppressed ? `suppression:${target?.suppressionStatus}` : "",
        policyState === "expired" ? "source-policy-expired" : "",
        policyState === "review_required" ? "source-policy-review-required" : "",
        !contactAllowed ? "contact-use-not-allowed" : "",
        row.contactability === "missing" && policy?.accessMethod !== "permissioned-referral" ? "contact-route-missing" : "",
        row.contactability === "limited" && policy?.accessMethod !== "permissioned-referral" ? "contact-route-unverified" : "",
    ].filter(Boolean)));
    const actionabilityState: SignalDeskResearchTableRowSummary["actionabilityState"] = row.fitDecision === "fail"
        ? "blocked"
        : allowedRoute !== "none"
            ? "actionable"
            : routePermissionState === "research_only"
                ? "research_only"
                : "verify";
    return {
        ...row,
        actionabilityState,
        allowedRoute,
        allowedRouteReason: allowedRoute !== "none"
            ? `Current source policy permits contact through ${allowedRoute}.`
            : suppressed
                ? "The identity is suppressed and no contact action is allowed."
            : routePermissionState === "research_only"
                ? "Research and evidence use are allowed, but contact use is not."
                : routePermissionState === "expired"
                    ? "The source policy expired; no contact action is allowed."
                    : "The source-rights record requires review before any contact action.",
        hardGateFailures,
        recommendedChannel: allowedRoute === "none" ? "hold" : allowedRoute,
        routePermissionState,
    };
};

const isVerifiedTwoSurfaceOutcome = (outcome: SignalDeskOutcomeSummary) => (
    outcome.outcomeType === "two_surface_activation"
    && (outcome.integrityStatus === "owner-reviewed-manual" || outcome.integrityStatus === "menulist-signed")
    && Boolean(outcome.ownerQualifiedAt)
    && Boolean(outcome.ownerReviewedAt)
    && Boolean(outcome.evidenceRef)
    && new Set(outcome.surfaces || []).size >= 2
);

const deriveActivationOpportunities = (workspace: SignalDeskWorkspaceData): SignalDeskActivationOpportunitySummary[] => {
    const policies = new Map(workspace.policies.map((policy) => [policy.sourcePolicyId, policy]));
    const rowsByTarget = new Map(workspace.researchTableRows.filter((row) => row.targetId).map((row) => [row.targetId as string, row]));
    const conversationsByTarget = new Map(workspace.conversations.map((conversation) => [conversation.targetId, conversation]));
    const outcomesByTarget = new Map<string, SignalDeskOutcomeSummary[]>();
    workspace.outcomes.forEach((outcome) => {
        if (!outcome.targetId) return;
        outcomesByTarget.set(outcome.targetId, [...(outcomesByTarget.get(outcome.targetId) || []), outcome]);
    });
    const nowMillis = Date.now();
    return workspace.targets.map((target) => {
        const policy = target.sourcePolicyId ? policies.get(target.sourcePolicyId) : null;
        const policyState = getSourcePolicyState(policy);
        const researchRow = rowsByTarget.get(target.targetId);
        const routeRow = researchRow ? revalidateResearchRowRoute(researchRow, policy, target) : null;
        const conversation = conversationsByTarget.get(target.targetId);
        const outcomes = outcomesByTarget.get(target.targetId) || [];
        const activation = outcomes.find(isVerifiedTwoSurfaceOutcome);
        const projectedActivationSurfaces = Array.from(new Set(target.latestVerifiedActivationSurfaces || []));
        const hasProjectedActivation = Boolean(
            target.latestVerifiedActivationAt
            && target.latestVerifiedActivationEvidenceRef
            && (target.latestVerifiedActivationIntegrityStatus === "owner-reviewed-manual" || target.latestVerifiedActivationIntegrityStatus === "menulist-signed")
            && projectedActivationSurfaces.length >= 2
        );
        const activationStart = outcomes.find((outcome) => outcome.outcomeType === "upload_started" || outcome.outcomeType === "preview_prepared");
        const ownerQualifiedAt = target.ownerQualifiedAt
            || activation?.ownerQualifiedAt
            || outcomes.find((outcome) => outcome.ownerQualifiedAt)?.ownerQualifiedAt
            || (conversation?.state === "interested" ? conversation.lastInboundAt : null);
        const ownerQualifiedMillis = toTimestampMillis(ownerQualifiedAt);
        const activationDeadlineAt = ownerQualifiedMillis ? new Date(ownerQualifiedMillis + (7 * 24 * 60 * 60 * 1000)).toISOString() : null;
        const stalled = Boolean(activationDeadlineAt && !activation && !hasProjectedActivation && new Date(activationDeadlineAt).getTime() < nowMillis);
        const preparedContact = conversation?.state === "exported" && !target.latestManualContactAt;
        let state: SignalDeskActivationOpportunitySummary["state"] = "candidate";
        if (target.suppressionStatus !== "clear") state = "suppressed";
        else if (policyState === "expired") state = "expired";
        else if (routeRow?.fitDecision === "fail") state = "rejected";
        else if (target.status === "rejected") state = "rejected";
        else if (activation || hasProjectedActivation) state = "activated";
        else if (activationStart) state = "activation_started";
        else if (conversation?.state === "interested") state = "engaged";
        else if (target.latestManualContactAt || target.status === "contacted" || conversation?.state === "contacted") state = "contacted";
        else if (routeRow?.actionabilityState === "actionable") state = "actionable";
        else if (target.sourceConfidence === "high" || target.sourceConfidence === "medium") state = "verified";
        const allowedRoute = routeRow?.allowedRoute || "none";
        const hardGateFailures = routeRow?.hardGateFailures || [
            policyState === "expired" ? "source-policy-expired" : "",
            policyState === "review_required" ? "source-policy-review-required" : "",
            target.suppressionStatus !== "clear" ? `suppression:${target.suppressionStatus}` : "",
        ].filter(Boolean);
        const priority = state === "suppressed"
            ? 100
            : conversation?.state === "complaint" || conversation?.state === "privacy_request" || conversation?.state === "legal_request"
                ? 98
                : stalled
                    ? 95
                    : preparedContact
                        ? 82
                    : state === "engaged" || state === "activation_started"
                        ? 90
                        : state === "actionable"
                            ? 70
                            : state === "verified"
                                ? 45
                                : 20;
        return {
            activationOpportunityId: `activation_opportunity_${target.targetId}`,
            targetId: target.targetId,
            displayName: target.displayName,
            category: target.category || null,
            city: target.city || null,
            state,
            truthGap: target.primaryOpportunity,
            sourcePolicyState: policyState,
            evidenceGrade: target.sourceConfidence === "blocked" ? "low" : target.sourceConfidence,
            allowedRoute,
            allowedRouteReason: routeRow?.allowedRouteReason || "No verified contact route is available.",
            routePermissionState: routeRow?.routePermissionState || (policyState === "expired" ? "expired" : policyState === "review_required" ? "review_required" : "research_only"),
            hardGateFailures,
            dimensions: {
                truthGap: target.currentListGapScore ?? (target.primaryOpportunity === "unknown" ? 35 : 75),
                evidence: target.sourceConfidence === "high" ? 90 : target.sourceConfidence === "medium" ? 70 : 35,
                reachability: allowedRoute !== "none" ? 85 : target.contactability === "limited" ? 45 : 15,
                activationFeasibility: activationStart ? 90 : ownerQualifiedAt ? 75 : target.primaryOpportunity === "unknown" ? 35 : 60,
                surfaceLeverage: activation?.surfaces?.length || hasProjectedActivation
                    ? Math.min(100, (activation?.surfaces?.length || projectedActivationSurfaces.length) * 35)
                    : 50,
                learningValue: state === "engaged" || state === "activation_started" ? 90 : 60,
            },
            ownerQualifiedAt: ownerQualifiedAt || null,
            activationStartedAt: activationStart?.updatedAt || null,
            activatedAt: activation?.updatedAt || target.latestVerifiedActivationAt || null,
            activationDeadlineAt,
            surfaces: activation?.surfaces || projectedActivationSurfaces,
            nextAction: state === "suppressed"
                ? "No contact. Review the suppression or complaint record."
                : stalled
                    ? "Resolve the current activation blocker before researching more businesses."
                    : preparedContact
                        ? "Complete the prepared contact action, then record what actually happened."
                    : state === "engaged" || state === "activation_started"
                        ? "Continue the owner-approved MenuList activation path."
                        : state === "actionable"
                            ? "Review the evidence-bound action packet."
                            : routeRow?.allowedRouteReason || "Verify evidence and source rights.",
            priority,
            updatedAt: target.updatedAt || null,
        };
    }).sort((left, right) => right.priority - left.priority || left.displayName.localeCompare(right.displayName));
};

const classifyReply = (message: string): SignalDeskConversationSummary["state"] => {
    const text = message.toLowerCase();
    if (/\b(stop|unsubscribe|do not contact|don't contact|dnc)\b/.test(text)) return "dnc";
    if (/\b(complaint|report you|spam complaint|harassment|unwanted message)\b/.test(text)) return "complaint";
    if (/\b(delete my data|privacy request|data request|personal data|right to erasure)\b/.test(text)) return "privacy_request";
    if (/\b(legal notice|lawyer|solicitor|cease and desist|legal action)\b/.test(text)) return "legal_request";
    if (/\bwrong (person|contact|number|email)\b/.test(text)) return "wrong_contact";
    if (/\b(yes|interested|pricing|price|demo|call|send|how much)\b/.test(text)) return "interested";
    if (/\b(no|not interested|later)\b/.test(text)) return "not_interested";
    return "needs_review";
};

const buildDraftBody = (
    template: SignalDeskTemplateSummary,
    target: SignalDeskTargetSummary,
    evidence: SignalDeskEvidencePacketSummary,
    cta: SignalDeskSelfServiceCtaSummary | null,
) => {
    const opportunity = target.primaryOpportunity === "missing-current-list"
        ? "your current list is hard to find from the public surface"
        : "there may be a cleaner way to keep your public list current";
    const ctaCopy = cta?.copy || "I can send a private MenuList preview.";
    const values: Record<string, string> = {
        businessName: target.displayName,
        category: target.category || "business",
        city: target.city || "your area",
        opportunity,
        proofCta: ctaCopy,
    };
    const replaceValue = (text: string) => Object.entries(values).reduce(
        (current, [key, value]) => current.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value),
        text,
    );
    const personalizationEvidenceIds = [
        evidence.evidencePacketId,
        target.sourcePolicyId ? `source-policy:${target.sourcePolicyId}` : "",
        cta?.ctaId ? `cta:${cta.ctaId}` : "",
    ].filter(Boolean);
    return {
        body: replaceValue(template.body),
        personalizationEvidenceIds,
        subject: replaceValue(template.subject || "Quick note for {{businessName}}"),
        unsupportedClaims: [],
    };
};

const computeScore = (target: SignalDeskTargetSummary): SignalDeskAiScoreSummary => {
    const category = normalizeLower(target.category);
    const fitScore = /(restaurant|cafe|salon|spa|bar|bakery|food|menu|service)/.test(category) ? 86 : 64;
    const currentListGapScore = target.currentListUrl ? 38 : 88;
    const contactabilityScore = target.contactability === "ready" ? 84 : target.contactability === "limited" ? 56 : 22;
    const riskScore = target.suppressionStatus === "clear" ? 12 : 92;
    const total = fitScore + currentListGapScore + contactabilityScore - riskScore;
    const segment: SignalDeskSegment = riskScore > 70
        ? "reject"
        : total >= 210
            ? "a"
            : total >= 165
                ? "b"
                : total >= 125
                    ? "c"
                    : "hold";
    const nextAction: SignalDeskNextAction = segment === "reject" || segment === "hold" ? "hold" : "evidence";

    return {
        scoreId: "",
        targetId: target.targetId,
        fitScore,
        currentListGapScore,
        contactabilityScore,
        riskScore,
        segment,
        nextAction,
        reasons: [
            `Fit ${fitScore}`,
            `Current-list gap ${currentListGapScore}`,
            `Contactability ${contactabilityScore}`,
            `Risk ${riskScore}`,
        ],
        createdAt: null,
    };
};

export async function loadSignalDeskWorkspaceServer(
    access: SignalDeskAccessContext,
    section: SignalDeskSection,
): Promise<SignalDeskWorkspaceResponse> {
    const overview = await loadSignalDeskOverviewServer(access);
    const workspace = emptyWorkspace(section);
    const db = getSignalDeskDb();
    if (!db) return { ...overview, workspace };

    const readCommon = async () => {
        const [targets, approvals, conversations, outcomes, demandSignals] = await Promise.all([
            readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES),
            readList<SignalDeskApprovalItem>(db, SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE),
            readList<SignalDeskConversationSummary>(db, SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES),
            readList<SignalDeskOutcomeSummary>(db, SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES),
            readList<SignalDeskDemandSignalSummary>(db, SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES),
        ]);
        workspace.targets = targets;
        workspace.approvals = approvals;
        workspace.conversations = conversations;
        workspace.outcomes = outcomes;
        workspace.demandSignals = demandSignals;
    };

    if (section === "dashboard") {
        await readCommon();
        workspace.growthMissions = await readList<SignalDeskGrowthMissionSummary>(db, SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS);
        workspace.experimentCards = await readList<SignalDeskExperimentCardSummary>(db, SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.researchRuns = await readList<SignalDeskResearchRunSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_RUNS);
        workspace.researchTableRows = await readList<SignalDeskResearchTableRowSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS);
    } else if (section === "mission") {
        await readCommon();
        workspace.contentAssets = await readList<SignalDeskContentAssetSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_ASSETS);
        workspace.contentDistributionDrafts = await readList<SignalDeskContentDistributionDraftSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS);
        workspace.experimentCards = await readList<SignalDeskExperimentCardSummary>(db, SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS);
        workspace.growthMissions = await readList<SignalDeskGrowthMissionSummary>(db, SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS);
        workspace.imports = await readList<SignalDeskSourceRunSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES);
        workspace.marketPods = await readList<SignalDeskMarketPodSummary>(db, SIGNALDESK_COLLECTIONS.MARKET_PODS);
        workspace.offerCtas = await readList<SignalDeskOfferCtaSummary>(db, SIGNALDESK_COLLECTIONS.OFFER_CTAS);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.researchRuns = await readList<SignalDeskResearchRunSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_RUNS);
        workspace.researchTableRows = await readList<SignalDeskResearchTableRowSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS);
        workspace.replyPlaybooks = await readList<SignalDeskReplyPlaybookSummary>(db, SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS);
        workspace.runTimelines = await readList<SignalDeskRunTimelineSummary>(db, SIGNALDESK_COLLECTIONS.RUN_TIMELINES);
        workspace.selfServiceCtas = await readList<SignalDeskSelfServiceCtaSummary>(db, SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS);
        workspace.senderDomains = await readList<SignalDeskSenderDomainSummary>(db, SIGNALDESK_COLLECTIONS.SENDER_DOMAINS);
        workspace.sourceQualitySnapshots = await readList<SignalDeskSourceQualitySnapshotSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_QUALITY_SNAPSHOTS);
        workspace.trustPartnerProfiles = await readList<SignalDeskTrustPartnerProfileSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES);
    } else if (section === "revenue") {
        await readCommon();
        const [
            activationWatches,
            commercialOffers,
            commercialOpportunities,
            operatingEnvelopes,
            revenueAccounts,
            revenueControlSummaries,
        ] = await Promise.all([
            readList<SignalDeskActivationWatchSummary>(db, SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES),
            readList<SignalDeskCommercialOfferSummary>(db, SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS),
            readList<SignalDeskCommercialOpportunitySummary>(db, SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES),
            readList<SignalDeskOperatingEnvelopeSummary>(db, SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES),
            readList<SignalDeskRevenueAccountSummary>(db, SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS),
            readList<SignalDeskRevenueControlSummary>(db, SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES),
        ]);
        workspace.activationWatches = activationWatches.map((watch) => annotateActivationWatch(watch));
        workspace.commercialOffers = commercialOffers;
        workspace.commercialOpportunities = commercialOpportunities;
        workspace.operatingEnvelopes = operatingEnvelopes.map((envelope) => annotateOperatingEnvelope(envelope));
        workspace.revenueAccounts = revenueAccounts;
        workspace.revenueControlSummaries = revenueControlSummaries;
        workspace.budgetPolicies = await readList<SignalDeskBudgetPolicySummary>(db, SIGNALDESK_COLLECTIONS.BUDGET_POLICIES);
        workspace.marketPods = await readList<SignalDeskMarketPodSummary>(db, SIGNALDESK_COLLECTIONS.MARKET_PODS);
        workspace.offerCtas = await readList<SignalDeskOfferCtaSummary>(db, SIGNALDESK_COLLECTIONS.OFFER_CTAS);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.senderDomains = await readList<SignalDeskSenderDomainSummary>(db, SIGNALDESK_COLLECTIONS.SENDER_DOMAINS);
        workspace.templates = await readList<SignalDeskTemplateSummary>(db, SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES);
    } else if (section === "targets") {
        workspace.targets = await readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
    } else if (section === "imports") {
        workspace.imports = await readList<SignalDeskSourceRunSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
    } else if (section === "approvals") {
        workspace.approvals = await readList<SignalDeskApprovalItem>(db, SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE);
        workspace.approvalPackets = await readList<SignalDeskApprovalPacketSummary>(db, SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS);
        workspace.drafts = await readList<SignalDeskDraftSummary>(db, SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES);
    } else if (section === "templates") {
        workspace.templates = await readList<SignalDeskTemplateSummary>(db, SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES);
        workspace.drafts = await readList<SignalDeskDraftSummary>(db, SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES);
        workspace.targets = await readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);
        workspace.evidencePackets = await readList<SignalDeskEvidencePacketSummary>(db, SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES);
        workspace.selfServiceCtas = await readList<SignalDeskSelfServiceCtaSummary>(db, SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS);
    } else if (section === "inbox") {
        workspace.conversations = await readList<SignalDeskConversationSummary>(db, SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES);
        workspace.outcomes = await readList<SignalDeskOutcomeSummary>(db, SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.researchTableRows = await readList<SignalDeskResearchTableRowSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS);
        workspace.targets = await readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);
    } else if (section === "attribution") {
        workspace.outcomes = await readList<SignalDeskOutcomeSummary>(db, SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES);
        workspace.conversations = await readList<SignalDeskConversationSummary>(db, SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES);
        workspace.demandSignals = await readList<SignalDeskDemandSignalSummary>(db, SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES);
        workspace.audienceSegments = await readList<SignalDeskAudienceSegmentSummary>(db, SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS);
        workspace.marketPods = await readList<SignalDeskMarketPodSummary>(db, SIGNALDESK_COLLECTIONS.MARKET_PODS);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.researchTableRows = await readList<SignalDeskResearchTableRowSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS);
        workspace.strategistMemos = await readList<SignalDeskStrategistMemoSummary>(db, SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS);
        workspace.targets = await readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);
    } else if (section === "policies") {
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.budgetPolicies = await readList<SignalDeskBudgetPolicySummary>(db, SIGNALDESK_COLLECTIONS.BUDGET_POLICIES);
        workspace.providerAccounts = await readList<SignalDeskProviderAccountSummary>(db, SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS);
        workspace.templates = await readList<SignalDeskTemplateSummary>(db, SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES);
    } else if (section === "sources") {
        workspace.budgetPolicies = await readList<SignalDeskBudgetPolicySummary>(db, SIGNALDESK_COLLECTIONS.BUDGET_POLICIES);
        workspace.enrichmentResults = await readList<SignalDeskEnrichmentResultSummary>(db, SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS);
        workspace.enrichmentWaterfalls = await readList<SignalDeskEnrichmentWaterfallSummary>(db, SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS);
        workspace.imports = await readList<SignalDeskSourceRunSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.providerAccounts = await readList<SignalDeskProviderAccountSummary>(db, SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS);
        workspace.providerEvaluations = await readList<SignalDeskProviderEvaluationSummary>(db, SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS);
        workspace.providerSourceRetentions = await readList<SignalDeskProviderSourceRetentionSummary>(db, SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION);
        workspace.researchRuns = await readList<SignalDeskResearchRunSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_RUNS);
        workspace.researchTableRows = await readList<SignalDeskResearchTableRowSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS);
        workspace.targets = await readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);
        workspace.vendorRuns = await readList<SignalDeskVendorRunSummary>(db, SIGNALDESK_COLLECTIONS.VENDOR_RUNS);
    } else if (section === "ai") {
        const aiRuns = await readList<SignalDeskAiWorkerRunSummary & SignalDeskAiVolumeRunSummary & Partial<SignalDeskAiScoreSummary>>(db, SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, "createdAt");
        workspace.modelEvals = (await readList<SignalDeskModelEvalSummary>(db, SIGNALDESK_COLLECTIONS.MODEL_EVALS))
            .map(annotateModelEvalSummary);
        workspace.modelRoutes = await readList<SignalDeskModelRouteSummary>(db, SIGNALDESK_COLLECTIONS.MODEL_ROUTES);
        workspace.aiWorkerRuns = aiRuns.filter((run) => String(run.workerType || "").startsWith("ai_assist_"));
        workspace.aiVolumeRuns = aiRuns.filter((run) => run.workerType === "ai_volume_batch");
        workspace.scores = aiRuns.filter((run) => Boolean(run.scoreId)) as SignalDeskAiScoreSummary[];
        workspace.targets = await readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);
        workspace.evidencePackets = await readList<SignalDeskEvidencePacketSummary>(db, SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES);
    } else if (section === "channels") {
        workspace.approvals = await readList<SignalDeskApprovalItem>(db, SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE);
        workspace.channelHealth = await readList<SignalDeskChannelHealthSummary>(db, SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES);
        workspace.channelWindows = await readList<SignalDeskChannelWindowStateSummary>(db, SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES);
        workspace.connectorSettings = await readList<SignalDeskConnectorSettingSummary>(db, SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS);
        workspace.conversations = await readList<SignalDeskConversationSummary>(db, SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES);
        workspace.drafts = await readList<SignalDeskDraftSummary>(db, SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES);
        workspace.providerEvents = await readList<SignalDeskProviderEventSummary>(db, SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS);
        workspace.senderDomains = await readList<SignalDeskSenderDomainSummary>(db, SIGNALDESK_COLLECTIONS.SENDER_DOMAINS);
        workspace.sequencerHandoffs = await readList<SignalDeskSequencerHandoffSummary>(db, SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS);
        workspace.sequencerSteps = await readList<SignalDeskSequencerStepSummary>(db, SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS);
        workspace.targets = await readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);
    } else if (section === "content") {
        workspace.contentAssets = await readList<SignalDeskContentAssetSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_ASSETS);
        workspace.contentCalendarItems = await readList<SignalDeskContentCalendarItemSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS, "scheduledFor");
        workspace.contentDistributionDrafts = await readList<SignalDeskContentDistributionDraftSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS);
        workspace.contentPerformanceSummaries = await readList<SignalDeskContentPerformanceSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_PERFORMANCE_SUMMARIES, "capturedAt");
        workspace.contentSources = await readList<SignalDeskContentSourceSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_SOURCES);
        workspace.proofPermissions = await readList<SignalDeskProofPermissionSummary>(db, SIGNALDESK_COLLECTIONS.PROOF_PERMISSIONS);
        workspace.marketPods = await readList<SignalDeskMarketPodSummary>(db, SIGNALDESK_COLLECTIONS.MARKET_PODS);
        workspace.selfServiceCtas = await readList<SignalDeskSelfServiceCtaSummary>(db, SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS);
    } else if (section === "partners") {
        workspace.budgetPolicies = await readList<SignalDeskBudgetPolicySummary>(db, SIGNALDESK_COLLECTIONS.BUDGET_POLICIES);
        workspace.marketPods = await readList<SignalDeskMarketPodSummary>(db, SIGNALDESK_COLLECTIONS.MARKET_PODS);
        workspace.selfServiceCtas = await readList<SignalDeskSelfServiceCtaSummary>(db, SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS);
        workspace.trustPartnerBriefs = await readList<SignalDeskTrustPartnerBriefSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_BRIEFS);
        workspace.trustPartnerDeals = await readList<SignalDeskTrustPartnerDealSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS);
        workspace.trustPartnerDeliverables = await readList<SignalDeskTrustPartnerDeliverableSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DELIVERABLES);
        workspace.trustPartnerMetrics = await readList<SignalDeskTrustPartnerMetricSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS, "capturedAt");
        workspace.trustPartnerNicheTests = await readList<SignalDeskTrustPartnerNicheTestSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_NICHE_TESTS);
        workspace.trustPartnerProfiles = await readList<SignalDeskTrustPartnerProfileSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES);
        workspace.trustPartnerRenewalDecisions = await readList<SignalDeskTrustPartnerRenewalDecisionSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_RENEWAL_DECISIONS);
    } else if (section === "settings") {
        workspace.channelHealth = await readList<SignalDeskChannelHealthSummary>(db, SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES);
        workspace.connectorSettings = await readList<SignalDeskConnectorSettingSummary>(db, SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS);
        workspace.providerAccounts = await readList<SignalDeskProviderAccountSummary>(db, SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS);
        workspace.senderDomains = await readList<SignalDeskSenderDomainSummary>(db, SIGNALDESK_COLLECTIONS.SENDER_DOMAINS);
        if (access.permissions.includes("signaldesk.configure")) {
            workspace.teamMembers = await readList<SignalDeskTeamMemberSummary>(db, SIGNALDESK_COLLECTIONS.TEAM_MEMBERS);
        }
    } else if (section === "control-room") {
        await readCommon();
        workspace.approvalPackets = await readList<SignalDeskApprovalPacketSummary>(db, SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS);
        workspace.audienceSegments = await readList<SignalDeskAudienceSegmentSummary>(db, SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS);
        workspace.budgetPolicies = await readList<SignalDeskBudgetPolicySummary>(db, SIGNALDESK_COLLECTIONS.BUDGET_POLICIES);
        workspace.enrichmentWaterfalls = await readList<SignalDeskEnrichmentWaterfallSummary>(db, SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS);
        workspace.imports = await readList<SignalDeskSourceRunSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES);
        workspace.modelRoutes = await readList<SignalDeskModelRouteSummary>(db, SIGNALDESK_COLLECTIONS.MODEL_ROUTES);
        workspace.providerAccounts = await readList<SignalDeskProviderAccountSummary>(db, SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS);
        workspace.providerEvaluations = await readList<SignalDeskProviderEvaluationSummary>(db, SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS);
        workspace.policies = await readList<SignalDeskSourcePolicy>(db, SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
        workspace.proofPermissions = await readList<SignalDeskProofPermissionSummary>(db, SIGNALDESK_COLLECTIONS.PROOF_PERMISSIONS);
        workspace.runTimelines = await readList<SignalDeskRunTimelineSummary>(db, SIGNALDESK_COLLECTIONS.RUN_TIMELINES);
        const aiRuns = await readList<SignalDeskAiWorkerRunSummary & SignalDeskAiVolumeRunSummary & Partial<SignalDeskAiScoreSummary>>(db, SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, "createdAt");
        workspace.aiWorkerRuns = aiRuns.filter((run) => String(run.workerType || "").startsWith("ai_assist_"));
        workspace.aiVolumeRuns = aiRuns.filter((run) => run.workerType === "ai_volume_batch");
        workspace.scores = aiRuns.filter((run) => Boolean(run.scoreId)) as SignalDeskAiScoreSummary[];
        workspace.selfServiceCtas = await readList<SignalDeskSelfServiceCtaSummary>(db, SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS);
        workspace.senderDomains = await readList<SignalDeskSenderDomainSummary>(db, SIGNALDESK_COLLECTIONS.SENDER_DOMAINS);
        workspace.sequencerHandoffs = await readList<SignalDeskSequencerHandoffSummary>(db, SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS);
        workspace.sequencerSteps = await readList<SignalDeskSequencerStepSummary>(db, SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS);
        workspace.strategistMemos = await readList<SignalDeskStrategistMemoSummary>(db, SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS);
        workspace.contentAssets = await readList<SignalDeskContentAssetSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_ASSETS);
        workspace.contentCalendarItems = await readList<SignalDeskContentCalendarItemSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS, "scheduledFor");
        workspace.contentDistributionDrafts = await readList<SignalDeskContentDistributionDraftSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS);
        workspace.experimentCards = await readList<SignalDeskExperimentCardSummary>(db, SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS);
        workspace.growthMissions = await readList<SignalDeskGrowthMissionSummary>(db, SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS);
        workspace.offerCtas = await readList<SignalDeskOfferCtaSummary>(db, SIGNALDESK_COLLECTIONS.OFFER_CTAS);
        workspace.replyPlaybooks = await readList<SignalDeskReplyPlaybookSummary>(db, SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS);
        workspace.researchRuns = await readList<SignalDeskResearchRunSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_RUNS);
        workspace.researchTableRows = await readList<SignalDeskResearchTableRowSummary>(db, SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS);
        workspace.sourceQualitySnapshots = await readList<SignalDeskSourceQualitySnapshotSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_QUALITY_SNAPSHOTS);
        workspace.trustPartnerProfiles = await readList<SignalDeskTrustPartnerProfileSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES);
    } else if (section === "audit") {
        workspace.auditEvents = await readList<SignalDeskAuditEvent>(db, SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, "createdAt", 50);
    }
    workspace.policies = workspace.policies.map(annotateSourcePolicy);
    const policyById = new Map(workspace.policies.map((policy) => [policy.sourcePolicyId, policy]));
    const targetById = new Map(workspace.targets.map((target) => [target.targetId, target]));
    workspace.researchTableRows = workspace.researchTableRows.map((row) => (
        revalidateResearchRowRoute(
            row,
            row.sourcePolicyId ? policyById.get(row.sourcePolicyId) : null,
            row.targetId ? targetById.get(row.targetId) : null,
        )
    ));
    workspace.activationOpportunities = deriveActivationOpportunities(workspace);

    return { ...overview, workspace };
}

export async function seedSignalDeskDefaultsServer(access: SignalDeskAccessContext) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const policyRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc("policy_manual_research_v1");
    const discoveryPolicyRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc("policy_public_business_research_v1");
    const templateRef = db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc("template_current_list_intro_v1");
    const providerDefaults: ProviderAccountInput[] = [
        { credentialState: "not_required", dailyBudgetUsd: 0, monthlyBudgetUsd: 0, ownerApproved: true, perRunBudgetUsd: 0, provider: "manual", status: "approved", use: "discovery" },
        { credentialState: "missing", dailyBudgetUsd: 0, monthlyBudgetUsd: 0, ownerApproved: false, perRunBudgetUsd: 0, provider: "google-places", status: "disabled", use: "discovery", disabledReason: "Use manual evidence-only research for the first proof trial; enable Places only after separate provider, source-policy, and budget approval." },
        { credentialState: "missing", dailyBudgetUsd: 10, monthlyBudgetUsd: 150, ownerApproved: false, perRunBudgetUsd: 0.25, provider: "apify", status: "disabled", use: "discovery", disabledReason: "Enable only after Apify source actor, legal/source policy, and budget approval." },
        { credentialState: "not_required", dailyBudgetUsd: 0, monthlyBudgetUsd: 0, ownerApproved: true, perRunBudgetUsd: 0, provider: "fhrs-fhis", status: "evaluation", use: "discovery", disabledReason: "UK official establishment seed only; separate contact source policy is required before outreach contact use." },
        { credentialState: "missing", dailyBudgetUsd: 10, monthlyBudgetUsd: 200, ownerApproved: false, perRunBudgetUsd: 1, provider: "apollo", status: "disabled", use: "enrichment", disabledReason: "Enable only after first market pod and budget approval." },
        { credentialState: "missing", dailyBudgetUsd: 5, monthlyBudgetUsd: 100, ownerApproved: false, perRunBudgetUsd: 0.5, provider: "hunter", status: "disabled", use: "verification", disabledReason: "Enable only after email verification policy is approved." },
        { credentialState: "missing", dailyBudgetUsd: 5, monthlyBudgetUsd: 100, ownerApproved: false, perRunBudgetUsd: 0.5, provider: "zerobounce", status: "disabled", use: "verification", disabledReason: "Enable only after email verification policy is approved." },
        { credentialState: "missing", dailyBudgetUsd: 5, monthlyBudgetUsd: 100, ownerApproved: false, perRunBudgetUsd: 0.5, provider: "firecrawl", status: "disabled", use: "research", disabledReason: "Enable after website evidence retention is approved." },
        { credentialState: "missing", dailyBudgetUsd: 3, monthlyBudgetUsd: 75, ownerApproved: false, perRunBudgetUsd: 0.25, provider: "tavily", status: "disabled", use: "research", disabledReason: "Enable after research provider eval starts." },
        { credentialState: "missing", dailyBudgetUsd: 3, monthlyBudgetUsd: 75, ownerApproved: false, perRunBudgetUsd: 0.25, provider: "exa", status: "disabled", use: "research", disabledReason: "Enable after research provider eval starts." },
        { credentialState: "missing", dailyBudgetUsd: 5, monthlyBudgetUsd: 120, ownerApproved: true, perRunBudgetUsd: 0.15, provider: "gemini", status: "evaluation", use: "ai" },
        { credentialState: "missing", dailyBudgetUsd: 5, monthlyBudgetUsd: 150, ownerApproved: false, perRunBudgetUsd: 0.5, provider: "openai", status: "disabled", use: "ai", disabledReason: "Enable after model-router eval." },
        { credentialState: "missing", dailyBudgetUsd: 5, monthlyBudgetUsd: 150, ownerApproved: false, perRunBudgetUsd: 0.5, provider: "anthropic", status: "disabled", use: "ai", disabledReason: "Enable only for weekly strategist/adjudication eval." },
        { credentialState: "not_required", dailyBudgetUsd: 0, monthlyBudgetUsd: 0, ownerApproved: true, perRunBudgetUsd: 0, provider: "owned-email", status: "approved", use: "sequencer" },
        { credentialState: "missing", dailyBudgetUsd: 0, monthlyBudgetUsd: 0, ownerApproved: false, perRunBudgetUsd: 0, provider: "smartlead", status: "disabled", use: "sequencer", disabledReason: "Sequencer eval blocked until sender-domain risk policy is approved." },
        { credentialState: "missing", dailyBudgetUsd: 0, monthlyBudgetUsd: 0, ownerApproved: false, perRunBudgetUsd: 0, provider: "instantly", status: "disabled", use: "sequencer", disabledReason: "Sequencer eval blocked until sender-domain risk policy is approved." },
        { credentialState: "missing", dailyBudgetUsd: 0, monthlyBudgetUsd: 0, ownerApproved: false, perRunBudgetUsd: 0, provider: "lemlist", status: "disabled", use: "sequencer", disabledReason: "Sequencer eval blocked until sender-domain risk policy is approved." },
    ];
    const modelRouteDefaults: ModelRouteInput[] = [
        { confidenceThreshold: "medium", defaultModel: SIGNALDESK_FAST_AI_MODEL, defaultProvider: "gemini", escalationModel: SIGNALDESK_DEFAULT_AI_MODEL, escalationProvider: "gemini", maxCostUsd: 0.05, status: "active", task: "score" },
        { confidenceThreshold: "medium", defaultModel: SIGNALDESK_FAST_AI_MODEL, defaultProvider: "gemini", escalationModel: SIGNALDESK_DEFAULT_AI_MODEL, escalationProvider: "gemini", maxCostUsd: 0.05, status: "active", task: "evidence" },
        { confidenceThreshold: "medium", defaultModel: SIGNALDESK_FAST_AI_MODEL, defaultProvider: "gemini", escalationModel: SIGNALDESK_DEFAULT_AI_MODEL, escalationProvider: "gemini", maxCostUsd: 0.05, status: "active", task: "draft" },
        { confidenceThreshold: "medium", defaultModel: SIGNALDESK_FAST_AI_MODEL, defaultProvider: "gemini", escalationModel: SIGNALDESK_DEFAULT_AI_MODEL, escalationProvider: "gemini", maxCostUsd: 0.05, status: "active", task: "reply-classification" },
        { confidenceThreshold: "high", defaultModel: SIGNALDESK_FAST_AI_MODEL, defaultProvider: "gemini", maxCostUsd: 0.02, status: "active", task: "quality-critic" },
        { confidenceThreshold: "medium", defaultModel: "gpt-5-mini", defaultProvider: "openai", escalationModel: "claude-opus-4.8", escalationProvider: "anthropic", maxCostUsd: 0.15, status: "hold", task: "approval-packet" },
        { confidenceThreshold: "high", defaultModel: "claude-opus-4.8", defaultProvider: "anthropic", maxCostUsd: 1, status: "hold", task: "weekly-strategist" },
    ];
    const modelRouteSnaps = await Promise.all(modelRouteDefaults.map((route) => (
        db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc(`model_route_${route.task}`).get()
    )));
    let modelRouteWriteCount = 0;
    const providerSpendById = new Map<string, { spentMonthUsd: number; spentTodayUsd: number }>();
    const budgetSpendById = new Map<string, { spentMonthUsd: number; spentTodayUsd: number }>();
    const providerSnaps = await Promise.all(providerDefaults.map((provider) => (
        db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc(providerAccountIdFor(provider.provider, provider.use)).get()
    )));
    providerSnaps.forEach((snap: any, index) => {
        const provider = providerDefaults[index];
        const providerId = providerAccountIdFor(provider.provider, provider.use);
        const data = snap.exists ? toPlain(snap.data()) as Partial<SignalDeskProviderAccountSummary> : {};
        providerSpendById.set(providerId, {
            spentMonthUsd: numberOrZero(data.spentMonthUsd),
            spentTodayUsd: numberOrZero(data.spentTodayUsd),
        });
    });
    const budgetSnaps = await Promise.all(providerDefaults.map((provider) => (
        db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(budgetPolicyIdFor("provider", provider.provider)).get()
    )));
    budgetSnaps.forEach((snap: any, index) => {
        const provider = providerDefaults[index];
        const budgetId = budgetPolicyIdFor("provider", provider.provider);
        const data = snap.exists ? toPlain(snap.data()) as Partial<SignalDeskBudgetPolicySummary> : {};
        budgetSpendById.set(budgetId, {
            spentMonthUsd: numberOrZero(data.spentMonthUsd),
            spentTodayUsd: numberOrZero(data.spentTodayUsd),
        });
    });

    batch.set(discoveryPolicyRef, sanitizeForFirestore({
        sourcePolicyId: discoveryPolicyRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: "Public business research",
        sourceType: "manual-research",
        status: "active",
        allowedUse: {
            contact: false,
            evidence: true,
            import: true,
            personalization: false,
            providerRun: false,
            storage: true,
        },
        retentionDays: 30,
        accessMethod: "manual-public-research",
        allowedFields: ["displayName", "category", "city", "country", "currentListUrl", "website", "notes", "providerRecordId", "providerRecordUrl"],
        attributionRequirements: ["Keep source policy, source run, and provider record reference attached to each evidence claim."],
        blockedFields: ["email", "phone", "instagram", "personal-profile"],
        policyOwner: access.userId,
        prohibitedUses: ["contact", "personalization", "provider-send", "durable raw provider payload storage"],
        rawPayloadPolicy: "never-store",
        refreshMethod: "manual-review",
        termsVersion: "internal-source-rights-v1",
        lastReviewedAt: timestamp,
        approvedAt: timestamp,
        expiresAt: expiresAtForRetention(30),
        notes: "Candidate discovery and evidence review only; contact fields, personalization, export, and send remain blocked.",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    batch.set(policyRef, sanitizeForFirestore({
        sourcePolicyId: policyRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: "Permissioned manual introduction",
        sourceType: "manual-research",
        status: "active",
        allowedUse: {
            contact: true,
            evidence: true,
            import: true,
            personalization: true,
            providerRun: false,
            storage: true,
        },
        retentionDays: 90,
        accessMethod: "permissioned-referral",
        allowedFields: ["displayName", "category", "city", "country", "currentListUrl", "website", "email", "phone", "instagram", "notes"],
        attributionRequirements: ["Keep the permissioned introduction or referral evidence attached to the target."],
        blockedFields: ["personal-profile", "sensitive-attribute"],
        policyOwner: access.userId,
        prohibitedUses: ["cold WhatsApp", "cold social DM", "unapproved provider send", "proof use without permission"],
        rawPayloadPolicy: "never-store",
        refreshMethod: "owner-refresh",
        termsVersion: "internal-source-rights-v1",
        lastReviewedAt: timestamp,
        approvedAt: timestamp,
        expiresAt: expiresAtForRetention(90),
        notes: "Contact use is limited to a founder-supplied, permissioned referral, partner handoff, or expected manual follow-up; public availability alone is not permission.",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    batch.set(templateRef, sanitizeForFirestore({
        templateId: templateRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: "Current list intro",
        channel: "email",
        status: "active",
        approvedVariables: ["businessName", "category", "city", "opportunity", "proofCta"],
        subject: "Quick note for {{businessName}}",
        body: "Hi {{businessName}}, I noticed {{opportunity}}. MenuList helps {{category}} teams in {{city}} keep a clean current list online without asking customers to download a PDF. {{proofCta}}",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    providerDefaults.forEach((provider) => {
        const providerRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc(providerAccountIdFor(provider.provider, provider.use));
        const providerSpend = providerSpendById.get(providerRef.id) || { spentMonthUsd: 0, spentTodayUsd: 0 };
        batch.set(providerRef, sanitizeForFirestore({
            providerAccountId: providerRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            ...provider,
            spentTodayUsd: providerSpend.spentTodayUsd,
            spentMonthUsd: providerSpend.spentMonthUsd,
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
        const budgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(budgetPolicyIdFor("provider", provider.provider));
        const budgetSpend = budgetSpendById.get(budgetRef.id) || { spentMonthUsd: 0, spentTodayUsd: 0 };
        batch.set(budgetRef, sanitizeForFirestore({
            budgetPolicyId: budgetRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            name: `${provider.provider} provider cap`,
            scope: "provider",
            provider: provider.provider,
            status: provider.status === "approved" || provider.status === "evaluation" ? "active" : "hold",
            dailyBudgetUsd: provider.dailyBudgetUsd,
            monthlyBudgetUsd: provider.monthlyBudgetUsd,
            perRunBudgetUsd: provider.perRunBudgetUsd,
            spentTodayUsd: budgetSpend.spentTodayUsd,
            spentMonthUsd: budgetSpend.spentMonthUsd,
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
    });

    modelRouteDefaults.forEach((route, index) => {
        const routeRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc(`model_route_${route.task}`);
        const routeSnap = modelRouteSnaps[index];
        const existingRoute = routeSnap.exists ? toPlain(routeSnap.data()) as Partial<SignalDeskModelRouteSummary> : null;
        const exactLegacyDefault = Boolean(
            existingRoute
            && (route.task === "score" || route.task === "evidence")
            && existingRoute.defaultProvider === "gemini"
            && existingRoute.defaultModel === SIGNALDESK_DEFAULT_AI_MODEL
            && existingRoute.escalationProvider === "openai"
            && existingRoute.escalationModel === "gpt-5-mini"
            && existingRoute.status === "active"
            && numberOrZero(existingRoute.maxCostUsd) === 0.05
        );
        if (routeSnap.exists && !exactLegacyDefault) return;
        modelRouteWriteCount += 1;
        batch.set(routeRef, sanitizeForFirestore({
            modelRouteId: routeRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            ...route,
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
    });

    const marketPodRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc("market_pod_first_local_v1");
    const existingMarketPodSnap = await marketPodRef.get();
    const existingMarketPod = existingMarketPodSnap.exists ? toPlain(existingMarketPodSnap.data()) as AnyRecord : null;
    const legacyUnapprovedMarketPod = Boolean(
        existingMarketPod
        && existingMarketPod.status === "hold"
        && existingMarketPod.name === "First local proof pod"
        && existingMarketPod.city === "Mumbai"
        && existingMarketPod.country === "India"
        && existingMarketPod.category === "restaurant"
        && existingMarketPod.offerAngle === "Current-list proof and private preview."
        && numberOrZero(existingMarketPod.monthlyBudgetUsd) === 300
        && existingMarketPod.successMetric === "preview_prepared"
        && !existingMarketPod.approvedBy
        && !existingMarketPod.reviewedBy
    );
    if (!existingMarketPodSnap.exists || legacyUnapprovedMarketPod) {
        batch.set(marketPodRef, sanitizeForFirestore({
            marketPodId: marketPodRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            name: "Bengaluru first proof pod",
            status: "hold",
            city: "Bengaluru - Indiranagar and Koramangala",
            country: "India",
            category: "cafes, dessert shops, QSRs, and customer-facing cloud kitchens",
            offerAngle: "Current-list proof and private preview.",
            monthlyBudgetUsd: 0,
            successMetric: "two_surface_activation_within_7_days",
            createdAt: existingMarketPod?.createdAt || timestamp,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
    }

    const segmentRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS).doc("audience_segment_owned_signals_v1");
    batch.set(segmentRef, sanitizeForFirestore({
        audienceSegmentId: segmentRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: "Owned or verified demand signals",
        status: "hold",
        marketPodId: marketPodRef.id,
        triggerType: "demand-signal",
        criteriaSummary: "Claim attempts, QR scans, referrals, or official website evidence before paid enrichment.",
        sourcePolicyId: discoveryPolicyRef.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    const ctaRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc("cta_private_preview_v1");
    batch.set(ctaRef, sanitizeForFirestore({
        ctaId: ctaRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        label: "Private preview",
        ctaType: "preview",
        status: "active",
        copy: "If useful, I can send a private MenuList preview for your team to inspect.",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    const offerCtaRef = db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc("offer_cta_current_list_upload_v1");
    batch.set(offerCtaRef, sanitizeForFirestore({
        offerCtaId: offerCtaRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        title: "Current list upload and private preview",
        segment: "restaurant-owner",
        activationSurface: "upload",
        approvedAsk: "Upload the current menu or service list so MenuList can prepare a private preview for review before publishing.",
        blockedClaims: ["AI will increase sales", "Guaranteed Google ranking", "Fully automatic public publishing"],
        ctaId: ctaRef.id,
        marketPodId: marketPodRef.id,
        proofMatchRule: "Use only with owned MenuList proof or a target evidence packet showing a current-list gap.",
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    const replyPlaybooks: ReplyPlaybookInput[] = [
        {
            approvedReply: "Thanks. The useful next step is a private MenuList preview, not a sales call. You can upload the current menu or service list and review it before anything goes live.",
            escalationRequired: false,
            intent: "send-details",
            nextRoute: "self-serve-preview",
            playbookId: "reply_playbook_send_details_v1",
            status: "active",
            suppressionRequired: false,
            title: "Send details",
        },
        {
            approvedReply: "MenuList starts with getting the current list live and usable on customer surfaces. Pricing can be reviewed after the preview is useful and approved.",
            escalationRequired: true,
            intent: "pricing",
            nextRoute: "founder-review",
            playbookId: "reply_playbook_pricing_v1",
            status: "active",
            suppressionRequired: false,
            title: "Pricing question",
        },
        {
            approvedReply: "Understood. I will not contact this address again.",
            escalationRequired: false,
            intent: "stop",
            nextRoute: "suppress",
            playbookId: "reply_playbook_stop_v1",
            status: "active",
            suppressionRequired: true,
            title: "Stop request",
        },
    ];
    replyPlaybooks.forEach((playbook) => {
        const playbookRef = db.collection(SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS).doc(playbook.playbookId || replyPlaybookIdFor(playbook));
        batch.set(playbookRef, sanitizeForFirestore({
            playbookId: playbookRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            ...playbook,
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
    });

    const contentSourceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc("content_source_menulist_owned_proof_v1");
    batch.set(contentSourceRef, sanitizeForFirestore({
        contentSourceId: contentSourceRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        title: "MenuList owned proof assets",
        sourceType: "proof-page",
        sourceUrl: "https://menulist.ai",
        status: "active",
        defaultAudience: "restaurant-owner",
        defaultMarketPodId: marketPodRef.id,
        lastAssetAt: null,
        lastCheckedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    const waterfallRef = db.collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS).doc("waterfall_email_verified_v1");
    batch.set(waterfallRef, sanitizeForFirestore({
        waterfallId: waterfallRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: "Verified email evaluation",
        requestedField: "email",
        providerOrder: ["hunter", "zerobounce", "apollo"],
        status: "hold",
        maxCredits: 5,
        maxCostUsd: 2,
        stopCondition: "first-verified",
        verificationRequired: true,
        sourcePolicyId: policyRef.id,
        retentionDays: 30,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    const senderRef = db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS).doc("sender_domain_pending_v1");
    batch.set(senderRef, sanitizeForFirestore({
        senderDomainId: senderRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        domain: "pending",
        status: "hold",
        provider: null,
        authenticationState: "missing",
        volumeRampState: "not_started",
        bounceRate: 0,
        complaintRate: 0,
        unsubscribeReady: false,
        brandRisk: "medium",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    const trustPartnerBudgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(budgetPolicyIdFor("trust-partner", null, "first_partner_test"));
    batch.set(trustPartnerBudgetRef, sanitizeForFirestore({
        budgetPolicyId: trustPartnerBudgetRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: "Zero-spend trust partner learning test",
        scope: "trust-partner",
        provider: null,
        scopeId: "first_partner_test",
        status: "hold",
        dailyBudgetUsd: 0,
        monthlyBudgetUsd: 0,
        perRunBudgetUsd: 0,
        spentTodayUsd: 0,
        spentMonthUsd: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });

    appendAudit(db, batch, access, "seed_defaults", "signaldeskFoundation", "defaults", "Seeded default SignalDesk investment controls.");
    writeRunTimeline(db, batch, {
        entityId: "defaults",
        entityType: "market-pod",
        label: "Investment-control defaults seeded",
        status: "held",
        steps: [
            { label: "Provider registry", status: "completed", at: toIso(timestamp) },
            { label: "Budget policies", status: "completed", at: toIso(timestamp) },
            { label: "Model routes", status: "completed", at: toIso(timestamp) },
            { label: "Waterfall and sender domain held", status: "held", at: toIso(timestamp) },
            { label: "Content source seeded", status: "completed", at: toIso(timestamp) },
            { label: "Offer CTA and reply playbooks seeded", status: "completed", at: toIso(timestamp) },
        ],
    });
    updateDailyCost(db, batch, providerDefaults.length * 2 + modelRouteWriteCount + replyPlaybooks.length + 12, 0);
    await batch.commit();

    return {
        permissionedPolicyId: policyRef.id,
        policyId: discoveryPolicyRef.id,
        templateId: templateRef.id,
    };
}

export async function createSignalDeskSourcePolicyServer(access: SignalDeskAccessContext, input: SourcePolicyInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const policyRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc();
    const policy = {
        sourcePolicyId: policyRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: input.name,
        sourceType: input.sourceType,
        provider: input.provider || null,
        status: "active",
        allowedUse: {
            contact: input.allowContact,
            evidence: input.allowEvidence,
            import: input.allowEvidence,
            personalization: input.allowPersonalization,
            providerRun: input.sourceType === "provider",
            storage: input.allowEvidence,
        },
        retentionDays: input.retentionDays,
        accessMethod: input.accessMethod,
        allowedFields: Array.from(new Set(input.allowedFields.map((field) => normalizeText(field)).filter(Boolean))),
        attributionRequirements: Array.from(new Set(input.attributionRequirements.map((item) => normalizeText(item)).filter(Boolean))),
        blockedFields: Array.from(new Set(input.blockedFields.map((field) => normalizeText(field)).filter(Boolean))),
        policyOwner: input.policyOwner,
        prohibitedUses: Array.from(new Set(input.prohibitedUses.map((item) => normalizeText(item)).filter(Boolean))),
        rawPayloadPolicy: input.rawPayloadPolicy,
        refreshMethod: input.refreshMethod,
        termsUrl: input.termsUrl || null,
        termsVersion: input.termsVersion || null,
        lastReviewedAt: timestampFromIsoOrDefault(input.lastReviewedAt, 0),
        approvedAt: timestamp,
        expiresAt: timestampFromIsoOrDefault(input.expiresAt, input.retentionDays),
        notes: input.notes || null,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };

    batch.set(policyRef, sanitizeForFirestore(policy));
    appendAudit(db, batch, access, "source_policy_create", "sourcePolicy", policyRef.id, input.name);
    updateControlSummary(db, batch, { sourceStatus: "healthy" });
    updateDailyCost(db, batch, 3, 0);
    await batch.commit();

    return toPlain(policy) as SignalDeskSourcePolicy;
}

export async function upsertSignalDeskProviderAccountServer(access: SignalDeskAccessContext, input: ProviderAccountInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const providerRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc(providerAccountIdFor(input.provider, input.use));
    const existingProviderSnap = await providerRef.get();
    const existingProvider = existingProviderSnap.exists
        ? toPlain(existingProviderSnap.data()) as Partial<SignalDeskProviderAccountSummary> & { createdAt?: unknown }
        : {};
    const providerAccount = {
        providerAccountId: providerRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        provider: input.provider,
        use: input.use,
        status: input.status,
        credentialState: input.credentialState,
        ownerApproved: input.ownerApproved,
        dailyBudgetUsd: input.dailyBudgetUsd,
        monthlyBudgetUsd: input.monthlyBudgetUsd,
        perRunBudgetUsd: input.perRunBudgetUsd,
        spentTodayUsd: numberOrZero(existingProvider.spentTodayUsd),
        spentMonthUsd: numberOrZero(existingProvider.spentMonthUsd),
        disabledReason: input.disabledReason || null,
        createdAt: existingProvider.createdAt || timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(providerRef, sanitizeForFirestore(providerAccount), { merge: true });
    appendAudit(db, batch, access, "provider_account_upsert", "providerAccount", providerRef.id, input.provider);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(providerAccount) as SignalDeskProviderAccountSummary;
}

export async function upsertSignalDeskBudgetPolicyServer(access: SignalDeskAccessContext, input: BudgetPolicyInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const budgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(budgetPolicyIdFor(input.scope, input.provider, input.scopeId));
    const existingBudgetSnap = await budgetRef.get();
    const existingBudget = existingBudgetSnap.exists
        ? toPlain(existingBudgetSnap.data()) as Partial<SignalDeskBudgetPolicySummary> & { createdAt?: unknown }
        : {};
    const budget = {
        budgetPolicyId: budgetRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: input.name,
        scope: input.scope,
        provider: input.provider || null,
        scopeId: input.scopeId || null,
        status: input.status,
        dailyBudgetUsd: input.dailyBudgetUsd,
        monthlyBudgetUsd: input.monthlyBudgetUsd,
        perRunBudgetUsd: input.perRunBudgetUsd,
        spentTodayUsd: numberOrZero(existingBudget.spentTodayUsd),
        spentMonthUsd: numberOrZero(existingBudget.spentMonthUsd),
        createdAt: existingBudget.createdAt || timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(budgetRef, sanitizeForFirestore(budget), { merge: true });
    appendAudit(db, batch, access, "budget_policy_upsert", "budgetPolicy", budgetRef.id, input.name);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(budget) as SignalDeskBudgetPolicySummary;
}

export async function upsertSignalDeskModelRouteServer(access: SignalDeskAccessContext, input: ModelRouteInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const routeRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc(`model_route_${input.task}`);
    const modelRoute = {
        modelRouteId: routeRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        task: input.task,
        status: input.status,
        defaultProvider: input.defaultProvider,
        defaultModel: input.defaultModel,
        escalationProvider: input.escalationProvider || null,
        escalationModel: input.escalationModel || null,
        confidenceThreshold: input.confidenceThreshold,
        maxCostUsd: input.maxCostUsd,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(routeRef, sanitizeForFirestore(modelRoute), { merge: true });
    appendAudit(db, batch, access, "model_route_upsert", "modelRoute", routeRef.id, input.task);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(modelRoute) as SignalDeskModelRouteSummary;
}

export async function upsertSignalDeskEnrichmentWaterfallServer(access: SignalDeskAccessContext, input: EnrichmentWaterfallInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const waterfallRef = db.collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS).doc();
    const waterfall = {
        waterfallId: waterfallRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: input.name,
        requestedField: input.requestedField,
        providerOrder: input.providerOrder,
        status: input.status,
        maxCredits: input.maxCredits,
        maxCostUsd: input.maxCostUsd,
        stopCondition: input.stopCondition,
        verificationRequired: input.verificationRequired,
        sourcePolicyId: input.sourcePolicyId || null,
        retentionDays: input.retentionDays,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(waterfallRef, sanitizeForFirestore(waterfall));
    appendAudit(db, batch, access, "enrichment_waterfall_upsert", "enrichmentWaterfall", waterfallRef.id, input.name);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(waterfall) as SignalDeskEnrichmentWaterfallSummary;
}

export async function upsertSignalDeskAudienceSegmentServer(access: SignalDeskAccessContext, input: AudienceSegmentInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const segmentRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS).doc();
    const segment = {
        audienceSegmentId: segmentRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: input.name,
        status: input.status,
        marketPodId: input.marketPodId || null,
        triggerType: input.triggerType,
        criteriaSummary: input.criteriaSummary,
        sourcePolicyId: input.sourcePolicyId || null,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(segmentRef, sanitizeForFirestore(segment));
    appendAudit(db, batch, access, "audience_segment_upsert", "audienceSegment", segmentRef.id, input.name);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(segment) as SignalDeskAudienceSegmentSummary;
}

export async function upsertSignalDeskSenderDomainServer(access: SignalDeskAccessContext, input: SenderDomainInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const senderRef = db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS).doc(`sender_${hashValue(input.domain).slice(0, 18)}`);
    const sender = {
        senderDomainId: senderRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        domain: input.domain,
        status: input.status,
        provider: input.provider || null,
        authenticationState: input.authenticationState,
        volumeRampState: input.volumeRampState,
        bounceRate: input.bounceRate,
        complaintRate: input.complaintRate,
        unsubscribeReady: input.unsubscribeReady,
        brandRisk: input.brandRisk,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(senderRef, sanitizeForFirestore(sender), { merge: true });
    appendAudit(db, batch, access, "sender_domain_upsert", "senderDomain", senderRef.id, input.domain);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(sender) as SignalDeskSenderDomainSummary;
}

export async function upsertSignalDeskConnectorSettingServer(access: SignalDeskAccessContext, input: ConnectorSettingInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const runtime = resolveConnectorRuntime(input);
    const connectorRef = db.collection(SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS).doc(connectorIdFor(input));
    const connector = {
        connectorId: connectorRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        connectorKind: input.connectorKind,
        displayName: input.displayName,
        status: input.status,
        channel: runtime.channel,
        provider: runtime.provider,
        senderEmail: normalizeLower(input.senderEmail) || null,
        replyToEmail: normalizeLower(input.replyToEmail) || null,
        fromName: normalizeText(input.fromName) || null,
        senderDomain: normalizeLower(input.senderDomain) || null,
        phoneNumber: normalizeText(input.phoneNumber) || null,
        phoneNumberId: normalizeText(input.phoneNumberId) || null,
        instagramPageId: normalizeText(input.instagramPageId) || null,
        messengerPageId: normalizeText(input.messengerPageId) || null,
        appId: normalizeText(input.appId) || null,
        accessTokenState: runtime.accessTokenState,
        apiKeyState: runtime.apiKeyState,
        appSecretState: runtime.appSecretState,
        envReadiness: runtime.envReadiness,
        missingEnv: runtime.missingEnv,
        notes: normalizeText(input.notes) || null,
        smtpCredentialState: runtime.smtpCredentialState,
        webhookSecretState: runtime.webhookSecretState,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };

    batch.set(connectorRef, sanitizeForFirestore(connector), { merge: true });
    if (runtime.channel !== "sequencer" && runtime.channel !== "source") {
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc(runtime.channel), sanitizeForFirestore({
            channel: runtime.channel,
            configured: input.status === "active" && runtime.envReadiness === "ready",
            lastError: runtime.missingEnv.length ? `Missing ${runtime.missingEnv.join(", ")}` : null,
            status: channelHealthStatusForConnector(input.status, runtime.envReadiness),
            updatedAt: timestamp,
        }), { merge: true });
    }
    appendAudit(db, batch, access, "connector_setting_upsert", "connectorSetting", connectorRef.id, `${input.connectorKind} ${runtime.envReadiness}`);
    updateControlSummary(db, batch, runtime.channel === "source"
        ? { sourceStatus: runtime.envReadiness === "ready" && input.status === "active" ? "healthy" : "warning" }
        : { channelStatus: runtime.envReadiness === "ready" && input.status === "active" ? "healthy" : "warning" });
    updateDailyCost(db, batch, runtime.channel === "sequencer" ? 3 : 4, 0, 0);
    await batch.commit();

    return toPlain(connector) as SignalDeskConnectorSettingSummary;
}

export async function upsertSignalDeskTeamMemberServer(access: SignalDeskAccessContext, input: TeamMemberInput) {
    const db = requireDb();
    const emailLower = normalizeLower(input.email);
    const userId = normalizeText(input.userId) || null;
    const teamMemberId = normalizeText(input.teamMemberId);

    if (!emailLower || !emailLower.includes("@")) {
        throw new Error("SignalDesk team member email is required");
    }
    if (!input.active && (
        (userId && userId === access.userId)
        || emailLower === normalizeLower(access.email)
        || teamMemberId === access.userId
    )) {
        throw new Error("SignalDesk team member cannot deactivate own access");
    }

    const explicitSnap = teamMemberId
        ? await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(teamMemberId).get()
        : null;
    const userSnap = !explicitSnap?.exists && userId
        ? await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(userId).get()
        : null;
    const emailSnap = !explicitSnap?.exists && !userSnap?.exists
        ? await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
            .where("emailLower", "==", emailLower)
            .limit(1)
            .get()
        : null;

    const existingSnap = explicitSnap?.exists
        ? explicitSnap
        : userSnap?.exists
            ? userSnap
            : emailSnap?.docs?.[0] || null;
    const memberRef = existingSnap?.ref || db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
        .doc(userId || `member_${hashValue(emailLower).slice(0, 24)}`);
    const existing = existingSnap?.exists ? toPlain(existingSnap.data()) : {};
    const timestamp = now();
    const preservedPermissions = Array.isArray(existing.permissions)
        ? existing.permissions.filter((permission: unknown): permission is SignalDeskPermission => typeof permission === "string")
        : [];
    const member = {
        teamMemberId: memberRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        userId,
        email: emailLower,
        emailLower,
        name: normalizeText(input.name) || null,
        role: input.role,
        permissions: preservedPermissions,
        active: input.active,
        status: input.active ? "active" : "inactive",
        createdAt: existing.createdAt || timestamp,
        createdBy: existing.createdBy || access.userId,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };

    const batch = db.batch();
    batch.set(memberRef, sanitizeForFirestore(member), { merge: true });
    appendAudit(
        db,
        batch,
        access,
        input.active ? "team_member_upsert" : "team_member_deactivate",
        "teamMember",
        memberRef.id,
        `${member.email} / ${member.role}`,
    );
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(member) as SignalDeskTeamMemberSummary;
}

export async function upsertSignalDeskSelfServiceCtaServer(access: SignalDeskAccessContext, input: SelfServiceCtaInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const ctaRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(`cta_${input.ctaType}`);
    const cta = {
        ctaId: ctaRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        label: input.label,
        ctaType: input.ctaType,
        status: input.status,
        copy: input.copy,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(ctaRef, sanitizeForFirestore(cta), { merge: true });
    appendAudit(db, batch, access, "self_service_cta_upsert", "selfServiceCta", ctaRef.id, input.label);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return toPlain(cta) as SignalDeskSelfServiceCtaSummary;
}

export async function upsertSignalDeskOfferCtaServer(access: SignalDeskAccessContext, input: OfferCtaInput) {
    requireOperatingLayer();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const offerRef = db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(input.offerCtaId || offerCtaIdFor(input));
    const offer = {
        offerCtaId: offerRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        title: input.title,
        segment: input.segment,
        activationSurface: input.activationSurface,
        approvedAsk: input.approvedAsk,
        blockedClaims: input.blockedClaims,
        ctaId: input.ctaId || null,
        marketPodId: input.marketPodId || null,
        proofMatchRule: input.proofMatchRule,
        status: input.status,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(offerRef, sanitizeForFirestore(offer), { merge: true });
    appendAudit(db, batch, access, "offer_cta_upsert", "offerCta", offerRef.id, input.title);
    writeRunTimeline(db, batch, {
        entityId: offerRef.id,
        entityType: "mission",
        label: `Offer CTA: ${input.title}`,
        status: input.status === "active" ? "ready" : input.status === "blocked" ? "blocked" : "held",
        steps: [
            { label: "Approved ask saved", status: "completed", at: toIso(timestamp) },
            { label: "Blocked claims attached", status: input.blockedClaims.length ? "completed" : "held", at: toIso(timestamp) },
            { label: "Proof match rule attached", status: "completed", at: toIso(timestamp) },
        ],
    });
    updateDailyCost(db, batch, 4, 0);
    await batch.commit();
    return toPlain(offer) as SignalDeskOfferCtaSummary;
}

export async function upsertSignalDeskReplyPlaybookServer(access: SignalDeskAccessContext, input: ReplyPlaybookInput) {
    requireOperatingLayer();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const playbookRef = db.collection(SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS).doc(input.playbookId || replyPlaybookIdFor(input));
    const playbook = {
        playbookId: playbookRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        title: input.title,
        intent: input.intent,
        approvedReply: input.approvedReply,
        nextRoute: input.nextRoute,
        suppressionRequired: input.suppressionRequired,
        escalationRequired: input.escalationRequired,
        status: input.status,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(playbookRef, sanitizeForFirestore(playbook), { merge: true });
    appendAudit(db, batch, access, "reply_playbook_upsert", "replyPlaybook", playbookRef.id, input.intent);
    writeRunTimeline(db, batch, {
        entityId: playbookRef.id,
        entityType: "mission",
        label: `Reply playbook: ${input.title}`,
        status: input.status === "active" ? "ready" : input.status === "blocked" ? "blocked" : "held",
        steps: [
            { label: "Approved reply saved", status: "completed", at: toIso(timestamp) },
            { label: input.suppressionRequired ? "Suppression route required" : "No suppression route required", status: input.suppressionRequired ? "ready" : "completed", at: toIso(timestamp) },
            { label: input.escalationRequired ? "Founder review required" : "Founder review not required", status: input.escalationRequired ? "held" : "completed", at: toIso(timestamp) },
        ],
    });
    updateDailyCost(db, batch, 4, 0);
    await batch.commit();
    return toPlain(playbook) as SignalDeskReplyPlaybookSummary;
}

export async function qualifySignalDeskRevenueAccountServer(
    access: SignalDeskAccessContext,
    input: RevenueAccountQualificationInput,
) {
    requireRevenueOperatingLayer();
    const db = requireDb();
    const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const [sourcePolicy, activationOutcomeSnap] = await Promise.all([
        readSourcePolicy(db, target.sourcePolicyId),
        db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES)
            .where("targetId", "==", input.targetId)
            .where("outcomeType", "==", "two_surface_activation")
            .limit(30)
            .get(),
    ]);
    const hasProjectedActivation = Boolean(
        target.latestVerifiedActivationAt
        && target.latestVerifiedActivationEvidenceRef
        && (target.latestVerifiedActivationIntegrityStatus === "owner-reviewed-manual" || target.latestVerifiedActivationIntegrityStatus === "menulist-signed")
        && new Set(target.latestVerifiedActivationSurfaces || []).size >= 2
    );
    const hasTwoSurfaceActivation = hasProjectedActivation || activationOutcomeSnap.docs.some((doc: any) => (
        isVerifiedTwoSurfaceOutcome(toPlain(doc.data()) as SignalDeskOutcomeSummary)
    ));
    await assertSourcePolicyUsable(db, access, sourcePolicy, {
        entityId: target.targetId,
        use: "evidence",
    });

    const accountRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS).doc(revenueAccountIdFor(target.targetId));
    const opportunityRef = db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES).doc(opportunityIdFor(accountRef.id));
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE);
    const qualification = await db.runTransaction(async (transaction: any) => {
        const [currentTargetSnap, accountSnap, opportunitySnap] = await Promise.all([
            transaction.get(targetRef),
            transaction.get(accountRef),
            transaction.get(opportunityRef),
        ]);
        if (!currentTargetSnap.exists) throw new Error("Target not found");
        const currentTarget = toPlain(currentTargetSnap.data()) as SignalDeskTargetSummary;
        if (currentTarget.sourcePolicyId !== target.sourcePolicyId) throw new Error("Target source policy changed; retry qualification");
        const timestamp = now();
        const existingAccount = accountSnap.exists ? toPlain(accountSnap.data()) as SignalDeskRevenueAccountSummary : null;
        const existingOpportunity = opportunitySnap.exists ? toPlain(opportunitySnap.data()) as SignalDeskCommercialOpportunitySummary : null;
        const activated = hasTwoSurfaceActivation;
        const commerciallyEngaged = currentTarget.status === "replied" || currentTarget.status === "converted";
        const hasRecordedOutcome = Boolean(currentTarget.latestOutcomeAt);
        const eligible = currentTarget.suppressionStatus === "clear"
            && currentTarget.contactability !== "blocked"
            && (
                commerciallyEngaged
                || ((currentTarget.segment === "a" || currentTarget.segment === "b") && numberOrZero(currentTarget.fitScore) >= 70)
            );
        const complianceState: SignalDeskRevenueAccountSummary["complianceState"] = currentTarget.suppressionStatus !== "clear"
            ? "suppressed"
            : currentTarget.contactability === "blocked"
                ? "blocked"
                : eligible
                    ? "eligible"
                    : "review-required";
        const engagementState: SignalDeskRevenueAccountSummary["engagementState"] = currentTarget.suppressionStatus !== "clear"
            ? "opted-out"
            : commerciallyEngaged
                ? "replied"
                : currentTarget.status === "contacted"
                    ? "contacted"
                    : currentTarget.contactability === "ready"
                        ? "contactable"
                        : "none";
        const organizationName = normalizeText(input.organizationName) || currentTarget.displayName;
        const account = {
            activationState: existingAccount?.activationState || (hasRecordedOutcome ? "in-progress" : "not-started"),
            automationState: existingAccount?.automationState || "manual",
            category: currentTarget.category || null,
            city: currentTarget.city || null,
            complianceState,
            country: currentTarget.country || null,
            displayName: currentTarget.displayName,
            engagementState,
            lifecycleStage: activated ? "customer" : eligible ? "opportunity" : "nurture",
            locationType: input.locationType,
            nextAction: activated
                ? "Refresh the activation watch from recorded outcomes."
                : eligible
                    ? "Review commercial fit and standard offer."
                    : "Hold until qualification evidence is sufficient.",
            organizationId: organizationIdFor(organizationName),
            pId: SIGNALDESK_PRODUCT_CODE,
            primaryTargetId: currentTarget.targetId,
            revenueAccountId: accountRef.id,
            targetIds: Array.from(new Set([...(existingAccount?.targetIds || []), currentTarget.targetId])),
            updatedAt: timestamp,
            updatedBy: access.userId,
        };

        transaction.set(accountRef, sanitizeForFirestore(account), { merge: true });
        let opportunity: SignalDeskCommercialOpportunitySummary | null = existingOpportunity;
        if (eligible && !existingOpportunity) {
            opportunity = {
                commercialOfferId: null,
                currency: null,
                expectedCloseAt: null,
                founderAttentionMinutes: 0,
                nextAction: activated ? "Refresh activation and proof state." : "Confirm the standard offer and next customer action.",
                nextActionDueAt: null,
                opportunityId: opportunityRef.id,
                probabilityPercent: activated ? 100 : commerciallyEngaged ? 40 : 20,
                revenueAccountId: accountRef.id,
                stage: activated ? "won" : "qualified",
                stalledReason: null,
                status: activated ? "won" : "open",
                targetId: currentTarget.targetId,
                title: `${currentTarget.displayName} - MenuList standard path`,
                updatedAt: toIso(timestamp),
                valueMinor: 0,
                winLossReason: activated ? "Existing two-surface activation outcome." : null,
            };
            transaction.set(opportunityRef, sanitizeForFirestore({ ...opportunity, pId: SIGNALDESK_PRODUCT_CODE, createdAt: timestamp, updatedAt: timestamp, updatedBy: access.userId }));
        }
        transaction.set(summaryRef, sanitizeForFirestore({
            activatedAccountCount: increment(0),
            founderAttentionMinutes: increment(0),
            lostOpportunityCount: increment(0),
            openOpportunityCount: increment(eligible && !existingOpportunity && !activated ? 1 : 0),
            pipelineValueMinor: increment(0),
            revenueAccountCount: increment(existingAccount ? 0 : 1),
            stalledActivationCount: increment(0),
            updatedAt: timestamp,
            weightedPipelineValueMinor: increment(0),
            wonOpportunityCount: increment(eligible && !existingOpportunity && activated ? 1 : 0),
        }), { merge: true });
        appendAudit(db, transaction, access, "revenue_account_qualify", "revenueAccount", accountRef.id, activated ? "activated" : eligible ? "qualified" : complianceState);
        writeRunTimeline(db, transaction, {
            entityId: accountRef.id,
            entityType: "revenue-account",
            label: `Revenue account: ${currentTarget.displayName}`,
            status: activated ? "completed" : eligible ? "ready" : complianceState === "suppressed" || complianceState === "blocked" ? "blocked" : "held",
            steps: [
                { label: "Existing target linked", status: "completed", at: toIso(timestamp) },
                { label: "Source policy checked", status: "completed", at: toIso(timestamp) },
                { label: activated ? "Existing two-surface activation preserved" : eligible ? "Commercial qualification passed" : "Commercial qualification held", status: activated || eligible ? "completed" : "held", at: toIso(timestamp) },
            ],
        });
        updateDailyCost(db, transaction, eligible && !existingOpportunity ? 6 : 5, 0);
        return {
            account: toPlain(account) as SignalDeskRevenueAccountSummary,
            hasRecordedOutcome,
            opportunity: opportunity ? toPlain(opportunity) : null,
            qualified: eligible,
        };
    });
    const { hasRecordedOutcome, ...qualificationResult } = qualification;
    let activationWatch: SignalDeskActivationWatchSummary | null = null;
    if (hasRecordedOutcome || hasTwoSurfaceActivation) {
        try {
            activationWatch = await refreshSignalDeskActivationWatchServer(access, { targetId: input.targetId });
        } catch (error) {
            logRuntimeFailure(SIGNALDESK_ACTIVATION_WATCH_AUTO_SYNC_FAILED, error, {
                product: "signaldesk",
                reconciliation: "qualification-after-outcome",
                targetIdPresent: true,
            });
        }
    }
    return { ...qualificationResult, activationWatch };
}

export async function upsertSignalDeskCommercialOpportunityServer(
    access: SignalDeskAccessContext,
    input: CommercialOpportunityInput,
) {
    requireRevenueOperatingLayer();
    const terminalStageByStatus: Partial<Record<SignalDeskCommercialOpportunitySummary["status"], SignalDeskCommercialOpportunitySummary["stage"]>> = {
        lost: "lost",
        nurture: "nurture",
        won: "won",
    };
    const terminalStage = terminalStageByStatus[input.status];
    const openStage = input.stage === "qualified" || input.stage === "discovery" || input.stage === "offer" || input.stage === "decision";
    if ((input.status === "open" && !openStage) || (terminalStage && input.stage !== terminalStage)) {
        throw new Error("Commercial opportunity stage and status do not match");
    }
    if ((input.status === "won" || input.status === "lost") && !normalizeText(input.winLossReason)) {
        throw new Error("Commercial opportunity win or loss reason is required");
    }
    const db = requireDb();
    const opportunityRef = db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES).doc(input.opportunityId);
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE);
    return db.runTransaction(async (transaction: any) => {
        const opportunitySnap = await transaction.get(opportunityRef);
        if (!opportunitySnap.exists) throw new Error("Commercial opportunity not found");
        const existing = toPlain(opportunitySnap.data()) as SignalDeskCommercialOpportunitySummary;
        const commercialOfferId = input.commercialOfferId || existing.commercialOfferId || null;
        const offerRef = commercialOfferId
            ? db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS).doc(commercialOfferId)
            : null;
        const [offerSnap, summarySnap] = await Promise.all([
            offerRef ? transaction.get(offerRef) : Promise.resolve(null),
            transaction.get(summaryRef),
        ]);
        if (input.commercialOfferId && (!offerSnap?.exists || offerSnap.data()?.status !== "active")) {
            throw new Error("Commercial offer is not active");
        }
        const valueMinor = Math.max(0, Math.round(input.valueMinor));
        if (valueMinor > 0 && !offerSnap?.exists) throw new Error("Commercial offer is required for valued opportunity");
        const offer = offerSnap?.exists ? toPlain(offerSnap.data()) as SignalDeskCommercialOfferSummary : null;
        const currency = offer?.currency || existing.currency || null;
        const summary = summarySnap.exists ? toPlain(summarySnap.data()) as SignalDeskRevenueControlSummary : null;
        if (existing.currency && currency && existing.currency !== currency) {
            throw new Error("Commercial opportunity currency does not match revenue pipeline");
        }
        if (input.status === "open" && valueMinor > 0 && summary?.pipelineCurrency && summary.pipelineCurrency !== currency) {
            throw new Error("Commercial opportunity currency does not match revenue pipeline");
        }
        const timestamp = now();
        const probabilityPercent = Math.max(0, Math.min(100, Math.round(input.probabilityPercent)));
        const founderAttentionMinutes = Math.max(0, Math.round(input.founderAttentionMinutes));
        const oldOpen = existing.status === "open" ? 1 : 0;
        const newOpen = input.status === "open" ? 1 : 0;
        const oldPipelineValue = oldOpen ? numberOrZero(existing.valueMinor) : 0;
        const newPipelineValue = newOpen ? valueMinor : 0;
        const oldWeightedValue = oldOpen ? Math.round(numberOrZero(existing.valueMinor) * numberOrZero(existing.probabilityPercent) / 100) : 0;
        const newWeightedValue = newOpen ? Math.round(valueMinor * probabilityPercent / 100) : 0;
        const opportunity = {
            ...existing,
            commercialOfferId,
            currency,
            expectedCloseAt: input.expectedCloseAt === undefined ? existing.expectedCloseAt || null : new Date(input.expectedCloseAt),
            founderAttentionMinutes,
            nextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt === undefined ? existing.nextActionDueAt || null : new Date(input.nextActionDueAt),
            probabilityPercent,
            stage: input.stage,
            stalledReason: input.stalledReason === undefined ? existing.stalledReason || null : normalizeText(input.stalledReason) || null,
            status: input.status,
            updatedAt: timestamp,
            updatedBy: access.userId,
            valueMinor,
            winLossReason: normalizeText(input.winLossReason) || null,
        };
        const accountLifecycle: SignalDeskRevenueAccountSummary["lifecycleStage"] = input.status === "won"
            ? "customer"
            : input.status === "lost"
                ? "lost"
                : input.status === "nurture"
                    ? "nurture"
                    : "opportunity";
        transaction.set(opportunityRef, sanitizeForFirestore(opportunity), { merge: true });
        transaction.set(db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS).doc(existing.revenueAccountId), sanitizeForFirestore({
            lifecycleStage: accountLifecycle,
            nextAction: input.nextAction,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
        transaction.set(summaryRef, sanitizeForFirestore({
            founderAttentionMinutes: increment(founderAttentionMinutes - numberOrZero(existing.founderAttentionMinutes)),
            lostOpportunityCount: increment((input.status === "lost" ? 1 : 0) - (existing.status === "lost" ? 1 : 0)),
            openOpportunityCount: increment(newOpen - oldOpen),
            pipelineCurrency: summary?.pipelineCurrency || (newOpen && valueMinor > 0 ? currency : null),
            pipelineValueMinor: increment(newPipelineValue - oldPipelineValue),
            updatedAt: timestamp,
            weightedPipelineValueMinor: increment(newWeightedValue - oldWeightedValue),
            wonOpportunityCount: increment((input.status === "won" ? 1 : 0) - (existing.status === "won" ? 1 : 0)),
        }), { merge: true });
        appendAudit(db, transaction, access, "commercial_opportunity_upsert", "commercialOpportunity", opportunityRef.id, `${input.stage}:${input.status}`);
        writeRunTimeline(db, transaction, {
            entityId: opportunityRef.id,
            entityType: "commercial-opportunity",
            label: opportunity.title,
            status: input.status === "open" ? "ready" : input.status === "lost" ? "blocked" : "completed",
            steps: [
                { label: `Stage: ${input.stage}`, status: "completed", at: toIso(timestamp) },
                { label: input.nextAction, status: input.status === "open" ? "ready" : "completed", at: toIso(timestamp) },
                { label: `${founderAttentionMinutes} founder minutes recorded`, status: "completed", at: toIso(timestamp) },
            ],
        });
        updateDailyCost(db, transaction, 6, 0);
        return toPlain(opportunity) as SignalDeskCommercialOpportunitySummary;
    });
}

export async function upsertSignalDeskCommercialOfferServer(
    access: SignalDeskAccessContext,
    input: CommercialOfferInput,
) {
    requireRevenueOperatingLayer();
    if (!input.founderApprovalConditions.length) throw new Error("Commercial offer approval conditions are required");
    const db = requireDb();
    const expectedOfferId = commercialOfferIdFor(input.name, input.version);
    if (input.commercialOfferId && input.commercialOfferId !== expectedOfferId) {
        throw new Error("Commercial offer ID does not match name and version");
    }
    const offerRef = db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS).doc(expectedOfferId);
    const offerCtaRef = input.offerCtaId ? db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(input.offerCtaId) : null;
    const normalizedTerms = {
        allowedDiscountBps: Math.max(0, Math.min(10000, Math.round(input.allowedDiscountBps))),
        billingCadence: input.billingCadence,
        contents: input.contents,
        currency: input.currency.toUpperCase(),
        eligibilitySummary: input.eligibilitySummary,
        founderApprovalConditions: input.founderApprovalConditions,
        name: input.name,
        offerCtaId: input.offerCtaId || null,
        priceMinor: Math.max(0, Math.round(input.priceMinor)),
        version: Math.max(1, Math.round(input.version)),
    };
    return db.runTransaction(async (transaction: any) => {
        const [existingOfferSnap, offerCtaSnap] = await Promise.all([
            transaction.get(offerRef),
            offerCtaRef ? transaction.get(offerCtaRef) : Promise.resolve(null),
        ]);
        if (offerCtaRef && (!offerCtaSnap?.exists || offerCtaSnap.data()?.status === "blocked")) throw new Error("Offer CTA is blocked");
        if (existingOfferSnap.exists) {
            const existing = toPlain(existingOfferSnap.data()) as SignalDeskCommercialOfferSummary;
            const existingTerms = {
                allowedDiscountBps: existing.allowedDiscountBps,
                billingCadence: existing.billingCadence,
                contents: existing.contents,
                currency: existing.currency,
                eligibilitySummary: existing.eligibilitySummary,
                founderApprovalConditions: existing.founderApprovalConditions,
                name: existing.name,
                offerCtaId: existing.offerCtaId || null,
                priceMinor: existing.priceMinor,
                version: existing.version,
            };
            if (JSON.stringify(existingTerms) !== JSON.stringify(normalizedTerms)) {
                throw new Error("Commercial offer version already exists with different terms");
            }
        }
        const timestamp = now();
        const offer = {
            ...normalizedTerms,
            commercialOfferId: offerRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            status: input.status,
            updatedAt: timestamp,
            updatedBy: access.userId,
        };
        transaction.set(offerRef, sanitizeForFirestore(offer), { merge: true });
        appendAudit(db, transaction, access, "commercial_offer_upsert", "commercialOffer", offerRef.id, `${offer.name}:v${offer.version}`);
        writeRunTimeline(db, transaction, {
            entityId: offerRef.id,
            entityType: "commercial-offer",
            label: `Commercial offer: ${offer.name}`,
            status: offer.status === "active" ? "ready" : offer.status === "blocked" ? "blocked" : "held",
            steps: [
                { label: `Version ${offer.version} stored`, status: "completed", at: toIso(timestamp) },
                { label: "Price and discount authority recorded", status: "completed", at: toIso(timestamp) },
                { label: "Founder approval conditions recorded", status: offer.founderApprovalConditions.length ? "completed" : "held", at: toIso(timestamp) },
            ],
        });
        updateDailyCost(db, transaction, 4, 0);
        return toPlain(offer) as SignalDeskCommercialOfferSummary;
    });
}

export async function upsertSignalDeskOperatingEnvelopeServer(
    access: SignalDeskAccessContext,
    input: OperatingEnvelopeInput,
) {
    requireRevenueOperatingLayer();
    if (input.status === "approved" && (access.role !== "founder-admin" || !access.permissions.includes("policy.approve"))) {
        throw new Error("Founder approval is required for operating envelopes");
    }
    const db = requireDb();
    const startsAt = new Date(input.startsAt);
    const expiresAt = new Date(input.expiresAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(expiresAt.getTime()) || expiresAt <= startsAt || expiresAt <= new Date()) {
        throw new Error("Operating envelope dates are invalid");
    }
    if (input.totalVolumeCap < input.dailyVolumeCap) throw new Error("Operating envelope total volume must cover the daily cap");
    if (!input.marketPodId) throw new Error("Market pod is required for operating envelope");
    const sourcePolicyRefs = input.sourcePolicyIds.map((sourcePolicyId) => db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(sourcePolicyId));
    const offerRef = db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS).doc(input.commercialOfferId);
    const marketPodRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(input.marketPodId);
    const budgetRef = input.budgetPolicyId
        ? db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(input.budgetPolicyId)
        : null;
    const senderRef = input.senderDomainId
        ? db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS).doc(input.senderDomainId)
        : null;
    const templateRefs = input.templateIds.map((templateId) => db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc(templateId));
    const sourcePolicies = await Promise.all(input.sourcePolicyIds.map((sourcePolicyId) => readSourcePolicy(db, sourcePolicyId)));
    for (const policy of sourcePolicies) {
        await assertSourcePolicyUsable(db, access, policy, {
            entityId: input.operatingEnvelopeId || input.name,
            use: input.channel === "email" || input.channel === "manual" ? "contact" : "evidence",
        });
    }
    const offerSnap = await offerRef.get();
    if (!offerSnap.exists || offerSnap.data()?.status !== "active") throw new Error("Commercial offer is not active");
    const podSnap = await marketPodRef.get();
    const marketPod = podSnap.exists ? toPlain(podSnap.data()) as SignalDeskMarketPodSummary : null;
    if (!marketPod || marketPod.status !== "active" || marketPod.reviewDecision !== "approved" || !marketPod.approvedBy) {
        throw new Error("Market pod is not founder-approved");
    }
    if (input.budgetPolicyId) {
        const budgetSnap = await budgetRef!.get();
        if (!budgetSnap.exists || budgetSnap.data()?.status !== "active") throw new Error("Revenue budget policy is not active");
        const budget = toPlain(budgetSnap.data()) as SignalDeskBudgetPolicySummary;
        const eligibleBudget = budget.scope === "global"
            || (budget.scope === "market-pod" && Boolean(input.marketPodId) && budget.scopeId === input.marketPodId);
        if (!eligibleBudget) throw new Error("Budget policy is not eligible for revenue envelope");
        const remainingMonthlyBudgetUsd = Math.max(0, numberOrZero(budget.monthlyBudgetUsd) - numberOrZero(budget.spentMonthUsd));
        if (input.maxCostUsd > remainingMonthlyBudgetUsd) throw new Error("Operating envelope exceeds the remaining budget policy");
    }
    if (input.channel === "email") {
        if (!input.senderDomainId) throw new Error("Sender domain is required for email envelope");
        const sender = await readReadySenderDomain(db, input.senderDomainId);
        if (!isSenderDomainReady(sender)) throw new Error("Sender domain is not ready");
    }
    const templateSnaps = await Promise.all(templateRefs.map((templateRef) => templateRef.get()));
    if (templateSnaps.some((snap: any) => !snap.exists || snap.data()?.status !== "active")) throw new Error("Active template is required");

    const requestedApprovalMode = input.requestedApprovalMode;
    const exceptionOnlyHeld = requestedApprovalMode === "exception-only";
    const approvalMode: SignalDeskOperatingEnvelopeSummary["approvalMode"] = exceptionOnlyHeld
        ? "prepare-and-approve-each"
        : requestedApprovalMode;
    const executionState: SignalDeskOperatingEnvelopeSummary["executionState"] = exceptionOnlyHeld
        ? "held"
        : input.status === "paused"
            ? "paused"
            : input.status === "draft" || input.status === "held" || input.status === "expired"
                ? "held"
                : input.status === "shadow" || approvalMode === "manual" || approvalMode === "recommendation-only"
                ? "shadow"
                : "approval-only";
    const status: SignalDeskOperatingEnvelopeSummary["status"] = exceptionOnlyHeld ? "held" : input.status;
    const expectedEnvelopeId = operatingEnvelopeIdFor(input.name, input.version);
    if (input.operatingEnvelopeId && input.operatingEnvelopeId !== expectedEnvelopeId) {
        throw new Error("Operating envelope ID does not match name and version");
    }
    const envelopeRef = db.collection(SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES).doc(expectedEnvelopeId);
    const timestamp = now();
    const immutableTerms = {
        approvalMode,
        budgetPolicyId: input.budgetPolicyId || null,
        channel: input.channel,
        commercialOfferId: input.commercialOfferId,
        dailyVolumeCap: Math.max(1, Math.min(500, Math.round(input.dailyVolumeCap))),
        expiresAt: expiresAt.toISOString(),
        fallbackAction: input.fallbackAction,
        marketPodId: input.marketPodId || null,
        maxCostUsd: Math.max(0, input.maxCostUsd),
        name: input.name,
        requestedApprovalMode,
        senderDomainId: input.senderDomainId || null,
        sourcePolicyIds: input.sourcePolicyIds,
        startsAt: startsAt.toISOString(),
        stopConditions: input.stopConditions,
        templateIds: input.templateIds,
        totalVolumeCap: Math.max(1, Math.min(5000, Math.round(input.totalVolumeCap))),
        version: Math.max(1, Math.round(input.version)),
    };
    const envelope = {
        ...immutableTerms,
        approvedAt: status === "approved" ? timestamp : null,
        approvedBy: status === "approved" ? access.userId : null,
        executionState,
        expiresAt,
        operatingEnvelopeId: envelopeRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        startsAt,
        status,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    return db.runTransaction(async (transaction: any) => {
        const [
            existingEnvelopeSnap,
            currentOfferSnap,
            currentMarketPodSnap,
            currentBudgetSnap,
            currentSenderSnap,
            currentSourcePolicySnaps,
            currentTemplateSnaps,
        ] = await Promise.all([
            transaction.get(envelopeRef),
            transaction.get(offerRef),
            transaction.get(marketPodRef),
            budgetRef ? transaction.get(budgetRef) : Promise.resolve(null),
            senderRef ? transaction.get(senderRef) : Promise.resolve(null),
            Promise.all(sourcePolicyRefs.map((sourcePolicyRef) => transaction.get(sourcePolicyRef))),
            Promise.all(templateRefs.map((templateRef) => transaction.get(templateRef))),
        ]);
        if (!currentOfferSnap.exists || currentOfferSnap.data()?.status !== "active") {
            throw new Error("Commercial offer is not active");
        }
        const currentMarketPod = currentMarketPodSnap.exists
            ? toPlain(currentMarketPodSnap.data()) as SignalDeskMarketPodSummary
            : null;
        if (!currentMarketPod || currentMarketPod.status !== "active" || currentMarketPod.reviewDecision !== "approved" || !currentMarketPod.approvedBy) {
            throw new Error("Market pod is not founder-approved");
        }
        currentSourcePolicySnaps.forEach((currentSourcePolicySnap: any) => {
            const currentSourcePolicy = currentSourcePolicySnap.exists
                ? toPlain(currentSourcePolicySnap.data()) as SignalDeskSourcePolicy
                : null;
            const errorCode = sourcePolicyUsabilityError(currentSourcePolicy, {
                entityId: input.operatingEnvelopeId || input.name,
                use: input.channel === "email" || input.channel === "manual" ? "contact" : "evidence",
            });
            if (errorCode) throw new Error(errorCode);
        });
        if (budgetRef) {
            if (!currentBudgetSnap?.exists || currentBudgetSnap.data()?.status !== "active") {
                throw new Error("Revenue budget policy is not active");
            }
            const currentBudget = toPlain(currentBudgetSnap.data()) as SignalDeskBudgetPolicySummary;
            const eligibleBudget = currentBudget.scope === "global"
                || (currentBudget.scope === "market-pod" && currentBudget.scopeId === input.marketPodId);
            if (!eligibleBudget) throw new Error("Budget policy is not eligible for revenue envelope");
            const remainingMonthlyBudgetUsd = Math.max(0, numberOrZero(currentBudget.monthlyBudgetUsd) - numberOrZero(currentBudget.spentMonthUsd));
            if (input.maxCostUsd > remainingMonthlyBudgetUsd) {
                throw new Error("Operating envelope exceeds the remaining budget policy");
            }
        }
        if (input.channel === "email") {
            const currentSender = currentSenderSnap?.exists
                ? toPlain(currentSenderSnap.data()) as SignalDeskSenderDomainSummary
                : null;
            if (!isSenderDomainReady(currentSender)) throw new Error("Sender domain is not ready");
        }
        if (currentTemplateSnaps.some((currentTemplateSnap: any) => !currentTemplateSnap.exists || currentTemplateSnap.data()?.status !== "active")) {
            throw new Error("Active template is required");
        }
        const existingEnvelope = existingEnvelopeSnap.exists
            ? toPlain(existingEnvelopeSnap.data()) as SignalDeskOperatingEnvelopeSummary
            : null;
        if (existingEnvelopeSnap.exists) {
            const existingTerms = {
                approvalMode: existingEnvelope?.approvalMode,
                budgetPolicyId: existingEnvelope?.budgetPolicyId || null,
                channel: existingEnvelope?.channel,
                commercialOfferId: existingEnvelope?.commercialOfferId,
                dailyVolumeCap: existingEnvelope?.dailyVolumeCap,
                expiresAt: existingEnvelope?.expiresAt,
                fallbackAction: existingEnvelope?.fallbackAction,
                marketPodId: existingEnvelope?.marketPodId || null,
                maxCostUsd: existingEnvelope?.maxCostUsd,
                name: existingEnvelope?.name,
                requestedApprovalMode: existingEnvelope?.requestedApprovalMode,
                senderDomainId: existingEnvelope?.senderDomainId || null,
                sourcePolicyIds: existingEnvelope?.sourcePolicyIds,
                startsAt: existingEnvelope?.startsAt,
                stopConditions: existingEnvelope?.stopConditions,
                templateIds: existingEnvelope?.templateIds,
                totalVolumeCap: existingEnvelope?.totalVolumeCap,
                version: existingEnvelope?.version,
            };
            if (JSON.stringify(existingTerms) !== JSON.stringify(immutableTerms)) {
                throw new Error("Operating envelope version already exists with different terms");
            }
        }
        const storedEnvelope = {
            ...envelope,
            approvedAt: status === "approved" ? timestamp : existingEnvelope?.approvedAt || null,
            approvedBy: status === "approved" ? access.userId : existingEnvelope?.approvedBy || null,
        };
        transaction.set(envelopeRef, sanitizeForFirestore(storedEnvelope), { merge: true });
        appendAudit(db, transaction, access, "operating_envelope_upsert", "operatingEnvelope", envelopeRef.id, `${requestedApprovalMode}:${executionState}`);
        writeRunTimeline(db, transaction, {
            entityId: envelopeRef.id,
            entityType: "operating-envelope",
            label: `Operating envelope: ${input.name}`,
            status: executionState === "approval-only" ? "ready" : executionState === "held" || executionState === "paused" ? "held" : "completed",
            steps: [
                { label: "Existing policy references validated", status: "completed", at: toIso(timestamp) },
                { label: `${input.dailyVolumeCap} daily / ${input.totalVolumeCap} total cap`, status: "completed", at: toIso(timestamp) },
                { label: exceptionOnlyHeld ? "Exception-only execution held until operating proof" : `Execution remains ${executionState}`, status: exceptionOnlyHeld ? "held" : "completed", at: toIso(timestamp) },
            ],
        });
        updateDailyCost(db, transaction, 4, 0);
        return toPlain(storedEnvelope) as SignalDeskOperatingEnvelopeSummary;
    });
}

export async function refreshSignalDeskActivationWatchServer(
    access: SignalDeskAccessContext,
    input: ActivationWatchInput,
) {
    requireRevenueOperatingLayer();
    const db = requireDb();
    const accountRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS).doc(revenueAccountIdFor(input.targetId));
    const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId);
    const watchRef = db.collection(SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES).doc(activationWatchIdFor(input.targetId));
    const opportunityRef = db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES).doc(opportunityIdFor(accountRef.id));
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE);
    const outcomeCollection = db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES);
    const latestOutcomeQuery = outcomeCollection
        .where("targetId", "==", input.targetId)
        .orderBy("updatedAt", "desc")
        .limit(30);
    const activationOutcomeQuery = outcomeCollection
        .where("targetId", "==", input.targetId)
        .where("outcomeType", "==", "two_surface_activation")
        .limit(30);
    return db.runTransaction(async (transaction: any) => {
        const [accountSnap, targetSnap, latestOutcomeSnap, activationOutcomeSnap, existingSnap, opportunitySnap] = await Promise.all([
            transaction.get(accountRef),
            transaction.get(targetRef),
            transaction.get(latestOutcomeQuery),
            transaction.get(activationOutcomeQuery),
            transaction.get(watchRef),
            transaction.get(opportunityRef),
        ]);
        if (!accountSnap.exists) throw new Error("Revenue account not found");
        if (!targetSnap.exists) throw new Error("Target not found");
        const account = toPlain(accountSnap.data()) as SignalDeskRevenueAccountSummary;
        const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
        const existing = existingSnap.exists ? toPlain(existingSnap.data()) as SignalDeskActivationWatchSummary : null;
        const outcomes = latestOutcomeSnap.docs.map((doc: any) => toPlain(doc.data()) as SignalDeskOutcomeSummary);
        const outcomeTypes = Array.from(new Set(outcomes
            .filter((outcome) => numberOrZero(outcome.count) > 0 && (outcome.outcomeType !== "two_surface_activation" || isVerifiedTwoSurfaceOutcome(outcome)))
            .map((outcome) => outcome.outcomeType)));
        const projectedActivationSurfaces = new Set(target.latestVerifiedActivationSurfaces || []);
        const activationRecorded = Boolean(
            target.latestVerifiedActivationAt
            && target.latestVerifiedActivationEvidenceRef
            && (target.latestVerifiedActivationIntegrityStatus === "owner-reviewed-manual" || target.latestVerifiedActivationIntegrityStatus === "menulist-signed")
            && projectedActivationSurfaces.size >= 2
        ) || activationOutcomeSnap.docs.some((doc: any) => (
            isVerifiedTwoSurfaceOutcome(toPlain(doc.data()) as SignalDeskOutcomeSummary)
        ));
        if (activationRecorded && !outcomeTypes.includes("two_surface_activation")) outcomeTypes.push("two_surface_activation");
        const outcomeTimes = outcomes.map((outcome) => toTimestampMillis(outcome.updatedAt) || new Date(`${outcome.day}T00:00:00.000Z`).getTime()).filter(Number.isFinite);
        const ownerQualifiedTimes = [
            toTimestampMillis(target.ownerQualifiedAt),
            ...outcomes.map((outcome) => toTimestampMillis(outcome.ownerQualifiedAt)),
        ].filter((value): value is number => Boolean(value));
        const ownerQualifiedMillis = ownerQualifiedTimes.length ? Math.min(...ownerQualifiedTimes) : null;
        const lastOutcomeMillis = outcomeTimes.length ? Math.max(...outcomeTimes) : null;
        const deadlineMillis = ownerQualifiedMillis ? ownerQualifiedMillis + (7 * 24 * 60 * 60 * 1000) : null;
        let status: SignalDeskActivationWatchSummary["status"] = "not-started";
        if (activationRecorded) status = "activated";
        else if (outcomeTypes.includes("published")) status = "published";
        else if (outcomeTypes.includes("upload_started") || outcomeTypes.includes("preview_prepared")) status = "in-progress";
        else if (outcomeTypes.includes("route_created")) status = "routed";
        if (status !== "activated" && status !== "not-started" && deadlineMillis && deadlineMillis < Date.now()) status = "stalled";
        const activationState: SignalDeskRevenueAccountSummary["activationState"] = status === "activated"
            ? "activated"
            : status === "stalled"
                ? "stalled"
                : status === "routed"
                    ? "routed"
                    : status === "not-started"
                        ? "not-started"
                        : "in-progress";
        const opportunity = opportunitySnap.exists ? toPlain(opportunitySnap.data()) as SignalDeskCommercialOpportunitySummary : null;
        const closeOpportunity = status === "activated" && opportunity && opportunity.status !== "won";
        const timestamp = now();
        const nextAction = status === "activated"
            ? "Request approved proof or referral only when eligible."
            : status === "stalled"
                ? "Review the stalled MenuList route without changing MenuList truth."
                : status === "not-started"
                    ? "Create or attach an approved MenuList route."
                    : "Wait for the next MenuList-owned activation outcome.";
        const watch = {
            activationWatchId: watchRef.id,
            deadlineAt: deadlineMillis ? new Date(deadlineMillis) : null,
            lastOutcomeAt: lastOutcomeMillis ? new Date(lastOutcomeMillis) : null,
            nextAction,
            ownerQualifiedAt: ownerQualifiedMillis ? new Date(ownerQualifiedMillis) : null,
            outcomeTypes,
            pId: SIGNALDESK_PRODUCT_CODE,
            revenueAccountId: account.revenueAccountId,
            source: "signaldesk-outcome-summaries",
            status,
            targetId: input.targetId,
            updatedAt: timestamp,
            updatedBy: access.userId,
        };
        const oldOpen = closeOpportunity && opportunity?.status === "open" ? 1 : 0;
        const oldPipelineValue = oldOpen ? numberOrZero(opportunity?.valueMinor) : 0;
        const oldWeightedValue = oldOpen ? Math.round(numberOrZero(opportunity?.valueMinor) * numberOrZero(opportunity?.probabilityPercent) / 100) : 0;
        transaction.set(watchRef, sanitizeForFirestore(watch), { merge: true });
        transaction.set(accountRef, sanitizeForFirestore({
            activationState,
            lifecycleStage: status === "activated" ? "customer" : account.lifecycleStage,
            nextAction,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
        if (closeOpportunity && opportunity) {
            transaction.set(opportunityRef, sanitizeForFirestore({
                nextAction,
                probabilityPercent: 100,
                stage: "won",
                status: "won",
                updatedAt: timestamp,
                updatedBy: access.userId,
                winLossReason: "Two-surface activation outcome recorded.",
            }), { merge: true });
        }
        transaction.set(summaryRef, sanitizeForFirestore({
            activatedAccountCount: increment((status === "activated" ? 1 : 0) - (existing?.status === "activated" ? 1 : 0)),
            lostOpportunityCount: increment(closeOpportunity && opportunity?.status === "lost" ? -1 : 0),
            openOpportunityCount: increment(-oldOpen),
            pipelineValueMinor: increment(-oldPipelineValue),
            stalledActivationCount: increment((status === "stalled" ? 1 : 0) - (existing?.status === "stalled" ? 1 : 0)),
            updatedAt: timestamp,
            weightedPipelineValueMinor: increment(-oldWeightedValue),
            wonOpportunityCount: increment(closeOpportunity ? 1 : 0),
        }), { merge: true });
        appendAudit(db, transaction, access, "activation_watch_refresh", "activationWatch", watchRef.id, status);
        writeRunTimeline(db, transaction, {
            entityId: watchRef.id,
            entityType: "activation-watch",
            label: `Activation watch: ${account.displayName}`,
            status: status === "activated" ? "completed" : status === "stalled" ? "held" : status === "not-started" ? "held" : "ready",
            steps: [
                { label: "SignalDesk outcome summaries read", status: "completed", at: toIso(timestamp) },
                { label: outcomeTypes.length ? outcomeTypes.join(", ") : "No activation outcomes yet", status: outcomeTypes.length ? "completed" : "held", at: toIso(timestamp) },
                { label: `Activation state: ${status}`, status: status === "activated" ? "completed" : status === "stalled" ? "held" : "ready", at: toIso(timestamp) },
            ],
        });
        updateDailyCost(db, transaction, closeOpportunity ? 7 : 6, 0);
        return toPlain(watch) as SignalDeskActivationWatchSummary;
    });
}

export async function createSignalDeskExperimentCardServer(access: SignalDeskAccessContext, input: ExperimentCardInput) {
    requireOperatingLayer();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    if (input.ctaId) {
        const offerSnap = await db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(input.ctaId).get();
        if (offerSnap.exists && offerSnap.data()?.status === "blocked") throw new Error("Offer CTA is blocked");
    }
    const experimentRef = db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(experimentCardIdFor(input));
    const experiment = {
        experimentCardId: experimentRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        hypothesis: input.hypothesis,
        marketPodId: input.marketPodId || null,
        sourcePolicyId: input.sourcePolicyId || null,
        ctaId: input.ctaId || null,
        contentAssetId: input.contentAssetId || null,
        channel: input.channel,
        targetCount: input.targetCount,
        expectedOutcome: input.expectedOutcome,
        stopRule: input.stopRule,
        proofAssetSummary: input.proofAssetSummary || null,
        resultSummary: null,
        ownerDecision: "pending",
        status: input.status || "planned",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(experimentRef, sanitizeForFirestore(experiment), { merge: true });
    appendAudit(db, batch, access, "experiment_card_create", "experimentCard", experimentRef.id, input.channel);
    writeRunTimeline(db, batch, {
        entityId: experimentRef.id,
        entityType: "experiment",
        label: `Experiment: ${input.hypothesis.slice(0, 80)}`,
        status: experiment.status === "active" ? "ready" : experiment.status === "stopped" ? "blocked" : "held",
        steps: [
            { label: "Hypothesis recorded", status: "completed", at: toIso(timestamp) },
            { label: "Stop rule attached", status: "completed", at: toIso(timestamp) },
            { label: "Owner decision pending", status: "held", at: toIso(timestamp) },
        ],
    });
    updateDailyCost(db, batch, 4, 0);
    await batch.commit();
    return toPlain(experiment) as SignalDeskExperimentCardSummary;
}

export async function reviewSignalDeskExperimentCardServer(access: SignalDeskAccessContext, input: ExperimentReviewInput) {
    requireOperatingLayer();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const experimentRef = db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(input.experimentCardId);
    const experimentSnap = await experimentRef.get();
    if (!experimentSnap.exists) throw new Error("Experiment card not found");
    const prior = toPlain(experimentSnap.data()) as SignalDeskExperimentCardSummary;
    const status = input.status || (input.ownerDecision === "stop"
        ? "stopped"
        : input.ownerDecision === "complete"
            ? "completed"
            : prior.status);
    const updates = {
        ownerDecision: input.ownerDecision,
        resultSummary: input.resultSummary || prior.resultSummary || null,
        status,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(experimentRef, sanitizeForFirestore(updates), { merge: true });
    appendAudit(db, batch, access, "experiment_card_review", "experimentCard", input.experimentCardId, input.ownerDecision);
    writeRunTimeline(db, batch, {
        entityId: input.experimentCardId,
        entityType: "experiment",
        label: `Experiment reviewed: ${prior.hypothesis.slice(0, 80)}`,
        status: status === "completed" ? "completed" : status === "stopped" ? "blocked" : status === "active" ? "ready" : "held",
        steps: [
            { label: "Owner decision recorded", status: "completed", at: toIso(timestamp) },
            { label: `Decision: ${input.ownerDecision}`, status: input.ownerDecision === "stop" ? "blocked" : input.ownerDecision === "hold" ? "held" : "ready", at: toIso(timestamp) },
        ],
    });
    updateDailyCost(db, batch, 3, 0);
    await batch.commit();
    return toPlain({ ...prior, ...updates }) as SignalDeskExperimentCardSummary;
}

export async function createSignalDeskDailyGrowthMissionServer(access: SignalDeskAccessContext, input: DailyGrowthMissionInput = {}) {
    requireOperatingLayer();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const day = input.day || todayKey();
    const missionRef = db.collection(SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS).doc(growthMissionIdFor(day));
    const [
        approvals,
        conversations,
        sourceRuns,
        senderDomains,
        contentDrafts,
        marketPods,
        experiments,
        offerCtas,
        trustPartners,
        outcomes,
        demandSignals,
        commercialOpportunities,
        activationWatches,
        revenueControlSummaries,
        costSnap,
    ] = await Promise.all([
        readList<SignalDeskApprovalItem>(db, SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE),
        readList<SignalDeskConversationSummary>(db, SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES),
        readList<SignalDeskSourceRunSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES),
        readList<SignalDeskSenderDomainSummary>(db, SIGNALDESK_COLLECTIONS.SENDER_DOMAINS),
        readList<SignalDeskContentDistributionDraftSummary>(db, SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS),
        readList<SignalDeskMarketPodSummary>(db, SIGNALDESK_COLLECTIONS.MARKET_PODS),
        readList<SignalDeskExperimentCardSummary>(db, SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS),
        readList<SignalDeskOfferCtaSummary>(db, SIGNALDESK_COLLECTIONS.OFFER_CTAS),
        readList<SignalDeskTrustPartnerProfileSummary>(db, SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES),
        readList<SignalDeskOutcomeSummary>(db, SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES),
        readList<SignalDeskDemandSignalSummary>(db, SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES),
        readList<SignalDeskCommercialOpportunitySummary>(db, SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES),
        readList<SignalDeskActivationWatchSummary>(db, SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES),
        readList<SignalDeskRevenueControlSummary>(db, SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES),
        db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(day).get(),
    ]);

    type MissionAction = SignalDeskGrowthMissionSummary["missionActions"][number];
    const missionActions: MissionAction[] = [];
    const pushAction = (action: Omit<MissionAction, "actionId" | "rank" | "status">) => {
        if (missionActions.length >= 5) return;
        const rank = missionActions.length + 1;
        missionActions.push({
            ...action,
            actionId: `mission_${day}_${rank}`,
            rank,
            status: "pending",
        });
    };

    const criticalReplies = conversations.filter((conversation) => (
        conversation.state === "complaint"
        || conversation.state === "privacy_request"
        || conversation.state === "legal_request"
    ));
    if (criticalReplies.length) {
        const conversation = criticalReplies[0];
        pushAction({
            actionType: "pause",
            entityId: conversation.conversationId,
            entityType: "reply",
            expectedOutcome: "The complaint or rights request remains suppressed, paused, and under founder review.",
            label: `Resolve ${criticalReplies.length} critical reply exception${criticalReplies.length === 1 ? "" : "s"}`,
            reason: conversation.lastMessagePreview || conversation.state,
            riskLevel: "high",
        });
    }

    const replyQueue = conversations.filter((conversation) => conversation.state === "interested" || conversation.state === "needs_review");
    if (replyQueue.length) {
        const conversation = replyQueue[0];
        pushAction({
            actionType: "review",
            entityId: conversation.conversationId,
            entityType: "reply",
            expectedOutcome: "Interested or unclear reply routed to the correct self-serve, manual reply, or suppression path.",
            label: `Handle ${replyQueue.length} reply exception${replyQueue.length === 1 ? "" : "s"}`,
            reason: conversation.lastMessagePreview || "Reply state needs founder review.",
            riskLevel: conversation.state === "interested" ? "medium" : "high",
        });
    }

    const nowMillis = Date.now();
    const currentActivationWatches = activationWatches.map((watch) => annotateActivationWatch(watch, nowMillis));
    const stalledActivationWatches = currentActivationWatches
        .filter((watch) => watch.status === "stalled")
        .sort((left, right) => (
            (toTimestampMillis(left.deadlineAt) || Number.POSITIVE_INFINITY)
            - (toTimestampMillis(right.deadlineAt) || Number.POSITIVE_INFINITY)
        ));
    if (stalledActivationWatches.length) {
        const watch = stalledActivationWatches[0];
        pushAction({
            actionType: "review",
            entityId: watch.targetId,
            entityType: "target",
            expectedOutcome: "Stalled activation receives one bounded recovery action without changing MenuList truth.",
            label: `Recover ${stalledActivationWatches.length} stalled activation${stalledActivationWatches.length === 1 ? "" : "s"}`,
            reason: watch.nextAction,
            riskLevel: "high",
        });
    }

    const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
    if (pendingApprovals.length) {
        const approval = pendingApprovals[0];
        pushAction({
            actionType: "approve",
            entityId: approval.approvalId,
            entityType: "approval",
            expectedOutcome: "Approved or held outreach packet with evidence trace intact.",
            label: `Review ${pendingApprovals.length} pending approval${pendingApprovals.length === 1 ? "" : "s"}`,
            reason: approval.reviewReason || "Approval queue has founder-visible work.",
            riskLevel: approval.priority === "high" ? "high" : "medium",
        });
    }

    const overdueOpportunities = commercialOpportunities
        .filter((opportunity) => (
            opportunity.status === "open"
            && (
                Boolean(opportunity.stalledReason)
                || (toTimestampMillis(opportunity.nextActionDueAt) || Number.POSITIVE_INFINITY) < nowMillis
            )
        ))
        .sort((left, right) => (
            (toTimestampMillis(left.nextActionDueAt) || Number.POSITIVE_INFINITY)
            - (toTimestampMillis(right.nextActionDueAt) || Number.POSITIVE_INFINITY)
        ));
    if (overdueOpportunities.length) {
        const opportunity = overdueOpportunities[0];
        pushAction({
            actionType: "review",
            entityId: opportunity.targetId,
            entityType: "target",
            expectedOutcome: "The opportunity is advanced, moved to nurture, or held with a current next action.",
            label: `Resolve ${overdueOpportunities.length} overdue revenue next action${overdueOpportunities.length === 1 ? "" : "s"}`,
            reason: opportunity.stalledReason || opportunity.nextAction,
            riskLevel: opportunity.stalledReason ? "high" : "medium",
        });
    }

    const selectedPod = input.marketPodId
        ? marketPods.find((pod) => pod.marketPodId === input.marketPodId)
        : marketPods.find((pod) => pod.status === "active") || marketPods[0];
    const blockedSources = sourceRuns.filter((run) => run.status !== "completed" || numberOrZero(run.suppressedCount) > 0 || numberOrZero(run.duplicateCount) > 0);
    if (blockedSources.length) {
        const source = blockedSources[0];
        pushAction({
            actionType: "review",
            entityId: source.sourceRunId,
            entityType: "source",
            expectedOutcome: "Source quality decision recorded before more targets are approved.",
            label: `Review source quality for ${source.sourceName}`,
            reason: `${source.duplicateCount} duplicates, ${source.suppressedCount} suppressed, ${source.blockedCount} blocked.`,
            riskLevel: source.status === "blocked" ? "high" : "medium",
        });
    }

    const readySender = senderDomains.find(isSenderDomainReady);
    if (!readySender) {
        pushAction({
            actionType: "hold",
            entityId: senderDomains[0]?.senderDomainId || null,
            entityType: "sender",
            expectedOutcome: "Outbound remains export/manual-only until sender identity, unsubscribe, bounce, and complaint handling are ready.",
            label: "Keep sender gate held",
            reason: "No active sender domain is fully authenticated and unsubscribe-ready.",
            riskLevel: "high",
        });
    }

    const publishableDrafts = contentDrafts.filter((draft) => draft.status === "approved" || draft.status === "queued");
    if (publishableDrafts.length) {
        const draft = publishableDrafts[0];
        pushAction({
            actionType: "manual-publish",
            entityId: draft.contentDraftId,
            entityType: "content",
            expectedOutcome: "Approved proof content is manually published or held with a reason.",
            label: `Use ${publishableDrafts.length} approved content draft${publishableDrafts.length === 1 ? "" : "s"}`,
            reason: draft.reviewReason || draft.hook || "Approved proof content is ready for manual distribution.",
            riskLevel: "medium",
        });
    }

    const activeExperiment = experiments.find((experiment) => experiment.status === "active" || experiment.ownerDecision === "pending");
    if (activeExperiment) {
        pushAction({
            actionType: "review",
            entityId: activeExperiment.experimentCardId,
            entityType: "experiment",
            expectedOutcome: "Experiment is repeated, narrowed, stopped, held, or marked complete.",
            label: "Review active experiment",
            reason: activeExperiment.stopRule,
            riskLevel: activeExperiment.status === "active" ? "medium" : "low",
        });
    }

    const partnerCandidate = trustPartners.find((partner) => partner.status === "candidate" || partner.status === "approved");
    if (partnerCandidate) {
        pushAction({
            actionType: "review",
            entityId: partnerCandidate.partnerId,
            entityType: "partner",
            expectedOutcome: "Trust partner is advanced only if audience fit, disclosure, and flat-fee gates are clean.",
            label: `Review trust partner ${partnerCandidate.displayName}`,
            reason: partnerCandidate.sourceNotes,
            riskLevel: partnerCandidate.partnerType === "generic-creator" ? "high" : "medium",
        });
    }

    if (!missionActions.length) {
        pushAction({
            actionType: "redirect",
            entityId: selectedPod?.marketPodId || null,
            entityType: "market-pod",
            expectedOutcome: "One narrow 7-day operating trial is selected before any scale-up.",
            label: "Start one controlled market pod",
            reason: selectedPod
                ? `${selectedPod.name}: ${selectedPod.offerAngle}`
                : "No active work queue exists; pick one city, one category, one source, one CTA, and one sender identity.",
            riskLevel: "low",
        });
    }

    const activeOfferCount = offerCtas.filter((offer) => offer.status === "active").length;
    const weekActivationCount = outcomes.filter((outcome) => outcome.day >= day.slice(0, 8)).reduce((sum, outcome) => sum + numberOrZero(outcome.count), 0);
    const demandSignalCount = demandSignals.reduce((sum, signal) => sum + numberOrZero(signal.count), 0);
    const revenueSummary = revenueControlSummaries[0];
    const cost = toPlain(costSnap.data() || {}) as Partial<SignalDeskCostSummary>;
    const estimatedSpendToday = numberOrZero(cost.aiCostEstimate) + numberOrZero(cost.providerCostEstimate);
    const mission = {
        growthMissionId: missionRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        day,
        title: `Daily Growth Mission - ${day}`,
        summary: `${missionActions.length} founder decision${missionActions.length === 1 ? "" : "s"}; ${numberOrZero(revenueSummary?.openOpportunityCount)} open opportunities; ${stalledActivationWatches.length} stalled activations; ${numberOrZero(revenueSummary?.founderAttentionMinutes)} founder minutes; $${estimatedSpendToday.toFixed(2)} estimated spend today.`,
        expectedOutcome: stalledActivationWatches.length
            ? "Recover the oldest stalled activation before adding more targets or send volume."
            : overdueOpportunities.length
                ? "Resolve the oldest overdue revenue next action before widening the pod."
                : activeOfferCount
            ? "Move one narrow pod toward current-list upload, preview, or two-surface activation without expanding send volume."
            : "Create at least one approved offer CTA before outbound or partner work continues.",
        recommendedMarketPodId: selectedPod?.marketPodId || null,
        missionActions,
        approvalActionCount: missionActions.filter((action) => action.actionType === "approve").length,
        blockedActionCount: missionActions.filter((action) => action.riskLevel === "high" || action.actionType === "hold").length,
        ownerDecision: "pending",
        ownerDecisionNote: null,
        status: "ready",
        signalContext: {
            activeOfferCount,
            demandSignalCount,
            weekActivationCount,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };

    batch.set(missionRef, sanitizeForFirestore(mission), { merge: true });
    appendAudit(db, batch, access, "growth_mission_create", "growthMission", missionRef.id, day);
    writeRunTimeline(db, batch, {
        entityId: missionRef.id,
        entityType: "mission",
        label: mission.title,
        status: "ready",
        steps: missionActions.map((action) => ({
            label: action.label,
            status: action.riskLevel === "high" ? "held" : "ready",
            at: toIso(timestamp),
        })),
    });
    updateDailyCost(db, batch, 8 + missionActions.length, 0);
    await batch.commit();
    return toPlain(mission) as SignalDeskGrowthMissionSummary;
}

export async function reviewSignalDeskGrowthMissionServer(access: SignalDeskAccessContext, input: GrowthMissionReviewInput) {
    requireOperatingLayer();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const missionRef = db.collection(SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS).doc(input.growthMissionId);
    const missionSnap = await missionRef.get();
    if (!missionSnap.exists) throw new Error("Growth mission not found");
    const prior = toPlain(missionSnap.data()) as SignalDeskGrowthMissionSummary;
    const status = input.status || (input.ownerDecision === "approved"
        ? "approved"
        : input.ownerDecision === "hold"
            ? "held"
            : input.ownerDecision === "completed"
                ? "completed"
                : prior.status);
    const actionStatus = input.ownerDecision === "approved"
        ? "approved"
        : input.ownerDecision === "hold"
            ? "held"
            : input.ownerDecision === "completed"
                ? "completed"
                : input.ownerDecision === "redirected"
                    ? "redirected"
                    : "pending";
    const missionActions = (prior.missionActions || []).map((action) => ({
        ...action,
        status: action.status === "completed" ? action.status : actionStatus,
    }));
    const updates = {
        ownerDecision: input.ownerDecision,
        ownerDecisionNote: input.ownerDecisionNote || null,
        missionActions,
        status,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(missionRef, sanitizeForFirestore(updates), { merge: true });
    appendAudit(db, batch, access, "growth_mission_review", "growthMission", input.growthMissionId, input.ownerDecision);
    writeRunTimeline(db, batch, {
        entityId: input.growthMissionId,
        entityType: "mission",
        label: `Mission reviewed: ${prior.title}`,
        status: status === "completed" ? "completed" : status === "held" ? "held" : "ready",
        steps: [
            { label: "Owner decision recorded", status: "completed", at: toIso(timestamp) },
            { label: `Decision: ${input.ownerDecision}`, status: input.ownerDecision === "hold" ? "held" : "ready", at: toIso(timestamp) },
        ],
    });
    updateDailyCost(db, batch, 3, 0);
    await batch.commit();
    return toPlain({ ...prior, ...updates }) as SignalDeskGrowthMissionSummary;
}

export async function createSignalDeskSourceQualitySnapshotServer(access: SignalDeskAccessContext, input: SourceQualitySnapshotInput = {}) {
    requireOperatingLayer();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const [sourceRuns, targets, outcomes] = await Promise.all([
        readList<SignalDeskSourceRunSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES),
        readList<SignalDeskTargetSummary>(db, SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES, "updatedAt", 100),
        readList<SignalDeskOutcomeSummary>(db, SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES),
    ]);
    const sourceRun = input.sourceRunId
        ? sourceRuns.find((run) => run.sourceRunId === input.sourceRunId)
        : sourceRuns.find((run) => !input.sourcePolicyId || run.sourcePolicyId === input.sourcePolicyId) || sourceRuns[0];
    const policy = await readSourcePolicy(db, input.sourcePolicyId || sourceRun?.sourcePolicyId || null);
    const policyState = getSourcePolicyState(policy);
    const relatedTargets = targets.filter((target) => (
        (sourceRun?.sourceRunId && target.sourceRunId === sourceRun.sourceRunId) ||
        (policy?.sourcePolicyId && target.sourcePolicyId === policy.sourcePolicyId)
    ));
    const targetCount = numberOrZero(sourceRun?.importedCount) || relatedTargets.length;
    const duplicateRate = targetCount ? numberOrZero(sourceRun?.duplicateCount) / targetCount : 0;
    const usableTargetCount = relatedTargets.filter((target) => target.suppressionStatus === "clear" && target.status !== "rejected").length;
    const usableTargetRate = relatedTargets.length ? usableTargetCount / relatedTargets.length : targetCount ? Math.max(0, 1 - duplicateRate) : 0;
    const targetIds = new Set(relatedTargets.map((target) => target.targetId));
    const activationCount = outcomes
        .filter((outcome) => isVerifiedTwoSurfaceOutcome(outcome) && (!targetIds.size || (outcome.targetId && targetIds.has(outcome.targetId))))
        .reduce((sum, outcome) => sum + numberOrZero(outcome.count), 0);
    const activationRate = targetCount ? activationCount / targetCount : 0;
    const evidenceQualityScore = relatedTargets.length
        ? Math.round(relatedTargets.reduce((sum, target) => {
            if (target.sourceConfidence === "high") return sum + 90;
            if (target.sourceConfidence === "medium") return sum + 70;
            if (target.sourceConfidence === "low") return sum + 45;
            return sum + 10;
        }, 0) / relatedTargets.length)
        : policy ? 65 : 35;
    const complaintOrBounceRisk: SignalDeskSourceQualitySnapshotSummary["complaintOrBounceRisk"] = duplicateRate > 0.35 || numberOrZero(sourceRun?.suppressedCount) > 2
        ? "high"
        : duplicateRate > 0.15 || numberOrZero(sourceRun?.suppressedCount) > 0
            ? "medium"
            : "low";
    const recommendation: SignalDeskSourceQualitySnapshotSummary["recommendation"] = !policy
        ? "needs-policy"
        : policyState === "expired"
            ? "stop"
            : policyState === "review_required"
                ? "needs-policy"
        : complaintOrBounceRisk === "high"
            ? "stop"
            : usableTargetRate < 0.5
                ? "narrow"
                : evidenceQualityScore < 55
                    ? "refresh"
                    : "continue";
    const snapshotRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_QUALITY_SNAPSHOTS).doc(sourceQualitySnapshotIdFor({
        sourcePolicyId: policy?.sourcePolicyId || input.sourcePolicyId,
        sourceRunId: sourceRun?.sourceRunId || input.sourceRunId,
    }));
    const snapshot = {
        sourceQualitySnapshotId: snapshotRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        sourcePolicyId: policy?.sourcePolicyId || input.sourcePolicyId || null,
        sourceRunId: sourceRun?.sourceRunId || input.sourceRunId || null,
        sourceName: sourceRun?.sourceName || policy?.name || "Unselected source",
        targetCount,
        usableTargetRate,
        duplicateRate,
        activationRate,
        evidenceQualityScore,
        complaintOrBounceRisk: policyState === "expired" || policyState === "review_required" ? "high" : complaintOrBounceRisk,
        recommendation,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(snapshotRef, sanitizeForFirestore(snapshot), { merge: true });
    appendAudit(db, batch, access, "source_quality_snapshot_create", "sourceQualitySnapshot", snapshotRef.id, recommendation);
    writeRunTimeline(db, batch, {
        entityId: snapshotRef.id,
        entityType: "source-quality",
        label: `Source quality: ${snapshot.sourceName}`,
        status: recommendation === "continue" ? "ready" : recommendation === "stop" || recommendation === "needs-policy" ? "blocked" : "held",
        steps: [
            { label: `Usable rate ${Math.round(usableTargetRate * 100)}%`, status: usableTargetRate >= 0.5 ? "completed" : "held", at: toIso(timestamp) },
            { label: `Duplicate rate ${Math.round(duplicateRate * 100)}%`, status: duplicateRate <= 0.15 ? "completed" : "held", at: toIso(timestamp) },
            { label: `Recommendation: ${recommendation}`, status: recommendation === "continue" ? "ready" : "held", at: toIso(timestamp) },
        ],
    });
    updateDailyCost(db, batch, 6, 0);
    await batch.commit();
    return toPlain(snapshot) as SignalDeskSourceQualitySnapshotSummary;
}

export async function upsertSignalDeskChannelWindowStateServer(access: SignalDeskAccessContext, input: ChannelWindowStateInput) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const targetSnap = input.targetId
        ? await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get()
        : null;
    const target = targetSnap?.exists ? toPlain(targetSnap.data()) as SignalDeskTargetSummary : null;
    const defaultDays = input.source === "ad-click" ? 3 : input.source === "template" ? 0 : 1;
    const expiresAt = input.status === "open"
        ? timestampFromIsoOrDefault(input.expiresAt, defaultDays)
        : input.expiresAt
            ? timestampFromIsoOrDefault(input.expiresAt, defaultDays)
            : null;
    const eligibleForHandoff = input.status === "open" && input.source !== "template" && (!expiresAt || new Date(toIso(expiresAt) || "").getTime() > Date.now());
    const windowRef = db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES).doc(channelWindowIdFor(input.channel, input.targetId));
    const windowState = {
        channelWindowId: windowRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        channel: input.channel,
        targetId: input.targetId || null,
        targetName: target?.displayName || null,
        source: input.source,
        status: input.status,
        eligibleForHandoff,
        reason: input.reason || null,
        openedAt: input.status === "open" ? timestamp : null,
        lastInteractionAt: timestamp,
        expiresAt,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };

    batch.set(windowRef, sanitizeForFirestore(windowState), { merge: true });
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc(input.channel), sanitizeForFirestore({
        channel: input.channel,
        configured: true,
        lastEventAt: timestamp,
        status: eligibleForHandoff ? "healthy" : input.status === "blocked" ? "warning" : "paused",
        lastError: eligibleForHandoff ? null : input.reason || "Channel window is not ready.",
        updatedAt: timestamp,
    }), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: windowRef.id,
        entityType: "channel-window",
        label: `${input.channel} channel window`,
        status: eligibleForHandoff ? "ready" : input.status === "blocked" ? "blocked" : "held",
        steps: [
            { label: `${input.source} source recorded`, status: "completed", at: toIso(timestamp) },
            { label: "Window eligibility checked", status: eligibleForHandoff ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "channel_window_upsert", "channelWindow", windowRef.id, input.channel);
    updateDailyCost(db, batch, 4, 0, 0);
    await batch.commit();
    return toPlain(windowState) as SignalDeskChannelWindowStateSummary;
}

export async function refreshSignalDeskProviderSourceRetentionServer(
    access: SignalDeskAccessContext,
    input: ProviderSourceRetentionRefreshInput,
) {
    const db = requireDb();
    const retentionRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION).doc(input.providerSourceRetentionId);
    const retentionSnap = await retentionRef.get();
    if (!retentionSnap.exists) throw new Error("Provider source retention record not found");
    const existing = toPlain(retentionSnap.data()) as SignalDeskProviderSourceRetentionSummary;
    await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, existing.sourcePolicyId), {
        entityId: input.providerSourceRetentionId,
        use: "retention-refresh",
    });
    const batch = db.batch();
    const timestamp = now();
    const refreshed = input.status === "refreshed";
    const updates = {
        status: input.status,
        lastRefreshedAt: refreshed ? timestamp : existing.lastRefreshedAt || null,
        refreshDueAt: refreshed && existing.provider === "google-places" ? timestampAfterDays(365) : existing.refreshDueAt || null,
        retentionExpiresAt: refreshed ? timestampAfterDays(365) : existing.retentionExpiresAt || null,
        notes: input.notes || null,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(retentionRef, sanitizeForFirestore(updates), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: retentionRef.id,
        entityType: "provider",
        label: `${existing.provider} retention refresh`,
        status: refreshed ? "completed" : input.status === "blocked" ? "blocked" : "held",
        steps: [
            { label: "Provider source record loaded", status: "completed", at: toIso(timestamp) },
            { label: refreshed ? "Refresh state updated" : `Marked ${input.status}`, status: refreshed ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "provider_source_retention_refresh", "providerSourceRetention", retentionRef.id, input.status);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return { ...existing, ...toPlain(updates), providerSourceRetentionId: retentionRef.id } as SignalDeskProviderSourceRetentionSummary;
}

export async function recommendSignalDeskMarketPodPlanServer(
    access: SignalDeskAccessContext,
    input: MarketPodRecommendationInput,
) {
    const db = requireDb();
    const [targetSnap, outcomeSnap, demandSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).orderBy("updatedAt", "desc").limit(30).get(),
        db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).orderBy("updatedAt", "desc").limit(30).get(),
        db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).orderBy("updatedAt", "desc").limit(30).get(),
    ]);
    const targets = targetSnap.docs.map((doc: any) => toPlain(doc.data()) as SignalDeskTargetSummary);
    const outcomes = outcomeSnap.docs.map((doc: any) => toPlain(doc.data()) as SignalDeskOutcomeSummary);
    const demand = demandSnap.docs.map((doc: any) => toPlain(doc.data()) as SignalDeskDemandSignalSummary);
    const grouped = new Map<string, { category: string; city: string; count: number }>();
    targets.forEach((target) => {
        const city = target.city || "Unknown city";
        const category = target.category || "restaurant";
        const key = `${city}|${category}`;
        const current = grouped.get(key) || { category, city, count: 0 };
        current.count += 1;
        grouped.set(key, current);
    });
    const best = Array.from(grouped.values()).sort((a, b) => b.count - a.count)[0] || { category: "restaurant", city: "First city", count: 0 };
    const outcomeCount = outcomes.reduce((sum, outcome) => sum + numberOrZero(outcome.count), 0);
    const demandCount = demand.reduce((sum, signal) => sum + numberOrZero(signal.count), 0);
    const confidence: SignalDeskConfidence = best.count >= 5 && (outcomeCount || demandCount) ? "high" : best.count >= 3 ? "medium" : "low";
    const recommendation: NonNullable<SignalDeskMarketPodSummary["recommendation"]> = confidence === "low" ? "hold" : outcomeCount ? "expand" : "activate";
    const timestamp = now();
    const podRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(input.marketPodId || `market_pod_${hashValue(`${best.city}|${best.category}`).slice(0, 18)}`);
    const existingPodSnap = await podRef.get();
    const existingPod = existingPodSnap.exists ? toPlain(existingPodSnap.data()) as SignalDeskMarketPodSummary : null;
    const founderControlledScope = Boolean(existingPod?.reviewedBy || existingPod?.approvedBy);
    const status: SignalDeskMarketPodSummary["status"] = existingPod?.reviewDecision === "approved" && existingPod.approvedBy
        ? "active"
        : existingPod?.reviewDecision === "rejected"
            ? "blocked"
            : "hold";
    const pod = {
        approvedAt: existingPod?.approvedAt || null,
        approvedBy: existingPod?.approvedBy || null,
        marketPodId: podRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        name: founderControlledScope ? existingPod?.name : `${best.city} ${best.category} pod`,
        status,
        city: founderControlledScope ? existingPod?.city || null : best.city,
        country: founderControlledScope ? existingPod?.country || null : "India",
        category: founderControlledScope ? existingPod?.category || null : best.category,
        offerAngle: founderControlledScope ? existingPod?.offerAngle : "Current-list proof and private preview.",
        monthlyBudgetUsd: founderControlledScope ? numberOrZero(existingPod?.monthlyBudgetUsd) : 0,
        successMetric: founderControlledScope ? existingPod?.successMetric : outcomeCount ? "two_surface_activation" : "preview_prepared",
        confidence,
        recommendation,
        recommendationReason: `${best.count} matching targets, ${demandCount} demand signals, ${outcomeCount} outcomes.`,
        recommendedActions: [
            "Keep source policy approved before imports.",
            "Prepare evidence packets before outbound.",
            "Use one CTA until outcomes prove another angle.",
        ],
        reviewDecision: existingPod?.reviewDecision || null,
        reviewedAt: existingPod?.reviewedAt || null,
        reviewedBy: existingPod?.reviewedBy || null,
        reviewReason: existingPod?.reviewReason || null,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    const batch = db.batch();
    batch.set(podRef, sanitizeForFirestore(pod), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: podRef.id,
        entityType: "market-pod",
        label: "Market pod recommendation",
        status: recommendation === "hold" ? "held" : "ready",
        steps: [
            { label: `${best.count} targets scanned`, status: best.count ? "completed" : "held", at: toIso(timestamp) },
            { label: `${demandCount} demand signals checked`, status: demandCount ? "completed" : "held", at: toIso(timestamp) },
            { label: `${recommendation} recommendation`, status: recommendation === "hold" ? "held" : "ready", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "market_pod_recommend", "marketPod", podRef.id, pod.recommendationReason);
    updateDailyCost(db, batch, 4, 0, 0);
    await batch.commit();
    return toPlain(pod) as SignalDeskMarketPodSummary;
}

export async function reviewSignalDeskMarketPodServer(
    access: SignalDeskAccessContext,
    input: MarketPodReviewInput,
) {
    requireOperatingLayer();
    if (access.role !== "founder-admin" || !access.permissions.includes("signaldesk.configure")) {
        throw new Error("Founder approval is required for market pod decisions");
    }
    const db = requireDb();
    const podRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(input.marketPodId);
    return db.runTransaction(async (transaction: any) => {
        const podSnap = await transaction.get(podRef);
        if (!podSnap.exists) throw new Error("Market pod not found");
        const existing = toPlain(podSnap.data()) as SignalDeskMarketPodSummary;
        const timestamp = now();
        const status: SignalDeskMarketPodSummary["status"] = input.decision === "approved"
            ? "active"
            : input.decision === "rejected"
                ? "blocked"
                : "hold";
        const updates = {
            approvedAt: input.decision === "approved" ? timestamp : existing.approvedAt || null,
            approvedBy: input.decision === "approved" ? access.userId : existing.approvedBy || null,
            reviewDecision: input.decision,
            reviewedAt: timestamp,
            reviewedBy: access.userId,
            reviewReason: normalizeText(input.reason),
            status,
            updatedAt: timestamp,
            updatedBy: access.userId,
        };
        transaction.set(podRef, sanitizeForFirestore(updates), { merge: true });
        appendAudit(db, transaction, access, "market_pod_review", "marketPod", input.marketPodId, `${input.decision}: ${normalizeText(input.reason)}`);
        writeRunTimeline(db, transaction, {
            entityId: input.marketPodId,
            entityType: "market-pod",
            label: `Market pod reviewed: ${existing.name}`,
            status: input.decision === "approved" ? "ready" : input.decision === "rejected" ? "blocked" : "held",
            steps: [
                { label: "Founder decision recorded", status: "completed", at: toIso(timestamp) },
                { label: `Decision: ${input.decision}`, status: input.decision === "approved" ? "ready" : input.decision === "rejected" ? "blocked" : "held", at: toIso(timestamp) },
            ],
        });
        updateDailyCost(db, transaction, 4, 0);
        return toPlain({ ...existing, ...updates }) as SignalDeskMarketPodSummary;
    });
}

export async function createSignalDeskWeeklyStrategistMemoServer(
    access: SignalDeskAccessContext,
    input: WeeklyStrategistMemoInput,
) {
    const db = requireDb();
    const weekStart = firstDayOfWeekKey(input.weekStart);
    const [targetSnap, outcomeSnap, demandSnap, costSnap, providerEvalSnap, podSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).orderBy("updatedAt", "desc").limit(30).get(),
        db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).orderBy("updatedAt", "desc").limit(30).get(),
        db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).orderBy("updatedAt", "desc").limit(30).get(),
        db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(todayKey()).get(),
        db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS).orderBy("updatedAt", "desc").limit(10).get(),
        db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).orderBy("updatedAt", "desc").limit(1).get(),
    ]);
    const targetCount = targetSnap.size;
    const outcomeCount = outcomeSnap.docs.reduce((sum: number, doc: any) => sum + numberOrZero(doc.data()?.count), 0);
    const demandCount = demandSnap.docs.reduce((sum: number, doc: any) => sum + numberOrZero(doc.data()?.count), 0);
    const cost = toPlain(costSnap.data() || {}) as Partial<SignalDeskCostSummary>;
    const providerEvaluations = providerEvalSnap.docs.map((doc: any) => toPlain(doc.data()) as SignalDeskProviderEvaluationSummary);
    const bestProvider = providerEvaluations.find((item) => item.recommendation === "approve") || providerEvaluations[0] || null;
    const pod = podSnap.docs[0] ? toPlain(podSnap.docs[0].data()) as SignalDeskMarketPodSummary : null;
    const status: SignalDeskStrategistMemoSummary["status"] = targetCount && (demandCount || outcomeCount) ? "ready" : "held";
    const timestamp = now();
    const memoRef = db.collection(SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS).doc(`strategist_${weekStart}`);
    const memo = {
        strategistMemoId: memoRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        weekStart,
        title: `SignalDesk weekly memo ${weekStart}`,
        status,
        summary: `${targetCount} targets, ${demandCount} demand signals, ${outcomeCount} outcomes. ${status === "ready" ? "Use the strongest pod and keep send gates closed until sender policy is complete." : "Hold scale until one pod/source/CTA has enough proof."}`,
        nextDecisions: [
            pod ? `Review pod: ${pod.name}` : "Choose first market pod.",
            bestProvider ? `Review provider eval: ${bestProvider.provider}/${bestProvider.use}` : "Run provider evaluation after first provider run.",
            "Keep provider send disabled until sender readiness is complete.",
        ],
        riskNotes: [
            "No generic lead blasting.",
            "No provider send without source, suppression, unsubscribe, and sender-domain readiness.",
        ],
        costSummary: `$${(numberOrZero(cost.aiCostEstimate) + numberOrZero(cost.providerCostEstimate)).toFixed(2)} estimated today.`,
        providerQualitySummary: bestProvider ? `${bestProvider.provider}: ${bestProvider.recommendation}` : "No provider evaluation yet.",
        recommendedMarketPodId: pod?.marketPodId || null,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    const batch = db.batch();
    batch.set(memoRef, sanitizeForFirestore(memo), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: memoRef.id,
        entityType: "model",
        label: "Weekly strategist memo",
        status: status === "ready" ? "ready" : "held",
        steps: [
            { label: "Outcomes checked", status: outcomeCount ? "completed" : "held", at: toIso(timestamp) },
            { label: "Demand checked", status: demandCount ? "completed" : "held", at: toIso(timestamp) },
            { label: "Next decisions prepared", status: "completed", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "weekly_strategist_memo_create", "strategistMemo", memoRef.id, memo.status);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(memo) as SignalDeskStrategistMemoSummary;
}

export async function createSignalDeskProviderEvaluationServer(
    access: SignalDeskAccessContext,
    input: ProviderEvaluationInput,
) {
    const db = requireDb();
    const [account, vendorRuns, enrichmentResults, sourceRuns] = await Promise.all([
        readProviderAccount(db, input.provider, input.use),
        readList<SignalDeskVendorRunSummary>(db, SIGNALDESK_COLLECTIONS.VENDOR_RUNS),
        readList<SignalDeskEnrichmentResultSummary>(db, SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS),
        readList<SignalDeskSourceRunSummary>(db, SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES),
    ]);
    const providerRuns = vendorRuns.filter((run) => run.provider === input.provider);
    const resultRows = enrichmentResults.filter((result) => result.provider === input.provider);
    const sampleSize = Math.max(providerRuns.length, resultRows.length, input.provider === "google-places" || input.provider === "apify" || input.provider === "fhrs-fhis" ? sourceRuns.length : 0);
    const completedRuns = providerRuns.filter((run) => run.status === "completed" || run.status === "ready").length;
    const blockedRuns = providerRuns.filter((run) => run.status === "blocked" || run.status === "failed").length;
    const verified = resultRows.filter((result) => result.status === "verified").length;
    const usefulResults = Math.max(completedRuns, verified, sourceRuns.reduce((sum, run) => sum + numberOrZero(run.importedCount), 0));
    const providerSpend = numberOrZero(account?.spentMonthUsd);
    const verifiedContactRate = sampleSize ? verified / sampleSize : 0;
    const blockedRate = sampleSize ? blockedRuns / sampleSize : account && account.status !== "approved" ? 1 : 0;
    const evidenceQualityScore = sampleSize ? Math.round(Math.min(100, (usefulResults / Math.max(1, sampleSize)) * 100)) : 0;
    const recommendation: SignalDeskProviderEvaluationSummary["recommendation"] = !account || account.status === "disabled" || account.status === "blocked"
        ? "hold"
        : blockedRate > 0.4
            ? "reject"
            : sampleSize < 3
                ? "test-more"
                : evidenceQualityScore >= 60
                    ? "approve"
                    : "hold";
    const status: SignalDeskProviderEvaluationSummary["status"] = recommendation === "approve"
        ? "passed"
        : recommendation === "reject"
            ? "failed"
            : !account
                ? "blocked"
                : "needs-review";
    const timestamp = now();
    const evalRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS).doc(`provider_eval_${input.provider}_${input.use}`);
    const evaluation = {
        providerEvaluationId: evalRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        provider: input.provider,
        use: input.use,
        status,
        sampleSize,
        verifiedContactRate,
        evidenceQualityScore,
        replyOutcomeScore: 0,
        costPerUsefulResultUsd: usefulResults ? providerSpend / usefulResults : 0,
        blockedRate,
        suppressionRisk: blockedRate > 0.4 ? "high" : blockedRate > 0.15 ? "medium" : "low",
        recommendation,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    const batch = db.batch();
    batch.set(evalRef, sanitizeForFirestore(evaluation), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: evalRef.id,
        entityType: "provider",
        label: `${input.provider} provider evaluation`,
        status: status === "passed" ? "completed" : status === "blocked" || status === "failed" ? "blocked" : "held",
        steps: [
            { label: `${sampleSize} sample rows`, status: sampleSize ? "completed" : "held", at: toIso(timestamp) },
            { label: `${Math.round(blockedRate * 100)}% blocked rate`, status: blockedRate > 0.4 ? "blocked" : "completed", at: toIso(timestamp) },
            { label: `${recommendation} recommendation`, status: recommendation === "approve" ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "provider_evaluation_create", "providerEvaluation", evalRef.id, `${input.provider}/${input.use}`);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(evaluation) as SignalDeskProviderEvaluationSummary;
}

export async function upsertSignalDeskTrustPartnerProfileServer(
    access: SignalDeskAccessContext,
    input: TrustPartnerProfileInput,
) {
    requireTrustPartnerRail();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const partnerId = trustPartnerIdFor(input.displayName, input.channel);
    const trustScore = computeTrustScore(input);
    const status = input.status || (input.partnerType === "generic-creator" || trustScore < 45 ? "rejected" : trustScore >= 70 ? "candidate" : "hold");
    const profileRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(partnerId);
    const profile = {
        partnerId,
        pId: SIGNALDESK_PRODUCT_CODE,
        displayName: input.displayName,
        partnerType: input.partnerType,
        channel: input.channel,
        geography: input.geography || null,
        baselineReachScore: clampScore(input.baselineReachScore),
        commentQualityScore: clampScore(input.commentQualityScore),
        audienceFitScore: clampScore(input.audienceFitScore),
        believableUsageScore: clampScore(input.believableUsageScore),
        trustFeelScore: clampScore(input.trustFeelScore),
        trustScore,
        sourceNotes: input.sourceNotes,
        status,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(profileRef, sanitizeForFirestore(profile), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: partnerId,
        entityType: "trust-partner",
        label: "Trust partner profile",
        status: status === "rejected" ? "blocked" : status === "hold" ? "held" : "ready",
        steps: [
            { label: "20-second trust scores captured", status: "completed", at: toIso(timestamp) },
            { label: `${trustScore} trust score`, status: trustScore >= 70 ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "trust_partner_profile_upsert", "trustPartnerProfile", partnerId, `${input.displayName}: ${trustScore}`);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(profile) as SignalDeskTrustPartnerProfileSummary;
}

export async function createSignalDeskTrustPartnerNicheTestServer(
    access: SignalDeskAccessContext,
    input: TrustPartnerNicheTestInput,
) {
    requireTrustPartnerRail();
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const partnerSnaps = await Promise.all(input.partnerIds.map((partnerId) => (
        db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(partnerId).get()
    )));
    const approvedPartners = partnerSnaps.filter((snap: any) => {
        const status = snap.data()?.status;
        return snap.exists && status !== "rejected";
    });
    const attemptCount = Math.max(input.intendedAttempts, approvedPartners.length);
    const recommendation: SignalDeskTrustPartnerNicheTestSummary["recommendation"] = attemptCount < 3 ? "underpowered" : "hold";
    const nicheRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_NICHE_TESTS).doc(`niche_${hashValue(`${input.nicheName}|${input.marketPodId || "pod"}`).slice(0, 18)}`);
    const nicheTest = {
        nicheTestId: nicheRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        nicheName: input.nicheName,
        marketPodId: input.marketPodId || null,
        angle: input.angle,
        intendedAttempts: input.intendedAttempts,
        partnerIds: input.partnerIds,
        partnerCount: approvedPartners.length,
        status: "planned",
        recommendation,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(nicheRef, sanitizeForFirestore(nicheTest), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: nicheRef.id,
        entityType: "trust-partner",
        label: "Trust partner niche test",
        status: recommendation === "underpowered" ? "held" : "ready",
        steps: [
            { label: `${input.intendedAttempts} intended attempts`, status: input.intendedAttempts >= 3 ? "completed" : "held", at: toIso(timestamp) },
            { label: `${approvedPartners.length} partner profiles attached`, status: approvedPartners.length ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "trust_partner_niche_test_create", "trustPartnerNicheTest", nicheRef.id, input.nicheName);
    updateDailyCost(db, batch, 3 + input.partnerIds.length, 0, 0);
    await batch.commit();
    return toPlain(nicheTest) as SignalDeskTrustPartnerNicheTestSummary;
}

export async function reviewSignalDeskTrustPartnerDealServer(
    access: SignalDeskAccessContext,
    input: TrustPartnerDealInput,
) {
    requireTrustPartnerRail();
    const db = requireDb();
    const partnerSnap = await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(input.partnerId).get();
    if (!partnerSnap.exists) throw new Error("Trust partner not found");
    if (input.pricingModel === "per-view") throw new Error("Trust partner per-view pricing is blocked");
    if (input.approvalStatus === "approved" && !input.founderApproved) throw new Error("Trust partner budget is not approved");
    const partner = toPlain(partnerSnap.data()) as SignalDeskTrustPartnerProfileSummary;
    let budget: SignalDeskBudgetPolicySummary | null = null;
    if (input.budgetPolicyId) {
        const budgetSnap = await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(input.budgetPolicyId).get();
        budget = budgetSnap.exists ? toPlain(budgetSnap.data()) as SignalDeskBudgetPolicySummary : null;
    } else {
        budget = await readBudgetPolicy(db, "trust-partner", null, "first_partner_test");
    }
    if (input.approvalStatus === "approved") {
        if (!budget || budget.status !== "active") throw new Error("Trust partner budget is not approved");
        if (input.flatFeeUsd > numberOrZero(budget.perRunBudgetUsd)) throw new Error("Provider per-run budget exceeded");
        if (numberOrZero(budget.spentMonthUsd) + input.flatFeeUsd > numberOrZero(budget.monthlyBudgetUsd)) {
            throw new Error("Provider monthly budget exceeded");
        }
    }
    const batch = db.batch();
    const timestamp = now();
    const dealRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS).doc(`deal_${input.partnerId}_${hashValue(`${input.nicheTestId || "direct"}|${input.flatFeeUsd}|${input.dueDate || ""}`).slice(0, 12)}`);
    const deal = {
        dealId: dealRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        partnerId: input.partnerId,
        partnerName: partner.displayName,
        nicheTestId: input.nicheTestId || null,
        flatFeeUsd: input.flatFeeUsd,
        pricingModel: input.pricingModel,
        deliverableCount: input.deliverableCount,
        dueDate: input.dueDate || null,
        approvalStatus: input.approvalStatus,
        budgetPolicyId: budget?.budgetPolicyId || input.budgetPolicyId || null,
        paymentState: input.approvalStatus === "approved" ? "pending" : "held",
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(dealRef, sanitizeForFirestore(deal), { merge: true });
    if (input.approvalStatus === "approved" && budget) {
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc(budget.budgetPolicyId), sanitizeForFirestore({
            spentTodayUsd: increment(input.flatFeeUsd),
            spentMonthUsd: increment(input.flatFeeUsd),
            updatedAt: timestamp,
        }), { merge: true });
    }
    writeRunTimeline(db, batch, {
        entityId: dealRef.id,
        entityType: "trust-partner",
        label: "Trust partner deal",
        status: input.approvalStatus === "approved" ? "ready" : input.approvalStatus === "blocked" ? "blocked" : "held",
        steps: [
            { label: "Flat-fee economics checked", status: input.pricingModel === "flat-fee" || input.pricingModel === "barter" ? "completed" : "blocked", at: toIso(timestamp) },
            { label: "Founder budget approval checked", status: input.founderApproved ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "trust_partner_deal_review", "trustPartnerDeal", dealRef.id, input.approvalStatus);
    updateDailyCost(db, batch, input.approvalStatus === "approved" ? 5 : 3, 0, 0);
    await batch.commit();
    return toPlain(deal) as SignalDeskTrustPartnerDealSummary;
}

export async function createSignalDeskTrustPartnerBriefServer(
    access: SignalDeskAccessContext,
    input: TrustPartnerBriefInput,
) {
    requireTrustPartnerRail();
    const db = requireDb();
    const partnerSnap = await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(input.partnerId).get();
    if (!partnerSnap.exists) throw new Error("Trust partner not found");
    if (!input.disclosureText.trim()) throw new Error("Trust partner disclosure is required");
    const dealSnap = input.dealId ? await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS).doc(input.dealId).get() : null;
    if (input.dealId && !dealSnap?.exists) throw new Error("Trust partner deal not found");
    const batch = db.batch();
    const timestamp = now();
    const briefRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_BRIEFS).doc();
    const brief = {
        briefId: briefRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        partnerId: input.partnerId,
        dealId: input.dealId || null,
        ctaId: input.ctaId || null,
        onePageBrief: input.onePageBrief,
        approvedClaims: input.approvedClaims,
        bannedClaims: input.bannedClaims,
        disclosureRequired: true,
        disclosureText: input.disclosureText,
        status: input.bannedClaims.length && input.approvedClaims.length ? "ready" : "blocked",
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(briefRef, sanitizeForFirestore(brief));
    writeRunTimeline(db, batch, {
        entityId: briefRef.id,
        entityType: "trust-partner",
        label: "Trust partner brief",
        status: "ready",
        steps: [
            { label: "Approved claims attached", status: "completed", at: toIso(timestamp) },
            { label: "Disclosure instruction attached", status: "completed", at: toIso(timestamp) },
            { label: "Banned claims attached", status: "completed", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "trust_partner_brief_create", "trustPartnerBrief", briefRef.id, input.partnerId);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(brief) as SignalDeskTrustPartnerBriefSummary;
}

export async function recordSignalDeskTrustPartnerDeliverableServer(
    access: SignalDeskAccessContext,
    input: TrustPartnerDeliverableInput,
) {
    requireTrustPartnerRail();
    const db = requireDb();
    const partnerSnap = await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(input.partnerId).get();
    if (!partnerSnap.exists) throw new Error("Trust partner not found");
    if (input.dealId) {
        const dealSnap = await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS).doc(input.dealId).get();
        if (!dealSnap.exists) throw new Error("Trust partner deal not found");
    }
    const batch = db.batch();
    const timestamp = now();
    const deliverableRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DELIVERABLES).doc();
    const risk = input.status === "live" && !input.disclosurePresent;
    const deliverable = {
        deliverableId: deliverableRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        partnerId: input.partnerId,
        dealId: input.dealId || null,
        dueDate: input.dueDate || null,
        postUrl: input.postUrl || null,
        status: input.status,
        reviewState: risk ? "risk" : input.reviewState,
        disclosurePresent: input.disclosurePresent,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(deliverableRef, sanitizeForFirestore(deliverable));
    writeRunTimeline(db, batch, {
        entityId: deliverableRef.id,
        entityType: "trust-partner",
        label: "Trust partner deliverable",
        status: risk ? "blocked" : input.status === "live" ? "completed" : "held",
        steps: [
            { label: "Deliverable captured", status: "completed", at: toIso(timestamp) },
            { label: "Disclosure checked", status: input.disclosurePresent ? "completed" : "blocked", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "trust_partner_deliverable_record", "trustPartnerDeliverable", deliverableRef.id, input.status);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(deliverable) as SignalDeskTrustPartnerDeliverableSummary;
}

export async function recordSignalDeskTrustPartnerMetricsServer(
    access: SignalDeskAccessContext,
    input: TrustPartnerMetricsInput,
) {
    requireTrustPartnerRail();
    const db = requireDb();
    const partnerSnap = await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(input.partnerId).get();
    if (!partnerSnap.exists) throw new Error("Trust partner not found");
    const batch = db.batch();
    const timestamp = now();
    const metricRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS).doc();
    const metric = {
        metricsId: metricRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        partnerId: input.partnerId,
        deliverableId: input.deliverableId || null,
        views: input.views,
        comments: input.comments,
        commentQuality: input.commentQuality,
        ownerLeads: input.ownerLeads,
        currentListSubmissions: input.currentListSubmissions,
        activations: input.activations,
        capturedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(metricRef, sanitizeForFirestore(metric));
    if (input.ownerLeads || input.currentListSubmissions || input.activations) {
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(`trust_partner_${input.partnerId}_${todayKey()}`), sanitizeForFirestore({
            demandSignalId: `trust_partner_${input.partnerId}_${todayKey()}`,
            pId: SIGNALDESK_PRODUCT_CODE,
            signalType: "referral",
            sourceSurface: "manual",
            targetId: null,
            targetName: partnerSnap.data()?.displayName || input.partnerId,
            count: input.ownerLeads + input.currentListSubmissions + input.activations,
            day: todayKey(),
            updatedAt: timestamp,
        }), { merge: true });
    }
    writeRunTimeline(db, batch, {
        entityId: metricRef.id,
        entityType: "trust-partner",
        label: "Trust partner metrics",
        status: input.activations || input.currentListSubmissions || input.ownerLeads ? "completed" : "held",
        steps: [
            { label: `${input.views} views captured`, status: "completed", at: toIso(timestamp) },
            { label: `${input.ownerLeads + input.currentListSubmissions + input.activations} owner outcomes`, status: input.ownerLeads + input.currentListSubmissions + input.activations ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "trust_partner_metrics_record", "trustPartnerMetric", metricRef.id, input.partnerId);
    updateControlSummary(db, batch, { demandSignalCount: increment(input.ownerLeads + input.currentListSubmissions + input.activations) });
    updateDailyCost(db, batch, 4, 0, 0);
    await batch.commit();
    return toPlain(metric) as SignalDeskTrustPartnerMetricSummary;
}

export async function reviewSignalDeskTrustPartnerRenewalServer(
    access: SignalDeskAccessContext,
    input: TrustPartnerRenewalInput,
) {
    requireTrustPartnerRail();
    const db = requireDb();
    const partnerSnap = await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(input.partnerId).get();
    if (!partnerSnap.exists) throw new Error("Trust partner not found");
    const metricsSnap = await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS)
        .where("partnerId", "==", input.partnerId)
        .orderBy("capturedAt", "desc")
        .limit(10)
        .get();
    const metrics = metricsSnap.docs.map((doc: any) => toPlain(doc.data()) as SignalDeskTrustPartnerMetricSummary);
    const outcomeBackedRecommendation = recommendationFromTrustOutcomes(metrics);
    if (input.recommendation === "renew" && outcomeBackedRecommendation !== "renew") {
        throw new Error("Trust partner renewal requires outcome evidence");
    }
    const batch = db.batch();
    const timestamp = now();
    const decisionRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_RENEWAL_DECISIONS).doc();
    const decision = {
        decisionId: decisionRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        partnerId: input.partnerId,
        nicheTestId: input.nicheTestId || null,
        recommendation: input.recommendation,
        ownerDecision: input.ownerDecision || "pending",
        evidenceSummary: input.evidenceSummary,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(decisionRef, sanitizeForFirestore(decision));
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(input.partnerId), sanitizeForFirestore({
        status: input.recommendation === "renew" ? "active" : input.recommendation === "cut" ? "rejected" : "hold",
        updatedAt: timestamp,
    }), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: decisionRef.id,
        entityType: "trust-partner",
        label: "Trust partner renewal",
        status: input.recommendation === "renew" ? "ready" : input.recommendation === "cut" ? "blocked" : "held",
        steps: [
            { label: `${metrics.length} metric records checked`, status: metrics.length ? "completed" : "held", at: toIso(timestamp) },
            { label: `${input.recommendation} recommendation`, status: input.recommendation === "renew" ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "trust_partner_renewal_review", "trustPartnerRenewalDecision", decisionRef.id, input.recommendation);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(decision) as SignalDeskTrustPartnerRenewalDecisionSummary;
}

export async function upsertSignalDeskContentSourceServer(
    access: SignalDeskAccessContext,
    input: ContentSourceInput,
) {
    requireContentDistributionRail();
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "content-distribution", "Content distribution is paused");
    const batch = db.batch();
    const timestamp = now();
    const contentSourceId = input.contentSourceId || contentSourceIdFor(input.title, input.sourceType, input.sourceUrl);
    const sourceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(contentSourceId);
    const source = {
        contentSourceId,
        pId: SIGNALDESK_PRODUCT_CODE,
        title: input.title,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl || null,
        status: input.status,
        defaultAudience: input.defaultAudience,
        defaultMarketPodId: input.defaultMarketPodId || null,
        lastCheckedAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(sourceRef, sanitizeForFirestore(source), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: contentSourceId,
        entityType: "content",
        label: "Content source",
        status: input.status === "active" ? "ready" : input.status === "blocked" ? "blocked" : "held",
        steps: [
            { label: "Source registered", status: "completed", at: toIso(timestamp) },
            { label: `Default audience ${input.defaultAudience}`, status: "completed", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "content_source_upsert", "contentSource", contentSourceId, input.title);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(source) as SignalDeskContentSourceSummary;
}

export async function upsertSignalDeskProofPermissionServer(
    access: SignalDeskAccessContext,
    input: ProofPermissionInput,
) {
    requireContentDistributionRail();
    if (access.role !== "founder-admin") throw new Error("Founder approval is required for proof permissions");
    const db = requireDb();
    const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get();
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const proofPermissionId = input.proofPermissionId || proofPermissionIdFor(input.targetId);
    const permissionRef = db.collection(SIGNALDESK_COLLECTIONS.PROOF_PERMISSIONS).doc(proofPermissionId);
    const existingSnap = await permissionRef.get();
    const existing = existingSnap.exists ? toPlain(existingSnap.data()) as SignalDeskProofPermissionSummary : null;
    if (existing && existing.targetId !== input.targetId) throw new Error("PROOF_PERMISSION_TARGET_IMMUTABLE");
    const timestamp = now();
    const expiresAt = input.expiresAt ? timestampFromIsoOrDefault(input.expiresAt, 0) : null;
    if (input.status === "active" && expiresAt && toTimestampMillis(expiresAt) <= Date.now()) {
        throw new Error("Proof permission expiry must be in the future");
    }
    const permission = {
        proofPermissionId,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: input.targetId,
        targetName: target.displayName,
        status: input.status,
        scopes: Array.from(new Set(input.scopes)),
        evidenceRef: input.evidenceRef,
        grantedAt: input.status === "active"
            ? timestampFromIsoOrDefault(input.grantedAt, 0)
            : existing?.grantedAt || null,
        expiresAt,
        revokedAt: input.status === "revoked" ? timestamp : null,
        notes: input.notes || null,
        createdAt: (existing as AnyRecord)?.createdAt || timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    const batch = db.batch();
    batch.set(permissionRef, sanitizeForFirestore(permission), { merge: true });
    appendAudit(db, batch, access, "proof_permission_upsert", "proofPermission", proofPermissionId, `${input.status}:${permission.scopes.join(",")}`);
    updateDailyCost(db, batch, 2, 0, 0);
    await batch.commit();
    return toPlain(permission) as SignalDeskProofPermissionSummary;
}

export async function createSignalDeskContentAssetServer(
    access: SignalDeskAccessContext,
    input: ContentAssetInput,
) {
    requireContentDistributionRail();
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "content-distribution", "Content distribution is paused");
    const [sourceSnap, cta, proofPermission] = await Promise.all([
        input.sourceId ? db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(input.sourceId).get() : Promise.resolve(null),
        input.ctaId
            ? db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(input.ctaId).get().then((snap: any) => (snap.exists ? toPlain(snap.data()) as SignalDeskSelfServiceCtaSummary : null))
            : readDefaultCta(db),
        readProofPermission(db, input.proofPermissionId),
    ]);
    if (input.sourceId && !sourceSnap?.exists) throw new Error("Content source not found");
    if (input.proofLevel === "customer-proof" && !isProofPermissionActive(proofPermission)) {
        throw new Error("PROOF_PERMISSION_REQUIRED");
    }
    if (input.proofLevel === "customer-proof" && !isProofPermissionUsable(proofPermission, input.proofScopes)) {
        throw new Error("PROOF_PERMISSION_SCOPE_NOT_ALLOWED");
    }
    const batch = db.batch();
    const timestamp = now();
    const source = sourceSnap?.exists ? toPlain(sourceSnap.data()) as SignalDeskContentSourceSummary : null;
    const contentAssetId = input.contentAssetId || contentAssetIdFor(input.title, input.sourceUrl || source?.sourceUrl);
    const assetRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(contentAssetId);
    const status = input.status || (input.riskNotes.length ? "hold" : "ready");
    const asset = {
        contentAssetId,
        pId: SIGNALDESK_PRODUCT_CODE,
        title: input.title,
        canonicalMessage: input.canonicalMessage,
        sourceId: input.sourceId || null,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl || source?.sourceUrl || null,
        sourceNotes: input.sourceNotes || null,
        primaryAudience: input.primaryAudience,
        proofLevel: input.proofLevel,
        proofPermissionId: input.proofPermissionId || null,
        proofScopes: input.proofLevel === "customer-proof" ? Array.from(new Set(input.proofScopes)) : [],
        riskNotes: input.riskNotes,
        ctaId: input.ctaId || cta?.ctaId || null,
        marketPodId: input.marketPodId || source?.defaultMarketPodId || null,
        status,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(assetRef, sanitizeForFirestore(asset), { merge: true });
    if (input.sourceId) {
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(input.sourceId), sanitizeForFirestore({
            lastAssetAt: timestamp,
            updatedAt: timestamp,
        }), { merge: true });
    }
    writeRunTimeline(db, batch, {
        entityId: contentAssetId,
        entityType: "content",
        label: "Content asset",
        status: status === "ready" ? "ready" : status === "archived" ? "blocked" : "held",
        steps: [
            { label: "Canonical message captured", status: "completed", at: toIso(timestamp) },
            { label: `${input.proofLevel} proof level`, status: input.proofLevel === "internal-note" ? "held" : "completed", at: toIso(timestamp) },
            { label: "Proof permission checked", status: input.proofLevel === "customer-proof" ? "completed" : "ready", at: toIso(timestamp) },
            { label: "CTA attached", status: cta ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "content_asset_create", "contentAsset", contentAssetId, input.title);
    updateDailyCost(db, batch, input.sourceId ? 4 : 3, 0, 0);
    await batch.commit();
    return toPlain(asset) as SignalDeskContentAssetSummary;
}

export async function generateSignalDeskContentDistributionDraftsServer(
    access: SignalDeskAccessContext,
    input: ContentDistributionDraftInput,
) {
    requireContentDistributionRail();
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "content-distribution", "Content distribution is paused");
    const assetSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(input.contentAssetId).get();
    if (!assetSnap.exists) throw new Error("Content asset not found");
    const asset = toPlain(assetSnap.data()) as SignalDeskContentAssetSummary;
    if (asset.status !== "ready" && asset.status !== "distributed") throw new Error("Content asset is not ready");
    if (asset.proofLevel === "customer-proof") {
        const permission = await readProofPermission(db, asset.proofPermissionId);
        if (!isProofPermissionActive(permission)) throw new Error("PROOF_PERMISSION_REQUIRED");
        if (!isProofPermissionUsable(permission, asset.proofScopes || [])) throw new Error("PROOF_PERMISSION_SCOPE_NOT_ALLOWED");
    }
    const cta = asset.ctaId
        ? await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(asset.ctaId).get().then((snap: any) => (snap.exists ? toPlain(snap.data()) as SignalDeskSelfServiceCtaSummary : null))
        : await readDefaultCta(db);
    const batch = db.batch();
    const timestamp = now();
    const uniqueChannels = Array.from(new Set(input.channels));
    const drafts: SignalDeskContentDistributionDraftSummary[] = uniqueChannels.map((channel) => {
        const contentDraftId = contentDraftIdFor(input.contentAssetId, channel);
        const copy = buildContentDraftCopy(asset, channel, cta);
        const draft = {
            contentDraftId,
            pId: SIGNALDESK_PRODUCT_CODE,
            contentAssetId: input.contentAssetId,
            channel,
            title: copy.title,
            hook: copy.hook,
            body: copy.body,
            ctaId: asset.ctaId || cta?.ctaId || null,
            status: "draft" as const,
            approvalStatus: "pending" as const,
            reviewReason: "Generated from approved content asset. Human review required before scheduling.",
            scheduledFor: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: access.userId,
        };
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(contentDraftId), sanitizeForFirestore(draft), { merge: true });
        return toPlain(draft) as SignalDeskContentDistributionDraftSummary;
    });
    writeRunTimeline(db, batch, {
        entityId: input.contentAssetId,
        entityType: "content",
        label: "Content distribution drafts",
        status: "held",
        steps: [
            { label: `${uniqueChannels.length} channel drafts generated`, status: "completed", at: toIso(timestamp) },
            { label: "Approval required before schedule", status: "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "content_distribution_drafts_generate", "contentAsset", input.contentAssetId, uniqueChannels.join(", "));
    updateQueueSummary(db, batch, { humanReview: increment(uniqueChannels.length) });
    updateDailyCost(db, batch, 3 + uniqueChannels.length, 0, 0);
    await batch.commit();
    return drafts;
}

export async function reviewSignalDeskContentDistributionDraftServer(
    access: SignalDeskAccessContext,
    input: ContentDraftReviewInput,
) {
    requireContentDistributionRail();
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "content-distribution", "Content distribution is paused");
    const draftSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(input.contentDraftId).get();
    if (!draftSnap.exists) throw new Error("Content draft not found");
    const timestamp = now();
    const status: SignalDeskContentDistributionDraftSummary["status"] = input.approvalStatus === "approved"
        ? "approved"
        : input.approvalStatus === "rejected"
            ? "rejected"
            : "hold";
    const draft = {
        ...toPlain(draftSnap.data()),
        approvalStatus: input.approvalStatus,
        status,
        reviewReason: input.reviewReason || (input.approvalStatus === "approved" ? "Approved for scheduling." : "Held for revision."),
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    const batch = db.batch();
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(input.contentDraftId), sanitizeForFirestore(draft), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: input.contentDraftId,
        entityType: "content",
        label: "Content draft review",
        status: input.approvalStatus === "approved" ? "ready" : input.approvalStatus === "rejected" ? "blocked" : "held",
        steps: [
            { label: `Review ${input.approvalStatus}`, status: input.approvalStatus === "approved" ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "content_distribution_draft_review", "contentDistributionDraft", input.contentDraftId, input.approvalStatus);
    updateDailyCost(db, batch, 3, 0, 0);
    await batch.commit();
    return toPlain(draft) as SignalDeskContentDistributionDraftSummary;
}

export async function scheduleSignalDeskContentDistributionDraftServer(
    access: SignalDeskAccessContext,
    input: ContentDraftScheduleInput,
) {
    requireContentDistributionRail();
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "content-distribution", "Content distribution is paused");
    const draftSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(input.contentDraftId).get();
    if (!draftSnap.exists) throw new Error("Content draft not found");
    const draft = toPlain(draftSnap.data()) as SignalDeskContentDistributionDraftSummary;
    if (draft.approvalStatus !== "approved") throw new Error("Content draft must be approved before scheduling");
    const timestamp = now();
    const scheduledFor = timestampFromIsoOrDefault(input.scheduledFor, 1);
    const draftStatus: SignalDeskContentDistributionDraftSummary["status"] = input.status === "hold" ? "hold" : "queued";
    const calendarStatus: SignalDeskContentCalendarItemSummary["status"] = input.status === "hold" ? "held" : "queued";
    const calendarItemId = contentCalendarItemIdFor(input.contentDraftId);
    const calendarItem = {
        contentCalendarItemId: calendarItemId,
        pId: SIGNALDESK_PRODUCT_CODE,
        contentDraftId: input.contentDraftId,
        contentAssetId: draft.contentAssetId,
        channel: draft.channel,
        scheduledFor,
        publishedAt: null,
        status: calendarStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    const batch = db.batch();
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(input.contentDraftId), sanitizeForFirestore({
        scheduledFor,
        status: draftStatus,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(calendarItemId), sanitizeForFirestore(calendarItem), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: input.contentDraftId,
        entityType: "content",
        label: "Content schedule",
        status: draftStatus === "queued" ? "ready" : "held",
        steps: [
            { label: "Draft approval checked", status: "completed", at: toIso(timestamp) },
            { label: "Calendar item queued without auto-publish", status: draftStatus === "queued" ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "content_distribution_draft_schedule", "contentDistributionDraft", input.contentDraftId, toIso(scheduledFor) || "");
    updateDailyCost(db, batch, 4, 0, 0);
    await batch.commit();
    return toPlain(calendarItem) as SignalDeskContentCalendarItemSummary;
}

export async function recordSignalDeskContentPerformanceServer(
    access: SignalDeskAccessContext,
    input: ContentPerformanceInput,
) {
    requireContentDistributionRail();
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "content-distribution", "Content distribution is paused");
    const [assetSnap, draftSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(input.contentAssetId).get(),
        input.contentDraftId ? db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(input.contentDraftId).get() : Promise.resolve(null),
    ]);
    if (!assetSnap.exists) throw new Error("Content asset not found");
    if (input.contentDraftId && !draftSnap?.exists) throw new Error("Content draft not found");
    const asset = toPlain(assetSnap.data()) as SignalDeskContentAssetSummary;
    const batch = db.batch();
    const timestamp = now();
    const performanceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_PERFORMANCE_SUMMARIES).doc();
    const ownerSignals = input.ownerLeads + input.currentListSubmissions + input.activations;
    const performance = {
        contentPerformanceId: performanceRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        contentAssetId: input.contentAssetId,
        contentDraftId: input.contentDraftId || null,
        channel: input.channel,
        views: input.views,
        clicks: input.clicks,
        ownerLeads: input.ownerLeads,
        currentListSubmissions: input.currentListSubmissions,
        activations: input.activations,
        engagementQuality: input.engagementQuality,
        capturedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(performanceRef, sanitizeForFirestore(performance));
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(input.contentAssetId), sanitizeForFirestore({
        status: ownerSignals ? "distributed" : asset.status,
        updatedAt: timestamp,
    }), { merge: true });
    if (ownerSignals) {
        const demandId = `content_${input.contentAssetId}_${todayKey()}`;
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(demandId), sanitizeForFirestore({
            demandSignalId: demandId,
            pId: SIGNALDESK_PRODUCT_CODE,
            signalType: "referral",
            sourceSurface: "manual",
            targetId: null,
            targetName: asset.title,
            count: ownerSignals,
            day: todayKey(),
            updatedAt: timestamp,
        }), { merge: true });
        updateControlSummary(db, batch, { demandSignalCount: increment(ownerSignals) });
    }
    writeRunTimeline(db, batch, {
        entityId: performanceRef.id,
        entityType: "content",
        label: "Content performance",
        status: ownerSignals ? "completed" : "held",
        steps: [
            { label: `${input.views} views`, status: "completed", at: toIso(timestamp) },
            { label: `${input.clicks} clicks`, status: input.clicks ? "completed" : "held", at: toIso(timestamp) },
            { label: `${ownerSignals} owner outcomes`, status: ownerSignals ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "content_performance_record", "contentPerformance", performanceRef.id, input.contentAssetId);
    updateDailyCost(db, batch, ownerSignals ? 5 : 4, 0, 0);
    await batch.commit();
    return toPlain(performance) as SignalDeskContentPerformanceSummary;
}

export async function runSignalDeskEnrichmentWaterfallServer(access: SignalDeskAccessContext, input: EnrichmentWaterfallRunInput) {
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "source-provider", "SignalDesk source providers are paused");
    const [targetSnap, targetDetailSnap, waterfallSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get(),
        db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(input.targetId).get(),
        db.collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS).doc(input.waterfallId).get(),
    ]);
    if (!targetSnap.exists) throw new Error("Target not found");
    if (!waterfallSnap.exists) throw new Error("Enrichment waterfall not found");

    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const targetDetail = toPlain(targetDetailSnap.data() || {}) as AnyRecord;
    const waterfall = toPlain(waterfallSnap.data()) as SignalDeskEnrichmentWaterfallSummary;
    if (waterfall.status !== "active") throw new Error("Enrichment waterfall is not active");
    await requireNoPriorSpendBlock(db, target);

    const policy = await readSourcePolicy(db, waterfall.sourcePolicyId || target.sourcePolicyId);
    const allowedUse = resolveAllowedUse(policy);
    const contactField = waterfall.requestedField === "email" || waterfall.requestedField === "phone";
    await assertSourcePolicyUsable(db, access, policy, {
        entityId: target.targetId,
        use: contactField ? "contact" : "evidence",
    });
    if (contactField && !allowedUse.contact) throw new Error("Contact use is not approved for this target");
    if (!contactField && !allowedUse.evidence) throw new Error("Evidence use is not approved for this target");

    const batch = db.batch();
    const timestamp = now();
    const existingValue = getExistingEnrichmentValue(target, targetDetail, waterfall.requestedField);
    const resultRef = db.collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS).doc();

    if (existingValue) {
        const vendorRunRef = db.collection(SIGNALDESK_COLLECTIONS.VENDOR_RUNS).doc();
        const result = {
            enrichmentResultId: resultRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId: target.targetId,
            targetName: target.displayName,
            provider: "manual",
            field: waterfall.requestedField,
            status: "verified",
            confidence: "high",
            valuePreview: previewSensitiveValue(existingValue),
            sourcePolicyId: waterfall.sourcePolicyId || target.sourcePolicyId || null,
            expiresAt: expiresAtForRetention(waterfall.retentionDays),
            updatedAt: timestamp,
            updatedBy: access.userId,
        };
        batch.set(vendorRunRef, sanitizeForFirestore({
            vendorRunId: vendorRunRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            provider: "manual",
            status: "skipped",
            targetId: target.targetId,
            targetName: target.displayName,
            waterfallId: waterfall.waterfallId,
            requestedField: waterfall.requestedField,
            costEstimateUsd: 0,
            resultCount: 1,
            blockedReason: "Approved source data already contains this field.",
            updatedAt: timestamp,
            updatedBy: access.userId,
        }));
        batch.set(resultRef, sanitizeForFirestore(result));
        writeRunTimeline(db, batch, {
            entityId: resultRef.id,
            entityType: "target",
            label: `${waterfall.name} enrichment`,
            status: "completed",
            steps: [
                { label: "Prior-contact guard", status: "completed", at: toIso(timestamp) },
                { label: "Approved source data reused", status: "completed", at: toIso(timestamp) },
                { label: "No provider spend", status: "completed", at: toIso(timestamp) },
            ],
        });
        appendAudit(db, batch, access, "enrichment_waterfall_run", "enrichmentResult", resultRef.id, "Existing approved source data reused.");
        updateDailyCost(db, batch, 4, 0, 0);
        await batch.commit();
        return toPlain(result) as SignalDeskEnrichmentResultSummary;
    }

    const providers = waterfall.providerOrder.slice(0, Math.max(1, Math.min(waterfall.maxCredits, waterfall.providerOrder.length)));
    const providerCost = providers.length ? Math.min(numberOrZero(waterfall.maxCostUsd) / providers.length, 0.25) : 0;
    const blockedReasons: string[] = [];
    let readyProvider: SignalDeskProviderId | null = null;
    let readyUse: SignalDeskProviderUse | null = null;

    for (const provider of providers) {
        const use = providerUseForWaterfall(provider, waterfall.requestedField);
        try {
            await requireProviderBudget(db, {
                estimatedCostUsd: providerCost,
                provider,
                use,
            });
            readyProvider = provider;
            readyUse = use;
            break;
        } catch {
            blockedReasons.push(`${provider}: ${SIGNALDESK_PROVIDER_BUDGET_BLOCKED_REASON}`);
        }
    }

    const selectedProvider = readyProvider || providers[0] || "manual";
    const resultStatus: SignalDeskEnrichmentResultSummary["status"] = readyProvider ? "missing" : "blocked";
    const result = {
        enrichmentResultId: resultRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: target.targetId,
        targetName: target.displayName,
        provider: selectedProvider,
        field: waterfall.requestedField,
        status: resultStatus,
        confidence: "low",
        valuePreview: null,
        sourcePolicyId: waterfall.sourcePolicyId || target.sourcePolicyId || null,
        expiresAt: expiresAtForRetention(waterfall.retentionDays),
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(resultRef, sanitizeForFirestore(result));

    const finalVendorRunRef = db.collection(SIGNALDESK_COLLECTIONS.VENDOR_RUNS).doc();
    batch.set(finalVendorRunRef, sanitizeForFirestore({
        vendorRunId: finalVendorRunRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        provider: selectedProvider,
        status: readyProvider ? "ready" : "blocked",
        targetId: target.targetId,
        targetName: target.displayName,
        waterfallId: waterfall.waterfallId,
        requestedField: waterfall.requestedField,
        costEstimateUsd: readyProvider ? providerCost : 0,
        resultCount: 0,
        blockedReason: readyProvider
            ? `Provider budget is ready for ${readyProvider}/${readyUse}; external connector is held for owner approval.`
            : blockedReasons.join(" | "),
        updatedAt: timestamp,
        updatedBy: access.userId,
    }));
    writeRunTimeline(db, batch, {
        entityId: resultRef.id,
        entityType: "target",
        label: `${waterfall.name} enrichment`,
        status: readyProvider ? "held" : "blocked",
        steps: [
            { label: "Prior-contact guard", status: "completed", at: toIso(timestamp) },
            { label: "Source policy checked", status: "completed", at: toIso(timestamp) },
            { label: readyProvider ? `${readyProvider} budget ready` : "No provider budget ready", status: readyProvider ? "held" : "blocked", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "enrichment_waterfall_run", "enrichmentResult", resultRef.id, readyProvider || blockedReasons.join(" | "));
    updateDailyCost(db, batch, 5, 0, 0);
    await batch.commit();

    return toPlain(result) as SignalDeskEnrichmentResultSummary;
}

export async function createSignalDeskApprovalPacketServer(access: SignalDeskAccessContext, input: {
    approvalId?: string;
    targetId?: string;
}) {
    const db = requireDb();
    let approval: SignalDeskApprovalItem | null = null;
    if (input.approvalId) {
        const approvalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(input.approvalId).get();
        if (!approvalSnap.exists) throw new Error("Approval not found");
        approval = toPlain(approvalSnap.data()) as SignalDeskApprovalItem;
    }

    const targetId = approval?.targetId || input.targetId;
    if (!targetId) throw new Error("Target not found");
    const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;

    if (!approval && target.latestApprovalId) {
        const approvalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(target.latestApprovalId).get();
        approval = approvalSnap.exists ? toPlain(approvalSnap.data()) as SignalDeskApprovalItem : null;
    }
    const draftId = approval?.draftId || target.latestDraftId || null;
    const [draftSnap, evidence, cta] = await Promise.all([
        draftId ? db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(draftId).get() : null,
        readRecentByTarget<SignalDeskEvidencePacketSummary>(db, SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES, targetId, 1),
        readDefaultCta(db),
    ]);
    const draft = draftSnap?.exists ? toPlain(draftSnap.data()) as SignalDeskDraftSummary : null;
    const packetCore = await buildApprovalPacketSummary(db, {
        approval,
        cta,
        draft,
        evidence: evidence[0] || null,
        target,
    });
    const batch = db.batch();
    const timestamp = now();
    const packetRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS).doc(`packet_${approval?.approvalId || target.targetId}`);
    const packet = {
        approvalPacketId: packetRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        ...packetCore,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(packetRef, sanitizeForFirestore(packet), { merge: true });
    if (approval) {
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(approval.approvalId), sanitizeForFirestore({
            approvalPacketId: packetRef.id,
            updatedAt: timestamp,
        }), { merge: true });
    }
    writeRunTimeline(db, batch, {
        entityId: packetRef.id,
        entityType: "approval",
        label: "Approval packet",
        status: packetCore.recommendedAction === "approve" ? "ready" : "held",
        steps: [
            { label: "Target guard checked", status: packetCore.recommendedAction === "approve" ? "completed" : "held", at: toIso(timestamp) },
            { label: "Evidence and draft checked", status: packetCore.evidencePacketId && draft ? "completed" : "held", at: toIso(timestamp) },
            { label: "Sender domain checked", status: packetCore.channelReadiness === "ready" ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "approval_packet_create", "approvalPacket", packetRef.id, packetCore.recommendedAction);
    updateDailyCost(db, batch, 4, 0, 0);
    await batch.commit();
    return toPlain(packet) as SignalDeskApprovalPacketSummary;
}

export async function createSignalDeskSequencerHandoffServer(access: SignalDeskAccessContext, input: SequencerHandoffInput) {
    if (input.provider === "owned-email" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_OWNED_EMAIL_SEQUENCER) {
        throw new Error("Owned email sequencer is disabled");
    }
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "campaign", "SignalDesk campaign rail is paused");
    const { approval, draft, target, targetDetail } = await loadApprovedMessageContext(db, access, input.approvalId, "email");
    await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, target.sourcePolicyId), {
        entityId: input.approvalId,
        use: "sequence",
    });
    const recipient = getRecipientForChannel(targetDetail, "email");
    if (!recipient) throw new Error("Channel recipient is not configured");

    const [account, sender] = await Promise.all([
        readProviderAccount(db, input.provider, "sequencer"),
        readReadySenderDomain(db, input.senderDomainId),
    ]);
    const blockedReasons = [
        !account ? "Sequencer provider account is not registered." : "",
        account && (!account.ownerApproved || account.status !== "approved") ? "Sequencer provider account is not approved." : "",
        account && account.credentialState === "missing" ? "Provider account credentials are not configured." : "",
        !isSenderDomainReady(sender) ? "Sender domain is not ready." : "",
        input.provider === "owned-email" && !isEmailChannelReady() ? "Email provider is not configured." : "",
    ].filter(Boolean);

    const batch = db.batch();
    const timestamp = now();
    const handoffRef = db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS).doc(`sequencer_${input.provider}_${approval.approvalId}`);
    const ready = blockedReasons.length === 0;
    const owned = input.provider === "owned-email";
    const handoff = {
        sequencerHandoffId: handoffRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        provider: input.provider,
        status: blockedReasons.length ? "blocked" : owned ? "queued" : "ready",
        approvalId: approval.approvalId,
        targetId: target.targetId,
        targetName: target.displayName,
        senderDomainId: sender?.senderDomainId || input.senderDomainId || null,
        blockedReason: blockedReasons.join(" "),
        currentStep: owned && ready ? 1 : null,
        nextSendAt: owned && ready ? timestamp : null,
        providerCampaignId: null,
        providerLeadId: null,
        recipientPreview: previewSensitiveValue(recipient),
        stepCount: owned && ready ? 1 : null,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    batch.set(handoffRef, sanitizeForFirestore(handoff), { merge: true });
    if (owned && ready) {
        const stepRef = db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS).doc(sequenceStepIdFor(handoffRef.id, 1));
        batch.set(stepRef, sanitizeForFirestore({
            sequenceStepId: stepRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            sequencerHandoffId: handoffRef.id,
            approvalId: approval.approvalId,
            draftId: draft.draftId,
            targetId: target.targetId,
            targetName: target.displayName,
            channel: "email",
            stepNumber: 1,
            status: "ready",
            subject: draft.subject,
            body: draft.body,
            bodyPreview: draft.body.slice(0, 180),
            scheduledAt: timestamp,
            sentAt: null,
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(approval.approvalId), sanitizeForFirestore({
            status: "queued",
            updatedAt: timestamp,
        }), { merge: true });
        if (approval.draftId) {
            batch.set(db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(approval.draftId), sanitizeForFirestore({
                status: "queued",
                updatedAt: timestamp,
            }), { merge: true });
        }
    }
    writeRunTimeline(db, batch, {
        entityId: handoffRef.id,
        entityType: "approval",
        label: `${input.provider} sequencer handoff`,
        status: blockedReasons.length ? "blocked" : owned ? "ready" : "ready",
        steps: [
            { label: "Approved message loaded", status: "completed", at: toIso(timestamp) },
            { label: "Provider account checked", status: account && account.ownerApproved && account.status === "approved" ? "completed" : "blocked", at: toIso(timestamp) },
            { label: "Sender domain checked", status: isSenderDomainReady(sender) ? "completed" : "blocked", at: toIso(timestamp) },
            { label: owned ? "Owned email step queued" : "External sequencer connector held", status: ready ? "completed" : "blocked", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "sequencer_handoff_create", "sequencerHandoff", handoffRef.id, handoff.status);
    updateDailyCost(db, batch, owned && ready ? 7 : 3, 0, 0);
    await batch.commit();
    return toPlain(handoff) as SignalDeskSequencerHandoffSummary;
}

export async function sendSignalDeskOwnedSequenceStepServer(access: SignalDeskAccessContext, input: OwnedSequenceStepInput) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_OWNED_EMAIL_SEQUENCER) {
        throw new Error("Owned email sequencer is disabled");
    }
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND) {
        throw new Error("SignalDesk provider send is disabled");
    }
    const db = requireDb();
    await Promise.all([
        requireNoActiveKillSwitch(db, "global-outbound", "Outbound export is paused"),
        requireNoActiveKillSwitch(db, "email", "Outbound export is paused"),
        requireNoActiveKillSwitch(db, "campaign", "SignalDesk campaign rail is paused"),
    ]);

    const handoffRef = db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS).doc(input.sequencerHandoffId);
    const handoffSnap = await handoffRef.get();
    if (!handoffSnap.exists) throw new Error("Owned sequence not found");
    const handoff = toPlain(handoffSnap.data()) as SignalDeskSequencerHandoffSummary;
    if (handoff.provider !== "owned-email" || (handoff.status !== "queued" && handoff.status !== "ready")) {
        throw new Error("Owned sequence is not ready");
    }

    const stepNumber = Math.max(1, Number(handoff.currentStep || 1));
    const stepRef = db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS).doc(sequenceStepIdFor(handoff.sequencerHandoffId, stepNumber));
    const [stepSnap, targetSnap, targetDetailSnap, approvalSnap, draftSnap] = await Promise.all([
        stepRef.get(),
        handoff.targetId ? db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(handoff.targetId).get() : null,
        handoff.targetId ? db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(handoff.targetId).get() : null,
        handoff.approvalId ? db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(handoff.approvalId).get() : null,
        null,
    ]);
    if (!stepSnap.exists) throw new Error("Owned sequence step not found");
    if (!targetSnap?.exists) throw new Error("Target not found");
    if (!approvalSnap?.exists) throw new Error("Approval not found");

    const step = toPlain(stepSnap.data()) as SignalDeskSequencerStepSummary & { body?: string | null };
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const targetDetail = toPlain(targetDetailSnap?.data() || {}) as AnyRecord;
    const approval = toPlain(approvalSnap.data()) as SignalDeskApprovalItem;
    const draft = approval.draftId
        ? toPlain((await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(approval.draftId).get()).data()) as SignalDeskDraftSummary
        : draftSnap;
    if (!draft) throw new Error("Draft is required before export");
    await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, target.sourcePolicyId), {
        entityId: input.sequencerHandoffId,
        use: "send",
    });
    if (step.status !== "ready") throw new Error("Owned sequence is not ready");
    if (!isTimestampDue((step as AnyRecord).scheduledAt)) throw new Error("Owned sequence step is not due");
    if (target.suppressionStatus !== "clear") throw new Error("Target is suppressed");
    const recipient = getRecipientForChannel(targetDetail, "email");
    if (!recipient) throw new Error("Channel recipient is not configured");
    if (!isEmailChannelReady()) throw new Error("Email provider is not configured");

    const result = await sendSignalDeskProviderMessage({
        body: String((step as AnyRecord).body || draft?.body || ""),
        channel: "email",
        recipient,
        subject: step.subject || draft?.subject || "Quick note from MenuList",
    });

    const batch = db.batch();
    const timestamp = now();
    writeChannelDeliveryState({
        access,
        approval,
        batch,
        channel: "email",
        db,
        draft: draft as SignalDeskDraftSummary,
        providerMessageId: result.providerMessageId || null,
        providerName: "owned-email",
        status: "sent",
        target,
    });
    batch.set(stepRef, sanitizeForFirestore({
        status: "sent",
        providerMessageId: result.providerMessageId || null,
        sentAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });
    batch.set(handoffRef, sanitizeForFirestore({
        status: "sent",
        blockedReason: null,
        lastSendAt: timestamp,
        nextSendAt: null,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });
    writeRunTimeline(db, batch, {
        entityId: handoff.sequencerHandoffId,
        entityType: "approval",
        label: "Owned email sequence",
        status: "completed",
        steps: [
            { label: "Pause checks clear", status: "completed", at: toIso(timestamp) },
            { label: "Suppression clear", status: "completed", at: toIso(timestamp) },
            { label: "Email sent", status: "completed", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "owned_sequence_step_send", "sequencerHandoff", handoff.sequencerHandoffId, result.providerMessageId || "sent");
    updateDailyCost(db, batch, 9, 0, 0);
    await batch.commit();

    return { providerMessageId: result.providerMessageId || null, sequencerHandoffId: handoff.sequencerHandoffId, status: "sent" };
}

export async function importSignalDeskTargetsServer(access: SignalDeskAccessContext, input: {
    rows: TargetImportRow[];
    sourceName: string;
    sourcePolicyId: string;
}) {
    const db = requireDb();
    const rows = input.rows.slice(0, 50).filter((row) => normalizeText(row.displayName));
    if (!rows.length) throw new Error("No valid target rows supplied");

    const policySnap = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(input.sourcePolicyId).get();
    const policy = policySnap.exists ? toPlain(policySnap.data()) as SignalDeskSourcePolicy : null;
    await assertSourcePolicyUsable(db, access, policy, {
        entityId: input.sourcePolicyId,
        use: "import",
    });
    if (!policy || !sourcePolicyAllowsField(policy, "displayName")) {
        await appendSourcePolicyBlockedAudit(db, access, policy, { entityId: input.sourcePolicyId, use: "import" }, SOURCE_POLICY_USE_NOT_ALLOWED);
        throw new Error(SOURCE_POLICY_USE_NOT_ALLOWED);
    }
    const policyAllowedUse = resolveAllowedUse(policy);
    const policyExpiryMillis = getSourcePolicyExpiryMillis(policy);

    const batch = db.batch();
    const timestamp = now();
    const sourceRunRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES).doc();
    let importedCount = 0;
    let duplicateCount = 0;
    let suppressedCount = 0;
    let blockedCount = 0;
    let contactIdentityWriteCount = 0;
    const targets: SignalDeskTargetSummary[] = [];
    const targetIdsByIdentity = new Map<string, string>();

    for (const row of rows) {
        const allowedRow: TargetImportRow = {
            displayName: normalizeText(row.displayName),
            category: sourcePolicyAllowsField(policy, "category") ? row.category : undefined,
            city: sourcePolicyAllowsField(policy, "city") ? row.city : undefined,
            country: sourcePolicyAllowsField(policy, "country") ? row.country : undefined,
            currentListUrl: sourcePolicyAllowsField(policy, "currentListUrl") ? row.currentListUrl : undefined,
            website: sourcePolicyAllowsField(policy, "website") ? row.website : undefined,
            email: policyAllowedUse.contact && sourcePolicyAllowsField(policy, "email") ? row.email : undefined,
            phone: policyAllowedUse.contact && sourcePolicyAllowsField(policy, "phone") ? row.phone : undefined,
            instagram: policyAllowedUse.contact && sourcePolicyAllowsField(policy, "instagram") ? row.instagram : undefined,
            notes: sourcePolicyAllowsField(policy, "notes") ? row.notes : undefined,
            providerRecordId: sourcePolicyAllowsField(policy, "providerRecordId") ? row.providerRecordId : undefined,
            providerRecordUrl: sourcePolicyAllowsField(policy, "providerRecordUrl") ? row.providerRecordUrl : undefined,
        };
        const identityHash = computeTargetIdentity(allowedRow, { includeContact: policyAllowedUse.contact });
        const identityRef = db.collection(SIGNALDESK_COLLECTIONS.IDENTITY_INDEX).doc(identityHash);
        const targetIdFromCurrentImport = targetIdsByIdentity.get(identityHash);
        const identitySnap = targetIdFromCurrentImport ? null : await identityRef.get();
        const targetId = targetIdFromCurrentImport
            || (identitySnap?.exists && identitySnap.data()?.targetId
            ? String(identitySnap.data()?.targetId)
            : `tgt_${identityHash.slice(0, 20)}`);
        const duplicateInCurrentImport = Boolean(targetIdFromCurrentImport);
        targetIdsByIdentity.set(identityHash, targetId);
        if (duplicateInCurrentImport || identitySnap?.exists) duplicateCount += 1;

        const email = normalizeLower(allowedRow.email);
        const phone = normalizeText(allowedRow.phone).replace(/[^\d+]/g, "");
        const canonicalPhone = phone.replace(/\D/g, "");
        const instagram = normalizeLower(allowedRow.instagram).replace(/^@/, "");
        const [emailSuppression, phoneSuppression, canonicalPhoneSuppression, instagramSuppression] = await Promise.all([
            email ? db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(`email_${hashValue(email)}`).get() : null,
            phone ? db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(`phone_${hashValue(phone)}`).get() : null,
            canonicalPhone && canonicalPhone !== phone
                ? db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(`phone_${hashValue(canonicalPhone)}`).get()
                : null,
            instagram ? db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(`instagram_${hashValue(instagram)}`).get() : null,
        ]);
        const suppressionStatus: SignalDeskSuppressionStatus = emailSuppression?.exists
            || phoneSuppression?.exists
            || canonicalPhoneSuppression?.exists
            || instagramSuppression?.exists
            ? "suppressed"
            : "clear";
        if (suppressionStatus !== "clear") suppressedCount += 1;
        if (!policyAllowedUse.evidence) blockedCount += 1;

        const contactability = policyAllowedUse.contact ? classifyContactability(allowedRow) : "blocked";
        const target: SignalDeskTargetSummary = {
            targetId,
            displayName: normalizeText(allowedRow.displayName),
            category: normalizeText(allowedRow.category) || null,
            city: normalizeText(allowedRow.city) || null,
            country: normalizeText(allowedRow.country) || null,
            currentListUrl: normalizeText(allowedRow.currentListUrl) || null,
            website: normalizeText(allowedRow.website) || null,
            status: suppressionStatus === "clear" && policyAllowedUse.evidence ? "review" : "held",
            segment: suppressionStatus === "clear" ? "c" : "hold",
            primaryOpportunity: inferOpportunity(allowedRow),
            sourceConfidence: policyAllowedUse.evidence ? "medium" : "blocked",
            contactability,
            suppressionStatus,
            nextAction: suppressionStatus === "clear" && policyAllowedUse.evidence ? "score" : "hold",
            sourceRunId: sourceRunRef.id,
            sourcePolicyId: input.sourcePolicyId,
            updatedAt: toIso(timestamp),
        };

        const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId);
        batch.set(targetRef, sanitizeForFirestore({ ...target, pId: SIGNALDESK_PRODUCT_CODE, updatedAt: timestamp }), { merge: true });
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(targetId), sanitizeForFirestore({
            ...target,
            pId: SIGNALDESK_PRODUCT_CODE,
            email: email || null,
            phone: phone || null,
            instagram: normalizeText(allowedRow.instagram) || null,
            notes: normalizeText(allowedRow.notes) || null,
            identityHash,
            updatedAt: timestamp,
        }), { merge: true });
        batch.set(identityRef, sanitizeForFirestore({ identityHash, targetId, updatedAt: timestamp }), { merge: true });

        if (!duplicateInCurrentImport) {
            const candidateRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_CANDIDATES).doc();
            batch.set(candidateRef, sanitizeForFirestore({
                sourceCandidateId: candidateRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                targetId,
                sourceRunId: sourceRunRef.id,
                sourcePolicyId: input.sourcePolicyId,
                displayName: target.displayName,
                blocked: target.nextAction === "hold",
                createdAt: timestamp,
            }));
        }

        if (email) {
            batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(`email_${hashValue(email)}`), sanitizeForFirestore({
                identityId: `email_${hashValue(email)}`,
                targetId,
                channel: "email",
                value: email,
                permissionState: "permissioned",
                sourcePolicyId: input.sourcePolicyId,
                sourceRunId: sourceRunRef.id,
                observedAt: timestamp,
                expiresAt: policyExpiryMillis ? new Date(policyExpiryMillis) : null,
                updatedAt: timestamp,
            }), { merge: true });
            contactIdentityWriteCount += 1;
        }
        if (phone) {
            const phoneIdentity = `phone_${hashValue(phone)}`;
            batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(phoneIdentity), sanitizeForFirestore({
                identityId: phoneIdentity,
                targetId,
                channel: "phone",
                value: phone,
                permissionState: "permissioned",
                sourcePolicyId: input.sourcePolicyId,
                sourceRunId: sourceRunRef.id,
                observedAt: timestamp,
                expiresAt: policyExpiryMillis ? new Date(policyExpiryMillis) : null,
                updatedAt: timestamp,
            }), { merge: true });
            contactIdentityWriteCount += 1;
            const whatsappIdentity = `whatsapp_${hashValue(phone)}`;
            batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(whatsappIdentity), sanitizeForFirestore({
                identityId: whatsappIdentity,
                targetId,
                channel: "whatsapp",
                value: phone,
                permissionState: "research_only",
                sourcePolicyId: input.sourcePolicyId,
                sourceRunId: sourceRunRef.id,
                observedAt: timestamp,
                expiresAt: policyExpiryMillis ? new Date(policyExpiryMillis) : null,
                updatedAt: timestamp,
            }), { merge: true });
            contactIdentityWriteCount += 1;
        }
        if (instagram) {
            const instagramIdentity = `instagram_${hashValue(instagram)}`;
            batch.set(db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(instagramIdentity), sanitizeForFirestore({
                identityId: instagramIdentity,
                targetId,
                channel: "instagram",
                value: instagram,
                permissionState: "research_only",
                sourcePolicyId: input.sourcePolicyId,
                sourceRunId: sourceRunRef.id,
                observedAt: timestamp,
                expiresAt: policyExpiryMillis ? new Date(policyExpiryMillis) : null,
                updatedAt: timestamp,
            }), { merge: true });
            contactIdentityWriteCount += 1;
        }

        importedCount += 1;
        if (!duplicateInCurrentImport) targets.push(target);
    }

    const runData = {
        sourceRunId: sourceRunRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        sourcePolicyId: input.sourcePolicyId,
        sourceName: input.sourceName,
        status: blockedCount === importedCount ? "blocked" : blockedCount ? "partial" : "completed",
        importedCount,
        duplicateCount,
        suppressedCount,
        blockedCount,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };

    batch.set(sourceRunRef, sanitizeForFirestore(runData));
    appendAudit(db, batch, access, "target_import", "sourceRun", sourceRunRef.id, `${importedCount} targets`);
    updateControlSummary(db, batch, {
        sourceStatus: blockedCount ? "warning" : "healthy",
        targetCount: increment(Math.max(0, importedCount - duplicateCount)),
    });
    updateDailyCost(db, batch, importedCount * 5 + contactIdentityWriteCount + 4, 0);
    await batch.commit();

    return { run: toPlain(runData) as SignalDeskSourceRunSummary, targets };
}

export async function runSignalDeskSourceProviderServer(access: SignalDeskAccessContext, input: SourceProviderRunInput) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_SOURCE_PROVIDERS) {
        throw new Error("SignalDesk source providers are disabled");
    }
    if (input.provider === "fhrs-fhis" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_FHRS_FHIS_SOURCE_PROVIDER) {
        throw new Error("FHRS/FHIS source provider is disabled");
    }
    if (input.provider === "apify" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APIFY_SOURCE_BROKER) {
        throw new Error("Apify source broker is disabled");
    }
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "source-provider", "SignalDesk source providers are paused");
    const policy = await readSourcePolicy(db, input.sourcePolicyId);
    await assertSourcePolicyUsable(db, access, policy, {
        entityId: input.sourcePolicyId,
        requiredProvider: input.provider,
        requiredSourceType: "provider",
        use: "provider-run",
    });
    if (policy.sourceType !== "provider") throw new Error("Provider source policy is required");
    const allowedUse = resolveAllowedUse(policy);
    if (!allowedUse.evidence) throw new Error("Evidence use is not approved for this source policy");
    const estimatedCostUsd = estimateSourceProviderCostUsd(input.provider, input.maxResults);
    await requireProviderBudget(db, {
        estimatedCostUsd,
        provider: input.provider,
        use: "discovery",
    });

    const rows = await runSignalDeskSourceProvider({
        city: input.city,
        country: input.country,
        maxResults: input.maxResults,
        provider: input.provider,
        query: input.query,
    });
    if (!rows.length) throw new Error("No provider results returned");

    const imported = await importSignalDeskTargetsServer(access, {
        rows: rows as TargetImportRow[],
        sourceName: `${input.provider}: ${input.query}`,
        sourcePolicyId: input.sourcePolicyId,
    });

    const batch = db.batch();
    const timestamp = now();
    const providerRunRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_HEALTH_SUMMARIES).doc(`provider_${input.provider}`);
    const vendorRunRef = db.collection(SIGNALDESK_COLLECTIONS.VENDOR_RUNS).doc();
    const retentionEligibleProvider = input.provider === "google-places" || input.provider === "apify" || input.provider === "fhrs-fhis";
    batch.set(providerRunRef, sanitizeForFirestore({
        providerRunId: providerRunRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        provider: input.provider,
        query: input.query,
        resultCount: rows.length,
        sourcePolicyId: input.sourcePolicyId,
        status: "completed",
        updatedAt: timestamp,
        updatedBy: access.userId,
    }), { merge: true });
    batch.set(vendorRunRef, sanitizeForFirestore({
        vendorRunId: vendorRunRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        provider: input.provider,
        status: "completed",
        requestedField: "business",
        costEstimateUsd: estimatedCostUsd,
        resultCount: rows.length,
        sourcePolicyId: input.sourcePolicyId,
        query: input.query,
        updatedAt: timestamp,
        updatedBy: access.userId,
    }));
    if (retentionEligibleProvider) {
        rows.forEach((row: AnyRecord, index) => {
            const target = imported.targets[index];
            const providerRecordId = sourcePolicyAllowsField(policy, "providerRecordId") ? normalizeText(row.providerRecordId) : "";
            const providerRecordUrl = sourcePolicyAllowsField(policy, "providerRecordUrl") ? normalizeText(row.providerRecordUrl) : "";
            if (!target || (!providerRecordId && !providerRecordUrl)) return;
            const retentionId = `retention_${input.provider}_${hashValue(`${providerRecordId || providerRecordUrl}|${target.targetId}`).slice(0, 18)}`;
            batch.set(db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION).doc(retentionId), sanitizeForFirestore({
                providerSourceRetentionId: retentionId,
                pId: SIGNALDESK_PRODUCT_CODE,
                provider: input.provider,
                providerRecordId: providerRecordId || null,
                providerRecordUrl: providerRecordUrl || null,
                rawPayloadStored: false,
                sourcePolicyId: input.sourcePolicyId,
                sourceRunId: imported.run.sourceRunId,
                targetId: target.targetId,
                targetName: target.displayName,
                status: "active",
                lastRefreshedAt: timestamp,
                refreshDueAt: input.provider === "google-places" ? timestampAfterDays(365) : timestampAfterDays(Math.max(1, Math.min(365, policy.retentionDays))),
                retentionExpiresAt: timestampAfterDays(Math.max(1, Math.min(365, policy.retentionDays))),
                updatedAt: timestamp,
                updatedBy: access.userId,
            }), { merge: true });
        });
    }
    writeProviderSpend(db, batch, {
        costUsd: estimatedCostUsd,
        provider: input.provider,
        use: "discovery",
    });
    writeRunTimeline(db, batch, {
        entityId: providerRunRef.id,
        entityType: "provider",
        label: `${input.provider} source run`,
        status: "completed",
        steps: [
            { label: "Source policy approved", status: "completed", at: toIso(timestamp) },
            { label: "Provider budget checked", status: "completed", at: toIso(timestamp) },
            { label: `${rows.length} candidates imported`, status: "completed", at: toIso(timestamp) },
        ],
    });
    appendAudit(db, batch, access, "source_provider_run", "sourceProvider", providerRunRef.id, `${input.provider}: ${rows.length} results`);
    updateDailyCost(db, batch, 7, 0, estimatedCostUsd);
    await batch.commit();

    return { ...imported, providerRunId: providerRunRef.id, provider: input.provider, resultCount: rows.length };
}

export async function createSignalDeskResearchAgentRunServer(access: SignalDeskAccessContext, input: ResearchAgentInput) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_RESEARCH_AGENT_TABLE) {
        throw new Error("SignalDesk research agent table is disabled");
    }
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "source-provider", "SignalDesk source providers are paused");

    const location = inferResearchLocation(input.prompt, input.city, input.country);
    const category = inferResearchCategory(input.prompt);
    const provider = selectResearchProvider({
        country: location.country || input.country,
        provider: input.provider,
        researchType: input.researchType,
    });
    const sourcePolicy = await readUsableResearchSourcePolicy(db, access, provider, input.sourcePolicyId);
    const sourcePolicyId = sourcePolicy.sourcePolicyId;
    const maxResults = Math.max(1, Math.min(30, Math.floor(numberOrZero(input.maxResults) || 10)));
    const normalizedQuery = buildResearchProviderQuery({
        category,
        city: location.city,
        prompt: input.prompt,
        researchType: input.researchType,
    });
    const idempotencyKeyHash = normalizeText(input.idempotencyKey) ? hashValue(normalizeText(input.idempotencyKey)) : "";
    const idempotencyRef = idempotencyKeyHash ? db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`research_${idempotencyKeyHash}`) : null;
    if (idempotencyRef) {
        const priorKey = await idempotencyRef.get();
        const priorRunId = priorKey.exists ? normalizeText(priorKey.data()?.entityId) : "";
        if (priorRunId) {
            const priorRunSnap = await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_RUNS).doc(priorRunId).get();
            const priorRows = await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS).where("researchRunId", "==", priorRunId).limit(100).get();
            if (priorRunSnap.exists) {
                return {
                    duplicate: true,
                    rows: priorRows.docs.map((doc: any) => toPlain(doc.data())) as SignalDeskResearchTableRowSummary[],
                    run: toPlain({ ...priorRunSnap.data(), status: "duplicate" }) as SignalDeskResearchRunSummary,
                };
            }
        }
    }

    const timestamp = now();
    const researchRunId = researchRunIdFor({
        city: location.city || undefined,
        country: location.country || undefined,
        maxResults,
        prompt: input.prompt,
        provider,
        researchType: input.researchType,
    });
    const marketPodId = input.marketPodId || `market_pod_${hashValue([
        normalizeLower(location.city),
        normalizeLower(location.country),
        normalizeLower(category),
        input.researchType,
    ].join("|")).slice(0, 18)}`;
    const runRef = db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_RUNS).doc(researchRunId);
    const startBatch = db.batch();
    const queuedRun: SignalDeskResearchRunSummary = {
        category,
        city: location.city,
        country: location.country,
        createdAt: toIso(timestamp),
        enrichmentColumns: researchColumnsFor(input.researchType),
        failCount: 0,
        idempotencyKeyHash: idempotencyKeyHash || null,
        marketPodId,
        maxResults,
        normalizedQuery,
        passCount: 0,
        prompt: normalizeText(input.prompt),
        provider,
        providerRunIds: [],
        researchRunId,
        researchType: input.researchType,
        sourcePolicyId,
        sourceTransparency: [`provider:${provider}`, `source-policy:${sourcePolicyId}`],
        status: "running",
        tableRowCount: 0,
        unsureCount: 0,
        updatedAt: toIso(timestamp),
    };
    startBatch.set(runRef, sanitizeForFirestore({ ...queuedRun, pId: SIGNALDESK_PRODUCT_CODE, createdAt: timestamp, updatedAt: timestamp }));
    if (idempotencyRef) {
        startBatch.set(idempotencyRef, sanitizeForFirestore({
            entityId: researchRunId,
            entityType: "researchRun",
            idempotencyKeyHash,
            pId: SIGNALDESK_PRODUCT_CODE,
            updatedAt: timestamp,
        }));
    }
    writeRunTimeline(db, startBatch, {
        entityId: researchRunId,
        entityType: "research",
        label: "Research agent table",
        status: "ready",
        steps: [
            { label: "Prompt normalized", status: "completed", at: toIso(timestamp) },
            { label: "Provider run started", status: "ready", at: toIso(timestamp) },
        ],
    });
    await startBatch.commit();

    try {
        const providerResult = await runSignalDeskSourceProviderServer(access, {
            city: location.city || undefined,
            country: location.country || undefined,
            maxResults,
            provider,
            query: normalizedQuery,
            sourcePolicyId,
        });
        const retentionSnap = await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION)
            .where("sourceRunId", "==", providerResult.run.sourceRunId)
            .limit(100)
            .get();
        const retentionByTarget = new Map<string, SignalDeskProviderSourceRetentionSummary>();
        retentionSnap.docs.forEach((doc: any) => {
            const record = toPlain(doc.data()) as SignalDeskProviderSourceRetentionSummary;
            if (record.targetId) retentionByTarget.set(record.targetId, record);
        });
        const rows = providerResult.targets.map((target: SignalDeskTargetSummary, index: number) => buildResearchRow({
            index,
            provider,
            providerRecordUrl: retentionByTarget.get(target.targetId)?.providerRecordUrl || null,
            researchRunId,
            researchType: input.researchType,
            sourcePolicy,
            sourcePolicyId,
            sourceRunId: providerResult.run.sourceRunId,
            target,
        }));
        const passCount = rows.filter((row) => row.fitDecision === "pass").length;
        const failCount = rows.filter((row) => row.fitDecision === "fail").length;
        const unsureCount = rows.filter((row) => row.fitDecision === "unsure").length;
        const completedAt = now();
        const researchPodRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(marketPodId);
        const existingResearchPodSnap = await researchPodRef.get();
        const existingResearchPod = existingResearchPodSnap.exists
            ? toPlain(existingResearchPodSnap.data()) as SignalDeskMarketPodSummary
            : null;
        const founderControlledScope = Boolean(existingResearchPod?.reviewedBy || existingResearchPod?.approvedBy);
        const researchPodStatus: SignalDeskMarketPodSummary["status"] = existingResearchPod?.reviewDecision === "approved" && existingResearchPod.approvedBy
            ? "active"
            : existingResearchPod?.reviewDecision === "rejected"
                ? "blocked"
                : "hold";
        const completeBatch = db.batch();
        rows.forEach((row) => {
            completeBatch.set(db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS).doc(row.researchRowId), sanitizeForFirestore({
                ...row,
                pId: SIGNALDESK_PRODUCT_CODE,
                updatedAt: completedAt,
            }), { merge: true });
        });
        completeBatch.set(runRef, sanitizeForFirestore({
            failCount,
            passCount,
            providerRunIds: [providerResult.providerRunId, providerResult.run.sourceRunId].filter(Boolean),
            sourceTransparency: [
                `provider:${provider}`,
                `source-policy:${sourcePolicyId}`,
                `source-run:${providerResult.run.sourceRunId}`,
                `provider-run:${providerResult.providerRunId}`,
            ],
            status: "completed",
            tableRowCount: rows.length,
            unsureCount,
            updatedAt: completedAt,
        }), { merge: true });
        completeBatch.set(researchPodRef, sanitizeForFirestore({
            approvedAt: existingResearchPod?.approvedAt || null,
            approvedBy: existingResearchPod?.approvedBy || null,
            category: founderControlledScope ? existingResearchPod?.category || null : category,
            city: founderControlledScope ? existingResearchPod?.city || null : location.city || null,
            confidence: passCount > 0 ? "medium" : "low",
            country: founderControlledScope ? existingResearchPod?.country || null : location.country || null,
            marketPodId,
            monthlyBudgetUsd: founderControlledScope ? numberOrZero(existingResearchPod?.monthlyBudgetUsd) : 0,
            name: founderControlledScope
                ? existingResearchPod?.name
                : [category, location.city || location.country || "market"].filter(Boolean).join(" / "),
            offerAngle: founderControlledScope
                ? existingResearchPod?.offerAngle
                : input.researchType === "partner-list"
                ? "Find trusted operators who can introduce MenuList to restaurant owners."
                : "Find businesses with weak current-list presence and route them to a reviewable MenuList preview.",
            recommendation: passCount > 0 ? "activate" : "hold",
            recommendationReason: `${passCount} pass, ${unsureCount} unsure, ${failCount} fail from research run ${researchRunId}.`,
            reviewDecision: existingResearchPod?.reviewDecision || null,
            reviewedAt: existingResearchPod?.reviewedAt || null,
            reviewedBy: existingResearchPod?.reviewedBy || null,
            reviewReason: existingResearchPod?.reviewReason || null,
            status: researchPodStatus,
            successMetric: founderControlledScope
                ? existingResearchPod?.successMetric
                : "Activated businesses with current lists live on two customer surfaces within seven days.",
            updatedAt: completedAt,
        }), { merge: true });
        writeRunTimeline(db, completeBatch, {
            entityId: researchRunId,
            entityType: "research",
            label: "Research agent table",
            status: "completed",
            steps: [
                { label: "Prompt normalized", status: "completed", at: toIso(timestamp) },
                { label: `${provider} provider run completed`, status: "completed", at: toIso(completedAt) },
                { label: `${rows.length} rows scored pass/fail/unsure`, status: "completed", at: toIso(completedAt) },
            ],
        });
        appendAudit(db, completeBatch, access, "research_agent_run", "researchRun", researchRunId, `${normalizedQuery}: ${rows.length} rows`);
        updateDailyCost(db, completeBatch, rows.length * 3 + 8);
        await completeBatch.commit();

        return {
            duplicate: false,
            rows: rows.map((row) => ({ ...row, updatedAt: toIso(completedAt) })) as SignalDeskResearchTableRowSummary[],
            run: {
                ...queuedRun,
                failCount,
                passCount,
                providerRunIds: [providerResult.providerRunId, providerResult.run.sourceRunId].filter(Boolean),
                sourceTransparency: [
                    `provider:${provider}`,
                    `source-policy:${sourcePolicyId}`,
                    `source-run:${providerResult.run.sourceRunId}`,
                    `provider-run:${providerResult.providerRunId}`,
                ],
                status: "completed",
                tableRowCount: rows.length,
                unsureCount,
                updatedAt: toIso(completedAt),
            } as SignalDeskResearchRunSummary,
        };
    } catch (error) {
        const blockedAt = now();
        const blockBatch = db.batch();
        blockBatch.set(runRef, sanitizeForFirestore({
            status: "blocked",
            updatedAt: blockedAt,
        }), { merge: true });
        writeRunTimeline(db, blockBatch, {
            entityId: researchRunId,
            entityType: "research",
            label: "Research agent table",
            status: "blocked",
            steps: [
                { label: "Prompt normalized", status: "completed", at: toIso(timestamp) },
                { label: "Provider run blocked", status: "blocked", at: toIso(blockedAt) },
            ],
        });
        appendAudit(db, blockBatch, access, "research_agent_blocked", "researchRun", researchRunId, SIGNALDESK_RESEARCH_AGENT_BLOCKED_REASON);
        await blockBatch.commit();
        throw error;
    }
}

export async function scoreSignalDeskTargetServer(access: SignalDeskAccessContext, targetId: string) {
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "ai-worker", "SignalDesk AI workers are paused");
    const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) throw new Error("Target not found");

    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, target.sourcePolicyId), {
        entityId: targetId,
        use: "evidence",
    });
    const score = computeScore(target);
    const batch = db.batch();
    const timestamp = now();
    const scoreRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc();
    const snapshotRef = db.collection(SIGNALDESK_COLLECTIONS.DECISION_SNAPSHOTS).doc();
    const ledgerRef = db.collection(SIGNALDESK_COLLECTIONS.AI_OPERATION_LEDGER).doc();
    const scoreData = { ...score, scoreId: scoreRef.id, createdAt: timestamp };

    batch.set(scoreRef, sanitizeForFirestore({
        ...scoreData,
        pId: SIGNALDESK_PRODUCT_CODE,
        workerType: "target_score",
        workerVersion: "rules-v1",
        targetId,
        costEstimate: 0,
    }));
    batch.set(snapshotRef, sanitizeForFirestore({
        snapshotId: snapshotRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId,
        decisionType: "score",
        confidence: score.segment === "a" ? "high" : score.segment === "b" ? "medium" : "low",
        rejectedFacts: [],
        evidenceRefs: [],
        ruleVersion: "rules-v1",
        decidedBy: "system",
        createdAt: timestamp,
    }));
    batch.set(ledgerRef, sanitizeForFirestore({
        operationId: ledgerRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId,
        operation: "target_score",
        costEstimate: 0,
        createdAt: timestamp,
    }));
    batch.set(targetRef, sanitizeForFirestore({
        fitScore: score.fitScore,
        currentListGapScore: score.currentListGapScore,
        contactabilityScore: score.contactabilityScore,
        riskScore: score.riskScore,
        segment: score.segment,
        nextAction: score.nextAction,
        status: score.nextAction === "hold" ? "held" : "ready",
        updatedAt: timestamp,
    }), { merge: true });
    appendAudit(db, batch, access, "target_score", "target", targetId, score.reasons.join("; "));
    updateDailyCost(db, batch, 5, 0);
    await batch.commit();

    return toPlain(scoreData) as SignalDeskAiScoreSummary;
}

export async function runSignalDeskAiAssistServer(access: SignalDeskAccessContext, input: AiAssistInput) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_AI_PROVIDER_CALLS) {
        throw new Error("SignalDesk AI provider calls are disabled");
    }
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "ai-worker", "SignalDesk AI workers are paused");
    const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get();
    if (!targetSnap.exists) throw new Error("Target not found");

    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, target.sourcePolicyId), {
        entityId: input.targetId,
        use: input.task === "draft" ? "draft" : "evidence",
    });
    const evidence = (await readRecentByTarget<SignalDeskEvidencePacketSummary>(db, SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES, input.targetId, 1))[0] || null;
    const { estimatedCostUsd: generationCostUsd, route } = await resolveModelRouteForTask(db, input.task);
    const initialAssist = await runSignalDeskAiAssist({
        evidence,
        instruction: input.instruction,
        model: route.defaultModel,
        target,
        task: input.task,
    });
    let finalAssist = initialAssist;
    let finalOutput = initialAssist.output;
    let finalConfidence = initialAssist.confidence;
    let critic: Awaited<ReturnType<typeof runSignalDeskAiCritic>> | null = null;
    let criticCostUsd = 0;
    let escalated = false;
    let escalationBlocked = false;
    let escalationCostUsd = 0;
    let modelCallCount = 1;

    if (input.multiPass) {
        const criticRouteResult = await resolveModelRouteForTask(db, "quality-critic");
        criticCostUsd = criticRouteResult.estimatedCostUsd;
        critic = await runSignalDeskAiCritic({
            candidate: initialAssist.output,
            evidence,
            model: criticRouteResult.route.defaultModel,
            target,
            task: input.task,
        });
        modelCallCount += 1;
        if (critic.verdict === "revise" && critic.revisedOutput) finalOutput = critic.revisedOutput;

        const initialRejectedFacts = Array.isArray(initialAssist.output.rejectedFacts) ? initialAssist.output.rejectedFacts : [];
        const needsEscalation = initialAssist.confidence === "low"
            || critic.confidence === "low"
            || critic.verdict !== "pass"
            || initialRejectedFacts.length > 0
            || critic.rejectedFacts.length > 0;
        if (needsEscalation) {
            if (route.escalationProvider === "gemini" && route.escalationModel) {
                escalationCostUsd = Math.min(numberOrZero(route.maxCostUsd), 0.05);
                await requireProviderBudget(db, {
                    estimatedCostUsd: escalationCostUsd,
                    provider: "gemini",
                    use: "ai",
                });
                finalAssist = await runSignalDeskAiAssist({
                    evidence,
                    instruction: [
                        input.instruction || "",
                        "Produce a corrected final result after an independent critic review. Do not claim external-action approval.",
                        `Critic verdict: ${critic.verdict}.`,
                        `Critic reasons: ${critic.reasons.join("; ")}.`,
                    ].filter(Boolean).join(" "),
                    model: route.escalationModel,
                    priorOutput: critic.revisedOutput || initialAssist.output,
                    target,
                    task: input.task,
                });
                finalOutput = finalAssist.output;
                finalConfidence = critic.verdict === "hold"
                    ? "low"
                    : finalAssist.confidence === "low"
                        ? "low"
                        : "medium";
                escalated = true;
                modelCallCount += 1;
            } else {
                escalationBlocked = true;
                finalConfidence = "low";
            }
        } else if (critic.confidence === "medium" || initialAssist.confidence === "medium") {
            finalConfidence = "medium";
        } else {
            finalConfidence = "high";
        }
    }

    const estimatedCostUsd = generationCostUsd + criticCostUsd + escalationCostUsd;

    const timestamp = now();
    const runRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc();
    const snapshotRef = db.collection(SIGNALDESK_COLLECTIONS.DECISION_SNAPSHOTS).doc();
    const ledgerRef = db.collection(SIGNALDESK_COLLECTIONS.AI_OPERATION_LEDGER).doc();
    const evalRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(`model_eval_${route.task}_${route.defaultProvider}`);
    const rejectedFacts = Array.from(new Set([
        ...(Array.isArray(finalOutput.rejectedFacts) ? finalOutput.rejectedFacts : []),
        ...(critic?.rejectedFacts || []),
    ].filter((fact): fact is string => typeof fact === "string" && Boolean(fact.trim())).map((fact) => fact.trim()))).slice(0, 16);
    if (rejectedFacts.length) finalConfidence = "low";
    await db.runTransaction(async (transaction: any) => {
        const evalSnap = await transaction.get(evalRef);
        const rawExistingEval = evalSnap.exists
            ? toPlain(evalSnap.data()) as SignalDeskModelEvalSummary
            : null;
        const existingEval = rawExistingEval ? annotateModelEvalSummary(rawExistingEval) : null;
        const hasExactCumulativeCounts = rawExistingEval?.passedSampleCount !== undefined
            || rawExistingEval?.rejectedFactSampleCount !== undefined;
        const sampleSize = (hasExactCumulativeCounts ? nonNegativeInteger(existingEval?.sampleSize) : 0) + 1;
        const passedSampleCount = (hasExactCumulativeCounts ? nonNegativeInteger(existingEval?.passedSampleCount) : 0) + (finalConfidence === "low" ? 0 : 1);
        const lowConfidenceCount = (hasExactCumulativeCounts ? nonNegativeInteger(existingEval?.lowConfidenceCount) : 0) + (finalConfidence === "low" ? 1 : 0);
        const rejectedFactSampleCount = (hasExactCumulativeCounts ? nonNegativeInteger(existingEval?.rejectedFactSampleCount) : 0) + (rejectedFacts.length ? 1 : 0);

        transaction.set(runRef, sanitizeForFirestore({
            aiRunId: runRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            workerType: `ai_assist_${input.task}`,
            workerVersion: critic ? `${initialAssist.promptVersion}+${critic.promptVersion}` : initialAssist.promptVersion,
            task: input.task,
            provider: route.defaultProvider,
            model: finalAssist.model,
            modelRouteId: route.modelRouteId,
            modelEvalId: evalRef.id,
            volumeRunId: input.volumeRunId || null,
            targetId: input.targetId,
            confidence: finalConfidence,
            rejectedFactCount: rejectedFacts.length,
            initialOutput: critic ? initialAssist.output : null,
            output: finalOutput,
            criticConfidence: critic?.confidence || null,
            criticModel: critic?.model || null,
            criticPromptVersion: critic?.promptVersion || null,
            criticReasons: critic?.reasons || [],
            criticRejectedFactCount: critic?.rejectedFacts.length || 0,
            criticVerdict: critic?.verdict || null,
            escalated,
            escalationBlocked,
            escalationModel: escalated ? finalAssist.model : route.escalationModel || null,
            modelCallCount,
            costEstimate: estimatedCostUsd,
            reviewDecision: null,
            reviewReason: null,
            reviewedAt: null,
            reviewedBy: null,
            founderAttentionMinutes: 0,
            createdAt: timestamp,
        }));
        transaction.set(snapshotRef, sanitizeForFirestore({
            snapshotId: snapshotRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId: input.targetId,
            decisionType: "score",
            confidence: finalConfidence,
            rejectedFacts,
            evidenceRefs: evidence?.evidencePacketId ? [evidence.evidencePacketId] : [],
            aiWorkerVersion: critic ? `${initialAssist.promptVersion}+${critic.promptVersion}` : initialAssist.promptVersion,
            ruleVersion: "ai-assist-v2",
            decidedBy: "system",
            createdAt: timestamp,
        }));
        transaction.set(ledgerRef, sanitizeForFirestore({
            operationId: ledgerRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId: input.targetId,
            operation: `ai_assist_${input.task}`,
            costEstimate: estimatedCostUsd,
            model: finalAssist.model,
            modelCallCount,
            volumeRunId: input.volumeRunId || null,
            createdAt: timestamp,
        }));
        transaction.set(evalRef, sanitizeForFirestore({
            modelEvalId: evalRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            modelRouteId: route.modelRouteId,
            task: route.task,
            provider: route.defaultProvider,
            model: finalAssist.model,
            status: finalConfidence === "low" ? "needs-review" : existingEval?.status === "failed" ? "failed" : "passed",
            measurementVersion: "cumulative-v1",
            legacySampleSize: hasExactCumulativeCounts
                ? nonNegativeInteger(existingEval?.legacySampleSize)
                : nonNegativeInteger(existingEval?.sampleSize),
            legacyPassRate: hasExactCumulativeCounts
                ? numberOrZero(existingEval?.legacyPassRate)
                : numberOrZero(existingEval?.passRate),
            legacyRejectedFactRate: hasExactCumulativeCounts
                ? numberOrZero(existingEval?.legacyRejectedFactRate)
                : numberOrZero(existingEval?.rejectedFactRate),
            sampleSize,
            passedSampleCount,
            lowConfidenceCount,
            rejectedFactSampleCount,
            reviewedSampleSize: nonNegativeInteger(existingEval?.reviewedSampleSize),
            acceptedCount: nonNegativeInteger(existingEval?.acceptedCount),
            editedCount: nonNegativeInteger(existingEval?.editedCount),
            rejectedCount: nonNegativeInteger(existingEval?.rejectedCount),
            heldCount: nonNegativeInteger(existingEval?.heldCount),
            passRate: ratio(passedSampleCount, sampleSize),
            editRate: numberOrZero(existingEval?.editRate),
            rejectedFactRate: ratio(rejectedFactSampleCount, sampleSize),
            acceptanceRate: numberOrZero(existingEval?.acceptanceRate),
            rejectionRate: numberOrZero(existingEval?.rejectionRate),
            holdRate: numberOrZero(existingEval?.holdRate),
            founderAttentionMinutes: nonNegativeInteger(existingEval?.founderAttentionMinutes),
            updatedAt: timestamp,
            updatedBy: access.userId,
        }), { merge: true });
        writeProviderSpend(db, transaction, {
            costUsd: estimatedCostUsd,
            provider: route.defaultProvider,
            use: "ai",
        });
        writeRunTimeline(db, transaction, {
            entityId: runRef.id,
            entityType: "model",
            label: `${route.defaultProvider}/${finalAssist.model} ${input.task}`,
            status: finalConfidence === "low" ? "held" : "completed",
            steps: [
                { label: "Model route active", status: "completed", at: toIso(timestamp) },
                { label: "Provider budget checked", status: "completed", at: toIso(timestamp) },
                ...(critic ? [{ label: `Critic: ${critic.verdict}`, status: critic.verdict === "pass" ? "completed" as const : "held" as const, at: toIso(timestamp) }] : []),
                ...(escalated ? [{ label: `Escalated: ${finalAssist.model}`, status: "completed" as const, at: toIso(timestamp) }] : []),
                ...(escalationBlocked ? [{ label: "Escalation unavailable", status: "held" as const, at: toIso(timestamp) }] : []),
                { label: "Rejected facts captured", status: rejectedFacts.length ? "held" : "completed", at: toIso(timestamp) },
            ],
        });
        appendAudit(db, transaction, access, "ai_assist_run", "target", input.targetId, input.task);
        updateDailyCost(db, transaction, 8, estimatedCostUsd, 0);
    });

    return {
        ...finalAssist,
        aiRunId: runRef.id,
        confidence: finalConfidence,
        critic,
        escalated,
        escalationBlocked,
        estimatedCostUsd,
        modelCallCount,
        output: finalOutput,
    };
}

const signalDeskAiVolumeFailureCode = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("budget") || message.includes("cost")) return "ai_volume_budget_blocked";
    if (message.includes("source policy") || message.startsWith("SOURCE_POLICY_")) return "ai_volume_policy_blocked";
    if (message.includes("provider") || message.includes("route") || message.includes("model")) return "ai_volume_provider_blocked";
    if (message.includes("Target")) return "ai_volume_target_blocked";
    return "ai_volume_child_failed";
};

const SIGNALDESK_AI_VOLUME_LOCK_ID = "ai_volume_lock_global";
const SIGNALDESK_AI_VOLUME_LOCK_TTL_MS = 6 * 60 * 1000;
const SIGNALDESK_AI_VOLUME_INTERRUPTED_CODE = "ai_volume_run_interrupted";

const recoverExpiredSignalDeskAiVolumeRun = async (params: {
    access: SignalDeskAccessContext;
    db: any;
    existingSnap: any;
    lockRef: any;
    volumeRef: any;
}): Promise<SignalDeskAiVolumeRunSummary> => {
    const existingRaw = params.existingSnap.data() as AnyRecord;
    const existing = toPlain(existingRaw) as SignalDeskAiVolumeRunSummary;
    if (existing.status !== "running") return existing;
    const fallbackAnchorMillis = toTimestampMillis(existingRaw.updatedAt || existingRaw.createdAt);
    const expiresAtMillis = toTimestampMillis(existingRaw.lockExpiresAt)
        || (fallbackAnchorMillis ? fallbackAnchorMillis + SIGNALDESK_AI_VOLUME_LOCK_TTL_MS : null);
    if (!expiresAtMillis || expiresAtMillis > Date.now()) return existing;

    const childSnaps = await params.db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS)
        .where("volumeRunId", "==", params.volumeRef.id)
        .limit(20)
        .get();
    const recoveredChildren = childSnaps.docs
        .map((doc: any) => toPlain(doc.data()) as SignalDeskAiWorkerRunSummary)
        .filter((run: SignalDeskAiWorkerRunSummary) => String(run.workerType || "").startsWith("ai_assist_"));
    const recoveredChildRunIds = Array.from(new Set([
        ...(existing.childRunIds || []),
        ...recoveredChildren.map((run) => run.aiRunId).filter(Boolean),
    ])).slice(0, 15);
    const recoveredCostUsd = recoveredChildren.reduce((sum, run) => sum + numberOrZero(run.costEstimate), 0);
    const recoveredModelCallCount = recoveredChildren.reduce((sum, run) => sum + nonNegativeInteger(run.modelCallCount || 1), 0);
    const recoveredAt = now();

    return params.db.runTransaction(async (transaction: any) => {
        const [currentSnap, lockSnap] = await Promise.all([
            transaction.get(params.volumeRef),
            transaction.get(params.lockRef),
        ]);
        if (!currentSnap.exists) return existing;
        const currentRaw = currentSnap.data() as AnyRecord;
        const current = toPlain(currentRaw) as SignalDeskAiVolumeRunSummary;
        if (current.status !== "running") return current;
        const currentFallbackAnchorMillis = toTimestampMillis(currentRaw.updatedAt || currentRaw.createdAt);
        const currentExpiresAtMillis = toTimestampMillis(currentRaw.lockExpiresAt)
            || (currentFallbackAnchorMillis ? currentFallbackAnchorMillis + SIGNALDESK_AI_VOLUME_LOCK_TTL_MS : null);
        if (!currentExpiresAtMillis || currentExpiresAtMillis > recoveredAt.toMillis()) return current;

        const requestedPairCount = nonNegativeInteger(current.requestedPairCount);
        const completedPairCount = recoveredChildRunIds.length;
        const fullyRecovered = requestedPairCount > 0 && completedPairCount >= requestedPairCount;
        const status: SignalDeskAiVolumeRunSummary["status"] = fullyRecovered
            ? "completed"
            : completedPairCount > 0
                ? "partial"
                : "blocked";
        const failureCodes = fullyRecovered
            ? Array.from(new Set(current.failureCodes || []))
            : Array.from(new Set([...(current.failureCodes || []), SIGNALDESK_AI_VOLUME_INTERRUPTED_CODE]));
        const updates = {
            childRunIds: recoveredChildRunIds,
            completedAt: recoveredAt,
            completedPairCount,
            estimatedCostUsd: Math.max(numberOrZero(current.estimatedCostUsd), recoveredCostUsd),
            failedPairCount: fullyRecovered ? 0 : Math.max(0, requestedPairCount - completedPairCount),
            failureCodes,
            modelCallCount: Math.max(nonNegativeInteger(current.modelCallCount), recoveredModelCallCount),
            status,
            updatedAt: recoveredAt,
        };
        transaction.set(params.volumeRef, sanitizeForFirestore(updates), { merge: true });
        const lock = lockSnap.exists ? lockSnap.data() as AnyRecord : null;
        if (lock?.activeVolumeRunId === params.volumeRef.id) {
            transaction.set(params.lockRef, sanitizeForFirestore({
                activeVolumeRunId: params.volumeRef.id,
                expiresAt: recoveredAt,
                recoveryReason: SIGNALDESK_AI_VOLUME_INTERRUPTED_CODE,
                status: "completed",
                updatedAt: recoveredAt,
            }), { merge: true });
        }
        writeRunTimeline(params.db, transaction, {
            entityId: params.volumeRef.id,
            entityType: "model",
            label: `AI volume batch recovered: ${completedPairCount}/${requestedPairCount} pairs`,
            status: status === "completed" ? "completed" : status === "partial" ? "held" : "blocked",
            steps: [
                { label: "Expired running parent detected", status: "held", at: toIso(recoveredAt) },
                { label: `${completedPairCount} child runs recovered`, status: completedPairCount ? "completed" : "blocked", at: toIso(recoveredAt) },
                { label: `Recovered as ${status}`, status: status === "completed" ? "completed" : status === "partial" ? "held" : "blocked", at: toIso(recoveredAt) },
            ],
        });
        appendAudit(params.db, transaction, params.access, "ai_volume_batch_recovered", "aiWorkerRun", params.volumeRef.id, status);
        updateDailyCost(params.db, transaction, lock?.activeVolumeRunId === params.volumeRef.id ? 5 : 4, 0);
        return toPlain({ ...current, ...updates }) as SignalDeskAiVolumeRunSummary;
    });
};

export async function runSignalDeskAiVolumeBatchServer(
    access: SignalDeskAccessContext,
    input: AiVolumeBatchInput,
) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_AI_VOLUME_MODE) {
        throw new Error("SignalDesk AI Volume Mode is disabled");
    }
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_AI_PROVIDER_CALLS) {
        throw new Error("SignalDesk AI provider calls are disabled");
    }
    if (access.role !== "founder-admin" || !access.permissions.includes("signaldesk.configure")) {
        throw new Error("Founder approval is required for AI volume runs");
    }
    const idempotencyKey = normalizeText(input.idempotencyKey);
    const targetIds = Array.from(new Set(input.targetIds.map((targetId) => normalizeText(targetId)).filter(Boolean)));
    const tasks = Array.from(new Set(input.tasks));
    const allowedTasks: SignalDeskAiVolumeTask[] = ["score", "evidence", "draft", "reply-classification"];
    if (
        idempotencyKey.length < 8
        || idempotencyKey.length > 180
        || !targetIds.length
        || targetIds.length > 5
        || targetIds.some((targetId) => targetId.length < 3 || targetId.length > 160)
        || !tasks.length
        || tasks.length > 3
        || tasks.some((task) => !allowedTasks.includes(task))
        || numberOrZero(input.maxEstimatedCostUsd) < 0.01
        || numberOrZero(input.maxEstimatedCostUsd) > 5
    ) {
        throw new Error("AI volume batch limits are invalid");
    }

    const db = requireDb();
    const idempotencyKeyHash = hashValue(`${access.userId}|${idempotencyKey}`);
    const volumeRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(`ai_volume_${idempotencyKeyHash.slice(0, 24)}`);
    const lockRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(SIGNALDESK_AI_VOLUME_LOCK_ID);
    const existingVolumeSnap = await volumeRef.get();
    if (existingVolumeSnap.exists) {
        return recoverExpiredSignalDeskAiVolumeRun({
            access,
            db,
            existingSnap: existingVolumeSnap,
            lockRef,
            volumeRef,
        });
    }
    await requireNoActiveKillSwitch(db, "ai-worker", "SignalDesk AI workers are paused");
    const [criticRoute, ...taskRoutes] = await Promise.all([
        readModelRoute(db, "quality-critic"),
        ...tasks.map((task) => readModelRoute(db, task)),
    ]);
    if (!criticRoute || criticRoute.status !== "active" || criticRoute.defaultProvider !== "gemini") {
        throw new Error("SignalDesk AI critic route is not active");
    }
    taskRoutes.forEach((route) => {
        if (!route || route.status !== "active" || route.defaultProvider !== "gemini") {
            throw new Error("SignalDesk AI route is not active");
        }
    });
    const projectedPairCostUsd = taskRoutes.reduce((sum, route) => sum
        + Math.min(numberOrZero(route?.maxCostUsd), 0.05)
        + Math.min(numberOrZero(criticRoute.maxCostUsd), 0.05)
        + (route?.escalationProvider === "gemini" && route.escalationModel ? Math.min(numberOrZero(route.maxCostUsd), 0.05) : 0), 0);
    const projectedMaxCostUsd = projectedPairCostUsd * targetIds.length;
    if (projectedMaxCostUsd > numberOrZero(input.maxEstimatedCostUsd) + 0.000001) {
        throw new Error("AI volume projected cost exceeds founder maximum");
    }
    await requireProviderBudget(db, {
        enforcePerRunBudget: false,
        estimatedCostUsd: projectedMaxCostUsd,
        provider: "gemini",
        use: "ai",
    });

    const timestamp = now();
    const lockExpiresAt = admin.firestore.Timestamp.fromMillis(timestamp.toMillis() + SIGNALDESK_AI_VOLUME_LOCK_TTL_MS);
    const initialVolumeRun = {
        aiRunId: volumeRef.id,
        volumeRunId: volumeRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        workerType: "ai_volume_batch" as const,
        workerVersion: "ai-volume-v1" as const,
        status: "running" as const,
        targetIds,
        tasks,
        requestedPairCount: targetIds.length * tasks.length,
        completedPairCount: 0,
        failedPairCount: 0,
        modelCallCount: 0,
        estimatedCostUsd: 0,
        maxEstimatedCostUsd: input.maxEstimatedCostUsd,
        projectedMaxCostUsd,
        childRunIds: [] as string[],
        failureCodes: [] as string[],
        idempotencyKeyHash,
        instruction: normalizeText(input.instruction) || null,
        lockExpiresAt,
        createdAt: timestamp,
        createdBy: access.userId,
        updatedAt: timestamp,
    };
    const startResult = await db.runTransaction(async (transaction: any) => {
        const [existingSnap, lockSnap] = await Promise.all([
            transaction.get(volumeRef),
            transaction.get(lockRef),
        ]);
        if (existingSnap.exists) {
            return { created: false, run: toPlain(existingSnap.data()) as SignalDeskAiVolumeRunSummary };
        }
        const lock = lockSnap.exists ? lockSnap.data() as AnyRecord : null;
        const activeLockExpiresAt = lock?.expiresAt?.toMillis?.() || 0;
        if (lock?.status === "running" && activeLockExpiresAt > timestamp.toMillis()) {
            throw new Error("SignalDesk AI volume run is already active");
        }
        transaction.set(lockRef, sanitizeForFirestore({
            activeVolumeRunId: volumeRef.id,
            createdAt: lock?.createdAt || timestamp,
            expiresAt: lockExpiresAt,
            pId: SIGNALDESK_PRODUCT_CODE,
            status: "running",
            updatedAt: timestamp,
            workerType: "ai_volume_lock",
        }));
        transaction.set(volumeRef, sanitizeForFirestore(initialVolumeRun));
        writeRunTimeline(db, transaction, {
            entityId: volumeRef.id,
            entityType: "model",
            label: `AI volume batch: ${targetIds.length} targets / ${tasks.length} tasks`,
            status: "ready",
            steps: [
                { label: "Founder cost envelope checked", status: "completed", at: toIso(timestamp) },
                { label: `${initialVolumeRun.requestedPairCount} target/task pairs queued`, status: "ready", at: toIso(timestamp) },
            ],
        });
        appendAudit(db, transaction, access, "ai_volume_batch_started", "aiWorkerRun", volumeRef.id, `${targetIds.length} targets; ${tasks.length} tasks`);
        updateDailyCost(db, transaction, 4, 0);
        return { created: true, run: null };
    });
    if (!startResult.created && startResult.run) return startResult.run;

    const pairs = targetIds.flatMap((targetId) => tasks.map((task) => ({ targetId, task })));
    const childRunIds: string[] = [];
    const failureCodes: string[] = [];
    let estimatedCostUsd = 0;
    let modelCallCount = 0;
    let cursor = 0;
    const worker = async () => {
        while (cursor < pairs.length) {
            const pair = pairs[cursor];
            cursor += 1;
            try {
                const result = await runSignalDeskAiAssistServer(access, {
                    instruction: input.instruction,
                    multiPass: true,
                    targetId: pair.targetId,
                    task: pair.task,
                    volumeRunId: volumeRef.id,
                });
                childRunIds.push(result.aiRunId);
                estimatedCostUsd += numberOrZero(result.estimatedCostUsd);
                modelCallCount += nonNegativeInteger(result.modelCallCount);
            } catch (error) {
                const failureCode = signalDeskAiVolumeFailureCode(error);
                failureCodes.push(failureCode);
                logRuntimeFailure("signaldesk_ai_volume_child_failed", error, {
                    ...getBoundedRuntimeStringContext("targetId", pair.targetId),
                    product: "signaldesk",
                    task: pair.task,
                    volumeRunId: volumeRef.id,
                });
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(3, pairs.length) }, () => worker()));

    const completedPairCount = childRunIds.length;
    const failedPairCount = failureCodes.length;
    const status: SignalDeskAiVolumeRunSummary["status"] = completedPairCount === pairs.length
        ? "completed"
        : completedPairCount > 0
            ? "partial"
            : "blocked";
    const completedAt = now();
    const updates = {
        childRunIds,
        completedAt,
        completedPairCount,
        estimatedCostUsd,
        failedPairCount,
        failureCodes: Array.from(new Set(failureCodes)),
        modelCallCount,
        status,
        updatedAt: completedAt,
    };
    await db.runTransaction(async (transaction: any) => {
        const lockSnap = await transaction.get(lockRef);
        transaction.set(volumeRef, sanitizeForFirestore(updates), { merge: true });
        const lock = lockSnap.exists ? lockSnap.data() as AnyRecord : null;
        if (lock?.activeVolumeRunId === volumeRef.id) {
            transaction.set(lockRef, sanitizeForFirestore({
                activeVolumeRunId: volumeRef.id,
                expiresAt: completedAt,
                status: "completed",
                updatedAt: completedAt,
            }), { merge: true });
        }
        writeRunTimeline(db, transaction, {
            entityId: volumeRef.id,
            entityType: "model",
            label: `AI volume batch: ${targetIds.length} targets / ${tasks.length} tasks`,
            status: status === "completed" ? "completed" : status === "partial" ? "held" : "blocked",
            steps: [
                { label: "Founder cost envelope checked", status: "completed", at: toIso(timestamp) },
                { label: `${completedPairCount} pairs completed`, status: completedPairCount ? "completed" : "blocked", at: toIso(completedAt) },
                { label: `${failedPairCount} pairs failed`, status: failedPairCount ? "held" : "completed", at: toIso(completedAt) },
            ],
        });
        appendAudit(db, transaction, access, "ai_volume_batch_finished", "aiWorkerRun", volumeRef.id, status);
        updateDailyCost(db, transaction, lock?.activeVolumeRunId === volumeRef.id ? 5 : 4, 0);
    });

    return toPlain({ ...initialVolumeRun, ...updates }) as SignalDeskAiVolumeRunSummary;
}

export async function reviewSignalDeskAiShadowRunServer(
    access: SignalDeskAccessContext,
    input: AiShadowReviewInput,
) {
    if (access.role !== "founder-admin" || !access.permissions.includes("signaldesk.configure")) {
        throw new Error("Founder approval is required for AI shadow review");
    }
    if (input.decision !== "accepted" && !normalizeText(input.reason)) {
        throw new Error("AI shadow review reason is required");
    }
    const db = requireDb();
    const runRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(input.aiRunId);
    const revenueSummaryRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE);

    return db.runTransaction(async (transaction: any) => {
        const runSnap = await transaction.get(runRef);
        if (!runSnap.exists) throw new Error("AI run not found");
        const run = toPlain(runSnap.data()) as SignalDeskAiWorkerRunSummary;
        if (!String(run.workerType || "").startsWith("ai_assist_") || !run.provider || !run.modelEvalId) {
            throw new Error("Only provider-backed AI assist runs can be reviewed");
        }
        const evalRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(run.modelEvalId);
        const [evalSnap, revenueSummarySnap] = await Promise.all([
            transaction.get(evalRef),
            transaction.get(revenueSummaryRef),
        ]);
        if (!evalSnap.exists) throw new Error("AI model evaluation not found");

        const existingEval = annotateModelEvalSummary(toPlain(evalSnap.data()) as SignalDeskModelEvalSummary);
        const previousDecision = run.reviewDecision || null;
        const previousAttentionMinutes = nonNegativeInteger(run.founderAttentionMinutes);
        const nextAttentionMinutes = nonNegativeInteger(input.founderAttentionMinutes);
        const countFor = (decision: SignalDeskAiShadowReviewDecision) => Math.max(
            0,
            nonNegativeInteger({
                accepted: existingEval.acceptedCount,
                edited: existingEval.editedCount,
                rejected: existingEval.rejectedCount,
                held: existingEval.heldCount,
            }[decision]) - (previousDecision === decision ? 1 : 0) + (input.decision === decision ? 1 : 0),
        );
        const acceptedCount = countFor("accepted");
        const editedCount = countFor("edited");
        const rejectedCount = countFor("rejected");
        const heldCount = countFor("held");
        const reviewedSampleSize = acceptedCount + editedCount + rejectedCount + heldCount;
        const founderAttentionMinutes = Math.max(
            0,
            nonNegativeInteger(existingEval.founderAttentionMinutes) - previousAttentionMinutes + nextAttentionMinutes,
        );
        const timestamp = now();
        const reason = normalizeText(input.reason || (input.decision === "accepted" ? "Accepted unchanged." : ""));

        transaction.set(runRef, sanitizeForFirestore({
            reviewDecision: input.decision,
            reviewReason: reason,
            reviewedAt: timestamp,
            reviewedBy: access.userId,
            founderAttentionMinutes: nextAttentionMinutes,
        }), { merge: true });
        const evalUpdates = {
            acceptedCount,
            editedCount,
            rejectedCount,
            heldCount,
            reviewedSampleSize,
            acceptanceRate: ratio(acceptedCount, reviewedSampleSize),
            editRate: ratio(editedCount, reviewedSampleSize),
            rejectionRate: ratio(rejectedCount, reviewedSampleSize),
            holdRate: ratio(heldCount, reviewedSampleSize),
            founderAttentionMinutes,
            updatedAt: timestamp,
            updatedBy: access.userId,
        };
        transaction.set(evalRef, sanitizeForFirestore(evalUpdates), { merge: true });

        if (revenueSummarySnap.exists) {
            const revenueSummary = toPlain(revenueSummarySnap.data()) as SignalDeskRevenueControlSummary;
            transaction.set(revenueSummaryRef, sanitizeForFirestore({
                founderAttentionMinutes: Math.max(
                    0,
                    nonNegativeInteger(revenueSummary.founderAttentionMinutes) - previousAttentionMinutes + nextAttentionMinutes,
                ),
                updatedAt: timestamp,
            }), { merge: true });
        }
        appendAudit(db, transaction, access, "ai_shadow_review", "aiWorkerRun", input.aiRunId, `${input.decision}: ${reason}`);
        writeRunTimeline(db, transaction, {
            entityId: input.aiRunId,
            entityType: "model",
            label: `${run.provider}/${run.model} shadow review`,
            status: input.decision === "accepted" ? "completed" : input.decision === "rejected" ? "blocked" : "held",
            steps: [
                { label: "Founder decision recorded", status: "completed", at: toIso(timestamp) },
                { label: `Decision: ${input.decision}`, status: input.decision === "accepted" ? "completed" : input.decision === "rejected" ? "blocked" : "held", at: toIso(timestamp) },
                { label: `${nextAttentionMinutes} founder minute${nextAttentionMinutes === 1 ? "" : "s"}`, status: "completed", at: toIso(timestamp) },
            ],
        });
        updateDailyCost(db, transaction, revenueSummarySnap.exists ? 5 : 4, 0);

        return {
            run: toPlain({ ...run, reviewDecision: input.decision, reviewReason: reason, reviewedAt: timestamp, reviewedBy: access.userId, founderAttentionMinutes: nextAttentionMinutes }),
            modelEval: annotateModelEvalSummary(toPlain({ ...existingEval, ...evalUpdates }) as SignalDeskModelEvalSummary),
        };
    });
}

export async function createSignalDeskEvidenceServer(access: SignalDeskAccessContext, targetId: string) {
    const db = requireDb();
    const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const policy = await readSourcePolicy(db, target.sourcePolicyId);
    await assertSourcePolicyUsable(db, access, policy, {
        entityId: targetId,
        use: "evidence",
    });
    const policyAllowedUse = resolveAllowedUse(policy);
    if (!policyAllowedUse.evidence) throw new Error("Evidence use is not approved for this target");
    const allowedUse = ["evidence"];
    if (policyAllowedUse.personalization) allowedUse.push("draft-personalization");

    const batch = db.batch();
    const timestamp = now();
    const evidenceRef = db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKETS).doc();
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES).doc(evidenceRef.id);
    const summary = {
        evidencePacketId: evidenceRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId,
        targetName: target.displayName,
        confidence: target.sourceConfidence === "high" ? "high" : target.sourceConfidence === "blocked" ? "low" : "medium",
        allowedUse,
        rejectedFacts: target.currentListUrl ? [] : ["No current-list URL found in approved source data."],
        summary: `${target.displayName} in ${target.city || "unknown city"} appears to have ${target.primaryOpportunity.replace(/-/g, " ")}.`,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    batch.set(evidenceRef, sanitizeForFirestore({
        ...summary,
        facts: {
            category: target.category || null,
            city: target.city || null,
            currentListUrl: target.currentListUrl || null,
            website: target.website || null,
        },
    }));
    batch.set(summaryRef, sanitizeForFirestore(summary));
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId), sanitizeForFirestore({
        nextAction: "draft",
        updatedAt: timestamp,
    }), { merge: true });
    appendAudit(db, batch, access, "evidence_packet_create", "target", targetId, summary.summary);
    updateDailyCost(db, batch, 4, 0);
    await batch.commit();

    return toPlain(summary) as SignalDeskEvidencePacketSummary;
}

export async function createSignalDeskDraftServer(access: SignalDeskAccessContext, input: {
    targetId: string;
    templateId?: string;
}) {
    const db = requireDb();
    const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get();
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, target.sourcePolicyId), {
        entityId: input.targetId,
        use: "draft",
    });

    const templateId = input.templateId || "template_current_list_intro_v1";
    const templateSnap = await db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc(templateId).get();
    if (!templateSnap.exists) throw new Error("Active template is required");
    const template = toPlain(templateSnap.data()) as SignalDeskTemplateSummary;
    if (template.status !== "active") throw new Error("Template is inactive");

    const evidence = (await readRecentByTarget<SignalDeskEvidencePacketSummary>(db, SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES, input.targetId, 1))[0];
    if (!evidence) throw new Error("Evidence packet is required before draft");
    if (!Array.isArray(evidence.allowedUse) || !evidence.allowedUse.includes("draft-personalization")) {
        throw new Error("Draft personalization is not approved for this target");
    }
    if (target.suppressionStatus !== "clear" || target.nextAction === "hold" || target.segment === "reject") {
        throw new Error("Target is not draft-ready");
    }
    await requireNoPriorSpendBlock(db, target);
    const cta = await readDefaultCta(db);
    const rendered = buildDraftBody(template, target, evidence, cta);
    const batch = db.batch();
    const timestamp = now();
    const draftRef = db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc();
    const approvalRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc();
    const approvalPacketRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS).doc(`packet_${approvalRef.id}`);
    const draft = {
        draftId: draftRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: target.targetId,
        targetName: target.displayName,
        templateId,
        channel: "email",
        status: "queued",
        subject: rendered.subject,
        body: rendered.body,
        evidencePacketId: evidence?.evidencePacketId || null,
        approvalId: approvalRef.id,
        ctaId: cta?.ctaId || null,
        personalizationEvidenceIds: rendered.personalizationEvidenceIds,
        unsupportedClaims: rendered.unsupportedClaims,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };
    const approval = {
        approvalId: approvalRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: target.targetId,
        targetName: target.displayName,
        draftId: draftRef.id,
        status: "pending",
        priority: target.segment === "a" ? "high" : "normal",
        reviewReason: "Draft created from evidence packet.",
        channel: "email",
        approvalPacketId: approvalPacketRef.id,
        dueAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    const approvalPacketCore = await buildApprovalPacketSummary(db, {
        approval: toPlain(approval) as SignalDeskApprovalItem,
        cta,
        draft: toPlain(draft) as SignalDeskDraftSummary,
        evidence,
        target,
    });
    const approvalPacket = {
        approvalPacketId: approvalPacketRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        ...approvalPacketCore,
        updatedAt: timestamp,
        updatedBy: access.userId,
    };

    batch.set(draftRef, sanitizeForFirestore(draft));
    batch.set(approvalRef, sanitizeForFirestore(approval));
    batch.set(approvalPacketRef, sanitizeForFirestore(approvalPacket));
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId), sanitizeForFirestore({
        latestApprovalId: approvalRef.id,
        latestDraftId: draftRef.id,
        nextAction: "approve",
        updatedAt: timestamp,
    }), { merge: true });
    appendAudit(db, batch, access, "draft_create", "draft", draftRef.id, target.displayName);
    writeRunTimeline(db, batch, {
        entityId: approvalPacketRef.id,
        entityType: "approval",
        label: "Draft approval packet",
        status: approvalPacketCore.recommendedAction === "approve" ? "ready" : "held",
        steps: [
            { label: "Evidence-bound personalization", status: "completed", at: toIso(timestamp) },
            { label: "CTA attached", status: cta ? "completed" : "held", at: toIso(timestamp) },
            { label: "Sender domain checked", status: approvalPacketCore.channelReadiness === "ready" ? "completed" : "held", at: toIso(timestamp) },
        ],
    });
    updateQueueSummary(db, batch, { approvalBacklog: increment(1), humanReview: increment(1) });
    updateDailyCost(db, batch, 7, 0);
    await batch.commit();

    return {
        approval: toPlain(approval) as SignalDeskApprovalItem,
        approvalPacket: toPlain(approvalPacket) as SignalDeskApprovalPacketSummary,
        draft: toPlain(draft) as SignalDeskDraftSummary,
    };
}

export async function reviewSignalDeskApprovalServer(access: SignalDeskAccessContext, input: {
    approvalId: string;
    reason?: string;
    rejectionReason?: SignalDeskApprovalRejectionReason;
    status: "approved" | "rejected";
}) {
    const reviewNote = normalizeText(input.reason);
    if (input.status === "rejected") {
        if (!input.rejectionReason || !APPROVAL_REJECTION_REASONS.has(input.rejectionReason)) {
            throw new Error("Approval rejection reason is required");
        }
        if (input.rejectionReason === "other" && !reviewNote) {
            throw new Error("Approval rejection note is required for other");
        }
    }
    const db = requireDb();
    const approvalRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(input.approvalId);
    const approvalSnap = await approvalRef.get();
    if (!approvalSnap.exists) throw new Error("Approval not found");
    const approval = toPlain(approvalSnap.data()) as SignalDeskApprovalItem;
    if (approval.status !== "pending") throw new Error("Approval is not pending");
    const draftSnap = approval.draftId
        ? await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(approval.draftId).get()
        : null;
    const draft = draftSnap?.exists ? toPlain(draftSnap.data()) as SignalDeskDraftSummary : null;
    if (input.status === "approved" && draft?.unsupportedClaims?.length) {
        const batch = db.batch();
        appendAudit(db, batch, access, "approval_block", "approval", input.approvalId, "Draft has unsupported claims");
        await batch.commit();
        throw new Error("Draft has unsupported claims");
    }
    if (input.status === "approved") {
        const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(approval.targetId).get();
        const target = targetSnap.exists ? toPlain(targetSnap.data()) as SignalDeskTargetSummary : null;
        await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, target?.sourcePolicyId), {
            entityId: approval.targetId,
            use: "approval",
        });
    }

    const rejectionProjection = input.status === "rejected"
        ? input.rejectionReason === "evidence-weak-or-stale"
            ? { nextAction: "evidence" as const, status: "review" as const }
            : input.rejectionReason === "identity-uncertain"
                ? { nextAction: "enrich" as const, status: "review" as const }
                : input.rejectionReason === "contact-route-not-allowed" || input.rejectionReason === "other"
                    ? { nextAction: "hold" as const, status: "held" as const }
                    : { nextAction: "reject" as const, status: "rejected" as const }
        : null;
    const transactionResult = await db.runTransaction(async (transaction: any) => {
        const currentApprovalSnap = await transaction.get(approvalRef);
        if (!currentApprovalSnap.exists) throw new Error("Approval not found");
        const currentApproval = toPlain(currentApprovalSnap.data()) as SignalDeskApprovalItem;
        if (currentApproval.status !== "pending") throw new Error("Approval is not pending");
        const currentDraftSnap = currentApproval.draftId
            ? await transaction.get(db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(currentApproval.draftId))
            : null;
        const currentDraft = currentDraftSnap?.exists
            ? toPlain(currentDraftSnap.data()) as SignalDeskDraftSummary
            : null;
        if (input.status === "approved" && currentDraft?.unsupportedClaims?.length) {
            appendAudit(db, transaction, access, "approval_block", "approval", input.approvalId, "Draft has unsupported claims");
            return { blockedByUnsupportedClaims: true };
        }

        const timestamp = now();
        const reviewReason = input.status === "rejected"
            ? [input.rejectionReason, reviewNote].filter(Boolean).join(": ")
            : reviewNote || currentApproval.reviewReason;
        transaction.set(approvalRef, sanitizeForFirestore({
            rejectionReason: input.status === "rejected" ? input.rejectionReason : null,
            status: input.status,
            reviewReason,
            reviewedAt: timestamp,
            reviewedBy: access.userId,
            updatedAt: timestamp,
        }), { merge: true });
        if (currentApproval.draftId) {
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(currentApproval.draftId), sanitizeForFirestore({
                status: input.status,
                updatedAt: timestamp,
            }), { merge: true });
        }
        transaction.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(currentApproval.targetId), sanitizeForFirestore({
            nextAction: input.status === "approved" ? "export" : rejectionProjection?.nextAction,
            ...(rejectionProjection ? { status: rejectionProjection.status } : {}),
            updatedAt: timestamp,
        }), { merge: true });
        if (currentApproval.approvalPacketId) {
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS).doc(currentApproval.approvalPacketId), sanitizeForFirestore({
                status: input.status,
                recommendedAction: input.status === "approved" ? "approve" : "reject",
                updatedAt: timestamp,
                updatedBy: access.userId,
            }), { merge: true });
        }
        appendAudit(db, transaction, access, `draft_${input.status}`, "approval", input.approvalId, reviewReason);
        updateQueueSummary(db, transaction, { approvalBacklog: increment(-1), humanReview: increment(-1) });
        updateDailyCost(db, transaction, 4, 0);
        return { blockedByUnsupportedClaims: false };
    });
    if (transactionResult.blockedByUnsupportedClaims) throw new Error("Draft has unsupported claims");

    return {
        approvalId: input.approvalId,
        rejectionReason: input.status === "rejected" ? input.rejectionReason : null,
        status: input.status,
    };
}

const loadApprovedMessageContext = async (
    db: any,
    access: SignalDeskAccessContext,
    approvalId: string,
    channel: Exclude<SignalDeskOutboundChannel, "manual">,
) => {
    const approvalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(approvalId).get();
    if (!approvalSnap.exists) throw new Error("Approval not found");
    const approval = toPlain(approvalSnap.data()) as SignalDeskApprovalItem;
    if (approval.status !== "approved") throw new Error("Approval must be approved before export");

    const [targetSnap, targetDetailSnap, draftSnap, globalPauseSnap, channelPauseSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(approval.targetId).get(),
        db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(approval.targetId).get(),
        approval.draftId ? db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(approval.draftId).get() : null,
        db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_global-outbound").get(),
        db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${channel}`).get(),
    ]);
    if (!targetSnap.exists) throw new Error("Target not found");
    if (!draftSnap || !draftSnap.exists) throw new Error("Draft is required before export");

    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const targetDetail = toPlain(targetDetailSnap.data() || {}) as AnyRecord;
    const draft = toPlain(draftSnap.data()) as SignalDeskDraftSummary;
    const policy = await readSourcePolicy(db, target.sourcePolicyId);
    await assertSourcePolicyUsable(db, access, policy, {
        entityId: approvalId,
        use: channel === "email" ? "export" : "handoff",
    });
    const policyAllowedUse = resolveAllowedUse(policy);
    if (globalPauseSnap.data()?.status === "active" || channelPauseSnap.data()?.status === "active") {
        throw new Error("Outbound export is paused");
    }
    if (target.suppressionStatus !== "clear") throw new Error("Target is suppressed");
    if (!policyAllowedUse.contact) throw new Error("Contact use is not approved for this target");
    if (draft.status !== "approved") throw new Error("Draft must be approved before export");
    if (!draft.evidencePacketId) throw new Error("Evidence packet is required before draft");
    await requireNoPriorSpendBlock(db, target);
    return { approval, draft, target, targetDetail };
};

const getRecipientForChannel = (targetDetail: AnyRecord, channel: Exclude<SignalDeskOutboundChannel, "manual">) => {
    if (channel === "email") return normalizeLower(targetDetail.email);
    if (channel === "whatsapp") return normalizeText(targetDetail.phone).replace(/[^\d+]/g, "");
    if (channel === "instagram") return normalizeLower(targetDetail.instagram || targetDetail.instagramRecipientId).replace(/^@/, "");
    if (channel === "messenger") return normalizeText(targetDetail.messengerRecipientId || targetDetail.messengerPsid);
    return "";
};

const readEligibleChannelWindow = async (
    db: any,
    channel: Exclude<SignalDeskOutboundChannel, "manual" | "email">,
    targetId: string,
): Promise<SignalDeskChannelWindowStateSummary | null> => {
    const [targetWindowSnap, globalWindowSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES).doc(channelWindowIdFor(channel, targetId)).get(),
        db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES).doc(channelWindowIdFor(channel)).get(),
    ]);
    const targetWindow = targetWindowSnap.exists ? toPlain(targetWindowSnap.data()) as SignalDeskChannelWindowStateSummary : null;
    if (isChannelWindowEligible(targetWindow)) return targetWindow;
    const globalWindow = globalWindowSnap.exists ? toPlain(globalWindowSnap.data()) as SignalDeskChannelWindowStateSummary : null;
    return isChannelWindowEligible(globalWindow) ? globalWindow : null;
};

const requireChannelWindowForAssistedChannel = async (
    db: any,
    channel: Exclude<SignalDeskOutboundChannel, "manual">,
    targetId: string,
) => {
    if (channel === "email") return null;
    const windowState = await readEligibleChannelWindow(db, channel, targetId);
    if (!windowState) throw new Error("Channel window is not ready");
    return windowState;
};

const getSuppressionIdentityForReply = (
    targetDetail: AnyRecord,
    channel: SignalDeskConversationSummary["channel"],
    targetId: string,
) => {
    const email = normalizeLower(targetDetail.email);
    const phone = normalizeText(targetDetail.phone).replace(/[^\d+]/g, "");
    const instagram = normalizeLower(targetDetail.instagram || targetDetail.instagramRecipientId).replace(/^@/, "");
    const messenger = normalizeText(targetDetail.messengerRecipientId || targetDetail.messengerPsid);
    const fallback = `${channel}_${hashValue(targetId)}`;

    if (channel === "email" && email) return { identityHash: hashValue(email), suppressionId: `email_${hashValue(email)}` };
    if (channel === "whatsapp" && phone) return { identityHash: hashValue(phone), suppressionId: `phone_${hashValue(phone)}` };
    if (channel === "instagram" && instagram) return { identityHash: hashValue(instagram), suppressionId: `instagram_${hashValue(instagram)}` };
    if (channel === "messenger" && messenger) return { identityHash: hashValue(messenger), suppressionId: `messenger_${hashValue(messenger)}` };
    return { identityHash: hashValue(targetId), suppressionId: fallback };
};

const writeChannelDeliveryState = (params: {
    access: SignalDeskAccessContext;
    approval: SignalDeskApprovalItem;
    batch: any;
    channel: Exclude<SignalDeskOutboundChannel, "manual">;
    db: any;
    draft: SignalDeskDraftSummary;
    providerMessageId?: string | null;
    providerName: string;
    status: "exported" | "sent";
    target: SignalDeskTargetSummary;
}) => {
    const timestamp = now();
    const exportRef = params.db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS).doc();
    const conversationRef = params.db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(params.target.latestConversationId || `conv_${params.approval.targetId}`);
    params.batch.set(exportRef, sanitizeForFirestore({
        exportId: exportRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        approvalId: params.approval.approvalId,
        draftId: params.approval.draftId || null,
        targetId: params.approval.targetId,
        targetName: params.approval.targetName,
        channel: params.channel,
        subject: params.draft.subject,
        body: params.draft.body,
        provider: params.providerName,
        providerMessageId: params.providerMessageId || null,
        status: params.status,
        createdAt: timestamp,
        createdBy: params.access.userId,
    }));
    params.batch.set(conversationRef, sanitizeForFirestore({
        conversationId: conversationRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: params.approval.targetId,
        targetName: params.approval.targetName,
        channel: params.channel,
        state: params.status === "sent" ? "contacted" : "exported",
        lastMessagePreview: params.draft.subject,
        ...(params.status === "sent" ? { lastOutboundAt: timestamp } : {}),
        updatedAt: timestamp,
    }), { merge: true });
    params.batch.set(params.db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(params.approval.approvalId), sanitizeForFirestore({
        status: params.status,
        updatedAt: timestamp,
    }), { merge: true });
    if (params.approval.draftId) {
        params.batch.set(params.db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(params.approval.draftId), sanitizeForFirestore({
            status: params.status,
            updatedAt: timestamp,
        }), { merge: true });
    }
    params.batch.set(params.db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(params.approval.targetId), sanitizeForFirestore({
        latestConversationId: conversationRef.id,
        nextAction: params.status === "sent" ? "reply" : "contact",
        status: params.status === "sent" ? "contacted" : params.target.status,
        updatedAt: timestamp,
    }), { merge: true });
    params.batch.set(params.db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc(params.channel), sanitizeForFirestore({
        channel: params.channel,
        configured: params.status === "sent",
        lastEventAt: timestamp,
        status: params.status === "sent" ? "healthy" : "warning",
        updatedAt: timestamp,
    }), { merge: true });
    appendAudit(params.db, params.batch, params.access, params.status === "sent" ? "message_send" : "channel_handoff", "messageExport", exportRef.id, params.approval.targetName);
    return exportRef.id;
};

export async function prepareSignalDeskChannelHandoffServer(access: SignalDeskAccessContext, input: ChannelActionInput) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_ASSISTED_CHANNELS) {
        throw new Error("SignalDesk assisted channels are disabled");
    }
    const db = requireDb();
    const { approval, draft, target, targetDetail } = await loadApprovedMessageContext(db, access, input.approvalId, input.channel);
    const recipient = getRecipientForChannel(targetDetail, input.channel);
    if (!recipient) throw new Error("Channel recipient is not configured");
    if (input.channel === "email" && target.contactability !== "ready") throw new Error("Target contact is not export-ready");
    if (input.channel === "email" && !isSenderDomainReady(await readReadySenderDomain(db))) {
        throw new Error("Sender domain is not ready");
    }
    await requireChannelWindowForAssistedChannel(db, input.channel, target.targetId);

    const batch = db.batch();
    const exportId = writeChannelDeliveryState({
        access,
        approval,
        batch,
        channel: input.channel,
        db,
        draft,
        providerName: "assisted-handoff",
        status: "exported",
        target,
    });
    updateDailyCost(db, batch, 7, 0, 0);
    await batch.commit();
    return { channel: input.channel, exportId, recipient, status: "handoff_ready" };
}

export async function sendSignalDeskApprovedMessageServer(access: SignalDeskAccessContext, input: ChannelActionInput) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND) {
        throw new Error("SignalDesk provider send is disabled");
    }
    const db = requireDb();
    const { approval, draft, target, targetDetail } = await loadApprovedMessageContext(db, access, input.approvalId, input.channel);
    const recipient = getRecipientForChannel(targetDetail, input.channel);
    if (!recipient) throw new Error("Channel recipient is not configured");
    if (input.channel === "email" && target.contactability !== "ready") throw new Error("Target contact is not export-ready");
    if (input.channel === "email" && !isSenderDomainReady(await readReadySenderDomain(db))) {
        throw new Error("Sender domain is not ready");
    }
    await requireChannelWindowForAssistedChannel(db, input.channel, target.targetId);

    const readiness = getSignalDeskChannelReadiness()[input.channel];
    if (!readiness?.configured) throw new Error("Channel provider is not configured");

    const providerResult = await sendSignalDeskProviderMessage({
        body: draft.body,
        channel: input.channel,
        recipient,
        subject: draft.subject,
    });
    const batch = db.batch();
    const exportId = writeChannelDeliveryState({
        access,
        approval,
        batch,
        channel: input.channel,
        db,
        draft,
        providerMessageId: providerResult.providerMessageId,
        providerName: providerResult.provider,
        status: "sent",
        target,
    });
    updateDailyCost(db, batch, 8, 0, 0.01);
    await batch.commit();
    return { channel: input.channel, exportId, providerMessageId: providerResult.providerMessageId || null, status: "sent" };
}

export async function exportSignalDeskMessageServer(access: SignalDeskAccessContext, approvalId: string) {
    const db = requireDb();
    const approvalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(approvalId).get();
    if (!approvalSnap.exists) throw new Error("Approval not found");
    const approval = toPlain(approvalSnap.data()) as SignalDeskApprovalItem;
    if (approval.status !== "approved") throw new Error("Approval must be approved before export");

    const [targetSnap, draftSnap, globalPauseSnap, emailPauseSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(approval.targetId).get(),
        approval.draftId ? db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(approval.draftId).get() : null,
        db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_global-outbound").get(),
        db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_email").get(),
    ]);
    if (!targetSnap.exists) throw new Error("Target not found");
    if (!draftSnap || !draftSnap.exists) throw new Error("Draft is required before export");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const draft = toPlain(draftSnap.data()) as SignalDeskDraftSummary;
    const policy = await readSourcePolicy(db, target.sourcePolicyId);
    await assertSourcePolicyUsable(db, access, policy, {
        entityId: approvalId,
        use: "export",
    });
    const policyAllowedUse = resolveAllowedUse(policy);
    if (globalPauseSnap.data()?.status === "active" || emailPauseSnap.data()?.status === "active") {
        throw new Error("Outbound export is paused");
    }
    if (target.suppressionStatus !== "clear") throw new Error("Target is suppressed");
    if (!policyAllowedUse.contact) throw new Error("Contact use is not approved for this target");
    if (target.contactability !== "ready") throw new Error("Target contact is not export-ready");
    if (draft.status !== "approved") throw new Error("Draft must be approved before export");
    if (!draft.evidencePacketId) throw new Error("Evidence packet is required before draft");
    if (!isSenderDomainReady(await readReadySenderDomain(db))) throw new Error("Sender domain is not ready");
    await requireNoPriorSpendBlock(db, target);

    const batch = db.batch();
    const timestamp = now();
    const exportRef = db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS).doc();
    const conversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(target.latestConversationId || `conv_${approval.targetId}`);
    const exportData = {
        exportId: exportRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        approvalId,
        draftId: approval.draftId || null,
        targetId: approval.targetId,
        targetName: approval.targetName,
        channel: "email",
        subject: draft.subject,
        body: draft.body,
        status: "exported",
        createdAt: timestamp,
        createdBy: access.userId,
    };
    batch.set(exportRef, sanitizeForFirestore(exportData));
    batch.set(conversationRef, sanitizeForFirestore({
        conversationId: conversationRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: approval.targetId,
        targetName: approval.targetName,
        channel: "email",
        state: "exported",
        lastMessagePreview: draft.subject,
        updatedAt: timestamp,
    }), { merge: true });
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(approvalId), sanitizeForFirestore({
        status: "exported",
        updatedAt: timestamp,
    }), { merge: true });
    if (approval.draftId) {
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(approval.draftId), sanitizeForFirestore({
            status: "exported",
            updatedAt: timestamp,
        }), { merge: true });
    }
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(approval.targetId), sanitizeForFirestore({
        latestConversationId: conversationRef.id,
        nextAction: "contact",
        status: target.status,
        updatedAt: timestamp,
    }), { merge: true });
    appendAudit(db, batch, access, "message_export", "messageExport", exportRef.id, approval.targetName);
    updateDailyCost(db, batch, 7, 0);
    await batch.commit();

    return toPlain(exportData);
}

export async function recordSignalDeskManualContactServer(access: SignalDeskAccessContext, input: ManualContactInput) {
    const occurredAtMillis = new Date(input.occurredAt).getTime();
    const currentMillis = Date.now();
    if (!Number.isFinite(occurredAtMillis)
        || occurredAtMillis > currentMillis + MANUAL_CONTACT_FUTURE_SKEW_MS
        || occurredAtMillis < currentMillis - MANUAL_CONTACT_MAX_AGE_MS) {
        throw new Error("Manual contact timestamp is invalid");
    }
    if (input.result === "introduced" && input.route !== "partner-intro") {
        throw new Error("Manual contact result does not match route");
    }

    const db = requireDb();
    const note = normalizeText(input.note);
    const idempotencyHash = hashValue(`${access.userId}:${input.targetId}:${input.idempotencyKey}`);
    const requestFingerprintHash = hashValue(JSON.stringify({
        note,
        occurredAt: new Date(occurredAtMillis).toISOString(),
        result: input.result,
        route: input.route,
        sourcePolicyId: input.sourcePolicyId,
        targetId: input.targetId,
    }));
    const timelineRef = db.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES).doc(`manual_contact_${idempotencyHash.slice(0, 32)}`);
    const existingTimelineSnap = await timelineRef.get();
    if (existingTimelineSnap.exists) {
        if (existingTimelineSnap.data()?.requestFingerprintHash !== requestFingerprintHash) {
            throw new Error("Manual contact idempotency conflict");
        }
        return {
            duplicate: true,
            manualContactId: timelineRef.id,
            result: input.result,
            route: input.route,
            targetId: input.targetId,
        };
    }
    const [targetSnap, targetDetailSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get(),
        db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(input.targetId).get(),
    ]);
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const targetDetail = toPlain(targetDetailSnap.data() || {}) as AnyRecord;
    if (target.sourcePolicyId !== input.sourcePolicyId) throw new Error("Manual contact source policy changed");
    if (target.suppressionStatus !== "clear") throw new Error("Target is suppressed");
    if (target.status === "rejected" || target.status === "converted") throw new Error("Target is not eligible for manual contact");

    const policy = await assertSourcePolicyUsable(db, access, await readSourcePolicy(db, target.sourcePolicyId), {
        entityId: input.targetId,
        use: "contact",
    }) as SignalDeskSourcePolicy;
    await requireNoActiveKillSwitch(db, "global-outbound", "Outbound contact is paused");
    if (input.route === "email-export") await requireNoActiveKillSwitch(db, "email", "Outbound contact is paused");
    if (input.route === "partner-intro") await requireNoActiveKillSwitch(db, "trust-partner", "Outbound contact is paused");

    const allowedRoutes = new Set<SignalDeskManualContactRoute>();
    if (target.contactability === "ready") allowedRoutes.add("email-export");
    if (policy.accessMethod === "permissioned-referral") allowedRoutes.add("partner-intro");
    if (!allowedRoutes.has(input.route)) throw new Error("Manual contact route is not allowed");

    if (input.route === "email-export") {
        const conversationSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES)
            .doc(target.latestConversationId || `conv_${input.targetId}`)
            .get();
        const conversation = conversationSnap.exists
            ? toPlain(conversationSnap.data()) as SignalDeskConversationSummary
            : null;
        if (conversation?.state !== "exported") throw new Error("Prepared email export is required");
        const exportSnap = await db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS)
            .where("targetId", "==", input.targetId)
            .limit(20)
            .get();
        const preparedExport = exportSnap.docs.some((doc: any) => {
            const data = doc.data() as AnyRecord;
            const preparedAt = toTimestampMillis(data.createdAt);
            return data.status === "exported" && Boolean(
                preparedAt
                && preparedAt <= occurredAtMillis
                && preparedAt >= currentMillis - MANUAL_CONTACT_MAX_AGE_MS
            );
        });
        if (!preparedExport) throw new Error("Prepared email export is required");
    }

    const conversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(target.latestConversationId || `conv_${input.targetId}`);
    const occurredAt = admin.firestore.Timestamp.fromDate(new Date(occurredAtMillis));
    const timestamp = now();
    const channel: SignalDeskConversationSummary["channel"] = input.route === "email-export" ? "email" : "manual";
    const conversationState: SignalDeskConversationSummary["state"] = input.result === "wrong-contact"
        ? "wrong_contact"
        : input.result === "declined"
            ? "not_interested"
            : "contacted";
    const nextAction: SignalDeskNextAction = input.result === "contacted" || input.result === "introduced"
        ? "reply"
        : input.result === "declined"
            ? "reject"
            : "hold";
    const nextStatus: SignalDeskTargetSummary["status"] = input.result === "wrong-contact" || input.result === "declined"
        ? "rejected"
        : "contacted";
    const eventSummary = `${input.route}:${input.result}`;

    const batch = db.batch();
    batch.create(timelineRef, sanitizeForFirestore({
        runTimelineId: timelineRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        entityType: "target",
        entityId: input.targetId,
        idempotencyKeyHash: idempotencyHash,
        requestFingerprintHash,
        label: "Manual contact attempt",
        result: input.result,
        route: input.route,
        status: input.result === "wrong-contact" || input.result === "declined" ? "held" : "completed",
        steps: [
            { label: `Policy-approved route: ${input.route}`, status: "completed", at: toIso(occurredAt) },
            { label: `Founder-recorded result: ${input.result}`, status: input.result === "wrong-contact" ? "blocked" : "completed", at: toIso(occurredAt) },
        ],
        sourcePolicyId: input.sourcePolicyId,
        updatedAt: timestamp,
    }));
    batch.set(conversationRef, sanitizeForFirestore({
        conversationId: conversationRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: input.targetId,
        targetName: target.displayName,
        channel,
        state: conversationState,
        lastMessagePreview: `Manual contact: ${input.result} via ${input.route}`,
        lastOutboundAt: occurredAt,
        updatedAt: timestamp,
    }), { merge: true });
    batch.set(targetSnap.ref, sanitizeForFirestore({
        ...(input.result === "wrong-contact" ? {
            contactability: "blocked",
            suppressionStatus: "wrong-contact",
        } : {}),
        latestConversationId: conversationRef.id,
        latestManualContactAt: occurredAt,
        latestManualContactResult: input.result,
        latestManualContactRoute: input.route,
        nextAction,
        status: nextStatus,
        updatedAt: timestamp,
    }), { merge: true });
    if (input.result === "wrong-contact") {
        const suppressionIdentity = getSuppressionIdentityForReply(targetDetail, channel, input.targetId);
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(suppressionIdentity.suppressionId), sanitizeForFirestore({
            suppressionId: suppressionIdentity.suppressionId,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId: input.targetId,
            identityHash: suppressionIdentity.identityHash,
            channel,
            reason: "wrong-contact",
            source: "manual-contact",
            createdAt: timestamp,
        }), { merge: true });
    }
    appendAudit(db, batch, access, "manual_contact_record", "target", input.targetId, [eventSummary, note].filter(Boolean).join(": "));
    updateDailyCost(db, batch, input.result === "wrong-contact" ? 6 : 5, 0);

    try {
        await batch.commit();
    } catch (error) {
        if (!isAlreadyExistsError(error)) throw error;
        const concurrentTimelineSnap = await timelineRef.get();
        if (!concurrentTimelineSnap.exists || concurrentTimelineSnap.data()?.requestFingerprintHash !== requestFingerprintHash) {
            throw new Error("Manual contact idempotency conflict");
        }
        return {
            duplicate: true,
            manualContactId: timelineRef.id,
            result: input.result,
            route: input.route,
            targetId: input.targetId,
        };
    }

    return {
        duplicate: false,
        manualContactId: timelineRef.id,
        result: input.result,
        route: input.route,
        targetId: input.targetId,
    };
}

export async function captureSignalDeskReplyServer(access: SignalDeskAccessContext, input: {
    channel: SignalDeskConversationSummary["channel"];
    message: string;
    targetId: string;
}) {
    const db = requireDb();
    const [targetSnap, targetDetailSnap] = await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get(),
        db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(input.targetId).get(),
    ]);
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    const targetDetail = toPlain(targetDetailSnap.data() || {}) as AnyRecord;
    const state = classifyReply(input.message);
    const batch = db.batch();
    const timestamp = now();
    const conversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(target.latestConversationId || `conv_${input.targetId}`);
    const messageRef = db.collection(SIGNALDESK_COLLECTIONS.MESSAGES).doc();
    const classificationRef = db.collection(SIGNALDESK_COLLECTIONS.REPLY_CLASSIFICATIONS).doc();

    batch.set(conversationRef, sanitizeForFirestore({
        conversationId: conversationRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: input.targetId,
        targetName: target.displayName,
        channel: input.channel,
        state,
        lastMessagePreview: input.message.slice(0, 180),
        lastInboundAt: timestamp,
        updatedAt: timestamp,
    }), { merge: true });
    batch.set(messageRef, sanitizeForFirestore({
        messageId: messageRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        conversationId: conversationRef.id,
        targetId: input.targetId,
        direction: "inbound",
        body: input.message,
        channel: input.channel,
        createdAt: timestamp,
    }));
    batch.set(classificationRef, sanitizeForFirestore({
        classificationId: classificationRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        conversationId: conversationRef.id,
        targetId: input.targetId,
        state,
        confidence: state === "needs_review" ? "low" : "high",
        classifierVersion: "rules-v1",
        createdAt: timestamp,
    }));
    const requiresSuppression = state === "dnc"
        || state === "wrong_contact"
        || state === "complaint"
        || state === "privacy_request"
        || state === "legal_request";
    if (requiresSuppression) {
        const suppressionIdentity = getSuppressionIdentityForReply(targetDetail, input.channel, input.targetId);
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(suppressionIdentity.suppressionId), sanitizeForFirestore({
            suppressionId: suppressionIdentity.suppressionId,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId: input.targetId,
            identityHash: suppressionIdentity.identityHash,
            channel: input.channel,
            reason: state === "dnc" ? "dnc" : state === "wrong_contact" ? "wrong-contact" : state,
            source: "inbound",
            createdAt: timestamp,
        }), { merge: true });
    }
    const requiresIncidentPause = state === "complaint" || state === "privacy_request" || state === "legal_request";
    if (requiresIncidentPause) {
        const incidentRef = db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc();
        const pauseScope = input.channel === "manual" ? "global-outbound" : input.channel;
        batch.set(incidentRef, sanitizeForFirestore({
            incidentId: incidentRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            severity: state === "complaint" ? "high" : "critical",
            status: "open",
            title: `${state.replace(/_/g, " ")} requires founder review`,
            targetId: input.targetId,
            channel: input.channel,
            createdAt: timestamp,
            updatedAt: timestamp,
        }));
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${pauseScope}`), sanitizeForFirestore({
            killSwitchId: `scope_${pauseScope}`,
            pId: SIGNALDESK_PRODUCT_CODE,
            scope: pauseScope,
            status: "active",
            reason: `${state} received; outbound paused pending founder review.`,
            activatedAt: timestamp,
            activatedBy: access.userId,
            updatedAt: timestamp,
        }), { merge: true });
        appendAudit(db, batch, access, "reply_incident_pause", "conversation", conversationRef.id, `${state}:${pauseScope}`);
        updateControlSummary(db, batch, { incidentCount: increment(1), safetyStatus: "blocked" });
    }
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId), sanitizeForFirestore({
        latestConversationId: conversationRef.id,
        nextAction: target.status === "converted" || state === "interested" ? "outcome" : state === "needs_review" || requiresIncidentPause ? "review" : "hold",
        ownerQualifiedAt: state === "interested" ? target.ownerQualifiedAt || timestamp : target.ownerQualifiedAt || null,
        status: target.status === "converted" ? "converted" : "replied",
        suppressionStatus: state === "dnc"
            ? "suppressed"
            : state === "wrong_contact"
                ? "wrong-contact"
                : requiresIncidentPause
                    ? "complaint"
                    : target.suppressionStatus,
        updatedAt: timestamp,
    }), { merge: true });
    appendAudit(db, batch, access, "reply_capture", "conversation", conversationRef.id, state);
    updateQueueSummary(db, batch, { inboxBacklog: state === "needs_review" || state === "interested" || requiresIncidentPause ? increment(1) : increment(0) });
    updateDailyCost(db, batch, requiresIncidentPause ? 11 : 7, 0);
    await batch.commit();

    let revenueSyncStatus: "not-applicable" | "updated" | "pending" = "not-applicable";
    if (state === "interested" && FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER) {
        try {
            await qualifySignalDeskRevenueAccountServer(access, {
                locationType: "single-location",
                targetId: input.targetId,
            });
            revenueSyncStatus = "updated";
        } catch (error) {
            revenueSyncStatus = "pending";
            logRuntimeFailure(SIGNALDESK_INTERESTED_REPLY_REVENUE_SYNC_FAILED, error, {
                channel: input.channel,
                product: "signaldesk",
                targetIdPresent: true,
            });
        }
    }

    return { conversationId: conversationRef.id, revenueSyncStatus, state };
}

export async function createSignalDeskRouteTokenServer(access: SignalDeskAccessContext, input: RouteTokenInput) {
    const db = requireDb();
    await requireNoActiveKillSwitch(db, "menu-list-bridge", "MenuList outcome bridge is paused");
    const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId).get();
    if (!targetSnap.exists) throw new Error("Target not found");
    const target = toPlain(targetSnap.data()) as SignalDeskTargetSummary;
    if (target.suppressionStatus !== "clear") throw new Error("Target is suppressed");
    const policy = await readSourcePolicy(db, target.sourcePolicyId);
    await assertSourcePolicyUsable(db, access, policy, { entityId: input.targetId, use: "evidence" });
    const conversationSnap = target.latestConversationId
        ? await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(target.latestConversationId).get()
        : null;
    const conversation = conversationSnap?.exists
        ? toPlain(conversationSnap.data()) as SignalDeskConversationSummary
        : null;
    if (!conversation || conversation.state !== "interested") {
        throw new Error("OWNER_QUALIFIED_INTENT_REQUIRED");
    }
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashValue(token);
    const routeTokenId = `route_${tokenHash.slice(0, 32)}`;
    const timestamp = now();
    const expiresAt = timestampAfterDays(14);
    const routeToken = {
        routeTokenId,
        pId: SIGNALDESK_PRODUCT_CODE,
        tokenHash,
        scope: SIGNALDESK_OUTCOME_ROUTE_SCOPE,
        targetId: target.targetId,
        targetName: target.displayName,
        sourcePolicyId: target.sourcePolicyId || null,
        sourceRunId: target.sourceRunId || null,
        channel: input.channel,
        templateId: input.templateId || null,
        ctaId: input.ctaId || null,
        sourceActionId: normalizeText(input.actionId) || input.ctaId || input.templateId || conversation.conversationId,
        status: "active",
        ownerQualifiedAt: target.ownerQualifiedAt || conversation.lastInboundAt || timestamp,
        expiresAt,
        revokedAt: null,
        revokedBy: null,
        createdAt: timestamp,
        createdBy: access.userId,
        updatedAt: timestamp,
    };
    const batch = db.batch();
    batch.set(db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(routeTokenId), sanitizeForFirestore(routeToken));
    appendAudit(db, batch, access, "route_token_create", "routeToken", routeTokenId, `${input.targetId}:${input.channel}`);
    updateDailyCost(db, batch, 2, 0);
    await batch.commit();
    return {
        channel: input.channel,
        expiresAt: toIso(expiresAt),
        routeTokenId,
        targetId: input.targetId,
        token,
    };
}

export async function revokeSignalDeskRouteTokenServer(
    access: SignalDeskAccessContext,
    input: RouteTokenRevocationInput,
) {
    const db = requireDb();
    const routeTokenRef = db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(input.routeTokenId);
    return db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const routeTokenSnap = await transaction.get(routeTokenRef);
        if (!routeTokenSnap.exists) throw new Error("Route token not found");
        const routeToken = toPlain(routeTokenSnap.data()) as AnyRecord;
        if (routeToken.status === "revoked" || routeToken.revokedAt) {
            return {
                duplicate: true,
                routeTokenId: input.routeTokenId,
                status: "revoked" as const,
            };
        }
        const timestamp = now();
        transaction.set(routeTokenRef, sanitizeForFirestore({
            revocationReason: input.reason,
            revokedAt: timestamp,
            revokedBy: access.userId,
            status: "revoked",
            updatedAt: timestamp,
        }), { merge: true });
        appendAudit(db, transaction, access, "route_token_revoke", "routeToken", input.routeTokenId, input.reason);
        updateDailyCost(db, transaction, 2, 0);
        return {
            duplicate: false,
            routeTokenId: input.routeTokenId,
            status: "revoked" as const,
        };
    });
}

export async function recordSignalDeskOutcomeServer(access: SignalDeskAccessContext, input: OutcomeInput) {
    const db = requireDb();
    const surfaces = Array.from(new Set(input.surfaces || []));
    const isActivation = input.outcomeType === "two_surface_activation";
    if (isActivation && !input.targetId) throw new Error("Activation target is required");
    if (isActivation && !normalizeText(input.idempotencyKey)) throw new Error("OUTCOME_IDEMPOTENCY_KEY_REQUIRED");
    if (isActivation && !normalizeText(input.evidenceRef)) throw new Error("ACTIVATION_EVIDENCE_REQUIRED");
    if (isActivation && surfaces.length < 2) throw new Error("ACTIVATION_TWO_DISTINCT_SURFACES_REQUIRED");
    const ownerQualifiedMillis = toTimestampMillis(input.ownerQualifiedAt);
    const ownerReviewedMillis = toTimestampMillis(input.ownerReviewedAt);
    const maximumAcceptedTimestamp = Date.now() + (5 * 60 * 1000);
    if ((ownerQualifiedMillis && ownerQualifiedMillis > maximumAcceptedTimestamp) || (ownerReviewedMillis && ownerReviewedMillis > maximumAcceptedTimestamp)) {
        throw new Error("OUTCOME_TIMESTAMP_INVALID");
    }
    if (isActivation && (!ownerQualifiedMillis || !ownerReviewedMillis)) throw new Error("ACTIVATION_OWNER_REVIEW_REQUIRED");
    if (isActivation && ownerReviewedMillis! < ownerQualifiedMillis!) throw new Error("ACTIVATION_OWNER_REVIEW_REQUIRED");
    if (input.source === "route-token" && input.integrityStatus !== "menulist-signed") {
        throw new Error("OUTCOME_BRIDGE_SIGNATURE_REQUIRED");
    }
    if (input.source === "route-token" && !input.routeTokenValidation) throw new Error("INVALID_SIGNALDESK_ROUTE_TOKEN");
    if (input.source !== "route-token" && input.routeTokenValidation) throw new Error("INVALID_SIGNALDESK_ROUTE_TOKEN");
    const integrityStatus: NonNullable<SignalDeskOutcomeSummary["integrityStatus"]> = isActivation
        ? input.integrityStatus === "menulist-signed" ? "menulist-signed" : "owner-reviewed-manual"
        : input.integrityStatus === "menulist-signed" ? "menulist-signed" : "unverified";
    const day = todayKey();
    const idempotencyKeyHash = normalizeText(input.idempotencyKey) ? hashValue(normalizeText(input.idempotencyKey)) : "";
    const requestFingerprintHash = hashValue(JSON.stringify({
        channel: input.channel,
        evidenceRef: normalizeText(input.evidenceRef),
        outcomeType: input.outcomeType,
        ownerQualifiedAt: ownerQualifiedMillis || null,
        ownerReviewedAt: ownerReviewedMillis || null,
        source: input.source,
        sourceEventId: normalizeText(input.sourceEventId),
        surfaces: [...surfaces].sort(),
        targetId: input.targetId || null,
        routeTokenId: input.routeTokenValidation?.routeTokenId || null,
    }));
    const outcomeRef = idempotencyKeyHash
        ? db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_EVENTS).doc(`outcome_${idempotencyKeyHash.slice(0, 32)}`)
        : db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_EVENTS).doc();
    const idempotencyRef = idempotencyKeyHash
        ? db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`outcome_${idempotencyKeyHash}`)
        : null;
    const summaryId = `${day}_${input.outcomeType}_${input.channel}_${input.targetId || "general"}`;
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).doc(summaryId);
    const routeTokenRef = input.routeTokenValidation
        ? db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(input.routeTokenValidation.routeTokenId)
        : null;
    const transactionResult = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const [targetSnap, priorIdempotencySnap, routeTokenSnap] = await Promise.all([
            input.targetId
                ? transaction.get(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId))
                : Promise.resolve(null),
            idempotencyRef ? transaction.get(idempotencyRef) : Promise.resolve(null),
            routeTokenRef ? transaction.get(routeTokenRef) : Promise.resolve(null),
        ]);
        if (input.targetId && !targetSnap?.exists) throw new Error("Target not found");
        if (priorIdempotencySnap?.exists) {
            const priorFingerprintHash = normalizeText(priorIdempotencySnap.data()?.requestFingerprintHash);
            if (priorFingerprintHash && priorFingerprintHash !== requestFingerprintHash) {
                throw new Error("OUTCOME_IDEMPOTENCY_CONFLICT");
            }
            return {
                duplicate: true,
                outcomeEventId: String(priorIdempotencySnap.data()?.entityId || outcomeRef.id),
            };
        }
        const routeToken = routeTokenSnap?.exists ? toPlain(routeTokenSnap.data()) as AnyRecord : null;
        if (routeTokenRef) {
            const routeExpiresAt = toTimestampMillis(routeToken?.expiresAt);
            if (
                !routeToken
                || routeToken.scope !== SIGNALDESK_OUTCOME_ROUTE_SCOPE
                || routeToken.status !== "active"
                || Boolean(routeToken.revokedAt)
                || routeToken.tokenHash !== input.routeTokenValidation?.routeTokenHash
                || routeToken.targetId !== input.targetId
                || !routeExpiresAt
                || routeExpiresAt <= Date.now()
            ) {
                throw new Error("INVALID_SIGNALDESK_ROUTE_TOKEN");
            }
        }
        const target = targetSnap?.exists ? toPlain(targetSnap.data()) as SignalDeskTargetSummary : null;
        const timestamp = now();
        const outcomeRecord = {
            outcomeEventId: outcomeRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId: input.targetId || null,
            targetName: target?.displayName || null,
            outcomeType: input.outcomeType,
            source: input.source,
            channel: input.channel,
            evidenceRef: input.evidenceRef || null,
            idempotencyKeyHash: idempotencyKeyHash || null,
            integrityStatus,
            ownerQualifiedAt: ownerQualifiedMillis ? new Date(ownerQualifiedMillis) : null,
            ownerReviewedAt: ownerReviewedMillis ? new Date(ownerReviewedMillis) : null,
            sourceEventId: input.sourceEventId || null,
            routeTokenId: routeTokenRef?.id || null,
            surfaces,
            createdAt: timestamp,
            createdBy: access.userId,
        };
        transaction.set(outcomeRef, sanitizeForFirestore(outcomeRecord));
        transaction.set(summaryRef, sanitizeForFirestore({
            outcomeSummaryId: summaryId,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId: input.targetId || null,
            targetName: target?.displayName || null,
            outcomeType: input.outcomeType,
            source: input.source,
            channel: input.channel,
            count: increment(1),
            day,
            evidenceRef: input.evidenceRef || null,
            integrityStatus,
            ownerQualifiedAt: ownerQualifiedMillis ? new Date(ownerQualifiedMillis) : null,
            ownerReviewedAt: ownerReviewedMillis ? new Date(ownerReviewedMillis) : null,
            sourceEventId: input.sourceEventId || null,
            routeTokenId: routeTokenRef?.id || null,
            surfaces,
            updatedAt: timestamp,
        }), { merge: true });
        if (idempotencyRef) {
            transaction.set(idempotencyRef, sanitizeForFirestore({
                entityId: outcomeRef.id,
                entityType: "outcome",
                idempotencyKeyHash,
                pId: SIGNALDESK_PRODUCT_CODE,
                requestFingerprintHash,
                updatedAt: timestamp,
            }));
        }
        if (input.targetId) {
            const existingOwnerQualifiedMillis = toTimestampMillis(target?.ownerQualifiedAt);
            const targetUpdates: AnyRecord = {
                latestOutcomeAt: timestamp,
                nextAction: isActivation || target?.status === "converted" ? "outcome" : "review",
                status: isActivation || target?.status === "converted" ? "converted" : "replied",
                updatedAt: timestamp,
            };
            if (ownerQualifiedMillis && (!existingOwnerQualifiedMillis || ownerQualifiedMillis < existingOwnerQualifiedMillis)) {
                targetUpdates.ownerQualifiedAt = new Date(ownerQualifiedMillis);
            }
            if (isActivation) {
                targetUpdates.latestVerifiedActivationAt = new Date(ownerReviewedMillis!);
                targetUpdates.latestVerifiedActivationEvidenceRef = input.evidenceRef;
                targetUpdates.latestVerifiedActivationIntegrityStatus = integrityStatus;
                targetUpdates.latestVerifiedActivationSurfaces = surfaces;
            }
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(input.targetId), sanitizeForFirestore(targetUpdates), { merge: true });
        }
        if (input.targetId) {
            const attributionTouchRef = db.collection(SIGNALDESK_COLLECTIONS.ATTRIBUTION_TOUCHES)
                .doc(`touch_${hashValue(outcomeRef.id).slice(0, 32)}`);
            transaction.set(attributionTouchRef, sanitizeForFirestore({
                actionId: normalizeText(routeToken?.sourceActionId) || normalizeText(input.sourceEventId) || "manual-outcome",
                channel: input.channel,
                createdAt: timestamp,
                eventId: outcomeRef.id,
                method: routeTokenRef ? "route-token-direct-v1" : "manual-direct-v1",
                pId: SIGNALDESK_PRODUCT_CODE,
                targetId: input.targetId,
                touchId: attributionTouchRef.id,
                touchType: "direct",
                weight: 1,
            }));
        }
        if (routeTokenRef) {
            transaction.set(routeTokenRef, sanitizeForFirestore({
                lastOutcomeAt: timestamp,
                lastOutcomeEventIdHash: hashValue(normalizeText(input.sourceEventId) || outcomeRef.id),
                updatedAt: timestamp,
            }), { merge: true });
        }
        appendAudit(db, transaction, access, "outcome_record", "outcome", outcomeRef.id, `${input.outcomeType}:${integrityStatus}`);
        updateControlSummary(db, transaction, { outcomeCount: increment(1) });
        updateDailyCost(
            db,
            transaction,
            (idempotencyRef ? 6 : 5) + (input.targetId ? 1 : 0) + (routeTokenRef ? 1 : 0),
            0,
        );
        return { duplicate: false, outcomeEventId: outcomeRef.id };
    });

    let activationWatch: SignalDeskActivationWatchSummary | null = null;
    let activationWatchSyncStatus: "not-applicable" | "updated" | "pending" = "not-applicable";
    if (!transactionResult.duplicate && input.targetId && FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER) {
        const accountSnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS)
            .doc(revenueAccountIdFor(input.targetId))
            .get();
        if (accountSnap.exists) {
            try {
                activationWatch = await refreshSignalDeskActivationWatchServer(access, { targetId: input.targetId });
                activationWatchSyncStatus = "updated";
            } catch (error) {
                activationWatchSyncStatus = "pending";
                logRuntimeFailure(SIGNALDESK_ACTIVATION_WATCH_AUTO_SYNC_FAILED, error, {
                    outcomeType: input.outcomeType,
                    product: "signaldesk",
                    targetIdPresent: true,
                });
            }
        }
    }

    return {
        activationWatch,
        activationWatchSyncStatus,
        duplicate: transactionResult.duplicate,
        outcomeEventId: transactionResult.outcomeEventId,
        outcomeSummaryId: summaryId,
    };
}

export async function captureSignalDeskDemandSignalServer(access: SignalDeskAccessContext, input: {
    signalType: SignalDeskDemandSignalSummary["signalType"];
    sourceSurface: SignalDeskDemandSignalSummary["sourceSurface"];
    targetId?: string;
    targetName?: string;
}) {
    const db = requireDb();
    const batch = db.batch();
    const timestamp = now();
    const day = todayKey();
    const signalRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNALS).doc();
    const summaryId = `${day}_${input.signalType}_${input.sourceSurface}_${input.targetId || "general"}`;
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(summaryId);
    batch.set(signalRef, sanitizeForFirestore({
        demandSignalId: signalRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: input.targetId || null,
        targetName: input.targetName || null,
        signalType: input.signalType,
        sourceSurface: input.sourceSurface,
        createdAt: timestamp,
        createdBy: access.userId,
    }));
    batch.set(summaryRef, sanitizeForFirestore({
        demandSignalId: summaryId,
        pId: SIGNALDESK_PRODUCT_CODE,
        targetId: input.targetId || null,
        targetName: input.targetName || null,
        signalType: input.signalType,
        sourceSurface: input.sourceSurface,
        count: increment(1),
        day,
        updatedAt: timestamp,
    }), { merge: true });
    appendAudit(db, batch, access, "demand_signal_capture", "demandSignal", signalRef.id, input.signalType);
    updateControlSummary(db, batch, { demandSignalCount: increment(1) });
    updateDailyCost(db, batch, 4, 0);
    await batch.commit();

    return { demandSignalId: signalRef.id, summaryId };
}
