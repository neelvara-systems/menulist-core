export const dynamic = "force-dynamic";

import { PERMISSIONS } from "@constant/permissions";
import {
    pickPublicTruthMonitorProjectId,
    readPublicTruthMonitorProjectDataServer,
    readPublicTruthMonitorProjectSummariesServer,
    readPublicTruthMonitorStoreDataServer,
    readPublicTruthMonitorSummaryServer,
    writePublicTruthMonitorSummaryServer,
} from "@database/publicTruthMonitor/server";
import { buildOwnerPublicTruthReadinessReport } from "@lib/public-truth-tools/ownerPublicTruthReadiness";
import {
    getPublicTruthMonitorBoundedStringContext,
    getPublicTruthMonitorSecurityLogContext,
    logPublicTruthMonitorApiFailure,
} from "@lib/public-truth-tools/publicTruthMonitorDiagnostics";
import { isPublicTruthMonitorEnabled } from "@lib/public-truth-tools/publicTruthMonitorEntitlements";
import {
    buildPublicTruthMonitorHistoryEntry,
    buildPublicTruthMonitorSummary,
} from "@lib/public-truth-tools/publicTruthMonitorReport";
import { evaluatePublicTruthMonitorServerEntitlement } from "@lib/public-truth-tools/serverPublicTruthMonitorEntitlements";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { logger } from "@lib/monitoring/logger";
import { checkDataWriteLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    parsePublicTruthMonitorJsonBody,
    PublicTruthMonitorRefreshRequestSchema,
} from "@lib/validation/publicTruthMonitorSchemas";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const ENDPOINT = "/api/public-truth-monitor/refresh";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isPublicTruthMonitorEnabled()) {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        const rateLimitResponse = await checkDataWriteLimit();
        if (rateLimitResponse) return rateLimitResponse;

        const jsonBody = await parsePublicTruthMonitorJsonBody(request);
        if (!jsonBody.success) {
            logger.security("Invalid JSON - Public Truth Monitor Refresh API", {
                ...getPublicTruthMonitorSecurityLogContext(session, request, ENDPOINT),
            }, "medium");
            return ("response" in jsonBody && jsonBody.response)
                || NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(PublicTruthMonitorRefreshRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("Public Truth Monitor Refresh Input Validation Failed", {
                ...getPublicTruthMonitorSecurityLogContext(session, request, ENDPOINT, {
                    ...getPublicTruthMonitorBoundedStringContext("validationError", errorMsg),
                }),
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            logger.security("Tenant Access Violation - Public Truth Monitor Refresh API", {
                ...getPublicTruthMonitorSecurityLogContext(session, request, ENDPOINT),
            }, "critical");
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const storeData = await readPublicTruthMonitorStoreDataServer(session.sId);
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            storeData,
            [PERMISSIONS.VIEW_ANALYTICS],
            "Public Truth Monitor refresh",
            Number(session.sId),
            Number(session.tId),
        );
        if (permissionError) return permissionError;

        const entitlement = await evaluatePublicTruthMonitorServerEntitlement({
            session,
            storeData,
        });
        if (!entitlement.allowed) {
            return NextResponse.json({
                error: "Public truth history unavailable",
                message: entitlement.message,
                reason: entitlement.reason,
            }, { status: entitlement.reason === "feature_off" ? 404 : 403 });
        }

        const generatedAt = new Date().toISOString();
        const projectSummaries = await readPublicTruthMonitorProjectSummariesServer(session.sId);
        const selectedProjectId = pickPublicTruthMonitorProjectId(projectSummaries, validation.data.selectedProjectId);
        const projectData = selectedProjectId
            ? await readPublicTruthMonitorProjectDataServer({
                projectId: selectedProjectId,
                sId: session.sId,
                tId: session.tId,
            })
            : null;
        const report = buildOwnerPublicTruthReadinessReport({
            generatedAt,
            projectData,
            projectSummaries,
            selectedProjectId,
            store: storeData,
        });
        const currentSummary = await readPublicTruthMonitorSummaryServer(session.sId);
        const entry = buildPublicTruthMonitorHistoryEntry({
            generatedAt,
            report,
            sId: session.sId,
            tId: session.tId,
        });
        const summary = buildPublicTruthMonitorSummary({
            current: currentSummary,
            entitlement,
            entry,
            generatedByUserId: session.uId || session.user?.id,
            sId: session.sId,
            tId: session.tId,
        });

        await writePublicTruthMonitorSummaryServer({
            storeId: session.sId,
            summary,
        });

        return NextResponse.json({
            data: {
                entitlement,
                report,
                summary,
            },
        }, { status: 200 });
    } catch (error) {
        logPublicTruthMonitorApiFailure(
            "Public Truth Monitor refresh API error",
            "public_truth_monitor_refresh_api_failed",
            error,
            {
                endpoint: ENDPOINT,
                ...getPublicTruthMonitorBoundedStringContext("userId", session?.uId || session?.user?.id),
            },
        );
        return NextResponse.json({ error: "Public truth history could not refresh" }, { status: 500 });
    }
});
