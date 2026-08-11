export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    requireCampaignCueFeature,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    readCampaignCueAnalyticsServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { NextRequest, NextResponse } from "next/server";

export const GET = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const analyticsDisabled = requireCampaignCueFeature(
            FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_ANALYTICS,
            "Campaign results",
        );
        if (analyticsDisabled) return analyticsDisabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_READ",
            keyPrefix: "analytics",
        });
        if (rateLimit) return rateLimit;

        const analytics = await readCampaignCueAnalyticsServer(scoped.scope);
        return NextResponse.json({ data: analytics });
    } catch (error) {
        logCampaignCueServerError("CampaignCue analytics API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.ANALYTICS,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue analytics unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
