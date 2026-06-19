export const dynamic = "force-dynamic";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    parseCampaignCueJsonBody,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueSourceInputServer,
    listCampaignCueSourceInputsServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueSourceInputSchema } from "@lib/validation/campaigncueSchemas";
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
            keyPrefix: "sources",
        });
        if (rateLimit) return rateLimit;

        const sourceInputs = await listCampaignCueSourceInputsServer(scoped.scope);
        return NextResponse.json({ data: sourceInputs });
    } catch (error) {
        logCampaignCueServerError("CampaignCue sources API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.SOURCES,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue sources unavailable");
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
            keyPrefix: "source-create",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({
            endpoint: CAMPAIGNCUE_API_ROUTES.SOURCES,
            request,
            session,
        });
        if (!body.success) return body.response;

        const validation = validateAPIInput(CampaignCueSourceInputSchema, body.data);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const sourceInput = await createCampaignCueSourceInputServer({
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: sourceInput }, { status: 201 });
    } catch (error) {
        logCampaignCueServerError("CampaignCue source create API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.SOURCES,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue source input failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
