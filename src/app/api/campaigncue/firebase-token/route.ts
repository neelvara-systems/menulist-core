export const dynamic = "force-dynamic";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueFirebaseTokenServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;
        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "FILE_UPLOAD",
            keyPrefix: "firebase-upload-token",
        });
        if (rateLimit) return rateLimit;
        return NextResponse.json({ data: await createCampaignCueFirebaseTokenServer(scoped.scope) });
    } catch (error) {
        logCampaignCueServerError("CampaignCue Firebase upload token error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.FIREBASE_TOKEN,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue private upload authorization failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
