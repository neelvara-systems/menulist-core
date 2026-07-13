import {
  normalizeExtractedBusinessProfile,
  type ExtractedBusinessProfile,
} from '@data/shared/extractedBusinessProfile';
import {
  getPublicMenuDraftTimestampMillis,
  normalizePublicMenuDraftExtractedData,
  type PublicMenuDraftExtractedData,
} from '@data/shared/publicMenuDraftData';
import crypto from 'crypto';
import {
  MAX_MESSAGING_REPLACEMENT_UPLOADS,
  mergeMessagingPendingUploadCleanupPaths,
  normalizeMessagingPendingUploadCleanupPaths,
} from '@data/shared/messagingReplacementUploads';

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOADS = 15;
const MAX_PUBLISH_PROJECT_FILES_BYTES = 800_000;

type UnknownRecord = Record<string, unknown>;

export type MessagingPublishUpload = {
  fileName?: string;
  fileSize: number;
  id: string;
  mimeType: string;
  providerMediaId: string;
  sha256: string;
  storagePath: string;
  storageUrl: string;
  uploadedAtMillis: number;
};

export type MessagingPublishProjectFile = {
  active: boolean;
  deleted: boolean;
  extractedData: {
    data: PublicMenuDraftExtractedData;
    message: string;
    processingMessages?: string[];
  } | null;
  index: number;
  name: string;
  qualityScore?: number;
  size: number;
  type: string;
  uid: string;
  url: string;
};

export type MessagingPublishResult = {
  dashboardUrl: string;
  projectId: string;
  publicUrl: string;
  storeId: number;
  tenantId: number;
  userId: string;
};

/**
 * Resets every obsolete outbound-delivery claim when publish commits and opens
 * exactly one fresh confirmation delivery. Keeping this contract beside the
 * publish-session boundary makes stale preview/fix/reminder leases testable
 * without executing the full tenant/store transaction.
 */
export function buildMessagingPublishDeliveryState() {
  return {
    confirmationMessageDeliveryAttempts: 0,
    confirmationMessageLeaseToken: null,
    confirmationMessageLeaseUntil: null,
    confirmationPending: true,
    fixMessageDeliveryAttempts: 0,
    fixMessageLeaseToken: null,
    fixMessageLeaseUntil: null,
    fixMessagePending: false,
    previewMessageDeliveryAttempts: 0,
    previewMessageLeaseToken: null,
    previewMessageLeaseUntil: null,
    previewMessagePending: false,
    reminderMessageLeaseToken: null,
    reminderMessageLeaseUntil: null,
  } as const;
}

/** Moves unapproved post-preview files into the durable cleanup queue. */
export function buildMessagingPublishUploadCleanupState(
  session: Pick<
  MessagingPublishSession,
  'pendingUploadCleanupPaths' | 'replacementUploads' | 'sessionId'
  >,
) {
  const pendingUploadCleanupPaths = mergeMessagingPendingUploadCleanupPaths(
    session.pendingUploadCleanupPaths,
    session.replacementUploads.map(({ storagePath }) => storagePath),
    session.sessionId,
  );
  if (!pendingUploadCleanupPaths) {
    throw new Error('MESSAGING_UPLOAD_CLEANUP_QUEUE_FULL');
  }
  return {
    pendingUploadCleanupPaths,
    replacementUploads: [],
    uploadCleanupPending: pendingUploadCleanupPaths.length > 0,
  } as const;
}

export type MessagingPublishSession = {
  correctionCount: number;
  createdAtMillis: number;
  detectedBusinessCategory: string | null;
  detectedBusinessType: string | null;
  expiresAtMillis: number;
  extractedBusinessInfoAddress: string;
  extractedBusinessProfile: ExtractedBusinessProfile | null;
  extractedMenuData: PublicMenuDraftExtractedData;
  extractedProjectFiles: MessagingPublishProjectFile[];
  previewToken: string;
  provider: 'telegram' | 'whatsapp';
  providerDisplayId: string;
  providerUserId: string;
  replacementUploads: MessagingPublishUpload[];
  pendingUploadCleanupPaths: string[];
  publishedResult: MessagingPublishResult | null;
  sessionId: string;
  state: 'AWAITING_APPROVAL' | 'LIVE' | 'PUBLISHING';
  stateEnteredAtMillis: number;
  uploads: MessagingPublishUpload[];
  uploadCleanupPending: boolean;
  validMenuFiles: string[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes('\0')
    ? value
    : null;
}

function nullableBoundedString(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  return boundedString(value, maxLength) ?? undefined;
}

function safeHttpsUrl(value: unknown): string | null {
  const normalized = boundedString(value, 2048);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
      ? normalized
      : null;
  } catch {
    return null;
  }
}

function normalizePublishedResult(value: unknown): MessagingPublishResult | null {
  const source = toRecord(value);
  if (!source) return null;
  const tenantId = source.tenantId;
  const storeId = source.storeId;
  const projectId = boundedString(source.projectId, 180);
  const userId = boundedString(source.userId, 180);
  const publicUrl = safeHttpsUrl(source.publicUrl);
  const dashboardUrl = safeHttpsUrl(source.dashboardUrl);
  if (
    typeof tenantId !== 'number'
    || !Number.isSafeInteger(tenantId)
    || tenantId <= 0
    || typeof storeId !== 'number'
    || !Number.isSafeInteger(storeId)
    || storeId <= 0
    || !projectId
    || !userId
    || !publicUrl
    || !dashboardUrl
  ) {
    return null;
  }
  return { dashboardUrl, projectId, publicUrl, storeId, tenantId, userId };
}

function storagePathFromDownloadUrl(value: string, expectedBucket: string): string | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'firebasestorage.googleapis.com'
      || decodeURIComponent(match?.[1] || '') !== expectedBucket
      || url.searchParams.get('alt') !== 'media'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        url.searchParams.get('token') || '',
      )
    ) {
      return null;
    }
    return match?.[2] ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function normalizeUpload(
  value: unknown,
  sessionId: string,
  expectedBucket: string,
): MessagingPublishUpload | null {
  const source = toRecord(value);
  if (!source) return null;
  const id = boundedString(source.id, 160);
  const providerMediaId = boundedString(source.providerMediaId, 256);
  const storagePath = boundedString(source.storagePath, 512);
  const storageUrl = boundedString(source.storageUrl, 2048);
  const mimeType = boundedString(source.mimeType, 120);
  const sha256 = typeof source.sha256 === 'string' && /^[0-9a-f]{64}$/.test(source.sha256)
    ? source.sha256
    : null;
  const fileName = source.fileName === undefined ? undefined : boundedString(source.fileName, 180);
  const fileSize = source.fileSize;
  const uploadedAt = getPublicMenuDraftTimestampMillis(source.uploadedAt);
  if (
    !id
    || !providerMediaId
    || !storagePath
    || !storageUrl
    || !mimeType
    || !ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)
    || !sha256
    || fileName === null
    || typeof fileSize !== 'number'
    || !Number.isSafeInteger(fileSize)
    || fileSize <= 0
    || fileSize > MAX_UPLOAD_BYTES
    || uploadedAt === null
    || !storagePath.startsWith(`messagingOnboarding/${sessionId}/`)
    || storagePathFromDownloadUrl(storageUrl, expectedBucket) !== storagePath
  ) {
    return null;
  }
  return {
    ...(fileName === undefined ? {} : { fileName }),
    fileSize,
    id,
    mimeType,
    providerMediaId,
    sha256,
    storagePath,
    storageUrl,
    uploadedAtMillis: uploadedAt,
  };
}

function normalizeUploads(
  value: unknown,
  sessionId: string,
  expectedBucket: string,
  options: { allowEmpty?: boolean; max?: number } = {},
): MessagingPublishUpload[] | null {
  if (
    !Array.isArray(value)
    || (!options.allowEmpty && value.length === 0)
    || value.length > (options.max ?? MAX_UPLOADS)
  ) return null;
  const uploads: MessagingPublishUpload[] = [];
  const ids = new Set<string>();
  const providerMediaIds = new Set<string>();
  const hashes = new Set<string>();
  for (const candidate of value) {
    const upload = normalizeUpload(candidate, sessionId, expectedBucket);
    if (!upload || ids.has(upload.id) || providerMediaIds.has(upload.providerMediaId) || hashes.has(upload.sha256)) {
      return null;
    }
    ids.add(upload.id);
    providerMediaIds.add(upload.providerMediaId);
    hashes.add(upload.sha256);
    uploads.push(upload);
  }
  return uploads;
}

function normalizeValidUploadIds(value: unknown, uploads: readonly MessagingPublishUpload[]): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > uploads.length) return null;
  const uploadIds = new Set(uploads.map((upload) => upload.id));
  const validIds: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== 'string' || !uploadIds.has(candidate) || seen.has(candidate)) return null;
    seen.add(candidate);
    validIds.push(candidate);
  }
  return validIds;
}

function boundedProjectMessage(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

function normalizeProcessingMessages(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized: string[] = [];
  for (const candidate of value) {
    const message = boundedProjectMessage(candidate);
    if (!message || normalized.includes(message)) continue;
    normalized.push(message);
    if (normalized.length >= 20) break;
  }
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeQualityScore(value: unknown): number | undefined {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 1
    ? value
    : undefined;
}

function normalizeProjectFileIndex(value: unknown, fallbackIndex: number): number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value < MAX_UPLOADS
    ? value
    : fallbackIndex;
}

function normalizeProjectFileExtractedData(value: unknown): MessagingPublishProjectFile['extractedData'] | null {
  const source = toRecord(value);
  if (!source) return null;
  const data = normalizePublicMenuDraftExtractedData(source.data);
  if (!data) return null;
  const processingMessages = normalizeProcessingMessages(source.processingMessages);
  return {
    data,
    message: boundedProjectMessage(source.message),
    ...(processingMessages ? { processingMessages } : {}),
  };
}

function buildProjectFileFromUpload(
  upload: MessagingPublishUpload,
  index: number,
  extractedData: MessagingPublishProjectFile['extractedData'],
): MessagingPublishProjectFile {
  return {
    active: true,
    deleted: false,
    extractedData,
    index,
    name: upload.fileName || upload.id,
    size: upload.fileSize,
    type: upload.mimeType,
    uid: upload.id,
    url: upload.storageUrl,
  };
}

function buildFallbackProjectFiles(
  uploads: readonly MessagingPublishUpload[],
  validMenuFiles: readonly string[],
  extractedMenuData: PublicMenuDraftExtractedData,
): MessagingPublishProjectFile[] {
  const validUploadIds = new Set(validMenuFiles);
  return uploads
    .filter((upload) => validUploadIds.has(upload.id))
    .map((upload, index) => buildProjectFileFromUpload(
      upload,
      index,
      index === 0 ? { message: '', data: extractedMenuData } : null,
    ));
}

function normalizeExtractedProjectFiles(
  value: unknown,
  uploads: readonly MessagingPublishUpload[],
  validMenuFiles: readonly string[],
  extractedMenuData: PublicMenuDraftExtractedData,
): MessagingPublishProjectFile[] | null {
  if (value === undefined || value === null) {
    return buildFallbackProjectFiles(uploads, validMenuFiles, extractedMenuData);
  }
  if (!Array.isArray(value)) return null;

  const validUploadIds = new Set(validMenuFiles);
  const validUploads = uploads.filter((upload) => validUploadIds.has(upload.id));
  if (value.length !== validUploads.length) return null;

  const filesByUid = new Map<string, UnknownRecord>();
  for (const candidate of value) {
    const source = toRecord(candidate);
    const uid = boundedString(source?.uid, 160);
    if (!source || !uid || !validUploadIds.has(uid) || filesByUid.has(uid)) return null;
    filesByUid.set(uid, source);
  }

  const normalized = validUploads.map((upload, fallbackIndex) => {
    const source = filesByUid.get(upload.id);
    if (!source) return null;
    const sourceExtractedData = source.extractedData;
    const extractedData = sourceExtractedData === null || sourceExtractedData === undefined
      ? null
      : normalizeProjectFileExtractedData(sourceExtractedData);
    if (sourceExtractedData !== null && sourceExtractedData !== undefined && !extractedData) return null;
    const qualityScore = normalizeQualityScore(source.qualityScore);
    return {
      ...buildProjectFileFromUpload(upload, normalizeProjectFileIndex(source.index, fallbackIndex), extractedData),
      active: source.active !== false,
      deleted: source.deleted === true,
      ...(qualityScore !== undefined ? { qualityScore } : {}),
    };
  });

  if (normalized.some((file) => file === null)) return null;
  const projectFiles = normalized as MessagingPublishProjectFile[];
  const filesWithFallback = projectFiles.some((file) => file.extractedData)
    ? projectFiles
    : buildFallbackProjectFiles(uploads, validMenuFiles, extractedMenuData);
  return Buffer.byteLength(JSON.stringify(filesWithFallback), 'utf8') <= MAX_PUBLISH_PROJECT_FILES_BYTES
    ? filesWithFallback
    : null;
}

function getCurrentStateHistoryTimestamp(
  value: unknown,
  state: MessagingPublishSession['state'],
): number | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return null;
  const last = toRecord(value[value.length - 1]);
  return last && last.state === state
    ? getPublicMenuDraftTimestampMillis(last.timestamp)
    : null;
}

function getLatestPreviewHistoryTimestamp(value: unknown): number | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return null;
  for (let index = value.length - 1; index >= 0; index--) {
    const entry = toRecord(value[index]);
    if (entry?.state === 'PREVIEW_READY' || entry?.state === 'AWAITING_APPROVAL') {
      return getPublicMenuDraftTimestampMillis(entry.timestamp);
    }
  }
  return null;
}

export function normalizeMessagingPublishSession(
  value: unknown,
  expectedSessionId: string,
  expectedBucket: string,
): MessagingPublishSession | null {
  const source = toRecord(value);
  if (!source || !expectedBucket) return null;
  const sessionId = boundedString(source.sessionId, 160);
  const providerUserId = boundedString(source.providerUserId, 160);
  const providerDisplayId = boundedString(source.providerDisplayId, 160);
  const provider = source.provider === 'whatsapp' || source.provider === 'telegram'
    ? source.provider
    : null;
  const state = source.state === 'AWAITING_APPROVAL'
    || source.state === 'PUBLISHING'
    || source.state === 'LIVE'
    ? source.state
    : null;
  const previewToken = boundedString(source.previewToken, 256);
  const createdAtMillis = getPublicMenuDraftTimestampMillis(source.createdAt);
  const expiresAtMillis = getPublicMenuDraftTimestampMillis(source.expiresAt);
  const correctionCount = source.correctionCount;
  const stateEnteredAtMillis = state
    ? getCurrentStateHistoryTimestamp(source.stateHistory, state)
    : null;
  const detectedBusinessType = nullableBoundedString(source.detectedBusinessType, 160);
  const detectedBusinessCategory = nullableBoundedString(source.detectedBusinessCategory, 160);
  const persistedUploads = sessionId === expectedSessionId
    ? normalizeUploads(source.uploads, expectedSessionId, expectedBucket)
    : null;
  const latestPreviewAtMillis = getLatestPreviewHistoryTimestamp(source.stateHistory);
  const legacyReplacementUploads = source.replacementUploads === undefined
    && persistedUploads
    && latestPreviewAtMillis !== null
    && state !== 'LIVE'
    ? persistedUploads.filter((upload) => upload.uploadedAtMillis > latestPreviewAtMillis)
    : [];
  const replacementUploads = source.replacementUploads === undefined
    ? legacyReplacementUploads
    : normalizeUploads(source.replacementUploads, expectedSessionId, expectedBucket, {
      allowEmpty: true,
      max: MAX_MESSAGING_REPLACEMENT_UPLOADS,
    });
  const uploads = persistedUploads && legacyReplacementUploads.length > 0
    ? persistedUploads.filter((upload) => !legacyReplacementUploads.some(({ id }) => id === upload.id))
    : persistedUploads;
  const pendingUploadCleanupPaths = normalizeMessagingPendingUploadCleanupPaths(
    source.pendingUploadCleanupPaths ?? [],
    expectedSessionId,
  );
  const uploadCleanupPending = source.uploadCleanupPending ?? false;
  const validMenuFiles = uploads ? normalizeValidUploadIds(source.validMenuFiles, uploads) : null;
  const extractedMenuData = normalizePublicMenuDraftExtractedData(source.extractedMenuData);
  const embeddedMenuProfile = toRecord(source.extractedMenuData)?.extractedBusinessProfile;
  const rawProfile = source.extractedBusinessProfile ?? embeddedMenuProfile ?? null;
  const extractedBusinessProfile = rawProfile === null
    ? null
    : normalizeExtractedBusinessProfile(rawProfile) || undefined;
  const extractedProjectFiles = uploads && validMenuFiles && extractedMenuData
    ? normalizeExtractedProjectFiles(
      source.extractedProjectFiles,
      uploads,
      validMenuFiles,
      extractedMenuData,
    )
    : null;
  const extractedBusinessInfoAddress = boundedString(
    toRecord(source.extractedBusinessInfo)?.address,
    500,
  ) || '';
  const publishedResult = source.publishedResult === null
    ? null
    : normalizePublishedResult(source.publishedResult);
  if (
    sessionId !== expectedSessionId
    || !provider
    || !providerUserId
    || !providerDisplayId
    || !state
    || stateEnteredAtMillis === null
    || !previewToken
    || !/^[A-Za-z0-9_-]{20,256}$/.test(previewToken)
    || createdAtMillis === null
    || expiresAtMillis === null
    || typeof correctionCount !== 'number'
    || !Number.isSafeInteger(correctionCount)
    || correctionCount < 0
    || detectedBusinessType === undefined
    || detectedBusinessCategory === undefined
    || !uploads
    || !replacementUploads
    || !pendingUploadCleanupPaths
    || typeof uploadCleanupPending !== 'boolean'
    || uploadCleanupPending !== (pendingUploadCleanupPaths.length > 0)
    || replacementUploads.some((replacement) => uploads.some((upload) => (
      upload.id === replacement.id
      || upload.providerMediaId === replacement.providerMediaId
      || upload.sha256 === replacement.sha256
      || upload.storagePath === replacement.storagePath
    )))
    || [...uploads, ...replacementUploads].some((upload) => (
      pendingUploadCleanupPaths.includes(upload.storagePath)
    ))
    || (state === 'LIVE' && replacementUploads.length > 0)
    || !validMenuFiles
    || !extractedMenuData
    || !extractedProjectFiles
    || extractedBusinessProfile === undefined
    || (source.publishedResult !== null && !publishedResult)
    || (state === 'LIVE' && !publishedResult)
    || (state !== 'LIVE' && publishedResult !== null)
  ) {
    return null;
  }
  return {
    correctionCount,
    createdAtMillis,
    detectedBusinessCategory,
    detectedBusinessType,
    expiresAtMillis,
    extractedBusinessInfoAddress,
    extractedBusinessProfile,
    extractedMenuData,
    extractedProjectFiles,
    previewToken,
    provider,
    providerDisplayId,
    providerUserId,
    replacementUploads,
    pendingUploadCleanupPaths,
    publishedResult,
    sessionId,
    state,
    stateEnteredAtMillis,
    uploads,
    uploadCleanupPending,
    validMenuFiles,
  };
}

export function getMessagingCommittedPublishResult(
  value: unknown,
  expectedSessionId: string,
  expectedBucket: string,
): MessagingPublishResult | null {
  const session = normalizeMessagingPublishSession(value, expectedSessionId, expectedBucket);
  return session?.state === 'LIVE' ? session.publishedResult : null;
}

export function getMessagingPublishSourceFingerprint(session: MessagingPublishSession): string {
  return crypto.createHash('sha256').update(JSON.stringify({
    detectedBusinessCategory: session.detectedBusinessCategory,
    detectedBusinessType: session.detectedBusinessType,
    extractedBusinessProfile: session.extractedBusinessProfile,
    extractedMenuData: session.extractedMenuData,
    extractedProjectFiles: session.extractedProjectFiles,
    provider: session.provider,
    providerDisplayId: session.providerDisplayId,
    providerUserId: session.providerUserId,
    replacementUploads: session.replacementUploads,
    uploads: session.uploads,
    validMenuFiles: session.validMenuFiles,
  })).digest('hex');
}
