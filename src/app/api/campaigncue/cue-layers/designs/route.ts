export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import {
    applyCampaignCueRateLimit,
    requireCampaignCueFeature,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueCueLayersApiError,
    listCampaignCueCueLayerDesignsServer,
} from "@lib/campaigncue/cue-layers/server";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const featureDisabled = requireCampaignCueFeature(
            FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS,
            "CueLayers",
        );
        if (featureDisabled) return featureDisabled;

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
