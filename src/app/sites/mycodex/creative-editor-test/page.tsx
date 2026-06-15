import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CampaignCueEditorPreviewClient from "@/components/templates/campaigncue/CampaignCueEditorPreviewClient";
import { FEATURE_FLAGS } from "@/config/features";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Creative Editor Test | MyCodex",
    description: "Temporary private creative editor test route for MyCodex.",
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;

const isLocalHost = (host: string | null) => Boolean(host && LOCAL_HOST_PATTERN.test(host));

export default function MyCodexCreativeEditorTestPage() {
    const host = headers().get("host");
    const explicitTestRouteEnabled = FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE;

    if (!isLocalHost(host) && !explicitTestRouteEnabled) {
        notFound();
    }

    return <CampaignCueEditorPreviewClient />;
}
