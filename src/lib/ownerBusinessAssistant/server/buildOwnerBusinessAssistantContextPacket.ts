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
  OwnerBusinessAssistantClientContext,
  OwnerBusinessAssistantContextPacket,
  OwnerBusinessHealthCurrentDoc,
} from '../types';
import { getOwnerBusinessAssistantAllowedActions } from '../actions/actionRegistry';
import {
  buildOwnerBusinessAssistantPacketCacheKey,
  readOwnerBusinessAssistantPacketCache,
  writeOwnerBusinessAssistantPacketCache,
} from './contextPacketCache';
import { buildOwnerBusinessDomainCapabilities } from './domainCapabilityMatrix';

const nowIso = () => new Date().toISOString();

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
    noActionNeeded: true,
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

const mergeClientContext = (
  packet: Omit<OwnerBusinessAssistantContextPacket, 'clientContext' | 'cacheSource'>,
  clientContext: OwnerBusinessAssistantClientContext | undefined,
  cacheSource: OwnerBusinessAssistantContextPacket['cacheSource'],
): OwnerBusinessAssistantContextPacket => ({
  ...packet,
  cacheSource,
  clientContext,
});

const refreshActionCatalog = (
  packet: Omit<OwnerBusinessAssistantContextPacket, 'clientContext' | 'cacheSource'>,
): Omit<OwnerBusinessAssistantContextPacket, 'clientContext' | 'cacheSource'> => {
  const allowedActions = getOwnerBusinessAssistantAllowedActions();
  return {
    ...packet,
    allowedActions,
    sourceSignatures: {
      ...packet.sourceSignatures,
      actionCatalog: String(allowedActions.map((action) => action.actionType).sort().join('|')),
    },
  };
};

export async function buildOwnerBusinessAssistantContextPacket(params: {
  tId: string | number;
  sId: string | number;
  projectId?: string;
  packetProfile?: 'dashboard' | 'page' | 'answer';
  clientContext?: OwnerBusinessAssistantClientContext;
}): Promise<OwnerBusinessAssistantContextPacket> {
  const tId = String(params.tId);
  const sId = String(params.sId);
  const cacheKey = buildOwnerBusinessAssistantPacketCacheKey({
    tId,
    sId,
    projectId: params.projectId,
    packetProfile: params.packetProfile,
  });

  const cached = await readOwnerBusinessAssistantPacketCache(cacheKey);
  if (cached) {
    return mergeClientContext(refreshActionCatalog(cached), params.clientContext, 'server');
  }

  const currentRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(OWNER_BUSINESS_ASSISTANT_DOCS.getCurrent(tId, sId));
  const analyticsRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(OWNER_BUSINESS_ASSISTANT_DOCS.getAnalyticsIndex(tId, sId));

  const reads = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX
    ? await Promise.all([currentRef.get(), analyticsRef.get()])
    : await Promise.all([currentRef.get()]);

  const current = (reads[0].exists ? reads[0].data() : null) as OwnerBusinessHealthCurrentDoc | null;
  const analytics = (reads[1]?.exists ? reads[1].data() : null) as OwnerBusinessAnalyticsIndexDoc | null;
  const health = current || buildFallbackHealthDoc(tId, sId);
  const generatedAt = nowIso();
  const localBusinessDate = health.localDate || generatedAt.slice(0, 10);
  const validUntil = health.validThrough || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const allowedActions = getOwnerBusinessAssistantAllowedActions();

  const packetWithoutContext: Omit<OwnerBusinessAssistantContextPacket, 'clientContext' | 'cacheSource'> = {
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
      actionCatalog: String(allowedActions.map((action) => action.actionType).sort().join('|')),
    },
    health: {
      ...health,
      supportedDomains: health.supportedDomains || buildOwnerBusinessDomainCapabilities({ health, analytics: analytics || undefined }),
      cost: {
        ...health.cost,
        chatHotPathReadCount: analytics ? 2 : 1,
      },
    },
    analytics: analytics
      ? {
          periods: analytics.periods,
          unsupportedPeriods: analytics.unsupportedPeriods,
          sourceRefs: analytics.sourceRefs,
        }
      : undefined,
    allowedActions,
    answerRules: {
      refuseUnsupported: true,
      sourceFactIdsRequired: true,
      noRevenueProfitWithoutSource: true,
      noPublicMutationWithoutConfirmation: true,
    },
  };

  await writeOwnerBusinessAssistantPacketCache(cacheKey, packetWithoutContext);
  return mergeClientContext(packetWithoutContext, params.clientContext, 'fresh_firestore');
}
