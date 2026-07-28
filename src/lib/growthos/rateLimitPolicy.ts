export function getGrowthOSRateLimitFailureDecision(input: {
    now?: number;
    reason?: unknown;
    resetAt?: unknown;
}) {
    const now = typeof input.now === "number" && Number.isFinite(input.now)
        ? input.now
        : Date.now();
    const resetAt = typeof input.resetAt === "number" && Number.isFinite(input.resetAt)
        ? input.resetAt
        : now + 1000;
    const providerUnavailable = input.reason === "provider_unavailable";
    return {
        code: providerUnavailable ? "RATE_LIMIT_UNAVAILABLE" as const : "RATE_LIMITED" as const,
        providerUnavailable,
        retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        status: providerUnavailable ? 503 as const : 429 as const,
    };
}
