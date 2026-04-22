'use client'

import { FEATURE_FLAGS } from '@config/features';
import { TODAY_FEATURE_GUIDE_SECTIONS, TODAY_FEATURE_GUIDE_TITLE } from '@constant/todayFeatureGuide';
import { completeCampaign as dbCompleteCampaign, getCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { updateStore } from '@database/stores';
import { generateCampaignsForProject, useTodayCampaigns } from '@hook/useTodayCampaigns';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getHoursConfidenceState } from '@lib/outputControl';
import { buildTodayMenuLink, performTodaySurfaceAction } from '@lib/campaigns/todayActionExecutor';
import { generateStickerPNG } from '@lib/physical-surfaces/stickerGenerator';
import { generateTentCardPDF } from '@lib/physical-surfaces/tentCardGenerator';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName, getShortButtonText } from '@util/campaignUtils';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuAlertTriangle, LuBarChart3, LuClock, LuDownload, LuEye, LuInfo, LuMessageCircle, LuPower, LuPowerOff, LuQrCode, LuSticker, LuTent, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, Input, List, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileTempStatusConfigurator, {
    MOBILE_TEMP_STATUS_EXPIRY_OPTIONS,
    MOBILE_TEMP_STATUS_OPTIONS,
    getDefaultTempStatusDateTime,
} from '../components/MobileTempStatusConfigurator';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

type TodayStatus = 'open' | 'closed_today' | 'closed_after_hours';

const getTodayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
const parseTimeToMinutes = (value?: string): number | null => {
    if (!value) return null;
    const [hoursRaw, minutesRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
};

const getCurrentMinutesForTimeZone = (timeZone?: string): number => {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            hour12: false,
            minute: '2-digit',
            timeZone: timeZone || undefined,
        }).formatToParts(new Date());
        const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
        const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
            throw new Error('invalid time parts');
        }
        return hour * 60 + minute;
    } catch {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }
};

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
    onOpenHistory?: () => void;
    onOpenShare?: () => void;
}

export default function MobileHoursScreen({ onOpenDashboard, onOpenHistory, onOpenShare }: MobileHoursScreenProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileHours');
    const tToday = useTranslations('MobileToday');
    const tDesign = useTranslations('MobileDesignEditor');
    const tMore = useTranslations('MobileMore');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const dispatch = useAppDispatch();
    const { selectedProjectId, selectedProjectSummary } = useMobileProjects();
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
    const [selectedTempStatusExpiryHours, setSelectedTempStatusExpiryHours] = useState<number | null>(12);
    const [exactTempStatusExpiryAt, setExactTempStatusExpiryAt] = useState<string>(() => getDefaultTempStatusDateTime(12));
    const [isTempStatusLoading, setIsTempStatusLoading] = useState(false);
    const [isTodayHoursSheetOpen, setIsTodayHoursSheetOpen] = useState(false);
    const [isSavingTodayHours, setIsSavingTodayHours] = useState(false);
    const [isGeneratingTodayActions, setIsGeneratingTodayActions] = useState(false);
    const [isTodayGuideOpen, setIsTodayGuideOpen] = useState(false);
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
        if (!todayValue || todayValue.toLowerCase() === 'closed') {
            return 'closed_today';
        }

        const todayRange = getTodayTimeRange(todayValue);
        if (todayRange.isClosed) {
            return 'closed_today';
        }

        const openMinutes = parseTimeToMinutes(todayRange.openTime);
        const closeMinutes = parseTimeToMinutes(todayRange.closeTime);
        if (openMinutes === null || closeMinutes === null) {
            return 'closed_today';
        }

        const currentMinutes = getCurrentMinutesForTimeZone(storeDetails?.timeZone);
        const isOvernight = closeMinutes <= openMinutes;
        const isOpenNow = isOvernight
            ? (currentMinutes >= openMinutes || currentMinutes < closeMinutes)
            : (currentMinutes >= openMinutes && currentMinutes < closeMinutes);

        if (isOpenNow) return 'open';
        if (!isOvernight && currentMinutes >= closeMinutes) return 'closed_after_hours';
        return 'closed_today';
    }, [storeDetails?.timeZone, storeDetails?.workingHours, todayKey]);

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
            const menuLink = buildTodayMenuLink(
                storeDetails?.subdomain,
                storeDetails?.customDomain,
                selectedProjectSummary?.name,
            );
            const fullCampaign = campaign.primarySurface === 'whatsapp_status' || campaign.primarySurface === 'whatsapp_message'
                ? null
                : await getCampaign(campaign.campaignId);
            const actionFeedback = await performTodaySurfaceAction({
                surface: campaign.primarySurface,
                itemName: campaign.subject?.itemName || 'Item',
                menuLink,
                imageUrl: fullCampaign?.assets?.imageUrl,
            });
            const method = getExportMethod(campaign.primarySurface);
            const result = await dbCompleteCampaign(campaign.campaignId, campaign.projectId, campaign.type, campaign.primarySurface, method);
            if (result?.today) {
                await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            }
            Toast.show({ content: actionFeedback.title, duration: 1800 });
        } catch {
            Toast.show({ content: tToday('failed'), duration: 2000 });
        } finally {
            setIsCampaignProcessing(false);
        }
    };

    const handleSkipCampaign = async (campaignId: string, type: CampaignType) => {
        setIsCampaignProcessing(true);
        try {
            const result = await dbSkipCampaign(campaignId, type);
            if (result?.today) {
                await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            }
            Toast.show({ content: tToday('skipped'), duration: 1500 });
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
        : todayStatus === 'closed_after_hours'
            ? { color: '#dc2626', icon: <LuPowerOff color="#dc2626" size={18} />, label: t('closedToday'), sublabel: 'Today’s serving time is over. Update timings if you are still open.' }
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
    const hasOperationalCampaigns = Boolean(todayCampaigns?.operational?.length);
    const hasAnyTodayCampaign = Boolean(primaryCampaign || hasOperationalCampaigns);
    const shouldShowGenerateTodayAction = FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED && !isCampaignsLoading && !hasAnyTodayCampaign;
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

    const handleGenerateTodayActions = async () => {
        if (!selectedProjectId) {
            Toast.show({ content: 'Select a project from Menu tab to generate today action.', duration: 1800 });
            return;
        }

        setIsGeneratingTodayActions(true);
        dispatch(startLoader('Generating today action'));
        try {
            await generateCampaignsForProject(selectedProjectId, true);
            await mutate();
            Toast.show({ content: 'Today action generated', duration: 1400 });
        } catch {
            Toast.show({ content: tToday('failed'), duration: 1800 });
        } finally {
            dispatch(stopLoader('Generating today action'));
            setIsGeneratingTodayActions(false);
        }
    };

    const tempStatusPreviewMessage = tempStatusType === 'custom'
        ? (customTempStatusMessage.trim() || 'Temporary notice')
        : (MOBILE_TEMP_STATUS_OPTIONS.find((option) => option.value === tempStatusType)?.defaultMsg || tempStatusType);

    const handleSetTempStatus = async () => {
        const exactExpiryDate = new Date(exactTempStatusExpiryAt);
        if (!exactTempStatusExpiryAt || Number.isNaN(exactExpiryDate.getTime()) || exactExpiryDate.getTime() <= Date.now()) {
            Toast.show({ content: 'Choose a future end date and time.', duration: 2000 });
            return;
        }

        setIsTempStatusLoading(true);
        const message = tempStatusPreviewMessage;
        const expiresAt = exactExpiryDate.toISOString();
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
            <Flex align="center" justify="space-between">
                <Title level={4} style={{ margin: 0 }}>Today</Title>
                <Button
                    fill="none"
                    onClick={() => setIsTodayGuideOpen(true)}
                    size="small"
                    style={{ minHeight: 32, minWidth: 32, paddingInline: 6 }}
                >
                    <Flex align="center" gap={6}>
                        <LuInfo size={16} />
                        <Text type="secondary">What is this?</Text>
                    </Flex>
                </Button>
            </Flex>

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
                        onClick={onOpenShare}
                        prefix={<LuQrCode size={18} />}
                        title={<Text strong>{tMore('shareQr')}</Text>}
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
                        description={<Text type="secondary">Review today actions completed or skipped in the last 7 days.</Text>}
                        onClick={onOpenHistory}
                        prefix={<LuClock size={18} />}
                        title={<Text strong>Past Activity</Text>}
                    />
                </List>
            </Card>

            <Card style={{ borderRadius: 20 }}>
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
                            color="danger"
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
                            style={{ minHeight: 44 }}
                        >
                            {closeTodayCtaLabel}
                        </Button>
                    ) : (
                        <Button block color="primary" loading={isUpdating} onClick={() => void handleReopenToday()} size="large" style={{ minHeight: 44 }}>
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
                        <MobileTempStatusConfigurator
                            activeStatusLabel="Temporary Status Active"
                            activeTagLabel="Active"
                            clearStatusLabel="Clear"
                            exactExpiryAt={exactTempStatusExpiryAt}
                            exactExpiryLabel="Ends At"
                            currentStatus={currentTempStatus}
                            customMessage={customTempStatusMessage}
                            customMessageLabel="Custom Message"
                            customPlaceholder="Type your custom status"
                            expiryLabel="Expires After"
                            expiresLabel="Expires:"
                            expiryOptions={MOBILE_TEMP_STATUS_EXPIRY_OPTIONS}
                            isActive={Boolean(isTempActive)}
                            isLoading={isTempStatusLoading}
                            onClear={() => void handleClearTempStatus()}
                            onExactExpiryAtChange={(value) => {
                                setExactTempStatusExpiryAt(value);
                                setSelectedTempStatusExpiryHours(null);
                            }}
                            onCustomMessageChange={setCustomTempStatusMessage}
                            onExpiryHoursChange={(value) => {
                                setSelectedTempStatusExpiryHours(value);
                                setExactTempStatusExpiryAt(getDefaultTempStatusDateTime(value));
                            }}
                            onSet={() => void handleSetTempStatus()}
                            onStatusTypeChange={setTempStatusType}
                            previewLabel="Preview"
                            previewMessage={tempStatusPreviewMessage}
                            selectedExpiryHours={selectedTempStatusExpiryHours}
                            setButtonColor="primary"
                            setStatusLabel="Apply Status"
                            showActiveHeader={false}
                            activeCardVariant="default"
                            statusOptions={MOBILE_TEMP_STATUS_OPTIONS}
                            statusType={tempStatusType}
                            statusTypeLabel="Status Type"
                        />
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
                        <Text type="secondary">This is the main thing MenuList prepared for today.</Text>
                        <Text strong>{primaryTitle}</Text>
                        {primaryContext ? <Text type="secondary">{primaryContext}</Text> : null}
                        <Text>Tap the button to open the ready output and mark this action handled.</Text>
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

            {shouldShowGenerateTodayAction ? (
                <Card style={{ borderRadius: 20 }}>
                    <Flex gap={10} vertical>
                        <Text strong>No today action yet</Text>
                        <Text type="secondary">Generate one suggested action and share it in one tap.</Text>
                        <Button
                            block
                            color="primary"
                            disabled={!selectedProjectId}
                            loading={isGeneratingTodayActions}
                            onClick={() => void handleGenerateTodayActions()}
                            size="large"
                            style={{ minHeight: 44 }}
                        >
                            Generate Today Action
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
                <Card style={{ borderRadius: 20 }} title="Extra actions for today">
                    <Flex gap={8} vertical>
                        <Text type="secondary">Extra ready actions for today. Tap one to open it and mark it handled.</Text>
                        {todayCampaigns.operational.slice(0, 2).map((campaign) => {
                            const title = campaign.type === 'now_available'
                                ? tToday('nowAvailable', { item: campaign.subject?.itemName || t('itemFallback') })
                                : (ACTION_TITLES[campaign.type] || 'Share')
                                    .replace('{itemName}', campaign.subject?.itemName || t('itemFallback'))
                                    .replace('{mealName}', mealName);

                            return (
                                <Card key={campaign.campaignId} style={{ borderRadius: 14 }}>
                                    <Flex gap={8} vertical>
                                        <Text strong>{title}</Text>
                                        <Text type="secondary">This is an extra action, not the main one for today.</Text>
                                        <Flex justify="end">
                                            <Button
                                                fill="outline"
                                                loading={isCampaignProcessing}
                                                onClick={() => void handleCompleteCampaign(campaign as TodayCampaignSummary)}
                                                size="small"
                                            >
                                                {getShortButtonText(campaign.primarySurface)}
                                            </Button>
                                        </Flex>
                                    </Flex>
                                </Card>
                            );
                        })}
                    </Flex>
                </Card>
            ) : null}

            <Popup
                bodyStyle={{ maxHeight: '78vh', overflowY: 'auto', paddingBottom: 12 }}
                onMaskClick={() => setIsTodayGuideOpen(false)}
                visible={isTodayGuideOpen}
            >
                <Flex gap={12} vertical>
                    <Flex align="center" justify="space-between">
                        <Text strong>{TODAY_FEATURE_GUIDE_TITLE}</Text>
                        <Button
                            fill="none"
                            onClick={() => setIsTodayGuideOpen(false)}
                            size="small"
                            style={{ minHeight: 32, minWidth: 32, paddingInline: 6 }}
                        >
                            ✕
                        </Button>
                    </Flex>
                    <Flex gap={10} vertical>
                        {TODAY_FEATURE_GUIDE_SECTIONS.map((section) => (
                            <Card key={section.title}>
                                <Flex gap={4} vertical>
                                    <Text strong>{section.title}</Text>
                                    <Text type="secondary">{section.description}</Text>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
