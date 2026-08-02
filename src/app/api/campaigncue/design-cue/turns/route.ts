export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    getCampaignCueSecurityLogContext,
    parseCampaignCueJsonBody,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getBoundedSecurityStringContext } from "@lib/security/securityDiagnostics";
import { logger } from "@lib/monitoring/logger";
import { CampaignCueDesignCueTurnSchema } from "@lib/validation/campaigncueDesignCueSchemas";
import { NextRequest, NextResponse } from "next/server";

export const POST = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_DESIGN_CUE) {
            return NextResponse.json({ error: "Design Cue is disabled" }, { status: 404 });
        }

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "AI_OPERATION",
            keyPrefix: "design-cue",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({
            endpoint: CAMPAIGNCUE_API_ROUTES.DESIGN_CUE_TURNS,
            logLabel: "Invalid JSON - CampaignCue Design Cue",
            request,
            session,
        });
        if (!body.success) return body.response;

        const validation = validateAPIInput(CampaignCueDesignCueTurnSchema, body.data);
        if ("error" in validation) {
            logger.security("Input Validation Failed - CampaignCue Design Cue", {
                ...getCampaignCueSecurityLogContext(session, request, CAMPAIGNCUE_API_ROUTES.DESIGN_CUE_TURNS, {
                    ...getBoundedSecurityStringContext("validationError", validation.error),
                }),
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: validation.error }, { status: 400 });
        }

        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST) {
            return NextResponse.json({
                data: {
                    mode: "programmatic_required",
                    reason: "Design Cue model assist is disabled. Use local command chips or safe deterministic comments.",
                },
            }, { status: 409 });
        }

        return NextResponse.json({
            error: "Design Cue model assist is not configured",
        }, { status: 501 });
    } catch (error) {
        logCampaignCueServerError("CampaignCue Design Cue API error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.DESIGN_CUE_TURNS,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "Design Cue is unavailable");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
