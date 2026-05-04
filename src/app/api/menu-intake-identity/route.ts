import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import {
  buildMenuIntakeAnalysis,
  buildMenuIntakeIdentityPrompt,
  MenuIntakeContext,
  MenuIntakeFileInput,
  RawMenuIntakeIdentityResult,
} from "@data/shared/menuIntakeIdentity";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { genAIClient } from "@lib/google/genAi";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { secureError, secureLog } from "@lib/security/secureLogger";
import { NextRequest, NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "src/middleware/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_PREFLIGHT_FILES = 8;
const MAX_PREFLIGHT_FILE_SIZE = 30 * 1024 * 1024;
const DEFAULT_STORAGE_BUCKET = "ecomsai.appspot.com";
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const IntakeFileSchema = z.object({
  uid: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  size: z.number().min(0).max(MAX_PREFLIGHT_FILE_SIZE),
  type: z.string().min(1).max(120),
  url: z.string().min(1).max(4000),
});

const IntakeRequestSchema = z.object({
  projectId: z.string().min(3).max(160),
  files: z.array(IntakeFileSchema).min(1).max(50),
});

function isSupportedMimeType(type: string): boolean {
  return SUPPORTED_MIME_TYPES.has(type);
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

function safeJsonParse(text: string): RawMenuIntakeIdentityResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function getAllowedStorageBucket(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
}

function isAllowedUploadUrl(value: string): boolean {
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

async function buildGeminiParts(files: MenuIntakeFileInput[], context: MenuIntakeContext) {
  const selectedFiles = files.slice(0, MAX_PREFLIGHT_FILES);
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: buildMenuIntakeIdentityPrompt(selectedFiles.length, context) },
  ];
  let readableFileCount = 0;

  for (let index = 0; index < selectedFiles.length; index += 1) {
    const file = selectedFiles[index];
    try {
      if (!isAllowedUploadUrl(file.url)) continue;
      const response = await fetch(file.url);
      if (!response.ok) continue;
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_PREFLIGHT_FILE_SIZE) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_PREFLIGHT_FILE_SIZE) continue;
      readableFileCount += 1;
      parts.push({ text: `File ${index + 1}: ${file.name}` });
      parts.push({
        inlineData: {
          mimeType: file.type || "image/jpeg",
          data: buffer.toString("base64"),
        },
      });
    } catch {
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

export const POST = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_MENU_INTAKE_IDENTITY) {
    return NextResponse.json({
      skipped: true,
      reason: "feature_disabled",
    });
  }

  const { checkSafeMode } = await import("@lib/ops/safeMode");
  const safeModeResponse = await checkSafeMode();
  if (safeModeResponse) return safeModeResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = IntakeRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.flatten() },
      { status: 400 },
    );
  }

  const { projectId } = validation.data;
  const files = validation.data.files as MenuIntakeFileInput[];
  const unsupportedFile = files.find((file) => !isSupportedMimeType(file.type));
  if (unsupportedFile) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload menu images or PDFs only." },
      { status: 400 },
    );
  }

  const ids = { tId: String(session.tId || ""), sId: String(session.sId || "") };

  if (!verifyTenantAccess(session, ids.tId, ids.sId, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimitConfig = getRateLimitForFeature("AI_OPERATION");
  const rateLimit = await checkRateLimit({
    key: `menu-intake:${session.uId || session.user?.id}:${ids.tId}:${ids.sId}`,
    ...rateLimitConfig,
  });
  if (!rateLimit.allowed) {
    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many checks. Please wait before trying again.", retryAfter: waitSeconds },
      { status: 429, headers: { "Retry-After": String(waitSeconds) } },
    );
  }

  try {
    const db = (await import("@lib/firebase/firebaseAdmin")).admin.firestore();
    const projectRef = db.collection(`${DB_COLLECTIONS.PROJECTS}/${ids.tId}/${ids.sId}`).doc(projectId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(ids.sId));
    const [projectDoc, storeDoc] = await Promise.all([projectRef.get(), storeRef.get()]);
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.exists ? projectDoc.data() : null;
    const storeData = storeDoc.exists ? storeDoc.data() : null;

    const context: MenuIntakeContext = {
      projectName: resolveContextText(projectData?.name),
      storeName: getStoreContextName(storeData, resolveContextText(storeData?.name) || "Store"),
      storePhone: storeData?.phoneNumber || storeData?.phone || null,
      storeAddress: buildAddress(storeData),
      storeBusinessType: resolveContextText(storeData?.businessType),
      hasExistingMenu: hasExistingMenu(projectData),
      existingCategoryNames: extractExistingCategoryNames(projectData),
    };

    const { parts, analyzedFileCount, readableFileCount } = await buildGeminiParts(files, context);
    const raw = readableFileCount > 0
      ? await genAIClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }).then((result: any) => safeJsonParse(result?.text || ""))
      : null;

    const analysis = buildMenuIntakeAnalysis(raw || fallbackRaw(analyzedFileCount), analyzedFileCount, context);

    secureLog("[MenuIntakeIdentity] Preflight completed", {
      projectId,
      fileCount: files.length,
      analyzedFileCount,
      severity: analysis.decision.severity,
      reasons: analysis.decision.reasons,
    });

    return NextResponse.json({
      ...analysis,
      analyzedFileCount,
    });
  } catch (error) {
    secureError("[MenuIntakeIdentity] Preflight failed", error as Error, {
      projectId,
      fileCount: files.length,
    });

    const analyzedFileCount = Math.min(files.length, MAX_PREFLIGHT_FILES);
    const fallback = buildMenuIntakeAnalysis(fallbackRaw(analyzedFileCount), analyzedFileCount, {
      hasExistingMenu: false,
    });

    return NextResponse.json({
      ...fallback,
      analyzedFileCount,
      degraded: true,
    });
  }
});
