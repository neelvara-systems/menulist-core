'use client';

import {
    ANSWERLATTICE_GOVERNANCE_TABS,
    ANSWERLATTICE_ROUTES,
    getAnswerlatticeGovernanceRoute,
} from '@constant/answerlattice/navigations';
import {
    getAnswerlatticeAnswerContextRoute,
    getAnswerlatticeEntityContextRoute,
} from '@lib/answerlattice/ownerDecisionNavigation';
import type { AnswerlatticeAnswerTrace } from '@lib/answerlattice/answerTraceContracts';
import { Alert, Button, Divider, Drawer, Flex, Space, Tag, theme, Typography } from 'antd';
import { LuBookOpen, LuExternalLink, LuGitBranch, LuLayoutList, LuRouter } from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const KNOWLEDGE_MAP_ROUTE = getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.MAP);
const CANONICAL_ANSWERS_ROUTE = getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS);

const REVIEW_SIGNAL_LABELS: Record<AnswerlatticeAnswerTrace['reviewSignals'][number], string> = {
    canonical_miss: 'Approved answer missed',
    fallback_used: 'Fallback used',
    low_confidence: 'Low confidence',
    negative_feedback: 'Negative feedback',
    not_resolved: 'Not resolved',
    escalated: 'Escalated',
    drifted_answer: 'Drift evidence',
    no_answer: 'No answer',
};

const formatFallbackReason = (value: string) => (
    value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
);

interface AnswerTraceDrawerProps {
    governanceActions?: boolean;
    onClose: () => void;
    open: boolean;
    trace: AnswerlatticeAnswerTrace | null;
}

export default function AnswerTraceDrawer({
    governanceActions = true,
    onClose,
    open,
    trace,
}: AnswerTraceDrawerProps) {
    const { token } = theme.useToken();

    return (
        <Drawer
            destroyOnHidden
            onClose={onClose}
            open={open && Boolean(trace)}
            title={(
                <Space>
                    <LuRouter />
                    Answer Trace
                </Space>
            )}
            width="min(620px, 100vw)"
            styles={{ body: { paddingBottom: 32 } }}
        >
            {trace ? (
                <Flex vertical gap={16}>
                    <Alert
                        showIcon
                        type="info"
                        message="Routing evidence, not a correctness guarantee"
                        description="This retained trace explains which support route and governed records were used. Review the cited product truth before changing an answer."
                    />

                    <Flex gap={8} wrap>
                        <Tag color={trace.canonical ? 'success' : 'warning'}>
                            {trace.canonical ? 'Approved answer' : trace.answerSource}
                        </Tag>
                        {trace.confidence ? <Tag>Confidence: {trace.confidence}</Tag> : null}
                        {trace.mountContext ? <Tag>Surface: {trace.mountContext.replace('_', ' ')}</Tag> : null}
                        {trace.userFeedback ? (
                            <Tag color={trace.userFeedback === 'good' ? 'success' : 'error'}>
                                Feedback: {trace.userFeedback.replace('_', ' ')}
                            </Tag>
                        ) : null}
                    </Flex>

                    {trace.reviewSignals.length > 0 ? (
                        <Flex gap={8} wrap>
                            {trace.reviewSignals.map(signal => (
                                <Tag color="warning" key={signal}>{REVIEW_SIGNAL_LABELS[signal]}</Tag>
                            ))}
                        </Flex>
                    ) : null}

                    <div>
                        <Text type="secondary">Question</Text>
                        <Paragraph style={{
                            fontSize: 15,
                            marginBottom: 0,
                            marginTop: 4,
                            overflowWrap: 'anywhere',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {trace.question}
                        </Paragraph>
                    </div>

                    <div>
                        <Text type="secondary">Answer served</Text>
                        <Paragraph
                            style={{
                                background: token.colorBgLayout,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 8,
                                marginBottom: 0,
                                marginTop: 4,
                                maxHeight: 280,
                                overflowWrap: 'anywhere',
                                overflowY: 'auto',
                                padding: 12,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {trace.answer || 'No answer text was retained.'}
                        </Paragraph>
                    </div>

                    {trace.fallbackReason ? (
                        <Alert
                            type="warning"
                            message="Fallback reason"
                            description={formatFallbackReason(trace.fallbackReason)}
                            showIcon
                        />
                    ) : null}

                    {trace.clarificationRequired.length > 0 ? (
                        <div>
                            <Text type="secondary">Missing context required</Text>
                            <Flex gap={6} wrap style={{ marginTop: 6 }}>
                                {trace.clarificationRequired.map(item => <Tag key={item}>{item}</Tag>)}
                            </Flex>
                        </div>
                    ) : null}

                    <Divider style={{ marginBlock: 0 }} />

                    <div>
                        <Title level={5} style={{ marginTop: 0 }}>Governed links</Title>
                        <Flex gap={8} wrap>
                            {trace.canonicalAnswerId ? (
                                governanceActions ? (
                                    <Button
                                        href={getAnswerlatticeAnswerContextRoute(
                                            CANONICAL_ANSWERS_ROUTE,
                                            trace.canonicalAnswerId,
                                        )}
                                        icon={<LuBookOpen />}
                                        style={{ minHeight: 44 }}
                                    >
                                        Review approved answer
                                    </Button>
                                ) : (
                                    <Tag style={{ maxWidth: '100%', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
                                        Answer {trace.canonicalAnswerId}
                                    </Tag>
                                )
                            ) : null}
                            {trace.matchedEntityIds.map(entityId => (
                                governanceActions ? (
                                    <Button
                                        href={getAnswerlatticeEntityContextRoute(KNOWLEDGE_MAP_ROUTE, entityId)}
                                        icon={<LuGitBranch />}
                                        key={entityId}
                                        style={{ minHeight: 44 }}
                                    >
                                        Review product area
                                    </Button>
                                ) : (
                                    <Tag
                                        key={entityId}
                                        style={{ maxWidth: '100%', overflowWrap: 'anywhere', whiteSpace: 'normal' }}
                                    >
                                        Product area {entityId}
                                    </Tag>
                                )
                            ))}
                            <Button
                                href={ANSWERLATTICE_ROUTES.SUPPORT_BOARD}
                                icon={<LuLayoutList />}
                                style={{ minHeight: 44 }}
                            >
                                Open Support Board
                            </Button>
                        </Flex>
                    </div>

                    {trace.citations.length > 0 ? (
                        <div>
                            <Text type="secondary">Citations served</Text>
                            <Flex vertical gap={6} style={{ marginTop: 6 }}>
                                {trace.citations.map(citation => (
                                    <Button
                                        block
                                        href={citation.url}
                                        icon={<LuExternalLink />}
                                        key={`${citation.id}:${citation.url}`}
                                        rel="noopener noreferrer"
                                        style={{
                                            height: 'auto',
                                            justifyContent: 'flex-start',
                                            minHeight: 44,
                                            overflowWrap: 'anywhere',
                                            textAlign: 'left',
                                            whiteSpace: 'normal',
                                        }}
                                        target="_blank"
                                        type="link"
                                    >
                                        {citation.title}
                                    </Button>
                                ))}
                            </Flex>
                        </div>
                    ) : null}

                    <Flex gap={8} wrap>
                        {trace.sourceVersions.canonical ? <Tag>Canonical version {trace.sourceVersions.canonical}</Tag> : null}
                        {trace.sourceVersions.kb ? <Tag>Knowledge version {trace.sourceVersions.kb}</Tag> : null}
                        <Tag>{new Date(trace.createdAt).toLocaleString()}</Tag>
                    </Flex>
                </Flex>
            ) : null}
        </Drawer>
    );
}
