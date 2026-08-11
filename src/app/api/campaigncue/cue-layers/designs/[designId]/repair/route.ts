export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import {
    applyCampaignCueRateLimit,
    parseCampaignCueJsonBody,
    requireCampaignCueFeature,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueCueLayersApiError,
    repairCampaignCueCueLayerDesignServer,
} from "@lib/campaigncue/cue-layers/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    CampaignCueCueLayerIdSchema,
    CampaignCueCueLayerRepairSchema,
} from "@lib/validation/campaigncueCueLayersSchemas";
import { type NextRequest, NextResponse } from "next/server";

export const POST = withCampaignCueAuth(async (
    request: NextRequest,
    session,
    params?: { designId?: string },
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

        const designIdValidation = validateAPIInput(CampaignCueCueLayerIdSchema, params?.designId);
        if (!designIdValidation.success) {
            const details = "error" in designIdValidation ? designIdValidation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid design", details }, { status: 400 });
        }

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "AI_OPERATION",
            keyPrefix: "cue-layers-repair",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({ request, session });
        if (!body.success) return body.response;

        const validation = validateAPIInput(CampaignCueCueLayerRepairSchema, body.data);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const result = await repairCampaignCueCueLayerDesignServer({
            designId: designIdValidation.data,
            input: validation.data,
            scope: scoped.scope,
        });
        if ("error" in result && result.error) {
            return NextResponse.json({ error: result.error }, { status: typeof result.status === "number" ? result.status : 500 });
        }
        return NextResponse.json({ data: result });
    } catch (error) {
        const apiError = buildCampaignCueCueLayersApiError(error, "CueLayers repair failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
