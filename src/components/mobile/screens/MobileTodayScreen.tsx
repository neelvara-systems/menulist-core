'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { Button, Card, DotLoading, NavBar, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCalendarOff, LuCheck, LuMessageCircle, LuSkipForward } from 'react-icons/lu';

interface MobileTodayScreenProps {
    onBack: () => void;
}

/**
 * Mobile Today Screen — zero desktop dependency
 * 
 * Daily campaign actions: primary action + operational items.
 * WhatsApp share, skip, staff prompt — all from phone.
 * Uses same DAL: getTodayCampaigns, completeCampaign, skipCampaign
 */
export default function MobileTodayScreen({ onBack }: MobileTodayScreenProps) {
    const t = useTranslations('MobileToday');
    const { todayCampaigns, staffPrompt, isLoading, mutate } = useTodayCampaigns();
    const [isProcessing, setIsProcessing] = useState(false);
    const [postAction, setPostAction] = useState<'shared' | 'skipped' | null>(null);

    const handleComplete = async (campaign: TodayCampaignSummary) => {
        setIsProcessing(true);
        try {
            const method = getExportMethod(campaign.primarySurface);
            await dbCompleteCampaign(campaign.campaignId, campaign.projectId, campaign.type, campaign.primarySurface, method);
            setPostAction('shared');
            setTimeout(() => { setPostAction(null); mutate(); }, 2000);
        } catch {
            Toast.show({ content: t('failed'), duration: 2000 });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSkip = async (campaignId: string, type: CampaignType) => {
        setIsProcessing(true);
        try {
            await dbSkipCampaign(campaignId, type);
            mutate();
        } catch {
            Toast.show({ content: t('failedToSkip'), duration: 2000 });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
                    <LuCalendarOff size={36} className="text-gray-300" />
                    <p className="text-sm text-gray-500 text-center">{t('comingSoon')}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex items-center justify-center"><DotLoading color="primary" /></div>
            </div>
        );
    }

    // Post-action feedback
    if (postAction) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <LuCheck size={32} className="text-green-500" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {postAction === 'shared' ? t('done') : t('skipped')}
                    </p>
                </div>
            </div>
        );
    }

    // Empty state
    if (!todayCampaigns || todayCampaigns.isEmpty || (!todayCampaigns.primary && (!todayCampaigns.operational || todayCampaigns.operational.length === 0))) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
                    <LuCheck size={36} className="text-green-400" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('allDoneForToday')}</p>
                    <p className="text-sm text-gray-500 text-center">{t('noActionsNeeded')}</p>
                </div>
            </div>
        );
    }

    const mealName = getMealName();
    const primary = todayCampaigns.primary as TodayCampaignSummary | undefined;
    const operational = (todayCampaigns.operational || []).slice(0, 2) as TodayCampaignSummary[];

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>Today</NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {/* Primary Campaign Card */}
                {primary && (
                    <Card className="rounded-xl">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <LuCheck size={16} />
                                <span className="font-medium">
                                    {(ACTION_TITLES[primary.type] || 'Share this item')
                                        .replace('{itemName}', primary.subject?.itemName || 'Item')
                                        .replace('{mealName}', mealName)
                                        .replace('{festivalName}', 'the occasion')}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {primary.subject?.itemName || 'Menu Item'}
                            </h3>

                            <p className="text-sm text-gray-500">
                                {(CONTEXT_TEMPLATES[primary.type] || '')
                                    .replace('{mealName}', mealName.toLowerCase())
                                    .replace('{festivalName}', 'the occasion')}
                            </p>

                            <Button
                                block
                                color="primary"
                                fill="solid"
                                size="large"
                                loading={isProcessing}
                                onClick={() => handleComplete(primary)}
                                style={{ minHeight: '48px' }}
                            >
                                {SURFACE_BUTTON_COPY[primary.primarySurface] || 'Share'}
                            </Button>

                            <button
                                onClick={() => handleSkip(primary.campaignId, primary.type)}
                                disabled={isProcessing}
                                className="w-full text-center text-gray-400 text-sm py-2 active:text-gray-600 min-h-[44px]"
                            >
                                <LuSkipForward size={14} className="inline mr-1" /> {t('skip')}
                            </button>
                        </div>
                    </Card>
                )}

                {/* Staff Prompt */}
                {staffPrompt?.eligible && (
                    <Card className="rounded-xl" style={{ borderLeft: '3px solid #3b82f6' }}>
                        <div className="flex gap-3">
                            <LuMessageCircle size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400">{t('staffPromptForToday')}</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                    {t('sayThisWhenCustomersAsk')}
                                </p>
                                <p className="text-base font-medium italic text-gray-700 dark:text-gray-300 mt-1">
                                    &quot;{staffPrompt.text}&quot;
                                </p>
                                <p className="text-xs text-gray-400 mt-2">{t('appliesToday')}</p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Operational Campaigns */}
                {operational.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('alsoToday')}</p>
                        {operational.map((campaign) => {
                            const title = campaign.type === 'now_available'
                                ? `Now Available: ${campaign.subject?.itemName || 'Item'}`
                                : (ACTION_TITLES[campaign.type] || 'Share')
                                    .replace('{itemName}', campaign.subject?.itemName || 'Item')
                                    .replace('{mealName}', mealName);

                            return (
                                <Card key={campaign.campaignId} className="rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <LuCheck size={14} className="text-green-500 flex-shrink-0" />
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
                                        </div>
                                        <Button
                                            size="small"
                                            color="primary"
                                            fill="outline"
                                            loading={isProcessing}
                                            onClick={() => handleComplete(campaign)}
                                            style={{ minHeight: '36px', marginLeft: 8 }}
                                        >
                                            {t('share')}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
