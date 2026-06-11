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
    listCampaignCueProviderConnectionsServer,
    logCampaignCueServerError,
    recordCampaignCueIntegrationServer,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueIntegrationActionSchema } from "@lib/validation/campaigncueSchemas";
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
            keyPrefix: "integrations",
        });
        if (rateLimit) return rateLimit;

        const integrations = await listCampaignCueProviderConnectionsServer(scoped.scope);
        return NextResponse.json({ data: integrations });
    } catch (error) {
        logCampaignCueServerError("CampaignCue integrations API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.INTEGRATIONS,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue integrations unavailable");
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
            keyPrefix: "integration-action",
        });
        if (rateLimit) return rateLimit;

        const validation = validateAPIInput(CampaignCueIntegrationActionSchema, await request.json());
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const connection = await recordCampaignCueIntegrationServer({
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: connection });
    } catch (error) {
        logCampaignCueServerError("CampaignCue integration action API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.INTEGRATIONS,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue integration action failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
