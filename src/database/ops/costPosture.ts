import type { PlatformCostPostureApiResponse, PlatformCostPostureData } from '@lib/ops/costPostureTypes';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const PLATFORM_COST_POSTURE_LOAD_FAILED = 'Failed to load platform cost posture';
const PLATFORM_COST_POSTURE_RESPONSE_PARSE_FAILED = 'platform_cost_posture_response_parse_failed';
const PLATFORM_COST_POSTURE_RESPONSE_INVALID = 'platform_cost_posture_response_invalid';
const PLATFORM_COST_POSTURE_RESPONSE_REJECTED = 'platform_cost_posture_response_rejected';
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
    && isNullableString(value.alertsMutedUntil);
}

function isCostTotals(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.knownInternalCostPaise)
    && isFiniteNumber(value.knownOwnerChargePaise)
    && isFiniteNumber(value.providerCalls)
    && isFiniteNumber(value.firestoreReadsObserved);
}

function isCostSignal(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.description === 'string'
    && typeof value.coverage === 'string'
    && typeof value.periodLabel === 'string'
    && isFiniteNumber(value.count)
    && isFiniteNumber(value.realCostPaise)
    && isFiniteNumber(value.ownerChargePaise)
    && isFiniteNumber(value.providerCalls)
    && isFiniteNumber(value.firestoreReadsObserved)
    && isNullableString(value.latestAt)
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
    && isNullableString(value.timestamp);
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
    && isFiniteNumber(value.readLimit)
    && isFiniteNumber(value.documentsConsidered)
    && typeof value.detail === 'string';
}

function isPlatformCostPostureData(value: unknown): value is PlatformCostPostureData {
  return isRecord(value)
    && typeof value.generatedAt === 'string'
    && isFiniteNumber(value.periodDays)
    && typeof value.periodStart === 'string'
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

export async function getPlatformCostPosture(days = 30): Promise<PlatformCostPostureData> {
  const params = new URLSearchParams({ days: String(days) });
  const response = await fetch(`/api/platform/cost-posture?${params.toString()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
  });
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

  return payload.data;
}
