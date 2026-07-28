/**
 * Shared hook for Today's campaigns — used by desktop + mobile
 *
 * Moved from: src/components/templates/main-app/today/hooks/useTodayCampaigns.ts
 * Reason: Pure SWR + DAL — no UI framework dependency. Both desktop TodayScreen
 * and MobileHoursScreen need this same data.
 *
 * Per Strategy Doc:
 * - Single read from summary document (Firebase cost optimization)
 * - Auto-revalidation on focus
 * - 30 second deduping to prevent excessive reads
 *
 * Now also returns staffPrompt for Staff Prompt Mode feature
 */

import { getTodayCampaigns, TodayScreenData } from '@database/campaigns';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getCampaignCacheScope, getTodayCampaignsCacheKey } from '@lib/campaigns/campaignClientBoundary';
import useSWR from 'swr';

export const useTodayCampaigns = () => {
    const session = useClientAuthSession();
    const cacheKey = getTodayCampaignsCacheKey(getCampaignCacheScope(session));
    const { data, error, isLoading, mutate } = useSWR<TodayScreenData | null>(
        cacheKey,
        getTodayCampaigns,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 30000, // 30 seconds
        }
    );

    return {
        todayCampaigns: data?.today,
        staffPrompt: data?.staffPrompt,
        physicalSurfaces: data?.physicalSurfaces,
        isLoading,
        isError: error,
        mutate
    };
};
