export const dynamic = "force-dynamic";

import { writeGrowthOSSummaryServer } from "@database/growthos/server";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { buildGrowthOSEmptySummary, loadGrowthOSServerContext } from "@lib/growthos/serverContext";
import { logger } from "@lib/monitoring/logger";
import { checkDataWriteLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { GrowthOSRefreshRequestSchema, parseGrowthOSJsonBody } from "@lib/validation/growthosSchemas";
import type { GrowthOSSummaryDocument } from "@type/growthos";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../../middleware/auth";

function normalizeSummaryForCompare(summary: GrowthOSSummaryDocument | null | undefined) {
    if (!summary) return null;
    return {
        tId: summary.tId,
        sId: summary.sId,
        date: summary.date,
        sourceFactsHash: summary.sourceFactsHash || null,
        eligible: summary.eligible,
        reason: summary.reason || null,
        readiness: summary.readiness || null,
        primaryAction: summary.primaryAction || null,
        secondaryActions: summary.secondaryActions || [],
        latestKit: summary.latestKit || null,
    };
}

async function writeSummaryWhenChanged(params: {
    current?: GrowthOSSummaryDocument | null;
    next: GrowthOSSummaryDocument;
    storeId: string | number;
}) {
    const currentComparable = JSON.stringify(normalizeSummaryForCompare(params.current));
    const nextComparable = JSON.stringify(normalizeSummaryForCompare(params.next));
    if (currentComparable !== nextComparable) {
        await writeGrowthOSSummaryServer(params.storeId, params.next);
    }
}

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
                ...buildSecurityContext(session, request),
                endpoint: "/api/growthos/actions/refresh",
            }, "medium");
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(GrowthOSRefreshRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Refresh Input Validation Failed", {
                ...buildSecurityContext(session, request),
                endpoint: "/api/growthos/actions/refresh",
                error: errorMsg,
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }
        const projectId = String(validation.data.projectId);

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Refresh API", {
                ...buildSecurityContext(session, request),
                endpoint: "/api/growthos/actions/refresh",
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

        if (!context.projectData || !context.facts) {
            const summary = buildGrowthOSEmptySummary({
                reason: "no_menu",
                session,
            });
            await writeSummaryWhenChanged({
                current: context.summary,
                next: summary,
                storeId: session.sId,
            });
            return NextResponse.json({ data: summary }, { status: 200 });
        }

        if (!context.actions.length) {
            const summary = buildGrowthOSEmptySummary({
                reason: context.readiness?.status === "blocked" ? "incomplete_truth" : "no_action",
                session,
                sourceFactsHash: context.sourceFactsHash,
                readiness: context.readiness,
            });
            await writeSummaryWhenChanged({
                current: context.summary,
                next: summary,
                storeId: session.sId,
            });
            return NextResponse.json({ data: summary }, { status: 200 });
        }

        const previousKit = context.summary?.latestKit
            ? {
                ...context.summary.latestKit,
                isStale: context.summary.latestKit.sourceFactsHash !== context.sourceFactsHash,
            }
            : null;
        const summary: GrowthOSSummaryDocument = {
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

        await writeSummaryWhenChanged({
            current: context.summary,
            next: summary,
            storeId: session.sId,
        });
        return NextResponse.json({ data: summary }, { status: 200 });
    } catch (error) {
        logger.error("GrowthOS Refresh API error", error, {
            endpoint: "/api/growthos/actions/refresh",
            userId: session?.uId || session?.user?.id,
        });
        return NextResponse.json({ error: "Growth Kits refresh failed" }, { status: 500 });
    }
});
