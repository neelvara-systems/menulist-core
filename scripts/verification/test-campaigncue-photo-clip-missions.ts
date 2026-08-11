import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    CAMPAIGNCUE_MAX_AUDIO_ASSET_SIZE_BYTES,
    CAMPAIGNCUE_MAX_IMAGE_ASSET_SIZE_BYTES,
    CAMPAIGNCUE_MAX_VIDEO_ASSET_SIZE_BYTES,
} from "../../src/constants/campaigncue/database";
import {
    buildCampaignCueMediaMissionTags,
    campaignCueRightsStatusForConsent,
    isCampaignCueDurableMediaAsset,
    isCampaignCueDurableVisualAsset,
    isCampaignCueReadyVisualAsset,
    isCampaignCueRestrictedVisualAsset,
    isCampaignCueReviewVisualAsset,
} from "../../src/lib/campaigncue/mediaMissions";
import { parseCampaignCueAssetRecord } from "../../src/lib/campaigncue/assetBoundary";
import {
    isDefinitiveCampaignCueMediaRegistrationRejection,
    shouldCleanupCampaignCueMediaUploadAfterFailure,
} from "../../src/lib/campaigncue/assetUploadRecovery";
import { CampaignCueAssetSchema } from "../../src/lib/validation/campaigncueSchemas";
import type { CampaignCueAsset } from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");

const asset = (overrides: Partial<CampaignCueAsset> = {}): CampaignCueAsset => ({
    id: "cc_asset_photo",
    workspaceId: "cc_workspace_test",
    name: "Lunch photo",
    assetType: "image",
    status: "ready",
    source: "upload",
    rights: { status: "confirmed", consentType: "not_applicable" },
    tags: ["private-upload", "photo-mission"],
    file: {
        storagePath: "campaigncue/assets/cc_workspace_test/upload_1/source.png",
        storageGeneration: "123456",
        mimeType: "image/png",
        sizeBytes: 1024,
    },
    usageRefs: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
});

const readyImage = asset();
assert.equal(isCampaignCueDurableMediaAsset(readyImage), true);
assert.equal(isCampaignCueDurableVisualAsset(readyImage), true);
assert.equal(isCampaignCueReadyVisualAsset(readyImage), true);

const readyVideo = asset({
    assetType: "video",
    file: {
        storagePath: "campaigncue/assets/cc_workspace_test/upload_2/source.mp4",
        storageGeneration: "234567",
        mimeType: "video/mp4",
        sizeBytes: 2048,
    },
});
assert.equal(isCampaignCueReadyVisualAsset(readyVideo), true);

const audio = asset({
    assetType: "audio",
    file: {
        storagePath: "campaigncue/assets/cc_workspace_test/upload_3/source.mp3",
        storageGeneration: "345678",
        mimeType: "audio/mpeg",
        sizeBytes: 512,
    },
});
assert.equal(isCampaignCueDurableMediaAsset(audio), true);
assert.equal(isCampaignCueDurableVisualAsset(audio), false);
assert.equal(isCampaignCueReadyVisualAsset(audio), false);

const metadataOnly = asset({ file: undefined, source: "manual" });
assert.equal(isCampaignCueDurableVisualAsset(metadataOnly), false);
assert.equal(isCampaignCueReadyVisualAsset(metadataOnly), false);

const missingGeneration = asset({
    file: {
        storagePath: "campaigncue/assets/cc_workspace_test/upload_4/source.png",
        mimeType: "image/png",
        sizeBytes: 1024,
    },
});
assert.equal(isCampaignCueReadyVisualAsset(missingGeneration), false);

const needsReview = asset({ rights: { status: "needs_review", consentType: "unknown" } });
assert.equal(isCampaignCueReviewVisualAsset(needsReview), true);
assert.equal(isCampaignCueReadyVisualAsset(needsReview), false);

const restricted = asset({ status: "blocked", rights: { status: "restricted", consentType: "unknown" } });
assert.equal(isCampaignCueRestrictedVisualAsset(restricted), true);
assert.equal(isCampaignCueReadyVisualAsset(restricted), false);

assert.equal(campaignCueRightsStatusForConsent("unknown"), "needs_review");
for (const consent of ["not_applicable", "owner_confirmed", "creator_release", "customer_release"] as const) {
    assert.equal(campaignCueRightsStatusForConsent(consent), "confirmed");
}

const tags = buildCampaignCueMediaMissionTags({
    task: "Take one clear photo of today's lunch special",
    recipeId: "restaurant_slow_lunch_push",
    extraTags: ["Asset Library", "private-upload", "   ", "A".repeat(100)],
});
assert.equal(tags[0], "private-upload");
assert.ok(tags.includes("photo-mission"));
assert.ok(tags.includes("recipe-restaurant-slow-lunch-push"));
assert.ok(tags.every((tag) => tag.length > 0 && tag.length <= 40));
assert.equal(new Set(tags).size, tags.length);
assert.ok(tags.length <= 12);

const uploadInput = {
    idempotencyKey: "photo_upload_test_123",
    name: "Lunch photo",
    assetType: "image" as const,
    storagePath: "campaigncue/assets/cc_workspace_test/upload/source.png",
    mimeType: "image/png",
};
assert.equal(CampaignCueAssetSchema.safeParse({
    ...uploadInput,
    sizeBytes: CAMPAIGNCUE_MAX_IMAGE_ASSET_SIZE_BYTES,
}).success, true);
assert.equal(CampaignCueAssetSchema.safeParse({
    ...uploadInput,
    sizeBytes: CAMPAIGNCUE_MAX_IMAGE_ASSET_SIZE_BYTES + 1,
}).success, false);
assert.equal(CampaignCueAssetSchema.safeParse({
    ...uploadInput,
    assetType: "audio",
    mimeType: "audio/mpeg",
    sizeBytes: CAMPAIGNCUE_MAX_AUDIO_ASSET_SIZE_BYTES + 1,
}).success, false);
assert.equal(CampaignCueAssetSchema.safeParse({
    ...uploadInput,
    assetType: "video",
    mimeType: "video/mp4",
    sizeBytes: CAMPAIGNCUE_MAX_VIDEO_ASSET_SIZE_BYTES,
}).success, true);

assert.throws(() => parseCampaignCueAssetRecord({
    assetId: readyImage.id,
    workspaceId: readyImage.workspaceId,
    value: {
        ...readyImage,
        file: { ...readyImage.file, sizeBytes: CAMPAIGNCUE_MAX_IMAGE_ASSET_SIZE_BYTES + 1 },
    },
}), /asset size is invalid/);

assert.equal(isDefinitiveCampaignCueMediaRegistrationRejection(400), true);
assert.equal(isDefinitiveCampaignCueMediaRegistrationRejection(429), true);
assert.equal(isDefinitiveCampaignCueMediaRegistrationRejection(500), false);
assert.equal(shouldCleanupCampaignCueMediaUploadAfterFailure({
    registrationDispatched: false,
    registrationWasUncertain: false,
}), true, "failed Storage uploads clean up partial files before registration");
assert.equal(shouldCleanupCampaignCueMediaUploadAfterFailure({
    registrationDispatched: true,
    registrationWasUncertain: false,
    responseStatus: 400,
}), true, "definitive API rejection cleans up unregistered files");
assert.equal(shouldCleanupCampaignCueMediaUploadAfterFailure({
    registrationDispatched: true,
    registrationWasUncertain: true,
    responseStatus: 409,
}), false, "uncertain registration preserves files that a committed asset may reference");
assert.equal(shouldCleanupCampaignCueMediaUploadAfterFailure({
    registrationDispatched: true,
    registrationWasUncertain: false,
}), false, "an invalid success response preserves potentially committed files");

const uploadClient = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/assetUploadClient.ts"), "utf8");
const firebaseSessionClient = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/firebaseSessionClient.ts"), "utf8");
assert.match(uploadClient, /CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES/);
assert.match(uploadClient, /PREVIEW_DECODE_TIMEOUT_MS/);
assert.match(uploadClient, /withCampaignCueFirebaseSession/);
assert.match(uploadClient, /purpose: "media_upload"/);
assert.match(uploadClient, /sourceFileName:/);
assert.match(uploadClient, /const registrationPayload = JSON\.stringify\(/);
assert.match(uploadClient, /registrationWasUncertain = true/);
assert.match(uploadClient, /rawAsset = await register\(\)/);
assert.doesNotMatch(uploadClient, /body: JSON\.stringify\(\{\s*idempotencyKey:/, "registration retries must reuse one stable serialized payload");
assert.match(firebaseSessionClient, /inMemoryPersistence/);
assert.match(firebaseSessionClient, /signOut\(auth\)/);
assert.match(uploadClient, /allowedAssetTypes/);

const workspace = fs.readFileSync(path.join(ROOT, "src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx"), "utf8");
assert.match(workspace, /Take photo/);
assert.match(workspace, /Choose photo or clip/);
assert.match(workspace, /Add a file note without upload/);
assert.match(workspace, /uploadCampaignCueMediaAsset/);
assert.match(workspace, /assets: prependBounded/);

for (const sourcePath of [
    "src/lib/campaigncue/decisionEngine.ts",
    "src/lib/campaigncue/dailyDesk.ts",
    "src/lib/campaigncue/operatingLoop.ts",
    "src/lib/campaigncue/pack-templates/factSlotReadiness.ts",
]) {
    const source = fs.readFileSync(path.join(ROOT, sourcePath), "utf8");
    assert.match(source, /isCampaignCueReadyVisualAsset/, `${sourcePath} must use shared visual readiness`);
}

const storageRules = fs.readFileSync(path.join(ROOT, "storage-campaigncue.rules"), "utf8");
assert.match(storageRules, /isCampaignCueSourceMediaTypeAndSizeAllowed\(\)/);
assert.match(storageRules, /hasCampaignCueMediaUploadScope\(uploadId\)/);
assert.match(storageRules, /mediaSourceFileName/);
assert.match(storageRules, /12 \* 1024 \* 1024/);
assert.match(storageRules, /50 \* 1024 \* 1024/);

console.log("CampaignCue Photo and Clip Mission tests passed.");
