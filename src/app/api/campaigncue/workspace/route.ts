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
    loadCampaignCueOverviewServer,
    logCampaignCueServerError,
    patchCampaignCueBusinessServer,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    CampaignCueBusinessPatchSchema,
    type CampaignCueBusinessPatchInput,
} from "@lib/validation/campaigncueSchemas";
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
            keyPrefix: "workspace",
        });
        if (rateLimit) return rateLimit;

        const overview = await loadCampaignCueOverviewServer(scoped.scope);
        return NextResponse.json({ data: overview });
    } catch (error) {
        logCampaignCueServerError("CampaignCue workspace API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.WORKSPACE,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue workspace unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});

export const PATCH = withAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_WRITE",
            keyPrefix: "workspace-update",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({
            endpoint: CAMPAIGNCUE_API_ROUTES.WORKSPACE,
            request,
            session,
        });
        if (!body.success) return body.response;

        const validation = validateAPIInput<CampaignCueBusinessPatchInput>(CampaignCueBusinessPatchSchema, body.data);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const workspacePatch = await patchCampaignCueBusinessServer({
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: workspacePatch });
    } catch (error) {
        logCampaignCueServerError("CampaignCue workspace patch API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.WORKSPACE,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue workspace update failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
