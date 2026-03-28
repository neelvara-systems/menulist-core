'use client';

/**
 * Customer Communication Kit — Desktop Component
 *
 * Pre-generated message templates that owners copy-paste into WhatsApp/SMS.
 * Pure UI — reads existing store data, zero Firebase cost.
 *
 * @see __docs__/customer-communication-kit/README.md
 */

import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { Button, Card, Flex, message, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { LuCheck, LuCopy, LuMessageSquare } from 'react-icons/lu';

const { Title, Text } = Typography;

interface CommunicationKitProps {
    storeName: string;
    businessType: string;
    menuLink: string;
    address?: string;
    phone?: string;
    workingHours?: Record<string, string>;
    timeZone?: string;
    themeToken: any;
}

export default function CommunicationKit({
    storeName,
    businessType,
    menuLink,
    address,
    phone,
    workingHours,
    timeZone,
    themeToken,
}: CommunicationKitProps) {
    const todayResult = useMemo(() => getTodayHours(workingHours, timeZone), [workingHours, timeZone]);

    const input: MessageTemplateInput = useMemo(() => ({
        storeName,
        businessType,
        menuLink,
        address,
        phone,
        todayHours: todayResult.hours,
        isClosedToday: todayResult.isClosed,
    }), [storeName, businessType, menuLink, address, phone, todayResult]);

    const templates = useMemo(() => generateMessageTemplates(input), [input]);

    return (
        <div>
            <Flex gap={6} align="center" style={{ marginBottom: 12 }}>
                <LuMessageSquare size={18} />
                <Title level={5} style={{ margin: 0 }}>Customer Messages</Title>
            </Flex>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                Ready-to-send replies — copy and paste into WhatsApp, SMS, or any messaging app
            </Text>

            <Flex vertical gap={12}>
                {templates.map((tmpl) => (
                    <MessageCard
                        key={tmpl.id}
                        template={tmpl}
                        themeToken={themeToken}
                    />
                ))}
            </Flex>
        </div>
    );
}

// ── Message Card ──────────────────────────────────────────────────

interface MessageCardProps {
    template: MessageTemplate;
    themeToken: any;
}

function MessageCard({ template, themeToken }: MessageCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(template.message);
            setCopied(true);
            message.success('Message copied');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            message.error('Failed to copy');
        }
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(template.message)}`, '_blank');
    };

    return (
        <Card size="small" styles={{ body: { padding: 16 } }}>
            <Flex vertical gap={10}>
                <Flex vertical gap={2}>
                    <Text strong style={{ fontSize: 14 }}>{template.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{template.description}</Text>
                </Flex>

                {/* Message preview — styled as chat bubble */}
                <div
                    style={{
                        background: themeToken.colorBgLayout,
                        borderRadius: 10,
                        padding: '12px 14px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: themeToken.colorText,
                        border: `1px solid ${themeToken.colorBorderSecondary}`,
                    }}
                >
                    {template.message}
                </div>

                {/* Actions */}
                <Flex gap={8}>
                    <Button
                        size="small"
                        type="primary"
                        icon={copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                        onClick={handleCopy}
                    >
                        {copied ? 'Copied' : 'Copy Message'}
                    </Button>
                    <Button
                        size="small"
                        icon={<FaWhatsapp size={14} />}
                        onClick={handleWhatsApp}
                        style={{ color: '#25D366', borderColor: '#25D366' }}
                    >
                        Send via WhatsApp
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
