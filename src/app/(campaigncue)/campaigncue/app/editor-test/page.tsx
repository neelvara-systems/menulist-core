import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FEATURE_FLAGS } from "@/config/features";
import CampaignCueEditorTestClient from "./CampaignCueEditorTestClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Editor Test | CampaignCue",
    description: "Local CampaignCue creative editor test route",
    robots: {
        index: false,
        follow: false,
    },
};

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;

const isLocalHost = (host: string | null) => Boolean(host && LOCAL_HOST_PATTERN.test(host));

export default async function CampaignCueEditorTestPage() {
    const host = (await headers()).get("host");
    const explicitTestRouteEnabled = FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE;

    if (!explicitTestRouteEnabled || !isLocalHost(host)) {
        notFound();
    }

    return <CampaignCueEditorTestClient />;
}
