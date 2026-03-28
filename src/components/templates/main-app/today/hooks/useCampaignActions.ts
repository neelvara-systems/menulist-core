import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
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
            return result;
        } catch (error) {
            console.error('Failed to complete campaign:', error);
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
            return result;
        } catch (error) {
            console.error('Failed to skip campaign:', error);
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
