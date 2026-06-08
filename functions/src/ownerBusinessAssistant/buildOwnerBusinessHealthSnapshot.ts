import { FUNCTION_FLAGS } from '../constants/features';
import { getBusinessAnalyticsDateKey } from '../utils/businessDay';
import { OWNER_BUSINESS_ASSISTANT_DOCS } from './constants';
import { buildOwnerBusinessAnalyticsIndex } from './buildOwnerBusinessAnalyticsIndex';
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
  const localDate = getBusinessAnalyticsDateKey(params.runAt, params.storeInfo.timeZone, params.businessDayEndTime);
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
  const healthBlocks = buildOwnerBusinessHealthBlocks({
    activeProjects: params.activeProjects,
    analytics: analyticsBuild?.doc,
  });
  const sourceRefs = buildOwnerBusinessHealthSourceRefs({
    generatedAt,
    analyticsDocIds: analyticsBuild?.analyticsDocIds || [],
    activeProjects: params.activeProjects,
    storeInfo: { ...params.storeInfo, storeId: params.sId },
  });
  const questions = buildOwnerBusinessHealthQuestions().filter((question) => (
    question.id !== 'today_stats' || Boolean(analyticsBuild?.doc.periods.today)
  ));
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
      timeZone: params.storeInfo.timeZone,
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
    blocks: healthBlocks.blocks,
    suggestedChecks: healthBlocks.checks,
    suggestedQuestions: questions,
    supportedIntents: Array.from(new Set(questions.map((question) => question.intent).concat(['business_status']))),
    supportedDomains: [
      { domain: 'business_health', status: 'supported', sourceFactIds: ['projects_summary'] },
      { domain: 'analytics', status: analyticsBuild ? 'supported' : 'unsupported', sourceFactIds: analyticsBuild?.doc.sourceRefs.map((ref) => ref.id) || [] },
      { domain: 'menu', status: params.activeProjects.length > 0 ? 'supported' : 'summary_only', sourceFactIds: ['projects_summary'] },
    ],
    unsupportedData: analyticsBuild ? {} : { analytics: 'not_enabled' },
    sourceRefs,
    cost: {
      builderReadCount: analyticsBuild?.readCount || 0,
      builderWriteCount: analyticsBuild ? 3 : 2,
      chatHotPathReadCount: analyticsBuild ? 2 : 1,
    },
  };

  const writeResult = await writeOwnerBusinessHealthDocs({
    db: params.db,
    tId: params.tId,
    sId: params.sId,
    localDate,
    current,
    analytics: analyticsBuild?.doc,
  });

  return {
    enabled: true,
    currentDocId: writeResult.currentDocId,
    analyticsIndexDocId: writeResult.analyticsIndexDocId,
    snapshotDocId: writeResult.snapshotDocId,
    builderReadCount: analyticsBuild?.readCount || 0,
    builderWriteCount: writeResult.writeCount,
    status: current.status,
  };
}
