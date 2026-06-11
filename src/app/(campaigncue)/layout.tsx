import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    applicationName: "CampaignCue",
    title: {
        default: "CampaignCue Workspace",
        template: "%s | CampaignCue",
    },
    description: "CampaignCue protected owner workspace",
    robots: {
        index: false,
        follow: false,
    },
};

export default function CampaignCueAppLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
