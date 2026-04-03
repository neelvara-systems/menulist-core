'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getProjectsList } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, DotLoading, NavBar, Popup, Tabs, Tag, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuBarChart3, LuCheck, LuEye, LuFlame, LuHeart, LuInfo, LuLayers, LuRefreshCw, LuShield, LuTrendingDown, LuZap } from 'react-icons/lu';

interface MobileDashboardScreenProps {
    onBack: () => void;
}

/**
 * Mobile Dashboard Screen — zero desktop dependency
 * 
 * Simplified analytics overview for phone-only owners.
 * Shows: status hero, key metrics (WTD), AI summary, top items.
 * Uses same hook: useOwnerDashboard (SWR cached, 1 Firestore read/day)
 */
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

    // Fetch projects and set first project
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

    const { data, loading, error, refetch } = useOwnerDashboard(
        projectId ? { projectId } : undefined
    );

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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DotLoading color="primary" /></div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '0 24px' }}>
                    <LuBarChart3 size={36} color="#d1d5db" />
                    <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{t('noProjects', { offering: labels.offeringLower })}</p>
                </div>
            </div>
        );
    }

    const isLoading = loading && !data;
    const overview = data?.overview;
    const overall = data?.overall;
    const wtd = overview?.wtd;

    // Status determination
    const getStatus = () => {
        if (!overview) return { icon: <LuInfo size={24} />, text: t('noDataYet'), color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
        if (overview.status === 'working') return { icon: <LuCheck size={24} />, text: t('menuWorking', { offering: labels.offeringLower }), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
        if (overview.status === 'low_activity') return { icon: <LuInfo size={24} />, text: t('lowActivity'), color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' };
        return { icon: <LuInfo size={24} />, text: t('waitingFirstScan'), color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
    };

    const status = getStatus();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <NavBar
                onBack={onBack}
                right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {projectsList.length > 1 && (
                            <button onClick={() => setIsProjectSelectorOpen(true)} style={{ padding: '8px' }}>
                                <LuLayers size={18} color="#9ca3af" />
                            </button>
                        )}
                        <button onClick={handleRefresh} style={{ padding: '8px' }}>
                            <LuRefreshCw size={18} color="#9ca3af" />
                        </button>
                    </div>
                }
                style={{ '--height': '48px' } as React.CSSProperties}
            >
                {t('title')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Project Info and View Mode Tabs */}
                <div>
                    {/* Project Name */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>{t('viewing')} <span style={{ fontWeight: 500, color: '#4b5563' }}>{projectName}</span></p>
                        {projectsList.length > 1 && (
                            <button onClick={() => setIsProjectSelectorOpen(true)} style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'underline' }}>
                                {t('changeProject')}
                            </button>
                        )}
                    </div>

                    {/* View Mode Tabs */}
                    <Tabs
                        activeKey={viewMode}
                        onChange={(key) => setViewMode(key as any)}
                        style={{ '--fixed-active-tab-border-color': 'var(--adm-color-primary, #1677ff)' } as React.CSSProperties}
                    >
                        <Tabs.Tab title={t('overview')} key="overview" />
                        <Tabs.Tab title={t('daily')} key="daily" />
                        <Tabs.Tab title={t('weekly')} key="weekly" />
                        <Tabs.Tab title={t('monthly')} key="monthly" />
                    </Tabs>
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}><DotLoading color="primary" /></div>
                ) : (
                    <>
                        {/* Status Hero */}
                        <Card style={{ borderRadius: '12px', backgroundColor: status.color === '#10b981' ? '#ecfdf5' : status.color === '#f59e0b' ? '#fffbeb' : '#f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div>{status.icon}</div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: 700, color: status.color }}>{status.text}</p>
                                </div>
                            </div>
                        </Card>

                        {/* WTD Metrics (Last 7 Days) */}
                        {wtd && (
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('last7Days')}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <Card style={{ borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <LuEye size={14} color="#3b82f6" />
                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{labels.scansLabel}</span>
                                        </div>
                                        <p style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                                            {wtd.metrics?.menuVisits?.toLocaleString() || '0'}
                                        </p>
                                    </Card>
                                    <Card style={{ borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <LuFlame size={14} color="#f97316" />
                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{t('itemTaps')}</span>
                                        </div>
                                        <p style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                                            {wtd.metrics?.itemClicks?.toLocaleString() || '0'}
                                        </p>
                                    </Card>
                                    {wtd.metrics?.smartPicksRendered > 0 && (
                                        <>
                                            <Card style={{ borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <LuZap size={14} color="#a855f7" />
                                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{t('smartPicks')}</span>
                                                </div>
                                                <p style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                                                    {wtd.metrics.smartPicksRendered.toLocaleString()}
                                                </p>
                                            </Card>
                                            <Card style={{ borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <LuZap size={14} color="#22c55e" />
                                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{t('spClicks')}</span>
                                                </div>
                                                <p style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                                                    {wtd.metrics.smartPicksClicks.toLocaleString()}
                                                </p>
                                            </Card>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Summary */}
                        {overview?.aiSummary?.bulletPoints?.length > 0 && (
                            <Card style={{ borderRadius: '12px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('aiSummary')}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {overview.aiSummary.bulletPoints.map((bullet: string, i: number) => (
                                        <p key={i} style={{ fontSize: '14px', color: '#4b5563', margin: 0 }}>• {bullet}</p>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Health Signals (Pillars 4-6) */}
                        {storeDetails?.healthSignals && (() => {
                            const hs = storeDetails.healthSignals;
                            const showTrust = FEATURE_FLAGS.ENABLE_TRUST_HEALTH_SIGNAL && hs.trust?.visible;
                            const showLoyalty = FEATURE_FLAGS.ENABLE_LOYALTY_HEALTH_SIGNAL && hs.loyalty?.visible;
                            const showRisk = FEATURE_FLAGS.ENABLE_RISK_DECLINE_DETECTION && hs.risk?.visible;
                            if (!showTrust && !showLoyalty && !showRisk) return null;
                            return (
                                <div>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('businessHealth')}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        {showTrust && hs.trust && (
                                            <Card style={{ borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                    <LuShield size={12} color={TRUST_COLORS[hs.trust.state] || '#3b82f6'} />
                                                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{t('trust')}</span>
                                                </div>
                                                <p style={{ fontSize: '16px', fontWeight: 700, textTransform: 'capitalize', color: TRUST_COLORS[hs.trust.state] || '#3b82f6' }}>
                                                    {hs.trust.state}
                                                </p>
                                            </Card>
                                        )}
                                        {showLoyalty && hs.loyalty && (
                                            <Card style={{ borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                    <LuHeart size={12} color={TRUST_COLORS[hs.loyalty.state] || '#3b82f6'} />
                                                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{t('loyalty')}</span>
                                                </div>
                                                <p style={{ fontSize: '16px', fontWeight: 700, textTransform: 'capitalize', color: TRUST_COLORS[hs.loyalty.state] || '#3b82f6' }}>
                                                    {hs.loyalty.state}
                                                </p>
                                            </Card>
                                        )}
                                        {showRisk && hs.risk && (
                                            <Card style={{ borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                    <LuTrendingDown size={12} color={RISK_COLORS[hs.risk.state] || '#22c55e'} />
                                                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{t('health')}</span>
                                                </div>
                                                <p style={{ fontSize: '16px', fontWeight: 700, color: RISK_COLORS[hs.risk.state] || '#22c55e' }}>
                                                    {RISK_LABELS[hs.risk.state] || hs.risk.state}
                                                </p>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Top Items */}
                        {wtd?.topItems && wtd.topItems.length > 0 && (
                            <Card style={{ borderRadius: '12px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('topItems')}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {wtd.topItems.slice(0, 5).map((item: any, i: number) => (
                                        <div key={item.itemId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, width: '20px', textAlign: 'center', color: i === 0 ? '#f97316' : '#9ca3af' }}>
                                                    {i + 1}
                                                </span>
                                                <span style={{ fontSize: '14px', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.name || item.itemId}
                                                </span>
                                            </div>
                                            <Tag fill="outline" style={{ fontSize: 11 }}>{item.clicks} clicks</Tag>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* All-Time Footer */}
                        {overall?.lifetimeMetrics && (
                            <Card style={{ borderRadius: '12px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('allTime')}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <p style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                                            {overall.lifetimeMetrics.totalViews?.toLocaleString() || '0'}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('totalScans')}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                                            {overall.lifetimeMetrics.totalClicks?.toLocaleString() || '0'}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('totalClicks')}</p>
                                    </div>
                                </div>
                                {overall.firstDataDate && (
                                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                                        Since {new Date(overall.firstDataDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                )}
                            </Card>
                        )}

                        {/* No data fallback */}
                        {!overview && !overall && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingTop: '32px' }}>
                                <LuBarChart3 size={36} color="#d1d5db" />
                                <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                                    {t('noAnalyticsYet', { offering: labels.offeringLower })}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Project Selector Popup */}
            <Popup
                visible={isProjectSelectorOpen}
                onMaskClick={() => setIsProjectSelectorOpen(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '70vh' }}
                destroyOnClose
            >
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '40px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '999px' }} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('selectProject')}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                        {projectsList.map((project: any) => (
                            <Card
                                key={project.projectId}
                                onClick={() => handleProjectSelect(project.projectId, project.name || 'Menu')}
                                style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: project.projectId === projectId
                                        ? '2px solid var(--adm-color-primary, #1677ff)'
                                        : '1px solid var(--adm-color-border, #e5e7eb)',
                                    backgroundColor: project.projectId === projectId
                                        ? 'var(--adm-color-primary-bg, #e6f7ff)'
                                        : 'var(--adm-color-background, #fff)',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--adm-color-primary-bg, #e6f7ff)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <LuLayers size={20} color="var(--adm-color-primary, #1677ff)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--adm-color-text, #333)' }}>
                                            {project.name || t('unnamedProject')}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)' }}>
                                            {project.isDefault && <span style={{ color: 'var(--adm-color-primary, #1677ff)' }}>{t('default')}</span>}
                                            {project.isDefault && ' • '}
                                            {t('itemsCount', { count: project.itemCount || 0 })}
                                        </div>
                                    </div>
                                    {project.projectId === projectId && (
                                        <LuCheck size={20} color="var(--adm-color-primary, #1677ff)" />
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div style={{ paddingTop: '8px' }}>
                        <Button block fill="outline" onClick={() => setIsProjectSelectorOpen(false)}>
                            {t('cancel')}
                        </Button>
                    </div>
                </div>
            </Popup>
        </div >
    );
}
