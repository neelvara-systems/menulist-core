'use client'

/**
 * Canonica Dashboard — Overview Page
 * 
 * Quick stats: coverage KPI, entity count, drifted answers, recent activity.
 * Entry point for Canonica admin users.
 */

import CanonicaCoverageKPI from '@/components/templates/canonica/CanonicaCoverageKPI';
import { useCanonicalAnswers } from '@hook/canonica/useCanonicalAnswers';
import { useEntities } from '@hook/canonica/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { Card, Col, Empty, Flex, Row, Statistic, Typography } from 'antd';
import {
    LuAlertTriangle,
    LuBookOpen,
    LuBoxes,
    LuShieldCheck,
    LuZap,
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

export default function CanonicaDashboardPage() {
    const session = useClientAuthSession();
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    const { answers, driftedAnswers, loading: answersLoading } = useCanonicalAnswers(tId, sId);
    const { entities, relations, searchIndex, loading: entitiesLoading } = useEntities(tId, sId);

    const loading = answersLoading || entitiesLoading;

    const activeAnswers = (answers || []).filter(a => a.status === 'active');
    const activeEntities = (entities || []).filter(e => e.status !== 'deprecated');
    const totalSignals = activeAnswers.reduce((sum, a) =>
        sum + (a.signalMetrics?.linkedTicketCount || 0) + (a.signalMetrics?.linkedChatCount || 0), 0
    );

    return (
        <Flex vertical gap={24}>
            <div>
                <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
                <Text type="secondary">Canonica knowledge governance overview</Text>
            </div>

            {/* Quick Stats Row */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic
                            title="Entities"
                            value={activeEntities.length}
                            prefix={<LuBoxes style={{ color: '#1677ff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic
                            title="Canonical Answers"
                            value={activeAnswers.length}
                            prefix={<LuBookOpen style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic
                            title="Drifted"
                            value={driftedAnswers.length}
                            prefix={driftedAnswers.length > 0
                                ? <LuAlertTriangle style={{ color: '#faad14' }} />
                                : <LuShieldCheck style={{ color: '#52c41a' }} />
                            }
                            valueStyle={{ color: driftedAnswers.length > 0 ? '#faad14' : '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic
                            title="Total Signals"
                            value={totalSignals}
                            prefix={<LuZap style={{ color: '#722ed1' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Coverage KPI + Ontology Summary */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                    <CanonicaCoverageKPI />
                </Col>
                <Col xs={24} lg={16}>
                    <Card title="Ontology Summary" loading={loading}>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Statistic title="Relations" value={relations.length} />
                            </Col>
                            <Col span={8}>
                                <Statistic title="Search Index" value={searchIndex.length} />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Coverage"
                                    value={activeEntities.length > 0
                                        ? Math.round((activeEntities.filter(e =>
                                            activeAnswers.some(a => a.scope.entityIds.includes(e.id))
                                        ).length / activeEntities.length) * 100)
                                        : 0
                                    }
                                    suffix="%"
                                    valueStyle={{
                                        color: activeEntities.length === 0 ? '#999'
                                            : activeEntities.filter(e => activeAnswers.some(a => a.scope.entityIds.includes(e.id))).length / activeEntities.length >= 0.7 ? '#52c41a' : '#faad14'
                                    }}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* Getting Started Guide (shown when empty) */}
            {!loading && activeEntities.length === 0 && activeAnswers.length === 0 && (
                <Card>
                    <Empty
                        description={
                            <Flex vertical align="center" gap={8}>
                                <Title level={5}>Welcome to Canonica</Title>
                                <Paragraph type="secondary" style={{ maxWidth: 500, textAlign: 'center' }}>
                                    Start by creating product entities (features, plans, roles), then build canonical answers
                                    bound to those entities. The governance engine will monitor for drift automatically.
                                </Paragraph>
                            </Flex>
                        }
                    />
                </Card>
            )}
        </Flex>
    );
}
