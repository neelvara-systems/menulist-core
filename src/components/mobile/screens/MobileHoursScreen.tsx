'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { updateStore } from '@database/stores';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { getHoursConfidenceState } from '@lib/outputControl';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuClock, LuMessageCircle, LuPower, LuPowerOff, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, List, Text, Title, Toast } from '../antd';

type DayHours = {
    close: string;
    day: string;
    isClosed: boolean;
    open: string;
};

type TodayStatus = 'open' | 'closed_today';

const DAYS: { key: string; label: string }[] = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
];

const getTodayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

const format24to12 = (time24: string): string => {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export default function MobileHoursScreen() {
    const t = useTranslations('MobileHours');
    const tToday = useTranslations('MobileToday');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isUpdating, setIsUpdating] = useState(false);
    const [originalTodayHours, setOriginalTodayHours] = useState<string | null>(null);
    const todayKey = getTodayKey();
    const { todayCampaigns, isLoading: isCampaignsLoading, mutate } = useTodayCampaigns();
    const [isCampaignProcessing, setIsCampaignProcessing] = useState(false);
    const [isNudgeDismissed, setIsNudgeDismissed] = useState(false);
    const [nudgeInitialized, setNudgeInitialized] = useState(false);

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

    const weeklyHours = useMemo((): DayHours[] => {
        if (!storeDetails?.workingHours) {
            return DAYS.map(({ label }) => ({ close: '', day: label, isClosed: false, open: '' }));
        }

        return DAYS.map(({ key, label }) => {
            const hours = storeDetails.workingHours?.[key];
            if (!hours || hours.toLowerCase() === 'closed') {
                return { close: '', day: label, isClosed: true, open: '' };
            }

            const [open, close] = hours.split('-');
            return {
                close: close ? format24to12(close.trim()) : '',
                day: label,
                isClosed: false,
                open: open ? format24to12(open.trim()) : '',
            };
        });
    }, [storeDetails?.workingHours]);

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

    const nudgeHeading = hoursConfidence === 'RISKY' ? 'Hours may be outdated' : 'Hours need updating';
    const nudgeMessage = hoursConfidence === 'RISKY'
        ? 'Update your hours so customers see accurate open status.'
        : 'Add your hours so customers know when you are open.';

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

    return (
        <Flex gap={12} style={{ padding: 16 }} vertical>
            <Card>
                <Flex align="center" gap={8}>
                    <LuClock size={18} />
                    <Title level={4} style={{ margin: 0 }}>{t('title')}</Title>
                </Flex>
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
                            <Text strong>Today&apos;s action</Text>
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

            <Card title={t('weeklyHours')}>
                <List>
                    {weeklyHours.map((day) => (
                        <List.Item
                            description={<Text type="secondary">{day.isClosed ? t('closed') : `${day.open} - ${day.close}`}</Text>}
                            key={day.day}
                            title={<Text strong>{day.day}</Text>}
                        />
                    ))}
                </List>
            </Card>
        </Flex>
    );
}
