import { getProductDeploymentTarget } from "@constant/deploymentTargets";
import { CAMPAIGNCUE_LOCAL_WORKSPACE_PATH, CAMPAIGNCUE_WORKSPACE_PATH } from "./domains";

export const CAMPAIGNCUE_SITE_URL = getProductDeploymentTarget("campaigncue", "production").url;
export const CAMPAIGNCUE_SITE_TITLE = "CampaignCue - Daily Campaign Desk for Local Businesses";
export const CAMPAIGNCUE_SITE_DESCRIPTION =
    "CampaignCue turns real local-business facts into source-checked campaign packs for WhatsApp, Google, social, print, video, and manual handoff.";

export const CAMPAIGNCUE_ROBOTS_DISALLOW_PATHS = [
    CAMPAIGNCUE_WORKSPACE_PATH,
    CAMPAIGNCUE_LOCAL_WORKSPACE_PATH,
] as const;

export const CAMPAIGNCUE_PUBLIC_PAGES: Array<{
    path: string;
    title: string;
    description: string;
    priority: number;
    changeFrequency: "weekly" | "monthly" | "yearly";
}> = [
    {
        path: "/",
        title: CAMPAIGNCUE_SITE_TITLE,
        description: CAMPAIGNCUE_SITE_DESCRIPTION,
        priority: 1,
        changeFrequency: "weekly",
    },
];

export function buildCampaignCueUrl(path: string = "/"): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return new URL(cleanPath, CAMPAIGNCUE_SITE_URL).toString();
}
