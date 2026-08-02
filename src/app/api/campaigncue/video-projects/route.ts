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
    listCampaignCueVideoProjectsServer,
    logCampaignCueServerError,
    mutateCampaignCueVideoProjectServer,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueVideoProjectMutationSchema } from "@lib/validation/campaigncueVideoSchemas";
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
            feature: "DATA_READ",
            keyPrefix: "video-projects",
        });
        if (rateLimit) return rateLimit;

        const projects = await listCampaignCueVideoProjectsServer(scoped.scope);
        return NextResponse.json({ data: projects });
    } catch (error) {
        logCampaignCueServerError("CampaignCue video projects API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.VIDEO_PROJECTS,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue video projects unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});

export const POST = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_WRITE",
            keyPrefix: "video-project-mutation",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({
            endpoint: CAMPAIGNCUE_API_ROUTES.VIDEO_PROJECTS,
            request,
            session,
        });
        if (!body.success) return body.response;

        const validation = validateAPIInput(CampaignCueVideoProjectMutationSchema, body.data);
        if (!validation.success) {
            logCampaignCueInputValidationFailure({
                endpoint: CAMPAIGNCUE_API_ROUTES.VIDEO_PROJECTS,
                label: "Input Validation Failed - CampaignCue Video Projects",
                request,
                session,
                validationError: "error" in validation ? validation.error : "Invalid input",
            });
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const result = await mutateCampaignCueVideoProjectServer({
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: result }, { status: result.replayed ? 200 : 201 });
    } catch (error) {
        const apiError = buildCampaignCueApiError(error, "CampaignCue video project update failed");
        if (apiError.status >= 500) {
            logCampaignCueServerError("CampaignCue video project mutation API error", error, {
                endpoint: CAMPAIGNCUE_API_ROUTES.VIDEO_PROJECTS,
                userId: getCampaignCueSessionScope(session).userId,
            });
        }
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
