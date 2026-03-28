'use client';

import { updateTicket } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { SUPPORT_TICKET_STATUS, SupportTicketType, TicketMessage } from '@type/supportTicket';
import { Badge, Button, Drawer, Flex, message, Tag, theme, Tooltip, Typography } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { LuPen } from 'react-icons/lu';
import ConversationTimeline from './ConversationTimeline';
import TicketActions from './TicketActions';
import TicketLogsView from './TicketLogsView';

const { Text, Title } = Typography;

interface TicketDetailViewProps {
    activeTicket: SupportTicketType;
    onUpdate: (tickets: any) => void;
    setSelectedTicket: (ticket: SupportTicketType | null) => void;
    from?: string;//platform or client
}

function TicketDetailView({ activeTicket, onUpdate, setSelectedTicket, from }: TicketDetailViewProps) {
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const [ticket, setTicket] = useState<SupportTicketType | null>(activeTicket);
    const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);

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

        // Create a copy to avoid mutating the original
        const updatePayload = { ...values };

        // Check if status has changed
        const statusChanged = values.status && values.status !== activeTicket.status;

        // If status changed, create a system message
        if (statusChanged) {
            const systemMessage: TicketMessage = {
                id: `system-${Date.now()}`,
                text: `Status changed from ${activeTicket.status} to ${values.status}`,
                type: 'system',
                sender: {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                },
                timestamp: Timestamp.now(),
            };

            // Add system message to the messages array
            updatePayload.messages = [...(ticket.messages || []), systemMessage];
        } else {
            // IMPORTANT: Don't include messages field if status didn't change
            // This prevents overwriting messages in the database
            delete updatePayload.messages;
        }

        dispatch(startLoader('Updating ticket...'));
        try {
            const res = await updateTicket({ ...updatePayload, id: ticket.id });
            onUpdate({ ...res, ...updatePayload, id: ticket.id });

            // Ticket → Knowledge Loop (Item #9): emit enriched resolution signal
            // Fire-and-forget — never blocks ticket update flow
            if (statusChanged && (values.status === SUPPORT_TICKET_STATUS.RESOLVED || values.status === SUPPORT_TICKET_STATUS.CLOSED)) {
                import('@lib/canonica/signalEmitter').then(({ emitTicketResolutionSignal }) => {
                    emitTicketResolutionSignal({
                        ticketId: ticket.id,
                        subject: ticket.subject || '',
                        messages: ticket.messages || [],
                        category: ticket.category || '',
                        tId: Number(ticket.tId),
                        sId: Number(ticket.sId),
                        resolvedBy: session.user.email || session.user.name || 'unknown',
                    }).catch(() => { /* fire-and-forget */ });
                }).catch(() => { /* dynamic import fail — non-blocking */ });
            }

            setSelectedTicket(null);
            message.success('Ticket updated successfully.');
        } catch (error) {
            message.error('Failed to update ticket.');
        } finally {
            dispatch(stopLoader('Updating ticket...'));
        }
    };

    if (!Boolean(activeTicket) || !ticket) return null;

    return (
        <Drawer
            open={Boolean(ticket)}
            onClose={() => setSelectedTicket(null)}
            width={1200}
            title={
                <Flex align="center" gap={12} style={{ padding: '8px 0' }}>
                    <Title level={4} style={{ margin: 0 }}>
                        Ticket Details
                    </Title>
                    {from !== "client" && (
                        <Tag icon={<LuPen size={14} />} color="green" style={{ margin: 0 }}>
                            Edit Mode
                        </Tag>
                    )}
                    <Badge
                        status={ticket.status === SUPPORT_TICKET_STATUS.RESOLVED ? "success" : "processing"}
                        text={ticket.status}
                        style={{ marginLeft: 8 }}
                    />
                </Flex>
            }
            closable={true}
            styles={{
                body: {
                    padding: 0,
                    height: '100%'
                }
            }}
            footer={
                <Flex justify="flex-end" gap={8}>
                    {from === "client" ? (
                        <>
                            <Button onClick={() => setSelectedTicket(null)}>Close</Button>
                            {ticket.status !== SUPPORT_TICKET_STATUS.CLOSED && (
                                <Tooltip title="Close this ticket if your issue is resolved. You can always create a new one if needed.">
                                    <Button
                                        type="primary"
                                        danger
                                        onClick={() => handleTicketUpdate({ status: SUPPORT_TICKET_STATUS.CLOSED })}
                                    >
                                        Close Request
                                    </Button>
                                </Tooltip>
                            )}
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setSelectedTicket(null)}>Cancel</Button>
                            {ticket.status !== SUPPORT_TICKET_STATUS.RESOLVED && ticket.status !== SUPPORT_TICKET_STATUS.CLOSED && (
                                <Tooltip title="Mark this ticket as resolved. The customer can still reopen if needed.">
                                    <Button
                                        type="default"
                                        onClick={() => handleTicketUpdate({ ...ticket, status: SUPPORT_TICKET_STATUS.RESOLVED })}
                                    >
                                        Mark as Resolved
                                    </Button>
                                </Tooltip>
                            )}
                            <Tooltip title="Save all changes made to ticket details, priority, category, and tags.">
                                <Button
                                    type="primary"
                                    onClick={() => handleTicketUpdate(ticket)}
                                >
                                    Update Ticket
                                </Button>
                            </Tooltip>
                        </>
                    )}
                </Flex>
            }
        >
            {/* Two-Column Layout */}
            <Flex style={{ height: '100%' }}>
                {/* Left Panel - Ticket Details */}
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
                </div>

                {/* Right Panel - Conversation */}
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
            <TicketLogsView
                open={isLogsModalVisible}
                onClose={() => setIsLogsModalVisible(false)}
                logs={ticket.logs || []}
            />
        </Drawer>
    );
}

export default TicketDetailView;

