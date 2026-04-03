'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCalendarOff, LuCheck, LuMessageCircle, LuSkipForward } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, NavBar, Text, Title, Toast } from '../antd';

interface MobileTodayScreenProps {
    onBack: () => void;
}

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
            <Flex style={{ minHeight: '100%' }} vertical>
                <NavBar onBack={onBack}>{t('title')}</NavBar>
                <Flex align="center" flex={1} gap={12} justify="center" style={{ padding: 24 }} vertical>
                    <LuCalendarOff color="#d1d5db" size={36} />
                    <Text type="secondary">{t('comingSoon')}</Text>
                </Flex>
            </Flex>
        );
    }

    if (isLoading) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <NavBar onBack={onBack}>{t('title')}</NavBar>
                <Flex align="center" flex={1} justify="center">
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    if (postAction) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <NavBar onBack={onBack}>{t('title')}</NavBar>
                <Flex align="center" flex={1} gap={12} justify="center" vertical>
                    <Card style={{ borderRadius: '50%' }}>
                        <LuCheck color="#16a34a" size={32} />
                    </Card>
                    <Title level={4} style={{ margin: 0 }}>{postAction === 'shared' ? t('done') : t('skipped')}</Title>
                </Flex>
            </Flex>
        );
    }

    if (!todayCampaigns || todayCampaigns.isEmpty || (!todayCampaigns.primary && (!todayCampaigns.operational || todayCampaigns.operational.length === 0))) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <NavBar onBack={onBack}>{t('title')}</NavBar>
                <Flex align="center" flex={1} gap={12} justify="center" style={{ padding: 24 }} vertical>
                    <LuCheck color="#4ade80" size={36} />
                    <Title level={4} style={{ margin: 0 }}>{t('allDoneForToday')}</Title>
                    <Text type="secondary">{t('noActionsNeeded')}</Text>
                </Flex>
            </Flex>
        );
    }

    const mealName = getMealName();
    const primary = todayCampaigns.primary as TodayCampaignSummary | undefined;
    const operational = (todayCampaigns.operational || []).slice(0, 2) as TodayCampaignSummary[];

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack}>{t('title')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                {primary ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Text strong>
                                {(ACTION_TITLES[primary.type] || 'Share this item')
                                    .replace('{itemName}', primary.subject?.itemName || 'Item')
                                    .replace('{mealName}', mealName)
                                    .replace('{festivalName}', 'the occasion')}
                            </Text>
                            <Title level={3} style={{ margin: 0 }}>{primary.subject?.itemName || 'Menu Item'}</Title>
                            <Text type="secondary">
                                {(CONTEXT_TEMPLATES[primary.type] || '')
                                    .replace('{mealName}', mealName.toLowerCase())
                                    .replace('{festivalName}', 'the occasion')}
                            </Text>
                            <Button block loading={isProcessing} onClick={() => void handleComplete(primary)} size="large">
                                {SURFACE_BUTTON_COPY[primary.primarySurface] || 'Share'}
                            </Button>
                            <Button block fill="none" onClick={() => void handleSkip(primary.campaignId, primary.type)} style={{ color: '#94a3b8' }}>
                                <Flex align="center" gap={6}>
                                    <LuSkipForward size={14} />
                                    <Text type="secondary">{t('skip')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                ) : null}

                {staffPrompt?.eligible ? (
                    <Card>
                        <Flex gap={12}>
                            <LuMessageCircle color="#3b82f6" size={18} />
                            <Flex gap={4} vertical>
                                <Text type="secondary">{t('staffPromptForToday')}</Text>
                                <Text strong>{t('sayThisWhenCustomersAsk')}</Text>
                                <Text>"{staffPrompt.text}"</Text>
                                <Text type="secondary">{t('appliesToday')}</Text>
                            </Flex>
                        </Flex>
                    </Card>
                ) : null}

                {operational.length > 0 ? (
                    <Card title={t('alsoToday')}>
                        <Flex gap={8} vertical>
                            {operational.map((campaign) => {
                                const title = campaign.type === 'now_available'
                                    ? `Now Available: ${campaign.subject?.itemName || 'Item'}`
                                    : (ACTION_TITLES[campaign.type] || 'Share')
                                        .replace('{itemName}', campaign.subject?.itemName || 'Item')
                                        .replace('{mealName}', mealName);

                                return (
                                    <Card key={campaign.campaignId}>
                                        <Flex align="center" justify="space-between">
                                            <Text strong>{title}</Text>
                                            <Button fill="outline" loading={isProcessing} onClick={() => void handleComplete(campaign)} size="small">
                                                {t('share')}
                                            </Button>
                                        </Flex>
                                    </Card>
                                );
                            })}
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Flex>
    );
}
