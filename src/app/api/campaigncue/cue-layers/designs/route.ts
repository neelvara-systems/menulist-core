export const dynamic = "force-dynamic";

import {
    applyCampaignCueRateLimit,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueCueLayersApiError,
    listCampaignCueCueLayerDesignsServer,
} from "@lib/campaigncue/cue-layers/server";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_READ",
            keyPrefix: "cue-layers-designs",
        });
        if (rateLimit) return rateLimit;

        const designs = await listCampaignCueCueLayerDesignsServer(scoped.scope);
        return NextResponse.json({ data: designs });
    } catch (error) {
        const apiError = buildCampaignCueCueLayersApiError(error, "CueLayers designs unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
