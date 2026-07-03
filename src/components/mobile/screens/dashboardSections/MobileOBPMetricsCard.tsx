'use client';

import { FEATURE_FLAGS } from '@config/features';
import type {
    OBPActionBreakdown,
    OBPLanguageUsage,
    OBPLinkBreakdown,
    OBPOpenHoursActionBreakdown,
    OBPPeriodMetrics,
    OBPShareBreakdown,
    OBPSourceBreakdown,
} from '@database/ownerDashboard';
import type { OBPDashboardViewData } from '@hook/useOBPDashboard';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuClock, LuExternalLink, LuGlobe, LuInfo, LuMapPin, LuMessageSquare, LuPhone, LuTrendingUp } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Popover, Tag, Text, Title } from '../../antd';

type OBPCardMode = 'today' | 'overview' | 'daily' | 'weekly' | 'monthly' | 'overall';
type AntThemeToken = ReturnType<typeof theme.useToken>['token'];
type DashboardTranslator = (key: string, values?: Record<string, string | number>) => string;

// Social platform colors are brand cues; surrounding dashboard chrome uses Ant tokens.
const SOCIAL_BRAND_COLORS = {
    facebook: '#0051d1',
    instagram: '#ec4899',
} as const;

const getSectionDividerStyle = (token: AntThemeToken) => ({
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    marginTop: 12,
    paddingTop: 12,
});

function dashboardLabel(
    t: DashboardTranslator,
    key: string,
    fallback: string,
    values?: Record<string, string | number>,
) {
    try {
        return t(key, values);
    } catch {
        return fallback;
    }
}

interface MobileOBPMetricsCardProps {
    data: OBPDashboardViewData | null;
    loading?: boolean;
    loadingToday?: boolean;
    mode: OBPCardMode;
}

function renderActionRows(actions: OBPActionBreakdown, token: AntThemeToken, t: DashboardTranslator) {
    const rows = [
        { key: 'call', label: t('actions.call'), value: actions.call, icon: <LuPhone color={token.colorSuccess} size={14} /> },
        { key: 'whatsapp', label: t('actions.whatsapp'), value: actions.whatsapp, icon: <LuMessageSquare color={token.colorSuccess} size={14} /> },
        { key: 'directions', label: t('actions.directions'), value: actions.directions, icon: <LuMapPin color={token.colorWarning} size={14} /> },
        { key: 'reserve', label: t('actions.reserve'), value: actions.reserve, icon: <LuMessageSquare color={token.colorPrimary} size={14} /> },
        { key: 'order', label: t('actions.order'), value: actions.order, icon: <LuExternalLink color={token.colorInfo} size={14} /> },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={getSectionDividerStyle(token)}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {t('obp.actionBreakdown')}
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>{row.value}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderShareRows(shares: OBPShareBreakdown, token: AntThemeToken, t: DashboardTranslator) {
    const rows = [
        { key: 'whatsapp', label: t('obp.whatsappShares'), value: shares.whatsapp, icon: <LuMessageSquare color={token.colorSuccess} size={14} /> },
        { key: 'copy_link', label: t('obp.copyLink'), value: shares.copy_link, icon: <LuExternalLink color={token.colorInfo} size={14} /> },
        { key: 'copy_message', label: t('obp.copyMessage'), value: shares.copy_message, icon: <LuExternalLink color={token.colorPrimary} size={14} /> },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={getSectionDividerStyle(token)}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {t('obp.shareBreakdown')}
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>{row.value}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderLinkRows(links: OBPLinkBreakdown, token: AntThemeToken, t: DashboardTranslator) {
    const rows = [
        { key: 'google_review', label: t('obp.googleReviews'), value: links.google_review, icon: <LuGlobe color={token.colorInfo} size={14} /> },
        { key: 'instagram', label: t('obp.instagram'), value: links.instagram, icon: <LuExternalLink color={SOCIAL_BRAND_COLORS.instagram} size={14} /> },
        { key: 'facebook', label: t('obp.facebook'), value: links.facebook, icon: <LuExternalLink color={SOCIAL_BRAND_COLORS.facebook} size={14} /> },
        { key: 'website', label: t('obp.website'), value: links.website, icon: <LuExternalLink color={token.colorInfo} size={14} /> },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={getSectionDividerStyle(token)}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {t('obp.linkTaps')}
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>{row.value}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderSourceRows(sources: OBPSourceBreakdown[] | undefined, token: AntThemeToken, t: DashboardTranslator) {
    const rows = (sources || []).filter((source) => (
        source.views > 0 || source.actionClicks > 0 || source.menuClicks > 0 || source.linkClicks > 0
    ));
    if (rows.length === 0) return null;

    return (
        <div style={getSectionDividerStyle(token)}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {t('details.sections.visitorSources')}
            </Text>
            <Flex gap={8} vertical>
                {rows.slice(0, 6).map((source) => (
                    <Flex key={source.source} align="center" justify="space-between" gap={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{source.label}</Text>
                        <Text style={{ fontSize: 12, textAlign: 'right' }}>
                            {t('obp.sourceViews', { count: source.views.toLocaleString() })}
                            {source.menuClicks > 0 ? ` · ${t('obp.sourceMenu', { count: source.menuClicks.toLocaleString() })}` : ''}
                            {source.actionClicks > 0 ? ` · ${t('obp.sourceActions', { count: source.actionClicks.toLocaleString() })}` : ''}
                            {source.linkClicks > 0 ? ` · ${t('obp.sourceLinks', { count: source.linkClicks.toLocaleString() })}` : ''}
                        </Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderOpenHoursRows(breakdown: OBPOpenHoursActionBreakdown | undefined, token: AntThemeToken, t: DashboardTranslator) {
    const rows = [
        {
            key: 'open',
            label: dashboardLabel(t, 'details.openHours.open', 'Actions while open'),
            value: Number(breakdown?.open || 0),
            icon: <LuClock color={token.colorSuccess} size={14} />,
        },
        {
            key: 'closed',
            label: dashboardLabel(t, 'details.openHours.closed', 'Actions while closed'),
            value: Number(breakdown?.closed || 0),
            detail: `${Number(breakdown?.closedShare || 0)}%`,
            icon: <LuClock color={token.colorWarning} size={14} />,
        },
        {
            key: 'unknown',
            label: dashboardLabel(t, 'details.openHours.unknown', 'Actions with hours hidden'),
            value: Number(breakdown?.unknown || 0),
            icon: <LuClock color={token.colorTextSecondary} size={14} />,
        },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={getSectionDividerStyle(token)}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {dashboardLabel(t, 'details.sections.openHoursActions', 'Open/Closed Action Timing')}
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>
                            {row.value}
                            {row.detail ? ` · ${row.detail}` : ''}
                        </Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderLanguageRows(languages: OBPLanguageUsage[] | undefined, token: AntThemeToken, t: DashboardTranslator) {
    const rows = (languages || []).filter((language) => (
        language.views > 0 || language.sessions > 0 || language.adoptions > 0
    ));
    if (rows.length === 0) return null;

    return (
        <div style={getSectionDividerStyle(token)}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                {t('obp.languages')}
            </Text>
            <Flex gap={6} vertical>
                {rows.slice(0, 5).map((language) => (
                    <Flex key={language.language} align="center" justify="space-between" gap={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{language.label}</Text>
                        <Text style={{ fontSize: 12, textAlign: 'right' }}>
                            {t('obp.pageOpens', { count: Math.max(language.sessions, language.views).toLocaleString() })}
                            {language.adoptions > 0 ? ` · ${t('obp.stayed', { count: language.adoptions.toLocaleString() })}` : ''}
                        </Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderMetricCards(metrics: OBPPeriodMetrics, token: AntThemeToken, t: DashboardTranslator) {
    return (
        <>
            <Flex gap={12} wrap>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuGlobe color={token.colorInfo} size={14} />
                        <Text type="secondary">{t('obp.pageViews')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.views.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuExternalLink color={token.colorPrimary} size={14} />
                        <Text type="secondary">{t('obp.viewMenuClicks')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.menuClicks.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuTrendingUp color={token.colorSuccess} size={14} />
                        <Text type="secondary">{t('obp.actions')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.actionClicks.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Text type="secondary">{t('obp.shares')}</Text>
                    <Title level={3} style={{ margin: 0 }}>{metrics.shares.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuExternalLink color={token.colorInfo} size={14} />
                        <Text type="secondary">{t('obp.linkTaps')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.linkClicks.toLocaleString()}</Title>
                </Card>
            </Flex>

            {renderActionRows(metrics.actions, token, t)}
            {renderLinkRows(metrics.links, token, t)}
            {renderShareRows(metrics.shareMethods, token, t)}
            {renderSourceRows(metrics.sources, token, t)}
            {renderOpenHoursRows(metrics.openHoursActionBreakdown, token, t)}
            {renderLanguageRows(metrics.topLanguages, token, t)}
        </>
    );
}

export default function MobileOBPMetricsCard({ data, loading, loadingToday, mode }: MobileOBPMetricsCardProps) {
    const t = useTranslations('Dashboard.owner');
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const { token } = theme.useToken();
    const today = data?.today || null;
    const overview = data?.overview || null;
    const overall = data?.overall || null;
    const sharedInfoContent = (
        <div style={{ maxWidth: 280 }}>
            <Text type="secondary" style={{ display: 'block' }}>
                {t('obp.mobileInfoIntro')}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                {t('obp.mobileInfoActions')}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                {t('obp.mobileInfoLinks')}
            </Text>
        </div>
    );

    if (mode === 'today') {
        const todayInfoContent = (
            <div style={{ maxWidth: 280 }}>
                {sharedInfoContent}
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                    {t('obp.todayPartialInfo')}
                </Text>
            </div>
        );

        if (loadingToday && !today) {
            return (
                <Card
                    size="small"
                    title={(
                        <Flex align="center" justify="space-between">
                            <Text strong>{t('obp.officialBusinessPage')}</Text>
                            <Popover content={todayInfoContent} placement="bottom" trigger="click">
                                <Button fill="none" style={{ minHeight: 'auto', padding: 4 }}>
                                    <LuInfo color={token.colorTextSecondary} size={16} />
                                </Button>
                            </Popover>
                        </Flex>
                    )}
                >
                    <Flex align="center" gap={8}>
                        <DotLoading color="primary" />
                        <Text type="secondary">{t('obp.loadingCurrentActivity')}</Text>
                    </Flex>
                </Card>
            );
        }

        return (
            <Card
                size="small"
                title={(
                    <Flex align="center" justify="space-between">
                        <Text strong>{t('obp.officialBusinessPage')}</Text>
                        <Popover content={todayInfoContent} placement="bottom" trigger="click">
                            <Button fill="none" style={{ minHeight: 'auto', padding: 4 }}>
                                <LuInfo color={token.colorTextSecondary} size={16} />
                            </Button>
                        </Popover>
                    </Flex>
                )}
            >
                {today ? renderMetricCards(today, token, t) : (
                    <Text type="secondary">{t('obp.noActivityToday')}</Text>
                )}
            </Card>
        );
    }

    const title =
        mode === 'overall'
            ? t('obp.titles.overall')
            : mode === 'daily'
                ? t('obp.titles.daily')
                : mode === 'weekly'
                    ? t('obp.titles.weekly')
                    : mode === 'monthly'
                        ? t('obp.titles.monthly')
                        : t('obp.officialBusinessPage');

    if (loading && !data) {
        return (
            <Card
                size="small"
                title={(
                    <Flex align="center" gap={8}>
                        <LuGlobe color={token.colorInfo} size={16} />
                        <Text strong>{title}</Text>
                    </Flex>
                )}
            >
                <Flex align="center" gap={8}>
                    <DotLoading color="primary" />
                    <Text type="secondary">{t('obp.loadingActivity')}</Text>
                </Flex>
            </Card>
        );
    }

    const selectedMetrics =
        mode === 'daily'
            ? overview?.yesterday || null
            : mode === 'weekly'
                ? overview?.wtd || null
                : mode === 'monthly'
                    ? overview?.mtd || null
                    : null;

    const statusTag = mode === 'overview'
            ? overview?.status === 'working'
            ? <Tag color="success">{t('states.active')}</Tag>
            : overview?.status === 'low_activity'
                ? <Tag color="warning">{t('states.lowActivity')}</Tag>
                : <Tag>{t('states.noData')}</Tag>
        : null;

    return (
        <Card
            size="small"
            title={(
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={8}>
                        <LuGlobe color={token.colorInfo} size={16} />
                        <Text strong>{title}</Text>
                    </Flex>
                    <Flex align="center" gap={8}>
                        <Popover content={sharedInfoContent} placement="bottom" trigger="click">
                            <Button fill="none" style={{ minHeight: 'auto', padding: 4 }}>
                                <LuInfo color={token.colorTextSecondary} size={16} />
                            </Button>
                        </Popover>
                        {statusTag}
                    </Flex>
                </Flex>
            )}
        >
            {mode === 'overall' ? (
                !overall ? <Text type="secondary">{t('obp.noLifetimeActivity')}</Text> : null
            ) : mode === 'overview' ? (
                <>
                    {overview?.wtd ? (
                        <>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                                {t('views.last7Days')}
                            </Text>
                            {renderMetricCards(overview.wtd, token, t)}
                        </>
                    ) : (
                        <Text type="secondary">{t('obp.noSettledActivity')}</Text>
                    )}

                    {overview?.mtd ? (
                        <div style={getSectionDividerStyle(token)}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                                {overview.mtd.monthName}
                            </Text>
                            {renderMetricCards(overview.mtd, token, t)}
                        </div>
                    ) : null}
                </>
            ) : selectedMetrics ? (
                renderMetricCards(selectedMetrics, token, t)
            ) : (
                <Text type="secondary">{t('obp.noSettledActivityPeriod')}</Text>
            )}

            {mode === 'overall' && overall ? (
                <div style={getSectionDividerStyle(token)}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {t('obp.lifetimeSummary', {
                            views: overall.lifetimeViews.toLocaleString(),
                            menuClicks: overall.lifetimeMenuClicks.toLocaleString(),
                            actions: overall.lifetimeActionClicks.toLocaleString(),
                            links: overall.lifetimeLinkClicks.toLocaleString(),
                            shares: overall.lifetimeShares.toLocaleString(),
                        })}
                    </Text>
                    {overall.firstDataDate ? (
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                            {t('overall.since', { date: overall.firstDataDate })}
                        </Text>
                    ) : null}
                    {renderActionRows(overall.lifetimeActions, token, t)}
                    {renderLinkRows(overall.lifetimeLinks, token, t)}
                    {renderShareRows(overall.lifetimeShareMethods, token, t)}
                    {renderSourceRows(overall.lifetimeSources, token, t)}
                    {renderOpenHoursRows(overall.lifetimeOpenHoursActionBreakdown, token, t)}
                    {renderLanguageRows(overall.lifetimeLanguages, token, t)}
                </div>
            ) : null}
        </Card>
    );
}
