'use client'

import { FEATURE_FLAGS } from '@config/features';
import { TODAY_FEATURE_GUIDE_SECTIONS, TODAY_FEATURE_GUIDE_TITLE } from '@constant/todayFeatureGuide';
import {
    assertCampaignCompleteSucceeded,
    assertCampaignSkipSucceeded,
    completeCampaign as dbCompleteCampaign,
    getCampaign,
    skipCampaign as dbSkipCampaign,
} from '@database/campaigns';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { useGrowthOS } from '@hook/useGrowthOS';
import { useActiveTempStatus } from '@hook/useActiveTempStatus';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getHoursConfidenceState } from '@lib/outputControl';
import { getStoreDayKey, getStoreStatus, parseWorkingHoursRanges } from '@lib/hours/hoursEngine';
import { isValidClockRange } from '@lib/menu/timeSlotPresetBoundary';
import { buildTodayMenuLink, performTodaySurfaceAction } from '@lib/campaigns/todayActionExecutor';
import { getBoundedCampaignStringContext, logCampaignFailure } from '@lib/campaigns/campaignDiagnostics';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { shouldShowGrowthOSNavigation } from '@lib/growthos/entitlements';
import { getGrowthOSTodayTriggerState } from '@lib/growthos/todayTrigger';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { generateStickerPNG } from '@lib/physical-surfaces/stickerGenerator';
import { generateTentCardPDF } from '@lib/physical-surfaces/tentCardGenerator';
import { getInactiveItemsReminder, getInactiveReminderDismissKey } from '@lib/today/inactiveItemsReminder';
import { sortOperationalCampaignsByPriority } from '@lib/today/todayCampaignPrioritizer';
import { buildTodayWeeklyGrowthPack } from '@lib/today/weeklyGrowthPack';
import { readTempStatusResponse } from '@lib/tempStatus/clientResponse';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName, getShortButtonText } from '@util/campaignUtils';
import { formatDateTime, fromNativeDateTimeInputValue, toDate } from '@util/dateTime';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuAlertTriangle, LuBarChart3, LuClock, LuDownload, LuEye, LuInfo, LuMessageCircle, LuPower, LuPowerOff, LuQrCode, LuSticker, LuTent, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, Input, List, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileTempStatusConfigurator, {
    MOBILE_TEMP_STATUS_EXPIRY_OPTIONS,
    MOBILE_TEMP_STATUS_OPTIONS,
    getDefaultTempStatusDateTime,
} from '../components/MobileTempStatusConfigurator';
import GrowthKitsMobileCard from '../components/GrowthKitsMobileCard';
import TodayWeeklyGrowthPackCard from '../components/TodayWeeklyGrowthPackCard';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import { getBoundedMobileOwnerStringContext, getMobileOwnerStoreLogContext, logMobileOwnerFailure } from '../utils/mobileOwnerDiagnostics';
import { openMobilePublicLink } from '../utils/openMobilePublicLink';

type TodayStatus = 'open' | 'closed_today' | 'closed_after_hours';

const DAY_LABELS: Record<string, string> = {
    sun: 'Sunday',
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
};
const TEMP_CLOSED_TYPES = new Set(['closed_today', 'kitchen_closed']);

const toPluralLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

const buildTodayDigest = (
    hasPrimary: boolean,
    operationalCount: number,
    staffPromptEligible: boolean,
    hasMaintenanceCards: boolean,
) => {
    const parts: string[] = [];

    if (hasPrimary) {
        parts.push(toPluralLabel(1, 'main action', 'main actions'));
    }

    if (operationalCount > 0) {
        parts.push(toPluralLabel(operationalCount, 'extra action', 'extra actions'));
    }

    if (staffPromptEligible) {
        parts.push('staff prompt');
    }

    if (hasMaintenanceCards) {
        parts.push('maintenance cards');
    }

    if (!parts.length) {
        return '';
    }

    return `${parts.join(' · ')}.`;
};

const getTodayTimeRange = (value?: string) => {
    const range = parseWorkingHoursRanges(value)[0];
    if (!range) {
        return { closeTime: '', isClosed: true, openTime: '' };
    }
    return { closeTime: range.endTime, isClosed: false, openTime: range.startTime };
};

interface MobileHoursScreenProps {
    onOpenDashboard?: () => void;
    onOpenHistory?: () => void;
    onOpenMenuTab: () => void;
    onOpenShare?: () => void;
}

function MobileHoursScreenContent({ onOpenDashboard, onOpenHistory, onOpenMenuTab, onOpenShare }: MobileHoursScreenProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileHours');
    const tToday = useTranslations('MobileToday');
    const tDesign = useTranslations('MobileDesignEditor');
    const tMore = useTranslations('MobileMore');
    const formatter = useFormatter();
    const { activeSubscription, storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const storeBrandColor = useMemo(() => resolveStoreBrandColor(storeDetails as any), [storeDetails]);
    const storeLogoUrl = (storeDetails as any)?.logo || undefined;
    const { selectedProject, selectedProjectId, selectedProjectSummary } = useMobileProjects();
    const currentTempStatus = useActiveTempStatus(storeDetails?.tempStatus);
    const isTempActive = Boolean(currentTempStatus);
    const [isUpdating, setIsUpdating] = useState(false);
    const [hoursNow, setHoursNow] = useState(() => new Date());
    const todayKey = getStoreDayKey(storeDetails?.timeZone, hoursNow);
    const todayLabel = DAY_LABELS[todayKey] || 'today';
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
    const [isTodayGuideOpen, setIsTodayGuideOpen] = useState(false);
    const [isInactiveReminderDismissed, setIsInactiveReminderDismissed] = useState(false);
    const [todayOpenTime, setTodayOpenTime] = useState('');
    const [todayCloseTime, setTodayCloseTime] = useState('');
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}::${String(storeDetails?.storeId ?? '')}`;
    const activeScopeRef = useRef(scopeKey);
    const componentActiveRef = useRef(true);
    const hoursActionInFlightRef = useRef(false);
    activeScopeRef.current = scopeKey;

    useEffect(() => {
        const interval = window.setInterval(() => setHoursNow(new Date()), 60_000);
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
            window.clearInterval(interval);
        };
    }, []);
    const menuUrl = useMemo(() => {
        if (!storeDetails?.subdomain && !storeDetails?.customDomain) {
            return '';
        }

        return generateProjectUrl(
            storeDetails.subdomain,
            storeDetails.customDomain,
            undefined,
            true
        );
    }, [storeDetails?.customDomain, storeDetails?.subdomain]);
    const todayMenuLink = useMemo(() => (
        buildTodayMenuLink(
            storeDetails?.subdomain,
            storeDetails?.customDomain,
            selectedProjectSummary?.name,
        ) || menuUrl
    ), [menuUrl, selectedProjectSummary?.name, storeDetails?.customDomain, storeDetails?.subdomain]);

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
        if (isTempActive && TEMP_CLOSED_TYPES.has(String(currentTempStatus?.type))) {
            return 'closed_today';
        }

        const status = getStoreStatus(storeDetails?.workingHours, storeDetails?.timeZone, undefined, hoursNow);
        if (status.isOpen) return 'open';

        const hasTodayHours = parseWorkingHoursRanges(storeDetails?.workingHours?.[todayKey]).length > 0;
        return hasTodayHours && !status.nextChange?.startsWith('Opens at ')
            ? 'closed_after_hours'
            : 'closed_today';
    }, [currentTempStatus?.type, hoursNow, isTempActive, storeDetails?.timeZone, storeDetails?.workingHours, todayKey]);

    const inactiveItemsReminder = useMemo(
        () => getInactiveItemsReminder(selectedProject as any),
        [selectedProject]
    );

    useEffect(() => {
        const dismissKey = getInactiveReminderDismissKey(storeDetails?.storeId, inactiveItemsReminder?.projectId);
        if (!dismissKey) {
            setIsInactiveReminderDismissed(false);
            return;
        }
        setIsInactiveReminderDismissed(localStorage.getItem(dismissKey) === '1');
    }, [inactiveItemsReminder?.projectId, storeDetails?.storeId]);

    const handleCloseToday = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsUpdating(true);
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
        const nextStatus = {
            type: 'closed_today',
            message: 'Closed today',
            expiresAt,
            createdAt: new Date().toISOString(),
        };
        const previousStatus = storeDetails?.tempStatus;
        setStoreDetails((previous: any) => ({ ...previous, tempStatus: nextStatus }));

        try {
            const res = await fetch('/api/store/temp-status', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set', type: 'closed_today', expiresAt }),
            });
            const result = await readTempStatusResponse(res, 'set', {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                ...getBoundedMobileOwnerStringContext('tempStatusType', 'closed_today'),
                ...getBoundedMobileOwnerStringContext('expiresAt', expiresAt),
                hasPreviousStatus: Boolean(previousStatus),
                hasCustomMessage: false,
                surface: 'mobile_today_hours',
            });
            Toast.show({
                content: result.effectsPending ? 'Saved. Customer pages may take a moment to refresh.' : t('closedForToday'),
                duration: result.effectsPending ? 2200 : 1500,
            });
        } catch (error) {
            logMobileOwnerFailure('mobile_today_close_today_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                ...getBoundedMobileOwnerStringContext('expiresAt', expiresAt),
                hasPreviousStatus: Boolean(previousStatus),
            });
            setStoreDetails((previous: any) => {
                if (previousStatus) return { ...previous, tempStatus: previousStatus };
                const { tempStatus, ...rest } = previous || {};
                return rest;
            });
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdating(false);
        }
    }, [setStoreDetails, storeDetails?.storeId, storeDetails?.tempStatus, t]);

    const handleCompleteCampaign = async (campaign: TodayCampaignSummary) => {
        setIsCampaignProcessing(true);
        let menuLink: string | undefined;
        let hasCampaignImage = false;

        try {
            menuLink = buildTodayMenuLink(
                storeDetails?.subdomain,
                storeDetails?.customDomain,
                selectedProjectSummary?.name,
            );
            const fullCampaign = campaign.primarySurface === 'whatsapp_status' || campaign.primarySurface === 'whatsapp_message'
                ? null
                : await getCampaign(campaign.campaignId);
            hasCampaignImage = Boolean(fullCampaign?.assets?.imageUrl);
            const actionFeedback = await performTodaySurfaceAction({
                surface: campaign.primarySurface,
                itemName: campaign.subject?.itemName || 'Item',
                menuLink,
                imageUrl: fullCampaign?.assets?.imageUrl,
            });
            const method = getExportMethod(campaign.primarySurface);
            const result = await dbCompleteCampaign(campaign.campaignId, campaign.projectId, campaign.type, campaign.primarySurface, method);
            assertCampaignCompleteSucceeded(result, {
                campaignId: campaign.campaignId,
                campaignType: campaign.type,
                method,
                projectId: campaign.projectId,
                surface: campaign.primarySurface,
            });
            await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            Toast.show({ content: actionFeedback.title, duration: 1800 });
        } catch (error) {
            logCampaignFailure('mobile_today_campaign_complete_failed', error, {
                ...getBoundedCampaignStringContext('campaignId', campaign.campaignId),
                ...getBoundedCampaignStringContext('projectId', campaign.projectId),
                ...getBoundedCampaignStringContext('campaignType', campaign.type),
                ...getBoundedCampaignStringContext('surface', campaign.primarySurface),
                hasMenuLink: Boolean(menuLink),
                hasCampaignImage,
            });
            Toast.show({ content: tToday('failed'), duration: 2000 });
        } finally {
            setIsCampaignProcessing(false);
        }
    };

    const handleSkipCampaign = async (campaignId: string, type: CampaignType) => {
        setIsCampaignProcessing(true);
        try {
            const result = await dbSkipCampaign(campaignId, type);
            assertCampaignSkipSucceeded(result, {
                campaignId,
                campaignType: type,
            });
            await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            Toast.show({ content: tToday('skipped'), duration: 1500 });
        } catch (error) {
            logCampaignFailure('mobile_today_campaign_skip_failed', error, {
                ...getBoundedCampaignStringContext('campaignId', campaignId),
                ...getBoundedCampaignStringContext('campaignType', type),
            });
            Toast.show({ content: tToday('failedToSkip'), duration: 2000 });
        } finally {
            setIsCampaignProcessing(false);
        }
    };

    const todayRange = getTodayTimeRange(storeDetails?.workingHours?.[todayKey]);
    const todayTimingsLabel = todayRange.isClosed
        ? t('closedToday')
        : `${todayRange.openTime} - ${todayRange.closeTime}`;
    const primaryCampaign = FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED && !isCampaignsLoading
        ? (todayCampaigns?.primary as TodayCampaignSummary | undefined)
        : undefined;
    const sortedOperationalCampaigns = sortOperationalCampaignsByPriority(todayCampaigns?.operational || []);
    const hasOperationalCampaigns = sortedOperationalCampaigns.length > 0;
    const hasAnyTodayCampaign = Boolean(primaryCampaign || hasOperationalCampaigns);
    const canAccessGrowthKitsToday = shouldShowGrowthOSNavigation({
        activeSubscription,
        storeDetails,
        storeId: storeDetails?.storeId,
    }) && Boolean(selectedProjectId);
    const { growthOSSummary } = useGrowthOS(canAccessGrowthKitsToday);
    const growthOSTodayTrigger = getGrowthOSTodayTriggerState(growthOSSummary);
    const shouldShowGrowthKitsCard = canAccessGrowthKitsToday && growthOSTodayTrigger.shouldSurface;
    const hasMaintenanceCards = Boolean(
        (physicalSurfaces?.tentCard?.eligible || false)
        || (physicalSurfaces?.counterSticker?.eligible || false)
        || (staffPrompt?.eligible || false)
    );
    const weeklyGrowthPack = useMemo(() => {
        if (!FEATURE_FLAGS.ENABLE_TODAY_WEEKLY_GROWTH_PACK || !storeDetails) return null;

        return buildTodayWeeklyGrowthPack({
            businessName: getStoreContextName(storeDetails as any, 'Business'),
            hasActiveTempStatus: Boolean(isTempActive),
            inactiveItemCount: inactiveItemsReminder?.count || 0,
            inactiveItemNames: inactiveItemsReminder?.names || [],
            menuUrl: todayMenuLink,
            operationalCampaigns: sortedOperationalCampaigns,
            primaryCampaign,
            projectName: selectedProjectSummary?.name || 'your menu',
            staffPromptText: staffPrompt?.eligible ? staffPrompt.text : undefined,
            tempStatusMessage: currentTempStatus?.message,
            todayTimingsLabel,
        });
    }, [
        currentTempStatus?.message,
        inactiveItemsReminder,
        isTempActive,
        primaryCampaign,
        selectedProjectSummary?.name,
        sortedOperationalCampaigns,
        staffPrompt?.eligible,
        staffPrompt?.text,
        storeDetails,
        todayMenuLink,
        todayTimingsLabel,
    ]);

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    const status = todayStatus === 'open'
        ? { color: token.colorSuccess, icon: <LuPower color={token.colorSuccess} size={18} />, label: t('open'), sublabel: 'Customers can currently view your menu.' }
        : todayStatus === 'closed_after_hours'
            ? { color: token.colorError, icon: <LuPowerOff color={token.colorError} size={18} />, label: t('closedToday'), sublabel: 'Today’s serving time is over. Update timings if you are still open.' }
        : { color: token.colorError, icon: <LuPowerOff color={token.colorError} size={18} />, label: t('closedToday'), sublabel: t('customersSee') };
    const closeTodayCtaLabel = 'Mark Closed for Today';
    const editRegularHoursCtaLabel = `Edit ${todayLabel} Hours`;
    const isTemporaryClosedToday = Boolean(isTempActive && TEMP_CLOSED_TYPES.has(String(currentTempStatus?.type)));

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

    const todayDigest = buildTodayDigest(
        Boolean(primaryCampaign),
        sortedOperationalCampaigns.length,
        Boolean(staffPrompt?.eligible),
        hasMaintenanceCards,
    );
    const shouldShowTodayDigest = hasAnyTodayCampaign || hasMaintenanceCards;
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

    const dismissInactiveReminder = () => {
        const dismissKey = getInactiveReminderDismissKey(storeDetails?.storeId, inactiveItemsReminder?.projectId);
        if (dismissKey) {
            localStorage.setItem(dismissKey, '1');
        }
        setIsInactiveReminderDismissed(true);
    };

    const shouldShowInactiveReminder = Boolean(inactiveItemsReminder && !isInactiveReminderDismissed);

    const handleOpenPreview = () => {
        if (!menuUrl) {
            Toast.show({ content: t('failedToUpdate'), duration: 1500 });
            return;
        }
        openMobilePublicLink(menuUrl, {
            flow: 'today_menu_preview_open',
            metadata: {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('menuUrl', menuUrl),
            },
            source: 'mobile_today_hours',
        });
    };

    const saveTodayHours = async () => {
        const expectedStoreId = Number(storeDetails?.storeId);
        const expectedTenantId = Number(storeDetails?.tenantId);
        const requestScopeKey = scopeKey;
        if (
            !componentActiveRef.current
            || activeScopeRef.current !== requestScopeKey
            || hoursActionInFlightRef.current
            || !Number.isSafeInteger(expectedStoreId)
            || expectedStoreId <= 0
            || !Number.isSafeInteger(expectedTenantId)
            || expectedTenantId <= 0
        ) return;

        hoursActionInFlightRef.current = true;
        setIsSavingTodayHours(true);
        const expectedTodayKey = todayKey;
        const expectedTodayLabel = todayLabel;
        const previousHours = { ...(storeDetails.workingHours || {}) };
        const previousHoursLastUpdatedAt = (storeDetails as any).hoursLastUpdatedAt;
        const nextRange = `${todayOpenTime}-${todayCloseTime}`;
        const nextHours = { ...previousHours, [expectedTodayKey]: nextRange };
        const hoursLastUpdatedAt = new Date().toISOString();
        setStoreDetails((previous: any) => (
            String(previous?.tenantId ?? '') === String(expectedTenantId)
            && String(previous?.storeId ?? '') === String(expectedStoreId)
                ? { ...previous, hoursLastUpdatedAt, workingHours: nextHours }
                : previous
        ));

        try {
            const writeResult = await updateStore({
                hoursLastUpdatedAt,
                storeId: expectedStoreId,
                tenantId: expectedTenantId,
                workingHours: { [expectedTodayKey]: nextRange },
            });
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_today_hours_store_update_rejected',
            );
            if (!componentActiveRef.current || activeScopeRef.current !== requestScopeKey) return;
            setIsTodayHoursSheetOpen(false);
            Toast.show({ content: `${expectedTodayLabel} hours updated`, duration: 1400 });
        } catch (error) {
            logMobileOwnerFailure('mobile_today_hours_update_failed', error, {
                ...getMobileOwnerStoreLogContext(expectedStoreId, expectedTenantId),
                ...getBoundedMobileOwnerStringContext('todayKey', expectedTodayKey),
                hasPreviousHours: Object.keys(previousHours).length > 0,
                hasNextHours: Object.keys(nextHours).length > 0,
                hasPreviousHoursLastUpdatedAt: Boolean(previousHoursLastUpdatedAt),
            });
            setStoreDetails((previous: any) => (
                String(previous?.tenantId ?? '') === String(expectedTenantId)
                && String(previous?.storeId ?? '') === String(expectedStoreId)
                && previous?.hoursLastUpdatedAt === hoursLastUpdatedAt
                    ? {
                        ...previous,
                        hoursLastUpdatedAt: previousHoursLastUpdatedAt,
                        workingHours: previousHours,
                    }
                    : previous
            ));
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                Toast.show({ content: t('failedToUpdate'), duration: 1500 });
            }
        } finally {
            hoursActionInFlightRef.current = false;
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                setIsSavingTodayHours(false);
            }
        }
    };

    const handleSaveTodayHours = () => {
        if (!isValidClockRange(todayOpenTime, todayCloseTime)) {
            Toast.show({ content: 'Select valid, different opening and closing times.', duration: 1500 });
            return;
        }

        void Dialog.confirm({
            cancelText: 'Cancel',
            confirmText: 'Publish hours',
            content: `Customers will see ${todayOpenTime} - ${todayCloseTime} every ${todayLabel} from now on. Use Temporary Status for a one-day change.`,
            onConfirm: saveTodayHours,
            title: `Publish regular ${todayLabel} hours?`,
        });
    };

    const tempStatusPreviewMessage = tempStatusType === 'custom'
        ? (customTempStatusMessage.trim() || 'Temporary notice')
        : (MOBILE_TEMP_STATUS_OPTIONS.find((option) => option.value === tempStatusType)?.defaultMsg || tempStatusType);

    const handleSetTempStatus = async () => {
        const expiresAt = fromNativeDateTimeInputValue(exactTempStatusExpiryAt);
        const exactExpiryDate = toDate(expiresAt);
        if (!exactTempStatusExpiryAt || Number.isNaN(exactExpiryDate.getTime()) || exactExpiryDate.getTime() <= Date.now()) {
            Toast.show({ content: 'Choose a future end date and time.', duration: 2000 });
            return;
        }

        const message = tempStatusPreviewMessage;
        const confirmed = await Dialog.confirm({
            cancelText: 'Cancel',
            confirmText: 'Show to customers',
            content: `Customers will see "${message}" until ${formatDateTime(expiresAt, 'datetime', formatter)}.`,
            title: 'Show this status to customers?',
        });
        if (!confirmed) return;

        setIsTempStatusLoading(true);
        const newStatus = { type: tempStatusType, message, expiresAt, createdAt: new Date().toISOString() };
        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => ({ ...prev, tempStatus: newStatus }));
        try {
            const res = await fetch('/api/store/temp-status', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set',
                    type: tempStatusType,
                    expiresAt,
                    message: tempStatusType === 'custom' ? customTempStatusMessage.trim() : undefined,
                }),
            });
            const result = await readTempStatusResponse(res, 'set', {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                ...getBoundedMobileOwnerStringContext('tempStatusType', tempStatusType),
                ...getBoundedMobileOwnerStringContext('expiresAt', expiresAt),
                hasPreviousStatus: Boolean(prevStatus),
                hasCustomMessage: Boolean(customTempStatusMessage.trim()),
                surface: 'mobile_today_hours',
            });
            Toast.show({
                content: result.effectsPending ? 'Saved. Customer pages may take a moment to refresh.' : 'Customers can see this now',
                icon: result.effectsPending ? undefined : 'success',
                duration: result.effectsPending ? 2200 : 1500,
            });
        } catch (error) {
            logMobileOwnerFailure('mobile_today_temp_status_set_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                ...getBoundedMobileOwnerStringContext('tempStatusType', tempStatusType),
                ...getBoundedMobileOwnerStringContext('expiresAt', expiresAt),
                hasPreviousStatus: Boolean(prevStatus),
                hasCustomMessage: Boolean(customTempStatusMessage.trim()),
            });
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: 'Could not set status', duration: 2000 });
        } finally {
            setIsTempStatusLoading(false);
        }
    };

    const handleClearTempStatus = async () => {
        const prevStatus = storeDetails?.tempStatus;
        const confirmed = await Dialog.confirm({
            cancelText: 'Cancel',
            confirmText: 'Clear status',
            content: prevStatus?.message
                ? `Customers will no longer see "${prevStatus.message}" on your public page.`
                : 'Customers will no longer see the temporary status on your public page.',
            title: 'Clear customer status?',
        });
        if (!confirmed) return;

        setIsTempStatusLoading(true);
        setStoreDetails((prev: any) => {
            const { tempStatus, ...rest } = prev || {};
            return rest;
        });
        try {
            const res = await fetch('/api/store/temp-status', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' }),
            });
            const result = await readTempStatusResponse(res, 'clear', {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                hasPreviousStatus: Boolean(prevStatus),
                surface: 'mobile_today_hours',
            });
            Toast.show({
                content: result.effectsPending ? 'Cleared. Customer pages may take a moment to refresh.' : 'Status cleared',
                icon: result.effectsPending ? undefined : 'success',
                duration: result.effectsPending ? 2200 : 1500,
            });
        } catch (error) {
            logMobileOwnerFailure('mobile_today_temp_status_clear_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                hasPreviousStatus: Boolean(prevStatus),
            });
            setStoreDetails((prev: any) => {
                if (prevStatus) return { ...prev, tempStatus: prevStatus };
                const { tempStatus, ...rest } = prev || {};
                return rest;
            });
            Toast.show({ content: 'Could not clear status', duration: 2000 });
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
                activePlanType: (storeDetails as any)?.activePlanType,
                brandColor: storeBrandColor,
                brandName: getStoreContextName(storeDetails as any, 'Business'),
                itemName: tentCard.itemName || 'Item',
                logoUrl: storeLogoUrl,
                templateId: tentCard.templateId,
                qrUrl: tentCard.qrUrl,
                size: 'A6',
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'tent-card-a6.pdf';
            anchor.click();
            URL.revokeObjectURL(url);
            Toast.show({ content: t('tentCardDownloaded'), duration: 1500 });
        } catch (error) {
            logMobileOwnerFailure('mobile_today_tent_card_download_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                ...getBoundedMobileOwnerStringContext('itemName', tentCard.itemName),
                ...getBoundedMobileOwnerStringContext('templateId', tentCard.templateId),
                hasQrUrl: Boolean(tentCard.qrUrl),
                hasLogoUrl: Boolean(storeLogoUrl),
            });
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
                activePlanType: (storeDetails as any)?.activePlanType,
                brandColor: storeBrandColor,
                brandName: getStoreContextName(storeDetails as any, 'Business'),
                itemName: sticker.itemName || 'Item',
                logoUrl: storeLogoUrl,
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
        } catch (error) {
            logMobileOwnerFailure('mobile_today_sticker_download_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, (storeDetails as any)?.tenantId),
                ...getBoundedMobileOwnerStringContext('itemName', sticker.itemName),
                ...getBoundedMobileOwnerStringContext('templateId', sticker.templateId),
                hasQrUrl: Boolean(sticker.qrUrl),
                hasLogoUrl: Boolean(storeLogoUrl),
            });
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
                    style={{ minHeight: 44, minWidth: 44, paddingInline: 6 }}
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
                    {FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY ? (
                        <List.Item
                            arrow
                            description={<Text type="secondary">Review today actions completed or skipped in the last 7 days.</Text>}
                            onClick={onOpenHistory}
                            prefix={<LuClock size={18} />}
                            title={<Text strong>Past Activity</Text>}
                        />
                    ) : null}
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
                                <Text strong>{`Regular ${todayLabel} Hours`}</Text>
                                <Button
                                    fill="outline"
                                    onClick={() => setIsTodayHoursSheetOpen(true)}
                                    size="small"
                                    style={{
                                        borderRadius: 999,
                                        minHeight: 44,
                                        paddingInline: 12,
                                    }}
                                >
                                    Edit Hours
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
                    ) : isTemporaryClosedToday ? (
                        <Button block color="primary" loading={isTempStatusLoading} onClick={() => void handleClearTempStatus()} size="large" style={{ minHeight: 44 }}>
                            Clear Temporary Status
                        </Button>
                    ) : (
                        <Button block color="primary" onClick={() => setIsTodayHoursSheetOpen(true)} size="large" style={{ minHeight: 44 }}>
                            {editRegularHoursCtaLabel}
                        </Button>
                    )}
                    <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                        Closing uses Temporary Status. Editing hours changes your regular {todayLabel} schedule.
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
                        <Text strong>{`Edit Regular ${todayLabel} Hours`}</Text>
                        <Button
                            fill="none"
                            onClick={() => {
                                if (isSavingTodayHours) return;
                                setTodayOpenTime(todayRange.openTime);
                                setTodayCloseTime(todayRange.closeTime);
                                setIsTodayHoursSheetOpen(false);
                            }}
                            size="small"
                            style={{ minHeight: 44, minWidth: 44, paddingInline: 6 }}
                        >
                            ✕
                        </Button>
                    </Flex>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 14 }} vertical>
                        <Text type="secondary">{`Set the opening and closing time used every ${todayLabel}.`}</Text>
                        <Card size="small" style={{ backgroundColor: token.colorFillAlter }}>
                            <Flex gap={4} vertical>
                                <Text strong>Customer preview</Text>
                                <Text type="secondary">
                                    {todayOpenTime && todayCloseTime
                                        ? `Customers will see: ${todayOpenTime} - ${todayCloseTime}`
                                        : 'Select both times to preview what customers will see.'}
                                </Text>
                            </Flex>
                        </Card>
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
                            onClick={handleSaveTodayHours}
                            size="middle"
                        >
                            Publish hours
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
                            <Text strong>Temporary status</Text>
                            {isTempActive ? <Tag color="success">Customers see this now</Tag> : null}
                        </Flex>
                        <MobileTempStatusConfigurator
                            activeStatusLabel="Customers see this now"
                            activeTagLabel="Live"
                            clearStatusLabel="Clear status"
                            exactExpiryAt={exactTempStatusExpiryAt}
                            exactExpiryLabel="Ends At"
                            currentStatus={currentTempStatus}
                            customMessage={customTempStatusMessage}
                            customMessageLabel="Message"
                            customPlaceholder="Type your custom status"
                            expiryLabel="Show until"
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
                            previewLabel="Customer preview"
                            previewMessage={tempStatusPreviewMessage}
                            selectedExpiryHours={selectedTempStatusExpiryHours}
                            setButtonColor="primary"
                            setStatusLabel="Show to customers"
                            showActiveHeader={false}
                            activeCardVariant="default"
                            statusOptions={MOBILE_TEMP_STATUS_OPTIONS}
                            statusType={tempStatusType}
                            statusTypeLabel="Status to show"
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
                        <Button fill="none" onClick={handleDismissNudge} size="small" style={{ minHeight: 44, minWidth: 44, paddingInline: 6 }}>
                            <LuX size={14} />
                        </Button>
                    </Flex>
                </Card>
            ) : null}

            {weeklyGrowthPack ? <TodayWeeklyGrowthPackCard pack={weeklyGrowthPack} /> : null}

            {shouldShowGrowthKitsCard ? <GrowthKitsMobileCard projectId={selectedProjectId} /> : null}

            {shouldShowTodayDigest ? <Text type="secondary" style={{ fontSize: 13 }}>{todayDigest}</Text> : null}

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
                            style={{ color: token.colorTextTertiary, minHeight: 44 }}
                        >
                            <Text type="secondary">{tToday('skip')}</Text>
                        </Button>
                    </Flex>
                </Card>
            ) : null}

            {shouldShowInactiveReminder && inactiveItemsReminder ? (
                <Card style={{ borderRadius: 20 }}>
                    <Flex gap={10} vertical>
                        <Text strong>{inactiveItemsReminder.count} inactive {inactiveItemsReminder.count === 1 ? 'item' : 'items'}</Text>
                        <Text type="secondary">Customers cannot see them until you activate them.</Text>
                        {inactiveItemsReminder.names.length ? (
                            <Text type="secondary">
                                {inactiveItemsReminder.names.join(', ')}
                                {inactiveItemsReminder.count > inactiveItemsReminder.names.length ? ' and more.' : '.'}
                            </Text>
                        ) : null}
                        <Flex gap={8}>
                            <Button block color="primary" onClick={onOpenMenuTab} size="large">
                                Review items
                            </Button>
                            <Button block fill="none" onClick={dismissInactiveReminder} size="large">
                                Not now
                            </Button>
                        </Flex>
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

            {hasOperationalCampaigns ? (
                <Card style={{ borderRadius: 20 }} title="Needs attention">
                    <Flex gap={8} vertical>
                        <Text type="secondary">These are lower-priority actions for today. Use them if they fit your plan.</Text>
                        {sortedOperationalCampaigns.slice(0, 2).map((campaign) => {
                            const title = campaign.type === 'now_available'
                                ? tToday('nowAvailable', { item: campaign.subject?.itemName || t('itemFallback') })
                                : (ACTION_TITLES[campaign.type] || 'Share')
                                    .replace('{itemName}', campaign.subject?.itemName || t('itemFallback'))
                                    .replace('{mealName}', mealName);

                            return (
                                <Card key={campaign.campaignId} style={{ borderRadius: 14 }}>
                                    <Flex gap={8} vertical>
                                        <Text strong>{title}</Text>
                                        <Text type="secondary">
                                            Lower-priority action for today. Open it only if it fits your plan.
                                        </Text>
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
                            style={{ minHeight: 44, minWidth: 44, paddingInline: 6 }}
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

export default function MobileHoursScreen(props: MobileHoursScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}::${String(storeDetails?.storeId ?? '')}`;
    return <MobileHoursScreenContent key={scopeKey} {...props} />;
}
