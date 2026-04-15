'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { trackOBPShare } from '@lib/analytics/unified';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import { LuAlertTriangle, LuCalendarOff, LuCheck, LuClock, LuCopy, LuExternalLink, LuMessageCircle, LuSkipForward, LuX } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, NavBar, Tag, Text, Title, Toast } from '../antd';

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

export default function MobileTodayScreen({ onBack }: MobileTodayScreenProps) {
    const t = useTranslations('MobileToday');
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const { todayCampaigns, staffPrompt, isLoading, mutate } = useTodayCampaigns();
    const [isProcessing, setIsProcessing] = useState(false);
    const [postAction, setPostAction] = useState<'shared' | 'skipped' | null>(null);
    const [statusType, setStatusType] = useState<string>('closed_today');
    const [isTempStatusLoading, setIsTempStatusLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const obpUrl = useMemo(
        () => generateOBPUrl(storeDetails?.subdomain || storeDetails?.subDomain || '', storeDetails?.customDomain),
        [storeDetails?.subdomain, storeDetails?.subDomain, storeDetails?.customDomain]
    );

    const currentStatus = storeDetails?.tempStatus;
    const isTempActive = currentStatus && new Date(currentStatus.expiresAt).getTime() > Date.now();

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

    const handleCopyLink = useCallback(async () => {
        if (!obpUrl) return;
        try {
            await navigator.clipboard.writeText(obpUrl);
            setCopied(true);
            Toast.show({ content: 'Link copied', icon: 'success', duration: 1500 });
            setTimeout(() => setCopied(false), 2000);
            if (storeDetails?.storeId) trackOBPShare(storeDetails.storeId, 'copy_link').catch(() => { });
        } catch {
            Toast.show({ content: 'Could not copy', duration: 1500 });
        }
    }, [obpUrl, storeDetails?.storeId]);

    const handleWhatsApp = useCallback(() => {
        if (!obpUrl) return;
        const name = storeDetails?.name || 'our business';
        const msg = `${name} — menu, timings & contact:\n${obpUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        if (storeDetails?.storeId) trackOBPShare(storeDetails.storeId, 'whatsapp').catch(() => { });
    }, [obpUrl, storeDetails]);

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

                    {/* OBP Quick Share */}
                    {FEATURE_FLAGS.ENABLE_OBP && obpUrl && (
                        <Card>
                            <Flex gap={12} vertical>
                                <Flex align="center" gap={8}>
                                    <LuExternalLink color="#1677ff" size={16} />
                                    <Text strong>Your Business Link</Text>
                                </Flex>
                                <Text type="secondary" style={{ fontSize: 12 }}>{obpUrl}</Text>
                                <Flex gap={8}>
                                    <Button block color="primary" fill="outline" onClick={() => void handleCopyLink()} size="large">
                                        <Flex align="center" gap={6} justify="center">
                                            <LuCopy size={14} />
                                            <Text>{copied ? 'Copied!' : 'Copy Link'}</Text>
                                        </Flex>
                                    </Button>
                                    <Button block color="success" onClick={handleWhatsApp} size="large">
                                        <Text style={{ color: '#fff' }}>Send via WhatsApp</Text>
                                    </Button>
                                </Flex>
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
