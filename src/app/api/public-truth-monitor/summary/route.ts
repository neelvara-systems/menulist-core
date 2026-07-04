export const dynamic = "force-dynamic";

import { PERMISSIONS } from "@constant/permissions";
import { readPublicTruthMonitorStoreDataServer, readPublicTruthMonitorSummaryServer } from "@database/publicTruthMonitor/server";
import { isPublicTruthMonitorEnabled } from "@lib/public-truth-tools/publicTruthMonitorEntitlements";
import { evaluatePublicTruthMonitorServerEntitlement } from "@lib/public-truth-tools/serverPublicTruthMonitorEntitlements";
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

        const rateLimitResponse = await checkAIRateLimit("DATA_READ", "public-truth-monitor-read");
        if (rateLimitResponse) return rateLimitResponse;

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const storeData = await readPublicTruthMonitorStoreDataServer(session.sId);
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            storeData,
            [PERMISSIONS.VIEW_ANALYTICS],
            "Public Truth Monitor summary",
            Number(session.sId),
            Number(session.tId),
        );
        if (permissionError) return permissionError;

        const entitlement = await evaluatePublicTruthMonitorServerEntitlement({
            session,
            storeData,
        });
        const summary = entitlement.allowed
            ? await readPublicTruthMonitorSummaryServer(session.sId)
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
