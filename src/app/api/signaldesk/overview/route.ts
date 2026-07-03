export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    getSignalDeskAccessLogContext,
    logSignalDeskFailure,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
} from "@lib/signaldesk/apiGuards";
import { loadSignalDeskOverviewServer } from "@lib/signaldesk/server";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const GET = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return disabled;

    const accessResult = await requireSignalDeskAccess(request, session);
    if ("response" in accessResult) return accessResult.response;

    const rateLimit = await applySignalDeskRateLimit({
        feature: "DATA_READ",
        keyPrefix: "overview",
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    try {
        const overview = await loadSignalDeskOverviewServer(accessResult.access);
        return NextResponse.json({ data: overview }, {
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
        return NextResponse.json({ error: "Failed to load SignalDesk" }, { status: 500 });
    }
});
