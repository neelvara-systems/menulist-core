export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import type {
  FounderMonitorData,
  FounderMonitorGrowthSummary,
  FounderMonitorRevenueMovementRow,
  FounderMonitorRevenueSummary,
  FounderMonitorScorecard,
  FounderMonitorSourceCoverage,
} from '@lib/ops/founderMonitorTypes';
import { normalizeFounderMonitorStatus, type FounderMonitorStatus } from '@lib/ops/founderMonitorTypes';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPlatformAuth } from '../../../../middleware/auth';

const MOVEMENT_ROW_LIMIT = 40;
const INDIA_OFFSET_MS = 330 * 60 * 1000;

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

type SummaryReadResult = {
  coverage: FounderMonitorSourceCoverage;
  data: Record<string, any>;
};

function safeNumber(value: unknown): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanText(value: unknown, max = 180): string {
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
    if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
    if (typeof value === 'number') {
      const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);
      return Number.isFinite(date.getTime()) ? date : null;
    }
    if (typeof value === 'string') {
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

function getIndiaDayKey(date: Date): string {
  const local = new Date(date.getTime() + INDIA_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

function getRecentIndiaDayKeys(days: number): string[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, index) => getIndiaDayKey(new Date(now - index * 24 * 60 * 60 * 1000)));
}

function getTodayWindowLabel(): string {
  return 'Since 12:00 AM IST';
}

function addCleanIds(value: unknown, target: Set<string>) {
  if (!Array.isArray(value)) return;
  value.forEach((entry) => {
    const id = cleanText(entry, 80);
    if (id) target.add(id);
  });
}

async function readPlatformSummaryDoc(id: string, label: string, docId: string): Promise<SummaryReadResult> {
  try {
    const snap = await firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docId).get();
    return {
      data: snap.exists ? snap.data() || {} : {},
      coverage: {
        id,
        label,
        status: snap.exists ? 'available' : 'empty',
        readLimit: 1,
        documentsConsidered: snap.exists ? 1 : 0,
        detail: snap.exists ? `Read platformSummary/${docId}.` : `platformSummary/${docId} does not exist yet.`,
      },
    };
  } catch (error) {
    logRuntimeFailure('founder_monitor_summary_read_failed', error, {
      sourceId: id,
      ...getBoundedRuntimeStringContext('docId', docId),
    });
    return {
      data: {},
      coverage: {
        id,
        label,
        status: 'error',
        readLimit: 1,
        documentsConsidered: 0,
        detail: `Could not read platformSummary/${docId}.`,
      },
    };
  }
}

async function readDailyRevenueDocs(dayKeys: string[]): Promise<{
  coverage: FounderMonitorSourceCoverage;
  docs: Record<string, any>[];
}> {
  if (dayKeys.length === 0) {
    return {
      docs: [],
      coverage: {
        id: 'founder-revenue-daily',
        label: 'Founder revenue daily summaries',
        status: 'empty',
        readLimit: 0,
        documentsConsidered: 0,
        detail: 'No day keys requested.',
      },
    };
  }

  try {
    const refs = dayKeys.map((key) => firestoreAdmin
      .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
      .doc(`founderMonitorRevenueDaily_${key}`));
    const snaps = await firestoreAdmin.getAll(...refs);
    return {
      docs: snaps.filter((snap) => snap.exists).map((snap) => snap.data() || {}),
      coverage: {
        id: 'founder-revenue-daily',
        label: 'Founder revenue daily summaries',
        status: snaps.some((snap) => snap.exists) ? 'available' : 'empty',
        readLimit: dayKeys.length,
        documentsConsidered: snaps.filter((snap) => snap.exists).length,
        detail: `Read ${snaps.length} precomputed daily revenue summary documents.`,
      },
    };
  } catch (error) {
    logRuntimeFailure('founder_monitor_daily_revenue_read_failed', error, {
      days: dayKeys.length,
    });
    return {
      docs: [],
      coverage: {
        id: 'founder-revenue-daily',
        label: 'Founder revenue daily summaries',
        status: 'error',
        readLimit: dayKeys.length,
        documentsConsidered: 0,
        detail: 'Could not read precomputed daily revenue summaries.',
      },
    };
  }
}

async function readRevenueMovements(): Promise<{
  coverage: FounderMonitorSourceCoverage;
  rows: FounderMonitorRevenueMovementRow[];
}> {
  try {
    const snap = await firestoreAdmin
      .collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS)
      .orderBy('occurredAt', 'desc')
      .limit(MOVEMENT_ROW_LIMIT)
      .get();

    return {
      rows: snap.docs.map((doc) => {
        const data = doc.data() || {};
        return {
          id: hashPublicRateLimitValue(doc.id),
          occurredAt: toIso(data.occurredAt),
          tenantId: cleanText(data.tenantId || data.tId, 80),
          storeId: cleanText(data.storeId || data.sId, 80),
          kind: cleanText(data.kind, 80) as FounderMonitorRevenueMovementRow['kind'],
          amountPaise: safeNumber(data.amountPaise),
          description: cleanText(data.description || data.eventName || data.kind, 220),
        };
      }).filter((row) => ['new_mrr', 'cash_collected', 'failed_payment', 'churn', 'refund', 'expansion_mrr', 'downgrade_mrr'].includes(row.kind)),
      coverage: {
        id: 'founder-revenue-movements',
        label: 'Founder revenue movement ledger',
        status: snap.empty ? 'empty' : 'available',
        readLimit: MOVEMENT_ROW_LIMIT,
        documentsConsidered: snap.size,
        detail: `Read latest ${snap.size} movement ledger documents.`,
      },
    };
  } catch (error) {
    logRuntimeFailure('founder_monitor_revenue_movements_read_failed', error, {
      readLimit: MOVEMENT_ROW_LIMIT,
    });
    return {
      rows: [],
      coverage: {
        id: 'founder-revenue-movements',
        label: 'Founder revenue movement ledger',
        status: 'error',
        readLimit: MOVEMENT_ROW_LIMIT,
        documentsConsidered: 0,
        detail: 'Could not read founderRevenueMovements ordered by occurredAt.',
      },
    };
  }
}

function aggregateDailyRevenue(docs: Record<string, any>[]) {
  const aggregate = {
    cashCollectedPaise: 0,
    churnedMrrPaise: 0,
    downgradeMrrPaise: 0,
    expansionMrrPaise: 0,
    failedPaymentAmountPaise: 0,
    failedPaymentCount: 0,
    netNewMrrPaise: 0,
    newMrrPaise: 0,
    newStoreIds: new Set<string>(),
    newTenantIds: new Set<string>(),
    refundAmountPaise: 0,
  };

  docs.forEach((doc) => {
    aggregate.cashCollectedPaise += safeNumber(doc.cashCollectedPaise);
    aggregate.churnedMrrPaise += safeNumber(doc.churnedMrrPaise);
    aggregate.downgradeMrrPaise += safeNumber(doc.downgradeMrrPaise);
    aggregate.expansionMrrPaise += safeNumber(doc.expansionMrrPaise);
    aggregate.failedPaymentAmountPaise += safeNumber(doc.failedPaymentAmountPaise);
    aggregate.failedPaymentCount += safeNumber(doc.failedPaymentCount);
    aggregate.netNewMrrPaise += safeNumber(doc.netNewMrrPaise);
    aggregate.newMrrPaise += safeNumber(doc.newMrrPaise);
    aggregate.refundAmountPaise += safeNumber(doc.refundAmountPaise);
    addCleanIds(doc.newStoreIds, aggregate.newStoreIds);
    addCleanIds(doc.newTenantIds, aggregate.newTenantIds);
  });

  return aggregate;
}

function buildRevenueSummary(revenueDoc: Record<string, any>, periodDaily: ReturnType<typeof aggregateDailyRevenue>, todayDaily: ReturnType<typeof aggregateDailyRevenue>): FounderMonitorRevenueSummary {
  const currentMrrPaise = safeNumber(revenueDoc.currentMrrPaise);
  const activeSubscriptions = safeNumber(revenueDoc.activeSubscriptions);
  const activeStores = safeNumber(revenueDoc.activeStores);
  const trustedLiveStores = safeNumber(revenueDoc.trustedLiveStores);
  const churnReasons = Object.fromEntries([
    'no_longer_needed',
    'missing_functionality',
    'too_expensive',
    'switched_provider',
    'purchased_accidentally',
    'other',
  ].map((reason) => [reason, safeNumber(revenueDoc.churnReasons?.[reason])]));

  return {
    currentMrrPaise,
    netNewMrrPaise: periodDaily.netNewMrrPaise,
    newMrrPaise: periodDaily.newMrrPaise,
    churnedMrrPaise: periodDaily.churnedMrrPaise,
    expansionMrrPaise: periodDaily.expansionMrrPaise,
    downgradeMrrPaise: periodDaily.downgradeMrrPaise,
    cashCollectedTodayPaise: todayDaily.cashCollectedPaise,
    failedPaymentAmountTodayPaise: todayDaily.failedPaymentAmountPaise,
    pastDueMrrPaise: safeNumber(revenueDoc.pastDueMrrPaise),
    refundsTodayPaise: todayDaily.refundAmountPaise,
    activeSubscriptions,
    pastDueSubscriptions: safeNumber(revenueDoc.pastDueSubscriptions),
    churnedSubscriptions: safeNumber(revenueDoc.churnedSubscriptions),
    arpaPaise: activeSubscriptions > 0 ? Math.round(currentMrrPaise / activeSubscriptions) : 0,
    arpsPaise: activeStores > 0 ? Math.round(currentMrrPaise / activeStores) : 0,
    revenuePerTrustedLiveStorePaise: trustedLiveStores > 0 ? Math.round(currentMrrPaise / trustedLiveStores) : 0,
    churnReasons,
  };
}

function buildGrowthSummary(growthDoc: Record<string, any>): FounderMonitorGrowthSummary {
  const draftsCreated = safeNumber(growthDoc.draftsCreated);
  const businessesClaimed = safeNumber(growthDoc.businessesClaimed);
  const allowedSources = ['menulist_public_surface', 'physical_partner', 'founder_pilot'];
  const bySource = Object.fromEntries(allowedSources.map((source) => {
    const sourceData = growthDoc.bySource?.[source] || {};
    return [source, {
      draftsCreated: safeNumber(sourceData.draftsCreated),
      businessesClaimed: safeNumber(sourceData.businessesClaimed),
    }];
  }));

  return {
    draftsCreated,
    businessesClaimed,
    draftToClaimRatePercent: draftsCreated > 0
      ? Math.round((businessesClaimed / draftsCreated) * 1000) / 10
      : 0,
    bySource,
  };
}

function defaultScorecard(todayWindowLabel: string): FounderMonitorScorecard {
  return {
    trustedLiveStores: 0,
    activeStores: 0,
    totalStores: 0,
    newTenantsToday: 0,
    newStoresToday: 0,
    storesActivatedToday: 0,
    onboardingStuckStores: 0,
    staleOrBrokenStores: 0,
    activeDistributionStores: 0,
    criticalTickets: 0,
    failedPaymentsToday: 0,
    todayWindowLabel,
  };
}

export const GET = withPlatformAuth(async (request: NextRequest, session: any) => {
  let failureContext: Record<string, boolean | number | string | null | undefined> = {
    route: '/api/platform/founder-monitor',
    ...getBoundedRuntimeStringContext('requestPath', request.nextUrl.pathname),
    ...getBoundedRuntimeStringContext('userId', session?.uId || session?.user?.id),
  };

  try {
    if (!FEATURE_FLAGS.ENABLE_PLATFORM_FOUNDER_MONITOR) {
      return NextResponse.json({ error: 'Founder monitor is disabled' }, { status: 404 });
    }

    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: getSafeZodValidationDetails(parsed.error) }, { status: 400 });
    }
    failureContext = {
      ...failureContext,
      days: parsed.data.days,
    };

    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const userId = session?.uId || session?.user?.id || 'platform';
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const rateLimit = await checkRateLimit({
      key: `platform-founder-monitor:${userRateLimitHash}`,
      ...rateLimitConfig,
      failClosedOnProviderError: true,
    });

    if (!rateLimit.allowed) {
      const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      logger.security('Rate Limit Exceeded - Platform Founder Monitor', {
        endpoint: '/api/platform/founder-monitor',
        limit: rateLimitConfig.limit,
        ...getBoundedRuntimeStringContext('userId', userId),
        waitSeconds,
        window: rateLimitConfig.window,
      }, 'medium');

      return NextResponse.json(
        {
          error: rateLimit.reason === 'provider_unavailable'
            ? 'Founder monitor is temporarily unavailable.'
            : `Too many requests. Please wait ${waitSeconds} seconds.`,
          retryAfter: waitSeconds,
          resetAt: rateLimit.resetAt,
        },
        {
          status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
          headers: {
            'Retry-After': String(waitSeconds),
            'X-RateLimit-Limit': String(rateLimitConfig.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        },
      );
    }

    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - Founder Monitor Current Role', {
        ...getBoundedRuntimeStringContext('requestPath', request.nextUrl.pathname),
      }, 'high');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dayKeys = getRecentIndiaDayKeys(parsed.data.days);
    const todayKey = getIndiaDayKey(new Date());
    const [snapshotRead, revenueRead, growthRead, dailyRead, movementRead] = await Promise.all([
      readPlatformSummaryDoc('founder-monitor-snapshot', 'Founder Monitor snapshot', 'founderMonitorSnapshot'),
      readPlatformSummaryDoc('founder-monitor-revenue', 'Founder Monitor live revenue summary', 'founderMonitorRevenue'),
      readPlatformSummaryDoc('founder-monitor-growth', 'Founder Monitor growth summary', 'founderMonitorGrowth'),
      readDailyRevenueDocs(dayKeys),
      readRevenueMovements(),
    ]);

    const periodDaily = aggregateDailyRevenue(dailyRead.docs);
    const todayDaily = aggregateDailyRevenue(dailyRead.docs.filter((doc) => cleanText(doc.dateKey, 20) === todayKey));
    const revenue = buildRevenueSummary(revenueRead.data, periodDaily, todayDaily);
    const growth = buildGrowthSummary(growthRead.data);
    const status: FounderMonitorStatus = snapshotRead.coverage.status === 'available' && revenueRead.coverage.status === 'available'
      ? normalizeFounderMonitorStatus(snapshotRead.data.status)
      : 'setup_required';
    const scorecard = {
      ...defaultScorecard(getTodayWindowLabel()),
      ...(snapshotRead.data.scorecard || {}),
      trustedLiveStores: safeNumber(snapshotRead.data.scorecard?.trustedLiveStores),
      activeStores: safeNumber(snapshotRead.data.scorecard?.activeStores),
      totalStores: safeNumber(snapshotRead.data.scorecard?.totalStores),
      newTenantsToday: todayDaily.newTenantIds.size,
      newStoresToday: todayDaily.newStoreIds.size,
      failedPaymentsToday: todayDaily.failedPaymentCount,
      todayWindowLabel: getTodayWindowLabel(),
    };

    const data: FounderMonitorData = {
      generatedAt: toIso(snapshotRead.data.generatedAt || snapshotRead.data.updatedAt) || new Date().toISOString(),
      periodDays: parsed.data.days,
      periodStart: new Date(Date.now() - parsed.data.days * 24 * 60 * 60 * 1000).toISOString(),
      status,
      scorecard,
      revenue,
      growth,
      storeTruth: snapshotRead.data.storeTruth || {
        averageScore: 0,
        scoredStores: 0,
        storesBelow70: 0,
        payingStoresBelow70: 0,
        staleStores: 0,
        unscoredActiveStores: 0,
      },
      onboarding: snapshotRead.data.onboarding || {
        paidStoresNotLive: 0,
        pendingSubscriptions: 0,
        storesWithoutPublishedMenu: 0,
        storesMissingDistributionSurface: 0,
        averageTimeToLiveHours: null,
      },
      support: snapshotRead.data.support || {
        openTickets: 0,
        highPriorityOpenTickets: 0,
        ticketsOpenedToday: 0,
        storesWithRepeatedTickets: 0,
      },
      storeRows: Array.isArray(snapshotRead.data.storeRows) ? snapshotRead.data.storeRows : [],
      revenueMovement: movementRead.rows,
      dataGaps: [
        ...(Array.isArray(snapshotRead.data.dataGaps) ? snapshotRead.data.dataGaps : []),
        ...(revenueRead.coverage.status === 'empty' ? [{
          id: 'revenue-summary-not-ready',
          label: 'Revenue summary not ready',
          detail: 'The first revenue movement or 30-minute reconciliation has not populated platformSummary/founderMonitorRevenue yet.',
          severity: 'watch' as const,
        }] : []),
      ],
      sourceCoverage: [
        snapshotRead.coverage,
        revenueRead.coverage,
        growthRead.coverage,
        dailyRead.coverage,
        movementRead.coverage,
      ],
    };

    return NextResponse.json({ data });
  } catch (error) {
    logRuntimeFailure('founder_monitor_route_failed', error, failureContext);
    return NextResponse.json({ error: 'Failed to load founder monitor' }, { status: 500 });
  }
});
