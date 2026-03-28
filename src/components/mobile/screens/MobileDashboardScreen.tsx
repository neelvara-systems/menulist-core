'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getProjectsList } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Card, DotLoading, NavBar, Tag, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuBarChart3, LuCheck, LuEye, LuFlame, LuHeart, LuInfo, LuRefreshCw, LuShield, LuTrendingDown, LuZap } from 'react-icons/lu';

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
const TRUST_COLORS: Record<string, string> = { strong: 'text-green-600', stable: 'text-blue-500', weak: 'text-amber-500' };
const RISK_COLORS: Record<string, string> = { stable: 'text-green-600', watch: 'text-amber-500', at_risk: 'text-red-500' };
const RISK_LABELS: Record<string, string> = { stable: 'Stable', watch: 'Watch', at_risk: 'At Risk' };

export default function MobileDashboardScreen({ onBack }: MobileDashboardScreenProps) {
    const t = useTranslations('MobileDashboard');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [loadingProjects, setLoadingProjects] = useState(true);

    // Fetch first project
    useEffect(() => {
        (async () => {
            try {
                const result = await getProjectsList();
                const projects = result?.projects || [];
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
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex items-center justify-center"><DotLoading color="primary" /></div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
                    <LuBarChart3 size={36} className="text-gray-300" />
                    <p className="text-sm text-gray-500 text-center">{t('noProjects', { offering: labels.offeringLower })}</p>
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
        <div className="flex flex-col h-full">
            <NavBar
                onBack={onBack}
                right={
                    <button onClick={handleRefresh} className="p-2 active:opacity-60">
                        <LuRefreshCw size={18} className="text-gray-500" />
                    </button>
                }
                style={{ '--height': '48px' } as React.CSSProperties}
            >
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20"><DotLoading color="primary" /></div>
                ) : (
                    <>
                        {/* Project Name */}
                        <p className="text-xs text-gray-400">{t('viewing')} <span className="font-medium text-gray-600 dark:text-gray-300">{projectName}</span></p>

                        {/* Status Hero */}
                        <Card className={`rounded-xl ${status.bg}`}>
                            <div className="flex items-center gap-3">
                                <div className={status.color}>{status.icon}</div>
                                <div>
                                    <p className={`text-lg font-bold ${status.color}`}>{status.text}</p>
                                    {overview?.statusMessage && (
                                        <p className="text-xs text-gray-500 mt-0.5">{overview.statusMessage}</p>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* WTD Metrics (Last 7 Days) */}
                        {wtd && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('last7Days')}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Card className="rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <LuEye size={14} className="text-blue-500" />
                                            <span className="text-xs text-gray-500">{labels.scansLabel}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                            {wtd.metrics?.menuVisits?.toLocaleString() || '0'}
                                        </p>
                                    </Card>
                                    <Card className="rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <LuFlame size={14} className="text-orange-500" />
                                            <span className="text-xs text-gray-500">{t('itemTaps')}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                            {wtd.metrics?.itemClicks?.toLocaleString() || '0'}
                                        </p>
                                    </Card>
                                    {wtd.metrics?.smartPicksRendered > 0 && (
                                        <>
                                            <Card className="rounded-xl">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <LuZap size={14} className="text-purple-500" />
                                                    <span className="text-xs text-gray-500">{t('smartPicks')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                    {wtd.metrics.smartPicksRendered.toLocaleString()}
                                                </p>
                                            </Card>
                                            <Card className="rounded-xl">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <LuZap size={14} className="text-green-500" />
                                                    <span className="text-xs text-gray-500">{t('spClicks')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                            <Card className="rounded-xl">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('aiSummary')}</p>
                                <div className="space-y-2">
                                    {overview.aiSummary.bulletPoints.map((bullet: string, i: number) => (
                                        <p key={i} className="text-sm text-gray-700 dark:text-gray-300">• {bullet}</p>
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
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('businessHealth')}</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {showTrust && hs.trust && (
                                            <Card className="rounded-xl">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <LuShield size={12} className={TRUST_COLORS[hs.trust.state] || 'text-blue-500'} />
                                                    <span className="text-[10px] text-gray-500">{t('trust')}</span>
                                                </div>
                                                <p className={`text-base font-bold capitalize ${TRUST_COLORS[hs.trust.state] || 'text-blue-500'}`}>
                                                    {hs.trust.state}
                                                </p>
                                            </Card>
                                        )}
                                        {showLoyalty && hs.loyalty && (
                                            <Card className="rounded-xl">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <LuHeart size={12} className={TRUST_COLORS[hs.loyalty.state] || 'text-blue-500'} />
                                                    <span className="text-[10px] text-gray-500">{t('loyalty')}</span>
                                                </div>
                                                <p className={`text-base font-bold capitalize ${TRUST_COLORS[hs.loyalty.state] || 'text-blue-500'}`}>
                                                    {hs.loyalty.state}
                                                </p>
                                            </Card>
                                        )}
                                        {showRisk && hs.risk && (
                                            <Card className="rounded-xl">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <LuTrendingDown size={12} className={RISK_COLORS[hs.risk.state] || 'text-green-600'} />
                                                    <span className="text-[10px] text-gray-500">{t('health')}</span>
                                                </div>
                                                <p className={`text-base font-bold ${RISK_COLORS[hs.risk.state] || 'text-green-600'}`}>
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
                            <Card className="rounded-xl">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('topItems')}</p>
                                <div className="space-y-2">
                                    {wtd.topItems.slice(0, 5).map((item: any, i: number) => (
                                        <div key={item.itemId || i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                                                    {i + 1}
                                                </span>
                                                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
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
                            <Card className="rounded-xl">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('allTime')}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {overall.lifetimeMetrics.totalViews?.toLocaleString() || '0'}
                                        </p>
                                        <p className="text-xs text-gray-500">{t('totalScans')}</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {overall.lifetimeMetrics.totalClicks?.toLocaleString() || '0'}
                                        </p>
                                        <p className="text-xs text-gray-500">{t('totalClicks')}</p>
                                    </div>
                                </div>
                                {overall.firstDataDate && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        Since {new Date(overall.firstDataDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                )}
                            </Card>
                        )}

                        {/* No data fallback */}
                        {!overview && !overall && (
                            <div className="flex flex-col items-center gap-3 pt-8">
                                <LuBarChart3 size={36} className="text-gray-300" />
                                <p className="text-sm text-gray-500 text-center">
                                    {t('noAnalyticsYet', { offering: labels.offeringLower })}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
