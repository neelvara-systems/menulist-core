export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    getBoundedSignalDeskStringContext,
    getSignalDeskAccessLogContext,
    isSignalDeskMobileRequest,
    logSignalDeskFailure,
    logSignalDeskValidationFailure,
    parseSignalDeskJsonBody,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
} from "@lib/signaldesk/apiGuards";
import { recordSignalDeskMobileActionBlockedServer, setSignalDeskKillSwitchServer } from "@lib/signaldesk/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import type { SignalDeskPermission } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const KillSwitchSchema = z.object({
    mobileConfirmation: z.literal("MOBILE_EMERGENCY_PAUSE").optional(),
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
        "content-distribution",
        "trust-partner",
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
            request,
            session,
        });
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const validatedInput = validation.data;

    const permission: SignalDeskPermission = validatedInput.status === "active"
        ? "kill-switch.activate"
        : "kill-switch.deactivate";
    const accessResult = await requireSignalDeskAccess(request, session, permission);
    if ("response" in accessResult) return accessResult.response;

    if (isSignalDeskMobileRequest(request) && (validatedInput.status !== "active" || validatedInput.mobileConfirmation !== "MOBILE_EMERGENCY_PAUSE")) {
        await recordSignalDeskMobileActionBlockedServer({
            access: accessResult.access,
            action: "kill-switch",
            actionClass: validatedInput.status === "active" ? "emergency_pause" : "configure",
        });
        return NextResponse.json({ error: "MOBILE_READ_ONLY_ACTION_BLOCKED" }, { status: 403 });
    }

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
        logSignalDeskFailure(
            "signaldesk_kill_switch_update_failed",
            error,
            {
                route: "/api/signaldesk/kill-switches",
                ...getSignalDeskAccessLogContext(accessResult.access),
                ...getBoundedSignalDeskStringContext("scope", validatedInput.scope),
                ...getBoundedSignalDeskStringContext("status", validatedInput.status),
                mobileRequest: isSignalDeskMobileRequest(request),
            },
        );
        return NextResponse.json({ error: "Failed to update SignalDesk pause" }, { status: 500 });
    }
});
