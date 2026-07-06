import { FEATURE_FLAGS } from "@config/features";
import { MenuIntakeFileInput } from "@data/shared/menuIntakeIdentity";
import {
  isSupportedMenuIntakeMimeType,
  MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE,
  MenuIntakeIdentityServerError,
  normalizeMenuIntakeScopeDocumentId,
  runMenuIntakeIdentityCheck,
} from "@lib/menu-extraction/menuIntakeIdentityServer";
import { normalizeMenuExtractionProjectId } from "@lib/menu-extraction/projectIdBoundary";
import { checkSafeMode } from "@lib/ops/safeMode";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { NextRequest, NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "src/middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";

export const dynamic = "force-dynamic";
const MENU_INTAKE_IDENTITY_MAX_BODY_BYTES = 256 * 1024;

const IntakeFileSchema = z.object({
  uid: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  size: z.number().min(0).max(MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE),
  type: z.string().min(1).max(120),
  url: z.string().min(1).max(4000),
});

const MenuExtractionProjectIdSchema = z.string()
  .trim()
  .refine((value) => normalizeMenuExtractionProjectId(value) === value);

const IntakeRequestSchema = z.object({
  projectId: MenuExtractionProjectIdSchema,
  files: z.array(IntakeFileSchema).min(1).max(50),
});

export const POST = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_MENU_INTAKE_IDENTITY) {
    return NextResponse.json({
      skipped: true,
      reason: "feature_disabled",
    });
  }

  const safeModeResponse = await checkSafeMode();
  if (safeModeResponse) return safeModeResponse;

  const ids = {
    tId: String(session.tId || ""),
    sId: String(session.sId || ""),
    uId: String(session.uId || session.user?.id || ""),
  };
  const tenantScope = normalizeMenuIntakeScopeDocumentId(ids.tId);
  const storeScope = normalizeMenuIntakeScopeDocumentId(ids.sId);
  if (!tenantScope || !storeScope) {
    return NextResponse.json({ error: "Invalid menu." }, { status: 400 });
  }

  if (!verifyTenantAccess(session, tenantScope.documentId, storeScope.documentId, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimitConfig = getRateLimitForFeature("AI_OPERATION");
  const userRateLimitHash = hashPublicRateLimitValue(ids.uId);
  const tenantRateLimitHash = hashPublicRateLimitValue(tenantScope.documentId);
  const storeRateLimitHash = hashPublicRateLimitValue(storeScope.documentId);
  const rateLimit = await checkRateLimit({
    key: `menu-intake:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
    ...rateLimitConfig,
  });
  if (!rateLimit.allowed) {
    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many checks. Please wait before trying again.", retryAfter: waitSeconds },
      { status: 429, headers: { "Retry-After": String(waitSeconds) } },
    );
  }

  const bodyResult = await readBoundedJsonBody(request, MENU_INTAKE_IDENTITY_MAX_BODY_BYTES);
  if (bodyResult.ok === false) return bodyResult.response;

  const validation = IntakeRequestSchema.safeParse(bodyResult.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: getSafeZodValidationDetails(validation.error) },
      { status: 400 },
    );
  }

  const { projectId } = validation.data;
  const files = validation.data.files as MenuIntakeFileInput[];
  const unsupportedFile = files.find((file) => !isSupportedMenuIntakeMimeType(file.type));
  if (unsupportedFile) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload menu images or PDFs only." },
      { status: 400 },
    );
  }

  try {
    const result = await runMenuIntakeIdentityCheck({
      files,
      projectId,
      session,
      sId: storeScope.documentId,
      tId: tenantScope.documentId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MenuIntakeIdentityServerError) {
      return NextResponse.json({ error: error.clientMessage }, { status: error.status });
    }

    throw error;
  }
});
