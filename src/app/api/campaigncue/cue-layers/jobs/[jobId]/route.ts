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
    readCampaignCueCueLayerJobServer,
} from "@lib/campaigncue/cue-layers/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueCueLayerIdSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withCampaignCueAuth(async (
    request: NextRequest,
    session,
    params?: { jobId?: string },
) => {
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
            keyPrefix: "cue-layers-job",
        });
        if (rateLimit) return rateLimit;

        const validation = validateAPIInput(CampaignCueCueLayerIdSchema, params?.jobId);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid job", details }, { status: 400 });
        }

        const job = await readCampaignCueCueLayerJobServer({
            jobId: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: job });
    } catch (error) {
        const apiError = buildCampaignCueCueLayersApiError(error, "CueLayers job unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
