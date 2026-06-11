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
    logCampaignCueServerError,
    recordCampaignCueActionServer,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueCampaignActionSchema, CampaignCueIdSchema } from "@lib/validation/campaigncueSchemas";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export const POST = withAuth(async (
    request: NextRequest,
    session,
    params?: { campaignId?: string },
) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const campaignIdValidation = CampaignCueIdSchema.safeParse(params?.campaignId);
        if (!campaignIdValidation.success) {
            return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
        }

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_WRITE",
            keyPrefix: "campaign-action",
        });
        if (rateLimit) return rateLimit;

        const validation = validateAPIInput(CampaignCueCampaignActionSchema, await request.json());
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const result = await recordCampaignCueActionServer({
            campaignId: campaignIdValidation.data,
            input: validation.data,
            scope: scoped.scope,
        });
        if ("error" in result && result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        return NextResponse.json({ data: result });
    } catch (error) {
        logCampaignCueServerError("CampaignCue campaign action API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGN_ACTION_TEMPLATE,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue campaign action failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
