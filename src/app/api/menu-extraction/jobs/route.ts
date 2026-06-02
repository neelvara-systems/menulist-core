export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { FEATURE_FLAGS } from "@config/features";
import { AI_ACTIONS_TYPES } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import GlobalLanguagesList from "@data/languages";
import {
  buildMenuExtractionRoutingFields,
  buildProjectMenuExtractionDestination,
  MENU_EXTRACTION_JOB_LIMITS,
  MENU_EXTRACTION_SOURCES,
  MENU_LINK_IMPORT_MIME_TYPES,
  normalizeProjectJobSource,
} from "@data/shared/menuExtractionJob";
import { MenuIntakeFileInput } from "@data/shared/menuIntakeIdentity";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import {
  isAllowedUploadUrl,
  isSupportedMenuIntakeMimeType,
  MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE,
  MenuIntakeIdentityServerError,
  runMenuIntakeIdentityCheck,
} from "@lib/menu-extraction/menuIntakeIdentityServer";
import { checkSafeMode } from "@lib/ops/safeMode";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { secureError, secureLog } from "@lib/security/secureLogger";
import { Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "src/middleware/auth";
import { z } from "zod";

const ACTIVE_JOB_STATUSES = ["pending", "processing", "preview_ready"];
const MENU_LINK_IMPORT_MIME_TYPE_SET = new Set<string>(MENU_LINK_IMPORT_MIME_TYPES);

const JobFileSchema = z.object({
  uid: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  size: z.number().min(0).max(MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE),
  type: z.string().min(1).max(120),
  url: z.string().min(1).max(4000),
});

const TargetLanguageSchema = z.object({
  code: z.string().min(1).max(16),
  name: z.string().min(1).max(80),
});

const RequestSchema = z.object({
  action: z.string().min(1).max(80).optional(),
  businessCategory: z.string().max(80).optional(),
  businessType: z.string().max(80).optional(),
  files: z.array(JobFileSchema).min(1).max(MENU_EXTRACTION_JOB_LIMITS.MAX_FILES),
  forceReview: z.boolean().optional(),
  identityOverrideConfirmed: z.boolean().optional(),
  jobMode: z.enum(["SINGLE_STORE", "MASTER_PROJECT", "OUTLET_LINKED"]).optional(),
  projectId: z.string().min(3).max(160),
  retriedFromJobId: z.string().min(1).max(160).optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  targetLanguages: z.array(TargetLanguageSchema).min(1).max(12),
});

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
  const deduped = Array.from(
    new Map(
      languages
        .map((language) => ({
          code: String(language.code || "").trim().toLowerCase(),
          name: String(language.name || "").trim(),
        }))
        .filter((language) => language.code)
        .map((language) => [
          language.code,
          GlobalLanguagesList.find((known) => known.code === language.code) || language,
        ]),
    ).values(),
  );

  return deduped.length ? deduped : [{ code: "en", name: "English" }];
}

async function findExistingActiveJob(projectId: string, userId: string): Promise<string | null> {
  const snapshot = await firestoreAdmin
    .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
    .where("projectId", "==", projectId)
    .where("uId", "==", userId)
    .where("status", "in", ACTIVE_JOB_STATUSES)
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

  return sorted[0]?.id || null;
}

async function loadRetryContext(params: {
  ids: { sId: string; tId: string; uId: string };
  projectId: string;
  retriedFromJobId: string;
}): Promise<RetryContext> {
  const retryDoc = await firestoreAdmin
    .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
    .doc(params.retriedFromJobId)
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

  const retryFiles = Array.isArray(retryData.files)
    ? retryData.files
      .filter((file: any) => file?.uid && file?.url)
      .map((file: any) => ({
        uid: String(file.uid),
        name: String(file.name || file.uid),
        size: Number(file.size || 0),
        type: String(file.type || "image/jpeg"),
        url: String(file.url),
      }))
    : [];

  if (!retryFiles.length) {
    throw new MenuIntakeIdentityServerError(400, "Original extraction files are no longer available.");
  }

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const validation = RequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Check the uploaded menu files.", details: validation.error.flatten() },
      { status: 400 },
    );
  }

  const ids = {
    tId: String(session.tId || ""),
    sId: String(session.sId || ""),
    uId: String(session.uId || session.user?.id || ""),
  };

  if (!verifyTenantAccess(session, ids.tId, ids.sId, request)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { projectId } = validation.data;
  const projectIds = parseProjectIds(projectId);
  if (!projectIds || projectIds.tId !== ids.tId || projectIds.sId !== ids.sId) {
    return NextResponse.json({ success: false, error: "Menu does not belong to this store." }, { status: 403 });
  }

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
  const requestedFiles = retryContext?.files || validation.data.files;
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

  const rateLimit = await checkRateLimit({
    key: `menu-extraction-job:${ids.uId}:${ids.tId}:${ids.sId}`,
    ...getRateLimitForFeature("AI_EXPENSIVE"),
  });
  if (!rateLimit.allowed) {
    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { success: false, error: "Too many extraction attempts. Please wait before trying again.", retryAfter: waitSeconds },
      { status: 429, headers: { "Retry-After": String(waitSeconds) } },
    );
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

    const existingJobId = await findExistingActiveJob(projectId, ids.uId);
    if (existingJobId) {
      return NextResponse.json({
        success: true,
        jobId: existingJobId,
        projectId,
        reusedExistingJob: true,
      });
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

    const jobRef = firestoreAdmin.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS).doc();
    const now = Timestamp.now();
    const targetLanguages = normalizeTargetLanguages(validation.data.targetLanguages as Array<{ code: string; name: string }>);
    const sourceMetadata = {
      ...(retryContext?.sourceMetadata || {}),
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

    await jobRef.set({
      action: validation.data.action || AI_ACTIONS_TYPES.IMAGE_PROCESSING,
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
      ...(validation.data.businessCategory ? { businessCategory: validation.data.businessCategory } : {}),
      ...(validation.data.businessType ? { businessType: validation.data.businessType } : {}),
      ...(validation.data.retriedFromJobId ? { retriedFromJobId: validation.data.retriedFromJobId } : {}),
      ...(validation.data.retryCount != null ? { retryCount: validation.data.retryCount } : {}),
      sId: ids.sId,
      source: jobSource,
      ...(Object.keys(sourceMetadata).length > 0 ? { sourceMetadata } : {}),
      status: "pending",
      tId: ids.tId,
      targetLanguages,
      uId: ids.uId,
      updatedAt: now,
    });

    secureLog("[MenuExtractionJob] Owner job created", {
      filesCount: filesForJob.length,
      jobId: jobRef.id,
      projectId,
      tenantId: ids.tId,
      storeId: ids.sId,
    });

    return NextResponse.json({
      success: true,
      jobId: jobRef.id,
      projectId,
      identityCheck,
    });
  } catch (error) {
    if (error instanceof MenuIntakeIdentityServerError) {
      return NextResponse.json({ success: false, error: error.clientMessage }, { status: error.status });
    }

    secureError("[MenuExtractionJob] Job creation failed", error as Error, { projectId });
    return NextResponse.json(
      { success: false, error: "Could not start menu extraction." },
      { status: 500 },
    );
  }
});
