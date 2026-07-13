import { randomUUID } from 'crypto';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import {
  OWNER_BUSINESS_ASSISTANT_COPY,
  OWNER_BUSINESS_ASSISTANT_DOCS,
} from '../constants';
import type {
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessAssistantClientContext,
  OwnerBusinessAssistantContextPacket,
  OwnerBusinessAssistantPacketProfile,
  OwnerBusinessAnalyticsTeaser,
  OwnerBusinessHealthCurrentDoc,
} from '../types';
import {
  parseOwnerBusinessAnalyticsIndexDoc,
  parseOwnerBusinessHealthCurrentDoc,
} from '../readModelBoundary';
import {
  buildOwnerBusinessAssistantPacketCacheKey,
  readOwnerBusinessAssistantPacketCache,
  writeOwnerBusinessAssistantPacketCache,
} from './contextPacketCache';
import { buildOwnerBusinessDomainCapabilities } from './domainCapabilityMatrix';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

const nowIso = () => new Date().toISOString();
const numberFormatter = new Intl.NumberFormat('en');

const buildFallbackHealthDoc = (tId: string, sId: string): OwnerBusinessHealthCurrentDoc => ({
  version: 1,
  tId,
  sId,
  localDate: new Date().toISOString().slice(0, 10),
  generatedAt: nowIso(),
  sourceWindow: {},
  status: 'not_ready',
  summary: {
    headline: OWNER_BUSINESS_ASSISTANT_COPY.notReadyTitle,
    ownerMessage: 'MenuList will show Business Health after the first store check finishes.',
    noActionNeeded: false,
    actionCount: 0,
  },
  blocks: {},
  suggestedChecks: [],
  suggestedQuestions: [],
  supportedIntents: ['business_status'],
  unsupportedData: { health: 'not_available' },
  sourceRefs: [],
  cost: {
    builderReadCount: 0,
    builderWriteCount: 0,
    chatHotPathReadCount: 0,
  },
});

const getDocSignature = (doc: { generatedAt?: string; localDate?: string; version?: number } | undefined) => {
  if (!doc) return undefined;
  return `${doc.version || 1}:${doc.localDate || '_'}:${doc.generatedAt || '_'}`;
};

const formatCount = (value?: number) => numberFormatter.format(
  typeof value === 'number' && Number.isFinite(value) ? value : 0,
);

const buildMetricTeaser = (
  period: OwnerBusinessAnalyticsPeriod | undefined,
): OwnerBusinessAnalyticsTeaser | undefined => {
  if (!period) return undefined;
  return {
    label: period.label,
    value: `${formatCount(period.metrics.menuVisits)} visits`,
    sourceFactId: period.sourceFactIds[0],
  };
};

const buildTopItemTeaser = (
  period: OwnerBusinessAnalyticsPeriod | undefined,
): OwnerBusinessAnalyticsTeaser | undefined => {
  const topItem = period?.topItems?.[0];
  if (!topItem) return undefined;
  return {
    label: 'Top item',
    value: topItem.name || topItem.itemId,
    deltaLabel: `${formatCount(topItem.value)} ${topItem.signal}`,
    sourceFactId: period?.sourceFactIds[0],
  };
};

const firstAvailablePeriod = (
  periods: OwnerBusinessAnalyticsIndexDoc['periods'] | undefined,
) => periods?.today
  || periods?.thisWeek
  || periods?.last7Days
  || periods?.yesterday
  || null;

const buildScopedAnalyticsTeaser = (
  periods: OwnerBusinessAnalyticsIndexDoc['periods'] | undefined,
  analyticsIndexDocId: string,
) => {
  const primaryPeriod = firstAvailablePeriod(periods);
  if (!primaryPeriod) return undefined;
  return {
    today: buildMetricTeaser(primaryPeriod),
    thisWeek: buildMetricTeaser(periods?.thisWeek),
    topItem: buildTopItemTeaser(primaryPeriod),
    analyticsIndexDocId,
  };
};

const buildScopedAnalytics = (
  analytics: OwnerBusinessAnalyticsIndexDoc | null,
  projectId?: string,
): OwnerBusinessAssistantContextPacket['analytics'] => {
  if (!analytics) return undefined;

  if (projectId) {
    const projectSummary = analytics.projectSummaries?.[projectId];
    if (!projectSummary) {
      return {
        periods: {},
        unsupportedPeriods: { project: 'not_available' },
        sourceRefs: analytics.sourceRefs,
        projectScope: analytics.projectScope,
      };
    }

    return {
      periods: projectSummary.periods,
      unsupportedPeriods: projectSummary.unsupportedPeriods,
      sourceRefs: projectSummary.sourceRefs,
      projectScope: analytics.projectScope,
    };
  }

  return {
    periods: analytics.periods,
    unsupportedPeriods: analytics.unsupportedPeriods,
    sourceRefs: analytics.sourceRefs,
    projectScope: analytics.projectScope,
  };
};

const buildScopedHealth = (params: {
  health: OwnerBusinessHealthCurrentDoc;
  analytics: OwnerBusinessAnalyticsIndexDoc | null;
  scopedAnalytics: OwnerBusinessAssistantContextPacket['analytics'];
  projectId?: string;
  analyticsIndexDocId: string;
}) => {
  if (!params.projectId || !params.scopedAnalytics || !params.analytics?.projectSummaries?.[params.projectId]) {
    return params.health;
  }

  return {
    ...params.health,
    analyticsTeaser: buildScopedAnalyticsTeaser(params.scopedAnalytics.periods, params.analyticsIndexDocId),
  };
};

const getPacketAgeMinutes = (generatedAt?: string) => {
  const generatedAtMs = Date.parse(generatedAt || '');
  if (!Number.isFinite(generatedAtMs)) return undefined;
  return Math.max(0, Math.floor((Date.now() - generatedAtMs) / 60_000));
};

const getSourceFactCount = (packet: Pick<OwnerBusinessAssistantContextPacket, 'health' | 'analytics' | 'todayOverlay'>) => {
  const factIds = new Set<string>();
  packet.health.sourceRefs?.forEach((ref) => factIds.add(ref.id));
  packet.health.suggestedChecks?.forEach((check) => check.sourceFactIds.forEach((id) => factIds.add(id)));
  packet.health.supportedDomains?.forEach((domain) => domain.sourceFactIds.forEach((id) => factIds.add(id)));
  packet.analytics?.sourceRefs?.forEach((ref) => factIds.add(ref.id));
  packet.todayOverlay?.sourceFactIds?.forEach((id) => factIds.add(id));
  return factIds.size;
};

const buildPacketMetrics = (params: {
  packet: Pick<OwnerBusinessAssistantContextPacket, 'health' | 'analytics' | 'todayOverlay' | 'generatedAt' | 'validUntil'>;
  cacheSource: OwnerBusinessAssistantContextPacket['cacheSource'];
  firestoreReadCount: number;
  firestoreWriteCount: number;
  packetProfile: OwnerBusinessAssistantPacketProfile;
}) => ({
  cacheSource: params.cacheSource,
  firestoreReadCount: params.firestoreReadCount,
  firestoreWriteCount: params.firestoreWriteCount,
  packetProfile: params.packetProfile,
  packetAgeMinutes: getPacketAgeMinutes(params.packet.generatedAt),
  packetValidUntil: params.packet.validUntil,
  sourceFactCount: getSourceFactCount(params.packet),
  domainCoverage: (params.packet.health.supportedDomains || []).map((entry) => ({
    domain: entry.domain,
    status: entry.status,
    reason: entry.reason,
  })),
});

const mergeClientContext = (
  packet: Omit<OwnerBusinessAssistantContextPacket, 'clientContext' | 'cacheSource' | 'metrics'>,
  clientContext: OwnerBusinessAssistantClientContext | undefined,
  cacheSource: OwnerBusinessAssistantContextPacket['cacheSource'],
  projectId?: string,
  packetProfile: OwnerBusinessAssistantPacketProfile = 'answer',
  firestoreReadCount = 0,
  firestoreWriteCount = 0,
): OwnerBusinessAssistantContextPacket => ({
  ...packet,
  cacheSource,
  clientContext,
  projectId: projectId || packet.projectId,
  metrics: buildPacketMetrics({
    packet,
    cacheSource,
    firestoreReadCount,
    firestoreWriteCount,
    packetProfile,
  }),
});

export async function buildOwnerBusinessAssistantContextPacket(params: {
  tId: string | number;
  sId: string | number;
  projectId?: string;
  packetProfile?: OwnerBusinessAssistantPacketProfile;
  clientContext?: OwnerBusinessAssistantClientContext;
}): Promise<OwnerBusinessAssistantContextPacket> {
  const tId = String(params.tId);
  const sId = String(params.sId);
  const packetProfile = params.packetProfile || 'answer';
  const includeProjectInCacheKey = Boolean(params.projectId && packetProfile !== 'health_card');
  const cacheKey = buildOwnerBusinessAssistantPacketCacheKey({
    tId,
    sId,
    projectId: params.projectId,
    includeProjectInCacheKey,
    packetProfile,
  });

  const cached = await readOwnerBusinessAssistantPacketCache(cacheKey);
  if (cached) {
    return mergeClientContext(cached, params.clientContext, 'server', params.projectId, packetProfile, 0, 0);
  }

  const currentRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(OWNER_BUSINESS_ASSISTANT_DOCS.getCurrent(tId, sId));
  const analyticsRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(OWNER_BUSINESS_ASSISTANT_DOCS.getAnalyticsIndex(tId, sId));

  const shouldReadCurrent = packetProfile !== 'analytics_periods';
  const shouldReadAnalytics = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX
    && packetProfile !== 'health_card';
  const reads = await Promise.all([
    ...(shouldReadCurrent ? [currentRef.get()] : []),
    ...(shouldReadAnalytics ? [analyticsRef.get()] : []),
  ]);
  let readIndex = 0;
  const currentSnap = shouldReadCurrent ? reads[readIndex++] : null;
  const analyticsSnap = shouldReadAnalytics ? reads[readIndex++] : null;

  const current = currentSnap?.exists
    ? parseOwnerBusinessHealthCurrentDoc(currentSnap.data(), { tId, sId })
    : null;
  const analytics = analyticsSnap?.exists
    ? parseOwnerBusinessAnalyticsIndexDoc(analyticsSnap.data(), { tId, sId })
    : null;
  if (currentSnap?.exists && !current) {
    logRuntimeFailure(
      'owner_business_assistant_persisted_current_invalid',
      new Error('owner_business_assistant_persisted_current_invalid'),
      {
        expectedStoreIdLength: sId.length,
        expectedTenantIdLength: tId.length,
        fallbackPolicy: 'not_ready_health',
      },
    );
  }
  if (analyticsSnap?.exists && !analytics) {
    logRuntimeFailure(
      'owner_business_assistant_persisted_analytics_invalid',
      new Error('owner_business_assistant_persisted_analytics_invalid'),
      {
        expectedStoreIdLength: sId.length,
        expectedTenantIdLength: tId.length,
        fallbackPolicy: 'analytics_unavailable',
      },
    );
  }
  const health = current || buildFallbackHealthDoc(tId, sId);
  const analyticsIndexDocId = OWNER_BUSINESS_ASSISTANT_DOCS.getAnalyticsIndex(tId, sId);
  const scopedAnalytics = buildScopedAnalytics(analytics, params.projectId);
  const scopedHealth = buildScopedHealth({
    health,
    analytics,
    scopedAnalytics,
    projectId: params.projectId,
    analyticsIndexDocId,
  });
  const generatedAt = nowIso();
  const localBusinessDate = scopedHealth.localDate || generatedAt.slice(0, 10);
  const validUntil = scopedHealth.validThrough || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const packetWithoutContext: Omit<OwnerBusinessAssistantContextPacket, 'clientContext' | 'cacheSource' | 'metrics'> = {
    version: 1,
    packetId: randomUUID(),
    cacheKey,
    tId,
    sId,
    projectId: params.projectId,
    localBusinessDate,
    validUntil,
    generatedAt,
    sourceSignatures: {
      healthCurrent: getDocSignature(health),
      analyticsIndex: getDocSignature(analytics || undefined),
    },
    health: {
      ...scopedHealth,
      supportedDomains: scopedHealth.supportedDomains || buildOwnerBusinessDomainCapabilities({ health: scopedHealth, analytics: scopedAnalytics || undefined }),
      cost: {
        ...scopedHealth.cost,
        chatHotPathReadCount: reads.length,
      },
    },
    analytics: scopedAnalytics,
    answerRules: {
      refuseUnsupported: true,
      sourceFactIdsRequired: true,
      noRevenueProfitWithoutSource: true,
    },
  };

  await writeOwnerBusinessAssistantPacketCache(cacheKey, {
    ...packetWithoutContext,
    projectId: includeProjectInCacheKey ? params.projectId : undefined,
  });
  return mergeClientContext(packetWithoutContext, params.clientContext, 'fresh_firestore', params.projectId, packetProfile, reads.length, 0);
}
