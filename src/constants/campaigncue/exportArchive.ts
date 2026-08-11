import { CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES } from "./database";

export const CAMPAIGNCUE_EXPORT_ARCHIVE = {
    assetIdPrefix: "cc_export_archive",
    contentType: "application/zip",
    maxBytes: CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES.export,
    retentionPolicy: "two_slot_current_per_campaign",
    signedUploadTtlMs: 10 * 60 * 1000,
    uploadLeaseTtlMs: 15 * 60 * 1000,
    slots: ["a", "b"],
} as const;

export type CampaignCueExportArchiveSlot = typeof CAMPAIGNCUE_EXPORT_ARCHIVE.slots[number];

const CAMPAIGNCUE_EXPORT_ARCHIVE_FILENAME_SUFFIX = "-campaigncue-pack.zip";

export const buildCampaignCueExportArchiveFilename = (title: string): string => {
    const slug = title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const maxBaseLength = 120 - CAMPAIGNCUE_EXPORT_ARCHIVE_FILENAME_SUFFIX.length;
    const boundedBase = (slug || "campaign")
        .slice(0, maxBaseLength)
        .replace(/-+$/g, "") || "campaign";
    return `${boundedBase}${CAMPAIGNCUE_EXPORT_ARCHIVE_FILENAME_SUFFIX}`;
};

export const buildCampaignCueExportArchiveStoragePath = (
    workspaceId: string,
    campaignId: string,
    slot: CampaignCueExportArchiveSlot,
) => `campaigncue/reports/${workspaceId}/campaigns/${campaignId}/archive-${slot}.zip`;

export const getNextCampaignCueExportArchiveSlot = (
    currentSlot?: CampaignCueExportArchiveSlot,
): CampaignCueExportArchiveSlot => currentSlot === "a" ? "b" : "a";
