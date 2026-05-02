import { ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { DailyViewData } from '@template/main-app/projects/types';
import { Button, Card, Col, Popover, Row, Skeleton, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

function formatUpdatedTime(value?: Date | string): string | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

interface TodaySoFarCardProps {
    data: DailyViewData | null;
    loading?: boolean;
    showHistorical?: boolean;
    onShowHistorical?: () => void;
    fetchedAt?: Date | string;
}

const TodaySoFarCard: React.FC<TodaySoFarCardProps> = ({
    data,
    loading = false,
    showHistorical = true,
    onShowHistorical,
    fetchedAt,
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
        return (
            <Card className={styles.todayCard}>
                <div className={styles.todayCardHeader}>
                    <div>
                        <Tag color="default">Today so far</Tag>
                        <Title level={5} style={{ margin: '8px 0 0' }}>
                            No activity yet today
                        </Title>
                        <Text type="secondary">
                            Settled analytics from previous days are available below.
                        </Text>
                    </div>
                </div>

                {!showHistorical && onShowHistorical ? (
                    <div className={styles.todayCardAction}>
                        <Button onClick={onShowHistorical} type="default">
                            View settled analytics
                        </Button>
                    </div>
                ) : null}
            </Card>
        );
    }

    const updatedLabel = formatUpdatedTime(fetchedAt);

    const hasActions = Object.values(data.menuActions || {}).some((value) => Number(value) > 0);
    const topSearch = data.topSearchTerms?.[0];
    const topUnavailable = data.unavailableItems?.[0];
    const topFilter = data.topAttributeFilters?.[0];
    const detailContent = (
        <div style={{ maxWidth: 320 }}>
            <Text type="secondary" style={{ display: 'block' }}>
                This is the current business day&apos;s partial activity only. It is not included yet in Yesterday, Last 7 Days, This Month, or lifetime totals. Those views update after the next nightly settlement.
            </Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                Fresh data appears when this screen is opened again or refreshed after 10 minutes. It does not auto-update continuously.
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                Searches are de-duplicated within a session. Customer actions count final clicks only, and unavailable interest shows demand rather than confirmed lost sales.
            </Text>
            {topSearch ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    Top search right now: {topSearch.term} ({topSearch.count})
                </Text>
            ) : null}
            {topFilter ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    Top filter right now: {topFilter.label || topFilter.filterId} ({topFilter.interactions} intent, {topFilter.actionClicks} actions)
                </Text>
            ) : null}
            <Text style={{ display: 'block', marginTop: 8 }}>
                No-result searches so far: {data.metrics.zeroResultSearches || 0}
            </Text>
            {topUnavailable ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    Most tapped unavailable item: {topUnavailable.name || topUnavailable.itemId} ({topUnavailable.clicks})
                </Text>
            ) : null}
            {hasActions ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    Customer actions: Call {data.menuActions?.call || 0}, WhatsApp {data.menuActions?.whatsapp || 0}, Directions {data.menuActions?.directions || 0}, Reserve {data.menuActions?.reserve || 0}, Order {data.menuActions?.order || 0}
                </Text>
            ) : null}
        </div>
    );

    return (
        <Card className={styles.todayCard}>
            <div className={styles.todayCardHeader}>
                <div>
                    <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                        <Tag color="blue">Today so far</Tag>
                        <Popover content={detailContent} title="Today so far">
                            <Button icon={<InfoCircleOutlined />} size="small" type="text" />
                        </Popover>
                    </div>
                    <Title level={5} style={{ margin: '8px 0 0' }}>
                        Current activity for today
                    </Title>
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
                    <Statistic title="Engaged Sessions" suffix="%" value={data.metrics.engagedSessionRate || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title="Action Rate" suffix="%" value={data.metrics.actionRate || 0} />
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
        </Card>
    );
};

export default TodaySoFarCard;
