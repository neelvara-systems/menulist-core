import { createHash } from 'node:crypto';

const SYSTEM_SCOPE_FALLBACK = 'system';
const SYSTEM_SCOPE_MAX_LENGTH = 128;

export interface SystemErrorIdentity {
  tId: string;
  sId: string;
  errorType: string;
  message: string;
}

export interface SystemErrorOccurrenceDecision {
  occurrenceCount: number;
  startsNewWindow: boolean;
}

export function normalizeSystemErrorScopeId(value: unknown): string {
  if (typeof value !== 'string') return SYSTEM_SCOPE_FALLBACK;
  const normalized = value.trim().slice(0, SYSTEM_SCOPE_MAX_LENGTH);
  return normalized || SYSTEM_SCOPE_FALLBACK;
}

export function getSystemErrorDocumentId(identity: SystemErrorIdentity): string {
  return createHash('sha256')
    .update(JSON.stringify([
      identity.tId,
      identity.sId,
      identity.errorType,
      identity.message,
    ]))
    .digest('hex');
}

export function getSystemErrorOccurrenceDecision(
  currentTimestampMillis: number | null,
  currentOccurrenceCount: unknown,
  nowMillis: number,
  windowMillis: number,
): SystemErrorOccurrenceDecision {
  const isCurrentWindow = (
    Number.isFinite(currentTimestampMillis)
    && currentTimestampMillis !== null
    && currentTimestampMillis >= nowMillis - windowMillis
  );

  if (!isCurrentWindow) {
    return {
      occurrenceCount: 1,
      startsNewWindow: true,
    };
  }

  const normalizedCurrentCount = (
    typeof currentOccurrenceCount === 'number'
    && Number.isSafeInteger(currentOccurrenceCount)
    && currentOccurrenceCount >= 1
  )
    ? currentOccurrenceCount
    : 1;

  return {
    occurrenceCount: Math.min(normalizedCurrentCount + 1, Number.MAX_SAFE_INTEGER),
    startsNewWindow: false,
  };
}
