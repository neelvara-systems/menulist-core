import { CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_CHANNELS } from "@constant/campaigncue/channels";
import type { CampaignCueAsset, CampaignCueChannel } from "@type/campaigncue";

const ASSET_TYPES = new Set<CampaignCueAsset["assetType"]>(["image", "video", "audio", "document", "logo", "export"]);
const ASSET_STATUSES = new Set<CampaignCueAsset["status"]>(["ready", "blocked", "archived"]);
const ASSET_SOURCES = new Set<CampaignCueAsset["source"]>(["upload", "generated", "imported", "manual"]);
const RIGHTS_STATUSES = new Set<CampaignCueAsset["rights"]["status"]>(["confirmed", "needs_review", "restricted"]);
const CONSENT_TYPES = new Set<NonNullable<CampaignCueAsset["rights"]["consentType"]>>([
    "not_applicable",
    "owner_confirmed",
    "creator_release",
    "customer_release",
    "unknown",
]);
const CHANNELS = new Set<CampaignCueChannel>(CAMPAIGNCUE_CHANNELS);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
);

const isBoundedString = (value: unknown, max: number) => (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
);

const isAbsent = (value: unknown) => value === undefined || value === null;

export const isCampaignCueWorkspaceStoragePath = (storagePath: string, workspaceId: string) => (
    storagePath.startsWith(`campaigncue/assets/${workspaceId}/`)
    || storagePath.startsWith(`campaigncue/renders/${workspaceId}/`)
    || storagePath.startsWith(`campaigncue/reports/${workspaceId}/`)
    || storagePath.startsWith(`campaigncue/cue-layers/${workspaceId}/`)
);

const parseUsageRefs = (value: unknown): CampaignCueAsset["usageRefs"] => {
    if (!Array.isArray(value) || value.length > 24) throw new Error("CampaignCue asset usage references are invalid.");
    return value.map((entry) => {
        if (!isRecord(entry)) throw new Error("CampaignCue asset usage reference is invalid.");
        if (!isAbsent(entry.campaignId) && !isBoundedString(entry.campaignId, 120)) throw new Error("CampaignCue asset campaign reference is invalid.");
        if (!isAbsent(entry.outputId) && !isBoundedString(entry.outputId, 120)) throw new Error("CampaignCue asset output reference is invalid.");
        if (!isAbsent(entry.channel) && !CHANNELS.has(entry.channel as CampaignCueChannel)) {
            throw new Error("CampaignCue asset channel reference is invalid.");
        }
        return {
            campaignId: isAbsent(entry.campaignId) ? undefined : entry.campaignId as string,
            outputId: isAbsent(entry.outputId) ? undefined : entry.outputId as string,
            channel: isAbsent(entry.channel) ? undefined : entry.channel as CampaignCueChannel,
        };
    });
};

export function parseCampaignCueAssetRecord(params: {
    assetId: string;
    value: unknown;
    workspaceId: string;
}): CampaignCueAsset {
    if (!isRecord(params.value)) throw new Error("CampaignCue asset record is invalid.");
    const value = params.value;
    if (
        value.id !== params.assetId
        || value.workspaceId !== params.workspaceId
        || (!isAbsent(value.locationId) && !isBoundedString(value.locationId, 120))
        || !isBoundedString(value.name, 120)
        || !ASSET_TYPES.has(value.assetType as CampaignCueAsset["assetType"])
        || !ASSET_STATUSES.has(value.status as CampaignCueAsset["status"])
        || !ASSET_SOURCES.has(value.source as CampaignCueAsset["source"])
        || !isRecord(value.rights)
        || !RIGHTS_STATUSES.has(value.rights.status as CampaignCueAsset["rights"]["status"])
        || (!isAbsent(value.rights.note) && !isBoundedString(value.rights.note, 400))
        || (!isAbsent(value.rights.consentType) && !CONSENT_TYPES.has(value.rights.consentType as NonNullable<CampaignCueAsset["rights"]["consentType"]>))
        || !Array.isArray(value.tags)
        || value.tags.length > 12
        || value.tags.some((tag) => !isBoundedString(tag, 40))
    ) {
        throw new Error("CampaignCue asset record is invalid.");
    }
    let file: CampaignCueAsset["file"];
    if (!isAbsent(value.file)) {
        if (!isRecord(value.file)) throw new Error("CampaignCue asset file record is invalid.");
        if (!isAbsent(value.file.downloadUrl)) throw new Error("CampaignCue asset file cannot persist a download URL.");
        if (
            !isAbsent(value.file.storagePath)
            && (!isBoundedString(value.file.storagePath, 500)
                || !isCampaignCueWorkspaceStoragePath(value.file.storagePath as string, params.workspaceId))
        ) {
            throw new Error("CampaignCue asset Storage path is invalid.");
        }
        if (!isAbsent(value.file.mimeType) && !isBoundedString(value.file.mimeType, 120)) {
            throw new Error("CampaignCue asset MIME type is invalid.");
        }
        if (
            !isAbsent(value.file.previewStoragePath)
            && (!isBoundedString(value.file.previewStoragePath, 500)
                || !isCampaignCueWorkspaceStoragePath(value.file.previewStoragePath as string, params.workspaceId))
        ) {
            throw new Error("CampaignCue asset preview Storage path is invalid.");
        }
        if (!isAbsent(value.file.previewMimeType) && !["image/png", "image/webp", "image/jpeg"].includes(String(value.file.previewMimeType))) {
            throw new Error("CampaignCue asset preview MIME type is invalid.");
        }
        if (
            !isAbsent(value.file.storageGeneration)
            && (
                typeof value.file.storageGeneration !== "string"
                || !/^[1-9][0-9]{0,29}$/.test(value.file.storageGeneration)
            )
        ) {
            throw new Error("CampaignCue asset Storage generation is invalid.");
        }
        if (
            !isAbsent(value.file.previewStorageGeneration)
            && (
                typeof value.file.previewStorageGeneration !== "string"
                || !/^[1-9][0-9]{0,29}$/.test(value.file.previewStorageGeneration)
            )
        ) {
            throw new Error("CampaignCue asset preview Storage generation is invalid.");
        }
        if (!isAbsent(value.file.sizeBytes) && (
            !Number.isSafeInteger(value.file.sizeBytes)
            || Number(value.file.sizeBytes) < 0
            || Number(value.file.sizeBytes) > CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES[value.assetType as CampaignCueAsset["assetType"]]
        )) {
            throw new Error("CampaignCue asset size is invalid.");
        }
        if (!isAbsent(value.file.previewSizeBytes) && (
            !Number.isSafeInteger(value.file.previewSizeBytes)
            || Number(value.file.previewSizeBytes) < 1
            || Number(value.file.previewSizeBytes) > 1024 * 1024
        )) throw new Error("CampaignCue asset preview size is invalid.");
        for (const dimension of ["width", "height"] as const) {
            if (!isAbsent(value.file[dimension]) && (!Number.isInteger(value.file[dimension]) || Number(value.file[dimension]) < 1 || Number(value.file[dimension]) > 16_384)) {
                throw new Error("CampaignCue asset dimensions are invalid.");
            }
        }
        if (!isAbsent(value.file.durationSeconds) && (typeof value.file.durationSeconds !== "number" || !Number.isFinite(value.file.durationSeconds) || value.file.durationSeconds < 0 || value.file.durationSeconds > 21_600)) {
            throw new Error("CampaignCue asset duration is invalid.");
        }
        if (
            !isAbsent(value.file.storagePath)
            || !isAbsent(value.file.storageGeneration)
            || !isAbsent(value.file.mimeType)
            || !isAbsent(value.file.sizeBytes)
            || !isAbsent(value.file.previewStoragePath)
        ) {
            file = {
                storagePath: isAbsent(value.file.storagePath) ? undefined : value.file.storagePath as string,
                storageGeneration: isAbsent(value.file.storageGeneration)
                    ? undefined
                    : value.file.storageGeneration as string,
                mimeType: isAbsent(value.file.mimeType) ? undefined : value.file.mimeType as string,
                sizeBytes: isAbsent(value.file.sizeBytes) ? undefined : value.file.sizeBytes as number,
                previewStoragePath: isAbsent(value.file.previewStoragePath) ? undefined : value.file.previewStoragePath as string,
                previewStorageGeneration: isAbsent(value.file.previewStorageGeneration) ? undefined : value.file.previewStorageGeneration as string,
                previewMimeType: isAbsent(value.file.previewMimeType)
                    ? undefined
                    : value.file.previewMimeType as "image/png" | "image/webp" | "image/jpeg",
                previewSizeBytes: isAbsent(value.file.previewSizeBytes) ? undefined : value.file.previewSizeBytes as number,
                width: isAbsent(value.file.width) ? undefined : value.file.width as number,
                height: isAbsent(value.file.height) ? undefined : value.file.height as number,
                durationSeconds: isAbsent(value.file.durationSeconds) ? undefined : value.file.durationSeconds as number,
            };
        }
    }
    const usageRefs = parseUsageRefs(value.usageRefs);
    return {
        id: value.id as string,
        workspaceId: value.workspaceId as string,
        locationId: isAbsent(value.locationId) ? undefined : value.locationId as string,
        name: value.name as string,
        assetType: value.assetType as CampaignCueAsset["assetType"],
        status: value.status as CampaignCueAsset["status"],
        source: value.source as CampaignCueAsset["source"],
        rights: {
            status: value.rights.status as CampaignCueAsset["rights"]["status"],
            note: isAbsent(value.rights.note) ? undefined : value.rights.note as string,
            consentType: isAbsent(value.rights.consentType)
                ? undefined
                : value.rights.consentType as NonNullable<CampaignCueAsset["rights"]["consentType"]>,
        },
        tags: value.tags as string[],
        file,
        usageRefs,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
    };
}
