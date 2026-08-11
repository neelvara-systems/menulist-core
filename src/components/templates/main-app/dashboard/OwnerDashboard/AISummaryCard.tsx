/**
 * AI Summary Card
 * 
 * Displays the AI-generated summary for the owner.
 * Simple, bullet-point format. No jargon.
 * 
 * Tone varies by period:
 * - Daily: Descriptive only, 2 bullets
 * - Weekly: Confident, actionable, 5 bullets
 * - Monthly: Calm, reassuring, 3 bullets
 */

import { getDashboardSummaryBullets } from '@lib/analytics/ownerDashboardPresentation';
import { AISummary, OwnerDashboardMetrics } from '@template/main-app/projects/types';
import { Card, List, Typography } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { LuLightbulb } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface AISummaryCardProps {
    summary: AISummary;
    metrics?: OwnerDashboardMetrics | null;
    period: 'daily' | 'weekly' | 'monthly';
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({ summary, metrics, period }) => {
    const t = useTranslations('Dashboard.owner');
    const locale = useLocale();
    const bullets = useMemo(() => getDashboardSummaryBullets({
        locale,
        metrics,
        summary,
        t,
        limit: period === 'daily' ? 2 : period === 'monthly' ? 3 : 5,
    }), [locale, metrics, period, summary, t]);
    if (!bullets.length) {
        return null;
    }

    return (
        <Card className={styles.aiSummaryCard} variant="borderless">
            <div className={styles.aiSummaryHeader}>
                <LuLightbulb className={styles.aiIcon} />
                <Title level={5} className={styles.aiTitle}>
                    {t(`aiSummary.${period}`)}
                </Title>
            </div>
            <List
                className={styles.aiBulletList}
                dataSource={bullets}
                renderItem={(bullet) => (
                    <List.Item className={styles.aiBulletItem}>
                        <Text>{bullet}</Text>
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default AISummaryCard;
