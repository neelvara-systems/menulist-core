'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getProjectsList } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuBarChart3, LuCheck, LuEye, LuFlame, LuHeart, LuInfo, LuLayers, LuRefreshCw, LuShield, LuTrendingDown, LuZap } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, List, NavBar, Popup, Tabs, Tag, Text, Title, Toast } from '../antd';

interface MobileDashboardScreenProps {
    onBack: () => void;
}

const TRUST_COLORS: Record<string, string> = { strong: '#10b981', stable: '#3b82f6', weak: '#f59e0b' };
const RISK_COLORS: Record<string, string> = { stable: '#10b981', watch: '#f59e0b', at_risk: '#ef4444' };
const RISK_LABELS: Record<string, string> = { stable: 'Stable', watch: 'Watch', at_risk: 'At Risk' };

export default function MobileDashboardScreen({ onBack }: MobileDashboardScreenProps) {
    const t = useTranslations('MobileDashboard');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [viewMode, setViewMode] = useState<'overview' | 'daily' | 'weekly' | 'monthly'>('overview');
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const viewModeLabel = viewMode === 'overview'
        ? t('overview')
        : viewMode === 'daily'
            ? t('daily')
            : viewMode === 'weekly'
                ? t('weekly')
                : t('monthly');

    useEffect(() => {
        (async () => {
            try {
                const result = await getProjectsList();
                const projects = result?.projects || [];
                setProjectsList(projects);
                if (projects.length > 0) {
                    setProjectId(projects[0].projectId);
                    setProjectName(projects[0].name || 'Menu');
                }
            } catch {
                Toast.show({ content: t('failedToLoad'), duration: 2000 });
            } finally {
                setLoadingProjects(false);
            }
        })();
    }, []);

    const handleProjectSelect = async (selectedProjectId: string, selectedProjectName: string) => {
        setProjectId(selectedProjectId);
        setProjectName(selectedProjectName);
        setIsProjectSelectorOpen(false);
        Toast.show({ content: t('projectSwitched'), duration: 1000 });
    };

    const { data, loading, refetch } = useOwnerDashboard(projectId ? { projectId } : undefined);

    const handleRefresh = useCallback(async () => {
        try {
            await refetch();
            Toast.show({ content: t('refreshed'), duration: 1000 });
        } catch {
            Toast.show({ content: t('failedToRefresh'), duration: 1500 });
        }
    }, [refetch]);

    if (loadingProjects || (!projectId && loadingProjects)) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack}>{t('title')}</NavBar>
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    if (!projectId) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack}>{t('title')}</NavBar>
                <Flex align="center" gap={12} justify="center" style={{ flex: 1 }} vertical>
                    <LuBarChart3 color="#d1d5db" size={36} />
                    <Text type="secondary" style={{ textAlign: 'center' }}>
                        {t('noProjects', { offering: labels.offeringLower })}
                    </Text>
                </Flex>
            </Flex>
        );
    }

    const isLoading = loading && !data;
    const overview = data?.overview;
    const overall = data?.overall;
    const wtd = overview?.wtd;

    const getStatus = () => {
        if (!overview) return { icon: <LuInfo size={24} />, text: t('noDataYet'), color: '#9ca3af', bg: '#f3f4f6' };
        if (overview.status === 'working') return { icon: <LuCheck size={24} />, text: t('menuWorking', { offering: labels.offeringLower }), color: '#16a34a', bg: '#ecfdf5' };
        if (overview.status === 'low_activity') return { icon: <LuInfo size={24} />, text: t('lowActivity'), color: '#f59e0b', bg: '#fffbeb' };
        return { icon: <LuInfo size={24} />, text: t('waitingFirstScan'), color: '#9ca3af', bg: '#f3f4f6' };
    };

    const status = getStatus();

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar
                onBack={onBack}
                right={
                    <Flex align="center" gap={8}>
                        {projectsList.length > 1 ? (
                            <Button fill="none" onClick={() => setIsProjectSelectorOpen(true)} style={{ paddingInline: 8 }}>
                                <LuLayers size={18} color="#9ca3af" />
                            </Button>
                        ) : null}
                        <Button fill="none" onClick={handleRefresh} style={{ paddingInline: 8 }}>
                            <LuRefreshCw size={18} color="#9ca3af" />
                        </Button>
                    </Flex>
                }
            >
                {t('title')}
            </NavBar>

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <Card>
                    <Flex align="center" justify="space-between">
                        <Text type="secondary">
                            {t('viewing')} {projectName}
                        </Text>
                        {projectsList.length > 1 ? (
                            <Button fill="none" onClick={() => setIsProjectSelectorOpen(true)}>
                                <Text type="secondary">{t('changeProject')}</Text>
                            </Button>
                        ) : null}
                    </Flex>
                    <Tabs activeKey={viewMode} onChange={(key) => setViewMode(key as any)}>
                        <Tabs.Tab title={t('overview')} key="overview" />
                        <Tabs.Tab title={t('daily')} key="daily" />
                        <Tabs.Tab title={t('weekly')} key="weekly" />
                        <Tabs.Tab title={t('monthly')} key="monthly" />
                    </Tabs>
                </Card>

                {isLoading ? (
                    <Card>
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">{t('loading')}</Text>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        <Card style={{ backgroundColor: status.bg }}>
                            <Flex align="center" justify="space-between">
                                <Flex align="center" gap={12}>
                                    {status.icon}
                                    <Title level={4} style={{ color: status.color, margin: 0 }}>
                                        {status.text}
                                    </Title>
                                </Flex>
                                <Tag>{viewModeLabel}</Tag>
                            </Flex>
                        </Card>

                        {wtd ? (
                            <Card size="small" title={<Text strong>{t('last7Days')}</Text>}>
                                <Flex gap={12} wrap>
                                    <Card size="small" style={{ flex: '1 1 45%' }}>
                                        <Flex align="center" gap={8}>
                                            <LuEye color="#3b82f6" size={14} />
                                            <Text type="secondary">{labels.scansLabel}</Text>
                                        </Flex>
                                        <Title level={3} style={{ margin: 0 }}>
                                            {wtd.metrics?.menuVisits?.toLocaleString() || '0'}
                                        </Title>
                                    </Card>
                                    <Card size="small" style={{ flex: '1 1 45%' }}>
                                        <Flex align="center" gap={8}>
                                            <LuFlame color="#f97316" size={14} />
                                            <Text type="secondary">{t('itemTaps')}</Text>
                                        </Flex>
                                        <Title level={3} style={{ margin: 0 }}>
                                            {wtd.metrics?.itemClicks?.toLocaleString() || '0'}
                                        </Title>
                                    </Card>
                                    {wtd.metrics?.smartPicksRendered > 0 ? (
                                        <>
                                            <Card size="small" style={{ flex: '1 1 45%' }}>
                                                <Flex align="center" gap={8}>
                                                    <LuZap color="#a855f7" size={14} />
                                                    <Text type="secondary">{t('smartPicks')}</Text>
                                                </Flex>
                                                <Title level={3} style={{ margin: 0 }}>
                                                    {wtd.metrics.smartPicksRendered.toLocaleString()}
                                                </Title>
                                            </Card>
                                            <Card size="small" style={{ flex: '1 1 45%' }}>
                                                <Flex align="center" gap={8}>
                                                    <LuZap color="#22c55e" size={14} />
                                                    <Text type="secondary">{t('spClicks')}</Text>
                                                </Flex>
                                                <Title level={3} style={{ margin: 0 }}>
                                                    {wtd.metrics.smartPicksClicks.toLocaleString()}
                                                </Title>
                                            </Card>
                                        </>
                                    ) : null}
                                </Flex>
                            </Card>
                        ) : null}

                        {overview?.aiSummary?.bulletPoints?.length ? (
                            <Card size="small" title={<Text strong>{t('aiSummary')}</Text>}>
                                <List>
                                    {overview.aiSummary.bulletPoints.map((bullet: string, index: number) => (
                                        <List.Item key={`${bullet}-${index}`} title={<Text>{bullet}</Text>} />
                                    ))}
                                </List>
                            </Card>
                        ) : null}

                        {storeDetails?.healthSignals ? (
                            (() => {
                                const hs = storeDetails.healthSignals;
                                const showTrust = FEATURE_FLAGS.ENABLE_TRUST_HEALTH_SIGNAL && hs.trust?.visible;
                                const showLoyalty = FEATURE_FLAGS.ENABLE_LOYALTY_HEALTH_SIGNAL && hs.loyalty?.visible;
                                const showRisk = FEATURE_FLAGS.ENABLE_RISK_DECLINE_DETECTION && hs.risk?.visible;
                                if (!showTrust && !showLoyalty && !showRisk) return null;
                                return (
                                    <Card size="small" title={<Text strong>{t('businessHealth')}</Text>}>
                                        <List>
                                            {showTrust && hs.trust ? (
                                                <List.Item
                                                    key="trust"
                                                    prefix={<LuShield color={TRUST_COLORS[hs.trust.state] || '#3b82f6'} size={14} />}
                                                    extra={<Tag color="processing">{hs.trust.state}</Tag>}
                                                    title={<Text>{t('trust')}</Text>}
                                                />
                                            ) : null}
                                            {showLoyalty && hs.loyalty ? (
                                                <List.Item
                                                    key="loyalty"
                                                    prefix={<LuHeart color={TRUST_COLORS[hs.loyalty.state] || '#3b82f6'} size={14} />}
                                                    extra={<Tag color="processing">{hs.loyalty.state}</Tag>}
                                                    title={<Text>{t('loyalty')}</Text>}
                                                />
                                            ) : null}
                                            {showRisk && hs.risk ? (
                                                <List.Item
                                                    key="risk"
                                                    prefix={<LuTrendingDown color={RISK_COLORS[hs.risk.state] || '#22c55e'} size={14} />}
                                                    extra={<Tag color="warning">{RISK_LABELS[hs.risk.state] || hs.risk.state}</Tag>}
                                                    title={<Text>{t('health')}</Text>}
                                                />
                                            ) : null}
                                        </List>
                                    </Card>
                                );
                            })()
                        ) : null}

                        {wtd?.topItems?.length ? (
                            <Card size="small" title={<Text strong>{t('topItems')}</Text>}>
                                <List>
                                    {wtd.topItems.slice(0, 5).map((item: any, index: number) => (
                                        <List.Item
                                            key={item.itemId || index}
                                            prefix={<Tag>{index + 1}</Tag>}
                                            extra={<Tag>{`${item.clicks} clicks`}</Tag>}
                                            title={<Text>{item.name || item.itemId}</Text>}
                                        />
                                    ))}
                                </List>
                            </Card>
                        ) : null}

                        {overall?.lifetimeMetrics ? (
                            <Card size="small" title={<Text strong>{t('allTime')}</Text>}>
                                <Flex gap={12} wrap>
                                    <Card size="small" style={{ flex: '1 1 45%' }}>
                                        <Title level={4} style={{ margin: 0 }}>
                                            {overall.lifetimeMetrics.totalViews?.toLocaleString() || '0'}
                                        </Title>
                                        <Text type="secondary">{t('totalScans')}</Text>
                                    </Card>
                                    <Card size="small" style={{ flex: '1 1 45%' }}>
                                        <Title level={4} style={{ margin: 0 }}>
                                            {overall.lifetimeMetrics.totalClicks?.toLocaleString() || '0'}
                                        </Title>
                                        <Text type="secondary">{t('totalClicks')}</Text>
                                    </Card>
                                </Flex>
                                {overall.firstDataDate ? (
                                    <Text type="secondary">
                                        {`Since ${new Date(overall.firstDataDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                    </Text>
                                ) : null}
                            </Card>
                        ) : null}

                        {!overview && !overall ? (
                            <Card>
                                <Flex align="center" gap={12} vertical>
                                    <LuBarChart3 color="#d1d5db" size={36} />
                                    <Text type="secondary" style={{ textAlign: 'center' }}>
                                        {t('noAnalyticsYet', { offering: labels.offeringLower })}
                                    </Text>
                                </Flex>
                            </Card>
                        ) : null}
                    </>
                )}
            </Flex>

            <Popup
                bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70vh' }}
                onMaskClick={() => setIsProjectSelectorOpen(false)}
                position="bottom"
                visible={isProjectSelectorOpen}
            >
                <Flex gap={12} vertical>
                    <Title level={4} style={{ margin: 0 }}>
                        {t('selectProject')}
                    </Title>
                    <List>
                        {projectsList.map((project: any) => (
                            <List.Item
                                key={project.projectId}
                                onClick={() => handleProjectSelect(project.projectId, project.name || 'Menu')}
                                prefix={<LuLayers color="#1677ff" size={18} />}
                                extra={project.projectId === projectId ? <LuCheck color="#1677ff" size={18} /> : null}
                                title={<Text>{project.name || t('unnamedProject')}</Text>}
                                description={
                                    <Text type="secondary">
                                        {project.isDefault ? `${t('default')} • ` : ''}
                                        {t('itemsCount', { count: project.itemCount || 0 })}
                                    </Text>
                                }
                            />
                        ))}
                    </List>
                    <Button block fill="outline" onClick={() => setIsProjectSelectorOpen(false)}>
                        {t('cancel')}
                    </Button>
                </Flex>
            </Popup>
        </Flex>
    );
}
