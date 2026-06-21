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
export type CampaignCueMetricConfidence = "observed" | "imported" | "manual" | "estimated";
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
}

export interface CampaignCueLocation extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    name: string;
    locality?: string;
    status: "active" | "draft" | "disabled";
    sourceRefs: string[];
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

export interface CampaignCueSourceInput extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    sourceType: "manual_note" | "menu_link" | "booking_link" | "offer" | "event" | "upload_metadata";
    label: string;
    value: string;
    status: "active" | "needs_review" | "archived";
    confidence: CampaignCueMetricConfidence;
    sourceRefs: string[];
    facts: CampaignCueSourceFact[];
    expiresAt?: unknown;
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
        | "local_visibility";
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
    locationId?: string;
    pack?: {
        ownerGoal: CampaignCueDailyDeskOwnerGoal;
        reason: string;
        recipeId?: string;
        decision?: CampaignCueDecision;
        sourceFactIds: string[];
        missingInputIds: string[];
        deliveryCardIds: string[];
        resultQuestion: string;
    };
    resultMemory?: {
        lastSignalId?: string;
        lastNote?: string;
        lastRecordedAt?: unknown;
        usefulCount?: number;
        notUsefulCount?: number;
    };
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
    name: string;
    assetType: "image" | "video" | "document" | "logo" | "export";
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
        downloadUrl?: string;
        mimeType?: string;
        sizeBytes?: number;
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
    label: string;
    detail: string;
    actionLabel: string;
    status: "ready" | "needs_review" | "missing";
    targetTab: CampaignCueDailyDeskActionTarget;
    sourceReferences: string[];
}

export type CampaignCueOutputPackStatus = "ready" | "needs_input" | "needs_review" | "blocked";
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
    trustReport: {
        status: "ready" | "needs_review" | "blocked";
        checked: string[];
        warnings: string[];
        blockedReasons: string[];
    };
    reuse: {
        assetLibraryRefs: string[];
        cueLayersSourcePackageRefs: string[];
        editableAgain: boolean;
        notes: string[];
    };
    miniPage: {
        status: CampaignCueOutputPackStatus;
        slug: string;
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
    resultMemory: {
        question: string;
        options: CampaignCueDailyDeskResultSignal[];
    };
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
    providers: CampaignCueProviderStatus[];
    providerConnections: CampaignCueProviderConnection[];
    deliveryPolicy: CampaignCueDeliveryPolicy;
    dailyDesk: CampaignCueDailyDesk;
    launchReadiness: CampaignCueLaunchReadiness;
    sourceFacts: CampaignCueSourceFact[];
    cost: {
        readsPerLoad: number;
        writesPerCampaignCreate: number;
        realtimeListeners: number;
        notes: string[];
    };
}
