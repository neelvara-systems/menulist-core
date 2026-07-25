export const dynamic = "force-dynamic";

import { PERMISSIONS } from "@constant/permissions";
import {
    PublicTruthMonitorScopeChangedError,
    readAuthorizedPublicTruthMonitorSummaryServer,
} from "@database/publicTruthMonitor/server";
import { isPublicTruthMonitorEnabled } from "@lib/public-truth-tools/publicTruthMonitorEntitlements";
import {
    evaluatePublicTruthMonitorServerEntitlement,
    getPublicTruthMonitorSessionScope,
} from "@lib/public-truth-tools/serverPublicTruthMonitorEntitlements";
import {
    getPublicTruthMonitorSecurityLogContext,
    logPublicTruthMonitorApiFailure,
} from "@lib/public-truth-tools/publicTruthMonitorDiagnostics";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkAIRateLimit } from "@lib/rateLimit/helpers";
import { NextRequest, NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const ENDPOINT = "/api/public-truth-monitor/summary";

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        if (!isPublicTruthMonitorEnabled()) {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        const rateLimitResponse = await checkAIRateLimit("DATA_READ", "public-truth-monitor-read", {
            failClosedOnProviderError: process.env.NODE_ENV === "production",
        });
        if (rateLimitResponse) return rateLimitResponse;

        const sessionScope = getPublicTruthMonitorSessionScope(session);
        if (!sessionScope) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!verifyTenantAccess(session, sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId, request)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        let permissionError: NextResponse | null = null;
        let authorized: Awaited<ReturnType<typeof readAuthorizedPublicTruthMonitorSummaryServer>>;
        try {
            authorized = await readAuthorizedPublicTruthMonitorSummaryServer({
                authorizeStore: (storeData) => {
                    permissionError = requireAnyStorePermissionForStoreData(
                        request,
                        session,
                        storeData,
                        [PERMISSIONS.VIEW_ANALYTICS],
                        "Public Truth Monitor summary",
                        sessionScope.storeScope.numericId,
                        sessionScope.tenantScope.numericId,
                    );
                    return permissionError === null;
                },
                storeId: sessionScope.storeScope.documentId,
                tenantId: sessionScope.tenantScope.documentId,
            });
        } catch (error) {
            if (error instanceof PublicTruthMonitorScopeChangedError) {
                return permissionError || NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            throw error;
        }

        const entitlement = await evaluatePublicTruthMonitorServerEntitlement({
            session,
            storeData: authorized.storeData,
        });
        const summary = entitlement.allowed
            ? authorized.summary
            : null;

        return NextResponse.json({
            data: {
                entitlement,
                summary,
            },
        }, { status: 200 });
    } catch (error) {
        logPublicTruthMonitorApiFailure(
            "Public Truth Monitor summary API error",
            "public_truth_monitor_summary_api_failed",
            error,
            getPublicTruthMonitorSecurityLogContext(session, request, ENDPOINT),
        );
        return NextResponse.json({ error: "Public truth history could not load" }, { status: 500 });
    }
});
