'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { updateStore } from '@database/stores';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { generateStickerPNG } from '@lib/physical-surfaces/stickerGenerator';
import { generateTentCardPDF } from '@lib/physical-surfaces/tentCardGenerator';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { getHoursConfidenceState } from '@lib/outputControl';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuBarChart3, LuCalendarCheck, LuClock, LuDownload, LuEye, LuMessageCircle, LuPower, LuPowerOff, LuSticker, LuTent, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, List, Text, Title, Toast } from '../antd';

type TodayStatus = 'open' | 'closed_today';

const getTodayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

interface MobileHoursScreenProps {
    onOpenDashboard?: () => void;
}

export default function MobileHoursScreen({ onOpenDashboard }: MobileHoursScreenProps) {
    const router = useRouter();
    const t = useTranslations('MobileHours');
    const tToday = useTranslations('MobileToday');
    const tDesign = useTranslations('MobileDesignEditor');
    const tMore = useTranslations('MobileMore');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isUpdating, setIsUpdating] = useState(false);
    const [originalTodayHours, setOriginalTodayHours] = useState<string | null>(null);
    const todayKey = getTodayKey();
    const { todayCampaigns, staffPrompt, physicalSurfaces, isLoading: isCampaignsLoading, mutate } = useTodayCampaigns();
    const [isCampaignProcessing, setIsCampaignProcessing] = useState(false);
    const [isNudgeDismissed, setIsNudgeDismissed] = useState(false);
    const [nudgeInitialized, setNudgeInitialized] = useState(false);
    const [isDownloadingTent, setIsDownloadingTent] = useState(false);
    const [isDownloadingSticker, setIsDownloadingSticker] = useState(false);
    const menuUrl = generateProjectUrl(
        storeDetails?.subdomain,
        storeDetails?.customDomain,
        undefined,
        true
    );

    useEffect(() => {
        if (!storeDetails?.storeId) return;
        const dismissKey = `hours_nudge_dismissed_${storeDetails.storeId}`;
        const dismissedAt = localStorage.getItem(dismissKey);
        if (dismissedAt) {
            const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismiss < 30) {
                setIsNudgeDismissed(true);
            }
        }
        setNudgeInitialized(true);
    }, [storeDetails?.storeId]);

    const todayStatus = useMemo((): TodayStatus => {
        const todayValue = storeDetails?.workingHours?.[todayKey];
        return !todayValue || todayValue.toLowerCase() === 'closed' ? 'closed_today' : 'open';
    }, [storeDetails?.workingHours, todayKey]);

    const handleCloseToday = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsUpdating(true);
        const currentHours = storeDetails.workingHours?.[todayKey] || '';
        setOriginalTodayHours(currentHours);

        const updatedHours = { ...storeDetails.workingHours, [todayKey]: '' };
        setStoreDetails((previous: any) => ({ ...previous, workingHours: updatedHours }));
        Toast.show({ content: t('closedForToday'), duration: 1500 });

        try {
            await updateStore({ ...storeDetails, workingHours: updatedHours } as any);
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: { ...storeDetails.workingHours, [todayKey]: currentHours } }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdating(false);
        }
    }, [setStoreDetails, storeDetails, t, todayKey]);

    const handleReopenToday = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsUpdating(true);
        const restoredHours = originalTodayHours || '09:00-22:00';
        const updatedHours = { ...storeDetails.workingHours, [todayKey]: restoredHours };
        setStoreDetails((previous: any) => ({ ...previous, workingHours: updatedHours }));
        Toast.show({ content: t('reopened'), duration: 1500 });

        try {
            await updateStore({ ...storeDetails, workingHours: updatedHours } as any);
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: { ...storeDetails.workingHours, [todayKey]: '' } }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdating(false);
        }
    }, [originalTodayHours, setStoreDetails, storeDetails, t, todayKey]);

    const handleCompleteCampaign = async (campaign: TodayCampaignSummary) => {
        setIsCampaignProcessing(true);
        try {
            const method = getExportMethod(campaign.primarySurface);
            await dbCompleteCampaign(campaign.campaignId, campaign.projectId, campaign.type, campaign.primarySurface, method);
            Toast.show({ content: tToday('done'), duration: 1500 });
            mutate();
        } catch {
            Toast.show({ content: tToday('failed'), duration: 2000 });
        } finally {
            setIsCampaignProcessing(false);
        }
    };

    const handleSkipCampaign = async (campaignId: string, type: CampaignType) => {
        setIsCampaignProcessing(true);
        try {
            await dbSkipCampaign(campaignId, type);
            Toast.show({ content: tToday('skipped'), duration: 1500 });
            mutate();
        } catch {
            Toast.show({ content: tToday('failedToSkip'), duration: 2000 });
        } finally {
            setIsCampaignProcessing(false);
        }
    };

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    const status = todayStatus === 'open'
        ? { color: '#16a34a', icon: <LuPower color="#16a34a" size={18} />, label: t('open'), sublabel: storeDetails.name || 'Your business' }
        : { color: '#dc2626', icon: <LuPowerOff color="#dc2626" size={18} />, label: t('closedToday'), sublabel: t('customersSee') };

    const hoursConfidence = FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL
        ? getHoursConfidenceState({
            workingHours: storeDetails.workingHours,
            hoursLastUpdatedAt: (storeDetails as any).hoursLastUpdatedAt || (storeDetails as any).modifiedOn,
            timeZone: storeDetails.timeZone,
        })
        : 'TRUSTED';

    const showHoursNudge = FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL
        && nudgeInitialized
        && !isNudgeDismissed
        && hoursConfidence !== 'TRUSTED';

    const nudgeHeading = hoursConfidence === 'RISKY' ? t('hoursRiskyHeading') : t('hoursNeedUpdatingHeading');
    const nudgeMessage = hoursConfidence === 'RISKY'
        ? t('hoursRiskyMessage')
        : t('hoursNeedUpdatingMessage');

    const handleDismissNudge = () => {
        if (!storeDetails?.storeId) return;
        setIsNudgeDismissed(true);
        const dismissKey = `hours_nudge_dismissed_${storeDetails.storeId}`;
        localStorage.setItem(dismissKey, Date.now().toString());
    };

    const primaryCampaign = FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED && !isCampaignsLoading
        ? (todayCampaigns?.primary as TodayCampaignSummary | undefined)
        : undefined;
    const mealName = primaryCampaign ? getMealName() : '';
    const primaryTitle = primaryCampaign
        ? (ACTION_TITLES[primaryCampaign.type] || 'Share this item')
            .replace('{itemName}', primaryCampaign.subject?.itemName || 'Item')
            .replace('{mealName}', mealName)
            .replace('{festivalName}', 'the occasion')
        : '';
    const primaryContext = primaryCampaign
        ? (CONTEXT_TEMPLATES[primaryCampaign.type] || '')
            .replace('{mealName}', mealName.toLowerCase())
            .replace('{festivalName}', 'the occasion')
        : '';

    const handleOpenPreview = () => {
        if (!menuUrl) {
            Toast.show({ content: t('failedToUpdate'), duration: 1500 });
            return;
        }
        window.open(menuUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadTentCard = async () => {
        const tentCard = physicalSurfaces?.tentCard;
        if (!tentCard?.eligible) return;
        setIsDownloadingTent(true);
        try {
            const blob = await generateTentCardPDF({
                itemName: tentCard.itemName || 'Item',
                templateId: tentCard.templateId,
                qrUrl: tentCard.qrUrl,
                size: 'A6',
                brandName: storeDetails?.name,
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'tent-card-a6.pdf';
            anchor.click();
            URL.revokeObjectURL(url);
            Toast.show({ content: t('tentCardDownloaded'), duration: 1500 });
        } catch {
            Toast.show({ content: t('tentCardDownloadFailed'), duration: 2000 });
        } finally {
            setIsDownloadingTent(false);
        }
    };

    const handleDownloadSticker = async () => {
        const sticker = physicalSurfaces?.counterSticker;
        if (!sticker?.eligible) return;
        setIsDownloadingSticker(true);
        try {
            const blob = await generateStickerPNG({
                itemName: sticker.itemName || 'Item',
                templateId: sticker.templateId,
                qrUrl: sticker.qrUrl,
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'counter-sticker.png';
            anchor.click();
            URL.revokeObjectURL(url);
            Toast.show({ content: t('stickerDownloaded'), duration: 1500 });
        } catch {
            Toast.show({ content: t('stickerDownloadFailed'), duration: 2000 });
        } finally {
            setIsDownloadingSticker(false);
        }
    };

    return (
        <Flex gap={12} style={{ padding: 16 }} vertical>
            <Card size="small">
                <Flex gap={4} vertical>
                    <Title level={4} style={{ margin: 0 }}>{tToday('title')}</Title>
                    <Text type="secondary">
                        {t('introDesc')}
                    </Text>
                </Flex>
            </Card>

            <Card>
                <List>
                    <List.Item
                        arrow
                        description={<Text type="secondary">{tMore('dashboardDesc')}</Text>}
                        onClick={onOpenDashboard}
                        prefix={<LuBarChart3 size={18} />}
                        title={<Text strong>{tMore('dashboard')}</Text>}
                    />
                    <List.Item
                        arrow
                        description={<Text type="secondary">{tMore('shareQrDesc')}</Text>}
                        onClick={handleOpenPreview}
                        prefix={<LuEye size={18} />}
                        title={<Text strong>{tDesign('preview')}</Text>}
                    />
                </List>
            </Card>

            <Card>
                <Flex align="center" gap={12} vertical>
                    <Flex align="center" gap={8}>
                        {status.icon}
                        <Title level={4} style={{ color: status.color, margin: 0 }}>{status.label}</Title>
                    </Flex>
                    <Text type="secondary">{status.sublabel}</Text>
                    {todayStatus === 'open' ? (
                        <Button
                            block
                            color="danger"
                            loading={isUpdating}
                            onClick={() => {
                                void Dialog.confirm({
                                    cancelText: t('cancel'),
                                    confirmText: t('close'),
                                    content: t('closeConfirm'),
                                    onConfirm: handleCloseToday,
                                });
                            }}
                            size="large"
                        >
                            {t('closeForToday')}
                        </Button>
                    ) : (
                        <Button block loading={isUpdating} onClick={() => void handleReopenToday()} size="large">
                            {t('reopenToday')}
                        </Button>
                    )}
                </Flex>
            </Card>

            {physicalSurfaces?.tentCard?.eligible ? (
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuTent size={18} />
                            <Text strong>{t('tableTentReady')}</Text>
                        </Flex>
                        <Text type="secondary">{t('tableTentReadyDesc')}</Text>
                        <Text type="secondary">{t('tableTentSize')}</Text>
                        <Button block loading={isDownloadingTent} onClick={() => void handleDownloadTentCard()}>
                            <Flex align="center" gap={6}>
                                <LuDownload size={14} />
                                <Text>{t('downloadTentCard')}</Text>
                            </Flex>
                        </Button>
                    </Flex>
                </Card>
            ) : null}

            {physicalSurfaces?.counterSticker?.eligible ? (
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuSticker size={18} />
                            <Text strong>{t('counterStickerReady')}</Text>
                        </Flex>
                        <Text type="secondary">{t('counterStickerReadyDesc')}</Text>
                        <Text type="secondary">{t('counterStickerSize')}</Text>
                        <Button block loading={isDownloadingSticker} onClick={() => void handleDownloadSticker()}>
                            <Flex align="center" gap={6}>
                                <LuDownload size={14} />
                                <Text>{t('downloadSticker')}</Text>
                            </Flex>
                        </Button>
                    </Flex>
                </Card>
            ) : null}

            {showHoursNudge ? (
                <Card size="small" style={{ backgroundColor: '#fffbe6', borderColor: '#ffe58f' }}>
                    <Flex align="flex-start" justify="space-between">
                        <Flex align="flex-start" gap={12} style={{ flex: 1 }}>
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    backgroundColor: '#fff7e6',
                                    flexShrink: 0,
                                }}
                            >
                                <LuClock color="#d48806" size={18} />
                            </Flex>
                            <Flex gap={4} style={{ flex: 1 }} vertical>
                                <Text strong>{nudgeHeading}</Text>
                                <Text type="secondary">{nudgeMessage}</Text>
                            </Flex>
                        </Flex>
                        <Button fill="none" onClick={handleDismissNudge} size="small" style={{ paddingInline: 6 }}>
                            <LuX size={14} />
                        </Button>
                    </Flex>
                </Card>
            ) : null}

            {primaryCampaign ? (
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuMessageCircle color="#2563eb" size={18} />
                            <Text strong>{tToday('todaysAction')}</Text>
                        </Flex>
                        <Text strong>{primaryTitle}</Text>
                        {primaryContext ? <Text type="secondary">{primaryContext}</Text> : null}
                        <Button block loading={isCampaignProcessing} onClick={() => void handleCompleteCampaign(primaryCampaign)} size="large">
                            {SURFACE_BUTTON_COPY[primaryCampaign.primarySurface] || tToday('share')}
                        </Button>
                        <Button
                            block
                            fill="none"
                            onClick={() => void handleSkipCampaign(primaryCampaign.campaignId, primaryCampaign.type)}
                            style={{ color: '#94a3b8' }}
                        >
                            <Text type="secondary">{tToday('skip')}</Text>
                        </Button>
                    </Flex>
                </Card>
            ) : null}

            {staffPrompt?.eligible ? (
                <Card>
                    <Flex gap={12}>
                        <LuMessageCircle color="#3b82f6" size={18} />
                        <Flex gap={4} vertical>
                            <Text type="secondary">{tToday('staffPromptForToday')}</Text>
                            <Text strong>{tToday('sayThisWhenCustomersAsk')}</Text>
                            <Text>&quot;{staffPrompt.text}&quot;</Text>
                            <Text type="secondary">{tToday('appliesToday')}</Text>
                        </Flex>
                    </Flex>
                </Card>
            ) : null}

            {todayCampaigns?.operational?.length ? (
                <Card title={tToday('alsoToday')}>
                    <Flex gap={8} vertical>
                        {todayCampaigns.operational.slice(0, 2).map((campaign) => {
                            const title = campaign.type === 'now_available'
                                ? tToday('nowAvailable', { item: campaign.subject?.itemName || t('itemFallback') })
                                : (ACTION_TITLES[campaign.type] || 'Share')
                                    .replace('{itemName}', campaign.subject?.itemName || t('itemFallback'))
                                    .replace('{mealName}', mealName);

                            return (
                                <Card key={campaign.campaignId}>
                                    <Flex align="center" justify="space-between">
                                        <Text strong>{title}</Text>
                                        <Button
                                            fill="outline"
                                            loading={isCampaignProcessing}
                                            onClick={() => void handleCompleteCampaign(campaign as TodayCampaignSummary)}
                                            size="small"
                                        >
                                            {tToday('share')}
                                        </Button>
                                    </Flex>
                                </Card>
                            );
                        })}
                    </Flex>
                </Card>
            ) : null}

            <Button
                block
                fill="none"
                onClick={() => router.push('/today/history')}
                style={{ justifyContent: 'center' }}
            >
                View past activity
            </Button>

        </Flex>
    );
}
