import {
    getDeploymentStage,
    getProductDeploymentTarget,
    type DeploymentStage,
} from "@constant/deploymentTargets";
import { CAMPAIGNCUE_SIGNIN_PRODUCT_PARAM } from "./product";

export const CAMPAIGNCUE_API_BASE_PATH = "/api/campaigncue";

export const CAMPAIGNCUE_API_ROUTES = {
    ANALYTICS: `${CAMPAIGNCUE_API_BASE_PATH}/analytics`,
    ASSETS: `${CAMPAIGNCUE_API_BASE_PATH}/assets`,
    ASSET_DOWNLOAD_TEMPLATE: `${CAMPAIGNCUE_API_BASE_PATH}/assets/[assetId]/download`,
    CAMPAIGN_ACTION_TEMPLATE: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns/[campaignId]/actions`,
    CAMPAIGN_EXPORT_ARCHIVE_TEMPLATE: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns/[campaignId]/export-archive`,
    CAMPAIGNS: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns`,
    CAMPAIGN_VARIANTS: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns/variants`,
    CUE_LAYERS_DESIGNS: `${CAMPAIGNCUE_API_BASE_PATH}/cue-layers/designs`,
    CUE_LAYERS_UPLOADS: `${CAMPAIGNCUE_API_BASE_PATH}/cue-layers/uploads`,
    DESIGN_CUE_TURNS: `${CAMPAIGNCUE_API_BASE_PATH}/design-cue/turns`,
    FIREBASE_TOKEN: `${CAMPAIGNCUE_API_BASE_PATH}/firebase-token`,
    INTEGRATIONS: `${CAMPAIGNCUE_API_BASE_PATH}/integrations`,
    LOCATIONS: `${CAMPAIGNCUE_API_BASE_PATH}/locations`,
    SOURCES: `${CAMPAIGNCUE_API_BASE_PATH}/sources`,
    VIDEO_PROJECTS: `${CAMPAIGNCUE_API_BASE_PATH}/video-projects`,
    WORKSPACE: `${CAMPAIGNCUE_API_BASE_PATH}/workspace`,
} as const;

export function getCampaignCueCampaignActionApiPath(campaignId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CAMPAIGNS}/${encodeURIComponent(campaignId)}/actions`;
}

export function getCampaignCueExportArchiveApiPath(campaignId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CAMPAIGNS}/${encodeURIComponent(campaignId)}/export-archive`;
}

export function getCampaignCueOfferPageApiPath(campaignId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CAMPAIGNS}/${encodeURIComponent(campaignId)}/offer-page`;
}

export function getCampaignCuePublicOfferPath(slug: string, localDevelopment = false): string {
    const prefix = localDevelopment ? "/__campaigncue" : "";
    return `${prefix}/offer/${encodeURIComponent(slug)}`;
}

export function getCampaignCuePublicOfferUrl(
    slug: string,
    stage: DeploymentStage = getDeploymentStage(),
): string {
    const target = getProductDeploymentTarget("campaigncue", stage);
    return new URL(getCampaignCuePublicOfferPath(slug, stage === "local"), target.url).toString();
}

export function getCampaignCueAssetDownloadApiPath(assetId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.ASSETS}/${encodeURIComponent(assetId)}/download`;
}

export function getCampaignCueAssetPreviewApiPath(assetId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.ASSETS}/${encodeURIComponent(assetId)}/preview`;
}

export function getCampaignCueCueLayersJobApiPath(jobId: string): string {
    return `${CAMPAIGNCUE_API_BASE_PATH}/cue-layers/jobs/${encodeURIComponent(jobId)}`;
}

export function getCampaignCueCueLayersBootApiPath(designId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CUE_LAYERS_DESIGNS}/${encodeURIComponent(designId)}/boot`;
}

export function getCampaignCueCueLayersAutosaveApiPath(designId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CUE_LAYERS_DESIGNS}/${encodeURIComponent(designId)}/autosave`;
}

export function getCampaignCueCueLayersRepairApiPath(designId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CUE_LAYERS_DESIGNS}/${encodeURIComponent(designId)}/repair`;
}

export function getCampaignCueCueLayersExportApiPath(designId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CUE_LAYERS_DESIGNS}/${encodeURIComponent(designId)}/exports`;
}

export function buildCampaignCueAuthLaunchUrl(
    signInUrl: string,
    callbackUrl?: string,
): string {
    const params = new URLSearchParams({
        product: CAMPAIGNCUE_SIGNIN_PRODUCT_PARAM,
    });
    if (callbackUrl) {
        params.set("callbackUrl", callbackUrl);
    }

    const separator = signInUrl.includes("?") ? "&" : "?";
    return `${signInUrl}${separator}${params.toString()}`;
}
