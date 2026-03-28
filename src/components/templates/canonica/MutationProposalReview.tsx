'use client'

/**
 * Canonica — Mutation Proposal Review Queue
 * 
 * Minimal admin UI for reviewing pending mutation proposals.
 * Lists proposals with approve/reject actions.
 * Feature-flagged: ENABLE_CANONICA_SIGNAL_MUTATION
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md §6
 */

import { FEATURE_FLAGS } from '@config/features';
import { useMutationProposals } from '@hook/canonica/useMutationProposals';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { CanonicaMutationProposal } from '@type/canonica';
import { Badge, Button, Card, Empty, Flex, List, Popconfirm, Space, Tag, Typography } from 'antd';
import { LuCheck, LuRefreshCw, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;

const MUTATION_TYPE_COLORS: Record<string, string> = {
    content_refinement: 'blue',
    scope_adjustment: 'orange',
    version_update: 'purple',
    new_answer_required: 'red',
};

const MUTATION_TYPE_LABELS: Record<string, string> = {
    content_refinement: 'Content Refinement',
    scope_adjustment: 'Scope Adjustment',
    version_update: 'Version Update',
    new_answer_required: 'New Answer Required',
};

function ProposalItem({
    proposal,
    onApprove,
    onReject,
}: {
    proposal: CanonicaMutationProposal;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}) {
    return (
        <List.Item
            actions={[
                <Popconfirm
                    key="approve"
                    title="Approve this proposal?"
                    description="This marks the proposal as approved for implementation."
                    onConfirm={() => onApprove(proposal.id)}
                    okText="Approve"
                    okButtonProps={{ style: { backgroundColor: '#52c41a' } }}
                >
                    <Button type="text" icon={<LuCheck />} style={{ color: '#52c41a' }}>
                        Approve
                    </Button>
                </Popconfirm>,
                <Popconfirm
                    key="reject"
                    title="Reject this proposal?"
                    description="This dismisses the proposal permanently."
                    onConfirm={() => onReject(proposal.id)}
                    okText="Reject"
                    okButtonProps={{ danger: true }}
                >
                    <Button type="text" icon={<LuX />} danger>
                        Reject
                    </Button>
                </Popconfirm>,
            ]}
        >
            <List.Item.Meta
                title={
                    <Space>
                        <Tag color={MUTATION_TYPE_COLORS[proposal.mutationType] || 'default'}>
                            {MUTATION_TYPE_LABELS[proposal.mutationType] || proposal.mutationType}
                        </Tag>
                        {proposal.targetAnswerId ? (
                            <Text type="secondary">Answer: {proposal.targetAnswerId.slice(0, 8)}...</Text>
                        ) : (
                            <Text type="warning">No existing answer</Text>
                        )}
                    </Space>
                }
                description={
                    <Flex vertical gap={4}>
                        <Text>
                            Signals: {proposal.signalSummary.ticketCount} tickets,{' '}
                            {proposal.signalSummary.chatCount} chat negative
                        </Text>
                        <Text type="secondary">
                            Confidence: {Math.round(proposal.confidenceScore * 100)}% |
                            Entity: {proposal.relatedEntityIds?.[0]?.slice(0, 12) || 'unknown'}
                        </Text>
                    </Flex>
                }
            />
        </List.Item>
    );
}

export default function MutationProposalReview() {
    const session = useClientAuthSession();
    const { proposals, loading, approve, reject, refresh } = useMutationProposals(
        session?.tId || 0,
        session?.sId || 0,
    );

    if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) {
        return (
            <Empty description="Canonica Signal Mutation is not enabled" />
        );
    }

    return (
        <Card>
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Space>
                    <Title level={5} style={{ margin: 0 }}>Mutation Proposals</Title>
                    <Badge count={proposals.length} style={{ backgroundColor: proposals.length > 0 ? '#1677ff' : '#d9d9d9' }} />
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
                dataSource={proposals}
                loading={loading}
                locale={{ emptyText: <Empty description="No pending proposals" /> }}
                renderItem={(proposal) => (
                    <ProposalItem
                        proposal={proposal}
                        onApprove={approve}
                        onReject={reject}
                    />
                )}
            />
        </Card>
    );
}
