'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { updateStore } from '@database/stores';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuAlertTriangle, LuCalendarOff, LuCheck, LuClock, LuMessageCircle, LuSkipForward, LuX } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, NavBar, Tag, Text, Title, Toast } from '../antd';

interface MobileTodayScreenProps {
    onBack?: () => void;
}

const STATUS_OPTIONS = [
    { value: 'closed_today', label: 'Closed Today', icon: '🔒', defaultMsg: 'Closed today' },
    { value: 'opening_late', label: 'Opening Late', icon: '🕐', defaultMsg: 'Opening late today' },
    { value: 'closing_early', label: 'Closing Early', icon: '🕕', defaultMsg: 'Closing early today' },
    { value: 'kitchen_closed', label: 'Kitchen Closed', icon: '🍳', defaultMsg: 'Kitchen is closed' },
    { value: 'special_menu', label: 'Special Menu', icon: '🍽️', defaultMsg: 'Special menu available today' },
] as const;

const TODAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const getTodayKey = () => TODAY_KEYS[new Date().getDay()];

function getTodayTimeRange(value?: string) {
    const normalized = value?.trim() || '';
    if (!normalized || normalized.toLowerCase() === 'closed') {
        return { closeTime: '22:00', openTime: '09:00' };
    }
    const [openTime, closeTime] = normalized.split('-');
    return {
        openTime: /^\d{2}:\d{2}$/.test(openTime || '') ? openTime : '09:00',
        closeTime: /^\d{2}:\d{2}$/.test(closeTime || '') ? closeTime : '22:00',
    };
}

export default function MobileTodayScreen({ onBack }: MobileTodayScreenProps) {
    const t = useTranslations('MobileToday');
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const { todayCampaigns, staffPrompt, isLoading, mutate } = useTodayCampaigns();
    const [isProcessing, setIsProcessing] = useState(false);
    const [postAction, setPostAction] = useState<'shared' | 'skipped' | null>(null);
    const [statusType, setStatusType] = useState<string>('closed_today');
    const [isTempStatusLoading, setIsTempStatusLoading] = useState(false);
    const [isSavingTodayHours, setIsSavingTodayHours] = useState(false);
    const todayKey = getTodayKey();
    const todayRange = getTodayTimeRange(storeDetails?.workingHours?.[todayKey]);
    const [todayOpenTime, setTodayOpenTime] = useState(todayRange.openTime);
    const [todayCloseTime, setTodayCloseTime] = useState(todayRange.closeTime);

    const currentStatus = storeDetails?.tempStatus;
    const isTempActive = currentStatus && new Date(currentStatus.expiresAt).getTime() > Date.now();

    useEffect(() => {
        setTodayOpenTime(todayRange.openTime);
        setTodayCloseTime(todayRange.closeTime);
    }, [todayRange.closeTime, todayRange.openTime]);

    const saveTodayHours = useCallback(async () => {
        if (!storeDetails?.storeId || !storeDetails?.tenantId) return;
        const nextRange = `${todayOpenTime}-${todayCloseTime}`;
        const nextHours = { ...(storeDetails.workingHours || {}), [todayKey]: nextRange };
        setIsSavingTodayHours(true);
        setStoreDetails((previous: any) => ({ ...previous, workingHours: nextHours }));
        try {
            await updateStore({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                workingHours: nextHours,
            } as any);
            Toast.show({ content: 'Today timings updated', duration: 1400 });
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: storeDetails.workingHours }));
            Toast.show({ content: 'Failed to update timings', duration: 1800 });
        } finally {
            setIsSavingTodayHours(false);
        }
    }, [setStoreDetails, storeDetails, todayCloseTime, todayKey, todayOpenTime]);

    const handleSetTempStatus = useCallback(async () => {
        setIsTempStatusLoading(true);
        const selected = STATUS_OPTIONS.find(o => o.value === statusType);
        const message = selected?.defaultMsg || statusType;
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
        const newStatus = { type: statusType, message, expiresAt, createdAt: new Date().toISOString() };
        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => ({ ...prev, tempStatus: newStatus }));
        Toast.show({ content: 'Status set', icon: 'success', duration: 1500 });
        try {
            const res = await fetch('/api/store/temp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set', type: statusType, expiresAt }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: 'Failed to set status', duration: 2000 });
        } finally {
            setIsTempStatusLoading(false);
        }
    }, [statusType, storeDetails, setStoreDetails]);

    const handleClearTempStatus = useCallback(async () => {
        setIsTempStatusLoading(true);
        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => { const { tempStatus, ...rest } = prev; return rest; });
        Toast.show({ content: 'Status cleared', icon: 'success', duration: 1500 });
        try {
            const res = await fetch('/api/store/temp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: 'Failed to clear status', duration: 2000 });
        } finally {
            setIsTempStatusLoading(false);
        }
    }, [storeDetails, setStoreDetails]);

    const todayHoursCard = (
        <Card>
            <Flex gap={10} vertical>
                <Flex align="center" gap={8}>
                    <LuClock color="#6366f1" size={16} />
                    <Text strong>Today&apos;s Timings</Text>
                </Flex>
                <Flex gap={8}>
                    <Flex style={{ flex: 1 }} vertical>
                        <Text type="secondary">Open</Text>
                        <Input onChange={setTodayOpenTime} type="time" value={todayOpenTime} />
                    </Flex>
                    <Flex style={{ flex: 1 }} vertical>
                        <Text type="secondary">Close</Text>
                        <Input onChange={setTodayCloseTime} type="time" value={todayCloseTime} />
                    </Flex>
                </Flex>
                <Button
                    block
                    disabled={isSavingTodayHours || !todayOpenTime || !todayCloseTime}
                    fill="outline"
                    loading={isSavingTodayHours}
                    onClick={() => void saveTodayHours()}
                >
                    Save Today Timings
                </Button>
            </Flex>
        </Card>
    );

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
                {onBack ? <NavBar onBack={onBack}>{t('title')}</NavBar> : null}
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
                {onBack ? <NavBar onBack={onBack}>{t('title')}</NavBar> : null}
                <Flex align="center" flex={1} justify="center">
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    if (postAction) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                {onBack ? <NavBar onBack={onBack}>{t('title')}</NavBar> : null}
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
                {onBack ? <NavBar onBack={onBack}>{t('title')}</NavBar> : null}
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    {todayHoursCard}
                    {/* Status Banner */}
                    <Card style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <Flex align="center" gap={10}>
                            <LuCheck color="#16a34a" size={20} />
                            <Flex gap={2} vertical>
                                <Text strong style={{ color: '#15803d' }}>No actions right now</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Check back later for today&apos;s content suggestions.</Text>
                            </Flex>
                        </Flex>
                    </Card>

                    {/* Temp Status Quick-Action */}
                    {FEATURE_FLAGS.ENABLE_TEMP_STATUS && (
                        <Card>
                            <Flex gap={12} vertical>
                                <Flex align="center" gap={8}>
                                    <LuAlertTriangle color="#d97706" size={16} />
                                    <Text strong>Temporary Status</Text>
                                    {isTempActive && <Tag color="warning">Active</Tag>}
                                </Flex>
                                {isTempActive && currentStatus ? (
                                    <Flex gap={10} vertical>
                                        <Card style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
                                            <Flex align="center" gap={6}>
                                                <LuClock color="#ad6800" size={12} />
                                                <Text strong>{`${STATUS_OPTIONS.find(o => o.value === currentStatus.type)?.icon || 'ℹ️'} ${currentStatus.message}`}</Text>
                                            </Flex>
                                        </Card>
                                        <Button block color="danger" fill="outline" loading={isTempStatusLoading} onClick={() => void handleClearTempStatus()} size="large">
                                            <Flex align="center" gap={6} justify="center">
                                                <LuX size={14} />
                                                <Text>Clear Status</Text>
                                            </Flex>
                                        </Button>
                                    </Flex>
                                ) : (
                                    <Flex gap={10} vertical>
                                        <Text type="secondary" style={{ fontSize: 13 }}>Customers will see a banner on your page until it expires (12h).</Text>
                                        <Flex gap={6} wrap="wrap">
                                            {STATUS_OPTIONS.map(opt => (
                                                <Tag
                                                    key={opt.value}
                                                    color={statusType === opt.value ? 'warning' : 'default'}
                                                    onClick={() => setStatusType(opt.value)}
                                                    style={{ cursor: 'pointer', padding: '6px 10px', fontSize: 13 }}
                                                >
                                                    {`${opt.icon} ${opt.label}`}
                                                </Tag>
                                            ))}
                                        </Flex>
                                        <Button block color="warning" loading={isTempStatusLoading} onClick={() => void handleSetTempStatus()} size="large">
                                            Set Status
                                        </Button>
                                    </Flex>
                                )}
                            </Flex>
                        </Card>
                    )}

                </Flex>
            </Flex>
        );
    }

    const mealName = getMealName();
    const primary = todayCampaigns.primary as TodayCampaignSummary | undefined;
    const operational = (todayCampaigns.operational || []).slice(0, 2) as TodayCampaignSummary[];

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            {onBack ? <NavBar onBack={onBack}>{t('title')}</NavBar> : null}
            <Flex gap={12} style={{ padding: 16 }} vertical>
                {todayHoursCard}
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
                                <Text>&quot;{staffPrompt.text}&quot;</Text>
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
                                    ? t('nowAvailable', { item: campaign.subject?.itemName || 'Item' })
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
