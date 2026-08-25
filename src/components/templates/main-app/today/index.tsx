"use client";

import { FEATURE_FLAGS } from "@config/features";
import { getCampaign } from "@database/campaigns";
import { TODAY_FEATURE_GUIDE_SECTIONS, TODAY_FEATURE_GUIDE_TITLE } from "@constant/todayFeatureGuide";
import { useOwnerActionPlan } from "@hook/useOwnerActionPlan";
import { useActiveTempStatus } from "@hook/useActiveTempStatus";
import { useTodayCampaigns } from "@hook/useTodayCampaigns";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { getBoundedCampaignStringContext, logCampaignFailure } from "@lib/campaigns/campaignDiagnostics";
import { buildTodayMenuLink, TodayActionFeedback, performTodaySurfaceAction } from "@lib/campaigns/todayActionExecutor";
import { shouldShowGrowthOSNavigation } from "@lib/growthos/entitlements";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { resolveStoreBrandColor } from "@lib/menu-kit/brandTokens";
import { getInactiveItemsReminder, getInactiveReminderDismissKey } from "@lib/today/inactiveItemsReminder";
import { buildTodayWeeklyGrowthPack } from "@lib/today/weeklyGrowthPack";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { CampaignType, ExecutionSurface, ExportMethod } from "@type/campaigns";
import { Button, Card, Divider, Drawer, Spin, Typography, notification } from "antd";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { LuCalendarOff, LuInfo, LuX } from "react-icons/lu";
import OBPLinkCard from "../businessSettings/OBPLinkCard";
import TempStatusCard from "../businessSettings/TempStatusCard";
import OwnerActionPlanCard from "../dashboard/OwnerDashboard/OwnerActionPlanCard";
import EmptyState from "./components/EmptyState";
import OperationalSection from "./components/OperationalSection";
import PostActionState from "./components/PostActionState";
import PrimaryCard from "./components/PrimaryCard";
import StaffPromptSection from "./components/StaffPromptSection";
import StickerSection from "./components/StickerSection";
import TentCardSection from "./components/TentCardSection";
import WeeklyGrowthPack from "./components/WeeklyGrowthPack";
import { useCampaignActions } from "./hooks/useCampaignActions";
import styles from "./styles.module.scss";
import { sortOperationalCampaignsByPriority } from "@lib/today/todayCampaignPrioritizer";

const { Title, Text } = Typography;

type ScreenState = "loading" | "action" | "empty" | "post-action";
const resolveProjectName = (name: string | Record<string, string> | undefined, fallback = 'Untitled') => (
    getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback)
);

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
        parts.push('staff prompt ready');
    }

    if (hasMaintenanceCards) {
        parts.push('maintenance cards ready');
    }

    if (!parts.length) {
        return '';
    }

    return `${parts.join(' · ')}.`;
};

const TodayScreen = () => {
    const router = useRouter();
    const [screenState, setScreenState] = useState<ScreenState>("loading");
    const [lastAction, setLastAction] = useState<"shared" | "skipped" | null>(null);
    const [lastActionFeedback, setLastActionFeedback] = useState<TodayActionFeedback | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isInactiveReminderDismissed, setIsInactiveReminderDismissed] = useState(false);

    const { todayCampaigns, staffPrompt, physicalSurfaces, isLoading, mutate } = useTodayCampaigns();
    const { completeCampaign, skipCampaign, isProcessing } = useCampaignActions();
    const { activeSubscription, storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const { activeProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext);
    const storeBrandColor = useMemo(() => resolveStoreBrandColor(storeDetails as any), [storeDetails]);
    const storeLogoUrl = (storeDetails as any)?.logo || undefined;
    const storeName = getStoreContextName(storeDetails as any, "Business");
    const inactiveItemsReminder = useMemo(() => {
        if (!activeProject?.projectId) return null;
        return getInactiveItemsReminder(activeProject as any);
    }, [activeProject]);
    const ownerActionPlan = useOwnerActionPlan(activeProject?.projectId || null);
    const sortedOperationalCampaigns = useMemo(
        () => sortOperationalCampaignsByPriority(todayCampaigns?.operational || []),
        [todayCampaigns?.operational]
    );
    const hasPrimaryCampaign = Boolean(todayCampaigns?.primary);
    const hasOperationalCampaigns = sortedOperationalCampaigns.length > 0;
    const hasMaintenanceCards = Boolean(
        (physicalSurfaces?.tentCard?.eligible || false)
        || (physicalSurfaces?.counterSticker?.eligible || false)
        || (staffPrompt?.eligible || false)
    );
    const todayDigest = buildTodayDigest(
        hasPrimaryCampaign,
        sortedOperationalCampaigns.length,
        Boolean(staffPrompt?.eligible),
        hasMaintenanceCards,
    );
    const shouldShowTodayDigest = hasPrimaryCampaign || hasOperationalCampaigns || hasMaintenanceCards;
    const shouldShowGrowthKitsEntry = shouldShowGrowthOSNavigation({
        activeSubscription,
        storeDetails,
        storeId: storeDetails?.storeId,
    }) && Boolean(hasPrimaryCampaign || hasOperationalCampaigns);

    // Check if feature is enabled
    const isEnabled = FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED;

    useEffect(() => {
        if (isLoading) {
            setScreenState("loading");
            return;
        }

        if (!todayCampaigns || (todayCampaigns.isEmpty && !hasMaintenanceCards)) {
            setScreenState("empty");
            return;
        }

        if (todayCampaigns.primary || sortedOperationalCampaigns.length > 0 || hasMaintenanceCards) {
            setScreenState("action");
        } else {
            setScreenState("empty");
        }
    }, [hasMaintenanceCards, todayCampaigns, isLoading, sortedOperationalCampaigns.length]);

    useEffect(() => {
        const dismissKey = getInactiveReminderDismissKey(
            storeDetails?.tenantId ?? (storeDetails as any)?.tId,
            storeDetails?.storeId,
            inactiveItemsReminder?.projectId,
        );
        if (!dismissKey) {
            setIsInactiveReminderDismissed(false);
            return;
        }
        setIsInactiveReminderDismissed(localStorage.getItem(dismissKey) === '1');
    }, [inactiveItemsReminder?.projectId, storeDetails?.storeId, storeDetails?.tenantId, (storeDetails as any)?.tId]);

    const dismissInactiveReminder = () => {
        const dismissKey = getInactiveReminderDismissKey(
            storeDetails?.tenantId ?? (storeDetails as any)?.tId,
            storeDetails?.storeId,
            inactiveItemsReminder?.projectId,
        );
        if (dismissKey) {
            localStorage.setItem(dismissKey, '1');
        }
        setIsInactiveReminderDismissed(true);
    };

    const shouldShowInactiveReminder = Boolean(inactiveItemsReminder && !isInactiveReminderDismissed);
    const selectedProjectDisplayName = useMemo(() => (
        resolveProjectName((activeProject as any)?.name, '')
    ), [activeProject]);
    const todayMenuLink = useMemo(() => (
        buildTodayMenuLink(
            storeDetails?.subdomain,
            storeDetails?.customDomain,
            selectedProjectDisplayName || undefined,
        )
    ), [selectedProjectDisplayName, storeDetails?.customDomain, storeDetails?.subdomain]);
    const activeTempStatus = useActiveTempStatus((storeDetails as any)?.tempStatus);
    const hasActiveTempStatus = Boolean(activeTempStatus);
    const weeklyGrowthPack = useMemo(() => {
        if (!FEATURE_FLAGS.ENABLE_TODAY_WEEKLY_GROWTH_PACK || !storeDetails) return null;

        return buildTodayWeeklyGrowthPack({
            businessName: getStoreContextName(storeDetails as any, 'Business'),
            hasActiveTempStatus,
            inactiveItemCount: inactiveItemsReminder?.count || 0,
            inactiveItemNames: inactiveItemsReminder?.names || [],
            menuUrl: todayMenuLink,
            operationalCampaigns: sortedOperationalCampaigns,
            primaryCampaign: todayCampaigns?.primary,
            projectName: selectedProjectDisplayName || 'your menu',
            staffPromptText: staffPrompt?.eligible ? staffPrompt.text : undefined,
            tempStatusMessage: activeTempStatus?.message,
        });
    }, [
        activeTempStatus?.message,
        hasActiveTempStatus,
        inactiveItemsReminder,
        selectedProjectDisplayName,
        sortedOperationalCampaigns,
        staffPrompt?.eligible,
        staffPrompt?.text,
        storeDetails,
        todayCampaigns?.primary,
        todayMenuLink,
    ]);

    const handleComplete = async (
        campaignId: string,
        projectId: string,
        campaignType: CampaignType,
        surface: ExecutionSurface,
        method: ExportMethod,
        itemName?: string
    ) => {
        let menuLink: string | undefined;
        let hasCampaignImage = false;

        try {
            menuLink = buildTodayMenuLink(
                storeDetails?.subdomain,
                storeDetails?.customDomain,
                (activeProject as any)?.name,
            );
            const fullCampaign = surface === 'whatsapp_status' || surface === 'whatsapp_message'
                ? null
                : await getCampaign(campaignId);
            hasCampaignImage = Boolean(fullCampaign?.assets?.imageUrl);
            const actionFeedback = await performTodaySurfaceAction({
                surface,
                itemName: itemName || fullCampaign?.subject?.itemName || 'Item',
                menuLink,
                imageUrl: fullCampaign?.assets?.imageUrl,
            });
            const result = await completeCampaign(campaignId, projectId, campaignType, surface, method);
            await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            notification.success({
                message: actionFeedback.title,
                description: actionFeedback.description,
                placement: 'bottomRight',
            });
            setLastActionFeedback(actionFeedback);
            setLastAction("shared");
            setScreenState("post-action");

            // Auto-transition back to empty/action state after 2 seconds
            setTimeout(() => {
                setLastAction(null);
                setLastActionFeedback(null);
            }, 2000);
        } catch (error) {
            logCampaignFailure('today_campaign_action_flow_failed', error, {
                ...getBoundedCampaignStringContext('campaignId', campaignId),
                ...getBoundedCampaignStringContext('projectId', projectId),
                ...getBoundedCampaignStringContext('campaignType', campaignType),
                ...getBoundedCampaignStringContext('surface', surface),
                ...getBoundedCampaignStringContext('method', method),
                hasMenuLink: Boolean(menuLink),
                hasCampaignImage,
            });
        }
    };

    const handleSkip = async (campaignId: string, campaignType: CampaignType) => {
        try {
            const result = await skipCampaign(campaignId, campaignType);
            await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            setLastActionFeedback({
                title: 'Skipped for today',
                description: 'No action needed. This item was removed from Today for now.',
            });
            setLastAction("skipped");
            setScreenState("post-action");
            setTimeout(() => {
                setLastAction(null);
                setLastActionFeedback(null);
            }, 2000);
        } catch (error) {
            logCampaignFailure('today_campaign_skip_flow_failed', error, {
                ...getBoundedCampaignStringContext('campaignId', campaignId),
                ...getBoundedCampaignStringContext('campaignType', campaignType),
            });
            notification.error({
                message: "Failed to skip",
                description: "Please try again.",
                placement: "bottomRight",
            });
        }
    };

    const renderHeader = () => (
        <div className={styles.titleRow}>
            <Title level={2}>Today</Title>
            <Button
                icon={<LuInfo />}
                onClick={() => setIsGuideOpen(true)}
                size="small"
                type="text"
            >
                What is this?
            </Button>
        </div>
    );

    const renderGuideDrawer = () => (
        <Drawer
            closable={false}
            onClose={() => setIsGuideOpen(false)}
            open={isGuideOpen}
            placement="bottom"
            title={TODAY_FEATURE_GUIDE_TITLE}
            height="70vh"
            extra={(
                <Button
                    aria-label="Close Today guide"
                    icon={<LuX />}
                    onClick={() => setIsGuideOpen(false)}
                    style={{ minHeight: 44 }}
                    type="text"
                >
                    Close
                </Button>
            )}
        >
            <div className={styles.guideContent}>
                {TODAY_FEATURE_GUIDE_SECTIONS.map((section) => (
                    <div key={section.title} className={styles.guideSection}>
                        <Text strong>{section.title}</Text>
                        <Text type="secondary">{section.description}</Text>
                    </div>
                ))}
            </div>
        </Drawer>
    );

    const renderInactiveItemsReminder = () => {
        if (!shouldShowInactiveReminder || !inactiveItemsReminder) return null;

        const previewNames = inactiveItemsReminder.names.join(', ');

        return (
            <div className={styles.inactiveReminderCard}>
                <Text strong>{inactiveItemsReminder.count} inactive {inactiveItemsReminder.count === 1 ? 'item' : 'items'}</Text>
                <Text type="secondary">
                    Customers cannot see them until you activate them.
                </Text>
                {previewNames ? (
                    <Text type="secondary">
                        {previewNames}{inactiveItemsReminder.count > inactiveItemsReminder.names.length ? ' and more.' : '.'}
                    </Text>
                ) : null}
                <div className={styles.inactiveReminderActions}>
                    <Button type="primary" onClick={() => router.push('/projects')}>
                        Review items
                    </Button>
                    <Button type="text" onClick={dismissInactiveReminder}>
                        Not now
                    </Button>
                </div>
            </div>
        );
    };

    const renderGrowthKitsEntry = () => {
        if (!shouldShowGrowthKitsEntry) return null;
        return (
            <Card className={styles.growthKitsEntry} size="small">
                <div>
                    <Text strong>Growth Kit ready</Text>
                    <Text type="secondary">Prepare copy-ready messages from this menu action.</Text>
                </div>
                <Button type="primary" onClick={() => router.push('/growth-kits')}>
                    Open Growth Kits
                </Button>
            </Card>
        );
    };

    // Feature not enabled state
    if (!isEnabled) {
        return (
            <div className={styles.todayContainer}>
                {renderHeader()}
                <div className={styles.emptyState}>
                    <LuCalendarOff className={styles.emptyIcon} />
                    <Text type="secondary">
                        Today is not available for this location.
                    </Text>
                </div>
                {renderGuideDrawer()}
            </div>
        );
    }

    // Loading state
    if (screenState === "loading") {
        return (
            <div className={styles.todayContainer}>
                {renderHeader()}
                <div className={styles.loadingState}>
                    <Spin size="large" />
                    <Text type="secondary">Preparing...</Text>
                </div>
                {renderGuideDrawer()}
            </div>
        );
    }

    // Post-action state
    if (screenState === "post-action" && lastAction) {
        return (
            <div className={styles.todayContainer}>
                {renderHeader()}
                <PostActionState
                    action={lastAction}
                    title={lastActionFeedback?.title}
                    description={lastActionFeedback?.description}
                />
                {renderGuideDrawer()}
            </div>
        );
    }

    // Empty state
    if (screenState === "empty" || !todayCampaigns) {
        return (
            <div className={styles.todayContainer}>
                {renderHeader()}
                <OwnerActionPlanCard
                    actionPlan={ownerActionPlan.actionPlan}
                    confidence={ownerActionPlan.confidence}
                    sourceQuality={ownerActionPlan.sourceQuality}
                    analyticsAiEntitlement={ownerActionPlan.analyticsAiEntitlement}
                    projectId={activeProject?.projectId || null}
                />
                {shouldShowTodayDigest ? <Text className={styles.todayDigest}>{todayDigest}</Text> : null}
                {renderInactiveItemsReminder()}
                {renderGrowthKitsEntry()}
                <EmptyState />
                {weeklyGrowthPack ? <WeeklyGrowthPack pack={weeklyGrowthPack} /> : null}
                {renderGuideDrawer()}
            </div>
        );
    }

    // Action state
    return (
        <div className={styles.todayContainer}>
            {renderHeader()}

            <OwnerActionPlanCard
                actionPlan={ownerActionPlan.actionPlan}
                confidence={ownerActionPlan.confidence}
                sourceQuality={ownerActionPlan.sourceQuality}
                analyticsAiEntitlement={ownerActionPlan.analyticsAiEntitlement}
                projectId={activeProject?.projectId || null}
            />

            {shouldShowTodayDigest ? <Text className={styles.todayDigest}>{todayDigest}</Text> : null}

            {/* Primary Campaign */}
            {todayCampaigns.primary && (
                <PrimaryCard
                    campaign={todayCampaigns.primary}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    isProcessing={isProcessing}
                />
            )}

            {renderInactiveItemsReminder()}

            {renderGrowthKitsEntry()}

            {weeklyGrowthPack ? <WeeklyGrowthPack pack={weeklyGrowthPack} /> : null}

            {/* Staff Prompt Section - Read-only, appears after action section */}
            <StaffPromptSection staffPrompt={staffPrompt} />

            {/* Physical Surfaces - Per spec: Read-only, download only */}
            {physicalSurfaces?.tentCard?.eligible && (
                <TentCardSection
                    tentCard={physicalSurfaces.tentCard}
                    activePlanType={(storeDetails as any)?.activePlanType}
                    brandColor={storeBrandColor}
                    brandName={storeName}
                    logoUrl={storeLogoUrl}
                />
            )}
            {physicalSurfaces?.counterSticker?.eligible && (
                <StickerSection
                    activePlanType={(storeDetails as any)?.activePlanType}
                    brandColor={storeBrandColor}
                    brandName={storeName}
                    logoUrl={storeLogoUrl}
                    sticker={physicalSurfaces.counterSticker}
                />
            )}

            {/* Operational Campaigns (Passive) */}
            {hasOperationalCampaigns && (
                <OperationalSection
                    campaigns={sortedOperationalCampaigns}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    isProcessing={isProcessing}
                />
            )}

            {/* Past Activity Link */}
            {FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY ? (
                <Button
                    type="link"
                    className={styles.historyLink}
                    href="/today/history"
                >
                    View past activity →
                </Button>
            ) : null}

            {/* Operational cards — always visible regardless of campaign state */}
            {storeDetails && (
                <>
                    <Divider />
                    {FEATURE_FLAGS.ENABLE_TEMP_STATUS && (
                        <TempStatusCard
                            storeDetails={storeDetails}
                            setStoreDetails={setStoreDetails}
                        />
                    )}
                    <OBPLinkCard storeDetails={storeDetails} />
                </>
            )}

            {renderGuideDrawer()}
        </div>
    );
};

export default TodayScreen;
