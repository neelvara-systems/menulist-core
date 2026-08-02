export const dynamic = "force-dynamic";

import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueAssetPreviewServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueIdSchema } from "@lib/validation/campaigncueSchemas";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withCampaignCueAuth(async (request: NextRequest, session, params?: { assetId?: string }) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;
        const assetId = validateAPIInput(CampaignCueIdSchema, params?.assetId);
        if (!assetId.success) return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
        const rateLimit = await applyCampaignCueRateLimit({ request, session, feature: "DATA_READ", keyPrefix: "asset-preview" });
        if (rateLimit) return rateLimit;
        return NextResponse.json({ data: await createCampaignCueAssetPreviewServer({ assetId: assetId.data, scope: scoped.scope }) });
    } catch (error) {
        logCampaignCueServerError("CampaignCue asset preview error", error, {
            endpoint: request.nextUrl.pathname,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue asset preview unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
