export const dynamic = "force-dynamic";

import {
    applyCampaignCueRateLimit,
    parseCampaignCueJsonBody,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueCueLayersApiError,
    exportCampaignCueCueLayerDesignServer,
} from "@lib/campaigncue/cue-layers/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    CampaignCueCueLayerExportSchema,
    CampaignCueCueLayerIdSchema,
} from "@lib/validation/campaigncueCueLayersSchemas";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export const POST = withAuth(async (
    request: NextRequest,
    session,
    params?: { designId?: string },
) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const designIdValidation = validateAPIInput(CampaignCueCueLayerIdSchema, params?.designId);
        if (!designIdValidation.success) {
            const details = "error" in designIdValidation ? designIdValidation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid design", details }, { status: 400 });
        }

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "DATA_WRITE",
            keyPrefix: "cue-layers-export",
        });
        if (rateLimit) return rateLimit;

        const body = await parseCampaignCueJsonBody({ request, session });
        if (!body.success) return body.response;

        const validation = validateAPIInput(CampaignCueCueLayerExportSchema, body.data);
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const result = await exportCampaignCueCueLayerDesignServer({
            designId: designIdValidation.data,
            input: validation.data,
            scope: scoped.scope,
        });
        if ("error" in result && result.error) {
            return NextResponse.json({ error: result.error }, { status: typeof result.status === "number" ? result.status : 500 });
        }
        return NextResponse.json({ data: result });
    } catch (error) {
        const apiError = buildCampaignCueCueLayersApiError(error, "CueLayers export failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
