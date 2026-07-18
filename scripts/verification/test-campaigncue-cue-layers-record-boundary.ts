import assert from "node:assert/strict";
import {
    parseCampaignCueCueLayerDesignRecord,
    parseCampaignCueCueLayerJobRecord,
} from "@lib/campaigncue/cue-layers/recordBoundary";
import type { CampaignCueCueLayerDesign, CampaignCueCueLayerJob } from "@type/campaigncueCueLayers";

const workspaceId = "cc_1_101";
const designId = "cccl_design_test";
const jobId = "cccl_job_test";

const design: CampaignCueCueLayerDesign = {
    createdByUserId: "user_101",
    current: {
        creativeEditorDocumentSnapshotAssetId: "cccl_asset_document",
        jobId,
        layerIndexAssetId: "cccl_asset_layer_index",
        layerIndexVersionId: "cccl_version_1",
        revision: 1,
        versionId: "cccl_version_1",
    },
    id: designId,
    quality: { textSafetyStatus: "needs_review", visualMatchScore: 1, warningCount: 1 },
    source: {
        currentSourcePackageAssetId: "cccl_source_1",
        kind: "user_upload",
        originalAssetId: "cccl_asset_original",
    },
    status: "needs_review",
    title: "Reusable image",
    workspaceId,
};

const job: CampaignCueCueLayerJob = {
    attempt: 1,
    createdByUserId: "user_101",
    currentArtifactIds: {
        editorSnapshotAssetId: "cccl_asset_document",
        layerIndexAssetId: "cccl_asset_layer_index",
    },
    designId,
    id: jobId,
    outcome: "flat_safe",
    progress: 100,
    sourceKind: "user_upload",
    sourcePackageAssetId: "cccl_source_1",
    status: "completed",
    step: "validating",
    workspaceId,
};

assert.deepEqual(parseCampaignCueCueLayerDesignRecord(design, designId, workspaceId), design);
assert.deepEqual(parseCampaignCueCueLayerJobRecord(job, jobId, workspaceId), job);
assert.deepEqual(parseCampaignCueCueLayerJobRecord(job, jobId, workspaceId, designId), job);

for (const mutate of [
    (value: CampaignCueCueLayerDesign) => { value.workspaceId = "cc_2_202"; },
    (value: CampaignCueCueLayerDesign) => { value.status = "unknown" as CampaignCueCueLayerDesign["status"]; },
    (value: CampaignCueCueLayerDesign) => { value.current.revision = Number.NaN; },
    (value: CampaignCueCueLayerDesign) => { value.current.versionId = "bad id"; },
    (value: CampaignCueCueLayerDesign) => { value.source.kind = "unknown" as CampaignCueCueLayerDesign["source"]["kind"]; },
    (value: CampaignCueCueLayerDesign) => { value.quality = { visualMatchScore: 2 }; },
]) {
    const malformed = structuredClone(design);
    mutate(malformed);
    assert.throws(() => parseCampaignCueCueLayerDesignRecord(malformed, designId, workspaceId), /CueLayers design/);
}

for (const mutate of [
    (value: CampaignCueCueLayerJob) => { value.workspaceId = "cc_2_202"; },
    (value: CampaignCueCueLayerJob) => { value.designId = ""; },
    (value: CampaignCueCueLayerJob) => { value.status = "unknown" as CampaignCueCueLayerJob["status"]; },
    (value: CampaignCueCueLayerJob) => { value.sourceKind = "unknown" as CampaignCueCueLayerJob["sourceKind"]; },
    (value: CampaignCueCueLayerJob) => { value.progress = Number.POSITIVE_INFINITY; },
    (value: CampaignCueCueLayerJob) => { value.currentArtifactIds.bad = "bad id"; },
]) {
    const malformed = structuredClone(job);
    mutate(malformed);
    assert.throws(() => parseCampaignCueCueLayerJobRecord(malformed, jobId, workspaceId), /CueLayers job/);
}

assert.throws(
    () => parseCampaignCueCueLayerJobRecord(job, jobId, workspaceId, "cccl_design_other"),
    /job identity/,
);

process.stdout.write("CampaignCue CueLayers persisted-record boundary tests passed.\n");
