import { getProductDeploymentTarget } from "@constant/deploymentTargets";
import { CAMPAIGNCUE_LOCAL_WORKSPACE_PATH, CAMPAIGNCUE_WORKSPACE_PATH } from "./domains";

export const CAMPAIGNCUE_SITE_URL = getProductDeploymentTarget("campaigncue", "production").url;
export const CAMPAIGNCUE_SITE_TITLE = "CampaignCue - Campaign Packs From Real Business Data";
export const CAMPAIGNCUE_SITE_DESCRIPTION =
    "CampaignCue prepares WhatsApp, social, Google, video, and ad campaign packs from real restaurant and salon business data, with source checks before use.";

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

