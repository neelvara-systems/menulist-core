#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import { parseCampaignCueAssetRecord } from "../../src/lib/campaigncue/assetBoundary";
import { CampaignCueAssetSchema } from "../../src/lib/validation/campaigncueSchemas";

const ROOT = path.resolve(__dirname, "..", "..");

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const assertThrows = (callback: () => unknown, message: string) => {
    let threw = false;
    try {
        callback();
    } catch {
        threw = true;
    }
    assert(threw, message);
};

const baseAsset = () => ({
    id: "cc_asset_test",
    workspaceId: "cc_workspace_test",
    name: "Lunch photo",
    assetType: "image",
    status: "ready",
    source: "upload",
    rights: {
        status: "confirmed",
        note: null,
        consentType: "owner_confirmed",
    },
    tags: ["lunch"],
    usageRefs: [],
    createdAt: { seconds: 1, nanoseconds: 0 },
    updatedAt: { seconds: 1, nanoseconds: 0 },
});

const main = () => {
    const legacyNullFile = parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: { ...baseAsset(), file: null },
        workspaceId: "cc_workspace_test",
    });
    assert(!legacyNullFile.file, "legacy null file metadata must normalize to no file");

    const stored = parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: {
            ...baseAsset(),
            file: {
                storagePath: "campaigncue/assets/cc_workspace_test/images/lunch.png",
                storageGeneration: "1722099012345678",
                mimeType: "image/png",
                sizeBytes: 1024,
                previewStoragePath: "campaigncue/assets/cc_workspace_test/images/preview.webp",
                previewStorageGeneration: "1722099012345679",
                previewMimeType: "image/webp",
                previewSizeBytes: 512,
                width: 1080,
                height: 1080,
            },
        },
        workspaceId: "cc_workspace_test",
    });
    assert(stored.file?.storagePath?.includes("cc_workspace_test"), "workspace-owned Storage path must parse");
    assert(stored.file?.storageGeneration === "1722099012345678", "exact Storage generation must parse");
    assert(stored.file?.previewStorageGeneration === "1722099012345679", "exact preview generation must parse");

    const projected = parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: { ...baseAsset(), internalClaimId: "must-not-project", privateProviderPayload: { secret: true } },
        workspaceId: "cc_workspace_test",
    });
    assert(!("internalClaimId" in projected), "unexpected persisted claim fields must not enter the asset DTO");
    assert(!("privateProviderPayload" in projected), "unexpected persisted provider fields must not enter the asset DTO");
    assertThrows(() => parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: { ...baseAsset(), usageRefs: [{ campaignId: "cc_campaign_test", channel: "email" }] },
        workspaceId: "cc_workspace_test",
    }), "asset usage references must reject channels outside the CampaignCue contract");

    assertThrows(() => parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: { ...baseAsset(), file: { downloadUrl: "https://evil.example/file" } },
        workspaceId: "cc_workspace_test",
    }), "persisted external download URL must fail closed");
    assertThrows(() => parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: { ...baseAsset(), file: { storagePath: "campaigncue/assets/another_workspace/file.png" } },
        workspaceId: "cc_workspace_test",
    }), "cross-workspace Storage path must fail closed");
    assertThrows(() => parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: { ...baseAsset(), file: { previewStoragePath: "campaigncue/assets/another_workspace/preview.webp" } },
        workspaceId: "cc_workspace_test",
    }), "cross-workspace preview path must fail closed");
    assertThrows(() => parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: {
            ...baseAsset(),
            file: {
                storagePath: "campaigncue/assets/cc_workspace_test/images/lunch.png",
                storageGeneration: "../latest",
            },
        },
        workspaceId: "cc_workspace_test",
    }), "malformed Storage generation must fail closed");
    assertThrows(() => parseCampaignCueAssetRecord({
        assetId: "cc_asset_test",
        value: { ...baseAsset(), file: { previewStorageGeneration: "../latest" } },
        workspaceId: "cc_workspace_test",
    }), "malformed preview Storage generation must fail closed");
    assertThrows(() => parseCampaignCueAssetRecord({
        assetId: "different_asset",
        value: baseAsset(),
        workspaceId: "cc_workspace_test",
    }), "document and payload asset IDs must match");

    assert(!CampaignCueAssetSchema.safeParse({
        idempotencyKey: "asset-detached-channel-001",
        name: "External file",
        assetType: "image",
        downloadUrl: "https://evil.example/file",
    }).success, "owner asset schema must reject external download URLs and unknown fields");
    assert(!CampaignCueAssetSchema.safeParse({
        idempotencyKey: "asset-detached-output-001",
        name: "Detached output",
        assetType: "export",
        outputId: "cc_output_test",
    }).success, "output references must require a campaign reference");
    assert(CampaignCueAssetSchema.safeParse({
        idempotencyKey: "asset-campaign-export-001",
        name: "Campaign export",
        assetType: "export",
        campaignId: "cc_campaign_test",
        outputId: "cc_output_test",
        channel: "creative",
    }).success, "bounded campaign/output linkage must validate");
    assert(CampaignCueAssetSchema.safeParse({
        idempotencyKey: "asset-audio-upload-001",
        name: "Owner music",
        assetType: "audio",
        storagePath: "campaigncue/assets/cc_workspace_test/audio/source.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 1024,
        previewStoragePath: "campaigncue/assets/cc_workspace_test/audio/preview.webp",
        previewMimeType: "image/webp",
        previewSizeBytes: 512,
    }).success, "private audio with a bounded preview must validate");
    assert(!CampaignCueAssetSchema.safeParse({
        idempotencyKey: "asset-preview-detached-001",
        name: "Detached preview",
        assetType: "image",
        previewStoragePath: "campaigncue/assets/cc_workspace_test/images/preview.webp",
        previewMimeType: "image/webp",
        previewSizeBytes: 512,
    }).success, "preview registration must require a source file");

    const server = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/server.ts"), "utf8");
    const assetStart = server.indexOf("export async function createCampaignCueAssetServer");
    const assetEnd = server.indexOf("export async function createCampaignCueSourceInputServer", assetStart);
    const assetBlock = server.slice(assetStart, assetEnd);
    assert(assetStart > -1 && assetEnd > assetStart, "asset server block must be discoverable");
    assert(assetBlock.includes("parseCampaignCueAssetRecord"), "asset download must project persisted records through the strict boundary");
    assert(assetBlock.includes("isCampaignCueWorkspaceStoragePath"), "asset registration must enforce workspace Storage ownership");
    assert(server.includes(".getMetadata()"), "asset registration must derive file metadata from CampaignCue Storage");
    assert(assetBlock.includes("storageGeneration"), "asset registration must persist the verified immutable Storage generation");
    assert(server.includes("isCampaignCueMediaHeaderValid"), "asset registration must verify MIME signatures before admitting uploaded media");
    assert(assetBlock.includes("previewStorageGeneration"), "asset registration must bind private previews to an immutable Storage generation");
    assert(assetBlock.includes("assertCampaignCueAssetBinding"), "asset registration must validate output references against both initial and transaction-current campaign truth");
    assert(assetBlock.includes("assertCurrentCampaignCueWorkspaceAccess"), "asset registration must recheck current member authority in its commit transaction");
    assert(assetBlock.includes("assertCampaignCueIdempotencyClaimOwnership"), "asset registration must bind its commit to the exact replay claim");
    assert(!assetBlock.includes("asset.file?.downloadUrl"), "asset download must never return persisted external URLs");
    assert(assetBlock.includes("generation: storageGeneration"), "asset download must sign the exact registered Storage generation");

    console.log("CampaignCue asset boundary tests passed.");
};

main();
