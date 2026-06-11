import { useOfferingLabels } from '@hook/useOfferingLabels';
import { DailyViewData } from '@template/main-app/projects/types';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import { Button, Card, Col, Popover, Row, Skeleton, Statistic, Typography } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import React from 'react';
import { LuClock, LuInfo } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

function formatUpdatedTime(value: Date | string | undefined, formatter: IntlFormatter): string | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return formatDateTime(parsed, 'time', formatter);
}

interface TodaySoFarCardProps {
    data: DailyViewData | null;
    loading?: boolean;
    fetchedAt?: Date | string;
    title?: string;
}

const TodaySoFarCard: React.FC<TodaySoFarCardProps> = ({
    data,
    loading = false,
    fetchedAt,
    title,
}) => {
    const labels = useOfferingLabels();
    const formatter = useFormatter();
    const t = useTranslations('Dashboard.owner');
    const cardTitle = title || t('menu');

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
                        <Title level={5} style={{ margin: '8px 0 0' }}>
                            {cardTitle}
                        </Title>
                        <Text type="secondary">
                            {t('today.noMenuActivityToday')}
                        </Text>
                    </div>
                </div>
            </Card>
        );
    }

    const updatedLabel = formatUpdatedTime(fetchedAt, formatter);

    const hasActions = Object.values(data.menuActions || {}).some((value) => Number(value) > 0);
    const topSearch = data.topSearchTerms?.[0];
    const topUnavailable = data.unavailableItems?.[0];
    const topFilter = data.topAttributeFilters?.[0];
    const topLanguage = data.topLanguages?.[0];
    const detailContent = (
        <div style={{ maxWidth: 320 }}>
            <Text type="secondary" style={{ display: 'block' }}>
                {t('today.partialActivity')}
            </Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {t('today.refreshHint')}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                {t('today.metricsHint')}
            </Text>
            {topSearch ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    {t('today.topSearchNow', { term: topSearch.term, count: topSearch.count })}
                </Text>
            ) : null}
            {topFilter ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    {t('today.topFilterNow', {
                        label: topFilter.label || topFilter.filterId,
                        interactions: topFilter.interactions,
                        actions: topFilter.actionClicks,
                    })}
                </Text>
            ) : null}
            {topLanguage ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    {t('today.topLanguageNow', {
                        label: topLanguage.label,
                        sessions: topLanguage.menuSessions || topLanguage.menuViews,
                        adoptions: topLanguage.adoptions,
                    })}
                </Text>
            ) : null}
            <Text style={{ display: 'block', marginTop: 8 }}>
                {t('today.noResultSearchesSoFar', { count: data.metrics.zeroResultSearches || 0 })}
            </Text>
            {topUnavailable ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    {t('today.mostTappedUnavailableItem', {
                        item: topUnavailable.name || topUnavailable.itemId,
                        count: topUnavailable.clicks,
                    })}
                </Text>
            ) : null}
            {hasActions ? (
                <Text style={{ display: 'block', marginTop: 8 }}>
                    {t('today.customerActionsBreakdown', {
                        call: data.menuActions?.call || 0,
                        whatsapp: data.menuActions?.whatsapp || 0,
                        directions: data.menuActions?.directions || 0,
                        reserve: data.menuActions?.reserve || 0,
                        order: data.menuActions?.order || 0,
                    })}
                </Text>
            ) : null}
        </div>
    );

    return (
        <Card className={styles.todayCard}>
            <div className={styles.todayCardHeader}>
                <div>
                    <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                        <Title level={5} style={{ margin: 0 }}>
                            {cardTitle}
                        </Title>
                        <Popover content={detailContent} title={t('views.todaySoFar')}>
                            <Button icon={<LuInfo />} size="small" type="text" />
                        </Popover>
                    </div>
                    <Text type="secondary">{t('today.currentActivity')}</Text>
                </div>
                <div className={styles.todayCardMeta}>
                    <LuClock />
                    <Text type="secondary">
                        {updatedLabel ? t('today.updated', { time: updatedLabel }) : t('today.livePartialData')}
                    </Text>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Statistic title={labels.scansLabel} value={data.metrics.menuVisits || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title={t('metrics.searches')} value={data.metrics.searches || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title={t('metrics.engagedSessions')} suffix="%" value={data.metrics.engagedSessionRate || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title={t('metrics.actionRate')} suffix="%" value={data.metrics.actionRate || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title={t('metrics.customerActions')} value={data.metrics.menuActionClicks || 0} />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic title={t('metrics.unavailableInterest')} value={data.metrics.unavailableItemTaps || 0} />
                </Col>
                {topLanguage ? (
                    <Col xs={12} sm={6}>
                        <Statistic title={t('metrics.topLanguage')} value={topLanguage.label} />
                    </Col>
                ) : null}
            </Row>
        </Card>
    );
};

export default TodaySoFarCard;
