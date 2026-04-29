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
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    FireOutlined,
    HistoryOutlined,
    RiseOutlined,
    ThunderboltOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import {
    HistoricalWeek,
    OVERVIEW_GUARDRAILS,
    OverviewData,
} from '@template/main-app/projects/types';
import { Card, Col, Collapse, Empty, Progress, Row, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

const { Text, Title, Paragraph } = Typography;

interface OverviewViewProps {
    data: OverviewData | null;
}

const OverviewView: React.FC<OverviewViewProps> = ({ data }) => {
    const labels = useOfferingLabels();

    if (!data) {
        return (
            <Card className={styles.emptyCard}>
                <Empty
                    description={
                        <Text type="secondary">
                            No data yet. Your analytics will appear once customers start viewing.
                        </Text>
                    }
                />
            </Card>
        );
    }

    const { status, statusMessage, wtd, mtd, historicalWeeks, aiSummary } = data;

    const getStatusIcon = () => {
        switch (status) {
            case 'working':
                return <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />;
            case 'low_activity':
                return <WarningOutlined style={{ fontSize: 48, color: '#faad14' }} />;
            case 'no_data':
            default:
                return <ClockCircleOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'working':
                return '#f6ffed';
            case 'low_activity':
                return '#fffbe6';
            case 'no_data':
            default:
                return '#fafafa';
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
                                    {week.weekLabel}
                                </Text>
                            </div>
                            <div className={styles.barContainer}>
                                <Progress
                                    percent={percentage}
                                    showInfo={false}
                                    strokeColor={week.isCurrentWeek ? '#1890ff' : '#91d5ff'}
                                    trailColor="#f0f0f0"
                                    size="small"
                                />
                            </div>
                            <div className={styles.weekValue}>
                                <Text strong={week.isCurrentWeek}>
                                    {week.metrics.menuVisits.toLocaleString()}
                                </Text>
                                {week.isCurrentWeek && (
                                    <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>
                                        Current
                                    </Tag>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderActionSummary = (actions?: any) => {
        if (!actions) return null;
        const entries = Object.entries(actions).filter(([, count]) => Number(count) > 0);
        if (entries.length === 0) return null;

        return (
            <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>Customer Actions:</Text>
                <div style={{ marginTop: 4 }}>
                    {entries.map(([action, count]) => (
                        <Tag key={action} style={{ marginBottom: 4 }}>
                            {action} ({Number(count)})
                        </Tag>
                    ))}
                </div>
            </Col>
        );
    };

    const renderDemandSummary = (terms?: any[], unavailableItems?: any[]) => {
        if ((!terms || terms.length === 0) && (!unavailableItems || unavailableItems.length === 0)) {
            return null;
        }

        return (
            <Col span={24}>
                {terms?.length ? (
                    <>
                        <Text type="secondary" style={{ fontSize: 12 }}>Top Searches:</Text>
                        <div style={{ marginTop: 4, marginBottom: 8 }}>
                            {terms.map((term) => (
                                <Tag key={term.term} style={{ marginBottom: 4 }}>
                                    {term.term} ({term.count})
                                </Tag>
                            ))}
                        </div>
                    </>
                ) : null}
                {unavailableItems?.length ? (
                    <>
                        <Text type="secondary" style={{ fontSize: 12 }}>Unavailable Interest:</Text>
                        <div style={{ marginTop: 4 }}>
                            {unavailableItems.map((item) => (
                                <Tag key={item.itemId} style={{ marginBottom: 4 }}>
                                    {item.name || item.itemId} ({item.clicks})
                                </Tag>
                            ))}
                        </div>
                    </>
                ) : null}
            </Col>
        );
    };

    const collapseItems = [
        {
            key: 'wtd',
            label: (
                <span>
                    <ThunderboltOutlined style={{ marginRight: 8 }} />
                    Last 7 Days
                    {wtd && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                            {wtd.metrics.menuVisits.toLocaleString()} scans
                        </Tag>
                    )}
                </span>
            ),
            children: wtd ? (
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title={labels.scansLabel}
                            value={wtd.metrics.menuVisits}
                            prefix={<EyeOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Item Taps"
                            value={wtd.metrics.itemClicks}
                            prefix={<FireOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Suggestions Shown"
                            value={wtd.metrics.smartPicksRendered}
                            prefix={<ThunderboltOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Suggestions Selected"
                            value={wtd.metrics.smartPicksClicks}
                            prefix={<RiseOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Searches"
                            value={wtd.metrics.searches || 0}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="No-result Searches"
                            value={wtd.metrics.zeroResultSearches || 0}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Customer Actions"
                            value={wtd.metrics.menuActionClicks || 0}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Unavailable Interest"
                            value={wtd.metrics.unavailableItemTaps || 0}
                        />
                    </Col>
                    {wtd.topItems && wtd.topItems.length > 0 && (
                        <Col span={24}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Top Items:
                            </Text>
                            <div style={{ marginTop: 4 }}>
                                {wtd.topItems.slice(0, OVERVIEW_GUARDRAILS.SHOW_TOP_ITEMS).map((item, idx) => (
                                    <Tag key={item.itemId} style={{ marginBottom: 4 }}>
                                        {idx + 1}. {item.name || item.itemId} ({item.clicks})
                                    </Tag>
                                ))}
                            </div>
                        </Col>
                    )}
                    {renderActionSummary(wtd.menuActions)}
                    {renderDemandSummary(wtd.topSearchTerms, wtd.unavailableItems)}
                </Row>
            ) : (
                <Text type="secondary">No data for the last 7 days</Text>
            ),
        },
        {
            key: 'mtd',
            label: (
                <span>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    {mtd?.monthName || 'This Month'}
                    {mtd && (
                        <Tag color="green" style={{ marginLeft: 8 }}>
                            {mtd.metrics.menuVisits.toLocaleString()} scans ({mtd.daysWithData} days)
                        </Tag>
                    )}
                </span>
            ),
            children: mtd ? (
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Total Scans"
                            value={mtd.metrics.menuVisits}
                            prefix={<EyeOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Daily Average"
                            value={mtd.avgDailyScans}
                            suffix="/ day"
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Active Days"
                            value={mtd.daysWithData}
                            suffix={`/ ${mtd.daysInMonth}`}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Item Taps"
                            value={mtd.metrics.itemClicks}
                            prefix={<FireOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Searches"
                            value={mtd.metrics.searches || 0}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="No-result Searches"
                            value={mtd.metrics.zeroResultSearches || 0}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Customer Actions"
                            value={mtd.metrics.menuActionClicks || 0}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Unavailable Interest"
                            value={mtd.metrics.unavailableItemTaps || 0}
                        />
                    </Col>
                    {renderActionSummary(mtd.menuActions)}
                    {renderDemandSummary(mtd.topSearchTerms, mtd.unavailableItems)}
                </Row>
            ) : (
                <Text type="secondary">Month data will appear as days pass</Text>
            ),
        },
        {
            key: 'history',
            label: (
                <span>
                    <HistoryOutlined style={{ marginRight: 8 }} />
                    Last 4 Weeks Comparison
                </span>
            ),
            children: historicalWeeks && historicalWeeks.length > 0 ? (
                renderHistoricalWeeksChart(historicalWeeks)
            ) : (
                <Text type="secondary">Historical data will appear after a few weeks</Text>
            ),
        },
    ];

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
                            {status === 'working' && 'Your menu is working!'}
                            {status === 'low_activity' && 'Getting started'}
                            {status === 'no_data' && 'Waiting for first scan'}
                        </Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            {statusMessage}
                        </Paragraph>
                    </div>
                </div>

                {/* Quick Stats Row */}
                {wtd && (
                    <Row gutter={16} className={styles.quickStats}>
                        <Col xs={8}>
                            <div className={styles.quickStat}>
                                <Text type="secondary" style={{ fontSize: 12 }}>This Week</Text>
                                <Title level={4} style={{ margin: 0 }}>
                                    {wtd.metrics.menuVisits.toLocaleString()}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>scans</Text>
                            </div>
                        </Col>
                        <Col xs={8}>
                            <div className={styles.quickStat}>
                                <Text type="secondary" style={{ fontSize: 12 }}>This Month</Text>
                                <Title level={4} style={{ margin: 0 }}>
                                    {mtd?.metrics.menuVisits.toLocaleString() || '—'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>scans</Text>
                            </div>
                        </Col>
                        <Col xs={8}>
                            <div className={styles.quickStat}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Top Item</Text>
                                <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                                    {wtd.topItems?.[0]?.name || '—'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {wtd.topItems?.[0]?.clicks ? `${wtd.topItems[0].clicks} taps` : ''}
                                </Text>
                            </div>
                        </Col>
                    </Row>
                )}
            </Card>

            {/* AI Summary (if available) */}
            {aiSummary && aiSummary.bulletPoints && aiSummary.bulletPoints.length > 0 && (
                <Card
                    className={styles.aiSummaryCard}
                    title={
                        <span>
                            <ThunderboltOutlined style={{ marginRight: 8 }} />
                            Weekly Insights
                        </span>
                    }
                    variant="borderless"
                >
                    <ul className={styles.bulletList}>
                        {aiSummary.bulletPoints.slice(0, OVERVIEW_GUARDRAILS.MAX_AI_BULLETS).map((point, index) => (
                            <li key={index}>
                                <Text>{point}</Text>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Expandable Detail Sections */}
            <Card
                className={styles.detailCard}
                title="Detailed Breakdown"
                variant="borderless"
            >
                <Collapse
                    items={collapseItems}
                    defaultActiveKey={['wtd']}
                    ghost
                />
            </Card>
        </div>
    );
};

export default OverviewView;
