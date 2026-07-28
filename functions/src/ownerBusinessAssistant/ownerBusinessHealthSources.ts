import type { ActiveProjectEntry, OwnerBusinessFeedbackSummary, OwnerBusinessHealthSourceRef } from './types';

function normalizeScopeId(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized.slice(0, 160) : null;
  }
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

export function buildOwnerBusinessHealthSourceRefs(params: {
  generatedAt: string;
  analyticsDocIds: string[];
  activeProjects: ActiveProjectEntry[];
  feedbackSummary?: OwnerBusinessFeedbackSummary;
  storeInfo: Record<string, unknown>;
}): OwnerBusinessHealthSourceRef[] {
  const storeScope = normalizeScopeId(params.storeInfo.storeId)
    || normalizeScopeId(params.storeInfo.sId)
    || 'store';
  const timeZone = typeof params.storeInfo.timeZone === 'string'
    ? params.storeInfo.timeZone.trim().slice(0, 120)
    : '';
  const projectSource: OwnerBusinessHealthSourceRef = {
    id: 'projects_summary',
    source: 'Menu projects',
    docId: `projects_${storeScope}`,
    generatedAt: params.generatedAt,
    freshnessLabel: 'Updated from nightly check',
  };

  const analyticsSources = params.analyticsDocIds.map((docId) => ({
    id: `analytics_${docId}`,
    source: 'Owner analytics',
    docId,
    generatedAt: params.generatedAt,
    freshnessLabel: 'Settled analytics',
  }));

  return [
    projectSource,
    ...analyticsSources,
    ...(params.feedbackSummary ? [{
      id: 'guest_feedback_summary',
      source: 'Guest feedback',
      docId: `guestFeedback_${storeScope}_summary`,
      generatedAt: params.generatedAt,
      freshnessLabel: 'Updated from latest Business Health check',
    }] : []),
    {
      id: 'store_summary',
      source: 'Store settings',
      generatedAt: params.generatedAt,
      freshnessLabel: timeZone || 'Store timezone not set',
    },
  ];
}
