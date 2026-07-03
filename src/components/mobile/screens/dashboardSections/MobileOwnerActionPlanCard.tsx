'use client'

import { markOwnerActionDone } from '@database/ownerDashboard';
import type {
    AnalyticsAiEntitlement,
    OwnerActionReceipt,
    OwnerActionPlan,
    OwnerActionSuggestion,
    OwnerConfidence,
    SourceQuality,
} from '@template/main-app/projects/types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuCheckCircle, LuLock, LuSparkles } from 'react-icons/lu';
import { Button, Card, Flex, List, Tag, Text, Toast } from '../../antd';

interface MobileOwnerActionPlanCardProps {
    actionPlan?: OwnerActionPlan;
    confidence?: OwnerConfidence;
    sourceQuality?: SourceQuality[];
    analyticsAiEntitlement?: AnalyticsAiEntitlement;
    title?: string;
    projectId?: string | null;
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
    projectId,
}: MobileOwnerActionPlanCardProps) {
    const { token } = theme.useToken();
    const t = useTranslations('Dashboard.owner');
    const actions = actionPlan?.actions || [];
    const [localReceipts, setLocalReceipts] = useState<Record<string, OwnerActionReceipt>>({});
    const [markingActionId, setMarkingActionId] = useState<string | null>(null);
    const bestSource = sourceQuality[0];
    const isPlanLocked = analyticsAiEntitlement
        && !analyticsAiEntitlement.enabled
        && analyticsAiEntitlement.reason !== 'feature_flag_disabled';

    useEffect(() => {
        setLocalReceipts(actionPlan?.receipts || {});
    }, [actionPlan?.fingerprint, actionPlan?.receipts]);

    const findReceipt = (action: OwnerActionSuggestion) => {
        if (action.receipt) return action.receipt;
        return Object.values(localReceipts).find((receipt) => receipt.actionId === action.id);
    };

    const handleMarkDone = async (action: OwnerActionSuggestion) => {
        if (!projectId) return;
        setMarkingActionId(action.id);
        try {
            const receipt = await markOwnerActionDone({ projectId, action });
            setLocalReceipts((prev) => ({ ...prev, [receipt.receiptId]: receipt }));
            Toast.show({ content: t('actionPlan.markDoneSaved'), icon: 'success' });
        } catch {
            Toast.show({ content: t('actionPlan.markDoneFailed') });
        } finally {
            setMarkingActionId(null);
        }
    };

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
                                        {findReceipt(action)?.result ? (
                                            <Flex gap={4} vertical>
                                                <Tag color={findReceipt(action)?.result?.status === 'improved' ? 'success' : findReceipt(action)?.result?.status === 'pending' ? 'primary' : 'default'}>
                                                    {findReceipt(action)?.result?.label}
                                                </Tag>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {findReceipt(action)?.result?.message}
                                                </Text>
                                            </Flex>
                                        ) : projectId ? (
                                            <Button
                                                block
                                                color="primary"
                                                fill="outline"
                                                loading={markingActionId === action.id}
                                                onClick={() => handleMarkDone(action)}
                                                size="small"
                                            >
                                                {t('actionPlan.markDone')}
                                            </Button>
                                        ) : null}
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
