import { getCampaignHistory } from '@database/campaigns';
import { Campaign } from '@type/campaigns';
import { useMemo } from 'react';
import useSWR from 'swr';

const SWR_CONFIG = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000,
};

export function usePastActivity(projectId?: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Campaign[]>(
        projectId ? ['past-activity', projectId] : null,
        () => getCampaignHistory(20, projectId),
        SWR_CONFIG,
    );

    const campaigns = useMemo(() => {
        const history = data || [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return history.filter((campaign) => {
            const activityDate = campaign.resolvedAt?.toDate() || campaign.updatedAt?.toDate() || campaign.createdAt?.toDate();
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
