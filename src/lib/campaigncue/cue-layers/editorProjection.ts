import { CAMPAIGNCUE_CUE_LAYERS } from "@constant/campaigncue/cueLayers";
import { CAMPAIGNCUE_PRODUCT_CODE } from "@constant/campaigncue/product";
import type { CampaignCueBusinessBrain } from "@type/campaigncue";
import type {
    CampaignCueCreativeEditorDocumentSnapshot,
    CampaignCueCreativeSourcePackage,
    CampaignCueCueLayerAssetRef,
    CampaignCueCueLayerEditorProjection,
    CampaignCueCueLayerIndex,
    CampaignCueCueLayerQualityReport,
    CampaignCueCueLayerReconstructionDocument,
} from "@type/campaigncueCueLayers";
import {
    CREATIVE_EDITOR_SCHEMA_VERSION,
    type CreativeEditorElement,
    type CreativeEditorSourceRef,
} from "@/modules/creative-editor/types";

const scaleToEditorCanvas = (width: number, height: number) => {
    const longEdge = Math.max(width, height, 1);
    const scale = Math.min(1, CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_LONG_EDGE / longEdge);
    return {
        height: Math.max(1, Math.round(height * scale)),
        scale,
        width: Math.max(1, Math.round(width * scale)),
    };
};

const sourceRef = (asset: CampaignCueCueLayerAssetRef, label: string): CreativeEditorSourceRef => ({
    label,
    locked: true,
    productId: CAMPAIGNCUE_PRODUCT_CODE,
    sourceRef: asset.assetUri,
});

export function buildCampaignCueCueLayerProjection(params: {
    businessBrain: CampaignCueBusinessBrain;
    designId: string;
    editorReferenceAsset: CampaignCueCueLayerAssetRef;
    jobId: string;
    projectionId: string;
    reconstructionId: string;
    sourcePackage: CampaignCueCreativeSourcePackage;
    versionId: string;
}): {
    document: CampaignCueCreativeEditorDocumentSnapshot;
    layerIndex: CampaignCueCueLayerIndex;
    projection: CampaignCueCueLayerEditorProjection;
    qualityReport: Omit<CampaignCueCueLayerQualityReport, "createdAt" | "id" | "jobId">;
    reconstruction: CampaignCueCueLayerReconstructionDocument;
} {
    const size = scaleToEditorCanvas(params.sourcePackage.width, params.sourcePackage.height);
    const brandColor = params.businessBrain.brandKit.primaryColor || "#315d52";
    const sourceRefs = [sourceRef(params.editorReferenceAsset, "Original preserved")];
    const referenceLayerId = `layer_reference_${params.designId}`;
    const imageElement: CreativeEditorElement = {
        alt: params.sourcePackage.provenance.fileName || "Original image",
        fit: "contain",
        height: size.height,
        id: referenceLayerId,
        locked: true,
        name: "Original image",
        opacity: 1,
        sourceRefs,
        src: params.editorReferenceAsset.assetUri,
        type: "image",
        visible: true,
        width: size.width,
        x: 0,
        y: 0,
    };
    const now = new Date().toISOString();
    const document: CampaignCueCreativeEditorDocumentSnapshot = {
        canvas: {
            backgroundColor: "#fffdfa",
            height: size.height,
            width: size.width,
        },
        elements: [imageElement],
        id: `cccl_editor_${params.designId}`,
        metadata: {
            brand: {
                logoUrl: params.businessBrain.brandKit.logoUrl,
                name: params.businessBrain.name,
                primaryColor: brandColor,
                voice: params.businessBrain.brandKit.voice,
            },
            createdAt: now,
            cueLayers: {
                designId: params.designId,
                jobId: params.jobId,
                outcome: "flat_safe",
                reconstructionId: params.reconstructionId,
                revision: 1,
                sourcePackageId: params.sourcePackage.sourcePackageId,
            },
            sourceRefs,
            templateId: "campaigncue-cue-layers-flat-safe",
            updatedAt: now,
        },
        productContext: {
            productId: CAMPAIGNCUE_PRODUCT_CODE,
            sourceSurface: "cue-layers",
            workspaceId: params.sourcePackage.workspaceId,
        },
        schemaVersion: CREATIVE_EDITOR_SCHEMA_VERSION,
        title: params.sourcePackage.provenance.fileName
            ? `${params.sourcePackage.provenance.fileName} layered edit`
            : "CueLayers image edit",
    };
    const layerIndex: CampaignCueCueLayerIndex = {
        designId: params.designId,
        entries: [
            {
                assetRefs: [params.editorReferenceAsset],
                editableLevel: "locked_reference",
                elementId: referenceLayerId,
                elementType: "image",
                fallbackAssetId: params.editorReferenceAsset.assetId,
                layerId: referenceLayerId,
                ownerLabel: "Original preserved",
                warnings: ["Kept as image for safety"],
            },
        ],
        reconstructionId: params.reconstructionId,
        schemaVersion: CAMPAIGNCUE_CUE_LAYERS.LAYER_INDEX_SCHEMA_VERSION,
        workspaceId: params.sourcePackage.workspaceId,
    };
    const reconstruction: CampaignCueCueLayerReconstructionDocument = {
        designId: params.designId,
        layers: [
            {
                assetRefs: [params.editorReferenceAsset],
                confidence: 1,
                editableLevel: "locked_reference",
                fallback: {
                    assetId: params.editorReferenceAsset.assetId,
                    reason: "Original preserved",
                },
                geometry: { x: 0, y: 0, width: size.width, height: size.height },
                layerId: referenceLayerId,
                sourceObservationIds: ["deterministic_flat_safe"],
                type: "background",
                validation: {
                    pixelFidelity: "flat_safe",
                    textFidelity: "needs_review",
                },
                warnings: ["Kept as image for safety"],
                zIndex: 0,
            },
        ],
        outcome: "flat_safe",
        reconstructionId: params.reconstructionId,
        schemaVersion: CAMPAIGNCUE_CUE_LAYERS.SCHEMA_VERSION,
        sourcePackageId: params.sourcePackage.sourcePackageId,
        warnings: ["Kept as image for safety"],
        workspaceId: params.sourcePackage.workspaceId,
    };
    const projection: CampaignCueCueLayerEditorProjection = {
        designId: params.designId,
        document,
        layerIndexAssetId: "",
        projectionId: params.projectionId,
        reconstructionId: params.reconstructionId,
        schemaVersion: CAMPAIGNCUE_CUE_LAYERS.SCHEMA_VERSION,
        workspaceId: params.sourcePackage.workspaceId,
    };
    return {
        document,
        layerIndex,
        projection,
        reconstruction,
        qualityReport: {
            designId: params.designId,
            gate: {
                exportFidelity: "not_run",
                pixelFidelity: "flat_safe",
                structuralUsefulness: "downgraded",
                textFidelity: "needs_review",
            },
            layerUsefulnessScore: 0.35,
            protectedTextMismatchCount: 0,
            reviewRequired: true,
            sourceKind: params.sourcePackage.sourceKind,
            visualMatchScore: 1,
            warningCount: 1,
            workspaceId: params.sourcePackage.workspaceId,
        },
    };
}
