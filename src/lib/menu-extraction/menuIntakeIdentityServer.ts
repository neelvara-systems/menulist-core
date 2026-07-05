import { GEMINI_MODELS } from "@constant/AI/models";
import { AI_ACTIONS_TYPES } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import {
  buildMenuIntakeAnalysis,
  buildMenuIntakeIdentityPrompt,
  MenuIntakeAnalysisResult,
  MenuIntakeContext,
  MenuIntakeFileInput,
  RawMenuIntakeIdentityResult,
} from "@data/shared/menuIntakeIdentity";
import {
  MENU_EXTRACTION_JOB_LIMITS,
  MENU_LINK_IMPORT_TEXT_MIME_TYPES,
  OWNER_MENU_UPLOAD_MIME_TYPES,
} from "@data/shared/menuExtractionJob";
import { recordAiOperation, recordAiOperationForSession } from "@lib/ai/operationLog";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import {
  getBoundedMenuProcessingStringContext,
  getMenuProcessingProjectLogContext,
  logMenuProcessingDiagnostic,
  logMenuProcessingFailure,
} from "@lib/firebase/menuProcessingDiagnostics";
import { genAIClient } from "@lib/google/genAi";
import { readResponseUint8ArrayWithLimit } from "@lib/security/boundedResponseBody";
import { validateServerNetworkTargetUrl } from "@lib/security/serverNetworkTarget";

export const MAX_MENU_INTAKE_PREFLIGHT_FILES = 8;
export const MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE = MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES;

const SUPPORTED_MIME_TYPES = new Set<string>(OWNER_MENU_UPLOAD_MIME_TYPES);
const SUPPORTED_TEXT_MIME_TYPES = new Set<string>(MENU_LINK_IMPORT_TEXT_MIME_TYPES);
const MAX_MENU_INTAKE_TEXT_CHARS = 60_000;
const MENU_INTAKE_IDENTITY_MODEL = GEMINI_MODELS.TEXT_GEN;
const MAX_MENU_INTAKE_IDENTITY_PARSE_DIAGNOSTICS = 25;

const reportedMenuIntakeIdentityParseFailures = new Set<string>();

type MenuIntakeOperationContext = {
  billingMode?: "free" | "internal" | "public";
  projectId?: string | null;
  sId?: string | number;
  session?: any;
  source?: string;
  tId?: string | number;
  uId?: string;
};

const getMenuIntakeOperationLogContext = (operation?: MenuIntakeOperationContext) => ({
  ...getMenuProcessingProjectLogContext(operation?.projectId),
  ...getBoundedMenuProcessingStringContext("tenantId", operation?.tId),
  ...getBoundedMenuProcessingStringContext("storeId", operation?.sId),
  ...getBoundedMenuProcessingStringContext("userId", operation?.uId),
  ...getBoundedMenuProcessingStringContext("source", operation?.source),
  ...getBoundedMenuProcessingStringContext("billingMode", operation?.billingMode),
});

const getMenuIntakeFileLogContext = (
  file: MenuIntakeFileInput,
  index: number,
  operation?: MenuIntakeOperationContext,
) => ({
  ...getMenuIntakeOperationLogContext(operation),
  ...getBoundedMenuProcessingStringContext("fileType", file.type),
  fallbackPolicy: "skip_file",
  fileIndex: index,
  fileSizeBytes: Number.isFinite(Number(file.size)) ? Math.max(0, Math.trunc(Number(file.size))) : 0,
});

export type MenuIntakeIdentityServerResult = MenuIntakeAnalysisResult & {
  analyzedFileCount: number;
  degraded?: boolean;
};

export class MenuIntakeIdentityServerError extends Error {
  constructor(
    readonly status: number,
    readonly clientMessage: string,
  ) {
    super(clientMessage);
    this.name = "MenuIntakeIdentityServerError";
  }
}

export function isSupportedMenuIntakeMimeType(type: string): boolean {
  return SUPPORTED_MIME_TYPES.has(type);
}

export function isSupportedMenuIntakeIdentityMimeType(type: string): boolean {
  return SUPPORTED_MIME_TYPES.has(type) || SUPPORTED_TEXT_MIME_TYPES.has(type);
}

function getProjectStorageBucketFallback(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.GCLOUD_PROJECT
    || process.env.GCP_PROJECT
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `${projectId}.appspot.com` : "";
}

export function getAllowedStorageBucket(): string {
  return process.env.FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || getProjectStorageBucketFallback();
}

export function isAllowedUploadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) return true;
    if (url.protocol !== "https:") return false;

    const allowedBucket = getAllowedStorageBucket();
    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o(?:\/|$)/);
      return decodeURIComponent(match?.[1] || "") === allowedBucket;
    }

    if (url.hostname === "storage.googleapis.com") {
      const bucket = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] || "");
      return bucket === allowedBucket;
    }

    return process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function getStoragePathFromUploadUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      return "local-dev";
    }
    if (url.protocol !== "https:") return null;

    const allowedBucket = getAllowedStorageBucket();
    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
      if (decodeURIComponent(match?.[1] || "") !== allowedBucket) return null;
      return match?.[2] ? decodeURIComponent(match[2]) : null;
    }

    if (url.hostname === "storage.googleapis.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const bucket = decodeURIComponent(parts[0] || "");
      if (bucket !== allowedBucket) return null;
      return parts.length >= 2 ? decodeURIComponent(parts.slice(1).join("/")) : null;
    }

    return null;
  } catch {
    return null;
  }
}

function isAllowedMenuIntakeStoragePath(
  storagePath: string,
  operation?: MenuIntakeOperationContext,
): boolean {
  if (storagePath === "local-dev") return process.env.NODE_ENV !== "production";

  if (operation?.billingMode === "public" && operation.projectId) {
    const projectId = String(operation.projectId);
    const match = projectId.match(/^([^-]+)-public-(.+)-([^-]+)$/);
    const draftToken = match?.[2] || "";
    return Boolean(draftToken) && storagePath.startsWith(`publicMenuDrafts/${draftToken}/`);
  }

  const tId = operation?.tId === undefined || operation?.tId === null ? "" : String(operation.tId);
  const sId = operation?.sId === undefined || operation?.sId === null ? "" : String(operation.sId);
  return Boolean(tId && sId) && storagePath.startsWith(`projects/files/${tId}/${sId}/`);
}

async function resolveValidatedMenuIntakeFetchUrl(
  file: MenuIntakeFileInput,
  operation?: MenuIntakeOperationContext,
): Promise<string | null> {
  if (!isAllowedUploadUrl(file.url)) return null;

  const storagePath = getStoragePathFromUploadUrl(file.url);
  if (!storagePath || !isAllowedMenuIntakeStoragePath(storagePath, operation)) return null;

  const targetValidation = await validateServerNetworkTargetUrl(file.url, {
    allowLocalhostInDevelopment: true,
    allowedProtocols: process.env.NODE_ENV !== "production" ? ["https:", "http:"] : ["https:"],
  });
  if (!targetValidation.valid || !targetValidation.normalizedUrl) return null;

  return targetValidation.normalizedUrl;
}

function resolveContextText(value: any): string | null {
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized || null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const preferred = value.en || value[Object.keys(value)[0]];
    return resolveContextText(preferred);
  }

  return null;
}

function buildAddress(storeData: any): string | null {
  const parts = [
    storeData?.addressLine,
    storeData?.area,
    storeData?.city,
    storeData?.state,
    storeData?.country,
  ].filter((part) => typeof part === "string" && part.trim().length > 0);

  return parts.length ? parts.join(", ") : null;
}

function hasExistingMenu(projectData: any): boolean {
  const files = Array.isArray(projectData?.files) ? projectData.files : [];
  return files.some((file: any) => {
    const categories = file?.extractedData?.data?.categories;
    const items = file?.extractedData?.data?.items;
    return (Array.isArray(categories) && categories.length > 0) ||
      (Array.isArray(items) && items.length > 0);
  });
}

function extractExistingCategoryNames(projectData: any): string[] {
  const files = Array.isArray(projectData?.files) ? projectData.files : [];
  const names = new Set<string>();

  for (const file of files) {
    const categories = file?.extractedData?.data?.categories;
    if (!Array.isArray(categories)) continue;

    for (const category of categories) {
      const name = resolveContextText(category?.name || category?.categoryName || category?.title);
      if (name) names.add(name);
      if (names.size >= 24) return Array.from(names);
    }
  }

  return Array.from(names);
}

function logMenuIntakeIdentityParseFailure(
  error: unknown,
  context: {
    candidateLength: number;
    hasFence: boolean;
    hasObjectFragment: boolean;
    operation?: MenuIntakeOperationContext;
    stage: "full_response" | "object_fragment" | "object_fragment_missing";
    textLength: number;
    trimmedTextLength: number;
  },
): void {
  const failureKey = [
    context.stage,
    context.textLength,
    context.trimmedTextLength,
    context.candidateLength,
    context.hasFence ? "fenced" : "unfenced",
    context.hasObjectFragment ? "object-fragment" : "no-object-fragment",
  ].join(":");

  if (reportedMenuIntakeIdentityParseFailures.has(failureKey)) return;
  if (reportedMenuIntakeIdentityParseFailures.size >= MAX_MENU_INTAKE_IDENTITY_PARSE_DIAGNOSTICS) return;
  reportedMenuIntakeIdentityParseFailures.add(failureKey);

  logMenuProcessingFailure("menu_intake_identity_provider_response_parse_failed", error, {
    ...getMenuIntakeOperationLogContext(context.operation),
    ...getBoundedMenuProcessingStringContext("parseStage", context.stage),
    candidateLength: context.candidateLength,
    fallbackPolicy: "use_low_confidence_identity_fallback",
    hasFence: context.hasFence,
    hasObjectFragment: context.hasObjectFragment,
    textLength: context.textLength,
    trimmedTextLength: context.trimmedTextLength,
  });
}

function safeJsonParse(
  text: string,
  operation?: MenuIntakeOperationContext,
): RawMenuIntakeIdentityResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      logMenuIntakeIdentityParseFailure(error, {
        candidateLength: candidate.length,
        hasFence: Boolean(fenced),
        hasObjectFragment: false,
        operation,
        stage: "object_fragment_missing",
        textLength: text.length,
        trimmedTextLength: trimmed.length,
      });
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch (fragmentError) {
      logMenuIntakeIdentityParseFailure(fragmentError, {
        candidateLength: candidate.length,
        hasFence: Boolean(fenced),
        hasObjectFragment: true,
        operation,
        stage: "object_fragment",
        textLength: text.length,
        trimmedTextLength: trimmed.length,
      });
      return null;
    }
  }
}

async function buildGeminiParts(
  files: MenuIntakeFileInput[],
  context: MenuIntakeContext,
  operation?: MenuIntakeOperationContext,
) {
  const selectedFiles = files.slice(0, MAX_MENU_INTAKE_PREFLIGHT_FILES);
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: buildMenuIntakeIdentityPrompt(selectedFiles.length, context) },
  ];
  let readableFileCount = 0;

  for (let index = 0; index < selectedFiles.length; index += 1) {
    const file = selectedFiles[index];
    try {
      const fileFetchUrl = await resolveValidatedMenuIntakeFetchUrl(file, operation);
      if (!fileFetchUrl) continue;
      const response = await fetch(fileFetchUrl, { redirect: "manual" });
      if (!response.ok) continue;
      const responseBytes = await readResponseUint8ArrayWithLimit(response, MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE);
      const buffer = Buffer.from(responseBytes);
      readableFileCount += 1;
      parts.push({ text: `File ${index + 1}: ${file.name}` });
      if (SUPPORTED_TEXT_MIME_TYPES.has(file.type)) {
        parts.push({ text: buffer.toString("utf8").slice(0, MAX_MENU_INTAKE_TEXT_CHARS) });
      } else {
        parts.push({
          inlineData: {
            mimeType: file.type || "image/jpeg",
            data: buffer.toString("base64"),
          },
        });
      }
    } catch (error) {
      logMenuProcessingFailure(
        "menu_intake_identity_preflight_file_unreadable",
        error,
        getMenuIntakeFileLogContext(file, index, operation),
      );
      // Skip unreadable file in preflight. Full extraction will still surface
      // file-specific failures if the owner continues.
    }
  }

  return { parts, analyzedFileCount: selectedFiles.length, readableFileCount };
}

function fallbackRaw(filesCount: number): RawMenuIntakeIdentityResult {
  return {
    valid_menu_files: Array.from({ length: filesCount }, (_, index) => index + 1),
    invalid_files: [],
    non_menu_reasons: [],
    quality_issues: [],
    menu_completeness: "likely_complete",
    empty_extraction_risk: false,
    confidence: "low",
    summary: "Upload checked.",
    extracted_business_info: {
      business_name: null,
      phone_number: null,
      address: null,
      confidence: "low",
    },
    detected_business_type: {
      business_type: null,
      business_category: null,
      type_confidence: "low",
    },
    currency_hint: null,
    languages: [],
    owner_intent: {
      likely_intent: "unknown",
      confidence: "low",
      reasons: [],
    },
    truth_risk: {
      level: "low",
      reasons: [],
    },
    menu_structure: {
      assessment: "unknown",
      confidence: "low",
      summary: null,
    },
    suggestion_fields: [],
  };
}

export async function loadMenuIntakeContext(params: {
  projectId: string;
  sId: string;
  tId: string;
}): Promise<{ context: MenuIntakeContext; projectData: any; storeData: any }> {
  const projectRef = firestoreAdmin
    .collection(`${DB_COLLECTIONS.PROJECTS}/${params.tId}/${params.sId}`)
    .doc(params.projectId);
  const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(params.sId));
  const [projectDoc, storeDoc] = await Promise.all([projectRef.get(), storeRef.get()]);

  if (!projectDoc.exists) {
    throw new MenuIntakeIdentityServerError(404, "Project not found");
  }

  const projectData = projectDoc.data() || null;
  const storeData = storeDoc.exists ? storeDoc.data() : null;

  return {
    context: {
      projectName: resolveContextText(projectData?.name),
      storeName: getStoreContextName(storeData, resolveContextText(storeData?.name) || "Store"),
      storePhone: storeData?.phoneNumber || storeData?.phone || null,
      storeAddress: buildAddress(storeData),
      storeBusinessType: resolveContextText(storeData?.businessType),
      hasExistingMenu: hasExistingMenu(projectData),
      existingCategoryNames: extractExistingCategoryNames(projectData),
    },
    projectData,
    storeData,
  };
}

export async function analyzeMenuIntakeIdentity(params: {
  context?: MenuIntakeContext;
  files: MenuIntakeFileInput[];
  operation?: MenuIntakeOperationContext;
}): Promise<MenuIntakeIdentityServerResult> {
  const context = params.context || { hasExistingMenu: false };
  try {
    const { parts, analyzedFileCount, readableFileCount } = await buildGeminiParts(params.files, context, params.operation);
    const operationStart = Date.now();
    const geminiResult = readableFileCount > 0
      ? await genAIClient.models.generateContent({
        model: MENU_INTAKE_IDENTITY_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      })
      : null;
    const raw = geminiResult ? safeJsonParse(geminiResult?.text || "", params.operation) : null;
    const analysis = buildMenuIntakeAnalysis(raw || fallbackRaw(analyzedFileCount), analyzedFileCount, context);

    if (geminiResult) {
      const operationInput = {
        action: AI_ACTIONS_TYPES.MENU_INTAKE_IDENTITY,
        billingMode: params.operation?.billingMode || "free",
        clientResponse: {
          analyzedFileCount,
          fileCount: params.files.length,
          readableFileCount,
          severity: analysis.decision.severity,
        },
        geminiResponse: geminiResult,
        model: MENU_INTAKE_IDENTITY_MODEL,
        processingTime: Date.now() - operationStart,
        projectId: params.operation?.projectId || null,
        source: params.operation?.source || "menu_intake_identity",
        ...(params.operation?.sId != null ? { sId: params.operation.sId } : {}),
        ...(params.operation?.tId != null ? { tId: params.operation.tId } : {}),
        ...(params.operation?.uId ? { uId: params.operation.uId } : {}),
      };
      const operationLogger = params.operation?.session
        ? recordAiOperationForSession(params.operation.session, operationInput)
        : recordAiOperation(operationInput);
      operationLogger.catch((error) => {
        logMenuProcessingFailure("menu_intake_identity_operation_log_failed", error, {
          ...getMenuIntakeOperationLogContext(params.operation),
          fileCount: params.files.length,
          analyzedFileCount,
          readableFileCount,
        });
      });
    }

    logMenuProcessingDiagnostic("menu_intake_identity_preflight_completed", {
      ...getMenuIntakeOperationLogContext(params.operation),
      fileCount: params.files.length,
      analyzedFileCount,
      readableFileCount,
      severity: analysis.decision.severity,
      reasonCount: analysis.decision.reasons.length,
    });

    return {
      ...analysis,
      analyzedFileCount,
    };
  } catch (error) {
    logMenuProcessingFailure("menu_intake_identity_preflight_failed", error, {
      ...getMenuIntakeOperationLogContext(params.operation),
      fileCount: params.files.length,
    });

    const analyzedFileCount = Math.min(params.files.length, MAX_MENU_INTAKE_PREFLIGHT_FILES);
    const fallback = buildMenuIntakeAnalysis(fallbackRaw(analyzedFileCount), analyzedFileCount, {
      hasExistingMenu: false,
    });

    return {
      ...fallback,
      analyzedFileCount,
      degraded: true,
    };
  }
}

export async function runMenuIntakeIdentityCheck(params: {
  files: MenuIntakeFileInput[];
  projectId: string;
  session: any;
  sId: string;
  tId: string;
}): Promise<MenuIntakeIdentityServerResult> {
  const { context } = await loadMenuIntakeContext({
    projectId: params.projectId,
    sId: params.sId,
    tId: params.tId,
  });

  return analyzeMenuIntakeIdentity({
    context,
    files: params.files,
    operation: {
      projectId: params.projectId,
      session: params.session,
      sId: params.sId,
      source: "menu_intake_identity",
      tId: params.tId,
      uId: String(params.session?.uId || params.session?.user?.id || ""),
    },
  });
}
