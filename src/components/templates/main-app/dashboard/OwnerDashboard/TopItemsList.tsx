/**
 * Top Items List
 * 
 * Displays the top performing menu items.
 * Simple list with item name and click count.
 */

import { FireOutlined } from '@ant-design/icons';
import { TopItem } from '@template/main-app/projects/types';
import { Card, Empty, List, Typography } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface TopItemsListProps {
    items: TopItem[];
    title?: string;
    maxItems?: number;
}

const TopItemsList: React.FC<TopItemsListProps> = ({
    items,
    title = 'Top Items',
    maxItems = 5,
}) => {
    const displayItems = items.slice(0, maxItems);

    if (displayItems.length === 0) {
        return (
            <Card className={styles.topItemsCard} variant="borderless">
                <Title level={5}>{title}</Title>
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No item clicks yet"
                />
            </Card>
        );
    }

    return (
        <Card className={styles.topItemsCard} variant="borderless">
            <Title level={5}>{title}</Title>
            <List
                className={styles.topItemsList}
                dataSource={displayItems}
                renderItem={(item, index) => (
                    <List.Item className={styles.topItemRow}>
                        <div className={styles.topItemRank}>
                            {index === 0 ? (
                                <FireOutlined className={styles.topItemIcon} />
                            ) : (
                                <span className={styles.rankNumber}>{index + 1}</span>
                            )}
                        </div>
                        <div className={styles.topItemInfo}>
                            <Text className={styles.topItemName}>
                                {item.name || item.itemId}
                            </Text>
                        </div>
                        <div className={styles.topItemClicks}>
                            <Text type="secondary">{item.clicks} clicks</Text>
                        </div>
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default TopItemsList;
