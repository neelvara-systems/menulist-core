export const dynamic = "force-dynamic";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    parseCampaignCueJsonBody,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    CampaignCueOfferPageMutationError,
    mutateCampaignCueOfferPageServer,
} from "@lib/campaigncue/offerPageServer";
import { buildCampaignCueApiError, logCampaignCueServerError } from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueIdSchema } from "@lib/validation/campaigncueSchemas";
import { CampaignCueOfferPageMutationSchema } from "@lib/validation/campaigncueOfferPageSchemas";
import { NextRequest, NextResponse } from "next/server";

export const POST = withCampaignCueAuth(async (
    request: NextRequest,
    session,
    params?: { campaignId?: string },
) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;
        const campaignId = CampaignCueIdSchema.safeParse(params?.campaignId);
        if (!campaignId.success) return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_WRITE",
            keyPrefix: "campaign-offer-page",
        });
        if (rateLimit) return rateLimit;
        const body = await parseCampaignCueJsonBody({
            endpoint: `${CAMPAIGNCUE_API_ROUTES.CAMPAIGNS}/[campaignId]/offer-page`,
            request,
            session,
        });
        if (!body.success) return body.response;
        const validation = validateAPIInput(CampaignCueOfferPageMutationSchema, body.data);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }
        const result = await mutateCampaignCueOfferPageServer({
            campaignId: campaignId.data,
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: result });
    } catch (error) {
        if (error instanceof CampaignCueOfferPageMutationError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logCampaignCueServerError("CampaignCue hosted offer page API error", error, {
            endpoint: `${CAMPAIGNCUE_API_ROUTES.CAMPAIGNS}/[campaignId]/offer-page`,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "Campaign page could not be updated");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
