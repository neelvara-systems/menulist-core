import type { CampaignCueAsset } from "@type/campaigncue";

export type CampaignCueMediaConsentType = NonNullable<CampaignCueAsset["rights"]["consentType"]>;

const VISUAL_ASSET_TYPES = new Set<CampaignCueAsset["assetType"]>(["image", "logo", "video"]);
const UPLOAD_MEDIA_ASSET_TYPES = new Set<CampaignCueAsset["assetType"]>(["image", "video", "audio"]);
const STORAGE_GENERATION_PATTERN = /^[1-9][0-9]{0,29}$/;

const compact = (value: unknown) => typeof value === "string" ? value.trim() : "";

export const isCampaignCueDurableMediaAsset = (asset: CampaignCueAsset): boolean => (
    UPLOAD_MEDIA_ASSET_TYPES.has(asset.assetType)
    && Boolean(compact(asset.file?.storagePath))
    && STORAGE_GENERATION_PATTERN.test(compact(asset.file?.storageGeneration))
);

export const isCampaignCueDurableVisualAsset = (asset: CampaignCueAsset): boolean => (
    VISUAL_ASSET_TYPES.has(asset.assetType)
    && Boolean(compact(asset.file?.storagePath))
    && STORAGE_GENERATION_PATTERN.test(compact(asset.file?.storageGeneration))
);

export const isCampaignCueReadyVisualAsset = (asset: CampaignCueAsset): boolean => (
    isCampaignCueDurableVisualAsset(asset)
    && asset.status === "ready"
    && asset.rights.status === "confirmed"
);

export const isCampaignCueReviewVisualAsset = (asset: CampaignCueAsset): boolean => (
    isCampaignCueDurableVisualAsset(asset)
    && asset.status === "ready"
    && asset.rights.status === "needs_review"
);

export const isCampaignCueRestrictedVisualAsset = (asset: CampaignCueAsset): boolean => (
    isCampaignCueDurableVisualAsset(asset)
    && (asset.status === "blocked" || asset.rights.status === "restricted")
);

export const campaignCueRightsStatusForConsent = (
    consentType: CampaignCueMediaConsentType,
): CampaignCueAsset["rights"]["status"] => (
    consentType === "unknown" ? "needs_review" : "confirmed"
);

const normalizeTag = (value: string) => value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export const buildCampaignCueMediaMissionTags = (params: {
    extraTags?: readonly string[];
    recipeId?: string;
    task?: string;
} = {}): string[] => Array.from(new Set([
    "private-upload",
    ...(params.task ? ["photo-mission"] : []),
    params.recipeId ? `recipe-${params.recipeId}` : "",
    params.task ? `task-${params.task}` : "",
    ...(params.extraTags || []),
].map(normalizeTag).filter(Boolean))).slice(0, 12);
