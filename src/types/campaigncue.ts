import type { CAMPAIGNCUE_CHANNELS } from "@constant/campaigncue/channels";

export type CampaignCueChannel = typeof CAMPAIGNCUE_CHANNELS[number];

export type CampaignCueWorkspaceRole =
    | "owner"
    | "admin"
    | "marketer"
    | "reviewer"
    | "local_manager"
    | "agency_member"
    | "billing_admin";

export type CampaignCueBusinessType = "restaurant" | "salon" | "multi_location" | "agency_client";

export type CampaignCueReadinessStatus = "ready" | "limited" | "blocked";
export type CampaignCueOpportunityStatus = "open" | "accepted" | "dismissed";
export type CampaignCueCampaignStatus = "draft" | "generated" | "scheduled" | "used" | "archived";
export type CampaignCueTrustGate = "clear" | "warning" | "needs_fix" | "blocked";
export type CampaignCueTrustSeverity = "info" | "warning" | "needs_fix" | "blocked";
export type CampaignCueMetricConfidence = "observed" | "imported" | "manual" | "estimated";
export type CampaignCueProviderMode = "manual_export" | "manual_fallback" | "manual_handoff" | "brief_only" | "disabled";
export type CampaignCueOutputMode = "draft" | "manual_export" | "manual_handoff" | "brief" | "schedule_task";

export type CampaignCueActionType =
    | "copy"
    | "download"
    | "export"
    | "mark_used"
    | "request_approval"
    | "schedule"
    | "direct_publish"
    | "direct_send";

export interface CampaignCueTimestamped {
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface CampaignCueWorkspace extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    productId: "campaigncue";
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
        directPublishingEnabled: boolean;
        providerGenerationEnabled: boolean;
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
}

export interface CampaignCueOpportunity extends CampaignCueTimestamped {
    id: string;
    workspaceId: string;
    businessBrainId: string;
    title: string;
    reason: string;
    type: "menu_push" | "booking_fill" | "source_fix" | "weekly_pack" | "video_prompt" | "ad_handoff";
    priority: number;
    channels: CampaignCueChannel[];
    sourceReferences: string[];
    status: CampaignCueOpportunityStatus;
    locationId?: string;
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
        expiresAt?: unknown;
    };
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
    mode: "manual_task" | "direct_publish_disabled";
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
    latestEventAt?: unknown;
    confidence: CampaignCueMetricConfidence;
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
    cost: {
        readsPerLoad: number;
        writesPerCampaignCreate: number;
        realtimeListeners: number;
        notes: string[];
    };
}
