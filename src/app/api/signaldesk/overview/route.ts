export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    getSignalDeskAccessLogContext,
    logSignalDeskFailure,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
    signalDeskPrivateJson,
} from "@lib/signaldesk/apiGuards";
import { loadSignalDeskOverviewServer } from "@lib/signaldesk/server";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";

export const GET = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return disabled;

    const rateLimit = await applySignalDeskRateLimit({
        feature: "DATA_READ",
        keyPrefix: "overview",
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    const accessResult = await requireSignalDeskAccess(request, session);
    if ("response" in accessResult) return accessResult.response;

    try {
        const overview = await loadSignalDeskOverviewServer(accessResult.access);
        return signalDeskPrivateJson({ data: overview }, {
            headers: {
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        logSignalDeskFailure(
            "signaldesk_overview_route_failed",
            error,
            {
                route: "/api/signaldesk/overview",
                ...getSignalDeskAccessLogContext(accessResult.access),
            },
        );
        return signalDeskPrivateJson({ error: "Failed to load SignalDesk" }, { status: 500 });
    }
});
