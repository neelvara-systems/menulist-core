export const dynamic = "force-dynamic";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    listCampaignCueProviderConnectionsServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { NextRequest, NextResponse } from "next/server";
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
            keyPrefix: "integrations",
        });
        if (rateLimit) return rateLimit;

        const integrations = await listCampaignCueProviderConnectionsServer(scoped.scope);
        return NextResponse.json({ data: integrations });
    } catch (error) {
        logCampaignCueServerError("CampaignCue integrations API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.INTEGRATIONS,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue integrations unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
