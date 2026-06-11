import { FEATURE_FLAGS } from '@config/features';
import {
    OBPActionBreakdown,
    OBPLinkBreakdown,
    OBPLanguageUsage,
    OBPHistoricalWeek,
    OBPPeriodMetrics,
    OBPShareBreakdown,
    OBPSourceBreakdown,
} from '@database/ownerDashboard';
import type { OBPDashboardViewData } from '@hook/useOBPDashboard';
import { Card, Col, Divider, Empty, Flex, Row, Statistic, Tag, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React from 'react';
import {
    LuArrowDownRight,
    LuArrowUpRight,
    LuExternalLink,
    LuGlobe,
    LuMapPin,
    LuMessageSquare,
    LuMinus,
    LuPhone,
    LuTrendingUp,
} from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

type OBPCardMode = 'today' | 'overview' | 'daily' | 'weekly' | 'monthly' | 'overall';
type DashboardTranslator = (key: string, values?: Record<string, string | number>) => string;

interface OBPMetricsCardProps {
    data: OBPDashboardViewData | null;
    loading?: boolean;
    loadingToday?: boolean;
    mode: OBPCardMode;
}

function ChangeIndicator({ change, t }: { change: number | null; t: DashboardTranslator }) {
    if (change === null) return <Text type="secondary" style={{ fontSize: 11 }}>{t('obp.noComparison')}</Text>;
    if (change === 0) return <Tag icon={<LuMinus size={10} />} color="default" style={{ fontSize: 11 }}>{t('obp.sameAsLastWeek')}</Tag>;
    if (change > 0) return <Tag icon={<LuArrowUpRight size={10} />} color="success" style={{ fontSize: 11 }}>{t('weekly.vsLastWeek', { sign: '+', change })}</Tag>;
    return <Tag icon={<LuArrowDownRight size={10} />} color="warning" style={{ fontSize: 11 }}>{t('weekly.vsLastWeek', { sign: '', change })}</Tag>;
}

function ActionBreakdown({ actions, t }: { actions: OBPActionBreakdown; t: DashboardTranslator }) {
    const hasAny = actions.call > 0 || actions.whatsapp > 0 || actions.directions > 0 || actions.reserve > 0 || actions.order > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {actions.call > 0 && <Statistic title={t('actions.calls')} value={actions.call} prefix={<LuPhone size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.whatsapp > 0 && <Statistic title={t('actions.whatsapp')} value={actions.whatsapp} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.directions > 0 && <Statistic title={t('actions.directions')} value={actions.directions} prefix={<LuMapPin size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.reserve > 0 && <Statistic title={t('actions.reserve')} value={actions.reserve} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.order > 0 && <Statistic title={t('actions.order')} value={actions.order} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
        </Flex>
    );
}

function ShareBreakdown({ shares, t }: { shares: OBPShareBreakdown; t: DashboardTranslator }) {
    const hasAny = shares.whatsapp > 0 || shares.copy_link > 0 || shares.copy_message > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {shares.whatsapp > 0 && <Statistic title={t('obp.whatsappShares')} value={shares.whatsapp} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />}
            {shares.copy_link > 0 && <Statistic title={t('obp.copyLink')} value={shares.copy_link} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
            {shares.copy_message > 0 && <Statistic title={t('obp.copyMessage')} value={shares.copy_message} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
        </Flex>
    );
}

function LinkBreakdown({ links, t }: { links: OBPLinkBreakdown; t: DashboardTranslator }) {
    const hasAny = links.google_review > 0 || links.instagram > 0 || links.facebook > 0 || links.website > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {links.google_review > 0 && <Statistic title={t('obp.googleReviews')} value={links.google_review} prefix={<LuGlobe size={12} />} valueStyle={{ fontSize: 16 }} />}
            {links.instagram > 0 && <Statistic title={t('obp.instagram')} value={links.instagram} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
            {links.facebook > 0 && <Statistic title={t('obp.facebook')} value={links.facebook} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
            {links.website > 0 && <Statistic title={t('obp.website')} value={links.website} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
        </Flex>
    );
}

function SourceBreakdown({ sources, t }: { sources?: OBPSourceBreakdown[]; t: DashboardTranslator }) {
    const rows = (sources || []).filter((source) => (
        source.views > 0 || source.actionClicks > 0 || source.menuClicks > 0 || source.linkClicks > 0
    ));
    if (!rows.length) return null;

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {t('details.sections.visitorSources')}
            </Text>
            <Flex gap={8} wrap="wrap">
                {rows.slice(0, 6).map((source) => (
                    <Card key={source.source} size="small" styles={{ body: { padding: '8px 10px' } }}>
                        <Flex vertical gap={2}>
                            <Text strong style={{ fontSize: 12 }}>{source.label}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {t('obp.sourceViews', { count: source.views.toLocaleString() })}
                                {source.menuClicks > 0 ? ` · ${t('obp.sourceMenu', { count: source.menuClicks.toLocaleString() })}` : ''}
                                {source.actionClicks > 0 ? ` · ${t('obp.sourceActions', { count: source.actionClicks.toLocaleString() })}` : ''}
                                {source.linkClicks > 0 ? ` · ${t('obp.sourceLinks', { count: source.linkClicks.toLocaleString() })}` : ''}
                            </Text>
                        </Flex>
                    </Card>
                ))}
            </Flex>
        </div>
    );
}

function LanguageBreakdown({ languages, t }: { languages?: OBPLanguageUsage[]; t: DashboardTranslator }) {
    const rows = (languages || []).filter((language) => (
        language.views > 0 || language.sessions > 0 || language.adoptions > 0
    ));
    if (!rows.length) return null;

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {t('obp.languages')}
            </Text>
            <Flex gap={8} wrap="wrap">
                {rows.slice(0, 5).map((language) => (
                    <Card key={language.language} size="small" styles={{ body: { padding: '8px 10px' } }}>
                        <Flex vertical gap={2}>
                            <Text strong style={{ fontSize: 12 }}>{language.label}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {t('obp.pageOpens', { count: Math.max(language.sessions, language.views).toLocaleString() })}
                                {language.adoptions > 0 ? ` · ${t('obp.stayedAfterSwitch', { count: language.adoptions.toLocaleString() })}` : ''}
                            </Text>
                        </Flex>
                    </Card>
                ))}
            </Flex>
        </div>
    );
}

function WeeklyTrend({ weeks, t }: { weeks: OBPHistoricalWeek[]; t: DashboardTranslator }) {
    const { token } = theme.useToken();

    if (weeks.length === 0) return null;
    const maxViews = Math.max(...weeks.map((week) => week.views), 1);

    return (
        <div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                {t('obp.weeklyTrend')}
            </Text>
            <Flex gap={4} align="flex-end" style={{ height: 48 }}>
                {weeks.map((week, index) => (
                    <Flex key={index} vertical align="center" gap={2} style={{ flex: 1 }}>
                        <div
                            style={{
                                width: '100%',
                                height: Math.max(4, (week.views / maxViews) * 40),
                                backgroundColor: week.isCurrentWeek ? token.colorPrimary : token.colorPrimaryBg,
                                borderRadius: 3,
                                transition: 'height 0.3s',
                            }}
                        />
                        <Text style={{ fontSize: 10, color: token.colorTextSecondary }}>{week.views}</Text>
                    </Flex>
                ))}
            </Flex>
            <Flex justify="space-between" style={{ marginTop: 2 }}>
                {weeks.map((week, index) => (
                    <Text key={index} style={{ fontSize: 9, color: token.colorTextTertiary, flex: 1, textAlign: 'center' }}>
                        {week.weekLabel}
                    </Text>
                ))}
            </Flex>
        </div>
    );
}

function renderPeriodGrid(metrics: OBPPeriodMetrics, t: DashboardTranslator) {
    return (
        <>
            <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                <Col xs={12} sm={8}>
                    <Statistic title={t('obp.pageViews')} value={metrics.views} prefix={<LuGlobe size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title={t('obp.viewMenuClicks')} value={metrics.menuClicks} prefix={<LuExternalLink size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title={t('obp.actions')} value={metrics.actionClicks} prefix={<LuTrendingUp size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title={t('obp.linkTaps')} value={metrics.linkClicks} prefix={<LuExternalLink size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title={t('obp.shares')} value={metrics.shares} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title={t('metrics.daysActive')} value={metrics.daysWithData} />
                </Col>
            </Row>
            <div style={{ marginTop: 12 }}>
                <ActionBreakdown actions={metrics.actions} t={t} />
            </div>
            <div style={{ marginTop: 12 }}>
                <LinkBreakdown links={metrics.links} t={t} />
            </div>
            <div style={{ marginTop: 12 }}>
                <ShareBreakdown shares={metrics.shareMethods} t={t} />
            </div>
            <div style={{ marginTop: 12 }}>
                <SourceBreakdown sources={metrics.sources} t={t} />
            </div>
            <div style={{ marginTop: 12 }}>
                <LanguageBreakdown languages={metrics.topLanguages} t={t} />
            </div>
        </>
    );
}

const OBPMetricsCard: React.FC<OBPMetricsCardProps> = ({ data, loading, loadingToday, mode }) => {
    const t = useTranslations('Dashboard.owner');
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const today = data?.today || null;
    const overview = data?.overview || null;
    const overall = data?.overall || null;

    if (mode === 'today') {
        if (loadingToday && !today) {
            return (
                <Card className={styles.obpCard} variant="borderless" title={t('obp.officialBusinessPage')}>
                    <Text type="secondary">{t('obp.loadingCurrentActivity')}</Text>
                </Card>
            );
        }

        return (
            <Card className={styles.obpCard} variant="borderless" title={t('obp.officialBusinessPage')}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                    {t('obp.sharedInfo')}
                </Text>
                {today ? (
                    renderPeriodGrid(today, t)
                ) : (
                    <Text type="secondary">{t('obp.noActivityToday')}</Text>
                )}
            </Card>
        );
    }

    const modeTitle =
        mode === 'overall'
            ? t('obp.titles.overall')
            : mode === 'daily'
            ? t('obp.titles.daily')
            : mode === 'weekly'
                ? t('obp.titles.weekly')
                : mode === 'monthly'
                    ? t('obp.titles.monthly')
                    : t('obp.officialBusinessPage');

    const selectedMetrics =
        mode === 'daily'
            ? overview?.yesterday || null
            : mode === 'weekly'
                ? overview?.wtd || null
                : mode === 'monthly'
                ? overview?.mtd || null
                : null;

    if (loading && !data) {
        return (
            <Card
                className={styles.obpCard}
                variant="borderless"
                title={
                    <span>
                        <LuGlobe size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        {modeTitle}
                    </span>
                }
            >
                <Text type="secondary">{t('obp.loadingActivity')}</Text>
            </Card>
        );
    }

    return (
        <Card
            className={styles.obpCard}
            variant="borderless"
            title={
                <span>
                    <LuGlobe size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    {modeTitle}
                </span>
            }
            extra={
                mode === 'overview'
                    ? overview?.status === 'working'
                        ? <Tag color="success" style={{ fontSize: 11 }}>{t('states.active')}</Tag>
                        : overview?.status === 'low_activity'
                            ? <Tag color="warning" style={{ fontSize: 11 }}>{t('states.lowActivity')}</Tag>
                            : <Tag style={{ fontSize: 11 }}>{t('states.noData')}</Tag>
                    : null
            }
        >
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                {t('obp.sharedInfo')}
            </Text>

            {mode === 'overall' ? null : mode === 'overview' ? (
                <>
                    {overview?.wtd ? (
                        <>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('views.last7Days')}</Text>
                            <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                                <Col xs={12} sm={6}>
                                    <Statistic title={t('obp.pageViews')} value={overview.wtd.views} prefix={<LuGlobe size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title={t('obp.viewMenuClicks')} value={overview.wtd.menuClicks} prefix={<LuExternalLink size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title={t('obp.actions')} value={overview.wtd.actionClicks} prefix={<LuTrendingUp size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title={t('obp.linkTaps')} value={overview.wtd.linkClicks} prefix={<LuExternalLink size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title={t('obp.shares')} value={overview.wtd.shares} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <div style={{ paddingTop: 4 }}>
                                        <ChangeIndicator change={overview.viewsChange} t={t} />
                                    </div>
                                </Col>
                            </Row>
                            <div style={{ marginTop: 12 }}>
                                <ActionBreakdown actions={overview.wtd.actions} t={t} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <LinkBreakdown links={overview.wtd.links} t={t} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <ShareBreakdown shares={overview.wtd.shareMethods} t={t} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <SourceBreakdown sources={overview.wtd.sources} t={t} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <LanguageBreakdown languages={overview.wtd.topLanguages} t={t} />
                            </div>
                        </>
                    ) : (
                        <Empty description={<Text type="secondary">{t('obp.noSettledActivity')}</Text>} />
                    )}

                    {overview?.mtd ? (
                        <>
                            <Divider style={{ margin: '16px 0 12px' }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>{overview.mtd.monthName}</Text>
                            {renderPeriodGrid(overview.mtd, t)}
                        </>
                    ) : null}

                    {overview && overview.historicalWeeks.length > 1 ? (
                        <>
                            <Divider style={{ margin: '16px 0 12px' }} />
                            <WeeklyTrend weeks={overview.historicalWeeks} t={t} />
                        </>
                    ) : null}
                </>
            ) : selectedMetrics ? (
                renderPeriodGrid(selectedMetrics, t)
            ) : (
                <Empty description={<Text type="secondary">{t('obp.noSettledActivityPeriod')}</Text>} />
            )}

            {mode === 'overall' ? (
                overall ? (
                    <>
                        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {t('obp.lifetimeSummary', {
                                    views: overall.lifetimeViews.toLocaleString(),
                                    menuClicks: overall.lifetimeMenuClicks.toLocaleString(),
                                    actions: overall.lifetimeActionClicks.toLocaleString(),
                                    links: overall.lifetimeLinkClicks.toLocaleString(),
                                    shares: overall.lifetimeShares.toLocaleString(),
                                })}
                            </Text>
                            {overall.firstDataDate ? (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {t('overall.since', { date: overall.firstDataDate })}
                                </Text>
                            ) : null}
                        </Flex>
                        <div style={{ marginTop: 12 }}>
                            <ActionBreakdown actions={overall.lifetimeActions} t={t} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <LinkBreakdown links={overall.lifetimeLinks} t={t} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <ShareBreakdown shares={overall.lifetimeShareMethods} t={t} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <SourceBreakdown sources={overall.lifetimeSources} t={t} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <LanguageBreakdown languages={overall.lifetimeLanguages} t={t} />
                        </div>
                    </>
                ) : (
                    <Empty description={<Text type="secondary">{t('obp.noLifetimeActivity')}</Text>} />
                )
            ) : null}
        </Card>
    );
};

export default OBPMetricsCard;
