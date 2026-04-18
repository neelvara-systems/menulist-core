'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { updateStore } from '@database/stores';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { getHoursConfidenceState } from '@lib/outputControl';
import { generateStickerPNG } from '@lib/physical-surfaces/stickerGenerator';
import { generateTentCardPDF } from '@lib/physical-surfaces/tentCardGenerator';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuAlertTriangle, LuBarChart3, LuClock, LuDownload, LuEye, LuMessageCircle, LuPower, LuPowerOff, LuSticker, LuTent, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, Input, List, Popup, Tag, Text, Title, Toast } from '../antd';

type TodayStatus = 'open' | 'closed_today';

const getTodayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
const getTodayTimeRange = (value?: string) => {
    if (!value || value.toLowerCase() === 'closed') {
        return { closeTime: '', isClosed: true, openTime: '' };
    }

    const [openRaw = '', closeRaw = ''] = value.split('-');
    const openTime = openRaw.slice(0, 5);
    const closeTime = closeRaw.slice(0, 5);

    if (!openTime || !closeTime) {
        return { closeTime: '', isClosed: true, openTime: '' };
    }

    return { closeTime, isClosed: false, openTime };
};

interface MobileHoursScreenProps {
    onOpenDashboard?: () => void;
}

export default function MobileHoursScreen({ onOpenDashboard }: MobileHoursScreenProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileHours');
    const tToday = useTranslations('MobileToday');
    const tDesign = useTranslations('MobileDesignEditor');
    const tMore = useTranslations('MobileMore');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const currentTempStatus = storeDetails?.tempStatus;
    const isTempActive = currentTempStatus && new Date(currentTempStatus.expiresAt).getTime() > Date.now();
    const [isUpdating, setIsUpdating] = useState(false);
    const [originalTodayHours, setOriginalTodayHours] = useState<string | null>(null);
    const todayKey = getTodayKey();
    const { todayCampaigns, staffPrompt, physicalSurfaces, isLoading: isCampaignsLoading, mutate } = useTodayCampaigns();
    const [isCampaignProcessing, setIsCampaignProcessing] = useState(false);
    const [isNudgeDismissed, setIsNudgeDismissed] = useState(false);
    const [nudgeInitialized, setNudgeInitialized] = useState(false);
    const [isDownloadingTent, setIsDownloadingTent] = useState(false);
    const [isDownloadingSticker, setIsDownloadingSticker] = useState(false);
    const [tempStatusType, setTempStatusType] = useState<string>('closed_today');
    const [customTempStatusMessage, setCustomTempStatusMessage] = useState('');
    const [tempStatusExpiryHours, setTempStatusExpiryHours] = useState<number>(12);
    const [isTempStatusLoading, setIsTempStatusLoading] = useState(false);
    const [isTodayHoursSheetOpen, setIsTodayHoursSheetOpen] = useState(false);
    const [isSavingTodayHours, setIsSavingTodayHours] = useState(false);
    const [todayOpenTime, setTodayOpenTime] = useState('');
    const [todayCloseTime, setTodayCloseTime] = useState('');
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

    useEffect(() => {
        const todayRange = getTodayTimeRange(storeDetails?.workingHours?.[todayKey]);
        setTodayOpenTime(todayRange.openTime);
        setTodayCloseTime(todayRange.closeTime);
    }, [storeDetails?.workingHours, todayKey]);

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
        ? { color: '#16a34a', icon: <LuPower color="#16a34a" size={18} />, label: t('open'), sublabel: 'Customers can currently view your menu.' }
        : { color: '#dc2626', icon: <LuPowerOff color="#dc2626" size={18} />, label: t('closedToday'), sublabel: t('customersSee') };
    const todayRange = getTodayTimeRange(storeDetails?.workingHours?.[todayKey]);
    const todayTimingsLabel = todayRange.isClosed
        ? t('closedToday')
        : `${todayRange.openTime} - ${todayRange.closeTime}`;
    const closeTodayCtaLabel = 'Mark Closed for Today';
    const reopenTodayCtaLabel = 'Mark Open for Today';

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

    const handleOpenHoursEditor = () => {
        window.location.hash = '#mobile/more/hoursEdit';
    };

    const handleSaveTodayHours = async () => {
        if (!storeDetails?.storeId) return;
        if (!todayOpenTime || !todayCloseTime) {
            Toast.show({ content: 'Please select both opening and closing time', duration: 1500 });
            return;
        }

        setIsSavingTodayHours(true);
        const previousHours = storeDetails.workingHours || {};
        const nextRange = `${todayOpenTime}-${todayCloseTime}`;
        const nextHours = { ...previousHours, [todayKey]: nextRange };
        setStoreDetails((previous: any) => ({ ...previous, workingHours: nextHours }));

        try {
            await updateStore({ ...storeDetails, workingHours: nextHours } as any);
            setIsTodayHoursSheetOpen(false);
            Toast.show({ content: 'Today timings updated', duration: 1400 });
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: previousHours }));
            Toast.show({ content: t('failedToUpdate'), duration: 1500 });
        } finally {
            setIsSavingTodayHours(false);
        }
    };

    const TEMP_STATUS_OPTIONS = [
        { value: 'closed_today', label: 'Closed Today', icon: '🔒', defaultMsg: 'Closed today' },
        { value: 'opening_late', label: 'Opening Late', icon: '🕐', defaultMsg: 'Opening late today' },
        { value: 'closing_early', label: 'Closing Early', icon: '🕕', defaultMsg: 'Closing early today' },
        { value: 'kitchen_closed', label: 'Kitchen Closed', icon: '🍳', defaultMsg: 'Kitchen is closed' },
        { value: 'special_menu', label: 'Special Menu', icon: '🍽️', defaultMsg: 'Special menu today' },
        { value: 'custom', label: 'Custom', icon: 'ℹ️', defaultMsg: '' },
    ] as const;
    const TEMP_STATUS_EXPIRY_OPTIONS = [
        { hours: 4, label: '4h' },
        { hours: 8, label: '8h' },
        { hours: 12, label: '12h' },
        { hours: 24, label: '24h' },
        { hours: 48, label: '2d' },
    ] as const;
    const tempStatusPreviewMessage = tempStatusType === 'custom'
        ? (customTempStatusMessage.trim() || 'Temporary notice')
        : (TEMP_STATUS_OPTIONS.find(o => o.value === tempStatusType)?.defaultMsg || tempStatusType);

    const handleSetTempStatus = async () => {
        setIsTempStatusLoading(true);
        const message = tempStatusPreviewMessage;
        const expiresAt = new Date(Date.now() + tempStatusExpiryHours * 60 * 60 * 1000).toISOString();
        const newStatus = { type: tempStatusType, message, expiresAt, createdAt: new Date().toISOString() };
        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => ({ ...prev, tempStatus: newStatus }));
        Toast.show({ content: 'Status set', icon: 'success', duration: 1500 });
        try {
            const res = await fetch('/api/store/temp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set',
                    type: tempStatusType,
                    expiresAt,
                    message: tempStatusType === 'custom' ? customTempStatusMessage.trim() : undefined,
                }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: 'Failed to set status', duration: 2000 });
        } finally {
            setIsTempStatusLoading(false);
        }
    };

    const handleClearTempStatus = async () => {
        setIsTempStatusLoading(true);
        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => { const { tempStatus, ...rest } = prev; return rest; });
        Toast.show({ content: 'Status cleared', icon: 'success', duration: 1500 });
        try {
            const res = await fetch('/api/store/temp-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) });
            if (!res.ok) throw new Error();
        } catch {
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: 'Failed to clear status', duration: 2000 });
        } finally {
            setIsTempStatusLoading(false);
        }
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
            <Card style={{ borderRadius: 20 }}>
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
                    <List.Item
                        arrow
                        description={<Text type="secondary">{tMore('editWorkingHoursDesc')}</Text>}
                        onClick={handleOpenHoursEditor}
                        prefix={<LuClock size={18} />}
                        title={<Text strong>{tMore('editWorkingHours')}</Text>}
                    />
                </List>
            </Card>

            <Card
                style={{
                    background: `linear-gradient(165deg, ${token.colorBgContainer} 0%, ${token.colorFillAlter} 60%, ${token.colorBgElevated} 100%)`,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 20,
                }}
            >
                <Flex align="center" gap={12} vertical>
                    <Flex align="center" gap={8} style={{ width: '100%' }}>
                        {status.icon}
                        <Title level={4} style={{ color: status.color, margin: 0 }}>{status.label}</Title>
                    </Flex>
                    <Text style={{ color: token.colorTextSecondary }}>{status.sublabel}</Text>
                    <Card size="small" style={{ width: '100%' }}>
                        <Flex gap={8} vertical>
                            <Flex align="center" justify="space-between">
                                <Text strong>Today&apos;s Timings</Text>
                                <Button
                                    fill="outline"
                                    onClick={() => setIsTodayHoursSheetOpen(true)}
                                    size="small"
                                    style={{
                                        borderRadius: 999,
                                        minHeight: 30,
                                        paddingInline: 12,
                                    }}
                                >
                                    Edit Timings
                                </Button>
                            </Flex>
                            <Text>{todayTimingsLabel}</Text>
                        </Flex>
                    </Card>
                    {todayStatus === 'open' ? (
                        <Button
                            block
                            color="warning"
                            fill="outline"
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
                            {closeTodayCtaLabel}
                        </Button>
                    ) : (
                        <Button block color="primary" loading={isUpdating} onClick={() => void handleReopenToday()} size="large">
                            {reopenTodayCtaLabel}
                        </Button>
                    )}
                    <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                        This updates today&apos;s status only.
                    </Text>
                </Flex>
            </Card>

            <Popup
                bodyStyle={{ maxHeight: '75vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => {
                    if (isSavingTodayHours) return;
                    setTodayOpenTime(todayRange.openTime);
                    setTodayCloseTime(todayRange.closeTime);
                    setIsTodayHoursSheetOpen(false);
                }}
                visible={isTodayHoursSheetOpen}
            >
                <Flex style={{ maxHeight: '75vh', overflow: 'hidden' }} vertical>
                    <Flex
                        align="center"
                        justify="space-between"
                        style={{
                            backgroundColor: token.colorBgContainer,
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            padding: '12px 14px',
                        }}
                    >
                        <Text strong>Edit Today&apos;s Timings</Text>
                        <Button
                            fill="none"
                            onClick={() => {
                                if (isSavingTodayHours) return;
                                setTodayOpenTime(todayRange.openTime);
                                setTodayCloseTime(todayRange.closeTime);
                                setIsTodayHoursSheetOpen(false);
                            }}
                            size="small"
                            style={{ minHeight: 32, minWidth: 32, paddingInline: 6 }}
                        >
                            ✕
                        </Button>
                    </Flex>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 14 }} vertical>
                        <Text type="secondary">Set opening and closing time for today only.</Text>
                        <Flex align="center" gap={8}>
                            <Flex style={{ flex: 1 }} vertical>
                                <Text type="secondary">Open</Text>
                                <Input onChange={setTodayOpenTime} type="time" value={todayOpenTime} />
                            </Flex>
                            <Flex style={{ flex: 1 }} vertical>
                                <Text type="secondary">Close</Text>
                                <Input onChange={setTodayCloseTime} type="time" value={todayCloseTime} />
                            </Flex>
                        </Flex>
                    </Flex>
                    <Flex
                        gap={8}
                        style={{
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            padding: 12,
                        }}
                    >
                        <Button
                            block
                            fill="outline"
                            onClick={() => {
                                setTodayOpenTime(todayRange.openTime);
                                setTodayCloseTime(todayRange.closeTime);
                                setIsTodayHoursSheetOpen(false);
                            }}
                            size="middle"
                        >
                            Cancel
                        </Button>
                        <Button
                            block
                            color="primary"
                            loading={isSavingTodayHours}
                            onClick={() => void handleSaveTodayHours()}
                            size="middle"
                        >
                            Save
                        </Button>
                    </Flex>
                </Flex>
            </Popup>

            {/* Temp Status Quick-Action — set "Closed Today" etc. right from Today tab */}
            {FEATURE_FLAGS.ENABLE_TEMP_STATUS && (
                <Card style={{ borderRadius: 20 }}>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuAlertTriangle color={token.colorWarning} size={16} />
                            <Text strong>Temporary Status</Text>
                            {isTempActive ? <Tag color="success">Active</Tag> : null}
                        </Flex>
                        {isTempActive && currentTempStatus ? (
                            <Flex gap={10} vertical>
                                <Card style={{ background: token.colorWarningBg, borderColor: token.colorWarningBorder }}>
                                    <Flex align="center" justify="space-between">
                                        <Flex gap={6} style={{ flex: 1, minWidth: 0 }} vertical>
                                            <Text strong>{`${TEMP_STATUS_OPTIONS.find(o => o.value === currentTempStatus.type)?.icon || 'ℹ️'} ${currentTempStatus.message}`}</Text>
                                            <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                                                Expires: {new Date(currentTempStatus.expiresAt).toLocaleString()}
                                            </Text>
                                        </Flex>
                                        <Button
                                            color="danger"
                                            fill="outline"
                                            loading={isTempStatusLoading}
                                            onClick={() => void handleClearTempStatus()}
                                            size="small"
                                            style={{
                                                alignSelf: 'flex-start',
                                                borderRadius: 10,
                                                flexShrink: 0,
                                                marginLeft: 10,
                                                minHeight: 30,
                                                paddingInline: 12,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    </Flex>
                                </Card>
                            </Flex>
                        ) : (
                            <Flex gap={10} vertical>
                                <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                                    Customers see this banner until the selected expiry time.
                                </Text>
                                <Flex gap={6} wrap="wrap">
                                    {TEMP_STATUS_OPTIONS.map(opt => (
                                        <Tag
                                            key={opt.value}
                                            color={tempStatusType === opt.value ? 'processing' : 'default'}
                                            onClick={() => setTempStatusType(opt.value)}
                                            style={{ cursor: 'pointer', padding: '6px 10px', fontSize: 13 }}
                                        >
                                            {`${opt.icon} ${opt.label}`}
                                        </Tag>
                                    ))}
                                </Flex>
                                {tempStatusType === 'custom' ? (
                                    <Flex gap={6} vertical>
                                        <Text strong>Custom Message</Text>
                                        <Input
                                            maxLength={100}
                                            onChange={setCustomTempStatusMessage}
                                            placeholder="Type your custom status"
                                            value={customTempStatusMessage}
                                        />
                                    </Flex>
                                ) : null}
                                <Flex gap={6} vertical>
                                    <Text strong>Expires After</Text>
                                    <Flex gap={6} wrap="wrap">
                                        {TEMP_STATUS_EXPIRY_OPTIONS.map((option) => (
                                            <Tag
                                                key={option.hours}
                                                color={tempStatusExpiryHours === option.hours ? 'processing' : 'default'}
                                                onClick={() => setTempStatusExpiryHours(option.hours)}
                                                style={{ cursor: 'pointer', padding: '6px 10px', fontSize: 13 }}
                                            >
                                                {option.label}
                                            </Tag>
                                        ))}
                                    </Flex>
                                </Flex>
                                <Card size="small" style={{ background: token.colorWarningBg, borderColor: token.colorWarningBorder }}>
                                    <Text strong>{`${TEMP_STATUS_OPTIONS.find(o => o.value === tempStatusType)?.icon || 'ℹ️'} ${tempStatusPreviewMessage}`}</Text>
                                </Card>
                                <Button block color="warning" loading={isTempStatusLoading} onClick={() => void handleSetTempStatus()} size="large">
                                    Apply Status
                                </Button>
                            </Flex>
                        )}
                    </Flex>
                </Card>
            )}

            {physicalSurfaces?.tentCard?.eligible ? (
                <Card style={{ borderRadius: 20 }}>
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
                <Card style={{ borderRadius: 20 }}>
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
                <Card size="small" style={{ backgroundColor: token.colorWarningBg, borderColor: token.colorWarningBorder, borderRadius: 16 }}>
                    <Flex align="flex-start" justify="space-between">
                        <Flex align="flex-start" gap={12} style={{ flex: 1 }}>
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    backgroundColor: token.colorWarningBg,
                                    flexShrink: 0,
                                }}
                            >
                                <LuClock color={token.colorWarning} size={18} />
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
                <Card style={{ borderRadius: 20 }}>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuMessageCircle color={token.colorPrimary} size={18} />
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
                <Card style={{ borderRadius: 20 }}>
                    <Flex gap={12}>
                        <LuMessageCircle color={token.colorInfo} size={18} />
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
                <Card style={{ borderRadius: 20 }} title={tToday('alsoToday')}>
                    <Flex gap={8} vertical>
                        {todayCampaigns.operational.slice(0, 2).map((campaign) => {
                            const title = campaign.type === 'now_available'
                                ? tToday('nowAvailable', { item: campaign.subject?.itemName || t('itemFallback') })
                                : (ACTION_TITLES[campaign.type] || 'Share')
                                    .replace('{itemName}', campaign.subject?.itemName || t('itemFallback'))
                                    .replace('{mealName}', mealName);

                            return (
                                <Card key={campaign.campaignId} style={{ borderRadius: 14 }}>
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

        </Flex>
    );
}
