'use client'

import { usePastActivity } from '@hook/usePastActivity';
import { Campaign } from '@type/campaigns';
import { useMemo, useState } from 'react';
import { LuCheck, LuClock, LuClock3, LuX } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Card, DotLoading, Flex, Text } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
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
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const { campaigns, isLoading } = usePastActivity(selectedProjectId);

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
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Review generated, shared, and skipped Today actions from the last 7 days for the selected menu."
                onBack={onBack}
                title="Past Activity"
            />

            <Flex
                gap={12}
                style={{
                    padding: 16,
                }}
                vertical
            >

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
                            projectImage: selectedProjectSummary?.projectImage || null,
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
                        {(Object.entries(groupedHistory) as [string, Campaign[]][]).map(([dateLabel, entries]) => (
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
        </Flex>
    );
}
