import { CAMPAIGNCUE_SIGNIN_PRODUCT_PARAM } from "./product";

export const CAMPAIGNCUE_API_BASE_PATH = "/api/campaigncue";

export const CAMPAIGNCUE_API_ROUTES = {
    ANALYTICS: `${CAMPAIGNCUE_API_BASE_PATH}/analytics`,
    ASSETS: `${CAMPAIGNCUE_API_BASE_PATH}/assets`,
    CAMPAIGN_ACTION_TEMPLATE: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns/[campaignId]/actions`,
    CAMPAIGNS: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns`,
    CUE_LAYERS_DESIGNS: `${CAMPAIGNCUE_API_BASE_PATH}/cue-layers/designs`,
    CUE_LAYERS_UPLOADS: `${CAMPAIGNCUE_API_BASE_PATH}/cue-layers/uploads`,
    DESIGN_CUE_TURNS: `${CAMPAIGNCUE_API_BASE_PATH}/design-cue/turns`,
    INTEGRATIONS: `${CAMPAIGNCUE_API_BASE_PATH}/integrations`,
    LOCATIONS: `${CAMPAIGNCUE_API_BASE_PATH}/locations`,
    SOURCES: `${CAMPAIGNCUE_API_BASE_PATH}/sources`,
    WORKSPACE: `${CAMPAIGNCUE_API_BASE_PATH}/workspace`,
} as const;

export function getCampaignCueCampaignActionApiPath(campaignId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CAMPAIGNS}/${encodeURIComponent(campaignId)}/actions`;
}

export function getCampaignCueAssetDownloadApiPath(assetId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.ASSETS}/${encodeURIComponent(assetId)}/download`;
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
