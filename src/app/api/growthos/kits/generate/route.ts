export const dynamic = "force-dynamic";

import {
    GROWTHOS_SOURCE_FACTS_CHANGED,
    buildGrowthOSKitId,
    readGrowthOSKitServer,
    toGrowthOSAdminTimestamp,
    writeGrowthOSKitAndSummaryServer,
} from "@database/growthos/server";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { applyGrowthOSWriteRateLimit } from "@lib/growthos/apiGuards";
import { growthOSPrivateJson, withGrowthOSPrivateHeaders } from "@lib/growthos/apiResponse";
import { findGrowthOSAction } from "@lib/growthos/actionRanking";
import { getGrowthOSBoundedStringContext, getGrowthOSSecurityLogContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { buildGrowthOSKit } from "@lib/growthos/kitBuilder";
import { loadGrowthOSServerContext } from "@lib/growthos/serverContext";
import { logger } from "@lib/monitoring/logger";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";
import { validateAPIInput } from "@lib/security/inputValidation";
import { GrowthOSGenerateKitRequestSchema, parseGrowthOSJsonBody } from "@lib/validation/growthosSchemas";
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
            routeKey: "generate",
            storeId: scope.storeScope.documentId,
            tenantId: scope.tenantScope.documentId,
        });
        if (rateLimitResponse) return rateLimitResponse;

        const jsonBody = await parseGrowthOSJsonBody(request);
        if (!jsonBody.success) {
            logger.security("Invalid JSON - GrowthOS Generate API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/kits/generate"),
            }, "medium");
            return ("response" in jsonBody && jsonBody.response)
                ? withGrowthOSPrivateHeaders(jsonBody.response)
                : growthOSPrivateJson({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(GrowthOSGenerateKitRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Generate Input Validation Failed", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/kits/generate", {
                    ...getGrowthOSBoundedStringContext("validationError", errorMsg),
                }),
            }, "medium");
            return growthOSPrivateJson({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }
        const projectId = String(validation.data.projectId);

        if (!verifyTenantAccess(session, scope.tenantScope.numericId, scope.storeScope.numericId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Generate API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/kits/generate", {
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

        const kitId = buildGrowthOSKitId(
            scope.tenantScope.documentId,
            scope.storeScope.documentId,
            validation.data.operationId,
        );
        const replayKit = await readGrowthOSKitServer({
            kitId,
            tId: scope.tenantScope.documentId,
            sId: scope.storeScope.documentId,
        });
        if (replayKit) {
            if (
                replayKit.operationId !== validation.data.operationId
                || replayKit.projectId !== projectId
                || (
                    validation.data.actionId !== undefined
                    && replayKit.actionId !== validation.data.actionId
                )
            ) {
                return growthOSPrivateJson({ error: "Growth Kit operation conflict" }, { status: 409 });
            }
            if (!context.summary) {
                return growthOSPrivateJson({ error: "Growth Kit summary unavailable" }, { status: 409 });
            }
            return growthOSPrivateJson({
                data: {
                    kit: replayKit,
                    summary: context.summary,
                },
            }, { status: 200 });
        }

        if (!context.facts || !context.actions.length) {
            return growthOSPrivateJson({
                error: "No Growth Kit available",
                message: "Menu details are not ready for a Growth Kit yet.",
            }, { status: 422 });
        }

        const action = findGrowthOSAction(context.actions, validation.data.actionId);
        if (!action) {
            return growthOSPrivateJson({
                error: "No Growth Kit available",
                message: "No action is ready for this menu.",
            }, { status: 422 });
        }

        const kit = buildGrowthOSKit({
            action,
            facts: context.facts,
            kitId,
            operationId: validation.data.operationId,
            timestampFactory: toGrowthOSAdminTimestamp,
        });
        const summary = {
            tId: scope.tenantScope.documentId,
            sId: scope.storeScope.documentId,
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
        const persisted = await writeGrowthOSKitAndSummaryServer(kit, summary);

        return growthOSPrivateJson({
            data: {
                kit: persisted.kit,
                summary: persisted.summary,
            },
        }, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === GROWTHOS_SOURCE_FACTS_CHANGED) {
            return growthOSPrivateJson({
                error: "Menu details changed",
                message: "Check the menu again before creating this Sales Pack.",
            }, { status: 409 });
        }
        logGrowthOSApiFailure("GrowthOS Generate API error", "growthos_generate_api_failed", error, {
            endpoint: "/api/growthos/kits/generate",
            ...getGrowthOSBoundedStringContext("userId", resolveCurrentSessionUserDocumentId(session)),
        });
        return growthOSPrivateJson({ error: "Growth Kit creation failed" }, { status: 500 });
    }
});
