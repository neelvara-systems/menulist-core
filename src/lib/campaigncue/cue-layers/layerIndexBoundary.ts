import {
    CAMPAIGNCUE_CUE_LAYER_ALLOWED_EDITOR_ELEMENT_TYPES,
    CAMPAIGNCUE_CUE_LAYER_ASSET_RETENTION_CLASSES,
    CAMPAIGNCUE_CUE_LAYERS,
} from "@constant/campaigncue/cueLayers";
import type { CampaignCueCueLayerIndex } from "@type/campaigncueCueLayers";
import { buildCampaignCueCueAssetUri, cueLayersBasePath } from "./storagePaths";

const nonEmptyBoundedString = (value: unknown, maxLength: number) => (
    typeof value === "string" && value.trim().length > 0 && value.length <= maxLength
);

export function parseCampaignCueCueLayerIndexArtifact(
    value: unknown,
    designId: string,
    workspaceId: string,
): CampaignCueCueLayerIndex {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("CueLayers layer index is invalid.");
    }
    const index = value as Partial<CampaignCueCueLayerIndex>;
    if (
        index.schemaVersion !== CAMPAIGNCUE_CUE_LAYERS.LAYER_INDEX_SCHEMA_VERSION
        || index.designId !== designId
        || index.workspaceId !== workspaceId
        || !nonEmptyBoundedString(index.reconstructionId, 160)
        || !Array.isArray(index.entries)
        || index.entries.length > CAMPAIGNCUE_CUE_LAYERS.MAX_FINAL_LAYERS
    ) {
        throw new Error("CueLayers layer index identity is invalid.");
    }
    const storagePrefix = `${cueLayersBasePath(workspaceId, designId)}/`;
    const layerIds = new Set<string>();
    const elementIds = new Set<string>();
    const assetIdentityById = new Map<string, string>();
    const editableLevels = new Set([
        "locked_reference", "text_editable", "vector_editable", "raster_masked",
        "raster_fallback", "clean_background", "unknown_confidence",
    ]);
    for (const entry of index.entries) {
        if (
            !entry
            || typeof entry !== "object"
            || !nonEmptyBoundedString(entry.layerId, 160)
            || !nonEmptyBoundedString(entry.elementId, 160)
            || !nonEmptyBoundedString(entry.ownerLabel, 160)
            || !editableLevels.has(entry.editableLevel)
            || !CAMPAIGNCUE_CUE_LAYER_ALLOWED_EDITOR_ELEMENT_TYPES.includes(entry.elementType)
            || !Array.isArray(entry.warnings)
            || entry.warnings.length > 20
            || entry.warnings.some((warning) => typeof warning !== "string" || warning.length > 500)
            || !Array.isArray(entry.assetRefs)
            || entry.assetRefs.length > 10
            || (entry.fallbackAssetId !== undefined && !nonEmptyBoundedString(entry.fallbackAssetId, 160))
            || layerIds.has(entry.layerId)
            || elementIds.has(entry.elementId)
        ) {
            throw new Error("CueLayers layer index entry is invalid.");
        }
        layerIds.add(entry.layerId);
        elementIds.add(entry.elementId);
        for (const asset of entry.assetRefs) {
            if (
                !asset
                || !nonEmptyBoundedString(asset.assetId, 160)
                || asset.assetUri !== buildCampaignCueCueAssetUri(asset.assetId)
                || asset.assetScope?.workspaceId !== workspaceId
                || asset.assetScope?.designId !== designId
                || !nonEmptyBoundedString(asset.storagePath, 1_024)
                || !asset.storagePath.startsWith(storagePrefix)
                || !["image/jpeg", "image/png", "image/webp"].includes(asset.contentType)
                || !CAMPAIGNCUE_CUE_LAYER_ASSET_RETENTION_CLASSES.includes(asset.retentionClass)
                || typeof asset.sha256 !== "string"
                || !/^[a-f0-9]{64}$/i.test(asset.sha256)
                || (asset.sizeBytes !== undefined && (!Number.isSafeInteger(asset.sizeBytes) || asset.sizeBytes < 1 || asset.sizeBytes > CAMPAIGNCUE_CUE_LAYERS.MAX_EXPORT_BYTES))
                || (asset.width !== undefined && (!Number.isSafeInteger(asset.width) || asset.width < 1 || asset.width > CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE))
                || (asset.height !== undefined && (!Number.isSafeInteger(asset.height) || asset.height < 1 || asset.height > CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE))
                || (asset.width !== undefined && asset.height !== undefined && asset.width * asset.height > CAMPAIGNCUE_CUE_LAYERS.MAX_CANVAS_PIXELS)
            ) {
                throw new Error("CueLayers layer asset reference is invalid.");
            }
            const identity = `${asset.assetUri}|${asset.storagePath}|${asset.sha256}`;
            const previousIdentity = assetIdentityById.get(asset.assetId);
            if (previousIdentity && previousIdentity !== identity) {
                throw new Error("CueLayers layer asset identity is inconsistent.");
            }
            assetIdentityById.set(asset.assetId, identity);
        }
        if (
            entry.fallbackAssetId !== undefined
            && !entry.assetRefs.some((asset) => asset.assetId === entry.fallbackAssetId)
        ) {
            throw new Error("CueLayers fallback asset reference is invalid.");
        }
    }
    return index as CampaignCueCueLayerIndex;
}
