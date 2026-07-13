export const MAX_MESSAGING_REPLACEMENT_UPLOADS = 15;
export const MAX_MESSAGING_PENDING_UPLOAD_CLEANUP_PATHS = 45;

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;
const STORAGE_PATH_PATTERN = /^messagingOnboarding\/([A-Za-z0-9_-]{1,160})\/([A-Za-z0-9_-]{1,160})\.(jpg|png|webp|heic|heif|pdf)$/;

export function isMessagingOnboardingUploadStoragePath(
  value: unknown,
  sessionId: string,
): value is string {
  if (typeof value !== "string" || !SESSION_ID_PATTERN.test(sessionId)) return false;
  const match = STORAGE_PATH_PATTERN.exec(value);
  return Boolean(match && match[1] === sessionId);
}

export function normalizeMessagingPendingUploadCleanupPaths(
  value: unknown,
  sessionId: string,
): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_MESSAGING_PENDING_UPLOAD_CLEANUP_PATHS) {
    return null;
  }
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!isMessagingOnboardingUploadStoragePath(candidate, sessionId) || seen.has(candidate)) {
      return null;
    }
    seen.add(candidate);
    paths.push(candidate);
  }
  return paths;
}

export function mergeMessagingPendingUploadCleanupPaths(
  current: readonly string[],
  additions: readonly string[],
  sessionId: string,
): string[] | null {
  return normalizeMessagingPendingUploadCleanupPaths(
    Array.from(new Set([...current, ...additions])),
    sessionId,
  );
}
