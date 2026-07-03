import {
    assertCampaignCompleteSucceeded,
    assertCampaignSkipSucceeded,
    completeCampaign as dbCompleteCampaign,
    skipCampaign as dbSkipCampaign,
} from '@database/campaigns';
import { getBoundedCampaignStringContext, logCampaignFailure } from '@lib/campaigns/campaignDiagnostics';
import { CampaignType, ExecutionSurface, ExportMethod } from '@type/campaigns';
import { notification } from 'antd';
import { useState } from 'react';

/**
 * Hook for campaign actions (complete, skip)
 * Handles loading state and error notifications
 */
export const useCampaignActions = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const completeCampaign = async (
        campaignId: string,
        projectId: string,
        campaignType: CampaignType,
        surface: ExecutionSurface,
        method: ExportMethod,
        menuLinkWithTracking?: string
    ) => {
        setIsProcessing(true);
        try {
            const result = await dbCompleteCampaign(campaignId, projectId, campaignType, surface, method, menuLinkWithTracking);
            assertCampaignCompleteSucceeded(result, {
                campaignId,
                campaignType,
                method,
                projectId,
                surface,
            });
            return result;
        } catch (error) {
            logCampaignFailure('today_campaign_complete_failed', error, {
                ...getBoundedCampaignStringContext('campaignId', campaignId),
                ...getBoundedCampaignStringContext('projectId', projectId),
                ...getBoundedCampaignStringContext('campaignType', campaignType),
                ...getBoundedCampaignStringContext('surface', surface),
                ...getBoundedCampaignStringContext('method', method),
                hasTrackedMenuLink: Boolean(menuLinkWithTracking),
            });
            notification.error({
                message: 'Something went wrong',
                description: 'Please try again.',
                placement: 'bottomRight'
            });
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    const skipCampaign = async (campaignId: string, campaignType: CampaignType) => {
        setIsProcessing(true);
        try {
            const result = await dbSkipCampaign(campaignId, campaignType);
            assertCampaignSkipSucceeded(result, {
                campaignId,
                campaignType,
            });
            return result;
        } catch (error) {
            logCampaignFailure('today_campaign_skip_failed', error, {
                ...getBoundedCampaignStringContext('campaignId', campaignId),
                ...getBoundedCampaignStringContext('campaignType', campaignType),
            });
            notification.error({
                message: 'Something went wrong',
                description: 'Please try again.',
                placement: 'bottomRight'
            });
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        completeCampaign,
        skipCampaign,
        isProcessing
    };
};
