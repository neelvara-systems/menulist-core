export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
} from "@lib/signaldesk/apiGuards";
import { loadSignalDeskOverviewServer } from "@lib/signaldesk/server";
import { secureError } from "@lib/security/secureLogger";
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
        secureError("[SignalDesk API] Overview failed", error as Error, {
            userId: accessResult.access.userId,
        });
        return NextResponse.json({ error: "Failed to load SignalDesk" }, { status: 500 });
    }
});
