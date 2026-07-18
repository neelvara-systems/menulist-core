import assert from "node:assert/strict";
import { CAMPAIGNCUE_CUE_LAYERS } from "@constant/campaigncue/cueLayers";
import { parseCampaignCueCueLayerIndexArtifact } from "@lib/campaigncue/cue-layers/layerIndexBoundary";
import { buildCampaignCueCueAssetUri } from "@lib/campaigncue/cue-layers/storagePaths";
import type { CampaignCueCueLayerIndex } from "@type/campaigncueCueLayers";

const workspaceId = "cc_1_101";
const designId = "cccl_design_test";
const assetId = "cccl_asset_test";
const storagePath = `campaigncue/cue-layers/${workspaceId}/${designId}/sources/source_1/original.png`;

const validIndex: CampaignCueCueLayerIndex = {
    designId,
    entries: [{
        assetRefs: [{
            assetId,
            assetScope: { designId, sourcePackageId: "source_1", workspaceId },
            assetUri: buildCampaignCueCueAssetUri(assetId),
            contentType: "image/png",
            height: 1080,
            retentionClass: "source_durable",
            sha256: "a".repeat(64),
            sizeBytes: 100_000,
            storagePath,
            width: 1080,
        }],
        editableLevel: "locked_reference",
        elementId: "element_1",
        elementType: "image",
        fallbackAssetId: assetId,
        layerId: "layer_1",
        ownerLabel: "Original image",
        warnings: [],
    }],
    reconstructionId: "reconstruction_1",
    schemaVersion: CAMPAIGNCUE_CUE_LAYERS.LAYER_INDEX_SCHEMA_VERSION,
    workspaceId,
};

const clone = () => structuredClone(validIndex);

assert.deepEqual(parseCampaignCueCueLayerIndexArtifact(validIndex, designId, workspaceId), validIndex);

const wrongWorkspace = clone();
wrongWorkspace.entries[0].assetRefs[0].assetScope.workspaceId = "cc_2_202";
assert.throws(() => parseCampaignCueCueLayerIndexArtifact(wrongWorkspace, designId, workspaceId), /asset reference/);

const wrongStorageScope = clone();
wrongStorageScope.entries[0].assetRefs[0].storagePath = "campaigncue/cue-layers/cc_2_202/other/source.png";
assert.throws(() => parseCampaignCueCueLayerIndexArtifact(wrongStorageScope, designId, workspaceId), /asset reference/);

for (const duplicateField of ["layerId", "elementId"] as const) {
    const duplicate = clone();
    duplicate.entries.push({ ...structuredClone(duplicate.entries[0]), [duplicateField]: duplicate.entries[0][duplicateField] });
    if (duplicateField === "layerId") duplicate.entries[1].elementId = "element_2";
    if (duplicateField === "elementId") duplicate.entries[1].layerId = "layer_2";
    assert.throws(() => parseCampaignCueCueLayerIndexArtifact(duplicate, designId, workspaceId), /entry is invalid/);
}

const conflictingAssetIdentity = clone();
conflictingAssetIdentity.entries.push({
    ...structuredClone(conflictingAssetIdentity.entries[0]),
    elementId: "element_2",
    fallbackAssetId: undefined,
    layerId: "layer_2",
});
conflictingAssetIdentity.entries[1].assetRefs[0].storagePath = `${storagePath}.different`;
assert.throws(() => parseCampaignCueCueLayerIndexArtifact(conflictingAssetIdentity, designId, workspaceId), /identity is inconsistent/);

for (const mutate of [
    (value: CampaignCueCueLayerIndex) => { value.entries[0].assetRefs[0].contentType = "image/svg+xml"; },
    (value: CampaignCueCueLayerIndex) => { value.entries[0].assetRefs[0].sha256 = "bad"; },
    (value: CampaignCueCueLayerIndex) => { value.entries[0].assetRefs[0].width = CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE + 1; },
    (value: CampaignCueCueLayerIndex) => { value.entries[0].assetRefs[0].sizeBytes = CAMPAIGNCUE_CUE_LAYERS.MAX_EXPORT_BYTES + 1; },
]) {
    const malformed = clone();
    mutate(malformed);
    assert.throws(() => parseCampaignCueCueLayerIndexArtifact(malformed, designId, workspaceId), /asset reference/);
}

const missingFallback = clone();
missingFallback.entries[0].fallbackAssetId = "cccl_asset_missing";
assert.throws(() => parseCampaignCueCueLayerIndexArtifact(missingFallback, designId, workspaceId), /fallback asset/);

const tooManyEntries = clone();
tooManyEntries.entries = Array.from({ length: CAMPAIGNCUE_CUE_LAYERS.MAX_FINAL_LAYERS + 1 }, (_, index) => ({
    ...structuredClone(validIndex.entries[0]),
    elementId: `element_${index}`,
    layerId: `layer_${index}`,
}));
assert.throws(() => parseCampaignCueCueLayerIndexArtifact(tooManyEntries, designId, workspaceId), /identity is invalid/);

process.stdout.write("CampaignCue CueLayers layer-index boundary tests passed.\n");
