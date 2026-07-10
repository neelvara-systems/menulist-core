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
    | "mission"
    | "revenue"
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
    | "content"
    | "partners"
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
    | "content-distribution"
    | "trust-partner"
    | "menu-list-bridge";

export type SignalDeskKillSwitchStatus = "active" | "inactive";
export type SignalDeskTone = "neutral" | "good" | "warning" | "danger";
export type SignalDeskConfidence = "high" | "medium" | "low";
export type SignalDeskOutboundChannel = "email" | "whatsapp" | "instagram" | "messenger" | "manual";
export type SignalDeskSourceProviderId = "google-places" | "foursquare" | "apify" | "fhrs-fhis" | "manual";
export type SignalDeskResearchProviderId = Extract<SignalDeskSourceProviderId, "google-places" | "apify" | "fhrs-fhis">;
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
export type SignalDeskBudgetScope = "global" | "provider" | "market-pod" | "model-route" | "sequencer" | "trust-partner";
export type SignalDeskProviderStatus = "approved" | "blocked" | "evaluation" | "disabled";
export type SignalDeskControlStatus = "active" | "inactive" | "hold" | "blocked";
export type SignalDeskContentChannel = "linkedin" | "x" | "email" | "newsletter" | "partner-brief" | "blog" | "short-video" | "other";
export type SignalDeskContentSourceType = "manual" | "blog" | "changelog" | "proof-page" | "demo" | "case-note" | "customer-story" | "youtube" | "podcast" | "other";
export type SignalDeskGrowthMissionStatus = "draft" | "ready" | "approved" | "held" | "completed";
export type SignalDeskOwnerDecision = "pending" | "approved" | "hold" | "redirected" | "completed";
export type SignalDeskMissionActionType = "approve" | "hold" | "pause" | "redirect" | "manual-send" | "manual-publish" | "review";
export type SignalDeskExperimentDecision = "pending" | "repeat" | "narrow" | "stop" | "hold" | "complete";
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
export type SignalDeskRevenueLifecycleStage = "prospect" | "engaged" | "opportunity" | "customer" | "nurture" | "lost";
export type SignalDeskRevenueEngagementState = "none" | "contactable" | "contacted" | "replied" | "waiting-for-customer" | "opted-out";
export type SignalDeskRevenueComplianceState = "eligible" | "review-required" | "blocked" | "suppressed";
export type SignalDeskRevenueAutomationState = "manual" | "shadow" | "approval-only" | "paused";
export type SignalDeskRevenueActivationState = "not-started" | "routed" | "in-progress" | "stalled" | "activated";
export type SignalDeskCommercialOpportunityStage = "qualified" | "discovery" | "offer" | "decision" | "won" | "lost" | "nurture";
export type SignalDeskCommercialOpportunityStatus = "open" | "won" | "lost" | "nurture";
export type SignalDeskOperatingEnvelopeApprovalMode =
    | "manual"
    | "recommendation-only"
    | "prepare-and-approve-each"
    | "approve-batch"
    | "approve-sample"
    | "exception-only";

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

export interface SignalDeskTeamMemberSummary {
    teamMemberId: string;
    userId?: string | null;
    email: string;
    emailLower: string;
    name?: string | null;
    role: SignalDeskRole;
    permissions: SignalDeskPermission[];
    active: boolean;
    status: "active" | "inactive";
    createdAt?: string | null;
    createdBy?: string | null;
    updatedAt?: string | null;
    updatedBy?: string | null;
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
    status: "active" | "approved" | "inactive" | "review_required" | "blocked";
    provider?: SignalDeskProviderId | null;
    allowedUse: {
        contact: boolean;
        evidence: boolean;
        import?: boolean;
        personalization: boolean;
        providerRun?: boolean;
        storage?: boolean;
    };
    retentionDays: number;
    approvedAt?: string | null;
    createdAt?: string | null;
    expiresAt?: string | null;
    notes?: string | null;
    policyState?: "active" | "expires_soon" | "expired" | "review_required";
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
    approvedAt?: string | null;
    approvedBy?: string | null;
    marketPodId: string;
    name: string;
    status: SignalDeskControlStatus;
    city?: string | null;
    country?: string | null;
    category?: string | null;
    offerAngle: string;
    monthlyBudgetUsd: number;
    successMetric: string;
    confidence?: SignalDeskConfidence | null;
    recommendation?: "activate" | "hold" | "expand" | "cut" | null;
    recommendationReason?: string | null;
    recommendedActions?: string[];
    reviewDecision?: "approved" | "held" | "rejected" | null;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    reviewReason?: string | null;
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
    entityType: "target" | "source-run" | "approval" | "provider" | "model" | "market-pod" | "channel-window" | "trust-partner" | "content" | "mission" | "experiment" | "source-quality" | "research" | "revenue-account" | "commercial-opportunity" | "commercial-offer" | "operating-envelope" | "activation-watch";
    entityId: string;
    label: string;
    status: "completed" | "blocked" | "held" | "ready";
    steps: Array<{ label: string; status: "completed" | "blocked" | "held" | "ready"; at?: string | null }>;
    updatedAt?: string | null;
}

export interface SignalDeskChannelWindowStateSummary {
    channel: Extract<SignalDeskOutboundChannel, "whatsapp" | "instagram" | "messenger">;
    channelWindowId: string;
    eligibleForHandoff: boolean;
    expiresAt?: string | null;
    lastInteractionAt?: string | null;
    openedAt?: string | null;
    reason?: string | null;
    source: "inbound" | "opt-in" | "ad-click" | "template" | "manual";
    status: "open" | "closed" | "expired" | "blocked" | "needs-template";
    targetId?: string | null;
    targetName?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskProviderSourceRetentionSummary {
    lastRefreshedAt?: string | null;
    provider: Extract<SignalDeskSourceProviderId, "google-places" | "apify" | "fhrs-fhis">;
    providerRecordId?: string | null;
    providerRecordUrl?: string | null;
    providerSourceRetentionId: string;
    rawPayloadStored: false;
    refreshDueAt?: string | null;
    retentionExpiresAt?: string | null;
    sourcePolicyId?: string | null;
    sourceRunId?: string | null;
    status: "active" | "refresh-due" | "refreshed" | "expired" | "blocked";
    targetId?: string | null;
    targetName?: string | null;
    updatedAt?: string | null;
}

export interface SignalDeskStrategistMemoSummary {
    costSummary: string;
    nextDecisions: string[];
    providerQualitySummary: string;
    recommendedMarketPodId?: string | null;
    riskNotes: string[];
    status: "ready" | "held";
    strategistMemoId: string;
    summary: string;
    title: string;
    weekStart: string;
    updatedAt?: string | null;
}

export interface SignalDeskProviderEvaluationSummary {
    blockedRate: number;
    costPerUsefulResultUsd: number;
    evidenceQualityScore: number;
    provider: SignalDeskProviderId;
    providerEvaluationId: string;
    recommendation: "approve" | "hold" | "reject" | "test-more";
    replyOutcomeScore: number;
    sampleSize: number;
    status: "passed" | "failed" | "needs-review" | "blocked";
    suppressionRisk: "low" | "medium" | "high";
    updatedAt?: string | null;
    use: SignalDeskProviderUse;
    verifiedContactRate: number;
}

export type SignalDeskTrustPartnerType =
    | "restaurant-consultant"
    | "menu-photographer"
    | "local-business-creator"
    | "agency-freelancer"
    | "pos-payment-partner"
    | "operator-advocate"
    | "generic-creator";

export interface SignalDeskTrustPartnerProfileSummary {
    audienceFitScore: number;
    baselineReachScore: number;
    believableUsageScore: number;
    channel: "instagram" | "youtube" | "tiktok" | "linkedin" | "newsletter" | "community" | "offline" | "other";
    commentQualityScore: number;
    displayName: string;
    geography?: string | null;
    partnerId: string;
    partnerType: SignalDeskTrustPartnerType;
    sourceNotes: string;
    status: "candidate" | "approved" | "hold" | "rejected" | "active";
    trustFeelScore: number;
    trustScore: number;
    updatedAt?: string | null;
}

export interface SignalDeskTrustPartnerNicheTestSummary {
    angle: string;
    intendedAttempts: number;
    marketPodId?: string | null;
    nicheTestId: string;
    nicheName: string;
    partnerCount: number;
    recommendation: "continue" | "hold" | "cut" | "underpowered";
    status: "planned" | "active" | "paused" | "completed";
    updatedAt?: string | null;
}

export interface SignalDeskTrustPartnerDealSummary {
    approvalStatus: "pending" | "approved" | "rejected" | "blocked";
    budgetPolicyId?: string | null;
    dealId: string;
    deliverableCount: number;
    dueDate?: string | null;
    flatFeeUsd: number;
    nicheTestId?: string | null;
    partnerId: string;
    partnerName: string;
    paymentState: "not_due" | "pending" | "paid" | "held";
    pricingModel: "flat-fee" | "per-view" | "barter";
    updatedAt?: string | null;
}

export interface SignalDeskTrustPartnerBriefSummary {
    approvedClaims: string[];
    bannedClaims: string[];
    briefId: string;
    ctaId?: string | null;
    dealId?: string | null;
    disclosureRequired: boolean;
    disclosureText: string;
    onePageBrief: string;
    partnerId: string;
    status: "draft" | "ready" | "approved" | "blocked";
    updatedAt?: string | null;
}

export interface SignalDeskTrustPartnerDeliverableSummary {
    deliverableId: string;
    dealId?: string | null;
    disclosurePresent: boolean;
    dueDate?: string | null;
    partnerId: string;
    postUrl?: string | null;
    reviewState: "pending" | "approved" | "risk" | "rejected";
    status: "scheduled" | "submitted" | "live" | "missed" | "paused";
    updatedAt?: string | null;
}

export interface SignalDeskTrustPartnerMetricSummary {
    activations: number;
    capturedAt?: string | null;
    commentQuality: SignalDeskConfidence;
    comments: number;
    currentListSubmissions: number;
    deliverableId?: string | null;
    metricsId: string;
    ownerLeads: number;
    partnerId: string;
    views: number;
}

export interface SignalDeskTrustPartnerRenewalDecisionSummary {
    createdAt?: string | null;
    decisionId: string;
    evidenceSummary: string;
    nicheTestId?: string | null;
    ownerDecision?: "approved" | "rejected" | "pending" | null;
    partnerId: string;
    recommendation: "renew" | "hold" | "cut" | "retest";
    updatedAt?: string | null;
}

export interface SignalDeskContentSourceSummary {
    contentSourceId: string;
    defaultAudience: "restaurant-owner" | "agency-partner" | "trust-partner" | "local-operator" | "general";
    defaultMarketPodId?: string | null;
    lastAssetAt?: string | null;
    lastCheckedAt?: string | null;
    sourceType: SignalDeskContentSourceType;
    sourceUrl?: string | null;
    status: SignalDeskControlStatus;
    title: string;
    updatedAt?: string | null;
}

export interface SignalDeskContentAssetSummary {
    canonicalMessage: string;
    contentAssetId: string;
    ctaId?: string | null;
    marketPodId?: string | null;
    primaryAudience: SignalDeskContentSourceSummary["defaultAudience"];
    proofLevel: "owned" | "customer-proof" | "market-research" | "internal-note";
    riskNotes: string[];
    sourceId?: string | null;
    sourceNotes?: string | null;
    sourceType: SignalDeskContentSourceType;
    sourceUrl?: string | null;
    status: "draft" | "ready" | "distributed" | "hold" | "archived";
    title: string;
    updatedAt?: string | null;
}

export interface SignalDeskContentDistributionDraftSummary {
    approvalStatus: "pending" | "approved" | "rejected" | "hold";
    body: string;
    channel: SignalDeskContentChannel;
    contentAssetId: string;
    contentDraftId: string;
    ctaId?: string | null;
    hook: string;
    reviewReason?: string | null;
    scheduledFor?: string | null;
    status: "draft" | "queued" | "approved" | "rejected" | "published" | "hold";
    title: string;
    updatedAt?: string | null;
}

export interface SignalDeskContentCalendarItemSummary {
    channel: SignalDeskContentChannel;
    contentAssetId: string;
    contentCalendarItemId: string;
    contentDraftId: string;
    publishedAt?: string | null;
    scheduledFor: string;
    status: "planned" | "queued" | "approved" | "published" | "held" | "missed";
    updatedAt?: string | null;
}

export interface SignalDeskContentPerformanceSummary {
    activations: number;
    capturedAt?: string | null;
    channel: SignalDeskContentChannel;
    clicks: number;
    contentAssetId: string;
    contentDraftId?: string | null;
    contentPerformanceId: string;
    currentListSubmissions: number;
    engagementQuality: SignalDeskConfidence;
    ownerLeads: number;
    views: number;
}

export interface SignalDeskGrowthMissionSummary {
    approvalActionCount: number;
    blockedActionCount: number;
    createdAt?: string | null;
    day: string;
    expectedOutcome: string;
    growthMissionId: string;
    missionActions: Array<{
        actionId: string;
        actionType: SignalDeskMissionActionType;
        entityId?: string | null;
        entityType?: "approval" | "target" | "content" | "partner" | "source" | "sender" | "market-pod" | "experiment" | "reply" | "system" | null;
        expectedOutcome: string;
        label: string;
        rank: number;
        reason: string;
        riskLevel: SignalDeskConfidence;
        status: "pending" | "approved" | "held" | "completed" | "redirected";
    }>;
    ownerDecision: SignalDeskOwnerDecision;
    ownerDecisionNote?: string | null;
    recommendedMarketPodId?: string | null;
    status: SignalDeskGrowthMissionStatus;
    summary: string;
    title: string;
    updatedAt?: string | null;
}

export interface SignalDeskExperimentCardSummary {
    channel: "email" | "manual" | "content" | "partner" | "referral" | "other";
    contentAssetId?: string | null;
    ctaId?: string | null;
    expectedOutcome: string;
    experimentCardId: string;
    hypothesis: string;
    marketPodId?: string | null;
    ownerDecision: SignalDeskExperimentDecision;
    proofAssetSummary?: string | null;
    resultSummary?: string | null;
    sourcePolicyId?: string | null;
    status: "planned" | "active" | "paused" | "completed" | "stopped";
    stopRule: string;
    targetCount: number;
    updatedAt?: string | null;
}

export interface SignalDeskOfferCtaSummary {
    activationSurface: "claim" | "upload" | "preview" | "qr" | "whatsapp" | "google-profile" | "manual";
    approvedAsk: string;
    blockedClaims: string[];
    ctaId?: string | null;
    marketPodId?: string | null;
    offerCtaId: string;
    proofMatchRule: string;
    segment: "restaurant-owner" | "agency-partner" | "trust-partner" | "local-operator" | "general";
    status: SignalDeskControlStatus;
    title: string;
    updatedAt?: string | null;
}

export interface SignalDeskRevenueAccountSummary {
    activationState: SignalDeskRevenueActivationState;
    automationState: SignalDeskRevenueAutomationState;
    category?: string | null;
    city?: string | null;
    complianceState: SignalDeskRevenueComplianceState;
    country?: string | null;
    displayName: string;
    engagementState: SignalDeskRevenueEngagementState;
    lifecycleStage: SignalDeskRevenueLifecycleStage;
    locationType: "single-location" | "headquarters" | "branch";
    nextAction: string;
    organizationId: string;
    primaryTargetId: string;
    revenueAccountId: string;
    targetIds: string[];
    updatedAt?: string | null;
}

export interface SignalDeskCommercialOpportunitySummary {
    commercialOfferId?: string | null;
    currency?: string | null;
    expectedCloseAt?: string | null;
    founderAttentionMinutes: number;
    nextAction: string;
    nextActionDueAt?: string | null;
    opportunityId: string;
    probabilityPercent: number;
    revenueAccountId: string;
    stage: SignalDeskCommercialOpportunityStage;
    stalledReason?: string | null;
    status: SignalDeskCommercialOpportunityStatus;
    targetId: string;
    title: string;
    updatedAt?: string | null;
    valueMinor: number;
    winLossReason?: string | null;
}

export interface SignalDeskCommercialOfferSummary {
    allowedDiscountBps: number;
    billingCadence: "one-time" | "monthly" | "annual";
    commercialOfferId: string;
    contents: string[];
    currency: string;
    eligibilitySummary: string;
    founderApprovalConditions: string[];
    name: string;
    offerCtaId?: string | null;
    priceMinor: number;
    status: SignalDeskControlStatus;
    updatedAt?: string | null;
    version: number;
}

export interface SignalDeskOperatingEnvelopeSummary {
    approvalMode: SignalDeskOperatingEnvelopeApprovalMode;
    approvedAt?: string | null;
    approvedBy?: string | null;
    budgetPolicyId?: string | null;
    channel: "email" | "manual" | "content" | "partner" | "referral";
    commercialOfferId: string;
    dailyVolumeCap: number;
    executionState: "shadow" | "approval-only" | "held" | "paused";
    expiresAt: string;
    fallbackAction: "hold" | "pause" | "founder-review";
    marketPodId?: string | null;
    maxCostUsd: number;
    name: string;
    operatingEnvelopeId: string;
    requestedApprovalMode: SignalDeskOperatingEnvelopeApprovalMode;
    senderDomainId?: string | null;
    sourcePolicyIds: string[];
    startsAt: string;
    status: "draft" | "shadow" | "approved" | "held" | "paused" | "expired";
    stopConditions: string[];
    templateIds: string[];
    totalVolumeCap: number;
    updatedAt?: string | null;
    version: number;
}

export interface SignalDeskActivationWatchSummary {
    activationWatchId: string;
    deadlineAt?: string | null;
    lastOutcomeAt?: string | null;
    nextAction: string;
    outcomeTypes: SignalDeskOutcomeSummary["outcomeType"][];
    revenueAccountId: string;
    source: "signaldesk-outcome-summaries";
    status: "not-started" | "routed" | "in-progress" | "published" | "activated" | "stalled";
    targetId: string;
    updatedAt?: string | null;
}

export interface SignalDeskRevenueControlSummary {
    activatedAccountCount: number;
    founderAttentionMinutes: number;
    lostOpportunityCount: number;
    openOpportunityCount: number;
    pipelineValueMinor: number;
    pipelineCurrency?: string | null;
    revenueAccountCount: number;
    stalledActivationCount: number;
    updatedAt?: string | null;
    weightedPipelineValueMinor: number;
    wonOpportunityCount: number;
}

export interface SignalDeskReplyPlaybookSummary {
    approvedReply: string;
    escalationRequired: boolean;
    intent: "send-details" | "pricing" | "who-are-you" | "not-now" | "wrong-person" | "stop" | "call-me" | "interested" | "other";
    nextRoute: "self-serve-preview" | "manual-reply" | "suppress" | "schedule-follow-up" | "founder-review";
    playbookId: string;
    status: SignalDeskControlStatus;
    suppressionRequired: boolean;
    title: string;
    updatedAt?: string | null;
}

export interface SignalDeskSourceQualitySnapshotSummary {
    activationRate: number;
    complaintOrBounceRisk: "low" | "medium" | "high";
    duplicateRate: number;
    evidenceQualityScore: number;
    recommendation: "continue" | "narrow" | "refresh" | "stop" | "needs-policy";
    sourceName: string;
    sourcePolicyId?: string | null;
    sourceQualitySnapshotId: string;
    sourceRunId?: string | null;
    targetCount: number;
    updatedAt?: string | null;
    usableTargetRate: number;
}

export interface SignalDeskResearchRunSummary {
    city?: string | null;
    country?: string | null;
    category?: string | null;
    createdAt?: string | null;
    enrichmentColumns: string[];
    failCount: number;
    idempotencyKeyHash?: string | null;
    marketPodId?: string | null;
    maxResults: number;
    normalizedQuery: string;
    passCount: number;
    prompt: string;
    provider: SignalDeskResearchProviderId;
    providerRunIds: string[];
    researchRunId: string;
    researchType: "business-prospect" | "market-map" | "partner-list";
    sourcePolicyId?: string | null;
    sourceTransparency: string[];
    status: "queued" | "running" | "completed" | "blocked" | "duplicate";
    tableRowCount: number;
    unsureCount: number;
    updatedAt?: string | null;
}

export interface SignalDeskResearchTableRowSummary {
    category?: string | null;
    city?: string | null;
    contactability: SignalDeskContactability;
    country?: string | null;
    currentListGap: SignalDeskOpportunity;
    displayName: string;
    enrichment: Array<{
        key: string;
        label: string;
        sourceRef?: string | null;
        value: string;
        verdict: "pass" | "fail" | "unsure";
    }>;
    fitDecision: "pass" | "fail" | "unsure";
    fitScore: number;
    provider: SignalDeskResearchProviderId;
    providerRecordUrl?: string | null;
    recommendedNextAction: "score" | "evidence" | "hold" | "partner-review" | "pod-review";
    researchRowId: string;
    researchRunId: string;
    sourcePolicyId?: string | null;
    sourceRefs: string[];
    sourceRunId?: string | null;
    targetId?: string | null;
    updatedAt?: string | null;
    website?: string | null;
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
    activationWatches: SignalDeskActivationWatchSummary[];
    approvalPackets: SignalDeskApprovalPacketSummary[];
    audienceSegments: SignalDeskAudienceSegmentSummary[];
    budgetPolicies: SignalDeskBudgetPolicySummary[];
    channelWindows: SignalDeskChannelWindowStateSummary[];
    channelHealth: SignalDeskChannelHealthSummary[];
    approvals: SignalDeskApprovalItem[];
    auditEvents: SignalDeskAuditEvent[];
    conversations: SignalDeskConversationSummary[];
    connectorSettings: SignalDeskConnectorSettingSummary[];
    contentAssets: SignalDeskContentAssetSummary[];
    contentCalendarItems: SignalDeskContentCalendarItemSummary[];
    contentDistributionDrafts: SignalDeskContentDistributionDraftSummary[];
    contentPerformanceSummaries: SignalDeskContentPerformanceSummary[];
    contentSources: SignalDeskContentSourceSummary[];
    demandSignals: SignalDeskDemandSignalSummary[];
    drafts: SignalDeskDraftSummary[];
    enrichmentResults: SignalDeskEnrichmentResultSummary[];
    enrichmentWaterfalls: SignalDeskEnrichmentWaterfallSummary[];
    evidencePackets: SignalDeskEvidencePacketSummary[];
    experimentCards: SignalDeskExperimentCardSummary[];
    growthMissions: SignalDeskGrowthMissionSummary[];
    imports: SignalDeskSourceRunSummary[];
    marketPods: SignalDeskMarketPodSummary[];
    modelEvals: SignalDeskModelEvalSummary[];
    modelRoutes: SignalDeskModelRouteSummary[];
    outcomes: SignalDeskOutcomeSummary[];
    offerCtas: SignalDeskOfferCtaSummary[];
    commercialOffers: SignalDeskCommercialOfferSummary[];
    commercialOpportunities: SignalDeskCommercialOpportunitySummary[];
    operatingEnvelopes: SignalDeskOperatingEnvelopeSummary[];
    policies: SignalDeskSourcePolicy[];
    providerAccounts: SignalDeskProviderAccountSummary[];
    providerEvaluations: SignalDeskProviderEvaluationSummary[];
    providerEvents: SignalDeskProviderEventSummary[];
    providerRuns: SignalDeskProviderRunSummary[];
    providerSourceRetentions: SignalDeskProviderSourceRetentionSummary[];
    researchRuns: SignalDeskResearchRunSummary[];
    researchTableRows: SignalDeskResearchTableRowSummary[];
    runTimelines: SignalDeskRunTimelineSummary[];
    scores: SignalDeskAiScoreSummary[];
    section: SignalDeskSection;
    selfServiceCtas: SignalDeskSelfServiceCtaSummary[];
    senderDomains: SignalDeskSenderDomainSummary[];
    sequencerHandoffs: SignalDeskSequencerHandoffSummary[];
    sequencerSteps: SignalDeskSequencerStepSummary[];
    strategistMemos: SignalDeskStrategistMemoSummary[];
    replyPlaybooks: SignalDeskReplyPlaybookSummary[];
    revenueAccounts: SignalDeskRevenueAccountSummary[];
    revenueControlSummaries: SignalDeskRevenueControlSummary[];
    sourceQualitySnapshots: SignalDeskSourceQualitySnapshotSummary[];
    targets: SignalDeskTargetSummary[];
    teamMembers: SignalDeskTeamMemberSummary[];
    templates: SignalDeskTemplateSummary[];
    trustPartnerBriefs: SignalDeskTrustPartnerBriefSummary[];
    trustPartnerDeals: SignalDeskTrustPartnerDealSummary[];
    trustPartnerDeliverables: SignalDeskTrustPartnerDeliverableSummary[];
    trustPartnerMetrics: SignalDeskTrustPartnerMetricSummary[];
    trustPartnerNicheTests: SignalDeskTrustPartnerNicheTestSummary[];
    trustPartnerProfiles: SignalDeskTrustPartnerProfileSummary[];
    trustPartnerRenewalDecisions: SignalDeskTrustPartnerRenewalDecisionSummary[];
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
