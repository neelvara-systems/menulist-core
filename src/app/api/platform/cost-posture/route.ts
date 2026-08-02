export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import type {
  PlatformCostAlert,
  PlatformCostGuardrail,
  PlatformCostPostureData,
  PlatformCostPostureStatus,
  PlatformCostSignal,
  PlatformCostSourceCoverage,
  PlatformSafeModeStatus,
} from '@lib/ops/costPostureTypes';
import {
  parseCostPostureDate,
  summarizeBusinessHealthCostRecords,
  summarizeExtractionCostRecords,
} from '@lib/ops/costPostureAggregation';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { withPlatformAuth } from '../../../../middleware/auth';

const EXTRACTION_OPERATION_LIMIT = 300;
const BUSINESS_HEALTH_EVENT_LIMIT = 200;
const ALERT_LIMIT = 30;
const MAX_TIMESTAMP_PARSE_DIAGNOSTIC_SHAPES = 25;
const PLATFORM_COST_PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

type SourceReadResult<T> = {
  docs: T[];
  coverage: PlatformCostSourceCoverage;
};
const reportedTimestampParseShapes = new Set<string>();

const platformCostJson = (body: Record<string, unknown>, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  Object.entries(PLATFORM_COST_PRIVATE_HEADERS).forEach(([name, value]) => headers.set(name, value));
  return NextResponse.json(body, { ...init, headers });
};

function cleanText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function getCostAlertStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = cleanText(value, 1000);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getCostAlertDisplayType(data: Record<string, unknown>): string {
  return cleanText(data.type || data.category || 'cost', 80) || 'cost';
}

function buildCostAlertTitle(data: Record<string, unknown>): string {
  const displayType = getCostAlertDisplayType(data).replace(/[_-]+/g, ' ');
  return `Cost signal: ${displayType}`;
}

function buildCostAlertMessage(data: Record<string, unknown>): string {
  const context = {
    ...getCostAlertStringContext('title', data.title),
    ...getCostAlertStringContext('message', data.message),
    ...getCostAlertStringContext('reason', data.reason),
  };
  const parts = [
    context.titlePresent ? `title=${context.titleLength}` : null,
    context.messagePresent ? `message=${context.messageLength}` : null,
    context.reasonPresent ? `reason=${context.reasonLength}` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `Stored alert text present (${parts.join(', ')} chars).`
    : 'No stored alert text.';
}

function buildSafeModeReasonSummary(reason: unknown): string | null {
  const normalized = cleanText(reason, 1000);
  return normalized.length > 0
    ? `Reason present (${normalized.length} chars).`
    : null;
}

function buildCostAlertResponseId(docId: string): string {
  return `cost-alert-${createHash('sha256').update(docId).digest('hex').slice(0, 12)}`;
}

function getTimestampParseContext(value: unknown, source: string): Record<string, boolean | number | string> {
  const valueType = value instanceof Date ? 'Date' : Array.isArray(value) ? 'array' : typeof value;
  const asRecord = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    source,
    valueType,
    hasToDate: typeof asRecord.toDate === 'function',
    hasSeconds: typeof asRecord.seconds === 'number',
    isDate: value instanceof Date,
    isFiniteNumber: typeof value === 'number' && Number.isFinite(value),
    stringLength: typeof value === 'string' ? value.length : 0,
  };
}

function logTimestampParseFailure(source: string, value: unknown, error: unknown): void {
  const context = getTimestampParseContext(value, source);
  const shapeKey = [
    context.source,
    context.valueType,
    context.hasToDate,
    context.hasSeconds,
    context.isDate,
    context.isFiniteNumber,
    context.stringLength,
  ].join(':');

  if (reportedTimestampParseShapes.has(shapeKey)) return;
  if (reportedTimestampParseShapes.size >= MAX_TIMESTAMP_PARSE_DIAGNOSTIC_SHAPES) return;
  reportedTimestampParseShapes.add(shapeKey);

  logRuntimeFailure('platform_cost_posture_timestamp_parse_failed', error, {
    ...context,
    fallbackPolicy: 'omit_timestamp',
  });
}

function toIso(value: unknown, source = 'unknown'): string | null {
  return parseCostPostureDate(value, source, logTimestampParseFailure)?.toISOString() || null;
}

async function readDocuments(
  id: string,
  label: string,
  collectionName: string,
  orderField: string,
  readLimit: number,
): Promise<SourceReadResult<FirebaseFirestore.QueryDocumentSnapshot>> {
  try {
    const snap = await firestoreAdmin
      .collection(collectionName)
      .orderBy(orderField, 'desc')
      .limit(readLimit)
      .get();

    return {
      docs: snap.docs,
      coverage: {
        id,
        label,
        status: snap.empty ? 'empty' : 'available',
        readLimit,
        documentsConsidered: snap.size,
        detail: snap.empty
          ? 'No recent documents were found for this source.'
          : snap.size === readLimit
            ? `Read limit of ${readLimit} documents was reached; period totals can be partial.`
            : `Read latest ${snap.size} documents with a hard limit of ${readLimit}.`,
      },
    };
  } catch (error) {
    logRuntimeFailure('platform_cost_posture_source_read_failed', error, {
      sourceId: id,
      ...getBoundedRuntimeStringContext('collectionName', collectionName),
      ...getBoundedRuntimeStringContext('orderField', orderField),
      readLimit,
    });
    return {
      docs: [],
      coverage: {
        id,
        label,
        status: 'error',
        readLimit,
        documentsConsidered: 0,
        detail: 'Source could not be read. Check collection shape, index requirements, and permissions.',
      },
    };
  }
}

async function readSystemConfig(): Promise<{
  safeMode: PlatformSafeModeStatus;
  coverage: PlatformCostSourceCoverage;
}> {
  try {
    const snap = await firestoreAdmin.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system').get();
    const data = snap.exists ? snap.data() || {} : {};
    const alertsMutedUntil = toIso(data.alertsMutedUntil, 'alertsMutedUntil');
    const mutedUntilMs = alertsMutedUntil ? new Date(alertsMutedUntil).getTime() : 0;

    return {
      safeMode: {
        active: data.SAFE_MODE === true,
        reason: buildSafeModeReasonSummary(data.reason),
        alertsMuted: mutedUntilMs > Date.now(),
        alertsMutedUntil,
      },
      coverage: {
        id: 'system-config',
        label: 'Ops system config',
        status: snap.exists ? 'available' : 'empty',
        readLimit: 1,
        documentsConsidered: snap.exists ? 1 : 0,
        detail: snap.exists
          ? 'Read ops_config/system for SAFE_MODE and alert mute state.'
          : 'ops_config/system does not exist yet.',
      },
    };
  } catch (error) {
    logRuntimeFailure('platform_cost_posture_system_config_read_failed', error, {
      sourceId: 'system-config',
      readLimit: 1,
    });
    return {
      safeMode: {
        active: false,
        reason: null,
        alertsMuted: false,
        alertsMutedUntil: null,
      },
      coverage: {
        id: 'system-config',
        label: 'Ops system config',
        status: 'error',
        readLimit: 1,
        documentsConsidered: 0,
        detail: 'Could not read ops_config/system.',
      },
    };
  }
}

function summarizeExtractionSignal(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  periodStartMs: number,
  periodEndMs: number,
  periodLabel: string,
): PlatformCostSignal {
  const aggregate = summarizeExtractionCostRecords(
    docs.map((doc) => doc.data() || {}),
    periodStartMs,
    periodEndMs,
    logTimestampParseFailure,
  );

  return {
    id: 'menu-extraction',
    label: 'Menu extraction AI',
    description: 'Known provider cost and owner charge from recent extraction operation audit rows.',
    coverage: 'Latest bounded extraction rows only; row count is used as a provider-call proxy when the producer has no explicit call count',
    periodLabel,
    count: aggregate.count,
    realCostPaise: aggregate.realCostPaise,
    ownerChargePaise: aggregate.ownerChargePaise,
    providerCalls: aggregate.providerCalls,
    firestoreReadsObserved: 0,
    latestAt: aggregate.latestAt,
    source: DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS,
    linkHref: '/ops/extraction',
  };
}

function summarizeBusinessHealthSignal(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  periodStartMs: number,
  periodEndMs: number,
  periodLabel: string,
): PlatformCostSignal {
  const aggregate = summarizeBusinessHealthCostRecords(
    docs.map((doc) => doc.data() || {}),
    periodStartMs,
    periodEndMs,
    logTimestampParseFailure,
  );

  return {
    id: 'business-health-answers',
    label: 'Business Health answers',
    description: 'Internal answer-route cost and observed summary-document reads.',
    coverage: 'Latest bounded answer events only',
    periodLabel,
    count: aggregate.count,
    realCostPaise: aggregate.realCostPaise,
    ownerChargePaise: aggregate.ownerChargePaise,
    providerCalls: aggregate.providerCalls,
    firestoreReadsObserved: aggregate.firestoreReadsObserved,
    latestAt: aggregate.latestAt,
    source: DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS,
    linkHref: '/platform/owner-business-assistant',
  };
}

function serializeCostAlert(doc: FirebaseFirestore.QueryDocumentSnapshot): PlatformCostAlert | null {
  const data = doc.data() || {};
  const haystack = [
    data.type,
    data.category,
    data.title,
    data.message,
    data.reason,
  ].map((value) => String(value || '').toLowerCase()).join(' ');

  if (!/(cost|billing|spend|usage|quota|safe_mode|safe mode|rate limit|extraction|ai)/.test(haystack)) {
    return null;
  }

  return {
    id: buildCostAlertResponseId(doc.id),
    title: buildCostAlertTitle(data),
    severity: cleanText(data.severity || data.level || 'info', 40) || 'info',
    type: getCostAlertDisplayType(data),
    message: buildCostAlertMessage(data),
    timestamp: toIso(data.timestamp || data.createdAt || data.createdOn, 'costAlertTimestamp'),
  };
}

function buildStatus(
  billingBlocksBillForecast: boolean,
  safeMode: PlatformSafeModeStatus,
  alerts: PlatformCostAlert[],
  sourceCoverage: PlatformCostSourceCoverage[],
): PlatformCostPostureStatus {
  if (billingBlocksBillForecast) return 'setup_required';
  if (safeMode.active) return 'action_required';
  if (sourceCoverage.some((source) => source.status === 'error')) return 'watch';
  if (alerts.some((alert) => ['critical', 'high', 'error'].includes(alert.severity.toLowerCase()))) return 'watch';
  return 'healthy';
}

function buildGuardrails(
  safeMode: PlatformSafeModeStatus,
  billingBlocksBillForecast: boolean,
  sourceCoverage: PlatformCostSourceCoverage[],
): PlatformCostGuardrail[] {
  return [
    {
      id: 'billing-export',
      label: 'Cloud Billing export',
      status: billingBlocksBillForecast ? 'setup_required' : 'ok',
      detail: billingBlocksBillForecast
        ? 'Whole Firebase bill forecasting stays blocked until Cloud Billing export to BigQuery is enabled.'
        : 'Cloud Billing export is available for whole-bill reconciliation.',
      actionHref: null,
    },
    {
      id: 'safe-mode',
      label: 'SAFE_MODE',
      status: safeMode.active ? 'action_required' : 'ok',
      detail: safeMode.active
        ? `SAFE_MODE is active.${safeMode.reason ? ` ${safeMode.reason}` : ''}`
        : 'SAFE_MODE is off.',
      actionHref: '/ops',
    },
    {
      id: 'bounded-reads',
      label: 'Bounded platform reads',
      status: sourceCoverage.some((source) => source.status === 'error') ? 'watch' : 'ok',
      detail: 'The screen reads fixed limits and does not scan tenant/store subcollections.',
      actionHref: '/platform/cost-posture',
    },
    {
      id: 'source-details',
      label: 'Source detail screens',
      status: 'ok',
      detail: 'Use the existing detailed monitors for extraction, Business Health, AI transactions, and Answerlattice intake.',
      actionHref: '/ops',
    },
  ];
}

export const GET = withPlatformAuth(async (request: NextRequest, session) => {
  let failureContext: Record<string, boolean | number | string | null | undefined> = {
    route: '/api/platform/cost-posture',
    ...getBoundedRuntimeStringContext('requestPath', request.nextUrl.pathname),
    ...getBoundedRuntimeStringContext('userId', session?.uId || session?.user?.id),
  };

  try {
    if (!FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE) {
      return platformCostJson({ error: 'Platform cost posture is disabled' }, { status: 404 });
    }

    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return platformCostJson({ error: 'Invalid query', details: getSafeZodValidationDetails(parsed.error) }, { status: 400 });
    }
    failureContext = {
      ...failureContext,
      days: parsed.data.days,
    };

    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const userId = session?.uId || session?.user?.id || 'platform';
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const rateLimit = await checkRateLimit({
      key: `platform-cost-posture:${userRateLimitHash}`,
      ...rateLimitConfig,
      failClosedOnProviderError: true,
    });

    if (!rateLimit.allowed) {
      const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      logger.security('Rate Limit Exceeded - Platform Cost Posture', {
        endpoint: '/api/platform/cost-posture',
        limit: rateLimitConfig.limit,
        ...getBoundedRuntimeStringContext('userId', userId),
        waitSeconds,
        window: rateLimitConfig.window,
      }, 'medium');

      const providerUnavailable = rateLimit.reason === 'provider_unavailable';
      return platformCostJson(
        {
          error: providerUnavailable
            ? 'Platform cost posture is temporarily unavailable.'
            : `Too many requests. Please wait ${waitSeconds} seconds.`,
          retryAfter: waitSeconds,
          ...(!providerUnavailable ? { resetAt: rateLimit.resetAt } : {}),
        },
        {
          status: providerUnavailable ? 503 : 429,
          headers: {
            'Retry-After': String(waitSeconds),
            ...(!providerUnavailable ? {
              'X-RateLimit-Limit': String(rateLimitConfig.limit),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(rateLimit.resetAt),
            } : {}),
          },
        },
      );
    }

    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - Platform Cost Posture Current Role', {
        ...getBoundedRuntimeStringContext('requestPath', request.nextUrl.pathname),
      }, 'high');
      return platformCostJson({ error: 'Forbidden' }, { status: 403 });
    }

    const periodDays = parsed.data.days;
    const generatedAt = new Date();
    const periodStart = new Date(generatedAt.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const periodLabel = `Last ${periodDays} day${periodDays === 1 ? '' : 's'}`;

    const [systemConfig, alertRead, extractionRead, businessHealthRead] = await Promise.all([
      readSystemConfig(),
      readDocuments('system-alerts', 'System alerts', DB_COLLECTIONS.SYSTEM_ALERTS, 'timestamp', ALERT_LIMIT),
      readDocuments(
        'menu-extraction',
        'Menu extraction operation audit',
        DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS,
        'createdAt',
        EXTRACTION_OPERATION_LIMIT,
      ),
      readDocuments(
        'business-health-answers',
        'Business Health answer events',
        DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS,
        'createdAt',
        BUSINESS_HEALTH_EVENT_LIMIT,
      ),
    ]);

    const signals = [
      summarizeExtractionSignal(extractionRead.docs, periodStart.getTime(), generatedAt.getTime(), periodLabel),
      summarizeBusinessHealthSignal(businessHealthRead.docs, periodStart.getTime(), generatedAt.getTime(), periodLabel),
    ];
    const alerts = alertRead.docs
      .map(serializeCostAlert)
      .filter((alert): alert is PlatformCostAlert => Boolean(alert))
      .slice(0, 10);
    const sourceCoverage = [
      systemConfig.coverage,
      alertRead.coverage,
      extractionRead.coverage,
      businessHealthRead.coverage,
      {
        id: 'cloud-billing-export',
        label: 'Cloud Billing export',
        status: 'setup_required',
        readLimit: 0,
        documentsConsidered: 0,
        detail: 'Production prerequisite still marks Cloud Billing export to BigQuery as pending setup.',
      } satisfies PlatformCostSourceCoverage,
    ];
    const billingExport = {
      status: 'pending' as const,
      dataset: 'menulist.cloud_billing_export',
      docHref: '/__docs__/production-readiness/launch-prerequisites.md#step-2b-enable-cloud-billing-export-to-bigquery',
      details: 'Required before bill-level Firebase forecasting can be treated as accurate.',
      blocksBillForecast: true,
    };
    const totals = signals.reduce((acc, signal) => ({
      knownInternalCostPaise: acc.knownInternalCostPaise + signal.realCostPaise,
      knownOwnerChargePaise: acc.knownOwnerChargePaise + signal.ownerChargePaise,
      providerCalls: acc.providerCalls + signal.providerCalls,
      firestoreReadsObserved: acc.firestoreReadsObserved + signal.firestoreReadsObserved,
    }), {
      knownInternalCostPaise: 0,
      knownOwnerChargePaise: 0,
      providerCalls: 0,
      firestoreReadsObserved: 0,
    });

    const status = buildStatus(
      billingExport.blocksBillForecast,
      systemConfig.safeMode,
      alerts,
      sourceCoverage,
    );
    const guardrails = buildGuardrails(systemConfig.safeMode, billingExport.blocksBillForecast, sourceCoverage);

    const data: PlatformCostPostureData = {
      generatedAt: generatedAt.toISOString(),
      periodDays,
      periodStart: periodStart.toISOString(),
      status,
      billingExport,
      safeMode: systemConfig.safeMode,
      totals,
      signals,
      alerts,
      guardrails,
      sourceCoverage,
    };

    return platformCostJson({ data });
  } catch (error) {
    logRuntimeFailure('platform_cost_posture_route_failed', error, failureContext);
    return platformCostJson({ error: 'Failed to load platform cost posture' }, { status: 500 });
  }
});
