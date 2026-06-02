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

import { AISummary } from '@template/main-app/projects/types';
import { Card, List, Typography } from 'antd';
import React from 'react';
import { LuLightbulb } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface AISummaryCardProps {
    summary: AISummary;
    period: 'daily' | 'weekly' | 'monthly';
}

const periodTitles = {
    daily: 'Yesterday at a glance',
    weekly: 'This week at a glance',
    monthly: 'This month in summary',
};

const AISummaryCard: React.FC<AISummaryCardProps> = ({ summary, period }) => {
    if (!summary?.bulletPoints?.length) {
        return null;
    }

    return (
        <Card className={styles.aiSummaryCard} variant="borderless">
            <div className={styles.aiSummaryHeader}>
                <LuLightbulb className={styles.aiIcon} />
                <Title level={5} className={styles.aiTitle}>
                    {periodTitles[period]}
                </Title>
            </div>
            <List
                className={styles.aiBulletList}
                dataSource={summary.bulletPoints}
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
