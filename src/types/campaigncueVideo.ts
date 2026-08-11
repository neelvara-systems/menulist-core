import type { CampaignCueTrustGate } from "./campaigncue";

export type CampaignCueVideoAspectRatio = "9:16" | "1:1" | "16:9";
export type CampaignCueVideoMotion = "none" | "pan_left" | "pan_right" | "zoom_in" | "zoom_out";
export type CampaignCueVideoTransition = "cut" | "fade" | "slide";
export type CampaignCueVideoProjectStatus = "draft" | "approved" | "rejected";
export type CampaignCueVideoRenderStatus = "started" | "completed" | "failed" | "cancelled";
export type CampaignCueVideoResultSignal = "useful" | "not_useful" | "not_used";
export type CampaignCueVideoVersionBinding = "exact" | "legacy_unverified";
export type CampaignCueVideoHookType = "question" | "curiosity" | "demonstration" | "offer" | "story" | "direct_benefit";
export type CampaignCueVideoFormat = "talking_head" | "demonstration" | "montage" | "screen_recording" | "mixed";
export type CampaignCueVideoPacing = "calm" | "steady" | "fast";
export type CampaignCueVideoDurationBand = "under_15_seconds" | "15_to_30_seconds" | "31_to_60_seconds" | "over_60_seconds" | "unknown";

export interface CampaignCueVideoAudioTrack {
    mode: "none" | "asset" | "session_file";
    assetId?: string;
    volume: number;
}

export interface CampaignCueVideoAudioMix {
    voiceover: CampaignCueVideoAudioTrack;
    backgroundMusic: CampaignCueVideoAudioTrack;
    ducking: boolean;
}

export interface CampaignCueVideoScene {
    id: string;
    enabled: boolean;
    purpose: "hook" | "proof" | "detail" | "cta";
    script: string;
    overlay: string;
    caption: string;
    durationSeconds: number;
    motion: CampaignCueVideoMotion;
    transition: CampaignCueVideoTransition;
    assetId?: string;
    sourceReferences: string[];
}

export interface CampaignCueVideoCopyVariant {
    id: string;
    label: string;
    hook: string;
    caption: string;
    cta: string;
}

export interface CampaignCueVideoVersionSnapshot {
    version: number;
    aspectRatio: CampaignCueVideoAspectRatio;
    selectedVariantId: string;
    scenes: CampaignCueVideoScene[];
    captions: CampaignCueVideoProject["captions"];
    audio: CampaignCueVideoAudioMix;
    trustGate: CampaignCueTrustGate;
    trustFindings: CampaignCueVideoTrustFinding[];
    reviewedAssetIds: string[];
    createdAt?: unknown;
    createdByUserId: string;
}

interface CampaignCueVideoRenderReceiptBase {
    id: string;
    attempt: number;
    status: CampaignCueVideoRenderStatus;
    aspectRatio: CampaignCueVideoAspectRatio;
    mimeType?: "video/mp4" | "video/webm";
    durationSeconds: number;
    sizeBytes?: number;
    errorCode?: "browser_unsupported" | "media_decode_failed" | "recording_failed" | "download_failed" | "render_cancelled" | "render_interrupted";
    progressPercent: number;
    heartbeatAt?: unknown;
    rightsEvidence: {
        assetIds: string[];
        sessionMediaUsed: boolean;
        sessionMediaRightsConfirmed: boolean;
    };
    credit: {
        estimated: 0;
        reserved: 0;
        captured: 0;
        refunded: 0;
        currency: "credits";
    };
    createdAt?: unknown;
    completedAt?: unknown;
}

export type CampaignCueVideoRenderReceipt = CampaignCueVideoRenderReceiptBase & (
    | { versionBinding: "exact"; projectVersion: number }
    | { versionBinding: "legacy_unverified"; projectVersion?: never }
);

export interface CampaignCueVideoReviewNote {
    id: string;
    sceneId?: string;
    message: string;
    status: "open" | "resolved";
    authorId: string;
    createdAt?: unknown;
    resolvedAt?: unknown;
    resolvedBy?: string;
}

interface CampaignCueVideoResultMemoryBase {
    signalId: CampaignCueVideoResultSignal;
    renderReceiptId: string;
    note?: string;
    recordedBy: string;
    recordedAt?: unknown;
}

export type CampaignCueVideoResultMemory = CampaignCueVideoResultMemoryBase & (
    | {
        versionBinding: "exact";
        projectVersion: number;
        formatSignature: string;
        formatSnapshot: CampaignCueVideoFormatSnapshot;
    }
    | {
        versionBinding: "legacy_unverified";
        projectVersion?: never;
        formatSignature?: never;
        formatSnapshot?: never;
    }
);

export interface CampaignCueVideoFormatSnapshot {
    projectVersion: number;
    aspectRatio: CampaignCueVideoAspectRatio;
    hookType?: CampaignCueVideoHookType;
    format?: CampaignCueVideoFormat;
    pacing?: CampaignCueVideoPacing;
    durationBand: Exclude<CampaignCueVideoDurationBand, "over_60_seconds" | "unknown">;
    scenePurposes: CampaignCueVideoScene["purpose"][];
    durationSeconds: number;
}

export interface CampaignCueVideoFormatLearning {
    formatSignature: string;
    label: string;
    status: "use_again" | "avoid_for_now" | "insufficient_evidence";
    usefulCount: number;
    notUsefulCount: number;
    notUsedCount: number;
    summary: string;
}

export interface CampaignCueVideoContentCoachCheck {
    id: "opening_clarity" | "real_business_proof" | "pacing" | "text_density" | "cta_visibility" | "source_and_rights";
    label: string;
    status: "ready" | "review" | "fix";
    summary: string;
    recommendation: string;
    sceneId?: string;
}

export interface CampaignCueVideoContentCoach {
    projectVersion: number;
    status: "ready" | "needs_review" | "needs_fix";
    readyCount: number;
    reviewCount: number;
    fixCount: number;
    checks: CampaignCueVideoContentCoachCheck[];
}

export interface CampaignCueVideoCaptureTask {
    id: string;
    sceneId: string;
    title: string;
    direction: string;
    durationSeconds: number;
    status: "ready" | "record";
}

export interface CampaignCueVideoReusableBlueprint {
    sourceProjectId: string;
    sourceVersion: number;
    label: string;
    aspectRatio: CampaignCueVideoAspectRatio;
    captions: CampaignCueVideoProject["captions"];
    scenes: Array<Pick<CampaignCueVideoScene, "purpose" | "enabled" | "durationSeconds" | "motion" | "transition">>;
}

export interface CampaignCueVideoTrustFinding {
    id: string;
    severity: "info" | "warning" | "needs_fix" | "blocked";
    message: string;
    recommendation: string;
}

export interface CampaignCueVideoProject {
    id: string;
    workspaceId: string;
    campaignId: string;
    outputId: string;
    title: string;
    status: CampaignCueVideoProjectStatus;
    version: number;
    aspectRatio: CampaignCueVideoAspectRatio;
    selectedVariantId: string;
    variants: CampaignCueVideoCopyVariant[];
    scenes: CampaignCueVideoScene[];
    brand: {
        businessName: string;
        primaryColor: string;
        voice: "calm" | "friendly" | "premium" | "direct";
    };
    captions: {
        enabled: boolean;
        position: "top" | "center" | "bottom";
    };
    audio: CampaignCueVideoAudioMix;
    sourceReferences: string[];
    patternCue?: {
        sourceInputId: string;
        sourceHash: string;
        platform: "instagram" | "tiktok" | "youtube" | "other";
        rightsStatus: "reference_only" | "owner_authorized";
        hookType?: CampaignCueVideoHookType;
        format?: CampaignCueVideoFormat;
        pacing?: CampaignCueVideoPacing;
        durationBand?: CampaignCueVideoDurationBand;
    };
    trustGate: CampaignCueTrustGate;
    trustFindings: CampaignCueVideoTrustFinding[];
    approval?: {
        actorId: string;
        version: number;
        note?: string;
        decidedAt?: unknown;
    };
    reviewNotes: CampaignCueVideoReviewNote[];
    versions: CampaignCueVideoVersionSnapshot[];
    renderReceipts: CampaignCueVideoRenderReceipt[];
    resultMemory?: CampaignCueVideoResultMemory;
    reusableBlueprint?: CampaignCueVideoReusableBlueprint;
    cost: {
        providerCalls: 0;
        providerCredits: 0;
        renderer: "campaigncue_browser_compositor";
    };
    createdByUserId: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export type CampaignCueVideoProjectMutationInput =
    | {
        action: "create";
        campaignId: string;
        outputId: string;
        aspectRatio?: CampaignCueVideoAspectRatio;
        idempotencyKey: string;
    }
    | {
        action: "add_review_note";
        projectId: string;
        expectedVersion: number;
        sceneId?: string;
        message: string;
        idempotencyKey: string;
    }
    | {
        action: "resolve_review_note";
        projectId: string;
        expectedVersion: number;
        noteId: string;
        idempotencyKey: string;
    }
    | {
        action: "save";
        projectId: string;
        expectedVersion: number;
        title: string;
        aspectRatio: CampaignCueVideoAspectRatio;
        selectedVariantId: string;
        scenes: CampaignCueVideoScene[];
        captions: CampaignCueVideoProject["captions"];
        audio: CampaignCueVideoProject["audio"];
        idempotencyKey: string;
    }
    | {
        action: "approve" | "reject";
        projectId: string;
        expectedVersion: number;
        note?: string;
        idempotencyKey: string;
    }
    | {
        action: "render_receipt";
        projectId: string;
        expectedVersion: number;
        receipt: Omit<
            Extract<CampaignCueVideoRenderReceipt, { versionBinding: "exact" }>,
            "createdAt" | "completedAt"
        >;
        idempotencyKey: string;
    }
    | {
        action: "render_progress";
        projectId: string;
        expectedVersion: number;
        receiptId: string;
        attempt: number;
        progressPercent: number;
        idempotencyKey: string;
    }
    | {
        action: "record_result";
        projectId: string;
        expectedVersion: number;
        renderReceiptId: string;
        signalId: CampaignCueVideoResultSignal;
        note?: string;
        idempotencyKey: string;
    };
