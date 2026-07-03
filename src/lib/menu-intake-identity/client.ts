import type {
  MenuIntakeAnalysisResult,
  MenuIntakeFileInput,
} from "@data/shared/menuIntakeIdentity";
import {
  getMenuProcessingProjectLogContext,
  logMenuProcessingFailure,
} from "@lib/firebase/menuProcessingDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";

export type MenuIntakeIdentityResponse = MenuIntakeAnalysisResult & {
  analyzedFileCount?: number;
  degraded?: boolean;
  skipped?: boolean;
};

const MENU_INTAKE_IDENTITY_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const MENU_INTAKE_IDENTITY_REQUEST_POLICY: Pick<RequestInit, "cache" | "credentials" | "redirect"> = {
  cache: "no-store",
  credentials: "same-origin",
  redirect: "manual",
};

type MenuIntakeIdentityClientResponse = MenuIntakeIdentityResponse & {
  skipped?: boolean;
};

const isMenuIntakeIdentityPayload = (value: unknown): value is MenuIntakeIdentityClientResponse => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<MenuIntakeIdentityClientResponse>;
  if (payload.skipped === true) return true;
  return Boolean(
    payload.identity
      && payload.validation
      && payload.decision
      && payload.intentAssessment
      && payload.truthRisk
      && payload.structure,
  );
};

const createMenuIntakeIdentityError = (code: string, status: number) => {
  const error = new Error("Could not check this upload.") as Error & { code?: string; status?: number };
  error.code = code;
  error.status = status;
  return error;
};

async function readMenuIntakeIdentityResponseJson(
  response: Response,
  params: { projectId: string; files: MenuIntakeFileInput[] },
): Promise<{ payload: MenuIntakeIdentityClientResponse | null; parseFailed: boolean }> {
  try {
    return {
      payload: await readJsonResponseWithLimit<MenuIntakeIdentityClientResponse>(
        response,
        MENU_INTAKE_IDENTITY_RESPONSE_JSON_MAX_BYTES,
      ),
      parseFailed: false,
    };
  } catch (error) {
    logMenuProcessingFailure("menu_intake_identity_response_parse_failed", error, {
      ...getMenuProcessingProjectLogContext(params.projectId),
      fileCount: params.files.length,
      responseOk: response.ok,
      responseStatus: response.status,
      maxBytes: MENU_INTAKE_IDENTITY_RESPONSE_JSON_MAX_BYTES,
    });
    return { payload: null, parseFailed: true };
  }
}

export async function runMenuIntakeIdentityPreflight(params: {
  projectId: string;
  files: MenuIntakeFileInput[];
}): Promise<MenuIntakeIdentityResponse | null> {
  const response = await fetch("/api/menu-intake-identity", {
    ...MENU_INTAKE_IDENTITY_REQUEST_POLICY,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const { payload, parseFailed } = await readMenuIntakeIdentityResponseJson(response, params);

  if (!response.ok) {
    throw createMenuIntakeIdentityError("menu_intake_identity_rejected", response.status);
  }

  if (parseFailed) {
    throw createMenuIntakeIdentityError("menu_intake_identity_response_parse_failed", response.status);
  }

  const payloadSkipped = Boolean(
    payload && typeof payload === "object" && (payload as { skipped?: unknown }).skipped === true,
  );

  if (!isMenuIntakeIdentityPayload(payload)) {
    const invalid = createMenuIntakeIdentityError("menu_intake_identity_response_invalid", response.status);
    logMenuProcessingFailure("menu_intake_identity_response_invalid", invalid, {
      ...getMenuProcessingProjectLogContext(params.projectId),
      fileCount: params.files.length,
      responseOk: response.ok,
      responseStatus: response.status,
      maxBytes: MENU_INTAKE_IDENTITY_RESPONSE_JSON_MAX_BYTES,
      skipped: payloadSkipped,
    });
    throw invalid;
  }

  if (payload?.skipped) return null;
  return payload as MenuIntakeIdentityResponse;
}
