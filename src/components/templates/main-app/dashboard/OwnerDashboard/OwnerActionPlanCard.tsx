import {
    AnalyticsAiEntitlement,
    OwnerActionPlan,
    OwnerConfidence,
    SourceQuality,
} from '@template/main-app/projects/types';
import { Card, Col, Empty, Row, Space, Tag, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React from 'react';
import { LuCheckCircle, LuCompass, LuFlame, LuLock, LuZap } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title, Paragraph } = Typography;

interface OwnerActionPlanCardProps {
    actionPlan?: OwnerActionPlan;
    confidence?: OwnerConfidence;
    sourceQuality?: SourceQuality[];
    analyticsAiEntitlement?: AnalyticsAiEntitlement;
    title?: string;
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
}) => {
    const t = useTranslations('Dashboard.owner');
    const actions = actionPlan?.actions || [];
    const bestSource = sourceQuality[0];
    const isPlanLocked = analyticsAiEntitlement
        && !analyticsAiEntitlement.enabled
        && analyticsAiEntitlement.reason !== 'feature_flag_disabled';
    const { token } = theme.useToken();

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
                            {confidence.label}
                        </Tag>
                        <Text type="secondary">{confidence.message}</Text>
                    </div>
                ) : null}

                {!isPlanLocked && bestSource ? (
                    <div>
                        <Text type="secondary">{t('actionPlan.bestSourcePrefix')} </Text>
                        <Text strong>{bestSource.label}</Text>
                        <Text type="secondary">
                            {t('actionPlan.bestSourceStats', {
                                visits: bestSource.menuSessions,
                                rate: bestSource.actionRate,
                            })}
                        </Text>
                    </div>
                ) : null}

                {!isPlanLocked && actions.length > 0 ? (
                    <Row gutter={[12, 12]}>
                        {actions.map((action) => (
                            <Col xs={24} md={12} key={action.id}>
                                <Card size="small">
                                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                        <Space wrap>
                                            <Tag color={priorityColor[action.priority] || 'default'}>
                                                {action.priority}
                                            </Tag>
                                            {action.metricLabel ? <Tag>{action.metricLabel}</Tag> : null}
                                        </Space>
                                        <Title level={5} style={{ margin: 0 }}>
                                            {action.title}
                                        </Title>
                                        <Paragraph style={{ marginBottom: 0 }}>
                                            {action.description}
                                        </Paragraph>
                                        <Text type="secondary">{action.reason}</Text>
                                        <Text strong>
                                            <LuCompass style={{ marginRight: 6 }} />
                                            {action.actionLabel}
                                        </Text>
                                    </Space>
                                </Card>
                            </Col>
                        ))}
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
                                    {t('actionPlan.sourceQualityTag', {
                                        source: source.label,
                                        visits: source.menuSessions,
                                        sessions: source.actionSessions,
                                        rate: source.actionRate,
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
