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
import { Alert, Badge, Button, Card, Empty, Flex, Form, Grid, Input, List, Modal, Popconfirm, Space, Tag, Typography, theme } from 'antd';
import { useCallback, useState } from 'react';
import { LuCheck, LuFileCheck, LuRefreshCw, LuSparkles, LuX } from 'react-icons/lu';

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
    onRegenerateDraft,
    regenerating,
    isMobile,
}: {
    proposal: CanonicaMutationProposal;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onOpenDraft: (proposal: CanonicaMutationProposal) => void;
    onRegenerateDraft: (proposal: CanonicaMutationProposal) => void;
    regenerating: boolean;
    isMobile?: boolean;
}) {
    const { token } = theme.useToken();
    const hasGeneratedDraft = proposal.mutationType === 'new_answer_required'
        && proposal.suggestedChange?.draftStatus === 'generated'
        && Boolean(proposal.suggestedChange?.draftTitle);
    const canGenerateDraft = FEATURE_FLAGS.ENABLE_CANONICA_AUTO_KNOWLEDGE
        && proposal.mutationType === 'new_answer_required';
    const actions = hasGeneratedDraft
        ? [
            <Button key="publish" type="primary" icon={<LuFileCheck />} onClick={() => onOpenDraft(proposal)}>
                Publish answer
            </Button>,
            <Popconfirm
                key="regenerate"
                title="Regenerate this draft?"
                description="This uses one AI request and replaces the current draft on this proposal."
                onConfirm={() => onRegenerateDraft(proposal)}
                okText="Regenerate"
            >
                <Button type="text" icon={<LuSparkles />} loading={regenerating}>
                    Regenerate
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
        ]
        : [
            ...(canGenerateDraft ? [
                <Popconfirm
                    key="generate"
                    title="Generate a canonical answer draft?"
                    description="This uses one AI request and keeps the draft in review until you publish it."
                    onConfirm={() => onRegenerateDraft(proposal)}
                    okText="Generate"
                >
                    <Button type="primary" ghost icon={<LuSparkles />} loading={regenerating}>
                        Generate draft
                    </Button>
                </Popconfirm>,
            ] : []),
            <Popconfirm
                key="approve"
                title="Approve this proposal?"
                description="This marks the proposal as approved for implementation."
                onConfirm={() => onApprove(proposal.id)}
                okText="Approve"
                okButtonProps={{ style: { backgroundColor: token.colorSuccess } }}
            >
                <Button type="text" icon={<LuCheck />} style={{ color: token.colorSuccess }}>
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
        <List.Item actions={isMobile ? undefined : actions}>
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
                            <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: 12, background: token.colorFillTertiary }}>
                                <Flex vertical gap={8}>
                                    <Text strong>{proposal.suggestedChange.draftTitle}</Text>
                                    <Text type="secondary">{proposal.suggestedChange.structuredSummary}</Text>
                                    <Space size={[6, 6]} wrap>
                                        <Tag color="processing" style={{ width: 'fit-content' }}>
                                            Draft from {proposal.suggestedChange.draftSource || 'signal'}
                                        </Tag>
                                        {proposal.suggestedChange.draftPromptVersion && (
                                            <Tag color="default">Prompt {proposal.suggestedChange.draftPromptVersion}</Tag>
                                        )}
                                    </Space>
                                    {proposal.suggestedChange.draftEntityContext && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Entity context: {proposal.suggestedChange.draftEntityContext}
                                        </Text>
                                    )}
                                    {Array.isArray(proposal.suggestedChange.draftSignalExamples) && proposal.suggestedChange.draftSignalExamples.length > 0 && (
                                        <Flex vertical gap={4}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Signal examples</Text>
                                            {proposal.suggestedChange.draftSignalExamples.slice(0, 3).map((example, index) => (
                                                <Text key={`${proposal.id}-signal-${index}`} style={{ fontSize: 12 }}>
                                                    {index + 1}. {example}
                                                </Text>
                                            ))}
                                        </Flex>
                                    )}
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
            {isMobile && (
                <Flex vertical gap={8} style={{ width: '100%', marginTop: 12 }}>
                    {actions}
                </Flex>
            )}
        </List.Item>
    );
}

export default function MutationProposalReview() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const { proposals, loading, approve, reject, approveDraft, regenerateDraft, refresh } = useMutationProposals(
        session?.tId || 0,
        session?.sId || 0,
    );
    const [draftForm] = Form.useForm();
    const [draftProposal, setDraftProposal] = useState<CanonicaMutationProposal | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

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

    const handleRegenerateDraft = useCallback(async (proposal: CanonicaMutationProposal) => {
        const regeneratedBy = String(session?.user?.email || session?.uId || 'canonica_owner');
        setRegeneratingId(proposal.id);
        try {
            await regenerateDraft(proposal.id, regeneratedBy);
        } finally {
            setRegeneratingId(null);
        }
    }, [regenerateDraft, session?.uId, session?.user?.email]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) {
        return (
            <Empty description="Canonica Signal Mutation is not enabled" />
        );
    }

    return (
        <Card>
            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} gap={12} vertical={isMobile} style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Title level={5} style={{ margin: 0 }}>Signal-to-Knowledge Queue</Title>
                    <Badge count={proposals.length} style={{ backgroundColor: proposals.length > 0 ? token.colorPrimary : token.colorFill }} />
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
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Review repeated support gaps before they become answers"
                description="Canonica can draft from ticket and chat signals, but owners approve the final canonical answer."
            />

            <List
                dataSource={proposals}
                loading={loading}
                locale={{ emptyText: <Empty description="No pending signal proposals. Resolve tickets and collect customer feedback; repeated gaps will appear here for review." /> }}
                renderItem={(proposal) => (
                    <ProposalItem
                        proposal={proposal}
                        onApprove={approve}
                        onReject={reject}
                        onOpenDraft={openDraftModal}
                        onRegenerateDraft={handleRegenerateDraft}
                        regenerating={regeneratingId === proposal.id}
                        isMobile={isMobile}
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
