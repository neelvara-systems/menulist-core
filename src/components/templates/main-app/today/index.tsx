"use client";

import { FEATURE_FLAGS } from "@config/features";
import { getCampaign } from "@database/campaigns";
import { getProjectsListWithoutLoader } from "@database/projects";
import { TODAY_FEATURE_GUIDE_SECTIONS, TODAY_FEATURE_GUIDE_TITLE } from "@constant/todayFeatureGuide";
import { generateCampaignsForProject, useTodayCampaigns } from "@hook/useTodayCampaigns";
import { buildTodayMenuLink, TodayActionFeedback, performTodaySurfaceAction } from "@lib/campaigns/todayActionExecutor";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { CampaignType, ExecutionSurface, ExportMethod } from "@type/campaigns";
import { Button, Divider, Drawer, Select, Spin, Typography, notification } from "antd";
import { useContext, useEffect, useMemo, useState } from "react";
import { LuCalendarOff, LuInfo } from "react-icons/lu";
import useSWR from "swr";
import OBPLinkCard from "../businessSettings/OBPLinkCard";
import TempStatusCard from "../businessSettings/TempStatusCard";
import EmptyState from "./components/EmptyState";
import OperationalSection from "./components/OperationalSection";
import PostActionState from "./components/PostActionState";
import PrimaryCard from "./components/PrimaryCard";
import StaffPromptSection from "./components/StaffPromptSection";
import StickerSection from "./components/StickerSection";
import TentCardSection from "./components/TentCardSection";
import { useCampaignActions } from "./hooks/useCampaignActions";
import styles from "./styles.module.scss";

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
    const [screenState, setScreenState] = useState<ScreenState>("loading");
    const [lastAction, setLastAction] = useState<"shared" | "skipped" | null>(null);
    const [lastActionFeedback, setLastActionFeedback] = useState<TodayActionFeedback | null>(null);
    const [isGeneratingTodayActions, setIsGeneratingTodayActions] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

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

        if (todayCampaigns.primary || todayCampaigns.operational.length > 0) {
            setScreenState("action");
        } else {
            setScreenState("empty");
        }
    }, [todayCampaigns, isLoading]);

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

            {/* Primary Campaign */}
            {todayCampaigns.primary && (
                <PrimaryCard
                    campaign={todayCampaigns.primary}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    isProcessing={isProcessing}
                />
            )}

            {/* Staff Prompt Section - Per spec: Read-only, appears below primary card */}
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
            {todayCampaigns.operational.length > 0 && (
                <OperationalSection
                    campaigns={todayCampaigns.operational}
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
