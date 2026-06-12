export const dynamic = "force-dynamic";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    applyCampaignCueRateLimit,
    getCampaignCueSessionScope,
    requireCampaignCueRuntime,
    requireCampaignCueSessionScope,
} from "@lib/campaigncue/apiGuards";
import {
    buildCampaignCueCueLayersApiError,
    createCampaignCueCueLayerUploadServer,
} from "@lib/campaigncue/cue-layers/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CampaignCueCueLayerUploadSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        const disabled = requireCampaignCueRuntime();
        if (disabled) return disabled;

        const scoped = requireCampaignCueSessionScope(request, session);
        if ("error" in scoped && scoped.error) return scoped.error;

        const rateLimit = await applyCampaignCueRateLimit({
            request,
            session,
            feature: "FILE_UPLOAD",
            keyPrefix: "cue-layers-upload",
        });
        if (rateLimit) return rateLimit;

        const validation = validateAPIInput(CampaignCueCueLayerUploadSchema, await request.json());
        if (!validation.success) {
            const details = "error" in validation ? validation.error : "Invalid input";
            return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
        }

        const result = await createCampaignCueCueLayerUploadServer({
            input: validation.data,
            scope: scoped.scope,
        });
        return NextResponse.json({ data: result }, { status: 201 });
    } catch (error) {
        const apiError = buildCampaignCueCueLayersApiError(error, "CueLayers upload failed");
        return NextResponse.json(apiError.body, { status: apiError.status });
    }
});
