import { CAMPAIGNCUE_PRODUCT_ID } from "./product";

export const CAMPAIGNCUE_API_BASE_PATH = "/api/campaigncue";

export const CAMPAIGNCUE_API_ROUTES = {
    ANALYTICS: `${CAMPAIGNCUE_API_BASE_PATH}/analytics`,
    ASSETS: `${CAMPAIGNCUE_API_BASE_PATH}/assets`,
    CAMPAIGN_ACTION_TEMPLATE: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns/[campaignId]/actions`,
    CAMPAIGNS: `${CAMPAIGNCUE_API_BASE_PATH}/campaigns`,
    INTEGRATIONS: `${CAMPAIGNCUE_API_BASE_PATH}/integrations`,
    LOCATIONS: `${CAMPAIGNCUE_API_BASE_PATH}/locations`,
    SOURCES: `${CAMPAIGNCUE_API_BASE_PATH}/sources`,
    WORKSPACE: `${CAMPAIGNCUE_API_BASE_PATH}/workspace`,
} as const;

export function getCampaignCueCampaignActionApiPath(campaignId: string): string {
    return `${CAMPAIGNCUE_API_ROUTES.CAMPAIGNS}/${encodeURIComponent(campaignId)}/actions`;
}

export function buildCampaignCueAuthLaunchUrl(signInUrl: string): string {
    return `${signInUrl}?product=${CAMPAIGNCUE_PRODUCT_ID}`;
}
