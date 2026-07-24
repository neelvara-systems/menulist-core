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
import {
    recordSignalDeskMobileActionBlockedServer,
    setSignalDeskKillSwitchServer,
    SIGNALDESK_KILL_SWITCH_SCOPE_VALUES,
} from "@lib/signaldesk/server";
import { validateAPIInput } from "@lib/security/inputValidation";
import type { SignalDeskPermission } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const KillSwitchSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    mobileConfirmation: z.literal("MOBILE_EMERGENCY_PAUSE").optional(),
    reason: z.string().trim().min(6).max(500),
    scope: z.enum(SIGNALDESK_KILL_SWITCH_SCOPE_VALUES),
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

    const rateLimit = await applySignalDeskRateLimit({
        feature: "DATA_WRITE",
        keyPrefix: "kill-switch",
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    if (
        isSignalDeskMobileRequest(request)
        && (
            validatedInput.status !== "active"
            || validatedInput.scope !== "global-outbound"
            || validatedInput.mobileConfirmation !== "MOBILE_EMERGENCY_PAUSE"
        )
    ) {
        await recordSignalDeskMobileActionBlockedServer({
            access: accessResult.access,
            action: "kill-switch",
            actionClass: validatedInput.status === "active" ? "emergency_pause" : "configure",
        });
        return NextResponse.json({ error: "MOBILE_READ_ONLY_ACTION_BLOCKED" }, { status: 403 });
    }

    try {
        const killSwitch = await setSignalDeskKillSwitchServer({
            access: accessResult.access,
            idempotencyKey: validatedInput.idempotencyKey,
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
        if (error instanceof Error && error.message === "KILL_SWITCH_IDEMPOTENCY_CONFLICT") {
            return NextResponse.json({ error: "SignalDesk pause request conflicts with an earlier request" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to update SignalDesk pause" }, { status: 500 });
    }
});
