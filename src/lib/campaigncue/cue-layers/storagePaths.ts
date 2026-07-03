import { CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES } from "@constant/campaigncue/cueLayers";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";
import type { CampaignCueCueLayerAssetRef, CampaignCueCueLayerAssetScope, CampaignCueCueLayerAssetRetentionClass } from "@type/campaigncueCueLayers";
import { createHash } from "crypto";

export const buildCampaignCueCueLayerId = (prefix: string) => (
    createTimestampedRuntimeId(prefix, 8)
);

export const buildCampaignCueCueAssetUri = (assetId: string) => `cue-asset://${assetId}`;

export const parseCampaignCueCueAssetUri = (value?: string) => {
    if (!value?.startsWith("cue-asset://")) return "";
    return value.replace("cue-asset://", "").trim();
};

export const sha256Hex = (buffer: Buffer | string) => (
    createHash("sha256").update(buffer).digest("hex")
);

export const stableJsonHash = (value: unknown) => sha256Hex(JSON.stringify(value)).slice(0, 24);

export const getCampaignCueCueLayerExtension = (mimeType: string) => {
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    if (mimeType === "image/jpeg") return "jpg";
    if (mimeType === "application/json") return "json";
    if (mimeType === "image/svg+xml") return "svg";
    return "bin";
};

export const cueLayersBasePath = (workspaceId: string, designId: string) => (
    `campaigncue/cue-layers/${workspaceId}/${designId}`
);

export const buildCueLayersStoragePaths = {
    sourcePackage: (workspaceId: string, designId: string, sourcePackageId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/sources/${sourcePackageId}/package.json`,
    sourceOriginal: (workspaceId: string, designId: string, sourcePackageId: string, ext: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/sources/${sourcePackageId}/original.${ext}`,
    sourceNormalized: (workspaceId: string, designId: string, sourcePackageId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/sources/${sourcePackageId}/normalized.png`,
    sourceEditorReference: (workspaceId: string, designId: string, sourcePackageId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/sources/${sourcePackageId}/editor-reference.png`,
    observationBundle: (workspaceId: string, designId: string, jobId: string, observationBundleId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/jobs/${jobId}/observations/${observationBundleId}.json`,
    reconstruction: (workspaceId: string, designId: string, reconstructionId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/reconstructions/${reconstructionId}/reconstruction.json`,
    reconstructionLayer: (workspaceId: string, designId: string, reconstructionId: string, layerId: string, purpose: "editor" | "export" | "mask") =>
        `${cueLayersBasePath(workspaceId, designId)}/reconstructions/${reconstructionId}/layers/${layerId}/${purpose}.png`,
    projection: (workspaceId: string, designId: string, reconstructionId: string, projectionId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/reconstructions/${reconstructionId}/projection/${projectionId}.json`,
    editorDocumentSnapshot: (workspaceId: string, designId: string, versionId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/versions/${versionId}/creative-editor-document.json`,
    layerIndex: (workspaceId: string, designId: string, versionId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/versions/${versionId}/layer-index.json`,
    qualityReport: (workspaceId: string, designId: string, qualityReportId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/quality/${qualityReportId}.json`,
    repairPatch: (workspaceId: string, designId: string, repairId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/repairs/${repairId}.json`,
    exportOutput: (workspaceId: string, designId: string, exportId: string, ext: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/exports/${exportId}/output.${ext}`,
    exportReport: (workspaceId: string, designId: string, exportId: string) =>
        `${cueLayersBasePath(workspaceId, designId)}/exports/${exportId}/report.json`,
};

export function buildCueLayerAssetRef(params: {
    assetId?: string;
    contentType: string;
    height?: number;
    retentionClass: CampaignCueCueLayerAssetRetentionClass;
    sha256: string;
    sizeBytes?: number;
    storageGeneration?: string;
    storageMetageneration?: string;
    storagePath: string;
    scope: CampaignCueCueLayerAssetScope;
    width?: number;
}): CampaignCueCueLayerAssetRef {
    const assetId = params.assetId || buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.ASSET);
    return {
        assetId,
        assetScope: params.scope,
        assetUri: buildCampaignCueCueAssetUri(assetId),
        contentType: params.contentType,
        height: params.height,
        retentionClass: params.retentionClass,
        sha256: params.sha256,
        sizeBytes: params.sizeBytes,
        storageGeneration: params.storageGeneration,
        storageMetageneration: params.storageMetageneration,
        storagePath: params.storagePath,
        width: params.width,
    };
}
