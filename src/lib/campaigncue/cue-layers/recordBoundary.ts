import {
    CAMPAIGNCUE_CUE_LAYER_DESIGN_STATUSES,
    CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES,
    CAMPAIGNCUE_CUE_LAYER_JOB_STATUSES,
    CAMPAIGNCUE_CUE_LAYER_PROCESSING_STEPS,
    CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS,
} from "@constant/campaigncue/cueLayers";
import type { CampaignCueCueLayerDesign, CampaignCueCueLayerJob } from "@type/campaigncueCueLayers";

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const CURRENT_POINTER_FIELDS = [
    "creativeEditorDocumentSnapshotAssetId",
    "editorProjectionAssetId",
    "jobId",
    "layerIndexAssetId",
    "layerIndexVersionId",
    "previewAssetId",
    "reconstructionAssetId",
    "versionId",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const isIdentifier = (value: unknown) => (
    typeof value === "string"
    && value.length >= 3
    && value.length <= 160
    && ID_PATTERN.test(value)
);

const isOptionalIdentifier = (value: unknown) => value === undefined || isIdentifier(value);

export function parseCampaignCueCueLayerDesignRecord(
    value: unknown,
    documentId: string,
    workspaceId: string,
): CampaignCueCueLayerDesign {
    if (!isRecord(value)) throw new Error("CueLayers design is invalid.");
    const design = value as unknown as CampaignCueCueLayerDesign;
    if (
        !isIdentifier(documentId)
        || !isIdentifier(workspaceId)
        || design.id !== documentId
        || design.workspaceId !== workspaceId
        || !isIdentifier(design.createdByUserId)
        || typeof design.title !== "string"
        || design.title.trim().length < 1
        || design.title.length > 160
        || !CAMPAIGNCUE_CUE_LAYER_DESIGN_STATUSES.includes(design.status)
    ) {
        throw new Error("CueLayers design identity is invalid.");
    }
    if (
        !isRecord(design.current)
        || !Number.isSafeInteger(design.current.revision)
        || design.current.revision < 0
        || CURRENT_POINTER_FIELDS.some((field) => !isOptionalIdentifier(design.current[field]))
    ) {
        throw new Error("CueLayers design revision is invalid.");
    }
    if (
        !isRecord(design.source)
        || !isIdentifier(design.source.currentSourcePackageAssetId)
        || !isIdentifier(design.source.originalAssetId)
        || !CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS.includes(design.source.kind)
        || !isOptionalIdentifier(design.source.brandSnapshotAssetId)
        || !isOptionalIdentifier(design.source.businessTruthSnapshotAssetId)
        || !isOptionalIdentifier(design.source.protectedTextTruthAssetId)
        || !isOptionalIdentifier(design.source.rightsSnapshotAssetId)
    ) {
        throw new Error("CueLayers design source is invalid.");
    }
    if (design.quality !== undefined) {
        const quality = design.quality;
        if (
            !isRecord(quality)
            || (quality.visualMatchScore !== undefined && (!Number.isFinite(quality.visualMatchScore) || quality.visualMatchScore < 0 || quality.visualMatchScore > 1))
            || (quality.warningCount !== undefined && (!Number.isSafeInteger(quality.warningCount) || quality.warningCount < 0 || quality.warningCount > 10_000))
            || (quality.textSafetyStatus !== undefined && !["pass", "blocked", "downgraded", "needs_review"].includes(quality.textSafetyStatus))
        ) {
            throw new Error("CueLayers design quality is invalid.");
        }
    }
    return design;
}

export function parseCampaignCueCueLayerJobRecord(
    value: unknown,
    documentId: string,
    workspaceId: string,
    expectedDesignId?: string,
): CampaignCueCueLayerJob {
    if (!isRecord(value)) throw new Error("CueLayers job is invalid.");
    const job = value as unknown as CampaignCueCueLayerJob;
    if (
        !isIdentifier(documentId)
        || !isIdentifier(workspaceId)
        || job.id !== documentId
        || job.workspaceId !== workspaceId
        || !isIdentifier(job.designId)
        || (expectedDesignId !== undefined && job.designId !== expectedDesignId)
        || !isIdentifier(job.createdByUserId)
        || !isIdentifier(job.sourcePackageAssetId)
        || !CAMPAIGNCUE_CUE_LAYER_SOURCE_KINDS.includes(job.sourceKind)
        || !CAMPAIGNCUE_CUE_LAYER_JOB_STATUSES.includes(job.status)
        || (job.outcome !== undefined && !CAMPAIGNCUE_CUE_LAYER_JOB_OUTCOMES.includes(job.outcome))
        || (job.step !== undefined && !CAMPAIGNCUE_CUE_LAYER_PROCESSING_STEPS.includes(job.step))
        || !Number.isSafeInteger(job.attempt)
        || job.attempt < 0
        || job.attempt > 100
        || !Number.isFinite(job.progress)
        || job.progress < 0
        || job.progress > 100
    ) {
        throw new Error("CueLayers job identity is invalid.");
    }
    if (!isRecord(job.currentArtifactIds) || Object.keys(job.currentArtifactIds).length > 30) {
        throw new Error("CueLayers job artifacts are invalid.");
    }
    for (const [key, artifactId] of Object.entries(job.currentArtifactIds)) {
        if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key) || !isIdentifier(artifactId)) {
            throw new Error("CueLayers job artifacts are invalid.");
        }
    }
    if (
        job.error !== undefined
        && (
            !isRecord(job.error)
            || (job.error.code !== undefined && (typeof job.error.code !== "string" || job.error.code.length > 120))
            || (job.error.safeMessage !== undefined && (typeof job.error.safeMessage !== "string" || job.error.safeMessage.length > 500))
        )
    ) {
        throw new Error("CueLayers job error is invalid.");
    }
    if (
        job.workerLease !== undefined
        && (
            !isRecord(job.workerLease)
            || (job.workerLease.holder !== undefined && !isIdentifier(job.workerLease.holder))
        )
    ) {
        throw new Error("CueLayers job lease is invalid.");
    }
    return job;
}
