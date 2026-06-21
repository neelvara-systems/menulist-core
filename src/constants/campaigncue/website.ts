import { getProductDeploymentTarget } from "@constant/deploymentTargets";
import { CAMPAIGNCUE_LOCAL_WORKSPACE_PATH, CAMPAIGNCUE_WORKSPACE_PATH } from "./domains";
import { CAMPAIGNCUE_WEBSITE_FEATURES } from "./websiteFeatures";
import { CAMPAIGNCUE_WEBSITE_USE_CASES } from "./websiteUseCases";

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
    ...CAMPAIGNCUE_WEBSITE_USE_CASES.map((useCase) => ({
        path: useCase.path,
        title: `${useCase.title} - CampaignCue`,
        description: useCase.metaDescription,
        priority: 0.9,
        changeFrequency: "monthly" as const,
    })),
    ...CAMPAIGNCUE_WEBSITE_FEATURES.map((feature) => ({
        path: feature.path,
        title: `${feature.title} - CampaignCue`,
        description: feature.metaDescription,
        priority: 0.8,
        changeFrequency: "monthly" as const,
    })),
];

export function buildCampaignCueUrl(path: string = "/"): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return new URL(cleanPath, CAMPAIGNCUE_SITE_URL).toString();
}
