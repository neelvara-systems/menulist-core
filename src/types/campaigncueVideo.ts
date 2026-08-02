import type { CampaignCueTrustGate } from "./campaigncue";

export type CampaignCueVideoAspectRatio = "9:16" | "1:1" | "16:9";
export type CampaignCueVideoMotion = "none" | "pan_left" | "pan_right" | "zoom_in" | "zoom_out";
export type CampaignCueVideoTransition = "cut" | "fade" | "slide";
export type CampaignCueVideoProjectStatus = "draft" | "approved" | "rejected";
export type CampaignCueVideoRenderStatus = "started" | "completed" | "failed" | "cancelled";
export type CampaignCueVideoResultSignal = "useful" | "not_useful" | "not_used";

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

export interface CampaignCueVideoRenderReceipt {
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

export interface CampaignCueVideoResultMemory {
    signalId: CampaignCueVideoResultSignal;
    renderReceiptId: string;
    note?: string;
    recordedBy: string;
    recordedAt?: unknown;
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
        receipt: Omit<CampaignCueVideoRenderReceipt, "createdAt" | "completedAt">;
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
