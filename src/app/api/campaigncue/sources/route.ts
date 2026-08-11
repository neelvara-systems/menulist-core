export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    parseCampaignCueJsonBody,
    requireCampaignCueFeature,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueInboxSourcesServer,
    createCampaignCueSourceInputServer,
    listCampaignCueSourceInputsServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueInboxConfirmSchema, CampaignCueSourceInputSchema } from "@lib/validation/campaigncueSchemas";
import { NextRequest, NextResponse } from "next/server";

const isCampaignCueInboxConfirmation = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
    && (value as Record<string, unknown>).action === "confirm_inbox"
);

export const GET = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const sourcesDisabled = requireCampaignCueFeature(
            FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS,
            "Campaign source inputs",
        );
        if (sourcesDisabled) return sourcesDisabled;

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

export const POST = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const sourcesDisabled = requireCampaignCueFeature(
            FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS,
            "Campaign source inputs",
        );
        if (sourcesDisabled) return sourcesDisabled;

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

        if (isCampaignCueInboxConfirmation(body.data)) {
            const validation = validateAPIInput(CampaignCueInboxConfirmSchema, body.data);
            if (!validation.success) {
                const details = "error" in validation ? validation.error : "Invalid input";
                return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
            }
            const result = await createCampaignCueInboxSourcesServer({
                input: validation.data,
                scope: scoped.scope,
            });
            return NextResponse.json({ data: result }, { status: 201 });
        }

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
