export const SHAREABLE_TOOL_REPORT_SCHEMA_VERSION = 1;
export const SHAREABLE_TOOL_REPORT_ROUTE = '/tools/reports';
export const SHAREABLE_TOOL_REPORT_HASH_KEY = 'r';
export const SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH = 24000;
export const SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH = 36000;
export const SHAREABLE_TOOL_REPORT_MAX_CHECKS = 16;
export const SHAREABLE_TOOL_REPORT_MAX_BOUNDARIES = 8;
export const SHAREABLE_TOOL_REPORT_MAX_SETUP_JOBS = 6;

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
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function coerceNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
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

  if (href.startsWith('/') && !href.startsWith('//')) {
    return href;
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

function coerceShareableToolReportSetupJobs(value: unknown): ShareableToolReportSetupJob[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, SHAREABLE_TOOL_REPORT_MAX_SETUP_JOBS)
    .map((job, index) => {
      const row = job && typeof job === 'object' ? job as Record<string, unknown> : {};
      const label = coerceString(row.label, 160);
      return {
        id: coerceString(row.id, 80) || `job_${index + 1}`,
        label,
        reason: coerceString(row.reason, 260),
      };
    })
    .filter((job) => job.label.length > 0 && job.reason.length > 0);
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
  const setupJobList = coerceShareableToolReportSetupJobs(source.setupJobList);

  const payload: ShareableToolReportPayload = {
    schemaVersion: SHAREABLE_TOOL_REPORT_SCHEMA_VERSION,
    toolId: coerceString(source.toolId, 80),
    toolName: coerceString(source.toolName, 120),
    reportTitle: coerceString(source.reportTitle, 160),
    generatedAt: coerceString(source.generatedAt, 80),
    status: coerceStatus(source.status),
    statusTitle: coerceString(source.statusTitle, 160),
    statusDescription: coerceString(source.statusDescription, 360),
    businessName: coerceString(source.businessName, 140) || undefined,
    businessContext: coerceString(source.businessContext, 160) || undefined,
    checkedSourceText: coerceString(source.checkedSourceText, 360),
    notCheckedText: coerceString(source.notCheckedText, 420),
    summary: {
      present: coerceNumber(rawSummary.present),
      missing: coerceNumber(rawSummary.missing),
      unclear: coerceNumber(rawSummary.unclear),
      notChecked: coerceNumber(rawSummary.notChecked),
      primaryNumber: coerceNumber(rawSummary.primaryNumber),
      primaryLabel: coerceString(rawSummary.primaryLabel, 120),
    },
    checks,
    setupJobList: setupJobList.length > 0
      ? setupJobList
      : buildShareableToolReportSetupJobs(checks, nextAction),
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
    || payload.checks.length === 0
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

  if (!encoded || encoded.length > SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH) {
    return null;
  }

  try {
    const decoded = fromBase64Url(encoded);
    if (decoded.length > SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH) {
      return null;
    }

    return normalizeShareableToolReportPayload(JSON.parse(decoded));
  } catch {
    return null;
  }
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
