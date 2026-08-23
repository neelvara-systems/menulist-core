'use client'

/**
 * Answerlattice — Mutation Proposal Review Queue
 * 
 * Minimal admin UI for reviewing pending mutation proposals.
 * Lists proposals with approve/reject actions.
 * Feature-flagged: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §6
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from '@constant/answerlattice/customerLanguage';
import { useMutationProposals } from '@hook/answerlattice/useMutationProposals';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { normalizeAnswerlatticePublicCitationUrl } from '@lib/answerlattice/publicAnswerContracts';
import type { AnswerlatticeGovernanceEditedContent } from '@lib/answerlattice/governanceContracts';
import type {
    AnswerlatticeProposalImpactComparison,
    AnswerlatticeProposalImpactResponse,
} from '@lib/answerlattice/proposalImpactContracts';
import { ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS, AnswerlatticeMutationProposal } from '@type/answerlattice';
import { Alert, Badge, Button, Card, Empty, Flex, Form, Grid, Input, List, Modal, Popconfirm, Space, Tag, Typography, theme } from 'antd';
import { useCallback, useState } from 'react';
import { LuCheck, LuFileCheck, LuGitCompare, LuMinus, LuPlus, LuRefreshCw, LuSparkles, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;
const { TextArea } = Input;
const ACTION_BUTTON_STYLE = { minHeight: 44 };

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
    onPreviewImpact,
    onRegenerateDraft,
    previewing,
    regenerating,
    isMobile,
}: {
    proposal: AnswerlatticeMutationProposal;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onOpenDraft: (proposal: AnswerlatticeMutationProposal) => void;
    onPreviewImpact: (proposal: AnswerlatticeMutationProposal) => void;
    onRegenerateDraft: (proposal: AnswerlatticeMutationProposal) => void;
    previewing: boolean;
    regenerating: boolean;
    isMobile?: boolean;
}) {
    const { token } = theme.useToken();
    const hasGeneratedDraft = proposal.mutationType === 'new_answer_required'
        && proposal.suggestedChange?.draftStatus === 'generated'
        && Boolean(proposal.suggestedChange?.draftTitle);
    const canGenerateDraft = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE
        && (proposal.mutationType === 'new_answer_required' || proposal.mutationType === 'content_refinement');
    const isRollbackProposal = proposal.mutationType === 'version_update'
        && Boolean(proposal.suggestedChange?.rollbackAuditLogId);
    const appliesAnswerChange = isRollbackProposal
        || Boolean(proposal.suggestedChange?.proposedContent)
        || Boolean(proposal.suggestedChange?.proposedScope)
        || Boolean(proposal.suggestedChange?.proposedProductBinding)
        || Boolean(proposal.suggestedChange?.proposedStatus)
        || Boolean(proposal.suggestedChange?.proposedAnswerType)
        || Boolean(proposal.suggestedChange?.proposedEvidence);
    const canApprove = hasGeneratedDraft || appliesAnswerChange;
    const actions = hasGeneratedDraft
        ? [
            ...(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS ? [
                <Button
                    key="impact"
                    icon={<LuGitCompare />}
                    onClick={() => onPreviewImpact(proposal)}
                    loading={previewing}
                    style={ACTION_BUTTON_STYLE}
                >
                    Check impact
                </Button>,
            ] : []),
            <Button key="publish" type="primary" icon={<LuFileCheck />} onClick={() => onOpenDraft(proposal)} style={ACTION_BUTTON_STYLE}>
                Publish answer
            </Button>,
            <Popconfirm
                key="regenerate"
                title="Regenerate this draft?"
                description="This uses one AI request and replaces the current draft on this proposal."
                onConfirm={() => onRegenerateDraft(proposal)}
                okText="Regenerate"
            >
                <Button type="text" icon={<LuSparkles />} loading={regenerating} style={ACTION_BUTTON_STYLE}>
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
                <Button type="text" icon={<LuX />} danger style={ACTION_BUTTON_STYLE}>
                    Reject
                </Button>
            </Popconfirm>,
        ]
        : [
            ...(canGenerateDraft ? [
                <Popconfirm
                    key="generate"
                    title="Prepare a trusted-answer draft?"
                    description="This uses one AI request and keeps the draft in review until you publish it."
                    onConfirm={() => onRegenerateDraft(proposal)}
                    okText="Generate"
                >
                    <Button type="primary" ghost icon={<LuSparkles />} loading={regenerating} style={ACTION_BUTTON_STYLE}>
                        Generate draft
                    </Button>
                </Popconfirm>,
            ] : []),
            ...(canApprove && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS ? [
                <Button
                    key="impact"
                    icon={<LuGitCompare />}
                    onClick={() => onPreviewImpact(proposal)}
                    loading={previewing}
                    style={ACTION_BUTTON_STYLE}
                >
                    Check impact
                </Button>,
            ] : []),
            ...(canApprove ? [<Popconfirm
                key="approve"
                title={appliesAnswerChange ? 'Approve and apply this proposal?' : 'Approve this proposal?'}
                description={appliesAnswerChange
                    ? 'The answer change and audit record are committed together through Governance.'
                    : 'This marks the proposal as approved for implementation.'}
                onConfirm={() => onApprove(proposal.id)}
                okText="Approve"
                okButtonProps={{ style: { backgroundColor: token.colorSuccess } }}
            >
                <Button type="text" icon={<LuCheck />} style={{ ...ACTION_BUTTON_STYLE, color: token.colorSuccess }}>
                    {appliesAnswerChange ? 'Approve and apply' : 'Approve'}
                </Button>
            </Popconfirm>] : []),
            <Popconfirm
                key="reject"
                title="Reject this proposal?"
                description="This dismisses the proposal permanently."
                onConfirm={() => onReject(proposal.id)}
                okText="Reject"
                okButtonProps={{ danger: true }}
            >
                <Button type="text" icon={<LuX />} danger style={ACTION_BUTTON_STYLE}>
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
                            Evidence: {proposal.signalSummary.ticketCount} tickets,{' '}
                            {proposal.signalSummary.chatCount} negative chat signals,{' '}
                            {proposal.signalSummary.escalationCount || 0} escalations
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
                        {proposal.suggestedChange?.proposedContent && (
                            <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: 12, background: token.colorFillTertiary }}>
                                <Flex vertical gap={6}>
                                    <Text strong>{proposal.suggestedChange.draftTitle || 'Proposed answer refinement'}</Text>
                                    <Text>{proposal.suggestedChange.proposedContent.structuredSummary}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Review this complete replacement before approving it. The current answer remains live until approval.
                                    </Text>
                                </Flex>
                            </div>
                        )}
                        {!canApprove && proposal.suggestedChange?.reviewReason && (
                            <Text type="secondary">{proposal.suggestedChange.reviewReason}</Text>
                        )}
                        {isRollbackProposal && (
                            <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: 12, background: token.colorFillTertiary }}>
                                <Flex vertical gap={6}>
                                    <Text strong>Prior approved answer proposed for restoration</Text>
                                    <Text>{proposal.suggestedChange.structuredSummary}</Text>
                                    {proposal.suggestedChange.reviewReason && (
                                        <Text type="secondary">Reason: {proposal.suggestedChange.reviewReason}</Text>
                                    )}
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Approval restores this version through the governed answer transaction and records the decision.
                                    </Text>
                                </Flex>
                            </div>
                        )}
                        <Text type="secondary">
                            {proposal.suggestedChange?.draftSource === 'ticket_resolution' && (
                                <>Extractor score: {Math.round(proposal.confidenceScore * 100)}% | </>
                            )}
                            {proposal.relatedEntityIds?.length || 0} linked product {(proposal.relatedEntityIds?.length || 0) === 1 ? 'topic' : 'topics'}
                        </Text>
                        {proposal.suggestedChange?.sourceTicketCount !== undefined && (
                            <Text type="secondary">
                                Tracked ticket evidence: {proposal.suggestedChange.sourceTicketCount} resolved ticket{proposal.suggestedChange.sourceTicketCount === 1 ? '' : 's'}
                            </Text>
                        )}
                        {proposal.suggestedChange?.proposedEvidence && (
                            <Text type="secondary">
                                Evidence: {proposal.suggestedChange.proposedEvidence.sourceIds.length} internal source{proposal.suggestedChange.proposedEvidence.sourceIds.length === 1 ? '' : 's'} |
                                {' '}{proposal.suggestedChange.proposedEvidence.citations.length} public source{proposal.suggestedChange.proposedEvidence.citations.length === 1 ? '' : 's'}
                            </Text>
                        )}
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

const IMPACT_CLASSIFICATION_LABELS: Record<AnswerlatticeProposalImpactComparison['classification'], string> = {
    regression: 'Regression',
    improvement: 'Improvement',
    changed: 'Changed',
    unchanged: 'Unchanged',
};

const IMPACT_CLASSIFICATION_COLORS: Record<AnswerlatticeProposalImpactComparison['classification'], string> = {
    regression: 'error',
    improvement: 'success',
    changed: 'warning',
    unchanged: 'default',
};

function ImpactResultPanel({
    comparison,
    isMobile,
}: {
    comparison: AnswerlatticeProposalImpactComparison;
    isMobile: boolean;
}) {
    const { token } = theme.useToken();
    const renderOutcome = (
        label: string,
        result: AnswerlatticeProposalImpactComparison['current'],
    ) => (
        <div style={{
            flex: 1,
            minWidth: 0,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            padding: 12,
            background: token.colorFillQuaternary,
        }}>
            <Flex vertical gap={6}>
                <Text strong>{label}</Text>
                <Space size={[6, 6]} wrap>
                    <Tag color={result.passed ? 'success' : 'error'}>
                        {result.passed ? 'Pass' : 'Needs review'}
                    </Tag>
                    <Tag>{result.source.replace('_', ' ')}</Tag>
                    {result.confidence && <Tag>{result.confidence} confidence</Tag>}
                </Space>
                <Text style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    {result.answerPreview || 'No deterministic answer returned.'}
                </Text>
                {result.failures.length > 0 && (
                    <Flex vertical gap={4}>
                        {result.failures.map((failure, index) => (
                            <Text key={`${comparison.caseId}-${label}-${index}`} type="danger" style={{ fontSize: 12 }}>
                                {failure}
                            </Text>
                        ))}
                    </Flex>
                )}
            </Flex>
        </div>
    );

    return (
        <div style={{
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            paddingBlock: 16,
        }}>
            <Flex vertical gap={10}>
                <Flex justify="space-between" align="flex-start" gap={8} wrap>
                    <div style={{ minWidth: 0 }}>
                        <Text strong>{comparison.title}</Text>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {comparison.riskLevel === 'critical' ? 'Critical test' : 'Standard test'}
                            </Text>
                        </div>
                    </div>
                    <Tag color={IMPACT_CLASSIFICATION_COLORS[comparison.classification]}>
                        {IMPACT_CLASSIFICATION_LABELS[comparison.classification]}
                    </Tag>
                </Flex>
                <Flex gap={10} vertical={isMobile}>
                    {renderOutcome('Current', comparison.current)}
                    {renderOutcome('Proposed', comparison.proposed)}
                </Flex>
            </Flex>
        </div>
    );
}

export default function MutationProposalReview() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const {
        proposals,
        loading,
        approve,
        reject,
        approveDraft,
        regenerateDraft,
        previewImpact,
        refresh,
    } = useMutationProposals(
        session?.tId || 0,
        session?.sId || 0,
    );
    const [draftForm] = Form.useForm();
    const [draftProposal, setDraftProposal] = useState<AnswerlatticeMutationProposal | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const [impactResult, setImpactResult] = useState<AnswerlatticeProposalImpactResponse | null>(null);

    const openDraftModal = useCallback((proposal: AnswerlatticeMutationProposal) => {
        setDraftProposal(proposal);
        draftForm.setFieldsValue({
            title: proposal.suggestedChange?.draftTitle || '',
            structuredSummary: proposal.suggestedChange?.structuredSummary || '',
            detailedExplanation: proposal.suggestedChange?.detailedExplanation || '',
            edgeCases: proposal.suggestedChange?.edgeCases || '',
            constraints: proposal.suggestedChange?.constraints || '',
            citations: (proposal.suggestedChange?.proposedEvidence?.citations || []).map(citation => ({
                title: citation.title,
                url: citation.url,
            })),
        });
    }, [draftForm]);

    const closeDraftModal = useCallback(() => {
        setDraftProposal(null);
        draftForm.resetFields();
    }, [draftForm]);

    const publishDraft = useCallback(async () => {
        if (!draftProposal) return;
        let values: AnswerlatticeGovernanceEditedContent;
        try {
            values = await draftForm.validateFields();
        } catch {
            return;
        }
        const approvedBy = String(session?.user?.email || session?.uId || 'answerlattice_owner');

        setPublishing(true);
        try {
            await approveDraft(draftProposal.id, values, approvedBy);
            closeDraftModal();
        } finally {
            setPublishing(false);
        }
    }, [approveDraft, closeDraftModal, draftForm, draftProposal, session?.uId, session?.user?.email]);

    const handleRegenerateDraft = useCallback(async (proposal: AnswerlatticeMutationProposal) => {
        setRegeneratingId(proposal.id);
        try {
            await regenerateDraft(proposal.id);
        } finally {
            setRegeneratingId(null);
        }
    }, [regenerateDraft]);

    const handlePreviewImpact = useCallback(async (
        proposal: AnswerlatticeMutationProposal,
        editedContent?: AnswerlatticeGovernanceEditedContent,
    ) => {
        setPreviewingId(proposal.id);
        try {
            const result = await previewImpact(proposal.id, editedContent);
            setImpactResult(result);
        } catch {
            setImpactResult(null);
        } finally {
            setPreviewingId(null);
        }
    }, [previewImpact]);

    const previewEditedDraft = useCallback(async () => {
        if (!draftProposal) return;
        let values: AnswerlatticeGovernanceEditedContent;
        try {
            values = await draftForm.validateFields();
        } catch {
            return;
        }
        await handlePreviewImpact(draftProposal, values);
    }, [draftForm, draftProposal, handlePreviewImpact]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
        return (
            <Empty description="Answerlattice Signal Mutation is not enabled" />
        );
    }

    return (
        <Card>
            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} gap={12} vertical={isMobile} style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Title level={5} style={{ margin: 0 }}>{ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.suggestedUpdates}</Title>
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
                description="Answerlattice can prepare a draft from tickets, conversations, and feedback, but an owner approves the final trusted answer."
            />

            <List
                dataSource={proposals}
                loading={loading}
                locale={{ emptyText: <Empty description="No answer updates need review. Repeated gaps from resolved tickets, conversations, and feedback will appear here." /> }}
                renderItem={(proposal) => (
                    <ProposalItem
                        proposal={proposal}
                        onApprove={approve}
                        onReject={reject}
                        onOpenDraft={openDraftModal}
                        onPreviewImpact={handlePreviewImpact}
                        onRegenerateDraft={handleRegenerateDraft}
                        previewing={previewingId === proposal.id}
                        regenerating={regeneratingId === proposal.id}
                        isMobile={isMobile}
                    />
                )}
            />
            <Modal
                title="Publish Trusted Answer"
                open={Boolean(draftProposal)}
                onCancel={closeDraftModal}
                destroyOnClose
                styles={{
                    body: {
                        maxHeight: isMobile ? 'calc(100dvh - 168px)' : 'calc(100vh - 220px)',
                        overflowY: 'auto',
                    },
                }}
                footer={[
                    <Button key="cancel" onClick={closeDraftModal} style={ACTION_BUTTON_STYLE}>
                        Cancel
                    </Button>,
                    ...(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS ? [
                        <Button
                            key="impact"
                            icon={<LuGitCompare />}
                            onClick={previewEditedDraft}
                            loading={Boolean(draftProposal && previewingId === draftProposal.id)}
                            style={ACTION_BUTTON_STYLE}
                        >
                            Check impact
                        </Button>,
                    ] : []),
                    <Button
                        key="publish"
                        type="primary"
                        icon={<LuFileCheck />}
                        onClick={publishDraft}
                        loading={publishing}
                        style={ACTION_BUTTON_STYLE}
                    >
                        Publish answer
                    </Button>,
                ]}
            >
                <Form form={draftForm} layout="vertical">
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: 'Title is required' }]}
                    >
                        <Input maxLength={180} />
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
                        <TextArea rows={6} maxLength={24_000} showCount />
                    </Form.Item>
                    <Form.Item name="edgeCases" label="Edge Cases">
                        <TextArea rows={2} maxLength={8_000} />
                    </Form.Item>
                    <Form.Item name="constraints" label="Constraints">
                        <TextArea rows={2} maxLength={8_000} />
                    </Form.Item>
                    <Form.List
                        name="citations"
                        rules={[{
                            validator: async (_, citations) => {
                                if ((citations || []).length > ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS) {
                                    throw new Error(`Use at most ${ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS} public sources`);
                                }
                            },
                        }]}
                    >
                        {(fields, { add, remove }, { errors }) => (
                            <Flex vertical gap={10}>
                                <Text strong>Approved Public Sources</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Internal evidence remains private. Only these reviewed links can appear with the answer.
                                </Text>
                                {fields.map(field => (
                                    <Flex key={field.key} gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'start'}>
                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'title']}
                                            label="Source title"
                                            style={{ flex: 1, marginBottom: 0 }}
                                            rules={[{
                                                required: true,
                                                max: ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_TITLE_LENGTH,
                                            }]}
                                        >
                                            <Input placeholder="Product documentation" />
                                        </Form.Item>
                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'url']}
                                            label="Public URL"
                                            style={{ flex: 1.4, marginBottom: 0 }}
                                            rules={[
                                                { required: true },
                                                {
                                                    validator: (_, value) => normalizeAnswerlatticePublicCitationUrl(value)
                                                        ? Promise.resolve()
                                                        : Promise.reject(new Error('Use a public HTTP or HTTPS URL without credentials')),
                                                },
                                            ]}
                                        >
                                            <Input placeholder="https://docs.example.com/article" />
                                        </Form.Item>
                                        <Button
                                            type="text"
                                            danger
                                            icon={<LuMinus />}
                                            onClick={() => remove(field.name)}
                                            aria-label="Remove public source"
                                            style={{ ...ACTION_BUTTON_STYLE, marginTop: isMobile ? 0 : 30 }}
                                        />
                                    </Flex>
                                ))}
                                <Button
                                    type="dashed"
                                    icon={<LuPlus />}
                                    onClick={() => add({ title: '', url: '' })}
                                    disabled={fields.length >= ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS}
                                    block
                                    style={ACTION_BUTTON_STYLE}
                                >
                                    Add public source
                                </Button>
                                <Form.ErrorList errors={errors} />
                            </Flex>
                        )}
                    </Form.List>
                </Form>
            </Modal>
            <Modal
                title="Proposed Answer Impact"
                open={Boolean(impactResult)}
                onCancel={() => setImpactResult(null)}
                width={isMobile ? 'calc(100vw - 24px)' : 920}
                styles={{
                    body: {
                        maxHeight: isMobile ? '70dvh' : '72vh',
                        overflowY: 'auto',
                    },
                }}
                destroyOnClose
                footer={[
                    <Button key="close" onClick={() => setImpactResult(null)} style={ACTION_BUTTON_STYLE}>
                        Close
                    </Button>,
                ]}
            >
                {impactResult && (
                    <Flex vertical gap={16}>
                        <Alert
                            showIcon
                            type={impactResult.proposedProofStatus === 'blocked'
                                ? 'error'
                                : impactResult.proposedProofStatus === 'review'
                                    ? 'warning'
                                    : impactResult.proposedProofStatus === 'ready'
                                        ? 'success'
                                        : 'warning'}
                            message={impactResult.proposedProofStatus
                                ? `Projected proof for checked tests: ${impactResult.proposedProofStatus}`
                                : 'No linked proof is available'}
                            description={impactResult.proposedProofStatus
                                ? 'This is advisory evidence. Publishing still uses the normal governance approval checks.'
                                : 'Add an active Answer Test linked to this answer or one of its Product Topics before relying on the change.'}
                        />
                        <div style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: token.borderRadius,
                            padding: 12,
                        }}>
                            <Flex vertical gap={6}>
                                <Text strong>{impactResult.candidate.title}</Text>
                                <Text>{impactResult.candidate.structuredSummary}</Text>
                                <Space size={[6, 6]} wrap>
                                    <Tag>{impactResult.candidate.status}</Tag>
                                    <Tag>{impactResult.candidate.answerType}</Tag>
                                    <Tag>{impactResult.evaluatedTestCount} checked</Tag>
                                    <Tag color={impactResult.regressionCount > 0 ? 'error' : 'default'}>
                                        {impactResult.regressionCount} regressions
                                    </Tag>
                                    <Tag color={impactResult.improvementCount > 0 ? 'success' : 'default'}>
                                        {impactResult.improvementCount} improvements
                                    </Tag>
                                    <Tag color={impactResult.changedCount > 0 ? 'warning' : 'default'}>
                                        {impactResult.changedCount} changed
                                    </Tag>
                                </Space>
                            </Flex>
                        </div>
                        {impactResult.warnings.map((warning, index) => (
                            <Alert key={`${impactResult.proposalId}-warning-${index}`} type="info" showIcon message={warning} />
                        ))}
                        {impactResult.comparisons.length > 0 ? (
                            <div>
                                {impactResult.comparisons.map(comparison => (
                                    <ImpactResultPanel
                                        key={comparison.caseId}
                                        comparison={comparison}
                                        isMobile={isMobile}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Empty description="No linked active Answer Tests to compare" />
                        )}
                    </Flex>
                )}
            </Modal>
        </Card>
    );
}
