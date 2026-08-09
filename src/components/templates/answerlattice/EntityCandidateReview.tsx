'use client'

/**
 * Answerlattice — Entity Candidate Review Queue
 * 
 * Admin UI for reviewing AI-extracted entity candidates.
 * Candidates can be rejected, promoted to real entities, or marked as merged.
 * Feature-flagged: ENABLE_ANSWERLATTICE_ONTOLOGY
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §7
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from '@constant/answerlattice/customerLanguage';
import { useEntityCandidates } from '@hook/answerlattice/useEntityCandidates';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { AnswerlatticeEntityCandidate } from '@type/answerlattice';
import { Badge, Button, Card, Empty, Flex, List, Popconfirm, Space, Tag, Typography, theme } from 'antd';
import { LuGitMerge, LuRefreshCw, LuRocket, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;

const ENTITY_TYPE_COLORS: Record<string, string> = {
    feature: 'blue',
    plan: 'green',
    role: 'orange',
    workflow: 'purple',
    state: 'cyan',
    integration: 'magenta',
    error: 'red',
};

function CandidateItem({
    candidate,
    onReject,
    onPromote,
    onMerge,
}: {
    candidate: AnswerlatticeEntityCandidate;
    onReject: (id: string) => void;
    onPromote: (id: string) => void;
    onMerge: (id: string) => void;
}) {
    const { token } = theme.useToken();

    return (
        <List.Item
            actions={[
                <Popconfirm
                    key="promote"
                    title="Accept as a product topic?"
                    description="Adds this reviewed topic to the product model and search."
                    onConfirm={() => onPromote(candidate.id)}
                    okText="Promote"
                    okButtonProps={{ style: { backgroundColor: token.colorPrimary } }}
                >
                    <Button type="text" icon={<LuRocket />} style={{ color: token.colorPrimary }}>
                        Promote
                    </Button>
                </Popconfirm>,
                <Popconfirm
                    key="reject"
                    title="Reject this candidate?"
                    onConfirm={() => onReject(candidate.id)}
                    okText="Reject"
                    okButtonProps={{ danger: true }}
                >
                    <Button type="text" icon={<LuX />} danger size="small">
                        Reject
                    </Button>
                </Popconfirm>,
                <Popconfirm
                    key="merge"
                    title="Mark as merged?"
                    description="Use when this suggestion duplicates an existing product topic."
                    onConfirm={() => onMerge(candidate.id)}
                    okText="Merge"
                >
                    <Button type="text" icon={<LuGitMerge />} size="small">
                        Merge
                    </Button>
                </Popconfirm>,
            ]}
        >
            <List.Item.Meta
                title={
                    <Space>
                        <Text strong>{candidate.name}</Text>
                        <Tag color={ENTITY_TYPE_COLORS[candidate.type] || 'default'}>
                            {candidate.type}
                        </Tag>
                    </Space>
                }
                description={
                    <Flex vertical gap={4}>
                        <Text type="secondary">{candidate.description}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Confidence: {Math.round(candidate.confidence * 100)}% |
                            Articles: {candidate.frequency?.articles || 0} |
                            Tickets: {candidate.frequency?.tickets || 0} |
                            Chat: {candidate.frequency?.chat || 0}
                        </Text>
                    </Flex>
                }
            />
        </List.Item>
    );
}

export default function EntityCandidateReview() {
    const session = useClientAuthSession();
    const { token } = theme.useToken();
    const { candidates, loading, reject, promote, merge, refresh } = useEntityCandidates(
        session?.tId || 0,
        session?.sId || 0,
    );

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY) {
        return null;
    }

    return (
        <Card style={{ marginTop: 24 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Space>
                    <Title level={5} style={{ margin: 0 }}>{ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.suggestedTopics}</Title>
                    <Badge count={candidates.length} style={{ backgroundColor: candidates.length > 0 ? token.colorPrimary : token.colorFill }} />
                </Space>
                <Button
                    icon={<LuRefreshCw />}
                    onClick={refresh}
                    loading={loading}
                    type="text"
                >
                    Refresh
                </Button>
            </Flex>

            <List
                dataSource={candidates}
                loading={loading}
                locale={{
                    emptyText: (
                        <Empty description="No suggested product topics need review">
                            <Text type="secondary">
                                Suggestions appear when product knowledge or support evidence mentions a new feature, plan, role, workflow, state, integration, or error.
                            </Text>
                        </Empty>
                    ),
                }}
                renderItem={(candidate) => (
                    <CandidateItem
                        candidate={candidate}
                        onReject={reject}
                        onPromote={promote}
                        onMerge={merge}
                    />
                )}
            />
        </Card>
    );
}
