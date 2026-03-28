'use client'

/**
 * Canonica — Entity Candidate Review Queue
 * 
 * Admin UI for reviewing AI-extracted entity candidates.
 * Candidates can be approved, rejected, promoted to real entities, or merged.
 * Feature-flagged: ENABLE_CANONICA_ONTOLOGY
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md §7
 */

import { FEATURE_FLAGS } from '@config/features';
import { useEntityCandidates } from '@hook/canonica/useEntityCandidates';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { CanonicaEntityCandidate } from '@type/canonica';
import { Badge, Button, Card, Empty, Flex, List, Popconfirm, Space, Tag, Typography } from 'antd';
import { LuCheck, LuGitMerge, LuRefreshCw, LuRocket, LuX } from 'react-icons/lu';

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
    onApprove,
    onReject,
    onPromote,
    onMerge,
}: {
    candidate: CanonicaEntityCandidate;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onPromote: (id: string) => void;
    onMerge: (id: string) => void;
}) {
    return (
        <List.Item
            actions={[
                <Popconfirm
                    key="promote"
                    title="Promote to entity?"
                    description="Creates a real entity + search index entry from this candidate."
                    onConfirm={() => onPromote(candidate.id)}
                    okText="Promote"
                    okButtonProps={{ style: { backgroundColor: '#1677ff' } }}
                >
                    <Button type="text" icon={<LuRocket />} style={{ color: '#1677ff' }}>
                        Promote
                    </Button>
                </Popconfirm>,
                <Popconfirm
                    key="approve"
                    title="Approve this candidate?"
                    onConfirm={() => onApprove(candidate.id)}
                    okText="Approve"
                    okButtonProps={{ style: { backgroundColor: '#52c41a' } }}
                >
                    <Button type="text" icon={<LuCheck />} style={{ color: '#52c41a' }} size="small">
                        Approve
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
                    description="Use when this candidate is a duplicate of an existing entity."
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
    const { candidates, loading, approve, reject, promote, merge, refresh } = useEntityCandidates(
        session?.tId || 0,
        session?.sId || 0,
    );

    if (!FEATURE_FLAGS.ENABLE_CANONICA_ONTOLOGY) {
        return null;
    }

    return (
        <Card style={{ marginTop: 24 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Space>
                    <Title level={5} style={{ margin: 0 }}>Entity Candidates</Title>
                    <Badge count={candidates.length} style={{ backgroundColor: candidates.length > 0 ? '#1677ff' : '#d9d9d9' }} />
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
                locale={{ emptyText: <Empty description="No pending entity candidates" /> }}
                renderItem={(candidate) => (
                    <CandidateItem
                        candidate={candidate}
                        onApprove={approve}
                        onReject={reject}
                        onPromote={promote}
                        onMerge={merge}
                    />
                )}
            />
        </Card>
    );
}
