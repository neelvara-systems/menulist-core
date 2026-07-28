export interface AnswerlatticeDashboardReadRateLimitResult {
    allowed: boolean;
    reason?: "limit_exceeded" | "provider_unavailable";
    remaining: number;
    resetAt: number;
}

export type AnswerlatticeDashboardReadRateLimitDecision =
    | { kind: "allow" }
    | { kind: "provider_unavailable"; status: 503 }
    | {
        kind: "limit_exceeded";
        remaining: number;
        resetAt: number;
        retryAfterSeconds: number;
        status: 429;
    };

export function getAnswerlatticeDashboardReadRateLimitDecision(
    result: AnswerlatticeDashboardReadRateLimitResult,
    nowMs: number = Date.now(),
): AnswerlatticeDashboardReadRateLimitDecision {
    if (result.allowed) return { kind: "allow" };
    if (result.reason === "provider_unavailable") {
        return { kind: "provider_unavailable", status: 503 };
    }

    const resetAt = Number.isFinite(result.resetAt) && result.resetAt > nowMs
        ? Math.floor(result.resetAt)
        : nowMs + 1_000;
    const remaining = Number.isFinite(result.remaining) && result.remaining >= 0
        ? Math.floor(result.remaining)
        : 0;
    return {
        kind: "limit_exceeded",
        remaining,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - nowMs) / 1_000)),
        status: 429,
    };
}
