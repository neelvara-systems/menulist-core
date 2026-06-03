import {
    buildMenuAnalyticsDetailSections,
    type OwnerMenuAnalyticsDetailData,
} from '@lib/analytics/ownerDashboardDetails';
import { Card, Collapse, Empty, Flex, Tag, Typography } from 'antd';
import React, { useMemo } from 'react';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

interface MenuAnalyticsDetailsCardProps {
    data: OwnerMenuAnalyticsDetailData | null | undefined;
    title?: string;
}

const MenuAnalyticsDetailsCard: React.FC<MenuAnalyticsDetailsCardProps> = ({
    data,
    title = 'Menu Details',
}) => {
    const sections = useMemo(() => buildMenuAnalyticsDetailSections(data), [data]);

    return (
        <Card className={styles.detailCard} title={title} variant="borderless">
            {sections.length === 0 ? (
                <Empty
                    description={<Text type="secondary">No extra menu detail yet for this period.</Text>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <Collapse
                    defaultActiveKey={sections.slice(0, 2).map((section) => section.key)}
                    ghost
                    items={sections.map((section) => ({
                        key: section.key,
                        label: (
                            <Flex align="center" gap={8} wrap="wrap">
                                <Text strong>{section.title}</Text>
                                <Tag>{section.rows.length}</Tag>
                            </Flex>
                        ),
                        children: (
                            <div className={styles.analyticsDetailSection}>
                                {section.description ? (
                                    <Text className={styles.analyticsDetailDescription} type="secondary">
                                        {section.description}
                                    </Text>
                                ) : null}
                                {section.rows.map((row) => (
                                    <Flex
                                        align="flex-start"
                                        className={styles.analyticsDetailRow}
                                        gap={12}
                                        justify="space-between"
                                        key={row.key}
                                    >
                                        <div className={styles.analyticsDetailLabel}>
                                            <Text>{row.label}</Text>
                                            {row.detail ? (
                                                <Text type="secondary">{row.detail}</Text>
                                            ) : null}
                                        </div>
                                        <Text strong className={styles.analyticsDetailValue}>
                                            {row.value}
                                        </Text>
                                    </Flex>
                                ))}
                            </div>
                        ),
                    }))}
                />
            )}
        </Card>
    );
};

export default MenuAnalyticsDetailsCard;
