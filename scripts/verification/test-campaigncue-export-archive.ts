import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    CAMPAIGNCUE_EXPORT_ARCHIVE,
    buildCampaignCueExportArchiveFilename,
    buildCampaignCueExportArchiveStoragePath,
    getNextCampaignCueExportArchiveSlot,
} from "@constant/campaigncue/exportArchive";
import { hashCampaignCueExportArchiveBlob } from "@lib/campaigncue/exportArchiveClient";
import { filterCampaignCueAssetsForMember } from "@lib/campaigncue/assetVisibility";
import { CAMPAIGNCUE_PACK_RECHECK_ACTIONS } from "@lib/campaigncue/operatingLoop";
import { parseCampaignCueCampaignRecord } from "@lib/campaigncue/recordBoundary";
import {
    CampaignCueCampaignActionSchema,
    CampaignCueExportArchivePrepareSchema,
} from "@lib/validation/campaigncueSchemas";

const ROOT = path.resolve(__dirname, "..", "..");
let checks = 0;

const check: (condition: unknown, message: string) => asserts condition = (condition, message) => {
    assert.ok(condition, message);
    checks += 1;
};

const includes = (relativePath: string, token: string, message: string) => {
    check(fs.readFileSync(path.join(ROOT, relativePath), "utf8").includes(token), message);
};

const excludes = (relativePath: string, token: string, message: string) => {
    check(!fs.readFileSync(path.join(ROOT, relativePath), "utf8").includes(token), message);
};

const workspaceId = "cc_workspace_10_20";
const campaignId = "cc_campaign_archive";
const storagePath = buildCampaignCueExportArchiveStoragePath(workspaceId, campaignId, "a");
const crc32c = "4waSgw==";
const sha256 = "a".repeat(64);

const campaign = {
    id: campaignId,
    workspaceId,
    businessBrainId: "default",
    title: "Checked campaign pack",
    brief: "Use current checked facts.",
    status: "generated",
    channels: ["whatsapp"],
    outputs: [],
    trustGate: "clear",
    credits: {
        estimate: 0,
        reserved: 0,
        captured: 0,
        refunded: 0,
        currency: "credits",
    },
    actionCounts: {},
    ownerApprovalState: "not_requested",
};

async function run() {
    check(CAMPAIGNCUE_EXPORT_ARCHIVE.slots.length === 2, "archive retention has exactly two bounded slots");
    check(CAMPAIGNCUE_PACK_RECHECK_ACTIONS.includes("archive_export"), "cloud archive is covered by the persisted freshness contract");
    check(CAMPAIGNCUE_EXPORT_ARCHIVE.maxBytes === 25 * 1024 * 1024, "archive size is capped at 25 MB");
    check(getNextCampaignCueExportArchiveSlot() === "a", "first archive uses slot a");
    check(getNextCampaignCueExportArchiveSlot("a") === "b", "slot a rotates to slot b");
    check(getNextCampaignCueExportArchiveSlot("b") === "a", "slot b rotates to slot a");
    check(
        buildCampaignCueExportArchiveFilename("\u0926\u0940\u0935\u093e\u0932\u0940 \u0911\u092b\u0930") === "campaign-campaigncue-pack.zip",
        "non-Latin campaign titles receive a server-valid ZIP filename",
    );
    const boundedFilename = buildCampaignCueExportArchiveFilename("A".repeat(500));
    check(
        boundedFilename.length === 120 && CampaignCueExportArchivePrepareSchema.safeParse({
            crc32c,
            filename: boundedFilename,
            sha256,
            sizeBytes: 9,
        }).success,
        "long campaign titles produce a bounded ZIP filename admitted by the server schema",
    );
    check(
        storagePath === `campaigncue/reports/${workspaceId}/campaigns/${campaignId}/archive-a.zip`,
        "archive path is workspace and campaign scoped",
    );

    const knownHash = await hashCampaignCueExportArchiveBlob(new Blob(["123456789"], {
        type: CAMPAIGNCUE_EXPORT_ARCHIVE.contentType,
    }));
    check(knownHash.crc32c === crc32c, "browser CRC32C matches the standard known vector");
    check(
        knownHash.sha256 === "15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225",
        "browser SHA-256 matches the standard known vector",
    );

    const prepare = {
        crc32c,
        filename: "checked-campaign-pack.zip",
        sha256,
        sizeBytes: 1024,
    };
    check(CampaignCueExportArchivePrepareSchema.safeParse(prepare).success, "valid prepare input passes");
    check(!CampaignCueExportArchivePrepareSchema.safeParse({ ...prepare, crc32c: "invalid" }).success, "invalid CRC32C fails");
    check(!CampaignCueExportArchivePrepareSchema.safeParse({ ...prepare, filename: "pack.pdf" }).success, "non-ZIP filename fails");
    check(!CampaignCueExportArchivePrepareSchema.safeParse({ ...prepare, sizeBytes: 0 }).success, "empty archive fails");
    check(
        !CampaignCueExportArchivePrepareSchema.safeParse({
            ...prepare,
            sizeBytes: CAMPAIGNCUE_EXPORT_ARCHIVE.maxBytes + 1,
        }).success,
        "oversized archive fails",
    );
    check(!CampaignCueExportArchivePrepareSchema.safeParse({ ...prepare, unexpected: true }).success, "unknown prepare fields fail");

    const archiveAction = {
        action: "archive_export",
        exportArchive: {
            ...prepare,
            storagePath,
            uploadToken: "cc_archive_upload_1234567890",
        },
        idempotencyKey: "archive_request_123",
    };
    check(CampaignCueCampaignActionSchema.safeParse(archiveAction).success, "archive action requires a complete finalize contract");
    check(
        !CampaignCueCampaignActionSchema.safeParse({
            action: "archive_export",
            idempotencyKey: "archive_request_123",
        }).success,
        "archive action without upload evidence fails",
    );
    check(
        !CampaignCueCampaignActionSchema.safeParse({
            ...archiveAction,
            action: "export",
        }).success,
        "other actions cannot smuggle archive evidence",
    );

    const archive = {
        schemaVersion: 1,
        assetId: "cc_export_archive_1234567890",
        crc32c,
        filename: prepare.filename,
        mimeType: CAMPAIGNCUE_EXPORT_ARCHIVE.contentType,
        retentionPolicy: CAMPAIGNCUE_EXPORT_ARCHIVE.retentionPolicy,
        sha256,
        sizeBytes: prepare.sizeBytes,
        slot: "a",
        storageGeneration: "123456789",
        storagePath,
        archivedAt: "2026-08-10T05:00:00.000Z",
    };
    check(
        parseCampaignCueCampaignRecord({ ...campaign, exportArchive: archive }, { campaignId, workspaceId })
            .exportArchive?.assetId === archive.assetId,
        "valid scoped archive pointer passes the persisted boundary",
    );
    assert.throws(
        () => parseCampaignCueCampaignRecord({
            ...campaign,
            exportArchive: { ...archive, storagePath: storagePath.replace(workspaceId, "cc_workspace_99_99") },
        }, { campaignId, workspaceId }),
        /Storage scope is invalid/,
    );
    checks += 1;
    assert.throws(
        () => parseCampaignCueCampaignRecord({
            ...campaign,
            exportArchive: { ...archive, slot: "b" },
        }, { campaignId, workspaceId }),
        /Storage scope is invalid/,
    );
    checks += 1;
    check(
        parseCampaignCueCampaignRecord({
            ...campaign,
            exportArchiveUploadLease: {
                crc32c,
                filename: prepare.filename,
                sha256,
                sizeBytes: prepare.sizeBytes,
                slot: "a",
                storagePath,
                uploadToken: "cc_archive_upload_1234567890",
                createdBy: "owner_1",
                createdAt: "2026-08-10T05:00:00.000Z",
                expiresAt: "2026-08-10T05:15:00.000Z",
            },
        }, { campaignId, workspaceId }).exportArchiveUploadLease?.slot === "a",
        "valid upload lease passes the persisted boundary",
    );

    const globalAsset = {
        id: "asset_global",
        workspaceId,
        name: "Global logo",
        assetType: "logo" as const,
        status: "ready" as const,
        source: "upload" as const,
        rights: { status: "confirmed" as const },
        tags: [],
        usageRefs: [],
    };
    const assignedAsset = {
        ...globalAsset,
        id: "asset_assigned",
        locationId: "location_a",
        usageRefs: [{ campaignId }],
    };
    const otherLocationAsset = {
        ...assignedAsset,
        id: "asset_other",
        locationId: "location_b",
    };
    const legacyLinkedAsset = {
        ...globalAsset,
        id: "asset_legacy_linked",
        usageRefs: [{ campaignId }],
    };
    const allAssets = [globalAsset, assignedAsset, otherLocationAsset, legacyLinkedAsset];
    check(
        filterCampaignCueAssetsForMember(allAssets, { role: "owner" }).length === allAssets.length,
        "workspace-wide roles retain all asset visibility",
    );
    check(
        filterCampaignCueAssetsForMember(allAssets, {
            role: "local_manager",
            locationIds: ["location_a"],
        }).map((asset) => asset.id).join(",") === "asset_global,asset_assigned",
        "local managers see global unlinked assets and assigned-location assets only",
    );
    check(
        filterCampaignCueAssetsForMember([legacyLinkedAsset], {
            role: "local_manager",
            locationIds: ["location_a"],
        }).length === 0,
        "legacy campaign-linked assets without location metadata fail closed for local managers",
    );

    includes("src/config/features.ts", "ENABLE_CAMPAIGNCUE_CLOUD_EXPORT_ARCHIVE: true", "archive has an explicit feature gate");
    includes("src/lib/campaigncue/server.ts", '"x-goog-hash": `crc32c=${params.input.crc32c}`', "Storage validates the browser checksum");
    includes("src/lib/campaigncue/server.ts", 'ifGenerationMatch: currentTargetGeneration || "0"', "upload uses an object-generation precondition");
    includes("src/lib/campaigncue/server.ts", "campaign.exportArchive.filename === params.input.filename", "unchanged reuse includes the requested archive filename");
    includes("src/lib/campaigncue/server.ts", "lease.createdBy !== params.scope.userId", "finalize is bound to the lease owner");
    includes("src/lib/campaigncue/server.ts", "CAMPAIGNCUE_EXPORT_ARCHIVE_ROLES.has(currentRole)", "finalize rechecks the current workspace role");
    includes("src/lib/campaigncue/server.ts", "filterCampaignCueAssetsForMember", "Asset Library and signed downloads enforce location visibility");
    includes("src/lib/campaigncue/server.ts", "locationId: current.locationId", "saved Campaign Pack assets retain branch scope");
    includes("src/lib/campaigncue/server.ts", "stored.crc32c !== archiveInput.crc32c", "finalize checks the stored checksum");
    includes("src/lib/campaigncue/server.ts", "generation: storageGeneration", "file header verification is pinned to the metadata generation");
    includes("src/lib/campaigncue/server.ts", "campaignCueExportArchiveAssetId", "archive reuses one deterministic Asset Library record");
    excludes("src/lib/campaigncue/server.ts", '"content-disposition": `attachment;', "upload avoids unnecessary Content-Disposition constraints");

    includes("src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts", "withCampaignCueAuth", "prepare route requires authentication");
    includes("src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts", "requireCampaignCueSessionScope", "prepare route requires tenant scope");
    includes("src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts", 'feature: "FILE_UPLOAD"', "prepare route is rate limited as an upload");
    includes("src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts", "CampaignCueExportArchivePrepareSchema", "prepare route validates the runtime shape");
    includes("src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts", "logCampaignCueInputValidationFailure", "prepare validation failures use bounded security logging");
    excludes("src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts", "details }, { status: 400", "prepare validation responses stay generic");

    includes("src/lib/campaigncue/exportArchiveClient.ts", 'credentials: "omit"', "signed Storage PUT omits app credentials");
    includes("src/lib/campaigncue/exportArchiveClient.ts", 'uploadUrl.protocol !== "https:"', "client rejects non-HTTPS signed URLs");
    includes("src/lib/campaigncue/exportArchiveClient.ts", 'uploadUrl.hostname !== "storage.googleapis.com"', "client restricts signed uploads to Google Storage");
    includes("src/lib/campaigncue/exportArchiveClient.ts", "preparation.storagePath !== expectedStoragePath", "client binds upload instructions to the active workspace and campaign");
    includes("src/lib/campaigncue/exportArchiveClient.ts", 'uploadHeaders["x-goog-hash"] !== `crc32c=${crc32c}`', "client binds signed headers to the computed checksum");
    includes("src/lib/campaigncue/exportArchiveClient.ts", "SIGNED_UPLOAD_HEADER_NAMES", "client allowlists signed upload headers");
    includes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", 'url.hostname === "storage.googleapis.com"', "saved-copy downloads accept only signed Google Storage URLs");
    includes("src/app/api/campaigncue/assets/[assetId]/download/route.ts", "logCampaignCueInputValidationFailure", "saved-copy download validation uses bounded security logging");
    excludes("src/app/api/campaigncue/assets/[assetId]/download/route.ts", "details }, { status: 400", "saved-copy download validation stays generic");
    includes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "Date.UTC(1980, 0, 1", "ZIP entry times are deterministic");
    includes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", '"Save cloud copy"', "owner can save a cloud copy");
    includes("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx", "Download saved copy", "owner can retrieve a saved cloud copy");

    includes("storage-campaigncue.rules", "match /campaigncue/reports/{workspaceId}/{allPaths=**}", "Storage rules define the report namespace");
    includes("storage-campaigncue.rules", "allow read, write, delete: if false;", "report objects deny direct Firebase client access");
    includes("scripts/verification/test-campaigncue-storage-rules.ts", "await assertFails(getBytes(ref(ownerStorage, reportPath)))", "Storage emulator locks direct owner reads");
    includes("scripts/verification/test-campaigncue-storage-rules.ts", "await assertFails(uploadBytes(ref(ownerStorage, reportPath)", "Storage emulator locks direct owner writes");

    process.stdout.write(`CampaignCue export archive verification passed (${checks} checks).\n`);
}

void run();
