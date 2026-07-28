export const dynamic = "force-dynamic";

import {
    GROWTHOS_SOURCE_FACTS_CHANGED,
    writeGrowthOSRefreshedSummaryServer,
} from "@database/growthos/server";
import { getGrowthOSBoundedStringContext, getGrowthOSSecurityLogContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { buildGrowthOSEmptySummary, loadGrowthOSServerContext } from "@lib/growthos/serverContext";
import { logger } from "@lib/monitoring/logger";
import { checkDataWriteLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { GrowthOSRefreshRequestSchema, parseGrowthOSJsonBody } from "@lib/validation/growthosSchemas";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../../middleware/auth";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isGrowthOSMasterEnabled()) {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        const rateLimitResponse = await checkDataWriteLimit();
        if (rateLimitResponse) return rateLimitResponse;

        const jsonBody = await parseGrowthOSJsonBody(request);
        if (!jsonBody.success) {
            logger.security("Invalid JSON - GrowthOS Refresh API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/actions/refresh"),
            }, "medium");
            return ("response" in jsonBody && jsonBody.response)
                || NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(GrowthOSRefreshRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Refresh Input Validation Failed", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/actions/refresh", {
                    ...getGrowthOSBoundedStringContext("validationError", errorMsg),
                }),
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }
        const projectId = String(validation.data.projectId);

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Refresh API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/actions/refresh", {
                    ...getGrowthOSBoundedStringContext("attemptedProjectId", projectId),
                }),
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

        if (!context.projectData || !context.facts) {
            const summary = buildGrowthOSEmptySummary({
                reason: "no_menu",
                session,
            });
            const committed = await writeGrowthOSRefreshedSummaryServer(session.sId, summary, projectId);
            return NextResponse.json({ data: committed }, { status: 200 });
        }

        if (!context.actions.length) {
            const summary = buildGrowthOSEmptySummary({
                reason: context.readiness?.status === "blocked" ? "incomplete_truth" : "no_action",
                session,
                sourceFactsHash: context.sourceFactsHash,
                readiness: context.readiness,
            });
            const committed = await writeGrowthOSRefreshedSummaryServer(session.sId, summary, projectId);
            return NextResponse.json({ data: committed }, { status: 200 });
        }

        const previousKit = context.summary?.latestKit
            ? {
                ...context.summary.latestKit,
                isStale: context.summary.latestKit.sourceFactsHash !== context.sourceFactsHash,
            }
            : null;
        const summary = {
            tId: String(session.tId),
            sId: String(session.sId),
            date: new Date().toISOString().split("T")[0],
            sourceFactsHash: context.sourceFactsHash,
            eligible: true,
            readiness: context.readiness,
            primaryAction: context.actions[0],
            secondaryActions: context.actions.slice(1),
            latestKit: previousKit,
        };

        const committed = await writeGrowthOSRefreshedSummaryServer(session.sId, summary, projectId);
        return NextResponse.json({ data: committed }, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === GROWTHOS_SOURCE_FACTS_CHANGED) {
            return NextResponse.json({
                error: "Menu details changed",
                message: "Please check the menu again.",
            }, { status: 409 });
        }
        logGrowthOSApiFailure("GrowthOS Refresh API error", "growthos_refresh_api_failed", error, {
            endpoint: "/api/growthos/actions/refresh",
            ...getGrowthOSBoundedStringContext("userId", session?.uId || session?.user?.id),
        });
        return NextResponse.json({ error: "Growth Kits refresh failed" }, { status: 500 });
    }
});
