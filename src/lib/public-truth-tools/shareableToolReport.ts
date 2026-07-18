import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

export const SHAREABLE_TOOL_REPORT_SCHEMA_VERSION = 1;
export const SHAREABLE_TOOL_REPORT_ROUTE = '/tools/reports';
export const SHAREABLE_TOOL_REPORT_HASH_KEY = 'r';
export const SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH = 24000;
export const SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH = 36000;
export const SHAREABLE_TOOL_REPORT_MAX_CHECKS = 16;
export const SHAREABLE_TOOL_REPORT_MAX_BOUNDARIES = 8;
export const SHAREABLE_TOOL_REPORT_MAX_SETUP_JOBS = 6;
export const SHAREABLE_TOOL_REPORT_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_SHAREABLE_TOOL_REPORT_DECODE_DIAGNOSTICS = 25;

const reportedShareableToolReportDecodeFailures = new Set<string>();

type ShareableToolReportDecodeFailureStage =
  | 'base64_decode'
  | 'json_parse'
  | 'json_oversized'
  | 'payload_invalid'
  | 'payload_oversized';

export type ShareableToolReportStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type ShareableToolReportResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export interface ShareableToolReportCheck {
  id: string;
  label: string;
  result: ShareableToolReportResult;
  helperText: string;
  evidenceText: string;
}

export interface ShareableToolReportNextAction {
  title: string;
  description: string;
  cta: string;
  href: string;
}

export interface ShareableToolReportSetupJob {
  id: string;
  label: string;
  reason: string;
}

export interface ShareableToolReportSummary {
  present: number;
  missing: number;
  unclear: number;
  notChecked: number;
  primaryNumber: number;
  primaryLabel: string;
}

export interface ShareableToolReportPayload {
  schemaVersion: typeof SHAREABLE_TOOL_REPORT_SCHEMA_VERSION;
  toolId: string;
  toolName: string;
  reportTitle: string;
  generatedAt: string;
  status: ShareableToolReportStatus;
  statusTitle: string;
  statusDescription: string;
  businessName?: string;
  businessContext?: string;
  checkedSourceText: string;
  notCheckedText: string;
  summary: ShareableToolReportSummary;
  checks: ShareableToolReportCheck[];
  setupJobList: ShareableToolReportSetupJob[];
  nextAction: ShareableToolReportNextAction;
  publicBoundary: string[];
}

const SHAREABLE_TOOL_REPORT_STATUSES: ShareableToolReportStatus[] = [
  'ready',
  'missing_basics',
  'unclear',
  'not_checked',
  'manual_review_needed',
];

const SHAREABLE_TOOL_REPORT_RESULTS: ShareableToolReportResult[] = [
  'present',
  'missing',
  'unclear',
  'not_applicable',
  'not_checked',
];

type ShareableToolReportTranslate = unknown;

export interface ShareablePublicTruthToolReportLike {
  generatedAt: string;
  status: ShareableToolReportStatus;
  businessName: string;
  cityOrArea: string;
  checks: Array<{
    id: string;
    result: ShareableToolReportResult;
    evidenceText: string;
  }>;
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: string;
  };
}

export interface BuildShareablePublicTruthToolReportPayloadOptions {
  report: ShareablePublicTruthToolReportLike;
  t: ShareableToolReportTranslate;
  sharedT: ShareableToolReportTranslate;
  toolId: string;
  businessContext?: string;
}

function translateShareableToolReportText(
  t: ShareableToolReportTranslate,
  key: string,
  values?: Record<string, string | number>,
): string {
  return (t as (key: string, values?: Record<string, string | number>) => string)(key, values);
}

function coerceString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\x00-\x1F\x7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function coerceIsoTimestamp(value: unknown): string {
  const timestamp = coerceString(value, 80);
  if (!SHAREABLE_TOOL_REPORT_ISO_TIMESTAMP_PATTERN.test(timestamp)) return '';

  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) return '';

  const normalizedTimestamp = new Date(timestampMs).toISOString();
  return normalizedTimestamp === timestamp ? normalizedTimestamp : '';
}

function coerceStatus(value: unknown): ShareableToolReportStatus {
  return SHAREABLE_TOOL_REPORT_STATUSES.includes(value as ShareableToolReportStatus)
    ? value as ShareableToolReportStatus
    : 'manual_review_needed';
}

function coerceResult(value: unknown): ShareableToolReportResult {
  return SHAREABLE_TOOL_REPORT_RESULTS.includes(value as ShareableToolReportResult)
    ? value as ShareableToolReportResult
    : 'not_checked';
}

function coerceInternalHref(value: unknown): string {
  const href = coerceString(value, 220);

  if (
    href.startsWith('/')
    && !href.startsWith('//')
    && !href.includes('\\')
    && !/%5c/i.test(href)
  ) {
    try {
      const base = new URL('https://menulist.invalid');
      const resolved = new URL(href, base);
      if (resolved.origin === base.origin) {
        return `${resolved.pathname}${resolved.search}${resolved.hash}`;
      }
    } catch {
      return '/create-menu';
    }
  }

  return '/create-menu';
}

function formatSetupJobResult(result: ShareableToolReportResult): string {
  return result.replace(/_/g, ' ');
}

export function buildShareableToolReportSetupJobs(
  checks: ShareableToolReportCheck[],
  nextAction?: ShareableToolReportNextAction,
): ShareableToolReportSetupJob[] {
  const jobs = checks
    .filter((check) => check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
    .slice(0, SHAREABLE_TOOL_REPORT_MAX_SETUP_JOBS)
    .map((check, index) => ({
      id: coerceString(check.id, 80) || `check_${index + 1}`,
      label: coerceString(check.label, 160),
      reason: coerceString(`${formatSetupJobResult(check.result)}: ${check.evidenceText || check.helperText}`, 260),
    }))
    .filter((job) => job.label.length > 0 && job.reason.length > 0);

  if (jobs.length > 0 || !nextAction?.title || !nextAction.description) {
    return jobs;
  }

  return [{
    id: 'next_action',
    label: coerceString(nextAction.title, 160),
    reason: coerceString(nextAction.description, 260),
  }];
}

function getShareableToolReportSummary(checks: ShareableToolReportCheck[]): Omit<ShareableToolReportSummary, 'primaryNumber' | 'primaryLabel'> {
  return checks.reduce(
    (summary, check) => {
      if (check.result === 'present' || check.result === 'not_applicable') summary.present += 1;
      if (check.result === 'missing') summary.missing += 1;
      if (check.result === 'unclear') summary.unclear += 1;
      if (check.result === 'not_checked') summary.notChecked += 1;
      return summary;
    },
    { present: 0, missing: 0, unclear: 0, notChecked: 0 },
  );
}

function hasExactSummaryNumber(value: unknown, expected: number): boolean {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value === expected;
}

function normalizePrimaryNumber(value: unknown, checkCount: number): number | null {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= checkCount
    ? value
    : null;
}

function normalizeShareableToolReportPayload(value: unknown): ShareableToolReportPayload | null {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== SHAREABLE_TOOL_REPORT_SCHEMA_VERSION) return null;

  const rawSummary = source.summary && typeof source.summary === 'object'
    ? source.summary as Record<string, unknown>
    : {};
  const rawNextAction = source.nextAction && typeof source.nextAction === 'object'
    ? source.nextAction as Record<string, unknown>
    : {};
  const rawChecks = Array.isArray(source.checks) ? source.checks : [];
  const rawBoundaries = Array.isArray(source.publicBoundary) ? source.publicBoundary : [];

  const checks: ShareableToolReportCheck[] = rawChecks
    .slice(0, SHAREABLE_TOOL_REPORT_MAX_CHECKS)
    .map((check) => {
      const row = check && typeof check === 'object' ? check as Record<string, unknown> : {};
      return {
        id: coerceString(row.id, 80),
        label: coerceString(row.label, 140),
        result: coerceResult(row.result),
        helperText: coerceString(row.helperText, 260),
        evidenceText: coerceString(row.evidenceText, 340),
      };
    })
    .filter((check) => check.label.length > 0 && check.evidenceText.length > 0);

  const nextAction: ShareableToolReportNextAction = {
    title: coerceString(rawNextAction.title, 160),
    description: coerceString(rawNextAction.description, 360),
    cta: coerceString(rawNextAction.cta, 80),
    href: coerceInternalHref(rawNextAction.href),
  };
  const summary = getShareableToolReportSummary(checks);
  const primaryNumber = normalizePrimaryNumber(rawSummary.primaryNumber, checks.length);

  if (
    !hasExactSummaryNumber(rawSummary.present, summary.present)
    || !hasExactSummaryNumber(rawSummary.missing, summary.missing)
    || !hasExactSummaryNumber(rawSummary.unclear, summary.unclear)
    || !hasExactSummaryNumber(rawSummary.notChecked, summary.notChecked)
    || primaryNumber === null
  ) {
    return null;
  }

  const payload: ShareableToolReportPayload = {
    schemaVersion: SHAREABLE_TOOL_REPORT_SCHEMA_VERSION,
    toolId: coerceString(source.toolId, 80),
    toolName: coerceString(source.toolName, 120),
    reportTitle: coerceString(source.reportTitle, 160),
    generatedAt: coerceIsoTimestamp(source.generatedAt),
    status: coerceStatus(source.status),
    statusTitle: coerceString(source.statusTitle, 160),
    statusDescription: coerceString(source.statusDescription, 360),
    businessName: coerceString(source.businessName, 140) || undefined,
    businessContext: coerceString(source.businessContext, 160) || undefined,
    checkedSourceText: coerceString(source.checkedSourceText, 360),
    notCheckedText: coerceString(source.notCheckedText, 420),
    summary: {
      ...summary,
      primaryNumber,
      primaryLabel: coerceString(rawSummary.primaryLabel, 120),
    },
    checks,
    setupJobList: buildShareableToolReportSetupJobs(checks, nextAction),
    nextAction,
    publicBoundary: rawBoundaries
      .slice(0, SHAREABLE_TOOL_REPORT_MAX_BOUNDARIES)
      .map((boundary) => coerceString(boundary, 220))
      .filter(Boolean),
  };

  if (
    !payload.toolId
    || !payload.toolName
    || !payload.reportTitle
    || !payload.generatedAt
    || !payload.statusTitle
    || !payload.statusDescription
    || !payload.checkedSourceText
    || !payload.notCheckedText
    || !payload.summary.primaryLabel
    || payload.checks.length === 0
    || payload.publicBoundary.length === 0
    || !payload.nextAction.title
    || !payload.nextAction.description
    || !payload.nextAction.cta
  ) {
    return null;
  }

  return payload;
}

function getBase64Runtime() {
  return globalThis as typeof globalThis & {
    Buffer?: {
      from(input: Uint8Array | string, encoding?: string): Uint8Array & {
        toString(encoding: string): string;
      };
    };
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  const runtime = getBase64Runtime();
  if (runtime.Buffer) {
    return runtime.Buffer.from(bytes).toString('base64');
  }

  throw new Error('shareable_tool_report_base64_encode_unavailable');
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  const runtime = getBase64Runtime();
  if (runtime.Buffer) {
    const buffer = runtime.Buffer.from(base64, 'base64');
    return new Uint8Array(buffer as unknown as ArrayBuffer);
  }

  throw new Error('shareable_tool_report_base64_decode_unavailable');
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(padded));
}

function extractEncodedPayload(hashOrPayload: string): string {
  const trimmed = hashOrPayload.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

  if (withoutHash.startsWith(`${SHAREABLE_TOOL_REPORT_HASH_KEY}=`)) {
    return withoutHash.slice(`${SHAREABLE_TOOL_REPORT_HASH_KEY}=`.length);
  }

  return withoutHash;
}

function logShareableToolReportDecodeFailure({
  decodedLength,
  encoded,
  error,
  hashOrPayload,
  stage,
}: {
  decodedLength?: number;
  encoded: string;
  error: unknown;
  hashOrPayload: string;
  stage: ShareableToolReportDecodeFailureStage;
}): void {
  const trimmed = hashOrPayload.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const hasHashPrefix = trimmed.startsWith('#');
  const hasReportHashKey = withoutHash.startsWith(`${SHAREABLE_TOOL_REPORT_HASH_KEY}=`);
  const boundedDecodedLength = typeof decodedLength === 'number' && Number.isFinite(decodedLength)
    ? decodedLength
    : 0;
  const failureKey = [
    stage,
    trimmed.length,
    encoded.length,
    boundedDecodedLength,
    hasHashPrefix ? 'hash' : 'payload',
    hasReportHashKey ? 'keyed' : 'direct',
    encoded.length > SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH ? 'encoded-too-large' : 'encoded-ok',
    boundedDecodedLength > SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH ? 'json-too-large' : 'json-ok',
  ].join(':');

  if (reportedShareableToolReportDecodeFailures.has(failureKey)) return;
  if (reportedShareableToolReportDecodeFailures.size >= MAX_SHAREABLE_TOOL_REPORT_DECODE_DIAGNOSTICS) return;
  reportedShareableToolReportDecodeFailures.add(failureKey);

  logRuntimeFailure('shareable_tool_report_payload_decode_failed', error, {
    failureStage: stage,
    hashInputLength: trimmed.length,
    encodedPayloadLength: encoded.length,
    decodedPayloadLength: boundedDecodedLength,
    hasHashPrefix,
    hasReportHashKey,
    encodedPayloadExceedsMaxLength: encoded.length > SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH,
    decodedPayloadExceedsMaxLength: boundedDecodedLength > SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH,
    fallbackPolicy: 'show_invalid_report_state',
  });
}

export function isShareableToolReportPayload(value: unknown): value is ShareableToolReportPayload {
  return normalizeShareableToolReportPayload(value) !== null;
}

export function encodeShareableToolReportPayload(payload: ShareableToolReportPayload): string {
  const normalized = normalizeShareableToolReportPayload(payload);
  if (!normalized) {
    throw new Error('shareable_tool_report_payload_invalid');
  }

  const json = JSON.stringify(normalized);
  if (json.length > SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH) {
    throw new Error('shareable_tool_report_payload_too_large');
  }

  return toBase64Url(json);
}

export function decodeShareableToolReportPayload(hashOrPayload: string): ShareableToolReportPayload | null {
  const encoded = extractEncodedPayload(hashOrPayload);

  if (!encoded) {
    return null;
  }

  if (encoded.length > SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH) {
    logShareableToolReportDecodeFailure({
      encoded,
      error: new Error('shareable_tool_report_payload_oversized'),
      hashOrPayload,
      stage: 'payload_oversized',
    });
    return null;
  }

  let decoded: string;
  try {
    decoded = fromBase64Url(encoded);
  } catch (error) {
    logShareableToolReportDecodeFailure({
      encoded,
      error,
      hashOrPayload,
      stage: 'base64_decode',
    });
    return null;
  }

  if (decoded.length > SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH) {
    logShareableToolReportDecodeFailure({
      decodedLength: decoded.length,
      encoded,
      error: new Error('shareable_tool_report_json_oversized'),
      hashOrPayload,
      stage: 'json_oversized',
    });
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch (error) {
    logShareableToolReportDecodeFailure({
      decodedLength: decoded.length,
      encoded,
      error,
      hashOrPayload,
      stage: 'json_parse',
    });
    return null;
  }

  const normalized = normalizeShareableToolReportPayload(parsed);
  if (!normalized) {
    logShareableToolReportDecodeFailure({
      decodedLength: decoded.length,
      encoded,
      error: new Error('shareable_tool_report_payload_invalid'),
      hashOrPayload,
      stage: 'payload_invalid',
    });
  }

  return normalized;
}

export function createShareableToolReportUrl(payload: ShareableToolReportPayload, origin?: string): string {
  const resolvedOrigin = origin
    || (typeof window !== 'undefined' ? window.location.origin : 'https://menulist.ai');
  const encoded = encodeShareableToolReportPayload(payload);
  return `${resolvedOrigin}${SHAREABLE_TOOL_REPORT_ROUTE}#${SHAREABLE_TOOL_REPORT_HASH_KEY}=${encoded}`;
}

export function buildShareablePublicTruthToolReportPayload({
  report,
  t,
  sharedT,
  toolId,
  businessContext,
}: BuildShareablePublicTruthToolReportPayloadOptions): ShareableToolReportPayload {
  const issueCount = report.summary.missing + report.summary.unclear;
  const checks = report.checks.map((check) => ({
    id: check.id,
    label: translateShareableToolReportText(t, `checks.${check.id}.label`),
    result: check.result,
    helperText: translateShareableToolReportText(t, `checks.${check.id}.helper`),
    evidenceText: check.evidenceText,
  }));
  const nextAction = {
    title: translateShareableToolReportText(t, `nextActions.${report.nextAction.type}.title`),
    description: translateShareableToolReportText(t, `nextActions.${report.nextAction.type}.description`),
    cta: translateShareableToolReportText(t, `nextActions.${report.nextAction.type}.cta`),
    href: report.nextAction.href,
  };

  return {
    schemaVersion: SHAREABLE_TOOL_REPORT_SCHEMA_VERSION,
    toolId,
    toolName: translateShareableToolReportText(t, 'heroTitle'),
    reportTitle: translateShareableToolReportText(t, 'export.title'),
    generatedAt: report.generatedAt,
    status: report.status,
    statusTitle: translateShareableToolReportText(t, `statuses.${report.status}.title`),
    statusDescription: translateShareableToolReportText(t, `statuses.${report.status}.description`),
    businessName: report.businessName || undefined,
    businessContext: businessContext || report.cityOrArea || undefined,
    checkedSourceText: translateShareableToolReportText(sharedT, 'checkedSourceText'),
    notCheckedText: translateShareableToolReportText(sharedT, 'notCheckedText'),
    summary: {
      present: report.summary.present,
      missing: report.summary.missing,
      unclear: report.summary.unclear,
      notChecked: report.summary.notChecked,
      primaryNumber: issueCount,
      primaryLabel: translateShareableToolReportText(sharedT, 'primaryLabel'),
    },
    checks,
    setupJobList: buildShareableToolReportSetupJobs(checks, nextAction),
    nextAction,
    publicBoundary: [
      translateShareableToolReportText(sharedT, 'boundary0'),
      translateShareableToolReportText(sharedT, 'boundary1'),
      translateShareableToolReportText(sharedT, 'boundary2'),
      translateShareableToolReportText(sharedT, 'boundary3'),
    ],
  };
}
