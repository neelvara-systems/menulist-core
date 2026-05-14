"use client";

import { FEATURE_FLAGS } from "@config/features";
import { getCampaign } from "@database/campaigns";
import { getProjectsListWithoutLoader } from "@database/projects";
import { TODAY_FEATURE_GUIDE_SECTIONS, TODAY_FEATURE_GUIDE_TITLE } from "@constant/todayFeatureGuide";
import { useOwnerActionPlan } from "@hook/useOwnerActionPlan";
import { generateCampaignsForProject, useTodayCampaigns } from "@hook/useTodayCampaigns";
import { buildTodayMenuLink, TodayActionFeedback, performTodaySurfaceAction } from "@lib/campaigns/todayActionExecutor";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { getInactiveItemsReminder, getInactiveReminderDismissKey } from "@lib/today/inactiveItemsReminder";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { CampaignType, ExecutionSurface, ExportMethod } from "@type/campaigns";
import { Button, Card, Divider, Drawer, Select, Spin, Typography, notification } from "antd";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { LuCalendarOff, LuInfo } from "react-icons/lu";
import useSWR from "swr";
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
import { useCampaignActions } from "./hooks/useCampaignActions";
import styles from "./styles.module.scss";
import { sortOperationalCampaignsByPriority } from "@lib/today/todayCampaignPrioritizer";

const { Title, Text } = Typography;

type ScreenState = "loading" | "action" | "empty" | "post-action";
type ProjectSummary = {
    active?: boolean;
    deleted?: boolean;
    isDefault?: boolean;
    name?: string | Record<string, string>;
    projectId: string;
};

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
        return 'No action suggestions available right now.';
    }

    return `${parts.join(' · ')}.`;
};

const resolveSelectedProject = (
    projects: ProjectSummary[],
    preferredProjectId?: string | null,
) => {
    const availableProjects = projects.filter((project) => project.deleted !== true);
    const activeProjects = availableProjects.filter((project) => project.active !== false);
    const selectionPool = activeProjects.length ? activeProjects : availableProjects.length ? availableProjects : projects;

    if (!selectionPool.length) return null;

    if (preferredProjectId) {
        const preferred = availableProjects.find((project) => project.projectId === preferredProjectId)
            || projects.find((project) => project.projectId === preferredProjectId);
        if (preferred) return preferred;
    }

    return selectionPool.find((project) => project.isDefault) || selectionPool[0] || null;
};

const TodayScreen = () => {
    const router = useRouter();
    const [screenState, setScreenState] = useState<ScreenState>("loading");
    const [lastAction, setLastAction] = useState<"shared" | "skipped" | null>(null);
    const [lastActionFeedback, setLastActionFeedback] = useState<TodayActionFeedback | null>(null);
    const [isGeneratingTodayActions, setIsGeneratingTodayActions] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isInactiveReminderDismissed, setIsInactiveReminderDismissed] = useState(false);

    const { todayCampaigns, staffPrompt, physicalSurfaces, isLoading, mutate } = useTodayCampaigns();
    const { completeCampaign, skipCampaign, isProcessing } = useCampaignActions();
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const { activeProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProject?.projectId || null);
    const { data: projects = [] } = useSWR<ProjectSummary[]>(
        "today-projects",
        async () => {
            const result = await getProjectsListWithoutLoader(true);
            return (result?.projects || []) as ProjectSummary[];
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 30000,
        }
    );
    const selectedProject = useMemo(
        () => projects.find((project) => project.projectId === selectedProjectId) || null,
        [projects, selectedProjectId]
    );
    const inactiveItemsReminder = useMemo(() => {
        if (!activeProject?.projectId || activeProject.projectId !== selectedProjectId) return null;
        return getInactiveItemsReminder(activeProject as any);
    }, [activeProject, selectedProjectId]);
    const ownerActionPlan = useOwnerActionPlan(selectedProjectId);
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
    const shouldShowMainActionHint = screenState === "action" && !hasPrimaryCampaign;

    // Check if feature is enabled
    const isEnabled = FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED;

    useEffect(() => {
        if (!projects.length) {
            setSelectedProjectId(null);
            return;
        }

        const resolvedProject = resolveSelectedProject(projects, activeProject?.projectId || selectedProjectId);
        if (resolvedProject?.projectId !== selectedProjectId) {
            setSelectedProjectId(resolvedProject?.projectId || null);
        }
    }, [activeProject?.projectId, projects, selectedProjectId]);

    useEffect(() => {
        if (isLoading) {
            setScreenState("loading");
            return;
        }

        if (!todayCampaigns || todayCampaigns.isEmpty) {
            setScreenState("empty");
            return;
        }

        if (todayCampaigns.primary || sortedOperationalCampaigns.length > 0) {
            setScreenState("action");
        } else {
            setScreenState("empty");
        }
    }, [todayCampaigns, isLoading, sortedOperationalCampaigns.length]);

    useEffect(() => {
        const dismissKey = getInactiveReminderDismissKey(storeDetails?.storeId, inactiveItemsReminder?.projectId);
        if (!dismissKey) {
            setIsInactiveReminderDismissed(false);
            return;
        }
        setIsInactiveReminderDismissed(localStorage.getItem(dismissKey) === '1');
    }, [inactiveItemsReminder?.projectId, storeDetails?.storeId]);

    const dismissInactiveReminder = () => {
        const dismissKey = getInactiveReminderDismissKey(storeDetails?.storeId, inactiveItemsReminder?.projectId);
        if (dismissKey) {
            localStorage.setItem(dismissKey, '1');
        }
        setIsInactiveReminderDismissed(true);
    };

    const shouldShowInactiveReminder = Boolean(inactiveItemsReminder && !isInactiveReminderDismissed);

    const handleComplete = async (
        campaignId: string,
        projectId: string,
        campaignType: CampaignType,
        surface: ExecutionSurface,
        method: ExportMethod,
        itemName?: string
    ) => {
        try {
            const menuLink = buildTodayMenuLink(
                storeDetails?.subdomain,
                storeDetails?.customDomain,
                (activeProject as any)?.name || selectedProject?.name,
            );
            const fullCampaign = surface === 'whatsapp_status' || surface === 'whatsapp_message'
                ? null
                : await getCampaign(campaignId);
            const actionFeedback = await performTodaySurfaceAction({
                surface,
                itemName: itemName || fullCampaign?.subject?.itemName || 'Item',
                menuLink,
                imageUrl: fullCampaign?.assets?.imageUrl,
            });
            const result = await completeCampaign(campaignId, projectId, campaignType, surface, method);
            if (result?.today) {
                await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            }
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
            console.error("Failed to complete campaign:", error);
        }
    };

    const handleSkip = async (campaignId: string, campaignType: CampaignType) => {
        try {
            const result = await skipCampaign(campaignId, campaignType);
            if (result?.today) {
                await mutate((current) => current ? { ...current, today: result.today } : current, { revalidate: false });
            }
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
            console.error("Failed to skip campaign:", error);
            notification.error({
                message: "Failed to skip",
                description: "Please try again.",
                placement: "bottomRight",
            });
        }
    };

    const handleGenerateTodayActions = async () => {
        if (!selectedProjectId) return;
        setIsGeneratingTodayActions(true);
        try {
            await generateCampaignsForProject(selectedProjectId, true);
            await mutate();
        } catch (error) {
            console.error("Failed to generate today campaigns:", error);
        } finally {
            setIsGeneratingTodayActions(false);
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

    // Feature not enabled state
    if (!isEnabled) {
        return (
            <div className={styles.todayContainer}>
                {renderHeader()}
                <div className={styles.emptyState}>
                    <LuCalendarOff className={styles.emptyIcon} />
                    <Text type="secondary">
                        This feature is coming soon.
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
                />
                <Text className={styles.todayDigest}>{todayDigest}</Text>
                {renderInactiveItemsReminder()}
                <EmptyState
                    canGenerate={Boolean(selectedProjectId)}
                    isGenerating={isGeneratingTodayActions}
                    onGenerate={handleGenerateTodayActions}
                    selectorContent={projects.length > 0 ? (
                        <div className={styles.todayProjectSelectorRow}>
                            <Text type="secondary">Project</Text>
                            <Select
                                className={styles.todayProjectSelector}
                                onChange={(value) => setSelectedProjectId(value)}
                                options={projects.map((project) => ({
                                    label: resolveProjectName(project.name),
                                    value: project.projectId,
                                }))}
                                placeholder="Select project"
                                value={selectedProjectId || undefined}
                            />
                        </div>
                    ) : null}
                />
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
            />

            {shouldShowMainActionHint ? (
                <Card className={styles.sectionSummaryCard} size="small">
                    <Text strong>No main action today</Text>
                    <Text type="secondary">Use the Generate button if you want a main action now.</Text>
                </Card>
            ) : null}

            <Text className={styles.todayDigest}>{todayDigest}</Text>

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

            {/* Staff Prompt Section - Read-only, appears after action section */}
            <StaffPromptSection staffPrompt={staffPrompt} />

            {/* Physical Surfaces - Per spec: Read-only, download only */}
            {physicalSurfaces?.tentCard?.eligible && (
                <TentCardSection
                    tentCard={physicalSurfaces.tentCard}
                    brandName={todayCampaigns.primary?.subject?.itemName}
                />
            )}
            {physicalSurfaces?.counterSticker?.eligible && (
                <StickerSection sticker={physicalSurfaces.counterSticker} />
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
            <Button
                type="link"
                className={styles.historyLink}
                href="/today/history"
            >
                View past activity →
            </Button>

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
