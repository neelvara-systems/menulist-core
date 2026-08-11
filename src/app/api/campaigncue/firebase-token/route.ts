export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    logCampaignCueInputValidationFailure,
    requireCampaignCueFeature,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
    withCampaignCueAuth,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueApiError,
    createCampaignCueFirebaseTokenServer,
    logCampaignCueServerError,
} from "@lib/campaigncue/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueFirebaseSessionAuthorizationSchema } from "@lib/validation/campaigncueSchemas";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withCampaignCueAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;
        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;
        const validation = validateAPIInput(
            CampaignCueFirebaseSessionAuthorizationSchema,
            Object.fromEntries(request.nextUrl.searchParams.entries()),
        );
        if (!validation.success) {
            logCampaignCueInputValidationFailure({
                endpoint: CAMPAIGNCUE_API_ROUTES.FIREBASE_TOKEN,
                label: "Input Validation Failed - CampaignCue Firebase Session",
                request,
                session,
                validationError: "error" in validation ? validation.error : "Invalid input",
            });
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }
        if (validation.data.purpose !== "media_upload") {
            const featureDisabled = requireCampaignCueFeature(
                FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY,
                "CampaignCue campaign bases",
            );
            if (featureDisabled) return featureDisabled;
        }
        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: validation.data.purpose === "media_upload"
                ? "FILE_UPLOAD"
                : validation.data.purpose === "workspace_template_write"
                    ? "DATA_WRITE"
                    : "DATA_READ",
            keyPrefix: `firebase-session-${validation.data.purpose}`,
        });
        if (rateLimit) return rateLimit;
        return NextResponse.json({
            data: await createCampaignCueFirebaseTokenServer(scoped.scope, validation.data),
        });
    } catch (error) {
        logCampaignCueServerError("CampaignCue Firebase session authorization error", error, {
            endpoint: CAMPAIGNCUE_API_ROUTES.FIREBASE_TOKEN,
            userId: getCampaignCueSessionScope(session).userId,
        });
        const apiError = buildCampaignCueApiError(error, "CampaignCue private Firebase authorization failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
