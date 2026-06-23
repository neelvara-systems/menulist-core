export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    logSignalDeskValidationFailure,
    parseSignalDeskJsonBody,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
} from "@lib/signaldesk/apiGuards";
import { setSignalDeskKillSwitchServer } from "@lib/signaldesk/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import type { SignalDeskPermission } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const KillSwitchSchema = z.object({
    reason: z.string().trim().min(6).max(500),
    scope: z.enum([
        "global-outbound",
        "email",
        "whatsapp",
        "instagram",
        "messenger",
        "source-provider",
        "ai-worker",
        "campaign",
        "menu-list-bridge",
    ]),
    status: z.enum(["active", "inactive"]),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return disabled;

    const body = await parseSignalDeskJsonBody({ request, session });
    if (!body.success) return body.response;

    const validation = validateAPIInput(KillSwitchSchema, body.data);
    if (validation.success !== true) {
        logSignalDeskValidationFailure({
            action: "kill-switch",
            details: validation.error,
            request,
            session,
        });
        return NextResponse.json({ error: "Invalid input", details: validation.error }, { status: 400 });
    }
    const validatedInput = validation.data;

    const permission: SignalDeskPermission = validatedInput.status === "active"
        ? "kill-switch.activate"
        : "kill-switch.deactivate";
    const accessResult = await requireSignalDeskAccess(request, session, permission);
    if ("response" in accessResult) return accessResult.response;

    const rateLimit = await applySignalDeskRateLimit({
        feature: "DATA_WRITE",
        keyPrefix: "kill-switch",
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    try {
        const killSwitch = await setSignalDeskKillSwitchServer({
            access: accessResult.access,
            reason: validatedInput.reason,
            scope: validatedInput.scope,
            status: validatedInput.status,
        });
        return NextResponse.json({ data: killSwitch });
    } catch (error) {
        secureError("[SignalDesk API] Kill switch update failed", error as Error, {
            userId: accessResult.access.userId,
        });
        return NextResponse.json({ error: "Failed to update SignalDesk pause" }, { status: 500 });
    }
});
