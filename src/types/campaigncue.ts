import type { CAMPAIGNCUE_CHANNELS } from "@constant/campaigncue/channels";
import type { CAMPAIGNCUE_PRODUCT_CODE } from "@constant/campaigncue/product";
import type {
    CampaignCueDailyDeskActionTarget,
    CampaignCueDailyDeskMissingInputType,
    CampaignCueDailyDeskOwnerGoal,
    CampaignCueDailyDeskRecipe,
    CampaignCueDailyDeskResultSignal,
    CampaignCueDailyDeskTaskKind,
} from "@constant/campaigncue/dailyDesk";
import type {
    CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS,
    CAMPAIGNCUE_EXPORT_ACTIONS,
} from "@constant/campaigncue/delivery";
import type {
    CAMPAIGNCUE_RESULT_EVIDENCE_METRICS,
    CAMPAIGNCUE_RESULT_EVIDENCE_PROVIDERS,
    CAMPAIGNCUE_RESULT_EVIDENCE_SCOPES,
} from "@constant/campaigncue/resultEvidence";

export type CampaignCueChannel = typeof CAMPAIGNCUE_CHANNELS[number];

export type CampaignCueWorkspaceRole =
    | "owner"
    | "admin"
    | "marketer"
    | "reviewer"
    | "local_manager"
    | "agency_member"
    | "billing_admin";

export type CampaignCueBusinessType =
    | "restaurant"
    | "salon"
    | "retail"
    | "local_service"
    | "fitness"
    | "clinic"
    | "multi_location"
    | "agency_client"
    | "other";

export type CampaignCueReadinessStatus = "ready" | "limited" | "blocked";
export type CampaignCueOpportunityStatus = "open" | "accepted" | "dismissed";
export type CampaignCueCampaignStatus = "draft" | "generated" | "scheduled" | "used" | "archived";
export type CampaignCueTrustGate = "clear" | "warning" | "needs_fix" | "blocked";
export type CampaignCueTrustSeverity = "info" | "warning" | "needs_fix" | "blocked";
export type CampaignCueMetricConfidence = "observed" | "imported" | "manual" | "estimated" | "owner_reported";
export type CampaignCueProviderMode = "manual_export" | "manual_handoff" | "brief_only" | "disabled";
export type CampaignCueOutputMode = "draft" | "manual_export" | "manual_handoff" | "brief" | "schedule_task";
export type CampaignCueDecisionStatus = "ready_to_prepare" | "needs_owner_input" | "safe_evergreen_only" | "blocked";
export type CampaignCueDecisionConfidence = "high" | "medium" | "low";
export type CampaignCueDecisionOutputType =
    | "whatsapp_image"
    | "whatsapp_message"
    | "instagram_square"
    | "instagram_story"
    | "google_update"
    | "google_offer"
    | "poster_pdf"
    | "flyer_pdf"
    | "staff_share_text"
    | "ad_handoff_copy"
    | "creator_script"
    | "reel_brief"
    | "campaign_proof_deck_pdf"
    | "manual_task";

export type CampaignCueOutputIntentId =
    | "recommended_pack"
    | "source_to_channel_pack"
    | "whatsapp_sales_pack"
    | "booking_push_pack"
    | "google_local_update"
    | "instagram_post_story"
    | "print_in_store"
    | "staff_share_pack"
    | "ad_handoff_pack"
    | "local_creator_test_brief"
    | "campaign_proof_deck"
    | "reuse_old_asset"
    | "custom_size";

export type CampaignCueActionType = typeof CAMPAIGNCUE_EXPORT_ACTIONS[number];
export type CampaignCueDisabledProviderActionType = typeof CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS[number];

export interface CampaignCueTimestamped {
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface CampaignCueWorkspace extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    productId: typeof CAMPAIGNCUE_PRODUCT_CODE;
    tId: string;
    sId: string;
    name: string;
    status: "active" | "disabled";
    billingStatus: "manual_beta" | "trial" | "active" | "past_due";
    defaultRole: CampaignCueWorkspaceRole;
    agencyMode: boolean;
    multiLocationMode: boolean;
    settings: {
        timezone: string;
        locale: string;
        deliveryMode: "export_download_only";
        billingEnabled: boolean;
    };
    members: Record<string, {
        role: CampaignCueWorkspaceRole;
        locationIds?: string[];
        joinedAt?: unknown;
    }>;
    patternCueSource?: CampaignCueSourceInput;
}

export interface CampaignCueLocation extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    name: string;
    locality?: string;
    contacts?: {
        phone?: string;
        whatsapp?: string;
        bookingUrl?: string;
        publicMenuUrl?: string;
        website?: string;
    };
    status: "active" | "draft" | "disabled";
    sourceRefs: string[];
}

export interface CampaignCueLocationTruthSnapshot {
    locationId: string;
    name: string;
    locality?: string;
    contacts: {
        phone?: string;
        whatsapp?: string;
        bookingUrl?: string;
        publicMenuUrl?: string;
        website?: string;
    };
    sourceHash: string;
}

export interface CampaignCueBrandPlaybook {
    targetAudience?: string;
    brandFeel: string[];
    inspirationNotes: string[];
    visualMotifs: string[];
    avoidList: string[];
    productFocus: string[];
    typographyNotes?: string;
}

export type CampaignCueBusinessState = "normal" | "quiet" | "busy" | "closed";
export type CampaignCueCapacityStatus = "unknown" | "available" | "limited" | "full";
export type CampaignCueStockStatus = "unknown" | "available" | "low" | "unavailable";
export type CampaignCueCommercialGateStatus = "ready" | "needs_review" | "blocked";
export type CampaignCueExperimentVariable = "channel" | "timing" | "offer" | "photo" | "cta" | "format";

export interface CampaignCueCampaignOfferPagePointer {
    slug: string;
    status: "published" | "unpublished";
    publishedAt?: unknown;
    unpublishedAt?: unknown;
    expiresAt?: unknown;
}

export interface CampaignCueExportArchivePointer {
    schemaVersion: 1;
    assetId: string;
    crc32c: string;
    filename: string;
    mimeType: "application/zip";
    retentionPolicy: "two_slot_current_per_campaign";
    sha256: string;
    sizeBytes: number;
    slot: "a" | "b";
    storageGeneration: string;
    storagePath: string;
    archivedAt: unknown;
}

export interface CampaignCueExportArchiveUploadLease {
    crc32c: string;
    filename: string;
    sha256: string;
    sizeBytes: number;
    slot: "a" | "b";
    storagePath: string;
    uploadToken: string;
    createdBy: string;
    createdAt: unknown;
    expiresAt: unknown;
}

export interface CampaignCuePublicOfferPage {
    schemaVersion: 1;
    slug: string;
    workspaceId: string;
    campaignId: string;
    status: "published" | "unpublished";
    title: string;
    body: string;
    businessName: string;
    locality?: string;
    ctaLabel: string;
    destination: string;
    terms: string[];
    theme: {
        primaryColor: string;
    };
    sourceOutputId?: string;
    publishedBy: string;
    publishedAt: string;
    updatedAt: string;
    expiresAt: string;
}

export interface CampaignCueOperatingPulse {
    businessState: CampaignCueBusinessState;
    capacityStatus: CampaignCueCapacityStatus;
    stockStatus: CampaignCueStockStatus;
    localMoment?: string;
    note?: string;
    validUntil?: unknown;
    updatedAt?: unknown;
}

export interface CampaignCueCommercialPolicy {
    promotionsAllowed: boolean;
    discountsAllowed: boolean;
    discountApprovalRequired: boolean;
    maxDiscountPercent?: number;
    minimumPromotedPrice?: number;
    currencyCode: string;
    doNotPromote: string[];
}

export interface CampaignCuePresenceProfile {
    googleBusinessProfileUrl?: string;
    googleReviewUrl?: string;
    appleBusinessConnectUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    whatsappCatalogUrl?: string;
}

export interface CampaignCueLanguagePolicy {
    sourceLocale: string;
    targetLocales: string[];
    protectedFactReviewRequired: true;
}

export interface CampaignCueBusinessBrain extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    businessBrainId: string;
    businessType: CampaignCueBusinessType;
    name: string;
    locality?: string;
    contacts: {
        phone?: string;
        website?: string;
        whatsapp?: string;
        bookingUrl?: string;
        publicMenuUrl?: string;
    };
    brandKit: {
        primaryColor?: string;
        logoUrl?: string;
        voice: "calm" | "friendly" | "premium" | "direct";
        playbook: CampaignCueBrandPlaybook;
    };
    locale: string;
    timezone: string;
    catalog: {
        items: CampaignCueCatalogItem[];
        services: CampaignCueCatalogItem[];
    };
    operatingPulse: CampaignCueOperatingPulse;
    commercialPolicy: CampaignCueCommercialPolicy;
    presence: CampaignCuePresenceProfile;
    languagePolicy: CampaignCueLanguagePolicy;
    sourceConfidence: number;
    readiness: {
        status: CampaignCueReadinessStatus;
        blockers: string[];
        warnings: string[];
    };
    sourceSnapshotId?: string;
}

export interface CampaignCueCatalogItem {
    id: string;
    name: string;
    category?: string;
    priceLabel?: string;
    available: boolean;
    imageUrl?: string;
    sourceRefs: string[];
}

export interface CampaignCueSourceSnapshot extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    sourceType: "menulist" | "manual" | "upload" | "website" | "google" | "whatsapp" | "meta";
    sourceHash: string;
    sourceRefs: string[];
    confidence: number;
    freshness: "fresh" | "stale" | "unknown";
    summary: string;
    facts: CampaignCueSourceFact[];
    missingFacts: string[];
    verticalRisks: string[];
}

export type CampaignCuePatternCuePlatform = "instagram" | "tiktok" | "youtube" | "other";
export type CampaignCuePatternCueRightsStatus = "reference_only" | "owner_authorized";
export type CampaignCuePatternCueHookType =
    | "question"
    | "curiosity"
    | "demonstration"
    | "offer"
    | "story"
    | "direct_benefit";
export type CampaignCuePatternCueFormat = "talking_head" | "demonstration" | "montage" | "screen_recording" | "mixed";
export type CampaignCuePatternCuePacing = "calm" | "steady" | "fast";

export interface CampaignCuePatternCueObservation {
    schemaVersion: 1;
    sourceUrl: string;
    sourceHash: string;
    platform: CampaignCuePatternCuePlatform;
    rightsStatus: CampaignCuePatternCueRightsStatus;
    analysisMode: "deterministic" | "model_candidate";
    hookType: CampaignCuePatternCueHookType;
    format: CampaignCuePatternCueFormat;
    pacing: CampaignCuePatternCuePacing;
    durationBand: "under_15_seconds" | "15_to_30_seconds" | "31_to_60_seconds" | "over_60_seconds" | "unknown";
    structure: string[];
    visualBeats: string[];
    ctaPattern: "book" | "call" | "message" | "visit" | "link" | "comment" | "none";
    candidateHooks: string[];
    ownerTakeaway?: string;
    adaptationGuardrails: string[];
    summary: string;
}

export type CampaignCueSourceInputType =
    | "manual_note"
    | "menu_link"
    | "booking_link"
    | "offer"
    | "event"
    | "upload_metadata"
    | "inspiration_pattern";

export interface CampaignCueSourceInput extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    sourceType: CampaignCueSourceInputType;
    label: string;
    value: string;
    status: "active" | "needs_review" | "archived";
    confidence: CampaignCueMetricConfidence;
    sourceRefs: string[];
    facts: CampaignCueSourceFact[];
    patternCue?: CampaignCuePatternCueObservation;
    expiresAt?: unknown;
}

export type CampaignCueInboxCandidateKind =
    | "offer"
    | "price"
    | "discount"
    | "terms"
    | "availability"
    | "event"
    | "asset_note"
    | "note"
    | "phone"
    | "whatsapp"
    | "website"
    | "menu_link"
    | "booking_link"
    | "location";

export type CampaignCueInboxBusinessField =
    | "phone"
    | "whatsapp"
    | "website"
    | "publicMenuUrl"
    | "bookingUrl"
    | "locality";

export interface CampaignCueInboxCandidate {
    id: string;
    kind: CampaignCueInboxCandidateKind;
    label: string;
    value: string;
    destination: "source_input" | "business_details";
    sourceType?: Exclude<CampaignCueSourceInputType, "inspiration_pattern">;
    businessField?: CampaignCueInboxBusinessField;
    recommendedStatus: "active" | "needs_review";
    reason: string;
}

export interface CampaignCueInboxParseResult {
    blocked: boolean;
    candidates: CampaignCueInboxCandidate[];
    notices: string[];
}

export interface CampaignCueInboxConfirmResult {
    batchId: string;
    sourceInputs: CampaignCueSourceInput[];
    sourceSnapshot: CampaignCueSourceSnapshot;
}

export interface CampaignCueSourceFact {
    id: string;
    label: string;
    value: string;
    sourceRef: string;
    sourceType: "business_profile" | "contact" | "menu_or_service" | "offer" | "event" | "asset" | "policy" | "manual";
    confidence: CampaignCueMetricConfidence;
    freshness: "fresh" | "stale" | "unknown";
    risk: "low" | "needs_review" | "blocked";
}

export interface CampaignCueOpportunity extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    businessBrainId: string;
    title: string;
    reason: string;
    type:
        | "menu_push"
        | "booking_fill"
        | "source_fix"
        | "weekly_pack"
        | "video_prompt"
        | "ad_handoff"
        | "stale_profile"
        | "asset_rights"
        | "local_variant"
        | "outcome_followup"
        | "local_visibility"
        | "review_request"
        | "retention";
    priority: number;
    channels: CampaignCueChannel[];
    sourceReferences: string[];
    status: CampaignCueOpportunityStatus;
    actionLabel: string;
    ownerBenefit: string;
    evidence: string[];
    locationId?: string;
}

export interface CampaignCueOutputFields {
    headline: string;
    body: string;
    cta: string;
    imageBrief: string;
    dimensions: string;
    postType: "whatsapp_message" | "google_update" | "social_post" | "reel_brief" | "creator_script" | "ad_handoff" | "manual_task";
    consentNote: string;
    policyNote: string;
    destination: string;
    utm: string;
    approvalNote: string;
    manualSteps: string[];
    ownerUseCase?: string;
    outputFormats?: string[];
    printFormats?: string[];
    photoTasks?: string[];
    reviewChecklist?: string[];
    handoffFields?: CampaignCueManualDeliveryField[];
}

export interface CampaignCueOutput {
    id: string;
    channel: CampaignCueChannel;
    label: string;
    mode: CampaignCueOutputMode;
    text: string;
    sourceReferences: string[];
    providerMode: CampaignCueProviderMode;
    trustGate: CampaignCueTrustGate;
    fields: CampaignCueOutputFields;
    metadata?: Record<string, unknown>;
}

export interface CampaignCueApprovalComment {
    id: string;
    requestRevision: number;
    authorId: string;
    authorRole: CampaignCueWorkspaceRole;
    note: string;
    status: "open" | "resolved";
    outputId?: string;
    locationId?: string;
    createdAt: unknown;
    resolvedAt?: unknown;
    resolvedBy?: string;
}

export interface CampaignCueApprovalInbox {
    requestId: string;
    requestRevision: number;
    status: "requested" | "approved" | "rejected";
    requestedBy: string;
    requestedAt: unknown;
    outputId?: string;
    locationId?: string;
    comments: CampaignCueApprovalComment[];
    decidedBy?: string;
    decidedAt?: unknown;
    decisionNote?: string;
    updatedAt: unknown;
}

export interface CampaignCueCampaign extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    businessBrainId: string;
    opportunityId?: string;
    title: string;
    brief: string;
    status: CampaignCueCampaignStatus;
    channels: CampaignCueChannel[];
    outputs: CampaignCueOutput[];
    sourceSnapshotId?: string;
    trustReportId?: string;
    trustGate: CampaignCueTrustGate;
    credits: {
        estimate: number;
        reserved: number;
        captured: number;
        refunded: number;
        currency: "credits";
    };
    actionCounts: Partial<Record<CampaignCueActionType, number>>;
    ownerApprovalState: "not_requested" | "requested" | "approved" | "rejected";
    approvalInbox?: CampaignCueApprovalInbox;
    locationId?: string;
    variantGroupId?: string;
    variantRootCampaignId?: string;
    exportArchive?: CampaignCueExportArchivePointer;
    exportArchiveUploadLease?: CampaignCueExportArchiveUploadLease;
    pack?: {
        ownerGoal: CampaignCueDailyDeskOwnerGoal;
        reason: string;
        recipeId?: string;
        decision?: CampaignCueDecision;
        sourceFactIds: string[];
        missingInputIds: string[];
        deliveryCardIds: string[];
        resultQuestion: string;
        patternCueSourceInputId?: string;
        patternCueSourceHash?: string;
        reusedFromCampaignId?: string;
        reuseRootCampaignId?: string;
        refreshGeneration?: number;
        reuseMode?: "rebuild_from_current_truth";
        sourceTemplateId?: string;
        outputIntentId?: CampaignCueOutputIntentId;
        requestedOutputTypes?: CampaignCueDecisionOutputType[];
        locationSnapshot?: CampaignCueLocationTruthSnapshot;
        freshness?: CampaignCuePackFreshness;
        commercialGate?: CampaignCueCommercialGate;
        experiment?: CampaignCueExperimentSuggestion;
        offerPage?: CampaignCueCampaignOfferPagePointer;
    };
    resultMemory?: {
        lastSignalId?: string;
        lastNote?: string;
        lastRecordedAt?: unknown;
        usefulCount?: number;
        notUsefulCount?: number;
        lastReceipt?: CampaignCueResultReceipt;
        externalEvidenceCount?: number;
        latestExternalEvidence?: CampaignCueReadOnlyResultEvidence;
    };
}

export interface CampaignCueResultMetrics {
    replies?: number;
    calls?: number;
    bookings?: number;
    orders?: number;
    walkIns?: number;
    linkClicks?: number;
}

export type CampaignCueResultEvidenceProvider = typeof CAMPAIGNCUE_RESULT_EVIDENCE_PROVIDERS[number];
export type CampaignCueResultEvidenceScope = typeof CAMPAIGNCUE_RESULT_EVIDENCE_SCOPES[number];
export type CampaignCueResultEvidenceMetric = typeof CAMPAIGNCUE_RESULT_EVIDENCE_METRICS[number];

export type CampaignCueResultEvidenceMetrics = Partial<Record<CampaignCueResultEvidenceMetric, number>>;

export interface CampaignCueResultEvidenceInput {
    provider: CampaignCueResultEvidenceProvider;
    scope: CampaignCueResultEvidenceScope;
    periodStart: string;
    periodEnd: string;
    metrics: CampaignCueResultEvidenceMetrics;
    note?: string;
}

export interface CampaignCueReadOnlyResultEvidence extends CampaignCueResultEvidenceInput {
    schemaVersion: 1;
    source: "owner_copied_report" | "provider_api";
    confidence: "manual" | "imported";
    attribution: "directional_not_campaign_attribution";
    sourceFingerprint: string;
    connectionId?: string;
    recordedAt?: unknown;
}

export interface CampaignCueResultReceipt {
    signalId?: string;
    channel?: CampaignCueChannel;
    usedAt?: unknown;
    metrics: CampaignCueResultMetrics;
    evidenceNote?: string;
    experimentVariable?: CampaignCueExperimentVariable;
    confidence: "owner_reported";
    recordedAt?: unknown;
    videoProjectId?: string;
    videoRenderReceiptId?: string;
    videoProjectVersion?: number;
    videoFormatSignature?: string;
}

export type CampaignCueCampaignMemoryConfidence =
    | "not_enough_results"
    | "early_signal"
    | "repeated_signal";

export interface CampaignCueCampaignMemorySignal {
    dimension: "recipe" | "channel";
    key: string;
    sampleCount: number;
    usefulCount: number;
    notUsefulCount: number;
    notUsedCount: number;
    metrics: CampaignCueResultMetrics;
    confidence: CampaignCueCampaignMemoryConfidence;
    lastCampaignId?: string;
    lastSignalId?: string;
    lastRecordedAt?: unknown;
}

export interface CampaignCueCampaignMemorySummary {
    schemaVersion: 1;
    sourceConfidence: "owner_reported";
    coverage: "from_activation" | "bounded_recent_campaigns";
    totalReceiptCount: number;
    usefulCount: number;
    notUsefulCount: number;
    notUsedCount: number;
    metrics: CampaignCueResultMetrics;
    confidence: CampaignCueCampaignMemoryConfidence;
    recipeSignals: CampaignCueCampaignMemorySignal[];
    channelSignals: CampaignCueCampaignMemorySignal[];
    lastCampaignId?: string;
    lastSignalId?: string;
    lastRecordedAt?: unknown;
}

export interface CampaignCueCampaignMemoryView {
    status: "empty" | "learning" | "usable" | "review";
    confidence: CampaignCueCampaignMemoryConfidence;
    coverage: CampaignCueCampaignMemorySummary["coverage"];
    ownerSummary: string;
    sourceLabel: "Owner-reported results";
    topRecipe?: CampaignCueCampaignMemorySignal;
    topChannel?: CampaignCueCampaignMemorySignal;
    cautions: string[];
    nextAction: string;
    costPolicy: {
        firestoreReads: 0;
        firestoreWrites: 0;
        providerCalls: 0;
        summary: string;
    };
}

export interface CampaignCuePackFreshness {
    sourceHash: string;
    status: "current" | "stale" | "expired" | "unknown";
    validatedAt?: unknown;
    expiresAt?: unknown;
    recheckActions: Array<"download" | "export" | "archive_export" | "mark_used" | "schedule">;
}

export interface CampaignCueCommercialGate {
    status: CampaignCueCommercialGateStatus;
    findings: string[];
}

export interface CampaignCueExperimentSuggestion {
    variable: CampaignCueExperimentVariable;
    instruction: string;
    reason: string;
    status?: "suggested" | "accepted" | "completed";
    source?: "deterministic_rules";
    confidence?: "guidance_only" | "owner_history";
    baselineCampaignId?: string;
    keepConstant?: CampaignCueExperimentVariable[];
    evidence?: string[];
    measurement?: {
        question: string;
        resultSignalIds: string[];
    };
    predictionBoundary?: "no_performance_prediction";
    acceptedAt?: unknown;
    completedAt?: unknown;
    completedResultSignalId?: string;
}

export interface CampaignCueTrustFinding {
    id: string;
    severity: CampaignCueTrustSeverity;
    ruleId: string;
    message: string;
    recommendation: string;
    sourceReferences: string[];
}

export interface CampaignCueTrustReport extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    campaignId: string;
    outputVersionId: string;
    gate: CampaignCueTrustGate;
    ruleVersion: string;
    findings: CampaignCueTrustFinding[];
}

export interface CampaignCueAsset extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    locationId?: string;
    name: string;
    assetType: "image" | "video" | "audio" | "document" | "logo" | "export";
    status: "ready" | "blocked" | "archived";
    source: "upload" | "generated" | "imported" | "manual";
    rights: {
        status: "confirmed" | "needs_review" | "restricted";
        note?: string;
        consentType?: "not_applicable" | "owner_confirmed" | "creator_release" | "customer_release" | "unknown";
        expiresAt?: unknown;
    };
    tags: string[];
    file?: {
        storagePath?: string;
        storageGeneration?: string;
        downloadUrl?: string;
        mimeType?: string;
        sizeBytes?: number;
        previewStoragePath?: string;
        previewStorageGeneration?: string;
        previewMimeType?: "image/png" | "image/webp" | "image/jpeg";
        previewSizeBytes?: number;
        width?: number;
        height?: number;
        durationSeconds?: number;
    };
    usageRefs: Array<{
        campaignId?: string;
        outputId?: string;
        channel?: CampaignCueChannel;
    }>;
}

export interface CampaignCueSchedule extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    campaignId: string;
    outputId?: string;
    channel: CampaignCueChannel;
    mode: "manual_task";
    status: "scheduled" | "due" | "completed" | "failed" | "cancelled";
    scheduledAt: unknown;
    timezone: string;
    note: string;
    taskType?: "post" | "print" | "staff_share" | "follow_up" | "result_check";
    assigneeLabel?: string;
    completionNote?: string;
    completedAt?: unknown;
}

export interface CampaignCueAnalyticsSummary extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    campaignCount: number;
    usedCount: number;
    exportCount: number;
    approvalRequestCount: number;
    manualFallbackCount: number;
    ownerReportedOutcomeCount: number;
    latestEventAt?: unknown;
    confidence: CampaignCueMetricConfidence;
    campaignMemory?: CampaignCueCampaignMemorySummary;
}

export interface CampaignCueLaunchReadiness {
    status: "ready_in_repo" | "blocked_external_setup";
    checks: Array<{
        id: string;
        label: string;
        status: "ready" | "blocked" | "manual";
        detail: string;
    }>;
}

export interface CampaignCueDeliveryPolicy {
    activeMode: "export_download_only";
    allowedActions: CampaignCueActionType[];
    disabledProviderActions: CampaignCueDisabledProviderActionType[];
    dayOneSummary: string;
    futureProviderSummary: string;
    activationGate: string[];
}

export interface CampaignCueProviderStatus {
    provider: "whatsapp" | "google_business_profile" | "google_ads" | "meta_ads" | "video_render";
    label: string;
    mode: CampaignCueProviderMode;
    status: "available" | "manual_only" | "disabled";
    reason: string;
}

export interface CampaignCueProviderConnection extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    provider: CampaignCueProviderStatus["provider"];
    label: string;
    mode: CampaignCueProviderMode;
    status: "manual_only" | "setup_requested" | "blocked" | "disabled";
    requestedBy?: string;
    reason: string;
}

export interface CampaignCueDecisionScore {
    relevance: number;
    urgency: number;
    expectedImpact: number;
    factReadiness: number;
    assetReadiness: number;
    channelReadiness: number;
    resultMemoryBoost: number;
    ownerEffortPenalty: number;
    repetitionPenalty: number;
    trustRiskPenalty: number;
    finalScore: number;
}

export interface CampaignCueDecisionMissingInput {
    type: CampaignCueDailyDeskMissingInputType;
    ownerQuestion: string;
    required: boolean;
    unlocks: CampaignCueDecisionOutputType[];
}

export interface CampaignCueDecisionFactsUsed {
    businessFactRefs: string[];
    offerFactRefs: string[];
    contactFactRefs: string[];
    locationFactRefs: string[];
    assetRefs: string[];
    resultMemoryRefs: string[];
}

export interface CampaignCueDecisionRecommendedOutput {
    outputType: CampaignCueDecisionOutputType;
    reason: string;
}

export interface CampaignCueDecisionExplanation {
    whyThis: string[];
    whyNow: string[];
    whyNotOthers: string[];
    risks: string[];
}

export interface CampaignCueDecisionTrustPreflight {
    status: "ready" | "needs_review" | "blocked";
    findings: string[];
}

export interface CampaignCueDecision {
    decisionId: string;
    workspaceId: string;
    businessBrainId: string;
    recommendationTitle: string;
    ownerGoal: CampaignCueDailyDeskOwnerGoal;
    recipeId: string;
    opportunityId?: string;
    decisionStatus: CampaignCueDecisionStatus;
    confidence: CampaignCueDecisionConfidence;
    factsUsed: CampaignCueDecisionFactsUsed;
    missingInputs: CampaignCueDecisionMissingInput[];
    score: CampaignCueDecisionScore;
    explanation: CampaignCueDecisionExplanation;
    recommendedOutputs: CampaignCueDecisionRecommendedOutput[];
    trustPreflight: CampaignCueDecisionTrustPreflight;
    ownerPrimaryActionLabel: string;
    commercialGate?: CampaignCueCommercialGate;
    experiment?: CampaignCueExperimentSuggestion;
    pulseEvidence?: string[];
}

export interface CampaignCueDailyDeskTask {
    id: string;
    kind: CampaignCueDailyDeskTaskKind;
    label: string;
    detail: string;
    actionLabel: string;
    targetTab: CampaignCueDailyDeskActionTarget;
    severity: "ready" | "info" | "warning" | "needs_fix";
    sourceReferences: string[];
    inputType?: CampaignCueDailyDeskMissingInputType;
    ownerGoal?: CampaignCueDailyDeskOwnerGoal;
    resultOptions?: CampaignCueDailyDeskResultSignal[];
}

export interface CampaignCueManualDeliveryField {
    id: string;
    label: string;
    value: string;
    copyable: boolean;
    required: boolean;
    status: "ready" | "needs_review" | "missing";
}

export interface CampaignCueManualDeliveryCard {
    id: string;
    campaignId?: string;
    outputId?: string;
    channel: CampaignCueChannel;
    title: string;
    ownerUseCase: string;
    status: "ready" | "needs_review" | "blocked";
    fields: CampaignCueManualDeliveryField[];
    instructions: string[];
}

export interface CampaignCueTrustSummaryItem {
    id: string;
    label: string;
    detail: string;
    status: "ready" | "needs_review" | "blocked";
}

export interface CampaignCueLocalVisibilityCue {
    id: string;
    category: "identity" | "destination" | "profile" | "content" | "freshness" | "asset" | "reputation";
    label: string;
    detail: string;
    actionLabel: string;
    status: "ready" | "needs_review" | "missing";
    priority: "do_now" | "review" | "ready";
    targetTab: CampaignCueDailyDeskActionTarget;
    actionKind: "open_tab" | "create_visibility_pack";
    evidenceLevel: "business_truth" | "derived_readiness";
    evidence: string[];
    manualSteps: string[];
    unlocks: string[];
    completionSource: "business_brain" | "source_input" | "campaign_pack" | "asset_library" | "location";
    sourceReferences: string[];
}

export interface CampaignCuePresencePassportItem {
    id: string;
    label: string;
    destination?: string;
    status: "ready" | "needs_review" | "missing";
    manualAction: string;
}

export type CampaignCueOutputPackStatus = "ready" | "needs_input" | "needs_review" | "blocked";

export interface CampaignCuePackReadinessCheck {
    id: "facts" | "trust" | "freshness" | "approval" | "delivery";
    label: string;
    detail: string;
    status: CampaignCueOutputPackStatus;
    points: 0 | 10 | 20;
}

export interface CampaignCuePackReadiness {
    label: "Pack readiness";
    score: number;
    status: CampaignCueOutputPackStatus;
    summary: string;
    checks: CampaignCuePackReadinessCheck[];
    predictionBoundary: "readiness_only_no_engagement_prediction";
}

export interface CampaignCueCampaignReuseCandidate {
    campaignId: string;
    title: string;
    recipeId: string;
    reason: string;
    positiveEvidence: string[];
    sourceConfidence: "owner_reported";
    confidence: CampaignCueCampaignMemoryConfidence;
    currentFit: "recommended_now" | "available_after_review";
    seasonalContext?: string;
    sourceLastResultAt?: unknown;
    refreshRootCampaignId: string;
    refreshGeneration: number;
    recheckActions: CampaignCuePackFreshness["recheckActions"];
    actionLabel: "Reuse safely";
    mode: "rebuild_from_current_truth";
}

export interface CampaignCueCampaignRhythm {
    status:
        | "approval_due"
        | "result_due"
        | "task_due"
        | "scheduled"
        | "reuse_ready"
        | "pack_ready"
        | "prepare_next";
    title: string;
    detail: string;
    primaryAction: {
        label: string;
        targetTab: CampaignCueDailyDeskActionTarget;
        kind: CampaignCueDailyDeskTaskKind;
    };
    dueTaskCount: number;
    scheduledTaskCount: number;
    nextScheduledAt?: unknown;
    approvalCampaignId?: string;
    resultCampaignId?: string;
    reuseCandidate?: CampaignCueCampaignReuseCandidate;
    suggestedUse: string;
    followUp: string;
    costPolicy: {
        firestoreReads: 0;
        firestoreWrites: 0;
        providerCalls: 0;
        summary: string;
    };
}

export type CampaignCueOutputPackCopyChannel =
    | CampaignCueChannel
    | "email_sms"
    | "staff"
    | "mini_page"
    | "proof_deck"
    | "instructions"
    | "trust"
    | "result_memory";
export type CampaignCueOutputPackFileType =
    | "text"
    | "markdown"
    | "json"
    | "image_brief"
    | "pdf_brief"
    | "link_brief";
export type CampaignCueOutputPackExportFormat = "png" | "jpeg" | "pdf_flattened" | "text_brief";
export type CampaignCueAIAssistStage =
    | "source_intake"
    | "missing_input"
    | "pack_drafting"
    | "trust_explainer"
    | "result_interpreter"
    | "photo_coach";
export type CampaignCueAIAssistAuthority =
    | "deterministic"
    | "model_candidate_only"
    | "owner_approval_required";
export type CampaignCueAIAssistCostTier = "none" | "low" | "vision" | "premium";

export interface CampaignCueAIAssistItem {
    id: string;
    stage: CampaignCueAIAssistStage;
    label: string;
    ownerValue: string;
    currentInput: string;
    suggestedAction: string;
    targetTab: CampaignCueDailyDeskActionTarget;
    status: CampaignCueOutputPackStatus;
    authority: CampaignCueAIAssistAuthority;
    providerCallAllowed: boolean;
    costTier: CampaignCueAIAssistCostTier;
    sourceReferences: string[];
    guardrails: string[];
}

export interface CampaignCueAIAssistancePlan {
    status: CampaignCueOutputPackStatus;
    items: CampaignCueAIAssistItem[];
    nextBestAction: {
        label: string;
        targetTab: CampaignCueDailyDeskActionTarget;
        detail: string;
    };
    costPolicy: {
        firestoreReads: 0;
        firestoreWrites: 0;
        firestoreDeletes: 0;
        storageWrites: 0;
        providerCalls: 0;
        summary: string;
    };
    providerPolicy: {
        modelDecidesCampaign: false;
        modelMutatesFacts: false;
        ownerApprovalRequired: true;
        summary: string;
    };
}

export interface CampaignCueOutputPackMissingInput {
    type: CampaignCueDailyDeskMissingInputType;
    ownerQuestion: string;
    required: boolean;
    unlocks: string[];
}

export interface CampaignCueOutputPackFile {
    path: string;
    label: string;
    fileType: CampaignCueOutputPackFileType;
    status: CampaignCueOutputPackStatus;
    content: string;
    sourceOutputId?: string;
}

export interface CampaignCueOutputPackCopyBlock {
    id: string;
    channel: CampaignCueOutputPackCopyChannel;
    label: string;
    value: string;
    status: CampaignCueOutputPackStatus;
    sourceOutputId?: string;
}

export interface CampaignCueOutputPackVisualAsset {
    channel: CampaignCueOutputPackCopyChannel;
    size: string;
    exportFormat: CampaignCueOutputPackExportFormat;
    assetRef: string;
    status: CampaignCueOutputPackStatus;
    note: string;
}

export interface CampaignCueOutputPackDeliveryCard {
    id: string;
    channel: CampaignCueOutputPackCopyChannel;
    title: string;
    files: string[];
    copyBlocks: string[];
    manualSteps: string[];
    status: CampaignCueOutputPackStatus;
}

export interface CampaignCueOutputPackProofDeck {
    status: CampaignCueOutputPackStatus;
    title: string;
    sections: CampaignCueOutputPackCopyBlock[];
    filePath: string;
    manualNote: string;
}

export interface CampaignCueOutputPack {
    packId: string;
    campaignId: string;
    businessBrainId: string;
    title: string;
    decision: {
        title: string;
        ownerGoal: CampaignCueDailyDeskOwnerGoal;
        whyThis: string[];
        whyNow: string[];
        confidence: CampaignCueOutputPackStatus;
        riskState: CampaignCueOutputPackStatus;
        outputIntent?: {
            id: CampaignCueOutputIntentId;
            title: string;
            requestedOutputTypes: CampaignCueDecisionOutputType[];
        };
    };
    facts: {
        usedFactRefs: string[];
        missingInputs: CampaignCueOutputPackMissingInput[];
    };
    creative: {
        editableDocumentRef?: string;
        visualAssets: CampaignCueOutputPackVisualAsset[];
    };
    copy: {
        whatsapp: CampaignCueOutputPackCopyBlock[];
        googleBusinessProfile: CampaignCueOutputPackCopyBlock[];
        instagram: CampaignCueOutputPackCopyBlock[];
        emailSms: CampaignCueOutputPackCopyBlock[];
        adsHandoff: CampaignCueOutputPackCopyBlock[];
        staff: CampaignCueOutputPackCopyBlock[];
        instructions: CampaignCueOutputPackCopyBlock[];
    };
    deliveryCards: CampaignCueOutputPackDeliveryCard[];
    readiness: CampaignCuePackReadiness;
    trustReport: {
        status: "ready" | "needs_review" | "blocked";
        checked: string[];
        warnings: string[];
        blockedReasons: string[];
    };
    freshness: CampaignCuePackFreshness;
    commercialSafety: CampaignCueCommercialGate;
    language: {
        sourceLocale: string;
        targetLocales: string[];
        protectedFactReviewRequired: true;
        manualNote: string;
    };
    presencePassport: {
        status: CampaignCueOutputPackStatus;
        profiles: CampaignCuePresencePassportItem[];
    };
    staffExecution: {
        assigneeLabel?: string;
        steps: string[];
        completionPrompt: string;
    };
    learning: CampaignCueExperimentSuggestion;
    reuse: {
        assetLibraryRefs: string[];
        cueLayersSourcePackageRefs: string[];
        editableAgain: boolean;
        notes: string[];
    };
    miniPage: {
        status: CampaignCueOutputPackStatus;
        slug: string;
        publicPath?: string;
        publicUrl?: string;
        title: string;
        fields: CampaignCueOutputPackCopyBlock[];
        qrCodeStatus: CampaignCueOutputPackStatus;
        manualNote: string;
    };
    proofDeck: CampaignCueOutputPackProofDeck;
    calendar: {
        suggestedUse: string;
        followUp: string;
        resultReminder: string;
    };
    rhythm: CampaignCueCampaignRhythm;
    resultMemory: {
        question: string;
        options: CampaignCueDailyDeskResultSignal[];
    };
    aiAssistance: CampaignCueAIAssistancePlan;
    nextActions: CampaignCueDailyDeskTask[];
    downloadBundle: {
        rootFolder: string;
        files: CampaignCueOutputPackFile[];
    };
}

export interface CampaignCueCampaignPackReview {
    campaignId: string;
    title: string;
    ownerGoal: CampaignCueDailyDeskOwnerGoal;
    decision?: CampaignCueDecision;
    reason: string;
    sourceFacts: CampaignCueSourceFact[];
    missingInputs: CampaignCueDailyDeskTask[];
    trustSummary: CampaignCueTrustSummaryItem[];
    deliveryCards: CampaignCueManualDeliveryCard[];
    resultQuestion: string;
    resultOptions: CampaignCueDailyDeskResultSignal[];
    localVisibilityCues: CampaignCueLocalVisibilityCue[];
    outputPack: CampaignCueOutputPack;
}

export interface CampaignCueDailyDeskPackSummary {
    campaignId: string;
    title: string;
    trustGate: CampaignCueTrustGate;
    status: CampaignCueCampaignStatus;
    outputsReady: number;
    outputFormats: string[];
    printFormats: string[];
    photoTasks: string[];
    manualSteps: string[];
    manualDeliveryTasks: string[];
    ownerGoal: CampaignCueDailyDeskOwnerGoal;
    plainAction: string;
    resultQuestion: string;
    resultOptions: CampaignCueDailyDeskResultSignal[];
    primaryOutputId?: string;
}

export interface CampaignCueDailyDesk {
    generatedAt: string;
    recipe: CampaignCueDailyDeskRecipe;
    decision: CampaignCueDecision;
    candidateDecisions: CampaignCueDecision[];
    primaryOpportunity?: CampaignCueOpportunity;
    missingInputs: CampaignCueDailyDeskTask[];
    assetReuseTasks: CampaignCueDailyDeskTask[];
    manualDeliveryTasks: CampaignCueDailyDeskTask[];
    photoTasks: CampaignCueDailyDeskTask[];
    printTasks: CampaignCueDailyDeskTask[];
    localVisibilityCues: CampaignCueLocalVisibilityCue[];
    packReview?: CampaignCueCampaignPackReview;
    outputPack?: CampaignCueOutputPack;
    readyPack?: CampaignCueDailyDeskPackSummary;
    aiAssistance: CampaignCueAIAssistancePlan;
    rhythm: CampaignCueCampaignRhythm;
    resultPrompt?: CampaignCueDailyDeskTask;
    approvalPrompt?: CampaignCueDailyDeskTask;
    locationPrompt?: CampaignCueDailyDeskTask;
    summary: {
        title: string;
        detail: string;
        actionLabel: string;
        targetTab: CampaignCueDailyDeskActionTarget;
        actionKind: CampaignCueDailyDeskTaskKind;
        blockerCount: number;
        warningCount: number;
        readyOutputCount: number;
    };
}

export interface CampaignCueOverview {
    workspace: CampaignCueWorkspace;
    businessBrain: CampaignCueBusinessBrain;
    sourceInputs: CampaignCueSourceInput[];
    opportunities: CampaignCueOpportunity[];
    campaigns: CampaignCueCampaign[];
    assets: CampaignCueAsset[];
    schedules: CampaignCueSchedule[];
    locations: CampaignCueLocation[];
    analytics: CampaignCueAnalyticsSummary;
    campaignMemory: CampaignCueCampaignMemoryView;
    providers: CampaignCueProviderStatus[];
    providerConnections: CampaignCueProviderConnection[];
    deliveryPolicy: CampaignCueDeliveryPolicy;
    dailyDesk: CampaignCueDailyDesk;
    launchReadiness: CampaignCueLaunchReadiness;
    sourceHash: string;
    sourceFacts: CampaignCueSourceFact[];
    cost: {
        readsPerLoad: number;
        writesPerCampaignCreate: number;
        realtimeListeners: number;
        notes: string[];
    };
}
