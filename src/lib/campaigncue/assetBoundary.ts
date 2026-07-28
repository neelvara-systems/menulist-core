import { CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES } from "@constant/campaigncue/database";
import type { CampaignCueAsset, CampaignCueChannel } from "@type/campaigncue";

const ASSET_TYPES = new Set<CampaignCueAsset["assetType"]>(["image", "video", "document", "logo", "export"]);
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
        if (!isAbsent(entry.channel) && !isBoundedString(entry.channel, 40)) throw new Error("CampaignCue asset channel reference is invalid.");
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
            !isAbsent(value.file.storageGeneration)
            && (
                typeof value.file.storageGeneration !== "string"
                || !/^[1-9][0-9]{0,29}$/.test(value.file.storageGeneration)
            )
        ) {
            throw new Error("CampaignCue asset Storage generation is invalid.");
        }
        if (!isAbsent(value.file.sizeBytes) && (
            !Number.isSafeInteger(value.file.sizeBytes)
            || Number(value.file.sizeBytes) < 0
            || Number(value.file.sizeBytes) > CAMPAIGNCUE_MAX_ASSET_SIZE_BYTES
        )) {
            throw new Error("CampaignCue asset size is invalid.");
        }
        if (
            !isAbsent(value.file.storagePath)
            || !isAbsent(value.file.storageGeneration)
            || !isAbsent(value.file.mimeType)
            || !isAbsent(value.file.sizeBytes)
        ) {
            file = {
                storagePath: isAbsent(value.file.storagePath) ? undefined : value.file.storagePath as string,
                storageGeneration: isAbsent(value.file.storageGeneration)
                    ? undefined
                    : value.file.storageGeneration as string,
                mimeType: isAbsent(value.file.mimeType) ? undefined : value.file.mimeType as string,
                sizeBytes: isAbsent(value.file.sizeBytes) ? undefined : value.file.sizeBytes as number,
            };
        }
    }
    const usageRefs = parseUsageRefs(value.usageRefs);
    return {
        ...value,
        rights: {
            ...value.rights,
            note: isAbsent(value.rights.note) ? undefined : value.rights.note as string,
            consentType: isAbsent(value.rights.consentType)
                ? undefined
                : value.rights.consentType as NonNullable<CampaignCueAsset["rights"]["consentType"]>,
        },
        file,
        usageRefs,
    } as unknown as CampaignCueAsset;
}
