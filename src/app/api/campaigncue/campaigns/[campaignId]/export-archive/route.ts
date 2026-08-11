export const dynamic = "force-dynamic";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    logCampaignCueInputValidationFailure,
    parseCampaignCueJsonBody,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    logCampaignCueServerError,
    prepareCampaignCueExportArchiveUploadServer,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    CampaignCueExportArchivePrepareSchema,
    CampaignCueIdSchema,
} from "@lib/validation/campaigncueSchemas";
import { type NextRequest, NextResponse } from "next/server";

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
        if (!campaignId.success) {
            return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
        }

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "FILE_UPLOAD",
            keyPrefix: "export-archive-prepare",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({
            endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGN_EXPORT_ARCHIVE_TEMPLATE,
            request,
            session,
        });
        if (!body.success) return body.response;

        const validation = validateAPIInput(CampaignCueExportArchivePrepareSchema, body.data);
        if (!validation.success) {
            logCampaignCueInputValidationFailure({
                endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGN_EXPORT_ARCHIVE_TEMPLATE,
                label: "Input Validation Failed - CampaignCue Export Archive",
                request,
                session,
                validationError: "error" in validation ? validation.error : "Invalid input",
            });
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const result = await prepareCampaignCueExportArchiveUploadServer({
            campaignId: campaignId.data,
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: result });
    } catch (error) {
        logCampaignCueServerError("CampaignCue export archive prepare API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.CAMPAIGN_EXPORT_ARCHIVE_TEMPLATE,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue cloud copy could not be prepared");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
