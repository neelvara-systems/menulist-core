export const dynamic = "force-dynamic";

import {
    applyCampaignCueRateLimit,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
} from "@lib/campaigncue/apiGuards";
import {
    bootCampaignCueCueLayerDesignServer,
    buildCampaignCueCueLayersApiError,
} from "@lib/campaigncue/cue-layers/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueCueLayerIdSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export const GET = withAuth(async (
    request: NextRequest,
    session,
    params?: { designId?: string },
) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_READ",
            keyPrefix: "cue-layers-boot",
        });
        if (rateLimit) return rateLimit;

        const validation = validateAPIInput(CampaignCueCueLayerIdSchema, params?.designId);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid design", details }, { status: 400 });
        }

        const boot = await bootCampaignCueCueLayerDesignServer({
            designId: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: boot });
    } catch (error) {
        const apiError = buildCampaignCueCueLayersApiError(error, "CueLayers design could not open");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
