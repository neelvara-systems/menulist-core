export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
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
    signalDeskPrivateJson,
} from "@lib/signaldesk/apiGuards";
import { parseSignalDeskAuditCursor } from "@lib/signaldesk/auditContracts";
import { parseSignalDeskTargetCursor } from "@lib/signaldesk/targetContracts";
import { loadSignalDeskOverviewServer } from "@lib/signaldesk/server";
import { loadSignalDeskWorkspaceServer } from "@lib/signaldesk/workflowServer";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";

export const GET = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return disabled;

    const section = parseSignalDeskWorkspaceSection(request.nextUrl.searchParams.get("section"));
    if (!section) {
        return signalDeskPrivateJson({ error: "Invalid SignalDesk section" }, { status: 400 });
    }
    const auditCursor = parseSignalDeskAuditCursor(
        request.nextUrl.searchParams.get("auditAfter"),
        request.nextUrl.searchParams.get("auditAfterId"),
    );
    if (auditCursor === null || (section !== "audit" && auditCursor !== undefined)) {
        return signalDeskPrivateJson({ error: "Invalid SignalDesk audit cursor" }, { status: 400 });
    }
    const targetCursor = parseSignalDeskTargetCursor(
        request.nextUrl.searchParams.get("targetAfter"),
        request.nextUrl.searchParams.get("targetAfterId"),
    );
    if (targetCursor === null || (section !== "targets" && targetCursor !== undefined)) {
        return signalDeskPrivateJson({ error: "Invalid SignalDesk target cursor" }, { status: 400 });
    }

    if (section === "control-room" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_CONTROL_ROOM) {
        return signalDeskPrivateJson({ error: "SignalDesk Control Room is disabled" }, { status: 404 });
    }
    if (section === "content" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL) {
        return signalDeskPrivateJson({ error: "SignalDesk Content Distribution Rail is disabled" }, { status: 404 });
    }
    if (section === "partners" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL) {
        return signalDeskPrivateJson({ error: "SignalDesk Trust Partner Rail is disabled" }, { status: 404 });
    }
    if (section === "mission" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER) {
        return signalDeskPrivateJson({ error: "SignalDesk Operating Layer is disabled" }, { status: 404 });
    }
    if (section === "revenue" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER) {
        return signalDeskPrivateJson({ error: "SignalDesk Revenue Operating Layer is disabled" }, { status: 404 });
    }
    const mobileReadonly = isSignalDeskMobileRequest(request);
    if (mobileReadonly && !canServeSignalDeskMobileWorkspaceSection(section)) {
        return signalDeskPrivateJson({ error: "SignalDesk mobile workspace is dashboard-only" }, { status: 403 });
    }

    const rateLimit = await applySignalDeskRateLimit({
        feature: "DATA_READ",
        keyPrefix: `workspace:${section}`,
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    const accessResult = await requireSignalDeskAccess(request, session, "signaldesk.view");
    if ("response" in accessResult) return accessResult.response;
    if (!hasSignalDeskWorkspaceSectionAccess(accessResult.access, section)) {
        return signalDeskPrivateJson({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const workspace = mobileReadonly
            ? {
                ...await loadSignalDeskOverviewServer(accessResult.access),
                workspace: createEmptySignalDeskWorkspace("dashboard"),
            }
            : await loadSignalDeskWorkspaceServer(accessResult.access, section, { auditCursor, targetCursor });
        return signalDeskPrivateJson({ data: workspace }, {
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
        return signalDeskPrivateJson({ error: "Failed to load SignalDesk workspace" }, { status: 500 });
    }
});
