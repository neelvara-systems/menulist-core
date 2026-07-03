/**
 * Top Items List
 * 
 * Displays the top performing menu items.
 * Simple list with item name and click count.
 */

import { TopItem } from '@template/main-app/projects/types';
import { Card, Empty, List, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React from 'react';
import { LuFlame } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

const STATUS_TAG_COLORS: Record<string, string> = {
    success: 'green',
    warning: 'orange',
    default: 'blue',
};

interface TopItemsListProps {
    items: TopItem[];
    title?: string;
    maxItems?: number;
}

const TopItemsList: React.FC<TopItemsListProps> = ({
    items,
    title,
    maxItems = 5,
}) => {
    const t = useTranslations('Dashboard.owner');
    const displayItems = items.slice(0, maxItems);
    const cardTitle = title || t('details.sections.topItems');

    if (displayItems.length === 0) {
        return (
            <Card className={styles.topItemsCard} variant="borderless">
                <Title level={5}>{cardTitle}</Title>
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('empty.noItemClicksYet')}
                />
            </Card>
        );
    }

    return (
        <Card className={styles.topItemsCard} variant="borderless">
            <Title level={5}>{cardTitle}</Title>
            <List
                className={styles.topItemsList}
                dataSource={displayItems}
                renderItem={(item, index) => (
                    <List.Item className={styles.topItemRow}>
                        <div className={styles.topItemRank}>
                            {index === 0 ? (
                                <LuFlame className={styles.topItemIcon} />
                            ) : (
                                <span className={styles.rankNumber}>{index + 1}</span>
                            )}
                        </div>
                        <div className={styles.topItemInfo}>
                            <Text className={styles.topItemName}>
                                {item.name || item.itemId}
                            </Text>
                            {item.statusLabel ? (
                                <Tag color={STATUS_TAG_COLORS[item.statusTone || 'default']} style={{ marginTop: 4 }}>
                                    {item.statusLabel}
                                </Tag>
                            ) : null}
                        </div>
                        <div className={styles.topItemClicks}>
                            <Text type="secondary">{t('units.clicks', { count: item.clicks })}</Text>
                        </div>
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default TopItemsList;
