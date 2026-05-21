import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { FEATURE_FLAGS } from '@config/features';
import { getProductSurfacesForSession } from '@database/canonica/productSurfaces';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import SupportTicketCategory from '@organisms/SupportTicket/SupportTicketCategory';
import SupportTicketPriority from '@organisms/SupportTicket/SupportTicketPriority';
import SupportTicketStatus from '@organisms/SupportTicket/SupportTicketStatus';
import { PLATFORM_SUPPORT_TICKET_TAG_OPTIONS, SUPPORT_TICKET_CATEGORY, SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { Image as AntImage, Divider, Flex, Input, Select, Typography, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { LuPaperclip } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface TicketActionsProps {
    ticket: SupportTicketType;
    setTicket: (ticket: SupportTicketType) => void;
    from?: string;//platform or client
}

const TicketActions: React.FC<TicketActionsProps> = ({ ticket, setTicket, from }) => {
    const { token } = theme.useToken();
    const [surfaceOptions, setSurfaceOptions] = useState<Array<{ label: string; value: string }>>([]);

    const handleUpdate = (key: string, value: string | string[]) => {
        setTicket({ ...ticket, [key]: value });
    };

    useEffect(() => {
        if (from !== 'platform' || !FEATURE_FLAGS.ENABLE_CANONICA_PRODUCT_SURFACES) return;
        let mounted = true;
        getProductSurfacesForSession()
            .then((surfaces = []) => {
                if (!mounted) return;
                setSurfaceOptions(
                    surfaces
                        .filter(surface => surface.active !== false)
                        .map(surface => ({ label: surface.label, value: surface.key })),
                );
            })
            .catch(() => undefined);
        return () => { mounted = false; };
    }, [from]);

    return (
        <Flex vertical gap={24}>
            {/* Ticket Header */}
            <Flex vertical gap={12}>
                <Text
                    strong
                    style={{
                        fontFamily: 'monospace',
                        fontSize: 15,
                        color: token.colorTextSecondary,
                        letterSpacing: 0.5
                    }}
                >
                    {ticket.displayId}
                </Text>
                <Title level={4} style={{ margin: 0, fontWeight: 600, lineHeight: 1.3 }}>
                    {sanitizeFeedbackComment(ticket.subject, 200)}
                </Title>
                {ticket.message && (
                    <Paragraph 
                        style={{ 
                            margin: 0, 
                            fontSize: 14, 
                            lineHeight: 1.6,
                            color: token.colorTextSecondary 
                        }}
                    >
                        {sanitizeFeedbackComment(ticket.message, 1000)}
                    </Paragraph>
                )}
                <Flex align="center" gap={8} style={{ marginTop: 4 }}>
                    <SupportTicketPriority ticket={ticket} />
                    <DateTimeDisplay
                        style={{ marginLeft: 'auto', fontSize: 12 }}
                        label="Created"
                        value={ticket.createdOn}
                        mode='datetime'
                    />
                </Flex>
            </Flex>

            <Divider style={{ margin: 0 }} />

            {from == "platform" && (
                <Flex vertical gap={16}>
                    <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: token.colorTextSecondary }}>
                        Requester Info
                    </Text>
                    <Flex vertical gap={16}>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>Tenant</Text>
                            <Text style={{ fontSize: 13 }}>{ticket.clientDetails?.tenantName || "-"}</Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>Store</Text>
                            <Text style={{ fontSize: 13 }}>{ticket.clientDetails?.storeName || "-"}</Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
                            <Text style={{ fontSize: 13 }}>{ticket.clientDetails?.email || "-"}</Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>Phone</Text>
                            <Text style={{ fontSize: 13 }}>{ticket.clientDetails?.phone || "-"}</Text>
                        </Flex>
                    </Flex>
                </Flex>
            )}

            {/* Details Section */}
            <Flex vertical gap={16}>
                <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: token.colorTextSecondary }}>
                    {from === "client" ? "Details" : "Properties"}
                </Text>
                <Flex vertical gap={16}>
                    {from === "client" ? (
                        <>
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                                <SupportTicketStatus ticket={ticket} />
                            </Flex>
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 12 }}>Priority</Text>
                                <SupportTicketPriority ticket={ticket} />
                            </Flex>
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 12 }}>Category</Text>
                                <SupportTicketCategory ticket={ticket} />
                            </Flex>
                            <Divider style={{ margin: '8px 0' }} />
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 12 }}>Submitted</Text>
                                <Text style={{ fontSize: 13 }}>
                                    <DateTimeDisplay value={ticket.createdOn} mode='datetime' />
                                </Text>
                            </Flex>
                            <Flex justify="space-between" align="center">
                                <Text type="secondary" style={{ fontSize: 12 }}>Last Updated</Text>
                                <Text style={{ fontSize: 13 }}>
                                    <DateTimeDisplay value={ticket.modifiedOn} mode='datetime' />
                                </Text>
                            </Flex>
                        </>
                    ) : (
                        <>
                            <Flex vertical gap={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                                <Select 
                                    value={ticket.status} 
                                    style={{ width: '100%' }} 
                                    onChange={(value) => handleUpdate('status', value)}
                                >
                                    {Object.values(SUPPORT_TICKET_STATUS).map(s => (
                                        <Option key={s} value={s}>
                                            <SupportTicketStatus ticket={{ ...ticket, status: s }} />
                                        </Option>
                                    ))}
                                </Select>
                            </Flex>
                            <Flex vertical gap={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Priority</Text>
                                <Select 
                                    value={ticket.priority} 
                                    style={{ width: '100%' }} 
                                    onChange={(value) => handleUpdate('priority', value)}
                                >
                                    {Object.values(SUPPORT_TICKET_PRIORITY).map(p => (
                                        <Option key={p} value={p}>
                                            <SupportTicketPriority ticket={{ ...ticket, priority: p }} />
                                        </Option>
                                    ))}
                                </Select>
                            </Flex>
                            <Flex vertical gap={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Category</Text>
                                <Select 
                                    value={ticket.category} 
                                    style={{ width: '100%' }} 
                                    onChange={(value) => handleUpdate('category', value)}
                                >
                                    {Object.values(SUPPORT_TICKET_CATEGORY).map(c => (
                                        <Option key={c} value={c}>{c}</Option>
                                    ))}
                                </Select>
                            </Flex>
                        </>
                    )}
                </Flex>
            </Flex>

            {ticket.documents && ticket.documents.length > 0 && (
                <Flex vertical gap={16}>
                    <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: token.colorTextSecondary }}>
                        Attachments
                    </Text>
                    <Flex vertical gap={12}>
                        {ticket.documents.map((item, index) => (
                            item.type.startsWith('image/') ? (
                                <AntImage.PreviewGroup key={index}>
                                    <AntImage
                                        width="100%"
                                        height={120}
                                        src={item.url}
                                        alt={item.name}
                                        style={{ objectFit: 'cover', borderRadius: 8 }}
                                    />
                                </AntImage.PreviewGroup>
                            ) : (
                                <Flex 
                                    key={index}
                                    align="center" 
                                    gap={12}
                                    style={{ 
                                        padding: 12, 
                                        border: `1px solid ${token.colorBorder}`, 
                                        borderRadius: 8,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(item.url, '_blank')}
                                >
                                    <LuPaperclip size={16} style={{ color: token.colorTextSecondary }} />
                                    <Flex vertical gap={2} style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13 }}>{item.name}</Text>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {(item.size / 1024).toFixed(2)} KB
                                        </Text>
                                    </Flex>
                                </Flex>
                            )
                        ))}
                    </Flex>
                </Flex>
            )}

            {from == "platform" && (
                <Flex vertical gap={16}>
                    <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: token.colorTextSecondary }}>
                        Internal Notes
                    </Text>
                    <Flex vertical gap={12}>
                        <Input.TextArea
                            value={ticket.platformNotes}
                            onChange={(e) => handleUpdate('platformNotes', e.target.value)}
                            placeholder="Add internal notes..."
                            rows={4}
                            style={{ borderRadius: 8 }}
                        />
                        <Select
                            mode="multiple"
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Add internal tags..."
                            value={ticket.platformTags}
                            onChange={(value) => handleUpdate('platformTags', value)}
                        >
                            {PLATFORM_SUPPORT_TICKET_TAG_OPTIONS.map(tag => <Option key={tag} value={tag}>{tag}</Option>)}
                        </Select>
                        {FEATURE_FLAGS.ENABLE_CANONICA_PRODUCT_SURFACES && (
                            <Select
                                mode="multiple"
                                allowClear
                                style={{ width: '100%' }}
                                placeholder="Link to product surfaces..."
                                value={ticket.contextKeys || []}
                                options={surfaceOptions}
                                onChange={(value) => handleUpdate('contextKeys', value)}
                            />
                        )}
                    </Flex>
                </Flex>
            )}

        </Flex>
    );
};

export default TicketActions;
