'use client'

import { markOwnerActionDone } from '@database/ownerDashboard';
import {
    getOwnerActionDisplay,
    getOwnerActionPriorityLabel,
    getOwnerActionResultDisplay,
    getOwnerConfidenceDisplay,
} from '@lib/analytics/ownerActionPlanPresentation';
import {
    formatDashboardPercent,
    getOwnerDashboardSourceLabel,
} from '@lib/analytics/ownerDashboardPresentation';
import type {
    AnalyticsAiEntitlement,
    OwnerActionReceipt,
    OwnerActionPlan,
    OwnerActionSuggestion,
    OwnerConfidence,
    SourceQuality,
} from '@template/main-app/projects/types';
import { theme } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
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
    const locale = useLocale();
    const actions = actionPlan?.actions || [];
    const [localReceipts, setLocalReceipts] = useState<Record<string, OwnerActionReceipt>>({});
    const [markingActionId, setMarkingActionId] = useState<string | null>(null);
    const bestSource = sourceQuality[0];
    const isPlanLocked = analyticsAiEntitlement
        && !analyticsAiEntitlement.enabled
        && analyticsAiEntitlement.reason !== 'feature_flag_disabled';
    const confidenceDisplay = confidence ? getOwnerConfidenceDisplay(confidence, locale, t) : null;

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
                            {confidenceDisplay?.label}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{confidenceDisplay?.message}</Text>
                    </Flex>
                ) : null}

                {!isPlanLocked && bestSource ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('actionPlan.bestSourceMobileFormatted', {
                            source: getOwnerDashboardSourceLabel(bestSource.source, bestSource.label, t),
                            visits: bestSource.menuSessions,
                            rate: formatDashboardPercent(bestSource.actionRate),
                        })}
                    </Text>
                ) : null}

                {!isPlanLocked && actions.length > 0 ? (
                    <List>
                        {actions.map((action) => {
                            const display = getOwnerActionDisplay(action, locale, t);
                            const result = findReceipt(action)?.result;
                            const resultDisplay = result ? getOwnerActionResultDisplay(result, locale, t) : null;
                            return (
                            <List.Item
                                key={action.id}
                                prefix={<Tag color={priorityColors[action.priority] || 'default'}>{getOwnerActionPriorityLabel(action.priority, t)}</Tag>}
                                description={(
                                    <Flex gap={4} vertical>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{display.description}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{display.reason}</Text>
                                        <Text strong style={{ fontSize: 12 }}>{display.actionLabel}</Text>
                                        {result && resultDisplay ? (
                                            <Flex gap={4} vertical>
                                                <Tag color={result.status === 'improved' ? 'success' : result.status === 'pending' ? 'primary' : 'default'}>
                                                    {resultDisplay.label}
                                                </Tag>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {resultDisplay.message}
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
                                title={<Text strong>{display.title}</Text>}
                            />
                            );
                        })}
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
                                {t('actionPlan.sourceQualityTagCompactFormatted', {
                                    source: getOwnerDashboardSourceLabel(source.source, source.label, t),
                                    visits: source.menuSessions,
                                    rate: formatDashboardPercent(source.actionRate),
                                })}
                            </Tag>
                        ))}
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}
