import { getAnalyticsData } from '@database/analytics';
import { AnalyticsData, AnalyticsDateRange } from '@lib/analytics/types';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useEffect, useState } from 'react';

/**
 * Custom hook for fetching analytics data
 * 
 * @param dateRange - Optional date range to fetch data for
 * @param projectId - Project ID to fetch analytics for
 * @returns Analytics data and loading state
 */
export const useAnalyticsData = (dateRange?: AnalyticsDateRange, projectId?: string) => {
  const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!storeDetails?.tenantId || !storeDetails?.storeId || !projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Use provided date range or default to last 7 days
        const startDate = dateRange?.startDate;
        const endDate = dateRange?.endDate;

        const analyticsData = await getAnalyticsData(
          storeDetails.tenantId,
          storeDetails.storeId,
          projectId,
          startDate,
          endDate
        );

        setData(analyticsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    storeDetails?.storeId,
    storeDetails?.tenantId,
    projectId,
    dateRange?.startDate,
    dateRange?.endDate
  ]);

  return { data, loading, error };
};

/**
 * Custom hook for fetching top items
 * 
 * @returns Top items data and loading state
 */
export const useTopItems = (limit: number = 10) => {
  const { data, loading, error } = useAnalyticsData();

  // Extract top items from summary data
  const topItems = data?.summary?.topItems?.slice(0, limit) || [];

  return { topItems, loading, error };
};

export default useAnalyticsData;
