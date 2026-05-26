'use client';

import { CANONICA_ROUTES, toCanonicaDashboardRoute } from '@constant/canonica/navigations';
import { CANONICA_PERMISSION_KEYS } from '@constant/canonica/permissions';
import { useSupportBoard } from '@hook/canonica/useSupportBoard';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { useCanonicaAccess } from '@providers/canonicaAccessProvider';
import {
    CANONICA_SUPPORT_BOARD_PRIORITY,
    CANONICA_SUPPORT_BOARD_SOURCE_TYPE,
    CANONICA_SUPPORT_BOARD_STATUS,
    type CanonicaSupportBoardCard,
    type CanonicaSupportBoardPriority,
    type CanonicaSupportBoardStatus,
} from '@type/canonica';
import { Alert, Badge, Button, Card, Col, Empty, Flex, Form, Grid, Input, Modal, Row, Select, Skeleton, Space, Statistic, Tag, Typography, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
    LuArrowRight,
    LuClipboardList,
    LuFilePlus2,
    LuGitPullRequest,
    LuKanbanSquare,
    LuMessageSquarePlus,
    LuRefreshCw,
    LuSparkles,
    LuTicket,
} from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const BOARD_COLUMNS: Array<{
    status: CanonicaSupportBoardStatus;
    title: string;
    description: string;
    color: string;
}> = [
    {
        status: CANONICA_SUPPORT_BOARD_STATUS.NEW_SIGNALS,
        title: 'New Signals',
        description: 'Fresh fallbacks, negative feedback, escalations, or open tickets.',
        color: 'processing',
    },
    {
        status: CANONICA_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
        title: 'Needs Triage',
        description: 'Decide if this is a missing answer, bug, unclear doc, or customer-specific issue.',
        color: 'warning',
    },
    {
        status: CANONICA_SUPPORT_BOARD_STATUS.NEEDS_ANSWER,
        title: 'Needs Answer',
        description: 'Needs a FAQ, canonical answer, article update, or ticket reply.',
        color: 'error',
    },
    {
        status: CANONICA_SUPPORT_BOARD_STATUS.DRAFT_READY,
        title: 'Draft Ready',
        description: 'A draft or proposal exists. Human review is still required.',
        color: 'purple',
    },
    {
        status: CANONICA_SUPPORT_BOARD_STATUS.APPROVED_PUBLISHED,
        title: 'Approved / Published',
        description: 'Answer, FAQ, changelog, or reply is ready for users.',
        color: 'success',
    },
    {
        status: CANONICA_SUPPORT_BOARD_STATUS.RESOLVED,
        title: 'Resolved',
        description: 'Support issue handled. Keep for recent operational context.',
        color: 'default',
    },
];

const STATUS_OPTIONS = BOARD_COLUMNS.map((column) => ({
    label: column.title,
    value: column.status,
}));

const PRIORITY_OPTIONS: Array<{ label: string; value: CanonicaSupportBoardPriority }> = [
    { label: 'High', value: CANONICA_SUPPORT_BOARD_PRIORITY.HIGH },
    { label: 'Medium', value: CANONICA_SUPPORT_BOARD_PRIORITY.MEDIUM },
    { label: 'Low', value: CANONICA_SUPPORT_BOARD_PRIORITY.LOW },
];

const SOURCE_LABELS: Record<string, string> = {
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.MANUAL]: 'Manual',
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.TICKET]: 'Ticket',
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.CONVERSATION]: 'Conversation',
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.SIGNAL]: 'Signal',
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.MUTATION_PROPOSAL]: 'Proposal',
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.CANONICAL_ANSWER]: 'Answer',
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.RELEASE]: 'Release',
    [CANONICA_SUPPORT_BOARD_SOURCE_TYPE.SURFACE]: 'Surface',
};

const PRIORITY_COLOR: Record<string, string> = {
    [CANONICA_SUPPORT_BOARD_PRIORITY.HIGH]: 'red',
    [CANONICA_SUPPORT_BOARD_PRIORITY.MEDIUM]: 'orange',
    [CANONICA_SUPPORT_BOARD_PRIORITY.LOW]: 'blue',
};

const formatDate = (value: any) => {
    if (!value) return null;
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

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
    card: CanonicaSupportBoardCard;
    onOpen: (card: CanonicaSupportBoardCard) => void;
    onMove: (card: CanonicaSupportBoardCard, status: CanonicaSupportBoardStatus) => void;
}) {
    const { token } = theme.useToken();
    const nextStatus = card.status === CANONICA_SUPPORT_BOARD_STATUS.RESOLVED
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
                    {card.relatedEntityId ? <Tag color="geekblue">Entity linked</Tag> : null}
                    {card.relatedProposalId ? <Tag color="purple">Proposal linked</Tag> : null}
                    {card.notesCount ? <Tag color="default">{card.notesCount} note{card.notesCount === 1 ? '' : 's'}</Tag> : null}
                </Space>
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

export default function CanonicaSupportBoard() {
    const session = useClientAuthSession();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [createForm] = Form.useForm();
    const [detailForm] = Form.useForm();
    const [noteForm] = Form.useForm();
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState<CanonicaSupportBoardCard | null>(null);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const { access } = useCanonicaAccess();
    const canCreateGovernanceProposal = access?.isPlatformAdmin
        || access?.permissions?.[CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE] === true;

    const actor = useMemo(() => ({
        id: session?.uId || session?.user?.id || 'unknown',
        name: session?.user?.name || session?.user?.email || 'Team member',
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
        refresh,
        saving,
        syncing,
        syncSignals,
        syncTickets,
        updateCard,
    } = useSupportBoard(session?.tId, session?.sId, actor);

    const groupedCards = useMemo(() => (
        BOARD_COLUMNS.reduce((acc, column) => {
            acc[column.status] = cards.filter((card) => card.status === column.status);
            return acc;
        }, {} as Record<CanonicaSupportBoardStatus, CanonicaSupportBoardCard[]>)
    ), [cards]);

    const needsAnswerCount = groupedCards[CANONICA_SUPPORT_BOARD_STATUS.NEEDS_ANSWER]?.length || 0;
    const openCount = cards.filter((card) => card.status !== CANONICA_SUPPORT_BOARD_STATUS.RESOLVED).length;
    const proposalCount = cards.filter((card) => Boolean(card.relatedProposalId)).length;

    const openCard = (card: CanonicaSupportBoardCard) => {
        setSelectedCard(card);
        detailForm.setFieldsValue({
            title: card.title,
            description: card.description,
            status: card.status,
            priority: card.priority,
            assigneeName: card.assigneeName || '',
            dueDate: card.dueDate || '',
            relatedEntityId: card.relatedEntityId || '',
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
            status: values.status || CANONICA_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
            priority: values.priority || CANONICA_SUPPORT_BOARD_PRIORITY.MEDIUM,
            sourceType: CANONICA_SUPPORT_BOARD_SOURCE_TYPE.MANUAL,
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

    if (!enabled) {
        return (
            <Alert
                showIcon
                type="info"
                message="Support Board is disabled"
                description="Enable ENABLE_CANONICA_SUPPORT_BOARD to use the owner support workboard."
            />
        );
    }

    if (!hasScope) {
        return (
            <Alert
                showIcon
                type="warning"
                message="Canonica workspace scope is missing"
                description="Open Canonica from a workspace account before using the Support Board."
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
                    <Button icon={<LuTicket />} onClick={syncTickets} loading={syncing}>
                        Sync tickets
                    </Button>
                    <Button icon={<LuMessageSquarePlus />} onClick={syncSignals} loading={syncing}>
                        Sync signals
                    </Button>
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
                            <Button icon={<LuTicket />} onClick={syncTickets} loading={syncing}>
                                Sync unresolved tickets
                            </Button>
                            <Button icon={<LuMessageSquarePlus />} onClick={syncSignals} loading={syncing}>
                                Sync support signals
                            </Button>
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
                destroyOnClose
            >
                <Form form={createForm} layout="vertical" initialValues={{ priority: CANONICA_SUPPORT_BOARD_PRIORITY.MEDIUM, status: CANONICA_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Add a title' }]}>
                        <Input placeholder="Users are confused by billing retries" maxLength={140} />
                    </Form.Item>
                    <Form.Item name="description" label="Support context">
                        <TextArea rows={4} maxLength={1200} placeholder="What happened, which answer is missing, or what owner context should staff know?" />
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
                destroyOnClose
                footer={(_, { OkBtn, CancelBtn }) => (
                    <Flex justify="space-between" gap={12} wrap="wrap">
                        <Space wrap>
                            {selectedCard?.relatedTicketId ? (
                                <Button onClick={() => router.push(toCanonicaDashboardRoute(CANONICA_ROUTES.TICKETS, currentHostname))}>
                                    Open tickets
                                </Button>
                            ) : null}
                            {selectedCard ? (
                                <Button
                                    icon={<LuSparkles />}
                                    onClick={() => createAnswerProposal(selectedCard)}
                                    disabled={Boolean(selectedCard.relatedProposalId) || !canCreateGovernanceProposal}
                                >
                                    {selectedCard.relatedProposalId
                                        ? 'Proposal linked'
                                        : canCreateGovernanceProposal
                                            ? 'Create answer proposal'
                                            : 'Governance access required'}
                                </Button>
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
                        </Space>

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
