import { FEATURE_FLAGS } from "@config/features";
import { MenuIntakeFileInput } from "@data/shared/menuIntakeIdentity";
import {
  isSupportedMenuIntakeMimeType,
  MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE,
  MenuIntakeIdentityServerError,
  runMenuIntakeIdentityCheck,
} from "@lib/menu-extraction/menuIntakeIdentityServer";
import { checkSafeMode } from "@lib/ops/safeMode";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { NextRequest, NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "src/middleware/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const IntakeFileSchema = z.object({
  uid: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  size: z.number().min(0).max(MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE),
  type: z.string().min(1).max(120),
  url: z.string().min(1).max(4000),
});

const IntakeRequestSchema = z.object({
  projectId: z.string().min(3).max(160),
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
  const unsupportedFile = files.find((file) => !isSupportedMenuIntakeMimeType(file.type));
  if (unsupportedFile) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload menu images or PDFs only." },
      { status: 400 },
    );
  }

  const ids = {
    tId: String(session.tId || ""),
    sId: String(session.sId || ""),
    uId: String(session.uId || session.user?.id || ""),
  };

  if (!verifyTenantAccess(session, ids.tId, ids.sId, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimitConfig = getRateLimitForFeature("AI_OPERATION");
  const rateLimit = await checkRateLimit({
    key: `menu-intake:${ids.uId}:${ids.tId}:${ids.sId}`,
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
    const result = await runMenuIntakeIdentityCheck({
      files,
      projectId,
      session,
      sId: ids.sId,
      tId: ids.tId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MenuIntakeIdentityServerError) {
      return NextResponse.json({ error: error.clientMessage }, { status: error.status });
    }

    throw error;
  }
});
