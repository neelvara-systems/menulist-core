/**
 * Overall Footer
 * 
 * Shows lifetime/all-time metrics as an anchor.
 * Always visible at the bottom of the dashboard.
 * Read-only, simple presentation.
 */

import { OverallData } from '@template/main-app/projects/types';
import { formatDateKey, formatDateTime } from '@util/dateTime';
import { Card, Col, Divider, Row, Statistic, Typography } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import React from 'react';
import { LuTrophy } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface OverallFooterProps {
    data: OverallData;
}

const OverallFooter: React.FC<OverallFooterProps> = ({ data }) => {
    const { lifetimeMetrics, firstDataDate, lastUpdated } = data;
    const formatter = useFormatter();
    const t = useTranslations('Dashboard.owner');

    const formatDate = (date?: string | Date) => {
        if (!date) return t('states.notAvailable');
        return typeof date === 'string'
            ? formatDateKey(date, formatter)
            : formatDateTime(date, 'date', formatter);
    };

    return (
        <Card className={styles.overallFooter} variant="borderless">
            <div className={styles.overallHeader}>
                <LuTrophy className={styles.overallIcon} />
                <Title level={5} className={styles.overallTitle}>
                    {t('overall.allTimeSummary')}
                </Title>
                {firstDataDate && (
                    <Text type="secondary" className={styles.overallDateRange}>
                        {t('overall.since', { date: formatDate(firstDataDate) })}
                    </Text>
                )}
            </div>

            <Divider className={styles.overallDivider} />

            <Row gutter={[24, 16]}>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.totalMenuScans')}
                        value={lifetimeMetrics.totalViews}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.totalItemClicks')}
                        value={lifetimeMetrics.totalClicks}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.smartPicksShown')}
                        value={lifetimeMetrics.totalSmartPicksRendered}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.smartPicksClicks')}
                        value={lifetimeMetrics.totalSmartPicksClicks}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.engagedSessions')}
                        suffix="%"
                        value={lifetimeMetrics.engagedSessionRate || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.actionRate')}
                        suffix="%"
                        value={lifetimeMetrics.actionRate || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.searches')}
                        value={lifetimeMetrics.totalSearches || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.noResultSearches')}
                        value={lifetimeMetrics.totalZeroResultSearches || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.customerActions')}
                        value={lifetimeMetrics.totalMenuActionClicks || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('metrics.unavailableInterest')}
                        value={lifetimeMetrics.totalUnavailableItemTaps || 0}
                        className={styles.overallStat}
                    />
                </Col>
            </Row>

            {data.menuActions && (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {t('overall.actionsSummary', {
                        call: data.menuActions.call,
                        whatsapp: data.menuActions.whatsapp,
                        directions: data.menuActions.directions,
                        reserve: data.menuActions.reserve,
                        order: data.menuActions.order,
                    })}
                </Text>
            )}

            {data.topItems?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {t('overall.topItemsSummary', {
                        items: data.topItems.slice(0, 3).map((item) => t('overall.itemTapsSummary', {
                            item: item.name || item.itemId,
                            count: item.clicks,
                        })).join(', '),
                    })}
                </Text>
            ) : null}

            {data.topCategories?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {t('overall.topCategorySummary', {
                        categories: data.topCategories.slice(0, 3).map((category) => t('overall.categorySummary', {
                            category: category.name || category.categoryId,
                            views: category.views,
                            taps: category.clicks,
                        })).join(', '),
                    })}
                </Text>
            ) : null}

            {data.topLanguages?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {t('overall.topLanguagesSummary', {
                        languages: data.topLanguages.slice(0, 3).map((language) => t('overall.languageSummary', {
                            language: language.label || language.language,
                            sessions: language.menuSessions || language.menuViews,
                            adoptions: language.adoptions || 0,
                        })).join(', '),
                    })}
                </Text>
            ) : null}

            {data.topAttributeFilters?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {t('overall.topFiltersSummary', {
                        filters: data.topAttributeFilters.slice(0, 3).map((filter) => t('overall.filterSummary', {
                            filter: filter.label || filter.filterId,
                            interactions: filter.interactions,
                            actions: filter.actionClicks,
                        })).join(', '),
                    })}
                </Text>
            ) : null}

            {lastUpdated && (
                <Text type="secondary" className={styles.lastUpdated}>
                    {t('overall.lastUpdated', { date: formatDate(lastUpdated) })}
                </Text>
            )}
        </Card>
    );
};

export default OverallFooter;
