'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useState } from 'react';
import { LuBarChart3, LuCalendar, LuCheck, LuEye, LuFlame, LuHeart, LuInfo, LuRefreshCw, LuShield, LuTrendingDown, LuTrendingUp, LuZap } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, List, NavBar, Tabs, Tag, Text, Title, Toast } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileScreenIntro from '../components/MobileScreenIntro';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

// Customer App (installable PWA) metrics — store-scoped (projectId='customerApp').
// Renders nothing when feature-flag off or no data yet, so it's safe to mount
// unconditionally here alongside menu analytics.
const MobileCustomerAppMetrics = dynamic(
    () => import('./dashboardSections/MobileCustomerAppMetrics'),
    { ssr: false },
);

interface MobileDashboardScreenProps {
    onBack: () => void;
}

const TRUST_COLORS: Record<string, string> = { strong: '#10b981', stable: '#3b82f6', weak: '#f59e0b' };
const RISK_COLORS: Record<string, string> = { stable: '#10b981', watch: '#f59e0b', at_risk: '#ef4444' };
const RISK_LABELS: Record<string, string> = { stable: 'Stable', watch: 'Watch', at_risk: 'At Risk' };

export default function MobileDashboardScreen({ onBack }: MobileDashboardScreenProps) {
    const t = useTranslations('MobileDashboard');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const { isLoading: loadingProjects, projectsList, selectedProjectId, selectedProjectSummary, selectProject } = useMobileProjects();
    const [viewMode, setViewMode] = useState<'overview' | 'daily' | 'weekly' | 'monthly'>('overview');
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const viewModeLabel = viewMode === 'overview'
        ? t('overview')
        : viewMode === 'daily'
            ? t('daily')
            : viewMode === 'weekly'
                ? t('weekly')
                : t('monthly');

    const { data, loading, refetch } = useOwnerDashboard(selectedProjectId ? { projectId: selectedProjectId } : undefined);

    const handleRefresh = useCallback(async () => {
        try {
            await refetch();
            Toast.show({ content: t('refreshed'), duration: 1000 });
        } catch {
            Toast.show({ content: t('failedToRefresh'), duration: 1500 });
        }
    }, [refetch]);

    if (loadingProjects || (!selectedProjectId && loadingProjects)) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    if (!selectedProjectId) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} />
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
    const mtd = overview?.mtd;
    const historicalWeeks = overview?.historicalWeeks || data?.historicalWeeks || [];

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
                        <Button fill="none" onClick={handleRefresh} style={{ paddingInline: 8 }}>
                            <LuRefreshCw size={18} color="#9ca3af" />
                        </Button>
                    </Flex>
                }
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle', { offering: labels.offeringLower })}
                    title={t('title')}
                />
                <ProjectSelectorTrigger
                    clickable={projectsList.length > 1}
                    currentProject={{
                        id: selectedProjectId,
                        isDefault: selectedProjectSummary?.isDefault,
                        name: selectedProjectSummary?.name || t('unnamedProject'),
                    }}
                    onClick={projectsList.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                    rightContent={<Tag>{viewModeLabel}</Tag>}
                />

                <Card size="small">
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

                        {/* Customer App (installable PWA) — store-scoped analytics.
                            Sits alongside menu analytics on purpose: owners see both in one place. */}
                        <MobileCustomerAppMetrics />

                        {overview?.aiSummary?.bulletPoints?.length ? (
                            <Card size="small" title={<Text strong>{t('aiSummary')}</Text>}>
                                <List>
                                    {overview.aiSummary.bulletPoints.map((bullet: string, index: number) => (
                                        <List.Item key={`${bullet}-${index}`} title={<Text>{bullet}</Text>} />
                                    ))}
                                </List>
                            </Card>
                        ) : null}

                        {/* 4-Week Trend — most engaging visual for SMB owners */}
                        {historicalWeeks.length > 0 ? (() => {
                            const maxScans = Math.max(...historicalWeeks.map((w: any) => w.metrics?.menuVisits || 0), 1);
                            return (
                                <Card size="small" title={
                                    <Flex align="center" gap={6}>
                                        <LuTrendingUp color="#3b82f6" size={14} />
                                        <Text strong>4-Week Trend</Text>
                                    </Flex>
                                }>
                                    <Flex gap={8} vertical>
                                        {historicalWeeks.map((week: any, idx: number) => {
                                            const pct = Math.round((week.metrics?.menuVisits || 0) / maxScans * 100);
                                            return (
                                                <Flex key={idx} align="center" gap={8}>
                                                    <Text type="secondary" style={{ fontSize: 11, minWidth: 56 }}>{week.weekLabel}</Text>
                                                    <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                                        <div style={{
                                                            background: week.isCurrentWeek ? '#3b82f6' : '#93c5fd',
                                                            borderRadius: 4,
                                                            height: '100%',
                                                            width: `${pct}%`,
                                                            transition: 'width 0.4s ease',
                                                        }} />
                                                    </div>
                                                    <Text style={{ fontSize: 12, minWidth: 32, textAlign: 'right', fontWeight: week.isCurrentWeek ? 600 : 400 }}>
                                                        {(week.metrics?.menuVisits || 0).toLocaleString()}
                                                    </Text>
                                                    {week.isCurrentWeek ? <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>Now</Tag> : null}
                                                </Flex>
                                            );
                                        })}
                                    </Flex>
                                </Card>
                            );
                        })() : null}

                        {/* MTD Summary */}
                        {mtd ? (
                            <Card size="small" title={
                                <Flex align="center" gap={6}>
                                    <LuCalendar color="#8b5cf6" size={14} />
                                    <Text strong>This Month</Text>
                                </Flex>
                            }>
                                <Flex gap={12} wrap>
                                    <Card size="small" style={{ flex: '1 1 45%' }}>
                                        <Flex align="center" gap={6}>
                                            <LuEye color="#3b82f6" size={12} />
                                            <Text type="secondary" style={{ fontSize: 11 }}>{labels.scansLabel}</Text>
                                        </Flex>
                                        <Title level={4} style={{ margin: 0 }}>{(mtd.metrics?.menuVisits || 0).toLocaleString()}</Title>
                                    </Card>
                                    <Card size="small" style={{ flex: '1 1 45%' }}>
                                        <Flex align="center" gap={6}>
                                            <LuFlame color="#f97316" size={12} />
                                            <Text type="secondary" style={{ fontSize: 11 }}>Item Taps</Text>
                                        </Flex>
                                        <Title level={4} style={{ margin: 0 }}>{(mtd.metrics?.itemClicks || 0).toLocaleString()}</Title>
                                    </Card>
                                </Flex>
                                {mtd.daysWithData > 0 ? (
                                    <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                                        {`${mtd.daysWithData} active days this month`}
                                    </Text>
                                ) : null}
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
