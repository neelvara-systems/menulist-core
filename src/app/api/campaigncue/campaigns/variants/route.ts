export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    parseCampaignCueJsonBody,
    requireCampaignCueFeature,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueLocationVariantsServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueLocationVariantBatchSchema } from "@lib/validation/campaigncueSchemas";
import { NextRequest, NextResponse } from "next/server";

export const POST = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const generationDisabled = requireCampaignCueFeature(
            FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_GENERATION,
            "Branch pack creation",
        );
        if (generationDisabled) return generationDisabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_WRITE",
            keyPrefix: "campaign-location-variants",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({
            endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGN_VARIANTS,
            request,
            session,
        });
        if (!body.success) return body.response;

        const validation = validateAPIInput(CampaignCueLocationVariantBatchSchema, body.data);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const result = await createCampaignCueLocationVariantsServer({
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: result }, { status: result.replayed ? 200 : 201 });
    } catch (error) {
        const apiError = buildCampaignCueApiError(error, "CampaignCue branch packs could not be created");
        if (apiError.status >= 500) {
            logCampaignCueServerError("CampaignCue location variants API error", error, {
                endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGN_VARIANTS,
                userId: getCampaignCueSessionScope(session).userId,
            });
        }
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
