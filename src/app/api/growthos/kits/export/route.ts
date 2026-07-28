export const dynamic = "force-dynamic";

import {
    GROWTHOS_KIT_BECAME_STALE,
    findGrowthOSKitOutput,
    readGrowthOSExportReplayServer,
    readGrowthOSKitServer,
    readGrowthOSStoreDataServer,
    readGrowthOSSummaryServer,
    recordGrowthOSExportServer,
} from "@database/growthos/server";
import { getGrowthOSBoundedStringContext, getGrowthOSSecurityLogContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { isGrowthOSKitExpired } from "@lib/growthos/readiness";
import { evaluateGrowthOSServerEntitlement } from "@lib/growthos/serverEntitlements";
import { loadGrowthOSSourceSnapshot } from "@lib/growthos/serverContext";
import { logger } from "@lib/monitoring/logger";
import { checkDataWriteLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { GrowthOSExportRequestSchema, parseGrowthOSJsonBody } from "@lib/validation/growthosSchemas";
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
            logger.security("Invalid JSON - GrowthOS Export API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/kits/export"),
            }, "medium");
            return ("response" in jsonBody && jsonBody.response)
                || NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(GrowthOSExportRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Export Input Validation Failed", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/kits/export", {
                    ...getGrowthOSBoundedStringContext("validationError", errorMsg),
                }),
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }
        const kitId = String(validation.data.kitId);

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Export API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/kits/export", {
                    ...getGrowthOSBoundedStringContext("attemptedKitId", kitId),
                }),
            }, "critical");
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const storeData = await readGrowthOSStoreDataServer(session.sId);
        const entitlement = await evaluateGrowthOSServerEntitlement({ session, storeData });
        if (!entitlement.allowed) {
            return NextResponse.json({
                error: "Growth Kits unavailable",
                message: entitlement.message,
                reason: entitlement.reason,
            }, { status: entitlement.reason === "feature_off" ? 404 : 403 });
        }

        const replay = await readGrowthOSExportReplayServer({
            destination: validation.data.destination,
            kitId,
            method: validation.data.method,
            operationId: validation.data.operationId,
            outputId: validation.data.outputId,
            session,
        });
        if (replay) {
            return NextResponse.json({ data: replay }, { status: 200 });
        }

        const kit = await readGrowthOSKitServer({
            kitId,
            tId: session.tId,
            sId: session.sId,
        });
        if (!kit) {
            return NextResponse.json({ error: "Growth Kit not found" }, { status: 404 });
        }

        const output = findGrowthOSKitOutput({
            destination: validation.data.destination,
            kit,
            outputId: validation.data.outputId,
        });
        if (!output) {
            return NextResponse.json({ error: "Growth Kit output not found" }, { status: 404 });
        }
        if (output.preflight?.status === "blocked" && !["mark_used", "stale"].includes(validation.data.method)) {
            return NextResponse.json({
                error: "Growth Kit output blocked",
                message: "This output needs review before it can be used.",
            }, { status: 409 });
        }

        const summary = await readGrowthOSSummaryServer({
            storeId: session.sId,
            tenantId: session.tId,
        });
        let currentSourceFactsHash = summary?.sourceFactsHash;
        let sourceFactsUnavailable = false;
        if (kit.projectId) {
            const snapshot = await loadGrowthOSSourceSnapshot({
                projectId: kit.projectId,
                session,
                storeData,
            });
            sourceFactsUnavailable = !snapshot.sourceFactsHash;
            currentSourceFactsHash = snapshot.sourceFactsHash || currentSourceFactsHash;
        }
        const isStale = sourceFactsUnavailable
            || Boolean(currentSourceFactsHash && currentSourceFactsHash !== kit.sourceFactsHash)
            || isGrowthOSKitExpired(kit.expiresAt);
        if (isStale && !["mark_used", "stale"].includes(validation.data.method)) {
            return NextResponse.json({
                error: "Growth Kit is stale",
                message: "This kit may use old menu details. Create it again before using.",
            }, { status: 409 });
        }

        const result = await recordGrowthOSExportServer({
            destination: validation.data.destination,
            isStale,
            kit,
            method: validation.data.method,
            operationId: validation.data.operationId,
            outputId: validation.data.outputId,
            session,
        });

        return NextResponse.json({
            data: result,
        }, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === GROWTHOS_KIT_BECAME_STALE) {
            return NextResponse.json({
                error: "Growth Kit is stale",
                message: "This kit may use old menu details. Create it again before using.",
            }, { status: 409 });
        }
        logGrowthOSApiFailure("GrowthOS Export API error", "growthos_export_api_failed", error, {
            endpoint: "/api/growthos/kits/export",
            ...getGrowthOSBoundedStringContext("userId", session?.uId || session?.user?.id),
        });
        return NextResponse.json({ error: "Growth Kit export failed" }, { status: 500 });
    }
});
