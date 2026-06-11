'use client'

import type {
    AnalyticsAiEntitlement,
    OwnerActionPlan,
    OwnerConfidence,
    SourceQuality,
} from '@template/main-app/projects/types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
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
    title,
}: MobileOwnerActionPlanCardProps) {
    const { token } = theme.useToken();
    const t = useTranslations('Dashboard.owner');
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
                <Text strong>{title || t('actionPlan.todayTitle')}</Text>
            </Flex>
        )}>
            <Flex gap={10} vertical>
                {isPlanLocked ? (
                    <Flex align="center" gap={8}>
                        <LuLock color={token.colorPrimary} size={18} />
                        <Flex gap={2} vertical>
                            <Text strong>{t('actionPlan.availableOnPro')}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('actionPlan.proDescription')}
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
                        {t('actionPlan.bestSourceMobile', {
                            source: bestSource.label,
                            visits: bestSource.menuSessions,
                            rate: bestSource.actionRate,
                        })}
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
                        <LuCheckCircle color={token.colorSuccess} size={18} />
                        <Text type="secondary">{t('actionPlan.noActionNeeded')}</Text>
                    </Flex>
                ) : null}

                {!isPlanLocked && sourceQuality.length > 1 ? (
                    <Flex gap={6} wrap>
                        {sourceQuality.slice(0, 4).map((source) => (
                            <Tag key={source.source} color="default">
                                {t('actionPlan.sourceQualityTagCompact', {
                                    source: source.label,
                                    visits: source.menuSessions,
                                    rate: source.actionRate,
                                })}
                            </Tag>
                        ))}
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}
