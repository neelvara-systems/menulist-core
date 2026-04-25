'use client'

import { getCampaignHistory } from '@database/campaigns';
import { PAST_ACTIVITY_GUIDE_SECTIONS, PAST_ACTIVITY_GUIDE_TITLE } from '@constant/todayFeatureGuide';
import { Campaign } from '@type/campaigns';
import { useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuCheck, LuClock, LuClock3, LuInfo, LuX } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, Popup, Text, Title } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

interface MobileTodayHistoryScreenProps {
    onBack: () => void;
}

export default function MobileTodayHistoryScreen({ onBack }: MobileTodayHistoryScreenProps) {
    const {
        isLoading: loadingProjects,
        projectsList,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
    } = useMobileProjects();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            if (!selectedProjectId) {
                setCampaigns([]);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const history = await getCampaignHistory(20, selectedProjectId);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const recentHistory = history.filter((campaign) => {
                    const activityDate = campaign.resolvedAt?.toDate() || campaign.updatedAt?.toDate() || campaign.createdAt?.toDate();
                    if (!activityDate) return false;
                    return activityDate >= sevenDaysAgo;
                });

                setCampaigns(recentHistory);
            } catch (error) {
                console.error('[MobileTodayHistory] Failed to load history:', error);
                setCampaigns([]);
            } finally {
                setIsLoading(false);
            }
        };

        void loadHistory();
    }, [selectedProjectId]);

    const groupedHistory = useMemo(() => {
        return campaigns.reduce<Record<string, Campaign[]>>((accumulator, campaign) => {
            const activityDate = campaign.resolvedAt?.toDate() || campaign.updatedAt?.toDate() || campaign.createdAt?.toDate();
            const key = activityDate
                ? new Date(activityDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    weekday: 'long',
                })
                : 'Unknown';
            if (!accumulator[key]) accumulator[key] = [];
            accumulator[key].push(campaign);
            return accumulator;
        }, {});
    }, [campaigns]);

    const getCampaignLabel = (campaign: Campaign) => {
        switch (campaign.type) {
            case 'todays_special':
                return "Today's Special";
            case 'weekend_pick':
                return 'Weekend Pick';
            case 'now_available':
                return `Now Available: ${campaign.subject.itemName || 'Item'}`;
            case 'menu_highlight':
                return 'Menu Highlight';
            case 'meal_push':
                return 'Meal Push';
            case 'bestseller_boost':
                return 'Bestseller';
            case 'slow_item_rescue':
                return 'Item Highlight';
            case 'festival':
                return 'Festival Special';
            case 'new_item':
                return 'New Item';
            default:
                return campaign.subject.itemName || 'Item';
        }
    };

    return (
        <Flex
            gap={12}
            style={{
                padding: 16,
                paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
            }}
            vertical
        >
            <Flex align="center" gap={8}>
                <Button fill="none" onClick={onBack} size="small" style={{ minHeight: 32, minWidth: 32, paddingInline: 6 }}>
                    <LuArrowLeft size={16} />
                </Button>
                <Title level={4} style={{ margin: 0 }}>Past Activity</Title>
                <Button
                    fill="none"
                    onClick={() => setIsGuideOpen(true)}
                    size="small"
                    style={{ marginLeft: 'auto', minHeight: 32, minWidth: 32, paddingInline: 6 }}
                >
                    <Flex align="center" gap={6}>
                        <LuInfo size={16} />
                        <Text type="secondary">What is this?</Text>
                    </Flex>
                </Button>
            </Flex>

            {!loadingProjects && selectedProjectId ? (
                <ProjectSelectorTrigger
                    clickable={projectsList.length > 1}
                    currentProject={{
                        active: selectedProjectSummary?.active !== false,
                        deleted: selectedProjectSummary?.deleted === true,
                        id: selectedProjectId,
                        isDefault: selectedProjectSummary?.isDefault,
                        isSpecialMenu: selectedProjectSummary?.isSpecialMenu === true,
                        name: selectedProjectSummary?.name || 'Untitled',
                        specialMenuBaseProjectId: selectedProjectSummary?.specialMenuBaseProjectId,
                        specialMenuBaseProjectName: selectedProjectSummary?.specialMenuBaseProjectId
                            ? projectsList.find((project: any) => project.projectId === selectedProjectSummary.specialMenuBaseProjectId)?.name
                            : undefined,
                        specialMenuEndsAt: selectedProjectSummary?.specialMenuEndsAt,
                        specialMenuStatus: selectedProjectSummary?.specialMenuStatus,
                    }}
                    onClick={projectsList.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />
            ) : null}

            {isLoading ? (
                <Flex align="center" justify="center" style={{ minHeight: 220 }}>
                    <DotLoading color="primary" />
                </Flex>
            ) : !selectedProjectId ? (
                <Card>
                    <Flex align="center" gap={10}>
                        <LuClock size={18} />
                        <Text type="secondary">No project available.</Text>
                    </Flex>
                </Card>
            ) : Object.keys(groupedHistory).length === 0 ? (
                <Card>
                    <Flex align="center" gap={10}>
                        <LuClock size={18} />
                        <Text type="secondary">No activity in the last 7 days for this project.</Text>
                    </Flex>
                </Card>
            ) : (
                <Flex gap={10} vertical>
                    {Object.entries(groupedHistory).map(([dateLabel, entries]) => (
                        <Card key={dateLabel}>
                            <Flex gap={8} vertical>
                                <Text strong>{dateLabel}</Text>
                                <Flex gap={8} vertical>
                                    {entries.map((entry) => (
                                        <Flex align="center" gap={8} key={entry.id}>
                                            {entry.status === 'completed' ? (
                                                <LuCheck color="#16a34a" size={15} />
                                            ) : entry.status === 'suggested' ? (
                                                <LuClock3 color="#d97706" size={15} />
                                            ) : (
                                                <LuX color="#dc2626" size={15} />
                                            )}
                                            <Text>
                                                {getCampaignLabel(entry)}
                                                {entry.status === 'skipped' ? ' — Skipped' : ''}
                                                {entry.status === 'suggested' ? ' — Generated' : ''}
                                            </Text>
                                        </Flex>
                                    ))}
                                </Flex>
                            </Flex>
                        </Card>
                    ))}
                </Flex>
            )}

            <Popup
                bodyStyle={{ maxHeight: '75vh', overflowY: 'auto', paddingBottom: 12 }}
                onMaskClick={() => setIsGuideOpen(false)}
                visible={isGuideOpen}
            >
                <Flex gap={12} vertical>
                    <Flex align="center" justify="space-between">
                        <Text strong>{PAST_ACTIVITY_GUIDE_TITLE}</Text>
                        <Button
                            fill="none"
                            onClick={() => setIsGuideOpen(false)}
                            size="small"
                            style={{ minHeight: 32, minWidth: 32, paddingInline: 6 }}
                        >
                            ✕
                        </Button>
                    </Flex>
                    <Flex gap={10} vertical>
                        {PAST_ACTIVITY_GUIDE_SECTIONS.map((section) => (
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

            <MobileProjectSelectorSheet
                currentProjectId={selectedProjectId}
                currentProjectName={selectedProjectSummary?.name || null}
                onClose={() => setIsProjectSelectorOpen(false)}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />
        </Flex>
    );
}
