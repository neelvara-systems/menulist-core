/**
 * Overview View (PRIMARY - v2)
 * 
 * The default hero view for the Owner Dashboard.
 * Designed for non-tech-savvy SMB owners who need quick confirmation.
 * 
 * Features:
 * - Status hero: "Your menu is working!" / "Low activity" / "No data"
 * - WTD (Week-to-Date) metrics - rolling 7 days
 * - MTD (Month-to-Date) summary - current month so far
 * - Historical weeks comparison (last 4 weeks)
 * - AI Summary (abbreviated)
 * - Expandable sections for detail
 */

import {
    HistoricalWeek,
    OverviewData,
} from '@template/main-app/projects/types';
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { formatNumber } from '@util/formatters';
import {
    formatDashboardWeekRange,
    getDashboardOverviewStatusMessage,
} from '@lib/analytics/ownerDashboardPresentation';
import { Card, Col, Empty, Progress, Row, Tag, Typography, theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import React from 'react';
import { LuAlertTriangle, LuCheckCircle, LuClock, LuHistory } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';
import MenuAnalyticsDetailsCard from './MenuAnalyticsDetailsCard';
import OwnerActionPlanCard from './OwnerActionPlanCard';
import AISummaryCard from './AISummaryCard';

const { Text, Title, Paragraph } = Typography;
const { useToken } = theme;

interface OverviewViewProps {
    data: OverviewData | null;
    qualitySignalsSlot?: React.ReactNode;
    projectId?: string | null;
}

const OverviewView: React.FC<OverviewViewProps> = ({ data, qualitySignalsSlot, projectId }) => {
    const { token } = useToken();
    const t = useTranslations('Dashboard.owner');
    const formatter = useFormatter();
    const primaryTagStyle = {
        backgroundColor: token.colorPrimaryBg,
        borderColor: token.colorPrimaryBorder,
        color: token.colorPrimaryText,
    };

    if (!data) {
        return (
            <div className={styles.overviewView}>
                <Card className={styles.emptyCard}>
                    <Empty
                        image={(
                            <ContextualStateIllustration
                                color={token.colorPrimary}
                                size={112}
                                treatment="softHalo"
                                variant="analyticsContext"
                            />
                        )}
                        imageStyle={{ height: 112 }}
                        description={
                            <Text type="secondary">
                                {t('empty.noAnalyticsYet')}
                            </Text>
                        }
                    />
                </Card>
                {qualitySignalsSlot}
            </div>
        );
    }

    const { status, wtd, mtd, historicalWeeks, aiSummary, ownerActionPlan, ownerConfidence, sourceQuality, analyticsAiEntitlement } = data;

    const getStatusIcon = () => {
        switch (status) {
            case 'working':
                return <LuCheckCircle size={48} style={{ color: token.colorSuccess }} />;
            case 'low_activity':
                return <LuAlertTriangle size={48} style={{ color: token.colorWarning }} />;
            case 'no_data':
            default:
                return <LuClock size={48} style={{ color: token.colorTextTertiary }} />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'working':
                return token.colorSuccessBg;
            case 'low_activity':
                return token.colorWarningBg;
            case 'no_data':
            default:
                return token.colorFillSecondary;
        }
    };

    const renderHistoricalWeeksChart = (weeks: HistoricalWeek[]) => {
        if (!weeks || weeks.length === 0) return null;

        const maxScans = Math.max(...weeks.map(w => w.metrics.menuVisits), 1);

        return (
            <div className={styles.historicalWeeksChart}>
                {weeks.map((week, index) => {
                    const percentage = (week.metrics.menuVisits / maxScans) * 100;
                    return (
                        <div key={index} className={styles.weekBar}>
                            <div className={styles.weekLabel}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatDashboardWeekRange(week.weekStart, week.weekEnd, formatter, t('views.last7Days'))}
                                </Text>
                            </div>
                            <div className={styles.barContainer}>
                                <Progress
                                    percent={percentage}
                                    showInfo={false}
                                    strokeColor={week.isCurrentWeek ? token.colorPrimary : token.colorPrimaryBg}
                                    trailColor={token.colorBorderSecondary}
                                    size="small"
                                />
                            </div>
                            <div className={styles.weekValue}>
                                <Text strong={week.isCurrentWeek}>
                                    {formatNumber(week.metrics.menuVisits)}
                                </Text>
                                {week.isCurrentWeek && (
                                    <Tag style={{ ...primaryTagStyle, marginInlineStart: 4, fontSize: 10 }}>
                                        {t('overview.current')}
                                    </Tag>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={styles.overviewView}>
            {/* Hero Status Card */}
            <Card
                className={styles.heroCard}
                style={{ backgroundColor: getStatusColor() }}
                variant="borderless"
            >
                <div className={styles.heroContent}>
                    <div className={styles.heroIcon}>
                        {getStatusIcon()}
                    </div>
                    <div className={styles.heroText}>
                        <Title level={3} style={{ marginBottom: 4 }}>
                            {status === 'working' && t('overview.menuWorking')}
                            {status === 'low_activity' && t('overview.gettingStarted')}
                            {status === 'no_data' && t('overview.waitingForFirstScan')}
                        </Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            {getDashboardOverviewStatusMessage(status, t)}
                        </Paragraph>
                    </div>
                </div>

                {/* Quick Stats Row */}
                {wtd && (
                    <Row gutter={16} className={styles.quickStats}>
                        <Col xs={6}>
                            <div className={styles.quickStat}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{t('periods.thisWeek')}</Text>
                                <Title level={4} style={{ margin: 0 }}>
                                    {formatNumber(wtd.metrics.menuVisits)}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>{t('units.scans')}</Text>
                            </div>
                        </Col>
                        <Col xs={6}>
                            <div className={styles.quickStat}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{t('periods.thisMonth')}</Text>
                                <Title level={4} style={{ margin: 0 }}>
                                    {mtd ? formatNumber(mtd.metrics.menuVisits) : '—'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>{t('units.scans')}</Text>
                            </div>
                        </Col>
                        <Col xs={6}>
                            <div className={styles.quickStat}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{t('metrics.topItem')}</Text>
                                <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                                    {wtd.topItems?.[0]?.name || '—'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {wtd.topItems?.[0]?.clicks ? t('units.taps', { count: wtd.topItems[0].clicks }) : ''}
                                </Text>
                            </div>
                        </Col>
                        <Col xs={6}>
                            <div className={styles.quickStat}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{t('metrics.topCategory')}</Text>
                                <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                                    {wtd.topCategories?.[0]?.name || '—'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {wtd.topCategories?.[0] ? t('units.views', { count: wtd.topCategories[0].views }) : ''}
                                </Text>
                            </div>
                        </Col>
                    </Row>
                )}
            </Card>

            {qualitySignalsSlot}

            <OwnerActionPlanCard
                actionPlan={ownerActionPlan}
                confidence={ownerConfidence}
                sourceQuality={sourceQuality}
                analyticsAiEntitlement={analyticsAiEntitlement}
                title={t('actionPlan.menuIntelligenceTitle')}
                projectId={projectId}
            />

            {/* AI Summary (if available) */}
            {aiSummary?.bulletPoints?.length ? (
                <AISummaryCard summary={aiSummary} metrics={wtd?.metrics} period="weekly" />
            ) : null}

            <MenuAnalyticsDetailsCard data={wtd} title={t('details.last7DaysMenuDetails')} />
            <MenuAnalyticsDetailsCard
                data={mtd}
                title={t('details.monthMenuDetails', {
                    month: t('periods.thisMonth'),
                })}
            />

            <Card
                className={styles.detailCard}
                title={(
                    <span>
                        <LuHistory style={{ marginInlineEnd: 8 }} />
                        {t('overview.last4WeeksComparison')}
                    </span>
                )}
                variant="borderless"
            >
                {historicalWeeks && historicalWeeks.length > 0 ? (
                    renderHistoricalWeeksChart(historicalWeeks)
                ) : (
                    <Text type="secondary">{t('overview.historicalDataWillAppear')}</Text>
                )}
            </Card>
        </div>
    );
};

export default OverviewView;
