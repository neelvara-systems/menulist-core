import type { ActiveProjectEntry, OwnerBusinessHealthSourceRef } from './types';

export function buildOwnerBusinessHealthSourceRefs(params: {
  generatedAt: string;
  analyticsDocIds: string[];
  activeProjects: ActiveProjectEntry[];
  storeInfo: FirebaseFirestore.DocumentData;
}): OwnerBusinessHealthSourceRef[] {
  const projectSource: OwnerBusinessHealthSourceRef = {
    id: 'projects_summary',
    source: 'Menu projects',
    docId: `projects_${params.storeInfo.storeId || params.storeInfo.sId || 'store'}`,
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
    {
      id: 'store_summary',
      source: 'Store settings',
      generatedAt: params.generatedAt,
      freshnessLabel: params.storeInfo.timeZone ? String(params.storeInfo.timeZone) : 'Store timezone not set',
    },
  ];
}
