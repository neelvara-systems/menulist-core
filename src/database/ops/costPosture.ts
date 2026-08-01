import type { PlatformCostPostureApiResponse, PlatformCostPostureData } from '@lib/ops/costPostureTypes';
import { getBoundedErrorStringField } from '@lib/monitoring/boundedLogContext';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const PLATFORM_COST_POSTURE_LOAD_FAILED = 'Failed to load platform cost posture';
const PLATFORM_COST_POSTURE_RESPONSE_PARSE_FAILED = 'platform_cost_posture_response_parse_failed';
const PLATFORM_COST_POSTURE_RESPONSE_INVALID = 'platform_cost_posture_response_invalid';
const PLATFORM_COST_POSTURE_RESPONSE_REJECTED = 'platform_cost_posture_response_rejected';
const PLATFORM_COST_POSTURE_REQUEST_FAILED = 'platform_cost_posture_request_failed';
export const PLATFORM_COST_POSTURE_RESPONSE_JSON_MAX_BYTES = 256 * 1024;

const COST_POSTURE_STATUSES = ['healthy', 'watch', 'action_required', 'setup_required'];
const SOURCE_STATUSES = ['available', 'empty', 'error', 'setup_required'];
const GUARDRAIL_STATUSES = ['ok', 'watch', 'action_required', 'setup_required'];

function createPlatformCostPostureLoadError(status?: number): Error {
  const error = new Error(PLATFORM_COST_POSTURE_LOAD_FAILED);
  if (typeof status === 'number') {
    (error as Error & { status?: number }).status = status;
  }
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  const timestampMs = Date.parse(value);
  return Number.isFinite(timestampMs) && new Date(timestampMs).toISOString() === value;
}

function isNullableIsoTimestamp(value: unknown): value is string | null {
  return value === null || isValidIsoTimestamp(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isAllowedString(value: unknown, allowed: string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

function isBillingExportStatus(value: unknown): boolean {
  return isRecord(value)
    && isAllowedString(value.status, ['pending', 'configured', 'unknown'])
    && typeof value.dataset === 'string'
    && typeof value.docHref === 'string'
    && typeof value.details === 'string'
    && typeof value.blocksBillForecast === 'boolean';
}

function isSafeModeStatus(value: unknown): boolean {
  return isRecord(value)
    && typeof value.active === 'boolean'
    && isNullableString(value.reason)
    && typeof value.alertsMuted === 'boolean'
    && isNullableIsoTimestamp(value.alertsMutedUntil);
}

function isCostTotals(value: unknown): boolean {
  return isRecord(value)
    && isNonNegativeFiniteNumber(value.knownInternalCostPaise)
    && isNonNegativeFiniteNumber(value.knownOwnerChargePaise)
    && isNonNegativeSafeInteger(value.providerCalls)
    && isNonNegativeSafeInteger(value.firestoreReadsObserved);
}

function isCostSignal(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.description === 'string'
    && typeof value.coverage === 'string'
    && typeof value.periodLabel === 'string'
    && isNonNegativeSafeInteger(value.count)
    && isNonNegativeFiniteNumber(value.realCostPaise)
    && isNonNegativeFiniteNumber(value.ownerChargePaise)
    && isNonNegativeSafeInteger(value.providerCalls)
    && isNonNegativeSafeInteger(value.firestoreReadsObserved)
    && isNullableIsoTimestamp(value.latestAt)
    && typeof value.source === 'string'
    && typeof value.linkHref === 'string';
}

function isCostAlert(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.severity === 'string'
    && typeof value.type === 'string'
    && typeof value.message === 'string'
    && isNullableIsoTimestamp(value.timestamp);
}

function isCostGuardrail(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && isAllowedString(value.status, GUARDRAIL_STATUSES)
    && typeof value.detail === 'string'
    && isNullableString(value.actionHref);
}

function isSourceCoverage(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && isAllowedString(value.status, SOURCE_STATUSES)
    && isNonNegativeSafeInteger(value.readLimit)
    && isNonNegativeSafeInteger(value.documentsConsidered)
    && typeof value.detail === 'string';
}

function isPlatformCostPostureData(value: unknown): value is PlatformCostPostureData {
  if (!isRecord(value)) return false;

  const generatedAtMs = isValidIsoTimestamp(value.generatedAt) ? Date.parse(value.generatedAt) : Number.NaN;
  const periodStartMs = isValidIsoTimestamp(value.periodStart) ? Date.parse(value.periodStart) : Number.NaN;

  return Number.isFinite(generatedAtMs)
    && Number.isFinite(periodStartMs)
    && periodStartMs <= generatedAtMs
    && isNonNegativeSafeInteger(value.periodDays)
    && value.periodDays >= 1
    && value.periodDays <= 90
    && isValidIsoTimestamp(value.periodStart)
    && isAllowedString(value.status, COST_POSTURE_STATUSES)
    && isBillingExportStatus(value.billingExport)
    && isSafeModeStatus(value.safeMode)
    && isCostTotals(value.totals)
    && Array.isArray(value.signals)
    && value.signals.every(isCostSignal)
    && Array.isArray(value.alerts)
    && value.alerts.every(isCostAlert)
    && Array.isArray(value.guardrails)
    && value.guardrails.every(isCostGuardrail)
    && Array.isArray(value.sourceCoverage)
    && value.sourceCoverage.every(isSourceCoverage);
}

function isPlatformCostPostureApiResponse(value: unknown): value is PlatformCostPostureApiResponse {
  return isRecord(value) && isPlatformCostPostureData(value.data);
}

function getPlatformCostPostureResponseContext(response: Response, days: number) {
  return {
    days,
    maxBytes: PLATFORM_COST_POSTURE_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
  };
}

function getPlatformCostPostureRequestContext(days: number) {
  return {
    days,
    maxBytes: PLATFORM_COST_POSTURE_RESPONSE_JSON_MAX_BYTES,
  };
}

async function readPlatformCostPostureResponseJson(
  response: Response,
  days: number,
): Promise<unknown> {
  try {
    return await readJsonResponseWithLimit<unknown>(
      response,
      PLATFORM_COST_POSTURE_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure(
      PLATFORM_COST_POSTURE_RESPONSE_PARSE_FAILED,
      error,
      getPlatformCostPostureResponseContext(response, days),
    );
    return null;
  }
}

export async function getPlatformCostPosture(
  days = 30,
  options: { signal?: AbortSignal } = {},
): Promise<PlatformCostPostureData> {
  if (!Number.isSafeInteger(days) || days < 1 || days > 90) {
    throw createPlatformCostPostureLoadError();
  }

  const params = new URLSearchParams({ days: String(days) });
  let response: Response;
  try {
    response = await fetch(`/api/platform/cost-posture?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'manual',
      signal: options.signal,
    });
  } catch (error) {
    if (getBoundedErrorStringField(error, 'name', 128) === 'AbortError') throw error;
    logRuntimeFailure(
      PLATFORM_COST_POSTURE_REQUEST_FAILED,
      error,
      getPlatformCostPostureRequestContext(days),
    );
    throw createPlatformCostPostureLoadError();
  }
  const payload = await readPlatformCostPostureResponseJson(response, days);

  if (!response.ok) {
    const error = createPlatformCostPostureLoadError(response.status);
    logRuntimeFailure(
      PLATFORM_COST_POSTURE_RESPONSE_REJECTED,
      error,
      getPlatformCostPostureResponseContext(response, days),
    );
    throw error;
  }

  if (!isPlatformCostPostureApiResponse(payload)) {
    const error = createPlatformCostPostureLoadError(response.status);
    logRuntimeFailure(
      PLATFORM_COST_POSTURE_RESPONSE_INVALID,
      error,
      getPlatformCostPostureResponseContext(response, days),
    );
    throw error;
  }

  if (payload.data.periodDays !== days) {
    const error = createPlatformCostPostureLoadError(response.status);
    logRuntimeFailure(
      PLATFORM_COST_POSTURE_RESPONSE_INVALID,
      error,
      getPlatformCostPostureResponseContext(response, days),
    );
    throw error;
  }

  return payload.data;
}
