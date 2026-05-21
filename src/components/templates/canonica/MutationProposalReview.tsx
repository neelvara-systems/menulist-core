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
import { Badge, Button, Card, Empty, Flex, Form, Input, List, Modal, Popconfirm, Space, Tag, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { LuCheck, LuFileCheck, LuRefreshCw, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;
const { TextArea } = Input;

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
    onOpenDraft,
}: {
    proposal: CanonicaMutationProposal;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onOpenDraft: (proposal: CanonicaMutationProposal) => void;
}) {
    const hasGeneratedDraft = proposal.mutationType === 'new_answer_required'
        && proposal.suggestedChange?.draftStatus === 'generated'
        && Boolean(proposal.suggestedChange?.draftTitle);
    const actions = hasGeneratedDraft
        ? [
            <Button key="publish" type="primary" icon={<LuFileCheck />} onClick={() => onOpenDraft(proposal)}>
                Publish answer
            </Button>,
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
        ]
        : [
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
        ];

    return (
        <List.Item actions={actions}>
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
                        {hasGeneratedDraft && (
                            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                                <Flex vertical gap={4}>
                                    <Text strong>{proposal.suggestedChange.draftTitle}</Text>
                                    <Text type="secondary">{proposal.suggestedChange.structuredSummary}</Text>
                                    <Tag color="processing" style={{ width: 'fit-content' }}>
                                        Draft from {proposal.suggestedChange.draftSource || 'signal'}
                                    </Tag>
                                </Flex>
                            </div>
                        )}
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
    const { proposals, loading, approve, reject, approveDraft, refresh } = useMutationProposals(
        session?.tId || 0,
        session?.sId || 0,
    );
    const [draftForm] = Form.useForm();
    const [draftProposal, setDraftProposal] = useState<CanonicaMutationProposal | null>(null);
    const [publishing, setPublishing] = useState(false);

    const openDraftModal = useCallback((proposal: CanonicaMutationProposal) => {
        setDraftProposal(proposal);
        draftForm.setFieldsValue({
            title: proposal.suggestedChange?.draftTitle || '',
            structuredSummary: proposal.suggestedChange?.structuredSummary || '',
            detailedExplanation: proposal.suggestedChange?.detailedExplanation || '',
            edgeCases: proposal.suggestedChange?.edgeCases || '',
            constraints: proposal.suggestedChange?.constraints || '',
        });
    }, [draftForm]);

    const closeDraftModal = useCallback(() => {
        setDraftProposal(null);
        draftForm.resetFields();
    }, [draftForm]);

    const publishDraft = useCallback(async () => {
        if (!draftProposal) return;
        const values = await draftForm.validateFields();
        const approvedBy = String(session?.user?.email || session?.uId || 'canonica_owner');

        setPublishing(true);
        try {
            await approveDraft(draftProposal.id, values, approvedBy);
            closeDraftModal();
        } finally {
            setPublishing(false);
        }
    }, [approveDraft, closeDraftModal, draftForm, draftProposal, session?.uId, session?.user?.email]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) {
        return (
            <Empty description="Canonica Signal Mutation is not enabled" />
        );
    }

    return (
        <Card>
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Space>
                    <Title level={5} style={{ margin: 0 }}>Signal-to-Knowledge Queue</Title>
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
                locale={{ emptyText: <Empty description="No pending signal proposals" /> }}
                renderItem={(proposal) => (
                    <ProposalItem
                        proposal={proposal}
                        onApprove={approve}
                        onReject={reject}
                        onOpenDraft={openDraftModal}
                    />
                )}
            />
            <Modal
                title="Publish Canonical Answer"
                open={Boolean(draftProposal)}
                okText="Publish answer"
                confirmLoading={publishing}
                onOk={publishDraft}
                onCancel={closeDraftModal}
                destroyOnClose
            >
                <Form form={draftForm} layout="vertical">
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: 'Title is required' }]}
                    >
                        <Input maxLength={200} />
                    </Form.Item>
                    <Form.Item
                        name="structuredSummary"
                        label="Structured Summary"
                        rules={[{ required: true, message: 'Summary is required' }]}
                    >
                        <TextArea rows={3} maxLength={500} showCount />
                    </Form.Item>
                    <Form.Item
                        name="detailedExplanation"
                        label="Detailed Explanation"
                        rules={[{ required: true, message: 'Explanation is required' }]}
                    >
                        <TextArea rows={6} />
                    </Form.Item>
                    <Form.Item name="edgeCases" label="Edge Cases">
                        <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="constraints" label="Constraints">
                        <TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
}
