export const dynamic = "force-dynamic";

import {
    GROWTHOS_SOURCE_FACTS_CHANGED,
    writeGrowthOSRefreshedSummaryServer,
} from "@database/growthos/server";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { applyGrowthOSWriteRateLimit } from "@lib/growthos/apiGuards";
import { growthOSPrivateJson, withGrowthOSPrivateHeaders } from "@lib/growthos/apiResponse";
import { getGrowthOSBoundedStringContext, getGrowthOSSecurityLogContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { buildGrowthOSEmptySummary, loadGrowthOSServerContext } from "@lib/growthos/serverContext";
import { logger } from "@lib/monitoring/logger";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";
import { validateAPIInput } from "@lib/security/inputValidation";
import { GrowthOSRefreshRequestSchema, parseGrowthOSJsonBody } from "@lib/validation/growthosSchemas";
import { verifyTenantAccess, withAuth } from "../../../../../middleware/auth";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isGrowthOSMasterEnabled()) {
            return growthOSPrivateJson({ error: "Feature disabled" }, { status: 404 });
        }

        const scope = resolveStorePermissionSessionScope(session);
        const actorId = resolveCurrentSessionUserDocumentId(session);
        if (!scope || !actorId) {
            return growthOSPrivateJson({ error: "Forbidden" }, { status: 403 });
        }
        const rateLimitResponse = await applyGrowthOSWriteRateLimit({
            actorId,
            routeKey: "refresh",
            storeId: scope.storeScope.documentId,
            tenantId: scope.tenantScope.documentId,
        });
        if (rateLimitResponse) return rateLimitResponse;

        const jsonBody = await parseGrowthOSJsonBody(request);
        if (!jsonBody.success) {
            logger.security("Invalid JSON - GrowthOS Refresh API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/actions/refresh"),
            }, "medium");
            return ("response" in jsonBody && jsonBody.response)
                ? withGrowthOSPrivateHeaders(jsonBody.response)
                : growthOSPrivateJson({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(GrowthOSRefreshRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Refresh Input Validation Failed", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/actions/refresh", {
                    ...getGrowthOSBoundedStringContext("validationError", errorMsg),
                }),
            }, "medium");
            return growthOSPrivateJson({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }
        const projectId = String(validation.data.projectId);

        if (!verifyTenantAccess(session, scope.tenantScope.numericId, scope.storeScope.numericId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Refresh API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/actions/refresh", {
                    ...getGrowthOSBoundedStringContext("attemptedProjectId", projectId),
                }),
            }, "critical");
            return growthOSPrivateJson({ error: "Forbidden" }, { status: 403 });
        }

        const context = await loadGrowthOSServerContext({
            projectId,
            session,
        });

        if (!context.entitlement.allowed) {
            return growthOSPrivateJson({
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
            const committed = await writeGrowthOSRefreshedSummaryServer(scope.storeScope.documentId, summary, projectId);
            return growthOSPrivateJson({ data: committed }, { status: 200 });
        }

        if (!context.actions.length) {
            const summary = buildGrowthOSEmptySummary({
                reason: context.readiness?.status === "blocked" ? "incomplete_truth" : "no_action",
                session,
                sourceFactsHash: context.sourceFactsHash,
                readiness: context.readiness,
            });
            const committed = await writeGrowthOSRefreshedSummaryServer(scope.storeScope.documentId, summary, projectId);
            return growthOSPrivateJson({ data: committed }, { status: 200 });
        }

        const previousKit = context.summary?.latestKit
            ? {
                ...context.summary.latestKit,
                isStale: context.summary.latestKit.sourceFactsHash !== context.sourceFactsHash,
            }
            : null;
        const summary = {
            tId: scope.tenantScope.documentId,
            sId: scope.storeScope.documentId,
            date: new Date().toISOString().split("T")[0],
            sourceFactsHash: context.sourceFactsHash,
            eligible: true,
            readiness: context.readiness,
            primaryAction: context.actions[0],
            secondaryActions: context.actions.slice(1),
            latestKit: previousKit,
        };

        const committed = await writeGrowthOSRefreshedSummaryServer(scope.storeScope.documentId, summary, projectId);
        return growthOSPrivateJson({ data: committed }, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === GROWTHOS_SOURCE_FACTS_CHANGED) {
            return growthOSPrivateJson({
                error: "Menu details changed",
                message: "Please check the menu again.",
            }, { status: 409 });
        }
        logGrowthOSApiFailure("GrowthOS Refresh API error", "growthos_refresh_api_failed", error, {
            endpoint: "/api/growthos/actions/refresh",
            ...getGrowthOSBoundedStringContext("userId", resolveCurrentSessionUserDocumentId(session)),
        });
        return growthOSPrivateJson({ error: "Growth Kits refresh failed" }, { status: 500 });
    }
});
