export const dynamic = "force-dynamic";

import {
    canServeSignalDeskMobileWorkspaceSection,
    createEmptySignalDeskWorkspace,
    hasSignalDeskWorkspaceSectionAccess,
    parseSignalDeskWorkspaceSection,
} from "@database/signaldesk";
import {
    applySignalDeskRateLimit,
    getBoundedSignalDeskStringContext,
    getSignalDeskAccessLogContext,
    isSignalDeskMobileRequest,
    logSignalDeskFailure,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
} from "@lib/signaldesk/apiGuards";
import { loadSignalDeskOverviewServer } from "@lib/signaldesk/server";
import { loadSignalDeskWorkspaceServer } from "@lib/signaldesk/workflowServer";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const GET = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return disabled;

    const section = parseSignalDeskWorkspaceSection(request.nextUrl.searchParams.get("section"));
    if (!section) {
        return NextResponse.json({ error: "Invalid SignalDesk section" }, { status: 400 });
    }

    const accessResult = await requireSignalDeskAccess(request, session, "signaldesk.view");
    if ("response" in accessResult) return accessResult.response;
    if (!hasSignalDeskWorkspaceSectionAccess(accessResult.access, section)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mobileReadonly = isSignalDeskMobileRequest(request);
    if (mobileReadonly && !canServeSignalDeskMobileWorkspaceSection(section)) {
        return NextResponse.json({ error: "SignalDesk mobile workspace is dashboard-only" }, { status: 403 });
    }

    const rateLimit = await applySignalDeskRateLimit({
        feature: "DATA_READ",
        keyPrefix: `workspace:${section}`,
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    try {
        const workspace = mobileReadonly
            ? {
                ...await loadSignalDeskOverviewServer(accessResult.access),
                workspace: createEmptySignalDeskWorkspace("dashboard"),
            }
            : await loadSignalDeskWorkspaceServer(accessResult.access, section);
        return NextResponse.json({ data: workspace }, {
            headers: {
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        logSignalDeskFailure(
            "signaldesk_workspace_route_failed",
            error,
            {
                route: "/api/signaldesk/workspace",
                ...getSignalDeskAccessLogContext(accessResult.access),
                ...getBoundedSignalDeskStringContext("section", section),
                mobileReadonly,
            },
        );
        return NextResponse.json({ error: "Failed to load SignalDesk workspace" }, { status: 500 });
    }
});
