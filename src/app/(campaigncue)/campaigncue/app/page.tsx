import type { Metadata } from "next";
import CampaignCueWorkspaceApp from "@template/campaigncue/CampaignCueWorkspaceApp";

export const metadata: Metadata = {
    title: "Workspace | CampaignCue",
    description: "CampaignCue workspace",
};

export default function CampaignCueAppPage() {
    return <CampaignCueWorkspaceApp />;
}
