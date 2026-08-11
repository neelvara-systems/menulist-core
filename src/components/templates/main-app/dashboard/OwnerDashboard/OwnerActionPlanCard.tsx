import {
    markOwnerActionDone,
} from '@database/ownerDashboard';
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
import {
    AnalyticsAiEntitlement,
    OwnerActionReceipt,
    OwnerActionPlan,
    OwnerActionSuggestion,
    OwnerConfidence,
    SourceQuality,
} from '@template/main-app/projects/types';
import { Button, Card, Col, Empty, Row, Space, Tag, Typography, message, theme } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { LuCheckCircle, LuCompass, LuFlame, LuLock, LuZap } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title, Paragraph } = Typography;

interface OwnerActionPlanCardProps {
    actionPlan?: OwnerActionPlan;
    confidence?: OwnerConfidence;
    sourceQuality?: SourceQuality[];
    analyticsAiEntitlement?: AnalyticsAiEntitlement;
    title?: string;
    projectId?: string | null;
}

const priorityColor: Record<string, string> = {
    high: 'orange',
    medium: 'blue',
    low: 'default',
};

const OwnerActionPlanCard: React.FC<OwnerActionPlanCardProps> = ({
    actionPlan,
    confidence,
    sourceQuality = [],
    analyticsAiEntitlement,
    title,
    projectId,
}) => {
    const t = useTranslations('Dashboard.owner');
    const locale = useLocale();
    const actions = actionPlan?.actions || [];
    const [localReceipts, setLocalReceipts] = useState<Record<string, OwnerActionReceipt>>({});
    const [markingActionId, setMarkingActionId] = useState<string | null>(null);
    const bestSource = sourceQuality[0];
    const isPlanLocked = analyticsAiEntitlement
        && !analyticsAiEntitlement.enabled
        && analyticsAiEntitlement.reason !== 'feature_flag_disabled';
    const { token } = theme.useToken();
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
            message.success(t('actionPlan.markDoneSaved'));
        } catch {
            message.error(t('actionPlan.markDoneFailed'));
        } finally {
            setMarkingActionId(null);
        }
    };

    if (analyticsAiEntitlement?.reason === 'feature_flag_disabled' && actions.length === 0) {
        return null;
    }

    return (
        <Card
            className={styles.detailCard}
            title={(
                <Space>
                    <LuZap />
                    <span>{title || t('actionPlan.todayTitle')}</span>
                </Space>
            )}
            variant="borderless"
        >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {isPlanLocked ? (
                    <Empty
                        image={<LuLock style={{ color: token.colorPrimary, fontSize: 32 }} />}
                        description={(
                            <Space direction="vertical" size={4}>
                                <Text strong>{t('actionPlan.availableOnPro')}</Text>
                                <Text type="secondary">
                                    {t('actionPlan.proDescription')}
                                </Text>
                            </Space>
                        )}
                    />
                ) : null}

                {!isPlanLocked && confidence ? (
                    <div>
                        <Tag color={confidence.status === 'stable' ? 'success' : confidence.status === 'watch' ? 'warning' : 'default'}>
                            {confidenceDisplay?.label}
                        </Tag>
                        <Text type="secondary">{confidenceDisplay?.message}</Text>
                    </div>
                ) : null}

                {!isPlanLocked && bestSource ? (
                    <div>
                        <Text type="secondary">{t('actionPlan.bestSourcePrefix')} </Text>
                        <Text strong>{getOwnerDashboardSourceLabel(bestSource.source, bestSource.label, t)}</Text>
                        <Text type="secondary">
                            {t('actionPlan.bestSourceStatsFormatted', {
                                visits: bestSource.menuSessions,
                                rate: formatDashboardPercent(bestSource.actionRate),
                            })}
                        </Text>
                    </div>
                ) : null}

                {!isPlanLocked && actions.length > 0 ? (
                    <Row gutter={[12, 12]}>
                        {actions.map((action) => {
                            const display = getOwnerActionDisplay(action, locale, t);
                            const result = findReceipt(action)?.result;
                            const resultDisplay = result ? getOwnerActionResultDisplay(result, locale, t) : null;
                            return (
                            <Col xs={24} md={12} key={action.id}>
                                <Card size="small">
                                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                        <Space wrap>
                                            <Tag color={priorityColor[action.priority] || 'default'}>
                                                {getOwnerActionPriorityLabel(action.priority, t)}
                                            </Tag>
                                            {display.metricLabel ? <Tag>{display.metricLabel}</Tag> : null}
                                        </Space>
                                        <Title level={5} style={{ margin: 0 }}>
                                            {display.title}
                                        </Title>
                                        <Paragraph style={{ marginBottom: 0 }}>
                                            {display.description}
                                        </Paragraph>
                                        <Text type="secondary">{display.reason}</Text>
                                        <Text strong>
                                            <LuCompass style={{ marginInlineEnd: 6 }} />
                                            {display.actionLabel}
                                        </Text>
                                        {result && resultDisplay ? (
                                            <Space direction="vertical" size={2}>
                                                <Tag color={result.status === 'improved' ? 'success' : result.status === 'pending' ? 'processing' : 'default'}>
                                                    {resultDisplay.label}
                                                </Tag>
                                                <Text type="secondary">
                                                    {resultDisplay.message}
                                                </Text>
                                            </Space>
                                        ) : projectId ? (
                                            <Button
                                                size="small"
                                                type="primary"
                                                ghost
                                                loading={markingActionId === action.id}
                                                onClick={() => handleMarkDone(action)}
                                            >
                                                {t('actionPlan.markDone')}
                                            </Button>
                                        ) : null}
                                    </Space>
                                </Card>
                            </Col>
                            );
                        })}
                    </Row>
                ) : !isPlanLocked ? (
                    <Empty
                        image={<LuCheckCircle style={{ color: token.colorSuccess, fontSize: 32 }} />}
                        description={t('actionPlan.noActionNeeded')}
                    />
                ) : null}

                {!isPlanLocked && sourceQuality.length > 1 ? (
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                            {t('actionPlan.actionRateBySource')}
                        </Text>
                        <Space wrap>
                            {sourceQuality.slice(0, 4).map((source) => (
                                <Tag key={source.source} icon={<LuFlame />}>
                                    {t('actionPlan.sourceQualityTagFormatted', {
                                        source: getOwnerDashboardSourceLabel(source.source, source.label, t),
                                        visits: source.menuSessions,
                                        sessions: source.actionSessions,
                                        rate: formatDashboardPercent(source.actionRate),
                                    })}
                                </Tag>
                            ))}
                        </Space>
                    </div>
                ) : null}
            </Space>
        </Card>
    );
};

export default OwnerActionPlanCard;
