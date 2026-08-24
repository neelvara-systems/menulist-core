'use client';

import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { useSupportBoard } from '@hook/answerlattice/useSupportBoard';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getAnswerlatticeCustomerIdentity } from '@lib/answerlattice/customerIdentity';
import { normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import {
    ANSWERLATTICE_SUPPORT_BOARD_PRIORITY,
    ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE,
    ANSWERLATTICE_SUPPORT_BOARD_STATUS,
    type AnswerlatticeSupportBoardCard,
    type AnswerlatticeSupportBoardPriority,
    type AnswerlatticeSupportBoardStatus,
} from '@type/answerlattice';
import { Alert, Badge, Button, Card, Col, Empty, Flex, Form, Grid, Input, Modal, Popconfirm, Row, Select, Skeleton, Space, Statistic, Tag, Tooltip, Typography, theme } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    LuArrowRight,
    LuClipboardList,
    LuClock3,
    LuFilePlus2,
    LuGitPullRequest,
    LuHistory,
    LuKanbanSquare,
    LuMessageSquarePlus,
    LuRefreshCw,
    LuShieldCheck,
    LuSparkles,
    LuTicket,
} from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const SUPPORT_BOARD_MODAL_BODY_STYLE = {
    maxHeight: 'calc(100dvh - 220px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
} as const;

const BOARD_COLUMNS: Array<{
    status: AnswerlatticeSupportBoardStatus;
    title: string;
    description: string;
    color: string;
}> = [
    {
        status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEW_SIGNALS,
        title: 'New Signals',
        description: 'Fresh fallbacks, negative feedback, escalations, or open tickets.',
        color: 'processing',
    },
    {
        status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
        title: 'Needs Triage',
        description: 'Decide if this is a missing answer, bug, unclear doc, or customer-specific issue.',
        color: 'warning',
    },
    {
        status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_ANSWER,
        title: 'Needs Answer',
        description: 'Needs a FAQ, trusted answer, article update, or ticket reply.',
        color: 'error',
    },
    {
        status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.DRAFT_READY,
        title: 'Draft Ready',
        description: 'A draft or proposal exists. Human review is still required.',
        color: 'purple',
    },
    {
        status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.APPROVED_PUBLISHED,
        title: 'Approved / Published',
        description: 'Answer, FAQ, changelog, or reply is ready for users.',
        color: 'success',
    },
    {
        status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.RESOLVED,
        title: 'Resolved',
        description: 'Support issue handled. Keep for recent operational context.',
        color: 'default',
    },
];

const STATUS_OPTIONS = BOARD_COLUMNS.map((column) => ({
    label: column.title,
    value: column.status,
}));

const CREATE_STATUS_OPTIONS = STATUS_OPTIONS.filter(
    (option) => option.value !== ANSWERLATTICE_SUPPORT_BOARD_STATUS.RESOLVED,
);

const STATUS_LABELS = BOARD_COLUMNS.reduce((acc, column) => {
    acc[column.status] = column.title;
    return acc;
}, {} as Record<string, string>);

const PRIORITY_OPTIONS: Array<{ label: string; value: AnswerlatticeSupportBoardPriority }> = [
    { label: 'High', value: ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH },
    { label: 'Medium', value: ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM },
    { label: 'Low', value: ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW },
];

const SOURCE_LABELS: Record<string, string> = {
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MANUAL]: 'Manual',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.TICKET]: 'Ticket',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.FEEDBACK]: 'Feedback',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.CONVERSATION]: 'Conversation',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.SIGNAL]: 'Signal',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MUTATION_PROPOSAL]: 'Proposal',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.CANONICAL_ANSWER]: 'Answer',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.RELEASE]: 'Release',
    [ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.SURFACE]: 'Surface',
};

const PRIORITY_COLOR: Record<string, string> = {
    [ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH]: 'red',
    [ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM]: 'orange',
    [ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW]: 'blue',
};

const formatDate = (value: any) => {
    if (!value) return null;
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

const formatDateTime = (value: any) => {
    if (!value) return null;
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const getCardSourceIdentity = (card: AnswerlatticeSupportBoardCard) => (
    getAnswerlatticeCustomerIdentity({
        uId: card.sourceCustomerUserId,
        userName: card.sourceCustomerName,
        userEmail: card.sourceCustomerEmail,
        userPhone: card.sourceCustomerPhone,
        requestOrigin: card.sourceOrigin,
        requestPath: card.sourcePath,
        widgetSessionId: card.sourceSessionId,
    })
);

const hasCardSourceIdentity = (card: AnswerlatticeSupportBoardCard) => (
    Boolean(
        card.sourceCustomerName
        || card.sourceCustomerEmail
        || card.sourceCustomerPhone
        || card.sourceCustomerUserId
        || card.sourceOrigin
        || card.sourcePath
        || card.sourceSessionId,
    )
);

const splitCsv = (value?: string) => (
    String(value || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
);

function SupportBoardCard({
    card,
    onOpen,
    onMove,
}: {
    card: AnswerlatticeSupportBoardCard;
    onOpen: (card: AnswerlatticeSupportBoardCard) => void;
    onMove: (card: AnswerlatticeSupportBoardCard, status: AnswerlatticeSupportBoardStatus) => void;
}) {
    const { token } = theme.useToken();
    const sourceIdentity = getCardSourceIdentity(card);
    const hasSourceIdentity = hasCardSourceIdentity(card);
    const cardEntityId = normalizeAnswerlatticeResolvedEntityId(card.relatedEntityId);
    const nextStatus = card.status === ANSWERLATTICE_SUPPORT_BOARD_STATUS.RESOLVED
        ? null
        : BOARD_COLUMNS[BOARD_COLUMNS.findIndex((column) => column.status === card.status) + 1]?.status || null;
    const nextStatusLabel = nextStatus ? BOARD_COLUMNS.find((column) => column.status === nextStatus)?.title : null;

    return (
        <Card
            hoverable
            onClick={() => onOpen(card)}
            size="small"
            style={{
                borderColor: token.colorBorderSecondary,
                borderRadius: 8,
            }}
            styles={{ body: { padding: 12 } }}
        >
            <Flex vertical gap={10}>
                <Flex justify="space-between" gap={8} align="flex-start">
                    <Text strong style={{ lineHeight: 1.25 }}>{card.title}</Text>
                    <Tag color={PRIORITY_COLOR[card.priority] || 'default'} style={{ marginInlineEnd: 0 }}>
                        {card.priority}
                    </Tag>
                </Flex>
                <Paragraph
                    ellipsis={{ rows: 3 }}
                    style={{ color: token.colorTextSecondary, fontSize: 13, marginBottom: 0 }}
                >
                    {card.description || 'No description added yet.'}
                </Paragraph>
                <Space size={[6, 6]} wrap>
                    <Tag>{SOURCE_LABELS[card.sourceType] || card.sourceType}</Tag>
                    {cardEntityId ? <Tag color="geekblue">Entity linked</Tag> : null}
                    {card.relatedProposalId ? <Tag color="purple">Proposal linked</Tag> : null}
                    {card.notesCount ? <Tag color="default">{card.notesCount} note{card.notesCount === 1 ? '' : 's'}</Tag> : null}
                </Space>
                {hasSourceIdentity ? (
                    <Flex vertical gap={2}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Customer: {sourceIdentity.displayName}
                        </Text>
                        {(sourceIdentity.email || sourceIdentity.phone) ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {sourceIdentity.email || sourceIdentity.phone}
                            </Text>
                        ) : null}
                    </Flex>
                ) : null}
                {Array.isArray(card.tags) && card.tags.length > 0 ? (
                    <Space size={[4, 4]} wrap>
                        {card.tags.slice(0, 4).map((tag) => (
                            <Tag key={`${card.id}-${tag}`} style={{ marginInlineEnd: 0 }}>{tag}</Tag>
                        ))}
                    </Space>
                ) : null}
                <Flex align="center" justify="space-between" gap={8}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {card.assigneeName ? `Owner: ${card.assigneeName}` : 'Unassigned'}
                    </Text>
                    {nextStatus && nextStatusLabel ? (
                        <Button
                            type="text"
                            size="small"
                            icon={<LuArrowRight />}
                            onClick={(event) => {
                                event.stopPropagation();
                                onMove(card, nextStatus);
                            }}
                        >
                            {nextStatusLabel}
                        </Button>
                    ) : null}
                </Flex>
            </Flex>
        </Card>
    );
}

export default function AnswerlatticeSupportBoard() {
    const session = useClientAuthSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const preparedCardHandledRef = useRef(false);
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [createForm] = Form.useForm();
    const [detailForm] = Form.useForm();
    const [noteForm] = Form.useForm();
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState<AnswerlatticeSupportBoardCard | null>(null);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const { access } = useAnswerlatticeAccess();
    const canCreateGovernanceProposal = access?.isPlatformAdmin
        || access?.permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE] === true;

    useEffect(() => {
        if (preparedCardHandledRef.current || searchParams?.get('create') !== '1') return;
        const title = String(searchParams?.get('title') || '').trim().slice(0, 140);
        if (!title) return;
        preparedCardHandledRef.current = true;
        const priority = searchParams?.get('priority');
        createForm.setFieldsValue({
            title,
            description: String(searchParams?.get('description') || '').trim().slice(0, 1200),
            priority: priority === ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH || priority === ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW
                ? priority
                : ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM,
            status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
            tags: String(searchParams?.get('tags') || '').split(',').map(value => value.trim()).filter(Boolean).slice(0, 8).join(', '),
        });
        setCreateOpen(true);
        router.replace(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.SUPPORT_BOARD, currentHostname));
    }, [createForm, currentHostname, router, searchParams]);

    const actor = useMemo(() => ({
        id: session?.uId || session?.user?.id || 'unknown',
        name: session?.user?.name || session?.user?.email || 'Team member',
        email: session?.user?.email || null,
    }), [session?.uId, session?.user?.email, session?.user?.id, session?.user?.name]);

    const {
        addNote,
        cards,
        createAnswerProposal,
        createCard,
        enabled,
        error,
        hasScope,
        loading,
        moveCard,
        redactSourceIdentity,
        refresh,
        saving,
        sourceSyncEnabled,
        summary,
        syncing,
        syncSignals,
        syncTickets,
        updateCard,
    } = useSupportBoard(session?.tId ?? undefined, session?.sId ?? undefined, actor);

    const groupedCards = useMemo(() => (
        BOARD_COLUMNS.reduce((acc, column) => {
            acc[column.status] = cards.filter((card) => card.status === column.status);
            return acc;
        }, {} as Record<AnswerlatticeSupportBoardStatus, AnswerlatticeSupportBoardCard[]>)
    ), [cards]);

    const needsAnswerCount = groupedCards[ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_ANSWER]?.length || 0;
    const openCount = cards.filter((card) => card.status !== ANSWERLATTICE_SUPPORT_BOARD_STATUS.RESOLVED).length;
    const proposalCount = cards.filter((card) => Boolean(card.relatedProposalId)).length;
    const selectedCardEntityId = normalizeAnswerlatticeResolvedEntityId(selectedCard?.relatedEntityId);
    const selectedCardHasEntity = Boolean(selectedCardEntityId);
    const canCreateProposalForSelectedCard = Boolean(selectedCard)
        && canCreateGovernanceProposal
        && selectedCardHasEntity
        && !selectedCard?.relatedProposalId;
    const selectedProposalHelp = selectedCard?.relatedProposalId
        ? 'A proposal is already linked to this support card.'
        : !canCreateGovernanceProposal
            ? 'Governance access is required to create answer proposals.'
            : !selectedCardHasEntity
                ? 'Link a product entity before creating an answer proposal.'
                : 'Create a reviewed answer proposal from this support card.';

    const openCard = (card: AnswerlatticeSupportBoardCard) => {
        setSelectedCard(card);
        detailForm.setFieldsValue({
            title: card.title,
            description: card.description,
            status: card.status,
            priority: card.priority,
            assigneeName: card.assigneeName || '',
            dueDate: card.dueDate || '',
            relatedEntityId: normalizeAnswerlatticeResolvedEntityId(card.relatedEntityId) || '',
            relatedSurfaceId: card.relatedSurfaceId || '',
            tags: (card.tags || []).join(', '),
        });
        noteForm.resetFields();
    };

    const handleCreate = async () => {
        const values = await createForm.validateFields();
        const created = await createCard({
            title: values.title,
            description: values.description || '',
            status: values.status || ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
            priority: values.priority || ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM,
            sourceType: ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.MANUAL,
            sourceId: null,
            assigneeName: values.assigneeName || null,
            dueDate: values.dueDate || null,
            relatedEntityId: values.relatedEntityId || null,
            relatedSurfaceId: values.relatedSurfaceId || null,
            tags: splitCsv(values.tags),
        });
        if (created) {
            createForm.resetFields();
            setCreateOpen(false);
        }
    };

    const handleSaveDetails = async () => {
        if (!selectedCard) return;
        const values = await detailForm.validateFields();
        await updateCard(selectedCard.id, {
            title: values.title,
            description: values.description || '',
            status: values.status,
            priority: values.priority,
            assigneeName: values.assigneeName || null,
            dueDate: values.dueDate || null,
            relatedEntityId: values.relatedEntityId || null,
            relatedSurfaceId: values.relatedSurfaceId || null,
            tags: splitCsv(values.tags),
        });
        setSelectedCard(null);
    };

    const handleAddNote = async () => {
        if (!selectedCard) return;
        const values = await noteForm.validateFields();
        await addNote(selectedCard.id, values.note);
        noteForm.resetFields();
        setSelectedCard(null);
    };

    const handleRedactSourceIdentity = async () => {
        if (!selectedCard) return;
        const redacted = await redactSourceIdentity(selectedCard.id);
        if (redacted) setSelectedCard(null);
    };

    if (!enabled) {
        return (
            <Alert
                showIcon
                type="info"
                message="Support Board is disabled"
                description="Enable ENABLE_ANSWERLATTICE_SUPPORT_BOARD to use the owner support workboard."
            />
        );
    }

    if (!hasScope) {
        return (
            <Alert
                showIcon
                type="warning"
                message="Answerlattice workspace scope is missing"
                description="Open Answerlattice from a workspace account before using the Support Board."
            />
        );
    }

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Support Board</Title>
                    <Text type="secondary">
                        Turn missed support questions into owner-reviewed knowledge work. Internal notes stay private.
                    </Text>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} onClick={() => refresh()} loading={loading}>
                        Refresh
                    </Button>
                    {sourceSyncEnabled ? (
                        <>
                            <Button icon={<LuTicket />} onClick={syncTickets} loading={syncing}>
                                Sync tickets
                            </Button>
                            <Button icon={<LuMessageSquarePlus />} onClick={syncSignals} loading={syncing}>
                                Sync signals
                            </Button>
                        </>
                    ) : null}
                    <Button type="primary" icon={<LuFilePlus2 />} onClick={() => setCreateOpen(true)}>
                        New card
                    </Button>
                </Space>
            </Flex>

            <Alert
                showIcon
                type="info"
                message="Support work only"
                description="Use this board for tickets, conversations, support gaps, stale answers, draft proposals, releases, surfaces, and private owner notes. It is not a generic project-management board."
            />

            {summary ? (
                <Alert
                    showIcon
                    type="success"
                    icon={<LuClock3 />}
                    message="Nightly review queue prepared"
                    description={`Last sync checked ${summary.lastSync?.candidatesAnalyzed || 0} support signals, created ${summary.lastSync?.cardsCreated || 0} card${summary.lastSync?.cardsCreated === 1 ? '' : 's'}, updated ${summary.lastSync?.cardsUpdated || 0}, and skipped ${summary.lastSync?.cardsSkippedResolved || 0} resolved card${summary.lastSync?.cardsSkippedResolved === 1 ? '' : 's'}. ${summary.lastUpdated ? `Updated ${formatDateTime(summary.lastUpdated)}.` : ''}`}
                />
            ) : null}

            {error ? <Alert showIcon type="warning" message={error} /> : null}

            <Row gutter={[12, 12]}>
                <Col xs={12} lg={6}>
                    <Card>
                        <Statistic title="Open work" value={openCount} prefix={<LuKanbanSquare />} />
                    </Card>
                </Col>
                <Col xs={12} lg={6}>
                    <Card>
                        <Statistic title="Needs answer" value={needsAnswerCount} prefix={<LuClipboardList />} />
                    </Card>
                </Col>
                <Col xs={12} lg={6}>
                    <Card>
                        <Statistic title="Cards" value={cards.length} prefix={<LuFilePlus2 />} />
                    </Card>
                </Col>
                <Col xs={12} lg={6}>
                    <Card>
                        <Statistic title="Proposals" value={proposalCount} prefix={<LuGitPullRequest />} />
                    </Card>
                </Col>
            </Row>

            {loading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : cards.length === 0 ? (
                <Card>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No support cards yet"
                    >
                        <Space wrap>
                            {sourceSyncEnabled ? (
                                <>
                                    <Button icon={<LuTicket />} onClick={syncTickets} loading={syncing}>
                                        Sync unresolved tickets
                                    </Button>
                                    <Button icon={<LuMessageSquarePlus />} onClick={syncSignals} loading={syncing}>
                                        Sync support signals
                                    </Button>
                                </>
                            ) : null}
                            <Button type="primary" icon={<LuFilePlus2 />} onClick={() => setCreateOpen(true)}>
                                Add manual card
                            </Button>
                        </Space>
                    </Empty>
                </Card>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gap: 12,
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                    }}
                >
                    {BOARD_COLUMNS.map((column) => {
                        const columnCards = groupedCards[column.status] || [];
                        return (
                            <Card
                                key={column.status}
                                title={(
                                    <Flex align="center" justify="space-between" gap={8}>
                                        <Space size={8}>
                                            <Badge color={column.color === 'default' ? token.colorTextTertiary : undefined} />
                                            <Text strong>{column.title}</Text>
                                        </Space>
                                        <Tag color={column.color}>{columnCards.length}</Tag>
                                    </Flex>
                                )}
                                style={{ borderRadius: 8, minHeight: 260 }}
                                styles={{ body: { padding: 12 } }}
                            >
                                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                                    {column.description}
                                </Text>
                                <Flex vertical gap={10}>
                                    {columnCards.length === 0 ? (
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No cards" />
                                    ) : columnCards.map((card) => (
                                        <SupportBoardCard
                                            key={card.id}
                                            card={card}
                                            onOpen={openCard}
                                            onMove={(nextCard, status) => moveCard(nextCard.id, status)}
                                        />
                                    ))}
                                </Flex>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Modal
                title="New support card"
                open={createOpen}
                onCancel={() => setCreateOpen(false)}
                onOk={handleCreate}
                okText="Create card"
                confirmLoading={saving}
                destroyOnHidden
                styles={{ body: SUPPORT_BOARD_MODAL_BODY_STYLE }}
            >
                <Form form={createForm} layout="vertical" initialValues={{ priority: ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM, status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Add a title' }]}>
                        <Input placeholder="Users are confused by billing retries" maxLength={140} />
                    </Form.Item>
                    <Form.Item name="description" label="Support context">
                        <TextArea rows={4} maxLength={1200} placeholder="What happened, which answer is missing, or what owner context should staff know?" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item name="status" label="Status">
                                <Select options={CREATE_STATUS_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="priority" label="Priority">
                                <Select options={PRIORITY_OPTIONS} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item name="assigneeName" label="Assignee">
                                <Input placeholder="Owner / support / developer" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="dueDate" label="Due date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="relatedEntityId" label="Related entity ID">
                        <Input placeholder="Optional, required for governance proposal" />
                    </Form.Item>
                    <Form.Item name="relatedSurfaceId" label="Related surface ID">
                        <Input placeholder="Optional route/page/workflow id" />
                    </Form.Item>
                    <Form.Item name="tags" label="Tags">
                        <Input placeholder="billing, onboarding, docs" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={selectedCard?.title || 'Support card'}
                open={Boolean(selectedCard)}
                onCancel={() => setSelectedCard(null)}
                onOk={handleSaveDetails}
                okText="Save changes"
                confirmLoading={saving}
                width={760}
                destroyOnHidden
                styles={{ body: SUPPORT_BOARD_MODAL_BODY_STYLE }}
                footer={(_, { OkBtn, CancelBtn }) => (
                    <Flex justify="space-between" gap={12} wrap="wrap">
                        <Space wrap>
                            {selectedCard?.relatedTicketId ? (
                                <Button onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.TICKETS, currentHostname))}>
                                    Open tickets
                                </Button>
                            ) : null}
                            {selectedCard ? (
                                <Tooltip title={selectedProposalHelp}>
                                    <span>
                                        <Button
                                            icon={<LuSparkles />}
                                            onClick={() => createAnswerProposal(selectedCard)}
                                            disabled={!canCreateProposalForSelectedCard}
                                        >
                                            {selectedCard.relatedProposalId
                                                ? 'Proposal linked'
                                                : canCreateGovernanceProposal
                                                    ? 'Create answer proposal'
                                                    : 'Governance access required'}
                                        </Button>
                                    </span>
                                </Tooltip>
                            ) : null}
                        </Space>
                        <Space>
                            <CancelBtn />
                            <OkBtn />
                        </Space>
                    </Flex>
                )}
            >
                {selectedCard ? (
                    <Flex vertical gap={16}>
                        <Space size={[6, 6]} wrap>
                            <Tag>{SOURCE_LABELS[selectedCard.sourceType] || selectedCard.sourceType}</Tag>
                            {selectedCard.sourceId ? <Tag>Source: {selectedCard.sourceId.slice(0, 10)}</Tag> : null}
                            {selectedCard.dueDate ? <Tag color="warning">Due {formatDate(selectedCard.dueDate) || selectedCard.dueDate}</Tag> : null}
                            {selectedCard.relatedProposalId ? <Tag color="purple">Proposal {selectedCard.relatedProposalId.slice(0, 8)}</Tag> : null}
                            {selectedCard.sourceIdentityRedactedAt ? <Tag>Source details removed</Tag> : null}
                        </Space>

                        {hasCardSourceIdentity(selectedCard) ? (() => {
                            const sourceIdentity = getCardSourceIdentity(selectedCard);
                            return (
                                <Card size="small" title="Source customer">
                                    <Flex vertical gap={8}>
                                        <Flex justify="space-between" gap={12} wrap="wrap">
                                            <Text type="secondary">Name</Text>
                                            <Text>{sourceIdentity.displayName}</Text>
                                        </Flex>
                                        {(sourceIdentity.email || sourceIdentity.phone) ? (
                                            <Flex justify="space-between" gap={12} wrap="wrap">
                                                <Text type="secondary">Contact</Text>
                                                <Text>{[sourceIdentity.email, sourceIdentity.phone].filter(Boolean).join(' · ')}</Text>
                                            </Flex>
                                        ) : null}
                                        {(sourceIdentity.origin || sourceIdentity.path) ? (
                                            <Flex justify="space-between" gap={12} wrap="wrap">
                                                <Text type="secondary">Where it happened</Text>
                                                <Text>{[sourceIdentity.origin, sourceIdentity.path].filter(Boolean).join(' · ')}</Text>
                                            </Flex>
                                        ) : null}
                                        {sourceIdentity.sessionId ? (
                                            <Flex justify="space-between" gap={12} wrap="wrap">
                                                <Text type="secondary">Session</Text>
                                                <Text code>{sourceIdentity.sessionId}</Text>
                                            </Flex>
                                        ) : null}
                                        <Popconfirm
                                            title="Remove source customer details?"
                                            description="This permanently clears copied name, contact, page, and session details from this card. The source card and source ID remain."
                                            okText="Remove details"
                                            cancelText="Keep details"
                                            onConfirm={handleRedactSourceIdentity}
                                        >
                                            <Button danger icon={<LuShieldCheck />} loading={saving}>
                                                Remove source details
                                            </Button>
                                        </Popconfirm>
                                    </Flex>
                                </Card>
                            );
                        })() : null}

                        <Form form={detailForm} layout="vertical">
                            <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Add a title' }]}>
                                <Input maxLength={140} />
                            </Form.Item>
                            <Form.Item name="description" label="Support context">
                                <TextArea rows={4} maxLength={1200} />
                            </Form.Item>
                            <Row gutter={12}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="status" label="Status">
                                        <Select options={STATUS_OPTIONS} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="priority" label="Priority">
                                        <Select options={PRIORITY_OPTIONS} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={12}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="assigneeName" label="Assignee">
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="dueDate" label="Due date">
                                        <Input type="date" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={12}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="relatedEntityId" label="Related entity ID">
                                        <Input placeholder="Required before answer proposal" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="relatedSurfaceId" label="Related surface ID">
                                        <Input />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="tags" label="Tags">
                                <Input placeholder="billing, onboarding, docs" />
                            </Form.Item>
                        </Form>

                        <Card size="small" title={<Space size={8}><LuHistory />Status history</Space>}>
                            {Array.isArray(selectedCard.statuses) && selectedCard.statuses.length > 0 ? (
                                <Flex vertical gap={8}>
                                    {selectedCard.statuses.map((entry, index) => (
                                        <div
                                            key={`${entry.status}-${index}-${formatDateTime(entry.timestamp) || index}`}
                                            style={{
                                                background: token.colorFillTertiary,
                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                borderRadius: 8,
                                                padding: 10,
                                            }}
                                        >
                                            <Flex justify="space-between" gap={10} align="flex-start" wrap="wrap">
                                                <div>
                                                    <Text strong>{STATUS_LABELS[entry.status] || entry.status}</Text>
                                                    {entry.remark ? (
                                                        <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                                                            {entry.remark}
                                                        </Paragraph>
                                                    ) : null}
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {formatDateTime(entry.timestamp) || 'Just now'}
                                                </Text>
                                            </Flex>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {entry.createdBy?.name || 'Team member'}
                                            </Text>
                                        </div>
                                    ))}
                                </Flex>
                            ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No status history yet" />
                            )}
                        </Card>

                        <Card size="small" title="Internal notes">
                            <Flex vertical gap={12}>
                                <Form form={noteForm} layout="vertical">
                                    <Form.Item name="note" label="Add private note" rules={[{ required: true, message: 'Write a note' }]}>
                                        <TextArea rows={3} maxLength={1000} placeholder="Only owner/staff can see this." />
                                    </Form.Item>
                                    <Button icon={<LuMessageSquarePlus />} onClick={handleAddNote} loading={saving}>
                                        Add note
                                    </Button>
                                </Form>
                                {Array.isArray(selectedCard.notes) && selectedCard.notes.length > 0 ? (
                                    <Flex vertical gap={8}>
                                        {selectedCard.notes.map((note) => (
                                            <div
                                                key={note.id}
                                                style={{
                                                    background: token.colorFillTertiary,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 8,
                                                    padding: 10,
                                                }}
                                            >
                                                <Paragraph style={{ marginBottom: 6 }}>{note.text}</Paragraph>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {note.authorName} · {formatDate(note.createdAt) || 'just now'}
                                                </Text>
                                            </div>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No internal notes yet" />
                                )}
                            </Flex>
                        </Card>
                    </Flex>
                ) : null}
            </Modal>
        </Flex>
    );
}
