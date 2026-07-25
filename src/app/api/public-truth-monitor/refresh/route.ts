export const dynamic = "force-dynamic";

import { PERMISSIONS } from "@constant/permissions";
import {
    pickPublicTruthMonitorProjectId,
    PublicTruthMonitorScopeChangedError,
    readPublicTruthMonitorProjectDataServer,
    readPublicTruthMonitorProjectSummariesServer,
    readPublicTruthMonitorStoreDataServer,
    updatePublicTruthMonitorSummaryServer,
} from "@database/publicTruthMonitor/server";
import { buildOwnerPublicTruthReadinessReport } from "@lib/public-truth-tools/ownerPublicTruthReadiness";
import {
    getPublicTruthMonitorBoundedStringContext,
    getPublicTruthMonitorSecurityLogContext,
    logPublicTruthMonitorApiFailure,
} from "@lib/public-truth-tools/publicTruthMonitorDiagnostics";
import {
    evaluatePublicTruthMonitorEntitlement,
    isPublicTruthMonitorEnabled,
} from "@lib/public-truth-tools/publicTruthMonitorEntitlements";
import {
    buildPublicTruthMonitorHistoryEntry,
    buildPublicTruthMonitorSummary,
} from "@lib/public-truth-tools/publicTruthMonitorReport";
import {
    evaluatePublicTruthMonitorServerEntitlementWithAuthority,
    getPublicTruthMonitorSessionScope,
} from "@lib/public-truth-tools/serverPublicTruthMonitorEntitlements";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { logger } from "@lib/monitoring/logger";
import { checkDataWriteLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    parsePublicTruthMonitorJsonBody,
    PublicTruthMonitorRefreshRequestSchema,
} from "@lib/validation/publicTruthMonitorSchemas";
import type { FirestoreSubscriptionDoc } from "@type/razorpay";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const ENDPOINT = "/api/public-truth-monitor/refresh";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isPublicTruthMonitorEnabled()) {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        const rateLimitResponse = await checkDataWriteLimit({
            failClosedOnProviderError: process.env.NODE_ENV === "production",
        });
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

        const sessionScope = getPublicTruthMonitorSessionScope(session);
        if (!sessionScope) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!verifyTenantAccess(session, sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId, request)) {
            logger.security("Tenant Access Violation - Public Truth Monitor Refresh API", {
                ...getPublicTruthMonitorSecurityLogContext(session, request, ENDPOINT),
            }, "critical");
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const storeData = await readPublicTruthMonitorStoreDataServer(sessionScope.storeScope.documentId);
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            storeData,
            [PERMISSIONS.VIEW_ANALYTICS],
            "Public Truth Monitor refresh",
            sessionScope.storeScope.numericId,
            sessionScope.tenantScope.numericId,
        );
        if (permissionError) return permissionError;

        const entitlementEvaluation = await evaluatePublicTruthMonitorServerEntitlementWithAuthority({
            session,
            storeData,
        });
        const { activeSubscription, entitlement } = entitlementEvaluation;
        if (!entitlement.allowed) {
            return NextResponse.json({
                error: "Public truth history unavailable",
                message: entitlement.message,
                reason: entitlement.reason,
            }, { status: entitlement.reason === "feature_off" ? 404 : 403 });
        }
        if (!activeSubscription?.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const generatedAt = new Date().toISOString();
        const projectSummaries = await readPublicTruthMonitorProjectSummariesServer(sessionScope.storeScope.documentId);
        const selectedProjectId = pickPublicTruthMonitorProjectId(projectSummaries, validation.data.selectedProjectId);
        const projectData = selectedProjectId
            ? await readPublicTruthMonitorProjectDataServer({
                projectId: selectedProjectId,
                sId: sessionScope.storeScope.documentId,
                tId: sessionScope.tenantScope.documentId,
            })
            : null;
        const report = buildOwnerPublicTruthReadinessReport({
            generatedAt,
            projectData,
            projectSummaries,
            selectedProjectId,
            store: storeData,
        });
        const entry = buildPublicTruthMonitorHistoryEntry({
            generatedAt,
            report,
            sId: sessionScope.storeScope.documentId,
            tId: sessionScope.tenantScope.documentId,
        });
        let finalPermissionError: NextResponse | null = null;
        let summary: Awaited<ReturnType<typeof updatePublicTruthMonitorSummaryServer>>;
        try {
            summary = await updatePublicTruthMonitorSummaryServer({
                authorizeSubscription: (subscriptionData, currentStoreData) => (
                    evaluatePublicTruthMonitorEntitlement({
                        activeSubscription: {
                            ...subscriptionData,
                            id: activeSubscription.id,
                        } as FirestoreSubscriptionDoc,
                        storeDetails: currentStoreData,
                        storeId: sessionScope.storeScope.numericId,
                        tenantId: sessionScope.tenantScope.numericId,
                    }).allowed
                ),
                authorizeStore: (currentStoreData) => {
                    finalPermissionError = requireAnyStorePermissionForStoreData(
                        request,
                        session,
                        currentStoreData,
                        [PERMISSIONS.VIEW_ANALYTICS],
                        "Public Truth Monitor refresh",
                        sessionScope.storeScope.numericId,
                        sessionScope.tenantScope.numericId,
                    );
                    return finalPermissionError === null;
                },
                storeId: sessionScope.storeScope.documentId,
                subscriptionId: activeSubscription.id,
                tenantId: sessionScope.tenantScope.documentId,
                buildSummary: (current) => buildPublicTruthMonitorSummary({
                    current,
                    entitlement,
                    entry,
                    generatedByUserId: session.uId || session.user?.id,
                    sId: sessionScope.storeScope.documentId,
                    tId: sessionScope.tenantScope.documentId,
                }),
            });
        } catch (error) {
            if (error instanceof PublicTruthMonitorScopeChangedError) {
                return finalPermissionError || NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            throw error;
        }

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
