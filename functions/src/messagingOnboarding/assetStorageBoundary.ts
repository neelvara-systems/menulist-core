import * as crypto from "crypto";
import type { SessionUpload } from "../types/messagingOnboarding.types";
import { UPLOAD_LIMITS } from "./constants";
import { validateMessagingUploadContent } from "./uploadContentValidation";

export type MessagingStoredUploadRecordFailure =
  | "file_name_invalid"
  | "file_size_invalid"
  | "mime_type_invalid"
  | "provider_media_id_invalid"
  | "sha256_invalid"
  | "storage_path_invalid"
  | "storage_url_invalid"
  | "upload_id_invalid";

export type MessagingStoredUploadBytesFailure =
  | "file_signature_mismatch"
  | "file_size_mismatch"
  | "sha256_mismatch";

type StoredUploadRecordResult =
  | { valid: true; storagePath: string }
  | { valid: false; reason: MessagingStoredUploadRecordFailure };

type StoredUploadBytesResult =
  | { valid: true }
  | { valid: false; reason: MessagingStoredUploadBytesFailure };

const MIME_EXTENSION: Record<(typeof UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number], string> = {
  "application/pdf": "pdf",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getConfiguredStorageBucket(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.GCLOUD_PROJECT
    || process.env.GCP_PROJECT;
  return process.env.FIREBASE_STORAGE_BUCKET
    || (projectId ? `${projectId}.appspot.com` : "");
}

function isBoundedExactString(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes("\0");
}

function getStoragePathFromDownloadUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
    const configuredBucket = getConfiguredStorageBucket();
    if (
      url.protocol !== "https:"
      || url.hostname !== "firebasestorage.googleapis.com"
      || !configuredBucket
      || decodeURIComponent(match?.[1] || "") !== configuredBucket
      || url.searchParams.get("alt") !== "media"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        url.searchParams.get("token") || "",
      )
    ) {
      return null;
    }
    return match?.[2] ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

export function validateMessagingStoredUploadRecord(
  upload: SessionUpload,
  expectedSessionId: string,
): StoredUploadRecordResult {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(expectedSessionId)) {
    return { valid: false, reason: "storage_path_invalid" };
  }
  if (!/^[0-9a-f]{40}$/.test(upload?.id || "")) {
    return { valid: false, reason: "upload_id_invalid" };
  }
  if (!isBoundedExactString(upload.providerMediaId, 256)) {
    return { valid: false, reason: "provider_media_id_invalid" };
  }
  if (
    !UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(
      upload.mimeType as (typeof UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return { valid: false, reason: "mime_type_invalid" };
  }
  if (
    !Number.isSafeInteger(upload.fileSize)
    || upload.fileSize <= 0
    || upload.fileSize > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES
  ) {
    return { valid: false, reason: "file_size_invalid" };
  }
  if (!/^[0-9a-f]{64}$/.test(upload.sha256 || "")) {
    return { valid: false, reason: "sha256_invalid" };
  }
  if (
    upload.fileName !== undefined
    && !isBoundedExactString(upload.fileName, 180)
  ) {
    return { valid: false, reason: "file_name_invalid" };
  }

  const extension = MIME_EXTENSION[
    upload.mimeType as (typeof UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number]
  ];
  const expectedSuffix = `/${upload.id}.${extension}`;
  const expectedPrefix = `messagingOnboarding/${expectedSessionId}/`;
  if (
    !isBoundedExactString(upload.storagePath, 512)
    || !/^messagingOnboarding\/[A-Za-z0-9_-]{1,160}\/[0-9a-f]{40}\.[a-z0-9]+$/.test(
      upload.storagePath,
    )
    || !upload.storagePath.startsWith(expectedPrefix)
    || !upload.storagePath.endsWith(expectedSuffix)
  ) {
    return { valid: false, reason: "storage_path_invalid" };
  }

  if (getStoragePathFromDownloadUrl(upload.storageUrl) !== upload.storagePath) {
    return { valid: false, reason: "storage_url_invalid" };
  }

  return { valid: true, storagePath: upload.storagePath };
}

export function validateMessagingStoredUploadBytes(
  upload: Pick<SessionUpload, "fileSize" | "mimeType" | "sha256">,
  bytes: Uint8Array,
): StoredUploadBytesResult {
  if (bytes.length !== upload.fileSize) {
    return { valid: false, reason: "file_size_mismatch" };
  }
  const contentValidation = validateMessagingUploadContent(bytes, upload.mimeType);
  if (!contentValidation.valid) {
    return { valid: false, reason: "file_signature_mismatch" };
  }
  const actualSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== upload.sha256) {
    return { valid: false, reason: "sha256_mismatch" };
  }
  return { valid: true };
}
