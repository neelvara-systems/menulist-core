export const dynamic = "force-dynamic";

import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueAssetDownloadServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueIdSchema } from "@lib/validation/campaigncueSchemas";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export const GET = withAuth(async (
    request: NextRequest,
    session,
    params?: { assetId?: string },
) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const assetIdValidation = validateAPIInput(CampaignCueIdSchema, params?.assetId);
        if (!assetIdValidation.success) {
            const details = "error" in assetIdValidation ? assetIdValidation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid asset", details }, { status: 400 });
        }

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_READ",
            keyPrefix: "asset-download",
        });
        if (rateLimit) return rateLimit;

        const download = await createCampaignCueAssetDownloadServer({
            assetId: assetIdValidation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: download });
    } catch (error) {
        logCampaignCueServerError("CampaignCue asset download API error", error, {
            endpoint: request.nextUrl.pathname,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue asset download unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
