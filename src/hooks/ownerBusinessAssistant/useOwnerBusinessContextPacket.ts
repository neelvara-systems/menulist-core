import { useOwnerBusinessAnalyticsIndex } from './useOwnerBusinessAnalyticsIndex';
import { useOwnerBusinessHealthCurrent } from './useOwnerBusinessHealthCurrent';

export function useOwnerBusinessContextPacket(projectId?: string) {
  const current = useOwnerBusinessHealthCurrent(projectId);
  const analytics = useOwnerBusinessAnalyticsIndex(projectId);

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
