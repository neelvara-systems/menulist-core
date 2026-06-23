export type SignalDeskRole =
    | "founder-admin"
    | "growth-manager"
    | "operator"
    | "compliance-reviewer"
    | "readonly-analyst"
    | "system-worker";

export type SignalDeskPermission =
    | "signaldesk.view"
    | "signaldesk.configure"
    | "target.review"
    | "contact.reveal"
    | "draft.create"
    | "draft.approve"
    | "message.export"
    | "message.send"
    | "source.configure"
    | "channel.configure"
    | "policy.approve"
    | "kill-switch.activate"
    | "kill-switch.deactivate"
    | "audit.view";

export type SignalDeskSection =
    | "dashboard"
    | "targets"
    | "imports"
    | "approvals"
    | "templates"
    | "inbox"
    | "attribution"
    | "policies"
    | "sources"
    | "ai"
    | "channels"
    | "settings"
    | "control-room"
    | "audit";

export type SignalDeskKillSwitchScope =
    | "global-outbound"
    | "email"
    | "whatsapp"
    | "instagram"
    | "messenger"
    | "source-provider"
    | "ai-worker"
    | "campaign"
    | "menu-list-bridge";

export type SignalDeskKillSwitchStatus = "active" | "inactive";
export type SignalDeskTone = "neutral" | "good" | "warning" | "danger";
export type SignalDeskConfidence = "high" | "medium" | "low";
export type SignalDeskOutboundChannel = "email" | "whatsapp" | "instagram" | "messenger" | "manual";
export type SignalDeskSourceProviderId = "google-places" | "foursquare" | "apify" | "manual";
export type SignalDeskAiTask = "score" | "evidence" | "draft" | "reply-classification" | "approval-packet" | "weekly-strategist" | "vendor-audit";
export type SignalDeskProviderId =
    | SignalDeskSourceProviderId
    | "owned-email"
    | "apollo"
    | "hunter"
    | "zerobounce"
    | "firecrawl"
    | "tavily"
    | "exa"
    | "postmark"
    | "resend"
    | "smartlead"
    | "instantly"
    | "lemlist"
    | "gemini"
    | "openai"
    | "anthropic";
export type SignalDeskProviderUse = "discovery" | "enrichment" | "verification" | "research" | "sender" | "sequencer" | "ai";
export type SignalDeskBudgetScope = "global" | "provider" | "market-pod" | "model-route" | "sequencer";
export type SignalDeskProviderStatus = "approved" | "blocked" | "evaluation" | "disabled";
export type SignalDeskControlStatus = "active" | "inactive" | "hold" | "blocked";
export type SignalDeskSequencerProvider = "owned-email" | Extract<SignalDeskProviderId, "smartlead" | "instantly" | "lemlist">;
export type SignalDeskConnectorKind =
    | "email-smtp"
    | "meta-whatsapp"
    | "meta-instagram"
    | "meta-messenger"
    | "smartlead"
    | "apify";
export type SignalDeskConnectorSecretState = "missing" | "configured" | "not_required";
export type SignalDeskConnectorReadiness = "ready" | "partial" | "missing";

export interface SignalDeskAccessContext {
    active: boolean;
    email?: string;
    firebaseConfigured: boolean;
    isPlatformAdmin: boolean;
    name?: string;
    permissions: SignalDeskPermission[];
    role: SignalDeskRole;
    userId: string;
}

export interface SignalDeskKillSwitch {
    activatedAt?: string | null;
    activatedBy?: string | null;
    deactivatedAt?: string | null;
    deactivatedBy?: string | null;
    expiresAt?: string | null;
    killSwitchId: string;
    reason: string;
    scope: SignalDeskKillSwitchScope;
    status: SignalDeskKillSwitchStatus;
    updatedAt?: string | null;
}

export interface SignalDeskMetricCard {
    key: string;
    label: string;
    value: number | string;
    tone?: SignalDeskTone;
}

export interface SignalDeskQueueSummary {
    approvalBacklog: number;
    inboxBacklog: number;
    humanReview: number;
    overdue: number;
}

export interface SignalDeskCostSummary {
    aiCostEstimate: number;
    firestoreReadEstimate: number;
    firestoreWriteEstimate: number;
    providerCostEstimate: number;
    updatedAt?: string | null;
}

export interface SignalDeskChannelHealthSummary {
    channel: SignalDeskOutboundChannel;
    configured: boolean;
    lastEventAt?: string | null;
    lastError?: string | null;
    status: "healthy" | "paused" | "not_configured" | "warning";
    updatedAt?: string | null;
}

export interface SignalDeskConnectorSettingSummary {
    accessTokenState: SignalDeskConnectorSecretState;
    apiKeyState: SignalDeskConnectorSecretState;
    appId?: string | null;
    appSecretState: SignalDeskConnectorSecretState;
    channel: Exclude<SignalDeskOutboundChannel, "manual"> | "sequencer" | "source";
    connectorId: string;
    connectorKind: SignalDeskConnectorKind;
    displayName: string;
    envReadiness: SignalDeskConnectorReadiness;
    fromName?: string | null;
    instagramPageId?: string | null;
    messengerPageId?: string | null;
    missingEnv: string[];
    notes?: string | null;
    phoneNumber?: string | null;
    phoneNumberId?: string | null;
    provider: "owned-email" | "smtp" | "meta" | "smartlead" | "apify";
    replyToEmail?: string | null;
    senderDomain?: string | null;
    senderEmail?: string | null;
    smtpCredentialState: SignalDeskConnectorSecretState;
    status: SignalDeskControlStatus;
    updatedAt?: string | null;
    webhookSecretState: SignalDeskConnectorSecretState;
}

export interface SignalDeskControlRoomSummary {
    activeKillSwitchCount: number;
    channelStatus: "healthy" | "paused" | "warning" | "stale" | "not_configured";
    costStatus: "healthy" | "warning" | "over_limit" | "not_configured";
    demandSignalCount: number;
    openIncidentCount: number;
    outcomeCount: number;
    sourceStatus: "healthy" | "warning" | "stale" | "not_configured";
    targetCount: number;
    updatedAt?: string | null;
}

export interface SignalDeskIncidentSummary {
    incidentId: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "open" | "acknowledged" | "resolved";
    title: string;
    updatedAt?: string | null;
}

export type SignalDeskTargetStatus =
    | "new"
    | "review"
    | "ready"
    | "held"
    | "rejected"
    | "contacted"
    | "replied"
    | "converted";

export type SignalDeskSegment = "a" | "b" | "c" | "hold" | "reject";
export type SignalDeskOpportunity =
    | "missing-current-list"
    | "stale-menu"
    | "instagram-only"
    | "pdf-only"
    | "no-link"
    | "unknown";
export type SignalDeskSourceConfidence = "high" | "medium" | "low" | "blocked";
export type SignalDeskContactability = "ready" | "limited" | "missing" | "blocked";
export type SignalDeskSuppressionStatus = "clear" | "suppressed" | "wrong-contact" | "complaint";
export type SignalDeskNextAction =
    | "review"
    | "enrich"
    | "score"
    | "evidence"
    | "draft"
    | "approve"
    | "export"
    | "reply"
    | "outcome"
    | "hold"
    | "reject";

export interface SignalDeskTargetSummary {
    targetId: string;
    displayName: string;
    category?: string | null;
    city?: string | null;
    country?: string | null;
    currentListUrl?: string | null;
    website?: string | null;
    status: SignalDeskTargetStatus;
    segment: SignalDeskSegment;
    primaryOpportunity: SignalDeskOpportunity;
    sourceConfidence: SignalDeskSourceConfidence;
    contactability: SignalDeskContactability;
    suppressionStatus: SignalDeskSuppressionStatus;
    nextAction: SignalDeskNextAction;
    fitScore?: number;
    currentListGapScore?: number;
    contactabilityScore?: number;
    riskScore?: number;
    sourceRunId?: string | null;
    sourcePolicyId?: string | null;
    latestDraftId?: string | null;
    latestApprovalId?: string | null;
    latestConversationId?: string | null;
    latestOutcomeAt?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskSourcePolicy {
    sourcePolicyId: string;
    name: string;
    sourceType: "manual-csv" | "manual-research" | "owned-demand" | "provider" | "other";
    status: "active" | "inactive";
    allowedUse: {
        contact: boolean;
        evidence: boolean;
        personalization: boolean;
    };
    retentionDays: number;
    notes?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskSourceRunSummary {
    sourceRunId: string;
    sourcePolicyId: string;
    sourceName: string;
    status: "completed" | "partial" | "blocked";
    importedCount: number;
    duplicateCount: number;
    suppressedCount: number;
    blockedCount: number;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskEvidencePacketSummary {
    evidencePacketId: string;
    targetId: string;
    targetName: string;
    confidence: SignalDeskConfidence;
    allowedUse: string[];
    rejectedFacts: string[];
    summary: string;
    updatedAt?: string | null;
}

export interface SignalDeskAiScoreSummary {
    scoreId: string;
    targetId: string;
    fitScore: number;
    currentListGapScore: number;
    contactabilityScore: number;
    riskScore: number;
    segment: SignalDeskSegment;
    nextAction: SignalDeskNextAction;
    reasons: string[];
    createdAt?: string | null;
}

export interface SignalDeskTemplateSummary {
    templateId: string;
    name: string;
    channel: SignalDeskOutboundChannel;
    status: "active" | "inactive";
    approvedVariables: string[];
    subject?: string | null;
    body: string;
    updatedAt?: string | null;
}

export interface SignalDeskDraftSummary {
    draftId: string;
    targetId: string;
    targetName: string;
    templateId: string;
    channel: SignalDeskOutboundChannel;
    status: "draft" | "queued" | "approved" | "rejected" | "exported" | "sent" | "failed";
    subject: string;
    body: string;
    evidencePacketId?: string | null;
    approvalId?: string | null;
    ctaId?: string | null;
    personalizationEvidenceIds?: string[];
    unsupportedClaims?: string[];
    updatedAt?: string | null;
}

export interface SignalDeskApprovalItem {
    approvalId: string;
    targetId: string;
    targetName: string;
    draftId?: string | null;
    status: "pending" | "approved" | "rejected" | "queued" | "exported" | "sent" | "failed";
    priority: "low" | "normal" | "high";
    reviewReason: string;
    channel: SignalDeskOutboundChannel;
    approvalPacketId?: string | null;
    dueAt?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskConversationSummary {
    conversationId: string;
    targetId: string;
    targetName: string;
    channel: SignalDeskOutboundChannel;
    state: "new" | "exported" | "interested" | "not_interested" | "dnc" | "wrong_contact" | "needs_review";
    lastMessagePreview?: string | null;
    lastInboundAt?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskProviderEventSummary {
    channel?: SignalDeskOutboundChannel | null;
    eventId: string;
    eventType: string;
    provider: string;
    status: "received" | "processed" | "ignored" | "blocked" | "failed";
    targetId?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskProviderRunSummary {
    providerRunId: string;
    provider: SignalDeskSourceProviderId;
    query: string;
    resultCount: number;
    sourcePolicyId: string;
    status: "completed" | "blocked" | "failed";
    updatedAt?: string | null;
}

export interface SignalDeskProviderAccountSummary {
    providerAccountId: string;
    provider: SignalDeskProviderId;
    use: SignalDeskProviderUse;
    status: SignalDeskProviderStatus;
    credentialState: "missing" | "configured" | "not_required";
    ownerApproved: boolean;
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    perRunBudgetUsd: number;
    spentTodayUsd: number;
    spentMonthUsd: number;
    disabledReason?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskBudgetPolicySummary {
    budgetPolicyId: string;
    name: string;
    scope: SignalDeskBudgetScope;
    provider?: SignalDeskProviderId | null;
    scopeId?: string | null;
    status: SignalDeskControlStatus;
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    perRunBudgetUsd: number;
    spentTodayUsd: number;
    spentMonthUsd: number;
    updatedAt?: string | null;
}

export interface SignalDeskVendorRunSummary {
    vendorRunId: string;
    provider: SignalDeskProviderId;
    status: "ready" | "blocked" | "skipped" | "completed" | "failed";
    targetId?: string | null;
    targetName?: string | null;
    waterfallId?: string | null;
    requestedField?: string | null;
    costEstimateUsd: number;
    resultCount: number;
    blockedReason?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskEnrichmentResultSummary {
    enrichmentResultId: string;
    targetId: string;
    targetName: string;
    provider: SignalDeskProviderId;
    field: string;
    status: "verified" | "candidate" | "blocked" | "missing";
    confidence: SignalDeskConfidence;
    valuePreview?: string | null;
    sourcePolicyId?: string | null;
    expiresAt?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskEnrichmentWaterfallSummary {
    waterfallId: string;
    name: string;
    requestedField: "email" | "phone" | "company" | "website" | "evidence";
    providerOrder: SignalDeskProviderId[];
    status: SignalDeskControlStatus;
    maxCredits: number;
    maxCostUsd: number;
    stopCondition: "first-verified" | "first-candidate" | "manual-review";
    verificationRequired: boolean;
    sourcePolicyId?: string | null;
    retentionDays: number;
    updatedAt?: string | null;
}

export interface SignalDeskModelRouteSummary {
    modelRouteId: string;
    task: SignalDeskAiTask;
    status: SignalDeskControlStatus;
    defaultProvider: Extract<SignalDeskProviderId, "gemini" | "openai" | "anthropic">;
    defaultModel: string;
    escalationProvider?: Extract<SignalDeskProviderId, "gemini" | "openai" | "anthropic"> | null;
    escalationModel?: string | null;
    confidenceThreshold: SignalDeskConfidence;
    maxCostUsd: number;
    updatedAt?: string | null;
}

export interface SignalDeskModelEvalSummary {
    modelEvalId: string;
    modelRouteId?: string | null;
    task: SignalDeskAiTask;
    provider: SignalDeskProviderId;
    model: string;
    status: "passed" | "failed" | "needs-review";
    sampleSize: number;
    passRate: number;
    editRate: number;
    rejectedFactRate: number;
    updatedAt?: string | null;
}

export interface SignalDeskApprovalPacketSummary {
    approvalPacketId: string;
    approvalId?: string | null;
    targetId: string;
    targetName: string;
    status: "pending" | "approved" | "rejected" | "held";
    evidencePacketId?: string | null;
    sourcePolicyId?: string | null;
    suppressionStatus: SignalDeskSuppressionStatus;
    channelReadiness: "ready" | "not_ready" | "blocked";
    costImpactUsd: number;
    riskSummary: string;
    recommendedAction: "approve" | "hold" | "reject" | "pause" | "redirect";
    ctaId?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskMarketPodSummary {
    marketPodId: string;
    name: string;
    status: SignalDeskControlStatus;
    city?: string | null;
    country?: string | null;
    category?: string | null;
    offerAngle: string;
    monthlyBudgetUsd: number;
    successMetric: string;
    updatedAt?: string | null;
}

export interface SignalDeskAudienceSegmentSummary {
    audienceSegmentId: string;
    name: string;
    status: SignalDeskControlStatus;
    marketPodId?: string | null;
    triggerType: "demand-signal" | "source-run" | "outcome" | "manual" | "website-evidence";
    criteriaSummary: string;
    sourcePolicyId?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskSequencerHandoffSummary {
    sequencerHandoffId: string;
    provider: SignalDeskSequencerProvider;
    status: "blocked" | "ready" | "queued" | "exported" | "sent" | "stopped" | "failed";
    approvalId?: string | null;
    targetId?: string | null;
    targetName?: string | null;
    senderDomainId?: string | null;
    blockedReason?: string | null;
    currentStep?: number | null;
    nextSendAt?: string | null;
    providerCampaignId?: string | null;
    providerLeadId?: string | null;
    recipientPreview?: string | null;
    stepCount?: number | null;
    updatedAt?: string | null;
}

export interface SignalDeskSequencerStepSummary {
    approvalId?: string | null;
    bodyPreview: string;
    channel: Extract<SignalDeskOutboundChannel, "email">;
    draftId?: string | null;
    scheduledAt?: string | null;
    sentAt?: string | null;
    sequencerHandoffId: string;
    sequenceStepId: string;
    status: "blocked" | "queued" | "ready" | "sent" | "skipped" | "failed";
    stepNumber: number;
    subject: string;
    targetId?: string | null;
    targetName?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskSenderDomainSummary {
    senderDomainId: string;
    domain: string;
    status: SignalDeskControlStatus;
    provider?: SignalDeskProviderId | null;
    authenticationState: "missing" | "partial" | "ready";
    volumeRampState: "not_started" | "low_volume" | "paused" | "ready";
    bounceRate: number;
    complaintRate: number;
    unsubscribeReady: boolean;
    brandRisk: "low" | "medium" | "high";
    updatedAt?: string | null;
}

export interface SignalDeskRunTimelineSummary {
    runTimelineId: string;
    entityType: "target" | "source-run" | "approval" | "provider" | "model" | "market-pod";
    entityId: string;
    label: string;
    status: "completed" | "blocked" | "held" | "ready";
    steps: Array<{ label: string; status: "completed" | "blocked" | "held" | "ready"; at?: string | null }>;
    updatedAt?: string | null;
}

export interface SignalDeskSelfServiceCtaSummary {
    ctaId: string;
    label: string;
    ctaType: "preview" | "route-draft" | "menu-health" | "qr-public-menu" | "claim-start" | "two-surface-proof";
    status: SignalDeskControlStatus;
    copy: string;
    updatedAt?: string | null;
}

export interface SignalDeskOutcomeSummary {
    outcomeSummaryId: string;
    targetId?: string | null;
    targetName?: string | null;
    outcomeType: "route_created" | "upload_started" | "preview_prepared" | "published" | "two_surface_activation";
    source: "manual" | "route-token" | "demand-signal";
    channel: "email" | "manual" | "qr" | "share" | "claim";
    count: number;
    day: string;
    updatedAt?: string | null;
}

export interface SignalDeskDemandSignalSummary {
    demandSignalId: string;
    targetId?: string | null;
    targetName?: string | null;
    signalType: "qr_scan" | "link_click" | "share" | "claim_attempt" | "referral";
    sourceSurface: "menu" | "qr" | "website" | "manual" | "other";
    count: number;
    day: string;
    updatedAt?: string | null;
}

export interface SignalDeskAuditEvent {
    auditEventId: string;
    actorId: string;
    actorRole?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    reason?: string | null;
    createdAt?: string | null;
}

export interface SignalDeskWorkspaceData {
    approvalPackets: SignalDeskApprovalPacketSummary[];
    audienceSegments: SignalDeskAudienceSegmentSummary[];
    budgetPolicies: SignalDeskBudgetPolicySummary[];
    channelHealth: SignalDeskChannelHealthSummary[];
    approvals: SignalDeskApprovalItem[];
    auditEvents: SignalDeskAuditEvent[];
    conversations: SignalDeskConversationSummary[];
    connectorSettings: SignalDeskConnectorSettingSummary[];
    demandSignals: SignalDeskDemandSignalSummary[];
    drafts: SignalDeskDraftSummary[];
    enrichmentResults: SignalDeskEnrichmentResultSummary[];
    enrichmentWaterfalls: SignalDeskEnrichmentWaterfallSummary[];
    evidencePackets: SignalDeskEvidencePacketSummary[];
    imports: SignalDeskSourceRunSummary[];
    marketPods: SignalDeskMarketPodSummary[];
    modelEvals: SignalDeskModelEvalSummary[];
    modelRoutes: SignalDeskModelRouteSummary[];
    outcomes: SignalDeskOutcomeSummary[];
    policies: SignalDeskSourcePolicy[];
    providerAccounts: SignalDeskProviderAccountSummary[];
    providerEvents: SignalDeskProviderEventSummary[];
    providerRuns: SignalDeskProviderRunSummary[];
    runTimelines: SignalDeskRunTimelineSummary[];
    scores: SignalDeskAiScoreSummary[];
    section: SignalDeskSection;
    selfServiceCtas: SignalDeskSelfServiceCtaSummary[];
    senderDomains: SignalDeskSenderDomainSummary[];
    sequencerHandoffs: SignalDeskSequencerHandoffSummary[];
    sequencerSteps: SignalDeskSequencerStepSummary[];
    targets: SignalDeskTargetSummary[];
    templates: SignalDeskTemplateSummary[];
    vendorRuns: SignalDeskVendorRunSummary[];
}

export interface SignalDeskWorkspaceResponse extends SignalDeskOverview {
    workspace: SignalDeskWorkspaceData;
}

export interface SignalDeskOverview {
    access: SignalDeskAccessContext;
    activeKillSwitches: SignalDeskKillSwitch[];
    controlRoom: SignalDeskControlRoomSummary;
    cost: SignalDeskCostSummary;
    incidents: SignalDeskIncidentSummary[];
    metrics: SignalDeskMetricCard[];
    queues: SignalDeskQueueSummary;
    setup: {
        firebaseConfigured: boolean;
        providerSendEnabled: boolean;
        runtimeEnabled: boolean;
    };
}
