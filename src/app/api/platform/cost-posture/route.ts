export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import type {
  PlatformCostAlert,
  PlatformCostGuardrail,
  PlatformCostPostureData,
  PlatformCostPostureStatus,
  PlatformCostSignal,
  PlatformCostSourceCoverage,
  PlatformSafeModeStatus,
} from '@lib/ops/costPostureTypes';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPlatformAuth } from '../../../../middleware/auth';

const EXTRACTION_OPERATION_LIMIT = 300;
const BUSINESS_HEALTH_EVENT_LIMIT = 200;
const ALERT_LIMIT = 30;

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

type SourceReadResult<T> = {
  docs: T[];
  coverage: PlatformCostSourceCoverage;
};

function safeNumber(value: unknown): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function toDate(value: any): Date | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : null;
    }
  } catch {
    return null;
  }
  return null;
}

function toIso(value: any): string | null {
  return toDate(value)?.toISOString() || null;
}

function maxIso(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function getDocumentDate(data: Record<string, any>): Date | null {
  return toDate(data.createdAt)
    || toDate(data.createdOn)
    || toDate(data.created_at)
    || toDate(data.timestamp)
    || toDate(data.modifiedOn);
}

function inPeriod(data: Record<string, any>, periodStartMs: number): boolean {
  const date = getDocumentDate(data);
  return !date || date.getTime() >= periodStartMs;
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
          : `Read latest ${snap.size} documents with a hard limit of ${readLimit}.`,
      },
    };
  } catch (error) {
    secureError(`[PlatformCostPosture] Failed to read ${collectionName}`, error as Error, {
      collectionName,
      orderField,
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
    const alertsMutedUntil = toIso(data.alertsMutedUntil);
    const mutedUntilMs = alertsMutedUntil ? new Date(alertsMutedUntil).getTime() : 0;

    return {
      safeMode: {
        active: data.SAFE_MODE === true,
        reason: data.reason ? cleanText(data.reason, 240) : null,
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
    secureError('[PlatformCostPosture] Failed to read ops_config/system', error as Error);
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
  periodLabel: string,
): PlatformCostSignal {
  let count = 0;
  let realCostPaise = 0;
  let ownerChargePaise = 0;
  let providerCalls = 0;
  let latestAt: string | null = null;

  docs.forEach((doc) => {
    const data = doc.data() || {};
    if (!inPeriod(data, periodStartMs)) return;

    count += 1;
    providerCalls += 1;
    const knownRealCost = data.realCostPaise != null ? safeNumber(data.realCostPaise) : safeNumber(data.totalCharge);
    realCostPaise += knownRealCost;
    ownerChargePaise += data.ownerChargePaise != null
      ? safeNumber(data.ownerChargePaise)
      : data.ourChargePaise != null
        ? safeNumber(data.ourChargePaise)
        : safeNumber(data.totalCharge);
    latestAt = maxIso(latestAt, toIso(getDocumentDate(data)));
  });

  return {
    id: 'menu-extraction',
    label: 'Menu extraction AI',
    description: 'Known provider cost from recent extraction operation audit rows.',
    coverage: 'Latest bounded extraction rows only',
    periodLabel,
    count,
    realCostPaise,
    ownerChargePaise,
    providerCalls,
    firestoreReadsObserved: 0,
    latestAt,
    source: DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS,
    linkHref: '/ops/extraction',
  };
}

function summarizeBusinessHealthSignal(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  periodStartMs: number,
  periodLabel: string,
): PlatformCostSignal {
  let count = 0;
  let realCostPaise = 0;
  let ownerChargePaise = 0;
  let providerCalls = 0;
  let firestoreReadsObserved = 0;
  let latestAt: string | null = null;

  docs.forEach((doc) => {
    const data = doc.data() || {};
    if (!inPeriod(data, periodStartMs)) return;

    count += 1;
    realCostPaise += safeNumber(data.realCostPaise);
    ownerChargePaise += safeNumber(data.ownerChargePaise);
    providerCalls += data.providerUsed === true ? 1 : 0;
    firestoreReadsObserved += safeNumber(data.firestoreReadCount);
    latestAt = maxIso(latestAt, toIso(getDocumentDate(data)));
  });

  return {
    id: 'business-health-answers',
    label: 'Business Health answers',
    description: 'Internal answer-route cost and observed summary-document reads.',
    coverage: 'Latest bounded answer events only',
    periodLabel,
    count,
    realCostPaise,
    ownerChargePaise,
    providerCalls,
    firestoreReadsObserved,
    latestAt,
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
    id: doc.id,
    title: cleanText(data.title || data.type || 'Cost signal', 140),
    severity: cleanText(data.severity || data.level || 'info', 40) || 'info',
    type: cleanText(data.type || data.category || 'cost', 80) || 'cost',
    message: cleanText(data.message || data.reason || '', 260),
    timestamp: toIso(data.timestamp || data.createdAt || data.createdOn),
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
        ? `SAFE_MODE is active${safeMode.reason ? `: ${safeMode.reason}` : '.'}`
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

export const GET = withPlatformAuth(async (request: NextRequest, session: any) => {
  try {
    if (!FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE) {
      return NextResponse.json({ error: 'Platform cost posture is disabled' }, { status: 404 });
    }

    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
    }

    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const userId = session?.uId || session?.user?.id || 'platform';
    const rateLimit = await checkRateLimit({
      key: `platform-cost-posture:${userId}`,
      ...rateLimitConfig,
    });

    if (!rateLimit.allowed) {
      const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      logger.security('Rate Limit Exceeded - Platform Cost Posture', {
        endpoint: '/api/platform/cost-posture',
        limit: rateLimitConfig.limit,
        userId,
        waitSeconds,
        window: rateLimitConfig.window,
      }, 'medium');

      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${waitSeconds} seconds.`,
          retryAfter: waitSeconds,
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(waitSeconds),
            'X-RateLimit-Limit': String(rateLimitConfig.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        },
      );
    }

    const periodDays = parsed.data.days;
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
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
      summarizeExtractionSignal(extractionRead.docs, periodStart.getTime(), periodLabel),
      summarizeBusinessHealthSignal(businessHealthRead.docs, periodStart.getTime(), periodLabel),
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
      generatedAt: new Date().toISOString(),
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

    return NextResponse.json({ data });
  } catch (error) {
    secureError('[PlatformCostPosture] Route failed', error as Error);
    return NextResponse.json({ error: 'Failed to load platform cost posture' }, { status: 500 });
  }
});
