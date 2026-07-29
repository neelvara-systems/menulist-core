export const dynamic = 'force-dynamic';
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { AI_ACTIONS_TYPES } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import {
    requireAnyStorePermission,
    resolveStorePermissionSessionScope,
} from "@lib/permissions/server";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { withAuth } from "../../../../middleware/auth";

const AI_PACK_STATUS_PRIVATE_RESPONSE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
} as const;
const withAiPackStatusPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(AI_PACK_STATUS_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};
const aiPackStatusJson = (body: unknown, init: ResponseInit = {}) => (
    withAiPackStatusPrivateHeaders(NextResponse.json(body, init))
);

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
            return aiPackStatusJson(
                { error: "User not onboarded." },
                { status: 400 }
            );
        }

        const actorId = resolveCurrentSessionUserDocumentId(session);
        const rateLimitConfig = getRateLimitForFeature("DATA_READ");
        const rateLimit = await checkRateLimit({
            key: `ai-pack-status:${hashPublicRateLimitValue(actorId || "invalid-session")}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            return aiPackStatusJson(
                {
                    error: rateLimit.reason === "provider_unavailable"
                        ? "AI status is temporarily unavailable."
                        : "Too many requests. Please try again later.",
                    retryAfter: Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
                },
                { status: rateLimit.reason === "provider_unavailable" ? 503 : 429 },
            );
        }

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.ACCESS_BILLING],
            "AI pack status",
        );
        if (permissionError) return withAiPackStatusPrivateHeaders(permissionError);

        // Check capacity using a representative paid action (IMAGE_GENERATION is the most common)
        const capacityCheck = await checkAICapacity(
            scope.tenantScope.numericId,
            scope.storeScope.numericId,
            AI_ACTIONS_TYPES.IMAGE_GENERATION,
        );

        // Doctrine-compliant response: booleans only, no unit counts
        return aiPackStatusJson({
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
        return aiPackStatusJson(
            { error: "Failed to check AI status" },
            { status: 500 }
        );
    }
});
