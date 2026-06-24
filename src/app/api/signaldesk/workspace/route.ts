export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
} from "@lib/signaldesk/apiGuards";
import { loadSignalDeskWorkspaceServer } from "@lib/signaldesk/workflowServer";
import { secureError } from "@lib/security/secureLogger";
import type { SignalDeskSection } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SECTIONS = new Set<SignalDeskSection>([
    "dashboard",
    "mission",
    "targets",
    "imports",
    "approvals",
    "templates",
    "inbox",
    "attribution",
    "policies",
    "sources",
    "ai",
    "channels",
    "content",
    "partners",
    "settings",
    "control-room",
    "audit",
]);

export const GET = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return disabled;

    const sectionParam = request.nextUrl.searchParams.get("section") || "dashboard";
    const section: SignalDeskSection = SECTIONS.has(sectionParam as SignalDeskSection)
        ? sectionParam as SignalDeskSection
        : "dashboard";
    const requiredPermission = section === "audit" ? "audit.view" : "signaldesk.view";
    const accessResult = await requireSignalDeskAccess(request, session, requiredPermission);
    if ("response" in accessResult) return accessResult.response;

    const rateLimit = await applySignalDeskRateLimit({
        feature: "DATA_READ",
        keyPrefix: `workspace:${section}`,
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    try {
        const workspace = await loadSignalDeskWorkspaceServer(accessResult.access, section);
        return NextResponse.json({ data: workspace }, {
            headers: {
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        secureError("[SignalDesk API] Workspace failed", error as Error, {
            userId: accessResult.access.userId,
        });
        return NextResponse.json({ error: "Failed to load SignalDesk workspace" }, { status: 500 });
    }
});
