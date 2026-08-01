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

const CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);
const COMPLETENESS_VALUES = new Set(["complete", "likely_complete", "partial", "insufficient"]);
const INTENT_VALUES = new Set([
  "new_menu", "create_new_project", "update_existing_menu", "replace_existing_menu",
  "add_special_menu", "add_outlet_menu", "different_business", "different_outlet",
  "accidental_wrong_business", "needs_clearer_upload", "unknown",
]);
const TRUTH_RISK_VALUES = new Set(["low", "medium", "high"]);
const STRUCTURE_VALUES = new Set(["same_menu", "minor_update", "mostly_different", "unknown"]);
const SEVERITY_VALUES = new Set(["none", "notice", "confirm", "block"]);
const PRIMARY_ACTION_VALUES = new Set(["continue", "confirm_existing_project", "upload_more", "retry_clearer"]);
const SECONDARY_ACTION_VALUES = new Set(["cancel", "create_new_project"]);
const SUGGESTION_FIELDS = new Set([
  "business_name", "phone_number", "address", "business_type",
  "business_category", "currency", "languages",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const isBoundedString = (value: unknown, maxLength: number, allowEmpty = false): value is string => (
  typeof value === "string"
  && value.length <= maxLength
  && (allowEmpty || value.trim().length > 0)
);

const isNullableBoundedString = (value: unknown, maxLength: number): value is string | null => (
  value === null || isBoundedString(value, maxLength)
);

const isBoundedStringArray = (value: unknown, maxItems = 8, maxLength = 240): value is string[] => (
  Array.isArray(value)
  && value.length <= maxItems
  && value.every((item) => isBoundedString(item, maxLength))
);

const isStructure = (value: unknown): boolean => (
  isRecord(value)
  && STRUCTURE_VALUES.has(value.assessment as string)
  && CONFIDENCE_VALUES.has(value.confidence as string)
  && isNullableBoundedString(value.summary, 500)
);

const isTruthRisk = (value: unknown): boolean => (
  isRecord(value)
  && TRUTH_RISK_VALUES.has(value.level as string)
  && isBoundedStringArray(value.reasons)
);

const isSuggestions = (value: unknown): boolean => (
  Array.isArray(value)
  && value.length <= SUGGESTION_FIELDS.size
  && value.every((suggestion) => (
    isRecord(suggestion)
    && SUGGESTION_FIELDS.has(suggestion.field as string)
    && isBoundedString(suggestion.value, 500)
    && CONFIDENCE_VALUES.has(suggestion.confidence as string)
    && suggestion.saveMode === "suggestion_only"
  ))
);

export const isMenuIntakeIdentityPayload = (
  value: unknown,
  totalFiles: number,
): value is MenuIntakeIdentityClientResponse => {
  if (!isRecord(value)) return false;
  const payload = value;
  if (payload.skipped === true) return true;

  const identity = payload.identity;
  const validation = payload.validation;
  const intentAssessment = payload.intentAssessment;
  const decision = payload.decision;
  if (!isRecord(identity) || !isRecord(validation) || !isRecord(intentAssessment) || !isRecord(decision)) {
    return false;
  }

  const isIndexList = (indexes: unknown): boolean => (
    Array.isArray(indexes)
    && indexes.length <= totalFiles
    && indexes.every((index) => Number.isSafeInteger(index) && index >= 1 && index <= totalFiles)
  );

  return (
    isNullableBoundedString(identity.businessName, 240)
    && isNullableBoundedString(identity.phoneNumber, 240)
    && isNullableBoundedString(identity.address, 240)
    && isNullableBoundedString(identity.businessType, 240)
    && isNullableBoundedString(identity.businessCategory, 240)
    && isNullableBoundedString(identity.currencyHint, 240)
    && isBoundedStringArray(identity.languages)
    && CONFIDENCE_VALUES.has(identity.confidence as string)
    && isIndexList(validation.validMenuFileIndexes)
    && isIndexList(validation.invalidFileIndexes)
    && isBoundedStringArray(validation.nonMenuReasons, 6)
    && isBoundedStringArray(validation.qualityIssues, 6)
    && COMPLETENESS_VALUES.has(validation.menuCompleteness as string)
    && typeof validation.emptyExtractionRisk === "boolean"
    && CONFIDENCE_VALUES.has(validation.confidence as string)
    && isBoundedString(validation.summary, 500)
    && INTENT_VALUES.has(intentAssessment.intent as string)
    && CONFIDENCE_VALUES.has(intentAssessment.confidence as string)
    && isBoundedStringArray(intentAssessment.reasons, 6)
    && isTruthRisk(payload.truthRisk)
    && isStructure(payload.structure)
    && isSuggestions(payload.suggestions)
    && SEVERITY_VALUES.has(decision.severity as string)
    && INTENT_VALUES.has(decision.intent as string)
    && isBoundedString(decision.title, 500)
    && isBoundedString(decision.message, 1000)
    && PRIMARY_ACTION_VALUES.has(decision.primaryAction as string)
    && (decision.secondaryAction === undefined || SECONDARY_ACTION_VALUES.has(decision.secondaryAction as string))
    && isBoundedStringArray(decision.reasons)
    && typeof decision.mismatchScore === "number"
    && Number.isFinite(decision.mismatchScore)
    && decision.mismatchScore >= 0
    && decision.mismatchScore <= 20
    && isStructure(decision.structure)
    && isSuggestions(decision.suggestions)
    && isTruthRisk(decision.truthRisk)
    && (payload.analyzedFileCount === undefined || (
      Number.isSafeInteger(payload.analyzedFileCount)
      && (payload.analyzedFileCount as number) >= 0
      && (payload.analyzedFileCount as number) <= totalFiles
    ))
    && (payload.degraded === undefined || typeof payload.degraded === "boolean")
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

  if (!isMenuIntakeIdentityPayload(payload, params.files.length)) {
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
