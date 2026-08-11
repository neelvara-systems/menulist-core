export const dynamic = "force-dynamic";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    logCampaignCueInputValidationFailure,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueAssetDownloadServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueIdSchema } from "@lib/validation/campaigncueSchemas";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withCampaignCueAuth(async (
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
            logCampaignCueInputValidationFailure({
                endpoint: CAMPAIGNCUE_API_ROUTES.ASSET_DOWNLOAD_TEMPLATE,
                label: "Input Validation Failed - CampaignCue Asset Download",
                request,
                session,
                validationError: "error" in assetIdValidation ? assetIdValidation.error : "Invalid input",
            });
            return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
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
            endpoint: CAMPAIGNCUE_API_ROUTES.ASSET_DOWNLOAD_TEMPLATE,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue asset download unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
