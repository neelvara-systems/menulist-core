const RETRYABLE_FIREBASE_ERROR_CODES = new Set<string>([
  'aborted',
  'deadline-exceeded',
  'internal',
  'resource-exhausted',
  'unavailable',
  'unknown',
]);

const RETRYABLE_GRPC_STATUS_CODES = new Set<number>([2, 4, 8, 10, 13, 14]);
export const MESSAGING_PUBLISH_STALE_AFTER_MS = 5 * 60 * 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFirebaseErrorCode(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/^firestore\//, '');
  return normalized || null;
}

/**
 * A publish retry repeats preflight queries and may attempt the final
 * transaction again, so only explicit transient Firebase/gRPC failures are
 * eligible. Unknown and application-defined errors fail closed.
 */
export function isMessagingPublishRetryableError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = normalizeFirebaseErrorCode(error.code);
  if (typeof code === 'number') return RETRYABLE_GRPC_STATUS_CODES.has(code);
  return typeof code === 'string' && RETRYABLE_FIREBASE_ERROR_CODES.has(code);
}

export function isMessagingPublishClaimStale(
  stateEnteredAtMillis: number,
  nowMillis: number,
): boolean {
  return Number.isFinite(stateEnteredAtMillis)
    && Number.isFinite(nowMillis)
    && stateEnteredAtMillis <= nowMillis - MESSAGING_PUBLISH_STALE_AFTER_MS;
}
