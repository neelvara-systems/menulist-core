import type {
    CAMPAIGNCUE_CUE_LAYER_ASSET_RETENTION_CLASSES,
    CAMPAIGNCUE_CUE_LAYER_DESIGN_STATUSES,
    CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES,
    CAMPAIGNCUE_CUE_LAYER_JOB_STATUSES,
    CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES,
    CAMPAIGNCUE_CUE_LAYER_PROCESSING_STEPS,
    CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS,
} from "@constant/campaigncue/cueLayers";
import type { CreativeEditorDocument, CreativeEditorElementType } from "@/modules/creative-editor/types";

export type CampaignCueCueLayerSourceKind = typeof CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS[number];
export type CampaignCueCueLayerJobStatus = typeof CAMPAIGNCUE_CUE_LAYER_JOB_STATUSES[number];
export type CampaignCueCueLayerJobOutcome = typeof CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES[number];
export type CampaignCueCueLayerProcessingStep = typeof CAMPAIGNCUE_CUE_LAYER_PROCESSING_STEPS[number];
export type CampaignCueCueLayerDesignStatus = typeof CAMPAIGNCUE_CUE_LAYER_DESIGN_STATUSES[number];
export type CampaignCueCueLayerAssetRetentionClass = typeof CAMPAIGNCUE_CUE_LAYER_ASSET_RETENTION_CLASSES[number];
export type CampaignCueCueLayerModelCapability = typeof CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES[number];

export type CampaignCueCueLayerReleaseStage = "stable" | "preview" | "deprecated";
export type CampaignCueCueLayerCostTier = "low" | "medium" | "premium";

export interface CampaignCueCueLayerModelRegistryEntry {
    capabilities: CampaignCueCueLayerModelCapability[];
    costTier: CampaignCueCueLayerCostTier;
    enabled: boolean;
    modelId: string;
    provider: "google" | "internal" | "open_source";
    releaseStage: CampaignCueCueLayerReleaseStage;
    rolloutPercent: number;
}

export interface CampaignCueCueLayerAssetScope {
    designId: string;
    exportId?: string;
    jobId?: string;
    reconstructionId?: string;
    repairId?: string;
    sourcePackageId?: string;
    versionId?: string;
    workspaceId: string;
}

export interface CampaignCueCueLayerAssetRef {
    assetId: string;
    assetScope: CampaignCueCueLayerAssetScope;
    assetUri: string;
    contentType: string;
    height?: number;
    perceptualHash?: string;
    retentionClass: CampaignCueCueLayerAssetRetentionClass;
    sha256: string;
    sizeBytes?: number;
    storageGeneration?: string;
    storageMetageneration?: string;
    storagePath: string;
    width?: number;
}

export interface CampaignCueCueLayerRightsMetadata {
    containsLogo?: boolean;
    containsPerson?: boolean;
    sourceRightsStatus: "owner_uploaded_claimed" | "campaigncue_generated" | "unknown" | "needs_review" | "blocked";
    watermarkDetected?: boolean;
}

export interface CampaignCueCreativeSourcePackage {
    brandSnapshotAssetId?: string;
    businessTruthSnapshotAssetId?: string;
    createdAt?: unknown;
    createdByUserId: string;
    designId: string;
    designIntentManifestAssetId?: string;
    editorReferenceAssetId: string;
    height: number;
    mimeType: string;
    normalizedAssetId: string;
    originalAssetId: string;
    perceptualHash?: string;
    protectedTextTruthAssetId?: string;
    provenance: {
        fileName?: string;
        generatedFromCampaignId?: string;
        generatedFromOutputId?: string;
        promptVersionId?: string;
        providerFamily?: string;
        sourceHash: string;
    };
    rights: CampaignCueCueLayerRightsMetadata;
    rightsSnapshotAssetId?: string;
    schemaVersion: string;
    seedObservationAssetId?: string;
    sha256: string;
    sourceKind: CampaignCueCueLayerSourceKind;
    sourcePackageId: string;
    updatedAt?: unknown;
    width: number;
    workspaceId: string;
}

export interface CampaignCueCueLayerDesign {
    createdAt?: unknown;
    createdByUserId: string;
    current: {
        creativeEditorDocumentSnapshotAssetId?: string;
        editorProjectionAssetId?: string;
        layerIndexAssetId?: string;
        previewAssetId?: string;
        reconstructionAssetId?: string;
        revision: number;
        versionId?: string;
    };
    id: string;
    quality?: {
        textSafetyStatus?: "pass" | "blocked" | "downgraded" | "needs_review";
        visualMatchScore?: number;
        warningCount?: number;
    };
    source: {
        brandSnapshotAssetId?: string;
        businessTruthSnapshotAssetId?: string;
        currentSourcePackageAssetId: string;
        kind: CampaignCueCueLayerSourceKind;
        originalAssetId: string;
        protectedTextTruthAssetId?: string;
        rightsSnapshotAssetId?: string;
    };
    status: CampaignCueCueLayerDesignStatus;
    title: string;
    updatedAt?: unknown;
    workspaceId: string;
}

export interface CampaignCueCueLayerJob {
    attempt: number;
    completedAt?: unknown;
    createdAt?: unknown;
    createdByUserId: string;
    currentArtifactIds: Record<string, string>;
    designId: string;
    error?: {
        code?: string;
        safeMessage?: string;
    };
    id: string;
    idempotencyKey?: string;
    outcome?: CampaignCueCueLayerJobOutcome;
    progress: number;
    sourceKind: CampaignCueCueLayerSourceKind;
    sourcePackageAssetId: string;
    status: CampaignCueCueLayerJobStatus;
    step?: CampaignCueCueLayerProcessingStep;
    updatedAt?: unknown;
    workerLease?: {
        holder?: string;
        heartbeatAt?: unknown;
    };
    workspaceId: string;
}

export interface CampaignCueCueLayerReconstructionLayer {
    assetRefs: CampaignCueCueLayerAssetRef[];
    confidence: number;
    editableLevel:
        | "locked_reference"
        | "text_editable"
        | "vector_editable"
        | "raster_masked"
        | "raster_fallback"
        | "clean_background"
        | "unknown_confidence";
    fallback?: {
        assetId?: string;
        reason: string;
    };
    geometry: {
        height: number;
        width: number;
        x: number;
        y: number;
    };
    layerId: string;
    sourceObservationIds: string[];
    type: "text" | "shape" | "raster" | "background" | "logo" | "product" | "person" | "decoration" | "group_metadata" | "unknown";
    validation: {
        pixelFidelity: "pass" | "needs_review" | "flat_safe" | "failed";
        textFidelity: "pass" | "blocked" | "downgraded" | "needs_review";
    };
    warnings: string[];
    zIndex: number;
}

export interface CampaignCueCueLayerReconstructionDocument {
    designId: string;
    layers: CampaignCueCueLayerReconstructionLayer[];
    outcome: CampaignCueCueLayerJobOutcome;
    reconstructionId: string;
    schemaVersion: string;
    sourcePackageId: string;
    warnings: string[];
    workspaceId: string;
}

export interface CampaignCueCueLayerIndexEntry {
    assetRefs: CampaignCueCueLayerAssetRef[];
    editableLevel: CampaignCueCueLayerReconstructionLayer["editableLevel"];
    elementId: string;
    elementType: CreativeEditorElementType;
    fallbackAssetId?: string;
    layerId: string;
    ownerLabel: string;
    warnings: string[];
}

export interface CampaignCueCueLayerIndex {
    designId: string;
    entries: CampaignCueCueLayerIndexEntry[];
    reconstructionId: string;
    schemaVersion: string;
    workspaceId: string;
}

export interface CampaignCueCueLayerEditorProjection {
    designId: string;
    document: CreativeEditorDocument;
    layerIndexAssetId: string;
    projectionId: string;
    reconstructionId: string;
    schemaVersion: string;
    workspaceId: string;
}

export type CampaignCueCreativeEditorDocumentSnapshot = CreativeEditorDocument & {
    metadata?: CreativeEditorDocument["metadata"] & {
        cueLayers?: {
            designId: string;
            jobId?: string;
            outcome: CampaignCueCueLayerJobOutcome;
            reconstructionId: string;
            revision: number;
            sourcePackageId: string;
        };
    };
};

export interface CampaignCueCueLayerQualityReport {
    createdAt?: unknown;
    designId: string;
    gate: {
        exportFidelity: "pass" | "not_run" | "failed";
        pixelFidelity: "pass" | "needs_review" | "flat_safe" | "failed";
        structuralUsefulness: "pass" | "needs_review" | "downgraded";
        textFidelity: "pass" | "blocked" | "downgraded" | "needs_review";
    };
    id: string;
    jobId: string;
    layerUsefulnessScore: number;
    protectedTextMismatchCount: number;
    reportAssetId?: string;
    reviewRequired: boolean;
    sourceKind: CampaignCueCueLayerSourceKind;
    visualMatchScore: number;
    warningCount: number;
    workspaceId: string;
}

export interface CampaignCueCueLayerBootPackage {
    design: CampaignCueCueLayerDesign;
    document: CreativeEditorDocument;
    layerIndex: CampaignCueCueLayerIndex;
}

export interface CampaignCueCueLayerUploadResult {
    boot: CampaignCueCueLayerBootPackage;
    design: CampaignCueCueLayerDesign;
    job: CampaignCueCueLayerJob;
}
