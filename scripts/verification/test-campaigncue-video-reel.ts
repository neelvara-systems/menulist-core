import assert from "node:assert/strict";

import { CAMPAIGNCUE_VIDEO_STUDIO } from "@constant/campaigncue/videoReel";
import {
    buildCampaignCueVideoStoryboardText,
    buildCampaignCueVideoProject,
    canApplyCampaignCueVideoRenderReceipt,
    evaluateCampaignCueVideoTrust,
    getCampaignCueVideoAssetIds,
    getCampaignCueVideoSourceTrustGate,
    getCampaignCueVideoDuration,
    parseCampaignCueVideoProjectRecord,
    regenerateCampaignCueVideoScene,
} from "@lib/campaigncue/videoReel";
import { CampaignCueVideoProjectMutationSchema } from "@lib/validation/campaigncueVideoSchemas";
import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueOutput,
} from "@type/campaigncue";

const workspaceId = "cc_workspace_video_1";
const output: CampaignCueOutput = {
    id: "output_video_1",
    channel: "video",
    label: "Reel brief",
    mode: "manual_export",
    text: "Fresh lunch plates are available today. Call to reserve a table.",
    sourceReferences: ["menu_item_lunch", "business_phone"],
    providerMode: "manual_export",
    trustGate: "clear",
    fields: {
        headline: "Fresh lunch plates today",
        body: "Fresh lunch plates are available today. The current menu is checked before use.",
        cta: "Call to reserve a table",
        imageBrief: "Use an owner-controlled lunch photo.",
        dimensions: "1080x1920",
        postType: "reel_brief",
        consentNote: "Use only owner-controlled media.",
        policyNote: "Manual export only.",
        destination: "Reels",
        utm: "",
        approvalNote: "Review before use.",
        manualSteps: ["Review", "Render", "Post manually"],
    },
};
const campaign = {
    id: "campaign_video_1",
    workspaceId,
    businessBrainId: "default",
    title: "Lunch campaign",
    brief: "Share the current lunch plates.",
    status: "generated",
    channels: ["video"],
    outputs: [output],
    sourceSnapshotId: "snapshot_current",
    trustGate: "clear",
    credits: { estimate: 0, reserved: 0, captured: 0, refunded: 0, currency: "credits" },
    actionCounts: {},
    ownerApprovalState: "not_requested",
    pack: {
        ownerGoal: "sell_product",
        reason: "Current lunch cue",
        sourceFactIds: ["menu_item_lunch", "business_phone"],
        missingInputIds: [],
        deliveryCardIds: [],
        resultQuestion: "Did this bring calls?",
    },
} as CampaignCueCampaign;
const businessBrain = {
    id: "brain_default",
    workspaceId,
    businessBrainId: "default",
    name: "Neighbourhood Kitchen",
    brandKit: {
        primaryColor: "#6d5dfc",
        voice: "friendly",
    },
} as CampaignCueBusinessBrain;

const project = buildCampaignCueVideoProject({
    actorId: "user_video_owner",
    businessBrain,
    campaign,
    id: "cc_video_project_1",
    now: "2026-08-01T10:00:00.000Z",
    output,
});

assert.equal(project.workspaceId, workspaceId);
assert.equal(project.status, "draft");
assert.equal(project.version, 1);
assert.equal(project.variants.length, CAMPAIGNCUE_VIDEO_STUDIO.MAX_VARIANTS);
assert.equal(project.scenes.length, 4);
assert.deepEqual(project.audio, {
    voiceover: { mode: "none", volume: 0.9 },
    backgroundMusic: { mode: "none", volume: 0.45 },
    ducking: true,
});
assert.deepEqual(project.reviewNotes, []);
assert.deepEqual(project.versions[0].trustFindings, project.trustFindings);
assert.deepEqual(project.versions[0].reviewedAssetIds, []);
assert.ok(project.scenes.every((scene) => scene.sourceReferences.length > 0));
assert.equal(getCampaignCueVideoDuration(project.scenes), 14);
const storyboard = buildCampaignCueVideoStoryboardText(project);
assert.match(storyboard, /CampaignCue video storyboard/);
assert.match(storyboard, /Scene 1 - hook - included/);
assert.match(storyboard, /CampaignCue does not post this video/);
assert.doesNotMatch(storyboard, /blob:|data:|https?:\/\//i);
assert.deepEqual(project.cost, {
    providerCalls: 0,
    providerCredits: 0,
    renderer: "campaigncue_browser_compositor",
});
assert.equal(parseCampaignCueVideoProjectRecord(project, { workspaceId }).id, project.id);
assert.equal(getCampaignCueVideoSourceTrustGate("clear", "needs_fix"), "needs_fix");
const regeneratedScenes = regenerateCampaignCueVideoScene(project, project.scenes[0].id);
assert.notEqual(regeneratedScenes[0].overlay, project.scenes[0].overlay);
assert.deepEqual(regeneratedScenes[0].sourceReferences, project.scenes[0].sourceReferences);
assert.equal(regeneratedScenes[0].assetId, project.scenes[0].assetId);
assert.throws(
    () => parseCampaignCueVideoProjectRecord(project, { workspaceId: "cc_workspace_other_2" }),
    /scope mismatch/,
);

const blockedTrust = evaluateCampaignCueVideoTrust({
    campaignTrustGate: "clear",
    scenes: project.scenes.map((scene, index) => index === 0 ? {
        ...scene,
        overlay: "Guaranteed viral results",
    } : scene),
    sourceReferences: project.sourceReferences,
});
assert.equal(blockedTrust.gate, "blocked");
assert.ok(blockedTrust.findings.some((finding) => finding.id === "unsupported_claim"));

const restrictedAsset: CampaignCueAsset = {
    id: "asset_restricted_1",
    workspaceId,
    name: "Restricted image",
    assetType: "image",
    status: "ready",
    source: "upload",
    rights: { status: "restricted" },
    tags: [],
    usageRefs: [],
};
const restrictedTrust = evaluateCampaignCueVideoTrust({
    assets: [restrictedAsset],
    campaignTrustGate: "clear",
    scenes: project.scenes.map((scene, index) => index === 1 ? {
        ...scene,
        assetId: restrictedAsset.id,
    } : scene),
    sourceReferences: project.sourceReferences,
});
assert.equal(restrictedTrust.gate, "blocked");

const savePayload = {
    action: "save" as const,
    projectId: project.id,
    expectedVersion: project.version,
    title: project.title,
    aspectRatio: project.aspectRatio,
    selectedVariantId: project.selectedVariantId,
    scenes: project.scenes,
    captions: project.captions,
    audio: project.audio,
    idempotencyKey: "video_save_key_123",
};
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse(savePayload).success, true);
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    ...savePayload,
    scenes: savePayload.scenes.map((scene) => ({ ...scene, durationSeconds: 12 })),
}).success, true);
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    ...savePayload,
    scenes: Array.from({ length: CAMPAIGNCUE_VIDEO_STUDIO.MAX_SCENES }, (_, index) => ({
        ...savePayload.scenes[index % savePayload.scenes.length],
        id: `scene_long_${index}`,
        durationSeconds: 12,
    })),
}).success, false, "total duration above 60 seconds must fail");
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    ...savePayload,
    scenes: [savePayload.scenes[0], savePayload.scenes[0]],
}).success, false, "duplicate scene ids must fail");
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    ...savePayload,
    scenes: savePayload.scenes.map((scene) => ({ ...scene, enabled: false })),
}).success, false, "at least one scene must remain included");
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    action: "reject",
    projectId: project.id,
    expectedVersion: project.version,
    idempotencyKey: "video_reject_key_123",
}).success, false, "rejection requires a reason");
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    action: "render_receipt",
    projectId: project.id,
    expectedVersion: project.version,
    receipt: {
        id: "cc_video_receipt_1",
        attempt: 1,
        status: "completed",
        aspectRatio: "9:16",
        durationSeconds: 14,
    },
    idempotencyKey: "video_receipt_key_123",
}).success, false, "completed receipt requires MIME and size metadata");
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    action: "render_receipt",
    projectId: project.id,
    expectedVersion: project.version,
    receipt: {
        id: "cc_video_receipt_1",
        attempt: 1,
        status: "started",
        aspectRatio: "9:16",
        durationSeconds: 14,
        errorCode: "recording_failed",
    },
    idempotencyKey: "video_receipt_started_metadata_123",
}).success, false, "started receipt must reject terminal metadata");
const startedReceipt = {
    id: "cc_video_receipt_1",
    attempt: 1,
    status: "started" as const,
    aspectRatio: "9:16" as const,
    durationSeconds: 14,
    progressPercent: 0,
    rightsEvidence: { assetIds: [], sessionMediaUsed: false, sessionMediaRightsConfirmed: false },
    credit: { estimated: 0 as const, reserved: 0 as const, captured: 0 as const, refunded: 0 as const, currency: "credits" as const },
};
assert.equal(canApplyCampaignCueVideoRenderReceipt(undefined, startedReceipt), true);
assert.equal(canApplyCampaignCueVideoRenderReceipt(startedReceipt, startedReceipt), false, "a second key cannot restart one receipt id");
assert.equal(canApplyCampaignCueVideoRenderReceipt(startedReceipt, { attempt: 1, status: "completed" }), true);
assert.equal(canApplyCampaignCueVideoRenderReceipt(startedReceipt, { attempt: 2, status: "failed" }), false);
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    action: "render_progress",
    projectId: project.id,
    expectedVersion: project.version,
    receiptId: startedReceipt.id,
    attempt: 1,
    progressPercent: 25,
    idempotencyKey: "video_progress_key_123",
}).success, true);
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    action: "render_progress",
    projectId: project.id,
    expectedVersion: project.version,
    receiptId: startedReceipt.id,
    attempt: 1,
    progressPercent: 26,
    idempotencyKey: "video_progress_bad_123",
}).success, false, "only bounded render checkpoints are admitted");
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    action: "add_review_note",
    projectId: project.id,
    expectedVersion: project.version,
    message: "Shorten the final action.",
    idempotencyKey: "video_note_key_123",
}).success, true);
assert.equal(CampaignCueVideoProjectMutationSchema.safeParse({
    action: "record_result",
    projectId: project.id,
    expectedVersion: project.version,
    renderReceiptId: startedReceipt.id,
    signalId: "useful",
    idempotencyKey: "video_result_key_123",
}).success, true);

const audioAsset: CampaignCueAsset = {
    id: "asset_audio_1",
    workspaceId,
    name: "Owner music",
    assetType: "audio",
    status: "ready",
    source: "upload",
    rights: { status: "confirmed", consentType: "owner_confirmed" },
    tags: [],
    usageRefs: [],
};
assert.deepEqual(getCampaignCueVideoAssetIds(project.scenes, {
    ...project.audio,
    backgroundMusic: { mode: "asset", assetId: audioAsset.id, volume: 0.45 },
}), [audioAsset.id]);

const legacyProject = parseCampaignCueVideoProjectRecord({
    ...project,
    audio: { mode: "owner_file", volume: 0.6 },
    reviewNotes: undefined,
    versions: project.versions.map(({ audio: _audio, captions: _captions, trustFindings: _findings, reviewedAssetIds: _assets, ...version }) => version),
}, { workspaceId });
assert.equal(legacyProject.audio.backgroundMusic.mode, "session_file");
assert.deepEqual(legacyProject.reviewNotes, []);
assert.throws(
    () => parseCampaignCueVideoProjectRecord({
        ...project,
        renderReceipts: [{
            ...startedReceipt,
            status: "completed",
        }],
    }, { workspaceId }),
    /invalid_type/,
    "persisted completed receipts without MIME and size must fail closed",
);
assert.throws(
    () => parseCampaignCueVideoProjectRecord({
        ...project,
        renderReceipts: [{
            ...startedReceipt,
            errorCode: "recording_failed",
        }],
    }, { workspaceId }),
    /unrecognized_keys/,
    "persisted started receipts with terminal metadata must fail closed",
);

console.log("CampaignCue Video Reel Studio contract tests passed.");
