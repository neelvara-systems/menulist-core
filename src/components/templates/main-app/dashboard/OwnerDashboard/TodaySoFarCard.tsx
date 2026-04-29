import { ClockCircleOutlined } from '@ant-design/icons';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { DailyViewData } from '@template/main-app/projects/types';
import { Button, Card, Col, Row, Skeleton, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface TodaySoFarCardProps {
    data: DailyViewData | null;
    loading?: boolean;
    showHistorical?: boolean;
    onShowHistorical?: () => void;
}

const TodaySoFarCard: React.FC<TodaySoFarCardProps> = ({
    data,
    loading = false,
    showHistorical = true,
    onShowHistorical,
}) => {
    const labels = useOfferingLabels();

    if (loading) {
        return (
            <Card className={styles.todayCard}>
                <Skeleton active paragraph={{ rows: 2 }} title={{ width: '40%' }} />
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    const updatedLabel = data.lastUpdated
        ? data.lastUpdated.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
        : null;

    const hasActions = Object.values(data.menuActions || {}).some((value) => Number(value) > 0);
    const topSearch = data.topSearchTerms?.[0];
    const topUnavailable = data.unavailableItems?.[0];

    return (
        <Card className={styles.todayCard}>
            <div className={styles.todayCardHeader}>
                <div>
                    <Tag color="blue">Today so far</Tag>
                    <Title level={5} style={{ margin: '8px 0 0' }}>
                        Current activity for today
                    </Title>
                    <Text type="secondary">
                        This is today&apos;s partial activity only. It is not included yet in Yesterday, Last 7 Days, This Month, or lifetime totals. Those views update tomorrow.
                    </Text>
                </div>
                <div className={styles.todayCardMeta}>
                    <ClockCircleOutlined />
                    <Text type="secondary">
                        {updatedLabel ? `Updated ${updatedLabel}` : 'Live partial data'}
                    </Text>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Statistic title={labels.scansLabel} value={data.metrics.menuVisits || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title="Searches" value={data.metrics.searches || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title="Customer Actions" value={data.metrics.menuActionClicks || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title="Unavailable Interest" value={data.metrics.unavailableItemTaps || 0} />
                </Col>
            </Row>

            {!showHistorical && onShowHistorical ? (
                <div className={styles.todayCardAction}>
                    <Button onClick={onShowHistorical} type="default">
                        View settled analytics
                    </Button>
                </div>
            ) : null}

            {(topSearch || topUnavailable || hasActions || (data.metrics.zeroResultSearches || 0) > 0) ? (
                <div className={styles.todayCardNotes}>
                    {topSearch ? (
                        <Text style={{ display: 'block' }}>
                            Top search right now: {topSearch.term} ({topSearch.count})
                        </Text>
                    ) : null}
                    <Text style={{ display: 'block', marginTop: 4 }}>
                        No-result searches so far: {data.metrics.zeroResultSearches || 0}
                    </Text>
                    {topUnavailable ? (
                        <Text style={{ display: 'block', marginTop: 4 }}>
                            Most tapped unavailable item: {topUnavailable.name || topUnavailable.itemId} ({topUnavailable.clicks})
                        </Text>
                    ) : null}
                    {hasActions ? (
                        <Text style={{ display: 'block', marginTop: 4 }}>
                            Customer actions: Call {data.menuActions?.call || 0}, WhatsApp {data.menuActions?.whatsapp || 0}, Directions {data.menuActions?.directions || 0}, Reserve {data.menuActions?.reserve || 0}, Order {data.menuActions?.order || 0}
                        </Text>
                    ) : null}
                </div>
            ) : null}
        </Card>
    );
};

export default TodaySoFarCard;
