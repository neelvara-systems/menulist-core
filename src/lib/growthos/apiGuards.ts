import { getGrowthOSRateLimitFailureDecision } from "@lib/growthos/rateLimitPolicy";
import { growthOSPrivateJson } from "@lib/growthos/apiResponse";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

export async function applyGrowthOSWriteRateLimit(input: {
    actorId: string;
    routeKey: string;
    storeId: string;
    tenantId: string;
}) {
    const rateLimit = await checkRateLimit({
        failClosedOnProviderError: true,
        key: [
            "growthos",
            input.routeKey,
            hashPublicRateLimitValue(input.actorId),
            hashPublicRateLimitValue(input.tenantId),
            hashPublicRateLimitValue(input.storeId),
        ].join(":"),
        ...getRateLimitForFeature("DATA_WRITE"),
    });
    if (rateLimit.allowed) return null;

    const decision = getGrowthOSRateLimitFailureDecision(rateLimit);
    return growthOSPrivateJson({
        error: decision.providerUnavailable
            ? "Request protection is temporarily unavailable. Please try again shortly."
            : "Rate limit exceeded. Please try again in a minute.",
        code: decision.code,
        retryAfter: decision.retryAfter,
    }, {
        status: decision.status,
        headers: {
            "Retry-After": String(decision.retryAfter),
            ...(decision.providerUnavailable ? {} : {
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": String(rateLimit.resetAt),
            }),
        },
    });
}
