export const dynamic = "force-dynamic";

import {
    buildGrowthOSKitId,
    toGrowthOSAdminTimestamp,
    writeGrowthOSKitServer,
    writeGrowthOSSummaryServer,
} from "@database/growthos/server";
import { findGrowthOSAction } from "@lib/growthos/actionRanking";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { buildGrowthOSKit } from "@lib/growthos/kitBuilder";
import { loadGrowthOSServerContext } from "@lib/growthos/serverContext";
import { logger } from "@lib/monitoring/logger";
import { checkDataWriteLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { GrowthOSGenerateKitRequestSchema } from "@lib/validation/growthosSchemas";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../../middleware/auth";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isGrowthOSMasterEnabled()) {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        const rateLimitResponse = await checkDataWriteLimit();
        if (rateLimitResponse) return rateLimitResponse;

        const validation = validateAPIInput(GrowthOSGenerateKitRequestSchema, await request.json());
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Generate Input Validation Failed", {
                ...buildSecurityContext(session, request),
                endpoint: "/api/growthos/kits/generate",
                error: errorMsg,
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }
        const projectId = String(validation.data.projectId);

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Generate API", {
                ...buildSecurityContext(session, request),
                endpoint: "/api/growthos/kits/generate",
                attemptedProjectId: projectId,
            }, "critical");
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const context = await loadGrowthOSServerContext({
            projectId,
            session,
        });

        if (!context.entitlement.allowed) {
            return NextResponse.json({
                error: "Growth Kits unavailable",
                message: context.entitlement.message,
                reason: context.entitlement.reason,
            }, { status: context.entitlement.reason === "feature_off" ? 404 : 403 });
        }

        if (!context.facts || !context.actions.length) {
            return NextResponse.json({
                error: "No Growth Kit available",
                message: "Menu details are not ready for a Growth Kit yet.",
            }, { status: 422 });
        }

        const action = findGrowthOSAction(context.actions, validation.data.actionId);
        if (!action) {
            return NextResponse.json({
                error: "No Growth Kit available",
                message: "No action is ready for this menu.",
            }, { status: 422 });
        }

        const kit = buildGrowthOSKit({
            action,
            facts: context.facts,
            kitId: buildGrowthOSKitId(session.tId, session.sId),
            timestampFactory: toGrowthOSAdminTimestamp,
        });
        await writeGrowthOSKitServer(kit);

        const summary = {
            tId: String(session.tId),
            sId: String(session.sId),
            date: new Date().toISOString().split("T")[0],
            sourceFactsHash: context.sourceFactsHash,
            eligible: true,
            readiness: context.readiness,
            primaryAction: context.actions[0],
            secondaryActions: context.actions.slice(1),
            latestKit: {
                id: kit.id,
                actionType: kit.actionType,
                title: kit.title,
                itemName: kit.itemName,
                outputs: kit.outputs,
                sourceFactsHash: kit.sourceFactsHash,
                status: kit.status,
                createdAt: kit.createdAt,
                expiresAt: kit.expiresAt,
                isStale: false,
            },
        };
        await writeGrowthOSSummaryServer(session.sId, summary);

        return NextResponse.json({ data: { kit, summary } }, { status: 200 });
    } catch (error) {
        logger.error("GrowthOS Generate API error", error, {
            endpoint: "/api/growthos/kits/generate",
            userId: session?.uId || session?.user?.id,
        });
        return NextResponse.json({ error: "Growth Kit creation failed" }, { status: 500 });
    }
});
