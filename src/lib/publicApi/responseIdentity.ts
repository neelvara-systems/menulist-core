const PULL_API_VOLATILE_RESPONSE_FIELDS = new Set(['generatedAt', 'timestamp']);

/**
 * Build the stable truth projection used for pull-response ETags. Request-time
 * metadata stays in the response body but must not make unchanged truth look
 * different on every poll.
 */
export function buildPullApiETagPayload(
    payload: Record<string, unknown>,
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(payload).filter(([field]) => !PULL_API_VOLATILE_RESPONSE_FIELDS.has(field)),
    );
}
