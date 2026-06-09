import type {
  ActiveProjectEntry,
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessFeedbackSummary,
  OwnerBusinessHealthBlock,
  OwnerBusinessHealthCheck,
  OwnerBusinessHealthStatus,
} from './types';

const firstAvailablePeriod = (analytics?: OwnerBusinessAnalyticsIndexDoc) =>
  analytics?.periods.today
  || analytics?.periods.thisWeek
  || analytics?.periods.last7Days
  || analytics?.periods.yesterday
  || null;

export function buildOwnerBusinessHealthBlocks(params: {
  activeProjects: ActiveProjectEntry[];
  analytics?: OwnerBusinessAnalyticsIndexDoc;
  feedbackSummary?: OwnerBusinessFeedbackSummary;
}): {
  blocks: Record<string, OwnerBusinessHealthBlock>;
  checks: OwnerBusinessHealthCheck[];
  status: OwnerBusinessHealthStatus;
} {
  const checks: OwnerBusinessHealthCheck[] = [];
  const blocks: Record<string, OwnerBusinessHealthBlock> = {};
  const period = firstAvailablePeriod(params.analytics);
  const hasProjects = params.activeProjects.length > 0;
  const menuVisits = period?.metrics.menuVisits || 0;
  const unavailableTaps = period?.metrics.unavailableItemTaps || 0;
  const feedbackNeedsAttention = params.feedbackSummary?.periods.last30Days?.needsAttentionCount
    ?? params.feedbackSummary?.latestNeedsAttention.length
    ?? 0;
  const feedbackTotal = params.feedbackSummary?.periods.last30Days?.totalCount
    ?? params.feedbackSummary?.sampledCount
    ?? 0;
  const feedbackSourceFactIds = params.feedbackSummary?.sourceFactIds || [];

  blocks.publicTruth = {
    id: 'publicTruth',
    title: 'Public menu',
    status: hasProjects ? 'stable' : 'needs_review',
    message: hasProjects ? 'Your menu has an active public source.' : 'No active menu source was found.',
    sourceFactIds: ['projects_summary'],
    actionType: hasProjects ? undefined : 'navigate_menu',
  };

  blocks.analytics = {
    id: 'analytics',
    title: 'Customer attention',
    status: period ? (menuVisits > 0 ? 'stable' : 'watch') : 'insufficient_data',
    message: period
      ? (menuVisits > 0 ? `${menuVisits} menu visits are recorded for ${period.label.toLowerCase()}.` : 'Analytics are connected, but activity is low for the latest period.')
      : 'No settled analytics period is available yet.',
    sourceFactIds: period?.sourceFactIds || [],
    actionType: 'navigate_analytics',
  };

  blocks.menuAttention = {
    id: 'menuAttention',
    title: 'Item attention',
    status: period?.topItems?.length ? 'stable' : 'watch',
    message: period?.topItems?.length
      ? `${period.topItems[0].name || period.topItems[0].itemId} is getting the most item attention.`
      : 'MenuList does not yet have enough item attention data.',
    sourceFactIds: period?.sourceFactIds || [],
    actionType: period?.topItems?.length ? undefined : 'navigate_menu',
  };

  blocks.feedbackReviews = {
    id: 'feedbackReviews',
    title: 'Guest feedback',
    status: feedbackNeedsAttention > 0
      ? 'needs_review'
      : feedbackTotal > 0
        ? 'stable'
        : 'insufficient_data',
    message: feedbackNeedsAttention > 0
      ? `${feedbackNeedsAttention} guest feedback ${feedbackNeedsAttention === 1 ? 'item needs' : 'items need'} checking.`
      : feedbackTotal > 0
        ? 'No guest feedback needs attention in the latest check.'
        : 'No guest feedback was received in the latest feedback window.',
    sourceFactIds: feedbackSourceFactIds,
    actionType: feedbackNeedsAttention > 0 ? 'open_feedback_reviews' : undefined,
  };

  if (!hasProjects) {
    checks.push({
      id: 'no_active_projects',
      title: 'Check menu source',
      message: 'MenuList could not find an active menu source for this store.',
      priority: 'high',
      status: 'needs_review',
      actionType: 'navigate_menu',
      sourceFactIds: ['projects_summary'],
    });
  }

  if (period && menuVisits === 0) {
    checks.push({
      id: 'low_latest_activity',
      title: 'Check sharing links',
      message: 'Latest settled analytics show low customer activity.',
      priority: 'medium',
      status: 'watch',
      actionType: 'navigate_analytics',
      sourceFactIds: period.sourceFactIds,
    });
  }

  if (unavailableTaps > 0) {
    checks.push({
      id: 'unavailable_item_taps',
      title: 'Check unavailable items',
      message: `${unavailableTaps} taps happened on unavailable items.`,
      priority: 'medium',
      status: 'watch',
      actionType: 'navigate_menu',
      sourceFactIds: period?.sourceFactIds || [],
    });
  }

  if (feedbackNeedsAttention > 0) {
    const topTheme = params.feedbackSummary?.topThemes?.[0];
    checks.push({
      id: 'guest_feedback_needs_attention',
      title: 'Review guest feedback',
      message: topTheme
        ? `${feedbackNeedsAttention} guest feedback ${feedbackNeedsAttention === 1 ? 'item needs' : 'items need'} checking. Main theme: ${topTheme.label}.`
        : `${feedbackNeedsAttention} guest feedback ${feedbackNeedsAttention === 1 ? 'item needs' : 'items need'} checking.`,
      priority: 'high',
      status: 'needs_review',
      actionType: 'open_feedback_reviews',
      sourceFactIds: feedbackSourceFactIds,
    });
  }

  const status: OwnerBusinessHealthStatus = checks.some((check) => check.priority === 'high')
    ? 'needs_review'
    : checks.length > 0
      ? 'watch'
      : period || hasProjects
        ? 'stable'
        : 'insufficient_data';

  return { blocks, checks, status };
}
