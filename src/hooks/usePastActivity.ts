import { getCampaignHistory } from '@database/campaigns';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    getCampaignCacheScope,
    getPastActivityCacheKey,
    normalizeCampaignActivityDate,
} from '@lib/campaigns/campaignClientBoundary';
import { Campaign } from '@type/campaigns';
import { useMemo } from 'react';
import useSWR from 'swr';

const SWR_CONFIG = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000,
};

export function usePastActivity(projectId?: string | null) {
    const session = useClientAuthSession();
    const cacheScope = getCampaignCacheScope(session);
    const cacheKey = getPastActivityCacheKey(cacheScope, projectId);
    const { data, error, isLoading, mutate } = useSWR<Campaign[]>(
        cacheKey,
        () => getCampaignHistory(20, projectId),
        SWR_CONFIG,
    );

    const campaigns = useMemo(() => {
        const history = data || [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return history.filter((campaign) => {
            const activityDate = normalizeCampaignActivityDate(campaign.resolvedAt)
                || normalizeCampaignActivityDate(campaign.updatedAt)
                || normalizeCampaignActivityDate(campaign.createdAt);
            if (!activityDate) return false;
            return activityDate >= sevenDaysAgo;
        });
    }, [data]);

    return {
        campaigns,
        error,
        isLoading,
        mutate,
    };
}
