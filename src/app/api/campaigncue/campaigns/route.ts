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
    createCampaignCueCampaignServer,
    listCampaignCueCampaignsServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueCreateCampaignSchema } from "@lib/validation/campaigncueSchemas";
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
            keyPrefix: "campaigns",
        });
        if (rateLimit) return rateLimit;

        const campaigns = await listCampaignCueCampaignsServer(scoped.scope);
        return NextResponse.json({ data: campaigns });
    } catch (error) {
        logCampaignCueServerError("CampaignCue campaigns API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGNS,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue campaigns unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_WRITE",
            keyPrefix: "campaign-create",
        });
        if (rateLimit) return rateLimit;

        const validation = validateAPIInput(CampaignCueCreateCampaignSchema, await request.json());
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const result = await createCampaignCueCampaignServer({
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: result }, { status: result.replayed ? 200 : 201 });
    } catch (error) {
        const apiError = buildCampaignCueApiError(error, "CampaignCue campaign creation failed");
        if (apiError.status >= 500) {
            logCampaignCueServerError("CampaignCue campaign create API error", error, {
                endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGNS,
                userId: getCampaignCueSessionScope(session).userId,
            });
        }
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
