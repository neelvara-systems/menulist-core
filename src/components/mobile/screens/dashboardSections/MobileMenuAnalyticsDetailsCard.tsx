'use client';

import {
    buildMenuAnalyticsDetailSections,
    type OwnerMenuAnalyticsDetailData,
} from '@lib/analytics/ownerDashboardDetails';
import { theme } from 'antd';
import { useMemo } from 'react';
import { Card, Flex, Tag, Text } from '../../antd';

interface MobileMenuAnalyticsDetailsCardProps {
    data: OwnerMenuAnalyticsDetailData | null | undefined;
    title?: string;
}

export default function MobileMenuAnalyticsDetailsCard({
    data,
    title = 'Menu Details',
}: MobileMenuAnalyticsDetailsCardProps) {
    const { token } = theme.useToken();
    const sections = useMemo(() => buildMenuAnalyticsDetailSections(data), [data]);

    return (
        <Card size="small" title={<Text strong>{title}</Text>}>
            {sections.length === 0 ? (
                <Text type="secondary">No extra menu detail yet for this period.</Text>
            ) : (
                <Flex gap={14} vertical>
                    {sections.map((section) => (
                        <div
                            key={section.key}
                            style={{
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                paddingTop: 12,
                            }}
                        >
                            <Flex align="center" gap={8} justify="space-between" style={{ marginBottom: 8 }}>
                                <Text strong style={{ fontSize: 13 }}>{section.title}</Text>
                                <Tag>{section.rows.length}</Tag>
                            </Flex>
                            {section.description ? (
                                <Text
                                    type="secondary"
                                    style={{
                                        display: 'block',
                                        fontSize: 12,
                                        marginBottom: 8,
                                    }}
                                >
                                    {section.description}
                                </Text>
                            ) : null}
                            <Flex gap={8} vertical>
                                {section.rows.map((row) => (
                                    <Flex align="flex-start" gap={10} justify="space-between" key={row.key}>
                                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                            <Text style={{ fontSize: 12 }}>{row.label}</Text>
                                            {row.detail ? (
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {row.detail}
                                                </Text>
                                            ) : null}
                                        </Flex>
                                        <Text
                                            strong
                                            style={{
                                                flexShrink: 0,
                                                fontSize: 12,
                                                textAlign: 'right',
                                            }}
                                        >
                                            {row.value}
                                        </Text>
                                    </Flex>
                                ))}
                            </Flex>
                        </div>
                    ))}
                </Flex>
            )}
        </Card>
    );
}
