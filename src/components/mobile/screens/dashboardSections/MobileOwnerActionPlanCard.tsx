'use client'

import type {
    AnalyticsAiEntitlement,
    OwnerActionPlan,
    OwnerConfidence,
    SourceQuality,
} from '@template/main-app/projects/types';
import { LuCheckCircle, LuLock, LuSparkles } from 'react-icons/lu';
import { Card, Flex, List, Tag, Text } from '../../antd';

interface MobileOwnerActionPlanCardProps {
    actionPlan?: OwnerActionPlan;
    confidence?: OwnerConfidence;
    sourceQuality?: SourceQuality[];
    analyticsAiEntitlement?: AnalyticsAiEntitlement;
    title?: string;
}

const priorityColors: Record<string, 'warning' | 'primary' | 'default'> = {
    high: 'warning',
    medium: 'primary',
    low: 'default',
};

export default function MobileOwnerActionPlanCard({
    actionPlan,
    confidence,
    sourceQuality = [],
    analyticsAiEntitlement,
    title = "Today's Action List",
}: MobileOwnerActionPlanCardProps) {
    const actions = actionPlan?.actions || [];
    const bestSource = sourceQuality[0];
    const isPlanLocked = analyticsAiEntitlement
        && !analyticsAiEntitlement.enabled
        && analyticsAiEntitlement.reason !== 'feature_flag_disabled';

    if (analyticsAiEntitlement?.reason === 'feature_flag_disabled' && actions.length === 0) {
        return null;
    }

    return (
        <Card size="small" title={(
            <Flex align="center" gap={6}>
                <LuSparkles size={14} />
                <Text strong>{title}</Text>
            </Flex>
        )}>
            <Flex gap={10} vertical>
                {isPlanLocked ? (
                    <Flex align="center" gap={8}>
                        <LuLock color="#1d3f8f" size={18} />
                        <Flex gap={2} vertical>
                            <Text strong>Available on Pro</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Pro adds a daily action list and plain-language summaries from your menu activity.
                            </Text>
                        </Flex>
                    </Flex>
                ) : null}

                {!isPlanLocked && confidence ? (
                    <Flex gap={6} vertical>
                        <Tag color={confidence.status === 'stable' ? 'success' : confidence.status === 'watch' ? 'warning' : 'default'}>
                            {confidence.label}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{confidence.message}</Text>
                    </Flex>
                ) : null}

                {!isPlanLocked && bestSource ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {`Best source right now: ${bestSource.label} · ${bestSource.actionRate}% action rate`}
                    </Text>
                ) : null}

                {!isPlanLocked && actions.length > 0 ? (
                    <List>
                        {actions.map((action) => (
                            <List.Item
                                key={action.id}
                                prefix={<Tag color={priorityColors[action.priority] || 'default'}>{action.priority}</Tag>}
                                description={(
                                    <Flex gap={4} vertical>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{action.description}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{action.reason}</Text>
                                        <Text strong style={{ fontSize: 12 }}>{action.actionLabel}</Text>
                                    </Flex>
                                )}
                                title={<Text strong>{action.title}</Text>}
                            />
                        ))}
                    </List>
                ) : !isPlanLocked ? (
                    <Flex align="center" gap={8}>
                        <LuCheckCircle color="#16a34a" size={18} />
                        <Text type="secondary">No action needed. Menu state is stable.</Text>
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}
