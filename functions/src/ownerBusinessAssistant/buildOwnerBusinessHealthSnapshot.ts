import { FUNCTION_FLAGS } from '../constants/features';
import { getBusinessAnalyticsDateKey } from '../utils/businessDay';
import { OWNER_BUSINESS_ASSISTANT_DOCS } from './constants';
import { buildOwnerBusinessAnalyticsIndex } from './buildOwnerBusinessAnalyticsIndex';
import { buildOwnerBusinessFeedbackSummary } from './buildOwnerBusinessFeedbackSummary';
import { buildOwnerBusinessHealthBlocks } from './ownerBusinessHealthBlocks';
import { buildOwnerBusinessHealthQuestions } from './ownerBusinessHealthIntentFixtures';
import { buildOwnerBusinessHealthSourceRefs } from './ownerBusinessHealthSources';
import { writeOwnerBusinessHealthDocs } from './ownerBusinessHealthWriters';
import type {
  ActiveProjectEntry,
  OwnerBusinessHealthBuildResult,
  OwnerBusinessHealthCurrentDoc,
} from './types';

const formatCount = (value: number) => new Intl.NumberFormat('en').format(value);

const resolveOptionalStoreString = (value: unknown, maxLength: number) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;

const resolveStoreName = (storeInfo: FirebaseFirestore.DocumentData, fallback: string) => {
  const candidates = [
    storeInfo.name,
    storeInfo.storeName,
    storeInfo.businessName,
    storeInfo.tenantName,
  ];
  const resolved = candidates.find((value) => typeof value === 'string' && value.trim());
  return resolved ? String(resolved).trim().slice(0, 120) : fallback;
};

export async function buildAndWriteOwnerBusinessHealthSnapshot(params: {
  db: FirebaseFirestore.Firestore;
  tId: string;
  sId: string;
  storeInfo: FirebaseFirestore.DocumentData;
  activeProjects: ActiveProjectEntry[];
  runAt: Date;
  businessDayEndTime?: string;
}): Promise<OwnerBusinessHealthBuildResult> {
  if (!FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH) {
    return { enabled: false, builderReadCount: 0, builderWriteCount: 0 };
  }

  const generatedAt = params.runAt.toISOString();
  const timeZone = resolveOptionalStoreString(params.storeInfo.timeZone, 80);
  const localDate = getBusinessAnalyticsDateKey(params.runAt, timeZone, params.businessDayEndTime);
  const analyticsBuild = FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX
    ? await buildOwnerBusinessAnalyticsIndex({
        db: params.db,
        tId: params.tId,
        sId: params.sId,
        localDate,
        generatedAt,
        activeProjects: params.activeProjects,
      })
    : null;
  const feedbackBuild = await buildOwnerBusinessFeedbackSummary({
    db: params.db,
    tId: params.tId,
    sId: params.sId,
    activeProjects: params.activeProjects,
    generatedAt,
    localDate,
    runAt: params.runAt,
    timeZone,
    businessDayEndTime: params.businessDayEndTime,
  });
  const healthBlocks = buildOwnerBusinessHealthBlocks({
    activeProjects: params.activeProjects,
    analytics: analyticsBuild?.doc,
    feedbackSummary: feedbackBuild.summary,
  });
  const sourceRefs = buildOwnerBusinessHealthSourceRefs({
    generatedAt,
    analyticsDocIds: analyticsBuild?.analyticsDocIds || [],
    activeProjects: params.activeProjects,
    feedbackSummary: feedbackBuild.summary,
    storeInfo: { ...params.storeInfo, storeId: params.sId },
  });
  const availablePeriods = Object.entries(analyticsBuild?.doc.periods || {})
    .filter(([, period]) => Boolean(period && period.status !== 'not_available'))
    .map(([periodKey]) => periodKey);
  const hasTopItem = Object.values(analyticsBuild?.doc.periods || {})
    .some((period) => Boolean(period?.topItems?.length));
  const supportedDomains = [
    'business_health',
    ...(analyticsBuild ? ['analytics'] : []),
    ...(params.activeProjects.length > 0 ? ['menu'] : []),
    'feedback_reviews',
  ];
  const questions = buildOwnerBusinessHealthQuestions({
    availablePeriods,
    hasChecks: healthBlocks.checks.length > 0,
    hasTopItem,
    limit: 6,
    mode: 'starter',
    supportedDomains,
  });
  const primaryPeriod = analyticsBuild?.doc.periods.today
    || analyticsBuild?.doc.periods.thisWeek
    || analyticsBuild?.doc.periods.last7Days
    || analyticsBuild?.doc.periods.yesterday;
  const analyticsIndexDocId = OWNER_BUSINESS_ASSISTANT_DOCS.getAnalyticsIndex(params.tId, params.sId);
  const noActionNeeded = healthBlocks.checks.length === 0;

  const current: OwnerBusinessHealthCurrentDoc = {
    version: 1,
    tId: params.tId,
    sId: params.sId,
    localDate,
    generatedAt,
    validThrough: new Date(params.runAt.getTime() + 36 * 60 * 60 * 1000).toISOString(),
    sourceWindow: {
      today: localDate,
      lastSettledDate: analyticsBuild?.doc.lastSettledLocalDate,
      timeZone,
    },
    status: healthBlocks.status,
    summary: {
      headline: healthBlocks.status === 'stable'
        ? 'Business looks stable'
        : healthBlocks.status === 'needs_review'
          ? 'Some checks need review'
          : 'A few things may need checking',
      ownerMessage: noActionNeeded
        ? 'MenuList did not find anything that needs action in the latest check.'
        : healthBlocks.checks.slice(0, 2).map((check) => check.message).join(' '),
      noActionNeeded,
      actionCount: healthBlocks.checks.length,
    },
    analyticsTeaser: primaryPeriod ? {
      today: {
        label: primaryPeriod.label,
        value: `${formatCount(primaryPeriod.metrics.menuVisits || 0)} visits`,
        sourceFactId: primaryPeriod.sourceFactIds[0],
      },
      thisWeek: analyticsBuild?.doc.periods.thisWeek ? {
        label: 'This week',
        value: `${formatCount(analyticsBuild.doc.periods.thisWeek.metrics.menuVisits || 0)} visits`,
        sourceFactId: analyticsBuild.doc.periods.thisWeek.sourceFactIds[0],
      } : undefined,
      topItem: primaryPeriod.topItems?.[0] ? {
        label: 'Top item',
        value: primaryPeriod.topItems[0].name || primaryPeriod.topItems[0].itemId,
        deltaLabel: `${formatCount(primaryPeriod.topItems[0].value)} ${primaryPeriod.topItems[0].signal}`,
        sourceFactId: primaryPeriod.sourceFactIds[0],
      } : undefined,
      analyticsIndexDocId,
    } : undefined,
    feedbackSummary: feedbackBuild.summary,
    blocks: healthBlocks.blocks,
    suggestedChecks: healthBlocks.checks,
    suggestedQuestions: questions,
    supportedIntents: Array.from(new Set(questions.map((question) => question.intent).concat(['business_status']))),
    supportedDomains: [
      { domain: 'business_health', status: 'supported', sourceFactIds: ['projects_summary'] },
      { domain: 'analytics', status: analyticsBuild ? 'supported' : 'unsupported', sourceFactIds: analyticsBuild?.doc.sourceRefs.map((ref) => ref.id) || [] },
      { domain: 'menu', status: params.activeProjects.length > 0 ? 'supported' : 'summary_only', sourceFactIds: ['projects_summary'] },
      { domain: 'feedback_reviews', status: 'supported', sourceFactIds: feedbackBuild.summary.sourceFactIds },
    ],
    unsupportedData: analyticsBuild ? {} : { analytics: 'not_enabled' },
    sourceRefs,
    cost: {
      builderReadCount: (analyticsBuild?.readCount || 0) + feedbackBuild.readCount,
      builderWriteCount: analyticsBuild ? 4 : 3,
      chatHotPathReadCount: analyticsBuild ? 2 : 1,
    },
  };
  const topCheck = healthBlocks.checks[0];
  const locationSummary = {
    sId: params.sId,
    storeName: resolveStoreName(params.storeInfo, `Store ${params.sId}`),
    status: current.status,
    actionCount: current.summary.actionCount,
    lastCheckedAt: generatedAt,
    localDate,
    topReason: topCheck?.message || current.summary.ownerMessage,
    sourceFactIds: (topCheck?.sourceFactIds?.length ? topCheck.sourceFactIds : sourceRefs.map((ref) => ref.id)).slice(0, 8),
  };

  const writeResult = await writeOwnerBusinessHealthDocs({
    db: params.db,
    tId: params.tId,
    sId: params.sId,
    localDate,
    current,
    analytics: analyticsBuild?.doc,
    locationSummary,
  });

  return {
    enabled: true,
    currentDocId: writeResult.currentDocId,
    analyticsIndexDocId: writeResult.analyticsIndexDocId,
    snapshotDocId: writeResult.snapshotDocId,
    builderReadCount: (analyticsBuild?.readCount || 0) + feedbackBuild.readCount,
    builderWriteCount: writeResult.writeCount,
    status: current.status,
  };
}
