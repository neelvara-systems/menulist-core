/**
 * Public Menu Draft Source Contract
 *
 * Self-contained shared data. Keep the Functions mirror byte-for-byte equal.
 */

export const PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION = 1 as const;

export type PublicMenuDraftSourceFile = {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
};

export type PublicMenuDraftSourceValidationOptions = {
  allowLocalEmulator: boolean;
  allowedBucket: string;
  allowedMimeTypes: readonly string[];
  draftId: string;
  maxFileSizeBytes: number;
  maxFiles: number;
  maxTotalSizeBytes: number;
};

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

export function sanitizePublicMenuDraftSourceFileName(value: unknown): string {
  return typeof value === "string"
    ? value.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim().slice(0, 240)
    : "";
}

export function normalizePublicMenuDraftSourceFiles(
  value: unknown,
  options: PublicMenuDraftSourceValidationOptions,
): PublicMenuDraftSourceFile[] | null {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.length > options.maxFiles
    || !options.allowedBucket
    || !options.draftId
    || !Number.isSafeInteger(options.maxFileSizeBytes)
    || options.maxFileSizeBytes <= 0
    || !Number.isSafeInteger(options.maxTotalSizeBytes)
    || options.maxTotalSizeBytes < options.maxFileSizeBytes
  ) {
    return null;
  }

  const allowedMimeTypes = new Set(options.allowedMimeTypes.map((type) => type.trim().toLowerCase()));
  const seenPaths = new Set<string>();
  const seenUrls = new Set<string>();
  const normalized: PublicMenuDraftSourceFile[] = [];
  let totalSizeBytes = 0;

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const record = candidate as Record<string, unknown>;
    const fileName = sanitizePublicMenuDraftSourceFileName(record.fileName);
    const fileSize = Number(record.fileSize);
    const fileType = typeof record.fileType === "string" ? record.fileType.trim().toLowerCase() : "";
    const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : "";
    const downloadUrl = typeof record.downloadUrl === "string" ? record.downloadUrl.trim() : "";

    if (
      !fileName
      || !allowedMimeTypes.has(fileType)
      || !Number.isSafeInteger(fileSize)
      || fileSize <= 0
      || fileSize > options.maxFileSizeBytes
      || !storagePath.startsWith(`publicMenuDrafts/${options.draftId}/`)
      || storagePath.length > 1_024
      || storagePath.includes("..")
      || storagePath.includes("\\")
      || !downloadUrl
      || downloadUrl.length > 2_048
      || seenPaths.has(storagePath)
      || seenUrls.has(downloadUrl)
    ) {
      return null;
    }

    try {
      const parsed = new URL(downloadUrl);
      const isLocalEmulator = options.allowLocalEmulator
        && ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (
        (!isLocalEmulator && parsed.protocol !== "https:")
        || (isLocalEmulator && !["http:", "https:"].includes(parsed.protocol))
        || (!isLocalEmulator && parsed.hostname !== "firebasestorage.googleapis.com")
      ) {
        return null;
      }
      const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
      const bucketName = decodeURIComponent(match?.[1] || "");
      const parsedStoragePath = decodeURIComponent(match?.[2] || "");
      if (
        bucketName !== options.allowedBucket
        || parsedStoragePath !== storagePath
        || !parsed.searchParams.get("token")
      ) {
        return null;
      }
    } catch {
      return null;
    }

    totalSizeBytes += fileSize;
    if (!Number.isSafeInteger(totalSizeBytes) || totalSizeBytes > options.maxTotalSizeBytes) return null;
    seenPaths.add(storagePath);
    seenUrls.add(downloadUrl);
    normalized.push({ downloadUrl, fileName, fileSize, fileType, storagePath });
  }

  return normalized;
}
