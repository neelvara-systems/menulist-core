"use client";

import { getProjectsListWithoutLoader } from "@database/projects";
import { PAST_ACTIVITY_GUIDE_SECTIONS, PAST_ACTIVITY_GUIDE_TITLE } from "@constant/todayFeatureGuide";
import { usePastActivity } from "@hook/usePastActivity";
import { Campaign } from "@type/campaigns";
import { Button, Drawer, Select, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuCheck, LuClock3, LuInfo, LuX } from "react-icons/lu";
import useSWR from "swr";
import styles from "../styles.module.scss";

const { Title, Text } = Typography;
type ProjectSummary = {
    active?: boolean;
    deleted?: boolean;
    isDefault?: boolean;
    name?: string;
    projectId: string;
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

/**
 * Past Activity Screen
 * 
 * Per Strategy Doc:
 * - Read-only list
 * - Date grouped
 * - No filters
 * - No metrics
 * - No exports
 * 
 * "This is memory, not management."
 * 
 * HARD CONSTRAINTS (ChatGPT Review Fix #2):
 * - Max 7 days visible (prevents analysis behavior)
 * - No sorting options
 * - No filters
 * - No grouping labels like "Completed 5 times"
 * - No counts or statistics
 * - Must feel like "a memory, not a report"
 */
const PastActivityScreen = () => {
    const router = useRouter();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const {
        data: projects = [],
        isLoading: isProjectsLoading,
    } = useSWR<ProjectSummary[]>(
        "past-activity-projects",
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
    const { campaigns, isLoading: isHistoryLoading } = usePastActivity(selectedProjectId);

    useEffect(() => {
        if (!projects.length) {
            setSelectedProjectId(null);
            return;
        }

        const resolvedProject = resolveSelectedProject(projects, selectedProjectId);
        if (resolvedProject?.projectId !== selectedProjectId) {
            setSelectedProjectId(resolvedProject?.projectId || null);
        }
    }, [projects, selectedProjectId]);

    const isLoading = isProjectsLoading || (!!selectedProjectId && isHistoryLoading);

    const selectedProject = useMemo(
        () => projects.find((project) => project.projectId === selectedProjectId) || null,
        [projects, selectedProjectId]
    );

    // Group campaigns by date (simple display, NO counts, NO statistics)
    // HARD RULE: No "Completed X times" labels ever
    const groupedByDate = campaigns.reduce((acc, campaign) => {
        const activityDate = campaign.resolvedAt?.toDate() || campaign.updatedAt?.toDate() || campaign.createdAt?.toDate();
        const date = activityDate
            ? new Date(activityDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            })
            : 'Unknown';

        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(campaign);
        return acc;
    }, {} as Record<string, Campaign[]>);

    // Get display title for campaign (no "campaign" word)
    const getCampaignTitle = (campaign: Campaign): string => {
        switch (campaign.type) {
            case 'todays_special':
                return "Today's Special";
            case 'weekend_pick':
                return "Weekend Pick";
            case 'now_available':
                return `Now Available: ${campaign.subject.itemName || 'Item'}`;
            case 'menu_highlight':
                return "Menu Highlight";
            case 'meal_push':
                return "Meal Push";
            case 'bestseller_boost':
                return "Bestseller";
            case 'slow_item_rescue':
                return "Item Highlight";
            case 'festival':
                return "Festival Special";
            case 'new_item':
                return "New Item";
            default:
                return campaign.subject.itemName || 'Item';
        }
    };

    const renderProjectSelector = () => (
        <div className={styles.projectSelectorRow}>
            <Text type="secondary">Project</Text>
            <Select
                className={styles.projectSelector}
                onChange={(value) => setSelectedProjectId(value)}
                options={projects.map((project) => ({
                    label: project.name || 'Untitled',
                    value: project.projectId,
                }))}
                placeholder="Select project"
                value={selectedProjectId || undefined}
            />
        </div>
    );

    if (isLoading) {
        return (
            <div className={styles.pastActivityContainer}>
                <div className={styles.header}>
                    <Button
                        type="text"
                        icon={<LuArrowLeft />}
                        onClick={() => router.back()}
                        className={styles.backButton}
                    />
                    <Title level={3}>Past activity</Title>
                    <Button
                        type="text"
                        icon={<LuInfo />}
                        onClick={() => setIsGuideOpen(true)}
                        className={styles.infoButton}
                    >
                        What is this?
                    </Button>
                </div>
                {projects.length > 0 ? renderProjectSelector() : null}
                <div className={styles.loadingState}>
                    <Spin size="large" />
                </div>
                <Drawer
                    closable={false}
                    onClose={() => setIsGuideOpen(false)}
                    open={isGuideOpen}
                    placement="bottom"
                    title={PAST_ACTIVITY_GUIDE_TITLE}
                    height="65vh"
                >
                    <div className={styles.guideContent}>
                        {PAST_ACTIVITY_GUIDE_SECTIONS.map((section) => (
                            <div key={section.title} className={styles.guideSection}>
                                <Text strong>{section.title}</Text>
                                <Text type="secondary">{section.description}</Text>
                            </div>
                        ))}
                    </div>
                </Drawer>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className={styles.pastActivityContainer}>
                <div className={styles.header}>
                    <Button
                        type="text"
                        icon={<LuArrowLeft />}
                        onClick={() => router.back()}
                        className={styles.backButton}
                    />
                    <Title level={3}>Past activity</Title>
                    <Button
                        type="text"
                        icon={<LuInfo />}
                        onClick={() => setIsGuideOpen(true)}
                        className={styles.infoButton}
                    >
                        What is this?
                    </Button>
                </div>
                {projects.length > 0 ? renderProjectSelector() : null}
                <div className={styles.emptyState}>
                    <Text type="secondary">
                        {selectedProject
                            ? `No activity yet for ${selectedProject.name || 'this project'}.`
                            : 'No activity yet.'}
                    </Text>
                </div>
                <Drawer
                    closable={false}
                    onClose={() => setIsGuideOpen(false)}
                    open={isGuideOpen}
                    placement="bottom"
                    title={PAST_ACTIVITY_GUIDE_TITLE}
                    height="65vh"
                >
                    <div className={styles.guideContent}>
                        {PAST_ACTIVITY_GUIDE_SECTIONS.map((section) => (
                            <div key={section.title} className={styles.guideSection}>
                                <Text strong>{section.title}</Text>
                                <Text type="secondary">{section.description}</Text>
                            </div>
                        ))}
                    </div>
                </Drawer>
            </div>
        );
    }

    return (
        <div className={styles.pastActivityContainer}>
            <div className={styles.header}>
                <Button
                    type="text"
                    icon={<LuArrowLeft />}
                    onClick={() => router.back()}
                    className={styles.backButton}
                />
                <Title level={3}>Past activity</Title>
                <Button
                    type="text"
                    icon={<LuInfo />}
                    onClick={() => setIsGuideOpen(true)}
                    className={styles.infoButton}
                >
                    What is this?
                </Button>
            </div>
            {projects.length > 0 ? renderProjectSelector() : null}

            <div className={styles.activityList}>
                {(Object.entries(groupedByDate) as [string, Campaign[]][]).map(([date, dateCampaigns]) => (
                    <div key={date} className={styles.dateGroup}>
                        <div className={styles.dateLabel}>{date}</div>
                        {dateCampaigns.map((campaign) => (
                            <div key={campaign.id} className={styles.activityItem}>
                                {campaign.status === 'completed' ? (
                                    <LuCheck className={`${styles.statusIcon} ${styles.completed}`} />
                                ) : campaign.status === 'suggested' ? (
                                    <LuClock3 className={`${styles.statusIcon} ${styles.pending}`} />
                                ) : (
                                    <LuX className={`${styles.statusIcon} ${styles.skipped}`} />
                                )}
                                <span className={styles.activityText}>
                                    {getCampaignTitle(campaign)}
                                    {campaign.status === 'skipped' && ' — Skipped'}
                                    {campaign.status === 'suggested' && ' — Generated'}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <Drawer
                closable={false}
                onClose={() => setIsGuideOpen(false)}
                open={isGuideOpen}
                placement="bottom"
                title={PAST_ACTIVITY_GUIDE_TITLE}
                height="65vh"
            >
                <div className={styles.guideContent}>
                    {PAST_ACTIVITY_GUIDE_SECTIONS.map((section) => (
                        <div key={section.title} className={styles.guideSection}>
                            <Text strong>{section.title}</Text>
                            <Text type="secondary">{section.description}</Text>
                        </div>
                    ))}
                </div>
            </Drawer>
        </div>
    );
};

export default PastActivityScreen;
