'use client';

/**
 * Customer Communication Kit — Desktop Component
 *
 * Pre-generated message templates that owners copy-paste into WhatsApp/SMS.
 * Pure UI — reads existing store data, zero Firebase cost.
 *
 * @see __docs__/customer-communication-kit/README.md
 */

import { withAnalyticsSource, type AnalyticsEntrySource } from '@lib/analytics/sourceAttribution';
import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { Button, Card, Flex, message, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuMessageCircle, LuMessageSquare } from 'react-icons/lu';

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
    const copyTemplates = useMemo(() => generateMessageTemplates(withEntrySource(input, 'copy_link')), [input]);
    const whatsappTemplates = useMemo(() => generateMessageTemplates(withEntrySource(input, 'whatsapp')), [input]);

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
                        copyMessage={copyTemplates.find((entry) => entry.id === tmpl.id)?.message || tmpl.message}
                        template={tmpl}
                        themeToken={themeToken}
                        whatsappMessage={whatsappTemplates.find((entry) => entry.id === tmpl.id)?.message || tmpl.message}
                    />
                ))}
            </Flex>
        </div>
    );
}

function withEntrySource(input: MessageTemplateInput, entrySource: AnalyticsEntrySource): MessageTemplateInput {
    return {
        ...input,
        menuLink: withAnalyticsSource(input.menuLink, entrySource),
    };
}

// ── Message Card ──────────────────────────────────────────────────

interface MessageCardProps {
    copyMessage: string;
    template: MessageTemplate;
    themeToken: any;
    whatsappMessage: string;
}

function MessageCard({ copyMessage, template, themeToken, whatsappMessage }: MessageCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(copyMessage);
            setCopied(true);
            message.success('Message copied');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            message.error('Failed to copy');
        }
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
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
                <Flex gap={8} wrap="wrap">
                    <Button
                        size="small"
                        type="primary"
                        icon={copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                        onClick={handleCopy}
                        style={{ flex: '1 1 140px', minHeight: 36 }}
                    >
                        {copied ? 'Copied' : 'Copy Message'}
                    </Button>
                    <Button
                        size="small"
                        icon={<LuMessageCircle size={14} />}
                        onClick={handleWhatsApp}
                        style={{ borderColor: themeToken.colorSuccessBorder, color: themeToken.colorSuccess, flex: '1 1 160px', minHeight: 36 }}
                    >
                        Send via WhatsApp
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
