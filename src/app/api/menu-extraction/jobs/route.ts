export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { FEATURE_FLAGS } from "@config/features";
import { AI_ACTIONS_TYPES } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { LANGUAGE_CONSTANTS } from "@constant/languages";
import { PERMISSIONS } from "@constant/permissions";
import GlobalLanguagesList from "@data/languages";
import {
  getBusinessTypeConfig,
  normalizeBusinessCategory,
  resolveStoreBusinessCategory,
} from "@data/shared/businessTypes";
import {
  buildMenuExtractionRoutingFields,
  buildProjectMenuExtractionDestination,
  MENU_EXTRACTION_JOB_LIMITS,
  MENU_EXTRACTION_SOURCES,
  MENU_LINK_IMPORT_MIME_TYPES,
  normalizeProjectJobSource,
} from "@data/shared/menuExtractionJob";
import { findDuplicateMenuExtractionFileUids } from "@data/shared/menuExtractionIntegrity";
import { MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS } from "@data/shared/menuExtractionProjectSize";
import { MenuIntakeFileInput } from "@data/shared/menuIntakeIdentity";
import { firestoreAdmin, storageAdmin } from "@lib/firebase/firebaseAdmin";
import {
  getBoundedMenuProcessingStringContext,
  getMenuProcessingJobLogContext,
  getMenuProcessingProjectLogContext,
  logMenuProcessingDiagnostic,
  logMenuProcessingFailure,
} from "@lib/firebase/menuProcessingDiagnostics";
import {
  isAllowedUploadUrl,
  isSupportedMenuIntakeMimeType,
  MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE,
  MenuIntakeIdentityServerError,
  runMenuIntakeIdentityCheck,
} from "@lib/menu-extraction/menuIntakeIdentityServer";
import { normalizeMenuExtractionJobId } from "@lib/menu-extraction/jobIdBoundary";
import {
  createOrReuseActiveMenuExtractionJob,
  MENU_EXTRACTION_ACTIVE_JOB_STATUSES,
} from "@lib/menu-extraction/activeJobClaim";
import { normalizeMenuExtractionProjectId } from "@lib/menu-extraction/projectIdBoundary";
import { normalizeProjectLanguages } from "@lib/localization/languagePolicy";
import { checkSafeMode } from "@lib/ops/safeMode";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "src/middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";

const ACTIVE_JOB_STATUSES = MENU_EXTRACTION_ACTIVE_JOB_STATUSES;
const MENU_EXTRACTION_JOB_MAX_BODY_BYTES = 128 * 1024;
const MENU_LINK_IMPORT_MIME_TYPE_SET = new Set<string>(MENU_LINK_IMPORT_MIME_TYPES);
const OWNER_UPLOAD_DEDUPE_VERSION = 1;
const OWNER_UPLOAD_COMPLETED_REUSE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_ERROR =
  "This menu is already large. Reset it or create a new menu before uploading more files.";

const getMenuExtractionJobRouteLogContext = (params: {
  jobId?: unknown;
  projectId?: unknown;
  reason?: unknown;
  sId?: unknown;
  tId?: unknown;
  uId?: unknown;
}) => ({
  ...getMenuProcessingJobLogContext(params.jobId),
  ...getMenuProcessingProjectLogContext(params.projectId),
  ...getBoundedMenuProcessingStringContext("tenantId", params.tId),
  ...getBoundedMenuProcessingStringContext("storeId", params.sId),
  ...getBoundedMenuProcessingStringContext("userId", params.uId),
  ...getBoundedMenuProcessingStringContext("reason", params.reason),
});

const JobFileSchema = z.object({
  uid: z.string().min(1).max(120).refine((value) => value.trim() === value),
  name: z.string().min(1).max(240),
  size: z.number().positive().max(MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE),
  type: z.string().min(1).max(120),
  url: z.string().min(1).max(4000),
});

const JobFilesSchema = z.array(JobFileSchema)
  .min(1)
  .max(MENU_EXTRACTION_JOB_LIMITS.MAX_FILES)
  .superRefine((files, context) => {
    if (findDuplicateMenuExtractionFileUids(files).length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Uploaded files must have unique identities.",
      });
    }
  });

const TargetLanguageSchema = z.object({
  code: z.string().min(1).max(16),
  name: z.string().min(1).max(80),
});

const MenuExtractionJobIdSchema = z.string()
  .trim()
  .refine((value) => normalizeMenuExtractionJobId(value) === value);

const MenuExtractionProjectIdSchema = z.string()
  .trim()
  .refine((value) => normalizeMenuExtractionProjectId(value) === value);

const RequestSchema = z.object({
  action: z.literal(AI_ACTIONS_TYPES.IMAGE_PROCESSING).optional(),
  businessCategory: z.string().max(80).optional(),
  businessType: z.string().max(80).optional(),
  files: JobFilesSchema,
  forceReview: z.boolean().optional(),
  identityOverrideConfirmed: z.boolean().optional(),
  jobMode: z.enum(["SINGLE_STORE", "MASTER_PROJECT", "OUTLET_LINKED"]).optional(),
  projectId: MenuExtractionProjectIdSchema,
  retriedFromJobId: MenuExtractionJobIdSchema.optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  targetLanguages: z.array(TargetLanguageSchema).min(1).max(12),
});

function requireMenuExtractionRetryJobId(value: unknown): string {
  const jobId = normalizeMenuExtractionJobId(value);
  if (!jobId) {
    throw new MenuIntakeIdentityServerError(400, "Invalid retry request.");
  }
  return jobId;
}

function parseProjectIds(projectId: string): { sId: string; tId: string } | null {
  const parts = projectId.split("-");
  if (parts.length < 3) return null;
  return {
    tId: parts[0],
    sId: parts[parts.length - 1],
  };
}

function getStoragePathFromDownloadUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      return "local-dev";
    }

    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/([^?]+)$/);
      return match?.[1] ? decodeURIComponent(match[1]) : null;
    }

    if (url.hostname === "storage.googleapis.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      return parts.length >= 2 ? decodeURIComponent(parts.slice(1).join("/")) : null;
    }

    return null;
  } catch {
    return null;
  }
}

type RetryContext = {
  files: MenuIntakeFileInput[];
  forceReview: boolean;
  source: "menu_link_import" | "owner_upload";
  sourceMetadata?: Record<string, unknown>;
};

type ExistingJobMatch = {
  data: Record<string, any>;
  id: string;
};

type OwnerUploadFileFingerprint = {
  contentHash: string;
  contentHashType: "md5" | "crc32c";
  contentType: string;
  size: number;
};

type OwnerUploadStorageMetadata = {
  contentType?: string;
  crc32c?: string;
  md5Hash?: string;
  size?: number | string;
};

type OwnerUploadSourceFingerprint = {
  fileFingerprints: OwnerUploadFileFingerprint[];
  fingerprint: string;
  targetLanguageCodes: string[];
  version: number;
};

function isAllowedProjectUploadUrl(url: string, ids: { sId: string; tId: string }): boolean {
  if (!isAllowedUploadUrl(url)) return false;
  const storagePath = getStoragePathFromDownloadUrl(url);
  if (!storagePath) return false;
  if (storagePath === "local-dev") return process.env.NODE_ENV !== "production";

  return storagePath.startsWith(`projects/files/${ids.tId}/${ids.sId}/`);
}

function isAllowedMenuLinkImportUrl(url: string, ids: { sId: string; tId: string }, projectId: string): boolean {
  if (!isAllowedUploadUrl(url)) return false;
  const storagePath = getStoragePathFromDownloadUrl(url);
  if (!storagePath) return false;
  if (storagePath === "local-dev") return process.env.NODE_ENV !== "production";

  return storagePath.startsWith(`menuLinkImports/${ids.tId}/${ids.sId}/${projectId}/`);
}

function isSupportedExtractionMimeType(type: string, source: "menu_link_import" | "owner_upload"): boolean {
  return source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
    ? MENU_LINK_IMPORT_MIME_TYPE_SET.has(type)
    : isSupportedMenuIntakeMimeType(type);
}

function normalizeTargetLanguages(languages: Array<{ code: string; name: string }>): Array<{ code: string; name: string }> {
  const knownByCode = new Map(GlobalLanguagesList.map((language) => [language.code, language]));
  const requestedCodes = languages
    .map((language) => language.code.trim().toLowerCase())
    .filter((code) => knownByCode.has(code));

  return normalizeProjectLanguages(requestedCodes)
    .slice(0, LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT)
    .map((code) => knownByCode.get(code))
    .filter(Boolean)
    .map((language) => ({ code: language!.code, name: language!.name }));
}

function estimateJsonUtf8Bytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function getProjectedProjectDocumentSize(projectData: Record<string, any>, incomingFileCount: number) {
  const currentBytes = estimateJsonUtf8Bytes(projectData);
  const maximumReservedHeadroomBytes =
    MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.SAVE_SAFE_BYTES -
    MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.WARNING_BYTES;
  const reservedHeadroomBytes = Math.min(
    incomingFileCount * MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.PRE_AI_EXTRACTED_DATA_BYTES_PER_FILE,
    maximumReservedHeadroomBytes,
  );
  const projectedBytes = currentBytes + reservedHeadroomBytes;

  return {
    currentBytes,
    projectedBytes,
    limitBytes: MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.SAVE_SAFE_BYTES,
    reservedHeadroomBytes,
  };
}

function getTrustedBusinessContext(
  projectData: Record<string, any>,
  requestData: { businessCategory?: string; businessType?: string },
): { businessCategory?: string; businessType?: string } {
  const projectType = getBusinessTypeConfig(projectData.businessType);
  const requestType = getBusinessTypeConfig(requestData.businessType);
  const businessType = projectType?.value || requestType?.value;
  const businessCategoryInput =
    normalizeBusinessCategory(projectData.businessCategory) ||
    normalizeBusinessCategory(requestData.businessCategory);
  const businessCategory = businessType
    ? resolveStoreBusinessCategory(businessType, businessCategoryInput)
    : businessCategoryInput;

  return {
    ...(businessCategory ? { businessCategory } : {}),
    ...(businessType ? { businessType } : {}),
  };
}

async function findExistingActiveJob(projectId: string, userId: string): Promise<ExistingJobMatch | null> {
  const snapshot = await firestoreAdmin
    .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
    .where("projectId", "==", projectId)
    .where("uId", "==", userId)
    .where("status", "in", ACTIVE_JOB_STATUSES)
    .limit(10)
    .get();

  if (snapshot.empty) return null;

  const sorted = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      createdAt: doc.data()?.createdAt,
    }))
    .sort((left, right) => {
      const leftTime = typeof left.createdAt?.toMillis === "function" ? left.createdAt.toMillis() : 0;
      const rightTime = typeof right.createdAt?.toMillis === "function" ? right.createdAt.toMillis() : 0;
      return rightTime - leftTime;
    });

  const latest = sorted[0];
  if (!latest) return null;
  const data = snapshot.docs.find((doc) => doc.id === latest.id)?.data() || {};
  return { id: latest.id, data };
}

function getJobTimestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof (value as any).toMillis === "function") return (value as any).toMillis();
  if (typeof (value as any).seconds === "number") return (value as any).seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function normalizeDedupeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function getOwnerUploadFileFingerprint(
  file: MenuIntakeFileInput,
  ids: { sId: string; tId: string },
): Promise<OwnerUploadFileFingerprint | null> {
  const storagePath = getStoragePathFromDownloadUrl(file.url);
  if (!storagePath || storagePath === "local-dev") return null;
  if (!storagePath.startsWith(`projects/files/${ids.tId}/${ids.sId}/`)) return null;

  let metadata: OwnerUploadStorageMetadata | null = null;
  try {
    [metadata] = await storageAdmin.bucket().file(storagePath).getMetadata();
  } catch (error) {
    logMenuProcessingFailure("menu_extraction_owner_upload_metadata_lookup_failed", error, {
      ...getMenuExtractionJobRouteLogContext({ tId: ids.tId, sId: ids.sId }),
      ...getBoundedMenuProcessingStringContext("ownerUploadFileUid", file.uid),
      ...getBoundedMenuProcessingStringContext("ownerUploadFileType", file.type),
      ...getBoundedMenuProcessingStringContext("ownerUploadStoragePath", storagePath),
      ownerUploadFileSize: Number.isFinite(Number(file.size)) ? Number(file.size) : null,
    });
    return null;
  }
  if (!metadata) return null;
  const md5Hash = typeof metadata.md5Hash === "string" ? metadata.md5Hash : "";
  const crc32c = typeof metadata.crc32c === "string" ? metadata.crc32c : "";
  const contentHash = md5Hash || crc32c;
  if (!contentHash) return null;

  return {
    contentHash,
    contentHashType: md5Hash ? "md5" : "crc32c",
    contentType: String(metadata.contentType || file.type || "").toLowerCase(),
    size: Number(metadata.size || file.size || 0),
  };
}

async function buildOwnerUploadSourceFingerprint(params: {
  businessCategory?: string;
  businessType?: string;
  files: MenuIntakeFileInput[];
  ids: { sId: string; tId: string };
  targetLanguages: Array<{ code: string; name: string }>;
}): Promise<OwnerUploadSourceFingerprint | null> {
  const fileFingerprints = await Promise.all(
    params.files.map((file) => getOwnerUploadFileFingerprint(file, params.ids)),
  );

  if (fileFingerprints.some((fingerprint) => !fingerprint)) {
    return null;
  }

  const targetLanguageCodes = params.targetLanguages
    .map((language) => normalizeDedupeText(language.code))
    .filter(Boolean);

  const fingerprintInput = {
    action: AI_ACTIONS_TYPES.IMAGE_PROCESSING,
    businessCategory: normalizeDedupeText(params.businessCategory),
    businessType: normalizeDedupeText(params.businessType),
    files: fileFingerprints,
    source: MENU_EXTRACTION_SOURCES.OWNER_UPLOAD,
    targetLanguageCodes,
    version: OWNER_UPLOAD_DEDUPE_VERSION,
  };

  return {
    fileFingerprints: fileFingerprints as OwnerUploadFileFingerprint[],
    fingerprint: crypto.createHash("sha256").update(JSON.stringify(fingerprintInput)).digest("hex"),
    targetLanguageCodes,
    version: OWNER_UPLOAD_DEDUPE_VERSION,
  };
}

async function deleteUnreferencedOwnerUploadFiles(params: {
  files: MenuIntakeFileInput[];
  ids: { sId: string; tId: string };
  reason: string;
  reusedJobData?: Record<string, any> | null;
}): Promise<void> {
  const reusedUrls = new Set(
    Array.isArray(params.reusedJobData?.files)
      ? params.reusedJobData.files.map((file: any) => String(file?.url || "")).filter(Boolean)
      : [],
  );

  const deletions = params.files.map(async (file) => {
    if (reusedUrls.has(file.url)) return;
    const storagePath = getStoragePathFromDownloadUrl(file.url);
    if (!storagePath || storagePath === "local-dev") return;
    if (!storagePath.startsWith(`projects/files/${params.ids.tId}/${params.ids.sId}/`)) return;
    await storageAdmin.bucket().file(storagePath).delete({ ignoreNotFound: true });
  });

  const results = await Promise.allSettled(deletions);
  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed > 0) {
    logMenuProcessingDiagnostic("menu_extraction_owner_upload_cleanup_partially_failed", {
      ...getMenuExtractionJobRouteLogContext({
        reason: params.reason,
        sId: params.ids.sId,
        tId: params.ids.tId,
      }),
      failed,
      fileCount: params.files.length,
    });
  }
}

async function findReusableCompletedOwnerJob(params: {
  fingerprint: string;
  projectLastUpdatedAtMillis?: number | null;
  projectId: string;
  userId: string;
}): Promise<ExistingJobMatch | null> {
  const snapshot = await firestoreAdmin
    .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
    .where("projectId", "==", params.projectId)
    .where("uId", "==", params.userId)
    .where("status", "==", "completed")
    .where("sourceFingerprint", "==", params.fingerprint)
    .orderBy("completedAt", "desc")
    .limit(50)
    .get();

  if (snapshot.empty) return null;

  const cutoff = Date.now() - OWNER_UPLOAD_COMPLETED_REUSE_WINDOW_MS;
  const matches = snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() || {} }))
    .filter((job) => {
      const completedAt = getJobTimestampMillis(job.data.completedAt || job.data.updatedAt);
      const destinationType = job.data.destinationType || job.data.destination?.type;
      const projectChangedAfterExtraction = completedAt !== null &&
        typeof params.projectLastUpdatedAtMillis === "number" &&
        params.projectLastUpdatedAtMillis > completedAt + 2 * 60 * 1000;
      return job.data.source === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD &&
        job.data.sourceFingerprint === params.fingerprint &&
        job.data.skipProjectSave !== true &&
        destinationType === "project" &&
        job.data.isFirstExtraction === true &&
        !projectChangedAfterExtraction &&
        completedAt !== null &&
        completedAt >= cutoff;
    })
    .sort((left, right) => {
      const leftTime = getJobTimestampMillis(left.data.completedAt || left.data.updatedAt) || 0;
      const rightTime = getJobTimestampMillis(right.data.completedAt || right.data.updatedAt) || 0;
      return rightTime - leftTime;
    });

  return matches[0] || null;
}

async function loadRetryContext(params: {
  ids: { sId: string; tId: string; uId: string };
  projectId: string;
  retriedFromJobId: string;
}): Promise<RetryContext> {
  const retriedFromJobId = requireMenuExtractionRetryJobId(params.retriedFromJobId);
  const retryDoc = await firestoreAdmin
    .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
    .doc(retriedFromJobId)
    .get();

  if (!retryDoc.exists) {
    throw new MenuIntakeIdentityServerError(404, "Original extraction job not found.");
  }

  const retryData = retryDoc.data() || {};
  if (retryData.status !== "failed") {
    throw new MenuIntakeIdentityServerError(400, "Only failed extraction jobs can be retried.");
  }

  if (retryData.error?.retryable === false) {
    throw new MenuIntakeIdentityServerError(400, "This extraction job cannot be retried.");
  }

  if (
    String(retryData.projectId || "") !== params.projectId ||
    String(retryData.tId || "") !== params.ids.tId ||
    String(retryData.sId || "") !== params.ids.sId ||
    String(retryData.uId || "") !== params.ids.uId
  ) {
    throw new MenuIntakeIdentityServerError(403, "Original extraction job does not belong to this menu.");
  }

  const retryFilesResult = JobFilesSchema.safeParse(retryData.files);
  if (!retryFilesResult.success) {
    throw new MenuIntakeIdentityServerError(400, "Original extraction files are no longer available.");
  }
  const retryFiles: MenuIntakeFileInput[] = retryFilesResult.data.map((file) => ({
    uid: String(file.uid),
    name: String(file.name),
    size: Number(file.size),
    type: String(file.type),
    url: String(file.url),
  }));

  return {
    files: retryFiles,
    forceReview: retryData.forceReview === true,
    source: normalizeProjectJobSource(retryData.source),
    sourceMetadata: retryData.sourceMetadata && typeof retryData.sourceMetadata === "object"
      ? retryData.sourceMetadata
      : undefined,
  };
}

export const POST = withAuth(async (request: NextRequest, session) => {
  const safeModeResponse = await checkSafeMode();
  if (safeModeResponse) return safeModeResponse;

  const ids = {
    tId: String(session.tId || ""),
    sId: String(session.sId || ""),
    uId: String(session.uId || session.user?.id || ""),
  };

  if (!verifyTenantAccess(session, ids.tId, ids.sId, request)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const userRateLimitHash = hashPublicRateLimitValue(ids.uId);
  const tenantRateLimitHash = hashPublicRateLimitValue(ids.tId);
  const storeRateLimitHash = hashPublicRateLimitValue(ids.sId);
  const parseGate = await checkRateLimit({
    key: `menu-extraction-job-request:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
    ...getRateLimitForFeature("FILE_UPLOAD"),
  });
  if (!parseGate.allowed) {
    const waitSeconds = Math.max(1, Math.ceil((parseGate.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { success: false, error: "Too many upload requests. Please wait before trying again.", retryAfter: waitSeconds },
      { status: 429, headers: { "Retry-After": String(waitSeconds) } },
    );
  }

  const bodyResult = await readBoundedJsonBody(request, MENU_EXTRACTION_JOB_MAX_BODY_BYTES);
  if (bodyResult.ok === false) return bodyResult.response;

  const validation = RequestSchema.safeParse(bodyResult.data);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Check the uploaded menu files.", details: getSafeZodValidationDetails(validation.error) },
      { status: 400 },
    );
  }

  const { projectId } = validation.data;
  const projectIds = parseProjectIds(projectId);
  if (!projectIds || projectIds.tId !== ids.tId || projectIds.sId !== ids.sId) {
    return NextResponse.json({ success: false, error: "Menu does not belong to this store." }, { status: 403 });
  }

  const permissionResponse = await requireAnyStorePermission(
    request,
    session,
    [PERMISSIONS.USE_MENU_EXTRACTION],
    "Menu extraction",
  );
  if (permissionResponse) return permissionResponse;

  let retryContext: RetryContext | null = null;
  if (validation.data.retriedFromJobId) {
    try {
      retryContext = await loadRetryContext({
        ids,
        projectId,
        retriedFromJobId: validation.data.retriedFromJobId,
      });
    } catch (error) {
      if (error instanceof MenuIntakeIdentityServerError) {
        return NextResponse.json({ success: false, error: error.clientMessage }, { status: error.status });
      }
      throw error;
    }
  }

  const jobSource = retryContext?.source || MENU_EXTRACTION_SOURCES.OWNER_UPLOAD;
  const requestedFiles: MenuIntakeFileInput[] = (retryContext?.files || validation.data.files).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
    uid: file.uid,
    url: file.url,
  }));
  const unsupportedFile = requestedFiles.find((file) => !isSupportedExtractionMimeType(file.type, jobSource));
  if (unsupportedFile) {
    return NextResponse.json(
      { success: false, error: "Unsupported file type. Upload menu images or PDFs only." },
      { status: 400 },
    );
  }

  const disallowedUrl = requestedFiles.find((file) => jobSource === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
    ? !isAllowedMenuLinkImportUrl(file.url, ids, projectId)
    : !isAllowedProjectUploadUrl(file.url, ids));
  if (disallowedUrl) {
    return NextResponse.json({ success: false, error: "Upload the menu file again." }, { status: 400 });
  }

  try {
    const projectRef = firestoreAdmin
      .collection(DB_COLLECTIONS.PROJECTS)
      .doc(ids.tId)
      .collection(ids.sId)
      .doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      return NextResponse.json({ success: false, error: "Menu not found." }, { status: 404 });
    }
    const projectData = projectDoc.data() || {};
    const trustedBusinessContext = getTrustedBusinessContext(projectData, validation.data);
    const projectLastUpdatedAtMillis = getJobTimestampMillis(
      projectData.lastUpdated || projectData.updatedAt || projectData.lastUpdatedAt,
    );

    const existingJob = await findExistingActiveJob(projectId, ids.uId);
    if (existingJob) {
      if (!validation.data.retriedFromJobId && jobSource === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD) {
        await deleteUnreferencedOwnerUploadFiles({
          files: requestedFiles,
          ids,
          reason: "active_job_reuse",
          reusedJobData: existingJob.data,
        });
      }
      return NextResponse.json({
        success: true,
        jobId: existingJob.id,
        projectId,
        reusedExistingJob: true,
      });
    }

    const targetLanguages = normalizeTargetLanguages(validation.data.targetLanguages as Array<{ code: string; name: string }>);
    let ownerUploadFingerprint = !validation.data.retriedFromJobId &&
      jobSource === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD &&
      validation.data.forceReview !== true
      ? await buildOwnerUploadSourceFingerprint({
        businessCategory: trustedBusinessContext.businessCategory,
        businessType: trustedBusinessContext.businessType,
        files: requestedFiles,
        ids,
        targetLanguages,
      })
      : null;

    if (ownerUploadFingerprint) {
      const reusableCompletedJob = await findReusableCompletedOwnerJob({
        fingerprint: ownerUploadFingerprint.fingerprint,
        projectLastUpdatedAtMillis,
        projectId,
        userId: ids.uId,
      });

      if (reusableCompletedJob) {
        await deleteUnreferencedOwnerUploadFiles({
          files: requestedFiles,
          ids,
          reason: "completed_job_reuse",
          reusedJobData: reusableCompletedJob.data,
        });
        logMenuProcessingDiagnostic("menu_extraction_reusing_completed_owner_upload_job", {
          ...getMenuExtractionJobRouteLogContext({
            jobId: reusableCompletedJob.id,
            projectId,
            sId: ids.sId,
            tId: ids.tId,
            uId: ids.uId,
          }),
          fileCount: requestedFiles.length,
        });
        return NextResponse.json({
          success: true,
          jobId: reusableCompletedJob.id,
          projectId,
          reusedCompletedJob: true,
          status: "completed",
        });
      }
    }

    const documentSizeGate = getProjectedProjectDocumentSize(projectData, requestedFiles.length);
    if (documentSizeGate.projectedBytes > documentSizeGate.limitBytes) {
      if (!validation.data.retriedFromJobId && jobSource === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD) {
        await deleteUnreferencedOwnerUploadFiles({
          files: requestedFiles,
          ids,
          reason: "project_document_size_gate",
        });
      }

      logMenuProcessingDiagnostic("menu_extraction_project_document_size_gate_blocked", {
        ...getMenuExtractionJobRouteLogContext({
          projectId,
          reason: "project_document_size_gate",
          sId: ids.sId,
          tId: ids.tId,
          uId: ids.uId,
        }),
        currentBytes: documentSizeGate.currentBytes,
        fileCount: requestedFiles.length,
        limitBytes: documentSizeGate.limitBytes,
        projectedBytes: documentSizeGate.projectedBytes,
        reservedHeadroomBytes: documentSizeGate.reservedHeadroomBytes,
      });

      return NextResponse.json(
        { success: false, error: MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_ERROR },
        { status: 413 },
      );
    }

    const rateLimit = await checkRateLimit({
      key: `menu-extraction-job:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
      ...getRateLimitForFeature("AI_EXPENSIVE"),
    });
    if (!rateLimit.allowed) {
      const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { success: false, error: "Too many extraction attempts. Please wait before trying again.", retryAfter: waitSeconds },
        { status: 429, headers: { "Retry-After": String(waitSeconds) } },
      );
    }

    let filesForJob = requestedFiles as MenuIntakeFileInput[];
    let identityCheck: any = null;

    if (FEATURE_FLAGS.ENABLE_MENU_INTAKE_IDENTITY && jobSource === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD) {
      identityCheck = await runMenuIntakeIdentityCheck({
        files: filesForJob,
        projectId,
        session,
        sId: ids.sId,
        tId: ids.tId,
      });

      const validIndexes = new Set(
        identityCheck?.validation?.validMenuFileIndexes || filesForJob.map((_, index) => index + 1),
      );
      filesForJob = filesForJob.filter((_, index) => validIndexes.has(index + 1));

      if (filesForJob.length === 0 || identityCheck?.decision?.severity === "block") {
        return NextResponse.json(
          {
            success: false,
            error: identityCheck?.decision?.message || "We could not find a clear menu or price list in this upload.",
            identityCheck,
          },
          { status: 422 },
        );
      }

      if (identityCheck?.decision?.severity && identityCheck.decision.severity !== "none" && validation.data.identityOverrideConfirmed !== true) {
        return NextResponse.json(
          {
            success: false,
            error: identityCheck.decision.message,
            identityCheck,
            requiresConfirmation: true,
          },
          { status: 409 },
        );
      }
    }

    if (ownerUploadFingerprint && filesForJob.length !== requestedFiles.length) {
      ownerUploadFingerprint = await buildOwnerUploadSourceFingerprint({
        businessCategory: trustedBusinessContext.businessCategory,
        businessType: trustedBusinessContext.businessType,
        files: filesForJob,
        ids,
        targetLanguages,
      });
    }

    const now = Timestamp.now();
    const sourceMetadata = {
      ...(retryContext?.sourceMetadata || {}),
      ...(ownerUploadFingerprint ? {
        ownerUploadFingerprint: {
          fileCount: ownerUploadFingerprint.fileFingerprints.length,
          files: ownerUploadFingerprint.fileFingerprints,
          fingerprint: ownerUploadFingerprint.fingerprint,
          targetLanguageCodes: ownerUploadFingerprint.targetLanguageCodes,
          version: ownerUploadFingerprint.version,
        },
      } : {}),
      ...(identityCheck ? {
        identityCheck: {
          analyzedFileCount: identityCheck.analyzedFileCount,
          decision: identityCheck.decision,
          degraded: identityCheck.degraded === true,
          identity: identityCheck.identity,
          validation: identityCheck.validation,
        },
      } : {}),
    };

    const jobData = {
      action: AI_ACTIONS_TYPES.IMAGE_PROCESSING,
      createdAt: now,
      currentStep: "Queued",
      ...buildMenuExtractionRoutingFields(buildProjectMenuExtractionDestination(
        projectId,
        validation.data.forceReview || retryContext?.forceReview ? "review" : "auto_or_review",
      )),
      files: filesForJob.map((file) => ({
        uid: file.uid,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
      })),
      forceReview: validation.data.forceReview === true || retryContext?.forceReview === true,
      jobMode: validation.data.jobMode || "SINGLE_STORE",
      progress: 0,
      projectId,
      ...trustedBusinessContext,
      ...(validation.data.retriedFromJobId ? { retriedFromJobId: validation.data.retriedFromJobId } : {}),
      ...(validation.data.retryCount != null ? { retryCount: validation.data.retryCount } : {}),
      sId: ids.sId,
      source: jobSource,
      ...(ownerUploadFingerprint ? {
        sourceFingerprint: ownerUploadFingerprint.fingerprint,
        sourceFingerprintVersion: ownerUploadFingerprint.version,
      } : {}),
      ...(Object.keys(sourceMetadata).length > 0 ? { sourceMetadata } : {}),
      status: "pending",
      tId: ids.tId,
      targetLanguages,
      uId: ids.uId,
      updatedAt: now,
    };
    const jobCreation = await createOrReuseActiveMenuExtractionJob({
      db: firestoreAdmin,
      jobData,
      projectId,
    });

    if (!jobCreation.created) {
      if (!validation.data.retriedFromJobId && jobSource === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD) {
        await deleteUnreferencedOwnerUploadFiles({
          files: requestedFiles,
          ids,
          reason: "concurrent_active_job_reuse",
          reusedJobData: jobCreation.match.data,
        });
      }
      if (String(jobCreation.match.data.uId || "") !== ids.uId) {
        return NextResponse.json(
          { success: false, error: "Another menu extraction is already running." },
          { status: 409 },
        );
      }
      return NextResponse.json({
        success: true,
        jobId: jobCreation.match.id,
        projectId,
        reusedExistingJob: true,
      });
    }

    if (!validation.data.retriedFromJobId && jobSource === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD) {
      const acceptedUids = new Set(filesForJob.map((file) => file.uid));
      const excludedFiles = requestedFiles.filter((file) => !acceptedUids.has(file.uid));
      await deleteUnreferencedOwnerUploadFiles({
        files: excludedFiles,
        ids,
        reason: "identity_filtered_files",
      });
    }

    logMenuProcessingDiagnostic("menu_extraction_owner_job_created", {
      ...getMenuExtractionJobRouteLogContext({
        jobId: jobCreation.match.id,
        projectId,
        sId: ids.sId,
        tId: ids.tId,
        uId: ids.uId,
      }),
      filesCount: filesForJob.length,
      targetLanguageCount: targetLanguages.length,
    });

    return NextResponse.json({
      success: true,
      jobId: jobCreation.match.id,
      projectId,
      identityCheck,
    });
  } catch (error) {
    if (error instanceof MenuIntakeIdentityServerError) {
      return NextResponse.json({ success: false, error: error.clientMessage }, { status: error.status });
    }

    logMenuProcessingFailure("menu_extraction_owner_job_creation_failed", error, {
      ...getMenuExtractionJobRouteLogContext({ projectId }),
    });
    return NextResponse.json(
      { success: false, error: "Could not start menu extraction." },
      { status: 500 },
    );
  }
});
