import { useOwnerBusinessAnalyticsIndex } from './useOwnerBusinessAnalyticsIndex';
import { useOwnerBusinessHealthCurrent } from './useOwnerBusinessHealthCurrent';

export function useOwnerBusinessContextPacket(projectId?: string, storeScopeKey?: string | number) {
  const current = useOwnerBusinessHealthCurrent(projectId, storeScopeKey);
  const analytics = useOwnerBusinessAnalyticsIndex(projectId, storeScopeKey);

  return {
    current: current.current,
    analytics: analytics.analytics,
    isLoading: current.isLoading || analytics.isLoading,
    error: current.error || analytics.error,
    refresh: () => {
      current.refresh();
      analytics.refresh();
    },
  };
}
