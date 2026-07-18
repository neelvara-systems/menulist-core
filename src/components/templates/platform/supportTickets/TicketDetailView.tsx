'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { ANSWERLATTICE_GOVERNANCE_TABS, getAnswerlatticeGovernanceRoute, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { rebuildProductSurfaceContentSummaryWithDiagnostics } from '@database/answerlattice/productSurfaces';
import { assertSupportTicketUpdateSucceeded, updateTicket } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getBoundedAnswerlatticeStringContext } from '@lib/answerlattice/diagnostics';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getSupportTicketAttachmentDownloadUrl } from '@lib/answerlattice/supportTicketAttachmentBoundary';
import { answerlatticeApp } from '@lib/firebase/answerlatticeFirebaseClient';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import SupportTicketCategory from '@organisms/SupportTicket/SupportTicketCategory';
import SupportTicketPriority from '@organisms/SupportTicket/SupportTicketPriority';
import SupportTicketStatus from '@organisms/SupportTicket/SupportTicketStatus';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { Badge, Button, Card, Drawer, Flex, Grid, Image as AntImage, message, Tag, theme, Tooltip, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LuBookOpen, LuBug, LuClock, LuFile, LuGitPullRequest, LuMessageSquare, LuPaperclip, LuPen } from 'react-icons/lu';
import ConversationTimeline from './ConversationTimeline';
import TicketActions from './TicketActions';
import TicketLogsView from './TicketLogsView';

const { Text, Title } = Typography;

interface TicketDetailViewProps {
    activeTicket: SupportTicketType | null;
    onUpdate: (tickets: any) => void;
    setSelectedTicket: (ticket: SupportTicketType | null) => void;
    from?: string;//platform or client
}

function TicketDetailView({ activeTicket, onUpdate, setSelectedTicket, from }: TicketDetailViewProps) {
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const router = useRouter();
    const { data: session } = useSession();
    const [ticket, setTicket] = useState<SupportTicketType | null>(activeTicket);
    const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
    const isMobile = !screens.md;
    const isClientView = from === "client";
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    const handleAttachmentOpen = (item: { url?: string; name?: string; type?: string; size?: number }) => {
        try {
            const trustedUrl = getSupportTicketAttachmentDownloadUrl({
                bucket: answerlatticeApp?.options.storageBucket,
                collection: DB_COLLECTIONS.SUPPORT_TICKETS,
                sId: ticket?.sId || 0,
                tId: ticket?.tId || 0,
                url: item.url,
            });
            if (!trustedUrl) {
                throw new Error('answerlattice_ticket_attachment_url_invalid');
            }
            const opened = window.open(trustedUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('answerlattice_ticket_attachment_open_blocked');
            }
        } catch (error) {
            logRuntimeFailure('answerlattice_ticket_attachment_open_failed', error, {
                surface: 'ticket_detail_view',
                ...getBoundedRuntimeStringContext('ticketId', ticket?.id),
                ...getBoundedRuntimeStringContext('ticketDisplayId', ticket?.displayId),
                ...getBoundedRuntimeStringContext('attachmentName', item.name),
                ...getBoundedRuntimeStringContext('attachmentType', item.type),
                attachmentUrlPresent: typeof item.url === 'string' && item.url.length > 0,
                attachmentSizePresent: typeof item.size === 'number',
            });
            message.error('Unable to open attachment');
        }
    };

    useEffect(() => {
        setTicket(activeTicket);
    }, [activeTicket, from]);

    // Keyboard shortcut: Esc to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && ticket) {
                setSelectedTicket(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ticket, setSelectedTicket]);

    const handleTicketUpdate = async (values: Partial<SupportTicketType>) => {
        if (!ticket || !session?.user) return;

        const updatePayload = { ...values };
        const statusChanged = Boolean(values.status && values.status !== activeTicket.status);

        dispatch(startLoader('Updating ticket...'));
        try {
            const res = await updateTicket({
                ...updatePayload,
                id: ticket.id,
                tId: ticket.tId,
                sId: ticket.sId,
            });
            assertSupportTicketUpdateSucceeded(
                res,
                ticket.id,
                'platform_ticket_detail_update_rejected',
            );
            setTicket(res as SupportTicketType);
            onUpdate(res);
            let summaryRefreshSucceeded = true;
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) {
                summaryRefreshSucceeded = await rebuildProductSurfaceContentSummaryWithDiagnostics({
                    failureCode: 'answerlattice_ticket_summary_refresh_after_update_failed',
                    context: {
                        ...getBoundedAnswerlatticeStringContext('ticketId', ticket.id),
                        ...getBoundedAnswerlatticeStringContext('ticketDisplayId', ticket.displayId),
                        ...getBoundedAnswerlatticeStringContext('ticketStatus', updatePayload.status || ticket.status),
                        ...getBoundedAnswerlatticeStringContext('ticketCategory', updatePayload.category || ticket.category),
                    },
                });
            }

            // Ticket → Knowledge Loop (Item #9): emit enriched resolution signal
            // Fire-and-forget — never blocks ticket update flow
            if (statusChanged && (values.status === SUPPORT_TICKET_STATUS.RESOLVED || values.status === SUPPORT_TICKET_STATUS.CLOSED)) {
                const resolutionSignalLogContext = {
                    ...getBoundedRuntimeStringContext('ticketId', ticket.id),
                    ...getBoundedRuntimeStringContext('ticketDisplayId', ticket.displayId),
                    ...getBoundedRuntimeStringContext('ticketStatus', values.status),
                };
                import('@lib/answerlattice/signalEmitter').then(({ emitTicketResolutionSignal }) => {
                    emitTicketResolutionSignal({
                        ticketId: ticket.id,
                        subject: ticket.subject || '',
                        messages: (res as SupportTicketType).messages || [],
                        category: ticket.category || '',
                        tId: Number(ticket.tId),
                        sId: Number(ticket.sId),
                        resolvedBy: session.user.email || session.user.name || 'unknown',
                    }).catch((error) => {
                        logRuntimeFailure('answerlattice_ticket_resolution_signal_emit_failed', error, resolutionSignalLogContext);
                    });
                }).catch((error) => {
                    logRuntimeFailure('answerlattice_ticket_resolution_signal_import_failed', error, resolutionSignalLogContext);
                });
            }

            setSelectedTicket(null);
            if (summaryRefreshSucceeded) {
                message.success('Ticket updated successfully.');
            } else {
                message.warning('Ticket updated, but contextual help refresh failed. Try Refresh after checking product surfaces.');
            }
        } catch (error) {
            message.error('Failed to update ticket.');
        } finally {
            dispatch(stopLoader('Updating ticket...'));
        }
    };

    if (!Boolean(activeTicket) || !ticket) return null;

    const ticketLogCount = ticket.logs?.length || 0;
    const hasTicketDebugContext = Boolean(ticket.clientDebugContext?.userAgent);
    const canViewTicketLogs = !isClientView && (ticketLogCount > 0 || hasTicketDebugContext);
    const ticketLogsTooltip = canViewTicketLogs
        ? `View captured browser context${ticketLogCount > 0 ? ` and ${ticketLogCount} log${ticketLogCount === 1 ? '' : 's'}` : ''}`
        : 'No captured browser context';
    const resolvedForKnowledge = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
    const resolutionContextLength = (ticket.messages || [])
        .filter(item => item.type !== 'system')
        .slice(-5)
        .map(item => item.text || '')
        .join(' ')
        .trim()
        .length;
    const hasResolutionContext = resolutionContextLength >= 50;
    const openSignalQueue = () => {
        router.push(toAnswerlatticeDashboardRoute(
            getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE),
            currentHostname,
        ));
    };

    const drawerTitle = isMobile ? (
        <Flex vertical gap={6} style={{ minWidth: 0, padding: '2px 0' }}>
            <Flex align="center" gap={8} wrap>
                <Text
                    strong
                    style={{
                        color: token.colorTextSecondary,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        letterSpacing: 0.4,
                    }}
                >
                    {ticket.displayId}
                </Text>
                <Badge
                    status={ticket.status === SUPPORT_TICKET_STATUS.RESOLVED ? "success" : "processing"}
                    text={ticket.status}
                />
                {!isClientView && (
                    <Tooltip title={ticketLogsTooltip}>
                        <Button
                            aria-label="View captured browser context"
                            disabled={!canViewTicketLogs}
                            icon={<LuBug size={14} />}
                            onClick={() => setIsLogsModalVisible(true)}
                            size="small"
                            type="text"
                        />
                    </Tooltip>
                )}
            </Flex>
            <Text
                strong
                ellipsis
                style={{
                    display: 'block',
                    fontSize: 16,
                    lineHeight: 1.35,
                    maxWidth: 'calc(100vw - 96px)',
                }}
            >
                {sanitizeFeedbackComment(ticket.subject, 160)}
            </Text>
        </Flex>
    ) : (
        <Flex align="center" gap={12} style={{ padding: '8px 0' }}>
            <Title level={4} style={{ margin: 0 }}>
                Ticket Details
            </Title>
            {from !== "client" && (
                <Tag icon={<LuPen size={14} />} color="green" style={{ margin: 0 }}>
                    Edit Mode
                </Tag>
            )}
            {!isClientView && (
                <Tooltip title={ticketLogsTooltip}>
                    <Button
                        disabled={!canViewTicketLogs}
                        icon={<LuBug size={14} />}
                        onClick={() => setIsLogsModalVisible(true)}
                        size="small"
                    >
                        Logs
                    </Button>
                </Tooltip>
            )}
            <Badge
                status={ticket.status === SUPPORT_TICKET_STATUS.RESOLVED ? "success" : "processing"}
                text={ticket.status}
                style={{ marginLeft: 8 }}
            />
        </Flex>
    );

    const footerContent = (
        <Flex
            justify={isMobile ? "space-between" : "flex-end"}
            gap={8}
            style={isMobile ? { width: '100%' } : undefined}
        >
            {isClientView ? (
                <>
                    <Button
                        onClick={() => setSelectedTicket(null)}
                        style={isMobile ? { flex: 1, height: 44 } : undefined}
                    >
                        Close
                    </Button>
                    {ticket.status !== SUPPORT_TICKET_STATUS.CLOSED && (
                        isMobile ? (
                            <Button
                                type="primary"
                                danger
                                onClick={() => handleTicketUpdate({ status: SUPPORT_TICKET_STATUS.CLOSED })}
                                style={{ flex: 1, height: 44 }}
                            >
                                Close Request
                            </Button>
                        ) : (
                            <Tooltip title="Close this ticket if your issue is resolved. You can always create a new one if needed.">
                                <Button
                                    type="primary"
                                    danger
                                    onClick={() => handleTicketUpdate({ status: SUPPORT_TICKET_STATUS.CLOSED })}
                                >
                                    Close Request
                                </Button>
                            </Tooltip>
                        )
                    )}
                </>
            ) : (
                <>
                    <Button
                        onClick={() => setSelectedTicket(null)}
                        style={isMobile ? { flex: 1, height: 44 } : undefined}
                    >
                        Cancel
                    </Button>
                    {ticket.status !== SUPPORT_TICKET_STATUS.RESOLVED && ticket.status !== SUPPORT_TICKET_STATUS.CLOSED && (
                        <Tooltip title="Mark this ticket as resolved. The customer can still reopen if needed.">
                            <Button
                                type="default"
                                onClick={() => handleTicketUpdate({ ...ticket, status: SUPPORT_TICKET_STATUS.RESOLVED })}
                                style={isMobile ? { flex: 1, height: 44 } : undefined}
                            >
                                Mark as Resolved
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title="Save all changes made to ticket details, priority, category, and tags.">
                        <Button
                            type="primary"
                            onClick={() => handleTicketUpdate(ticket)}
                            style={isMobile ? { flex: 1, height: 44 } : undefined}
                        >
                            Update Ticket
                        </Button>
                    </Tooltip>
                </>
            )}
        </Flex>
    );

    const mobileAttachments = ticket.documents && ticket.documents.length > 0 ? (
        <Card
            size="small"
            title={
                <Flex align="center" gap={8}>
                    <LuPaperclip size={16} />
                    <Text strong>Attachments</Text>
                </Flex>
            }
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 12 } }}
        >
            <Flex vertical gap={10}>
                {ticket.documents.map((item, index) => (
                    item.type?.startsWith('image/') ? (
                        <AntImage
                            key={index}
                            width="100%"
                            height={140}
                            src={item.url}
                            alt={item.name}
                            style={{ borderRadius: 10, objectFit: 'cover' }}
                        />
                    ) : (
                        <Button
                            key={index}
                            block
                            icon={<LuFile />}
                            onClick={() => handleAttachmentOpen(item)}
                            style={{ height: 44, justifyContent: 'flex-start' }}
                        >
                            <Text ellipsis style={{ maxWidth: '100%' }}>{item.name}</Text>
                        </Button>
                    )
                ))}
            </Flex>
        </Card>
    ) : null;

    const mobileClientSummary = (
        <Card
            size="small"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 14 } }}
        >
            <Flex vertical gap={12}>
                <Flex align="center" gap={8} wrap>
                    <SupportTicketStatus ticket={ticket} />
                    <SupportTicketPriority ticket={ticket} />
                    <SupportTicketCategory ticket={ticket} />
                </Flex>
                {ticket.message ? (
                    <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.55 }}>
                        {sanitizeFeedbackComment(ticket.message, 700)}
                    </Text>
                ) : null}
                <Flex gap={8} wrap>
                    <Flex
                        vertical
                        gap={2}
                        style={{
                            background: token.colorFillQuaternary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 10,
                            flex: 1,
                            minWidth: '100%',
                            padding: '8px 10px',
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: 12 }}>Submitted</Text>
                        <Text style={{ fontSize: 13 }}>
                            <DateTimeDisplay value={ticket.createdOn} mode='datetime' />
                        </Text>
                    </Flex>
                    <Flex
                        vertical
                        gap={2}
                        style={{
                            background: token.colorFillQuaternary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 10,
                            flex: 1,
                            minWidth: '100%',
                            padding: '8px 10px',
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: 12 }}>Last update</Text>
                        <Text style={{ fontSize: 13 }}>
                            <DateTimeDisplay value={ticket.modifiedOn || ticket.createdOn} mode='datetime' />
                        </Text>
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    );

    const knowledgeLoopCard = !isClientView ? (
        <Card
            size="small"
            title={
                <Flex align="center" gap={8}>
                    <LuBookOpen size={16} />
                    <Text strong>Knowledge Loop</Text>
                </Flex>
            }
            style={{ borderRadius: isMobile ? 12 : 8, marginTop: isMobile ? undefined : 16 }}
            styles={{ body: { padding: isMobile ? 14 : 12 } }}
        >
            <Flex vertical gap={10}>
                <Flex align="center" gap={8} wrap="wrap">
                    <Tag color={resolvedForKnowledge && hasResolutionContext ? 'success' : resolvedForKnowledge ? 'warning' : 'default'}>
                        {resolvedForKnowledge && hasResolutionContext
                            ? 'Ready for review queue'
                            : resolvedForKnowledge
                                ? 'Needs clearer resolution'
                                : 'Resolve to capture signal'}
                    </Tag>
                    {ticket.contextKeys?.slice(0, 3).map(key => <Tag key={key}>{key}</Tag>)}
                </Flex>
                <Text type="secondary">
                    {resolvedForKnowledge
                        ? hasResolutionContext
                            ? 'Answerlattice uses the last support replies as evidence for repeated-gap proposals. Review recurring patterns in Signal Queue.'
                            : 'Add a clear resolution reply before closing similar tickets so Answerlattice can draft useful knowledge later.'
                        : 'When this ticket is resolved, Answerlattice can turn repeated issues into owner-approved knowledge proposals.'}
                </Text>
                <Button
                    icon={<LuGitPullRequest />}
                    onClick={openSignalQueue}
                    style={{ minHeight: 38 }}
                    block={isMobile}
                >
                    Open Signal Queue
                </Button>
            </Flex>
        </Card>
    ) : null;

    const mobileLayout = (
        <Flex
            vertical
            style={{
                background: token.colorBgLayout,
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
                }}
            >
                <Flex vertical gap={12}>
                    {isClientView ? mobileClientSummary : (
                        <Card size="small" style={{ borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
                            <TicketActions
                                from={from}
                                ticket={ticket}
                                setTicket={setTicket}
                            />
                        </Card>
                    )}
                    {knowledgeLoopCard}
                    {mobileAttachments}
                    <Card
                        size="small"
                        title={
                            <Flex align="center" gap={8}>
                                <LuMessageSquare size={16} />
                                <Text strong>Conversation</Text>
                            </Flex>
                        }
                        extra={
                            <Flex align="center" gap={6}>
                                <LuClock size={14} />
                                <DateTimeDisplay value={ticket.modifiedOn || ticket.createdOn} mode="fromnow" />
                            </Flex>
                        }
                        style={{ borderRadius: 12, minHeight: 0 }}
                        styles={{ body: { height: 'auto', minHeight: 280, padding: 12 } }}
                    >
                        <ConversationTimeline
                            isMobile
                            ticket={ticket}
                            onReply={handleTicketUpdate}
                            onMessageAdded={(updatedTicket) => {
                                setTicket(prev => prev ? { ...prev, ...updatedTicket } : null);
                                onUpdate({ ...ticket, ...updatedTicket });
                            }}
                        />
                    </Card>
                </Flex>
            </div>
        </Flex>
    );

    return (
        <Drawer
            open={Boolean(ticket)}
            onClose={() => setSelectedTicket(null)}
            width={isMobile ? '100vw' : 1200}
            title={drawerTitle}
            closable={true}
            styles={{
                body: isMobile ? {
                    padding: 0,
                    height: 'calc(100dvh - 138px)',
                    overflow: 'hidden'
                } : {
                    padding: 0,
                    height: '100%',
                    overflow: 'hidden'
                },
                footer: isMobile ? {
                    padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
                } : undefined,
                content: isMobile ? {
                    height: '100dvh',
                } : undefined,
            }}
            footer={footerContent}
        >
            {isMobile ? mobileLayout : (
                <Flex style={{ height: '100%' }}>
                    <div
                        style={{
                            width: 380,
                            borderRight: `1px solid ${token.colorBorder}`,
                            overflowY: 'auto',
                            padding: 24
                        }}
                    >
                        <TicketActions
                            from={from}
                            ticket={ticket}
                            setTicket={setTicket}
                        />
                        {knowledgeLoopCard}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}>
                        <Flex vertical gap={16} style={{ height: '100%' }}>
                            <Text strong style={{ fontSize: 16 }}>Conversation</Text>
                            <ConversationTimeline
                                ticket={ticket}
                                onReply={handleTicketUpdate}
                                onMessageAdded={(updatedTicket) => {
                                    // Update local state without calling DB again
                                    setTicket(prev => prev ? { ...prev, ...updatedTicket } : null);
                                    onUpdate({ ...ticket, ...updatedTicket });
                                }}
                            />
                        </Flex>
                    </div>
                </Flex>
            )}
            <TicketLogsView
                open={isLogsModalVisible}
                onClose={() => setIsLogsModalVisible(false)}
                logs={ticket.logs || []}
                clientDebugContext={ticket.clientDebugContext}
            />
        </Drawer>
    );
}

export default TicketDetailView;
