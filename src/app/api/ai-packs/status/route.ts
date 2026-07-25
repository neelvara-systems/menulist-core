export const dynamic = 'force-dynamic';
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { AI_ACTIONS_TYPES } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import {
    requireAnyStorePermission,
    resolveStorePermissionSessionScope,
} from "@lib/permissions/server";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

/**
 * AI Pack Status — Simple boolean capacity check
 *
 * Returns whether the store can run paid AI actions and whether
 * enhancement packs are available for purchase.
 *
 * NEVER returns unit counts, credit balances, or internal capacity data.
 * Doctrine: No credits, tokens, or units exposed to customers.
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 */
export const GET = withAuth(async (request, session) => {
    try {
        const scope = resolveStorePermissionSessionScope(session);

        if (!scope) {
            return NextResponse.json(
                { error: "User not onboarded." },
                { status: 400 }
            );
        }

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.ACCESS_BILLING],
            "AI pack status",
        );
        if (permissionError) return permissionError;

        // Check capacity using a representative paid action (IMAGE_GENERATION is the most common)
        const capacityCheck = await checkAICapacity(
            scope.tenantScope.numericId,
            scope.storeScope.numericId,
            AI_ACTIONS_TYPES.IMAGE_GENERATION,
        );

        // Doctrine-compliant response: booleans only, no unit counts
        return NextResponse.json({
            canRunActions: capacityCheck.allowed,
            packAvailable: true, // Enhancement pack always available for purchase
            reason: capacityCheck.reason === "maintenance" ? "maintenance" : undefined,
        });
    } catch (error) {
        logRuntimeFailure("ai_packs_status_check_failed", error, {
            ...getBoundedRuntimeStringContext("userId", session?.uId || session?.user?.id),
            ...getBoundedRuntimeStringContext("tenantId", session?.user?.tenantId || session?.tId),
            ...getBoundedRuntimeStringContext("storeId", session?.user?.storeId || session?.sId),
            ...getBoundedRuntimeStringContext("requestPath", request.nextUrl.pathname),
        });
        return NextResponse.json(
            { error: "Failed to check AI status" },
            { status: 500 }
        );
    }
});
