/**
 * Shared hook for Today's campaigns — used by desktop + mobile
 *
 * Moved from: src/components/templates/main-app/today/hooks/useTodayCampaigns.ts
 * Reason: Pure SWR + DAL — no UI framework dependency. Both desktop TodayScreen
 * and MobileTodayScreen need this same data.
 *
 * Per Strategy Doc:
 * - Single read from summary document (Firebase cost optimization)
 * - Auto-revalidation on focus
 * - 30 second deduping to prevent excessive reads
 *
 * Now also returns staffPrompt for Staff Prompt Mode feature
 */

import { getTodayCampaigns, TodayScreenData } from '@database/campaigns';
import useSWR from 'swr';

export const useTodayCampaigns = () => {
    const { data, error, isLoading, mutate } = useSWR<TodayScreenData | null>(
        'today-campaigns',
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

/**
 * Generate campaigns for a specific project
 * Calls the API to analyze menu data and create campaigns
 */
export const generateCampaignsForProject = async (projectId: string, forceRefresh = false) => {
    const response = await fetch('/api/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, forceRefresh })
    });

    if (!response.ok) {
        throw new Error('Failed to generate campaigns');
    }

    return response.json();
};
