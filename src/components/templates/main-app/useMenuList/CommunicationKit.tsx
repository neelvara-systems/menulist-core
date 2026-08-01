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
import type { StoreSpecialHours } from '@type/platform/store';
import {
    getBoundedUseMenuListStringContext,
    logUseMenuListFailure,
    type UseMenuListLogContext,
} from './useMenuListDiagnostics';

const { Title, Text } = Typography;
const USE_MENULIST_COMMUNICATION_KIT_COPY_UNAVAILABLE = 'use_menulist_communication_kit_copy_unavailable';
const USE_MENULIST_COMMUNICATION_KIT_COPY_FALLBACK_FAILED = 'use_menulist_communication_kit_copy_fallback_failed';

interface CommunicationKitProps {
    storeName: string;
    businessType: string;
    businessCategory?: string;
    menuLink: string;
    address?: string;
    phone?: string;
    workingHours?: Record<string, string>;
    specialHours?: StoreSpecialHours;
    timeZone?: string;
    themeToken: any;
    diagnosticContext?: UseMenuListLogContext;
}

function hasUseMenuListCommunicationKitClipboardWrite(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}

function hasUseMenuListCommunicationKitCopyFallback(): boolean {
    return typeof document !== 'undefined'
        && Boolean(document.body)
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function';
}

async function copyUseMenuListCommunicationKitMessage(copyMessage: string): Promise<void> {
    let clipboardWriteError: unknown;

    if (hasUseMenuListCommunicationKitClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(copyMessage);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasUseMenuListCommunicationKitCopyFallback()) {
        throw Object.assign(new Error(USE_MENULIST_COMMUNICATION_KIT_COPY_UNAVAILABLE), {
            code: USE_MENULIST_COMMUNICATION_KIT_COPY_UNAVAILABLE,
            clipboardWriteRejected: Boolean(clipboardWriteError),
        });
    }

    const textarea = document.createElement('textarea');
    textarea.value = copyMessage;
    textarea.readOnly = true;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw Object.assign(new Error(USE_MENULIST_COMMUNICATION_KIT_COPY_FALLBACK_FAILED), {
                code: USE_MENULIST_COMMUNICATION_KIT_COPY_FALLBACK_FAILED,
            });
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

export default function CommunicationKit({
    storeName,
    businessType,
    businessCategory,
    menuLink,
    address,
    phone,
    workingHours,
    specialHours,
    timeZone,
    themeToken,
    diagnosticContext,
}: CommunicationKitProps) {
    const todayResult = useMemo(
        () => getTodayHours(workingHours, timeZone, specialHours),
        [specialHours, timeZone, workingHours],
    );

    const input: MessageTemplateInput = useMemo(() => ({
        storeName,
        businessType,
        businessCategory,
        menuLink,
        address,
        phone,
        todayHours: todayResult.hours,
        isClosedToday: todayResult.isClosed,
    }), [storeName, businessType, businessCategory, menuLink, address, phone, todayResult]);

    const templates = useMemo(() => generateMessageTemplates(input), [input]);
    const copyTemplates = useMemo(() => generateMessageTemplates(withEntrySource(input, 'copy_link')), [input]);
    const whatsappTemplates = useMemo(() => generateMessageTemplates(withEntrySource(input, 'whatsapp')), [input]);
    const communicationDiagnosticContext = useMemo<UseMenuListLogContext>(() => ({
        ...diagnosticContext,
        ...getBoundedUseMenuListStringContext('storeName', storeName),
        ...getBoundedUseMenuListStringContext('businessType', businessType),
        ...getBoundedUseMenuListStringContext('businessCategory', businessCategory),
        ...getBoundedUseMenuListStringContext('menuLink', menuLink),
        ...getBoundedUseMenuListStringContext('address', address),
        ...getBoundedUseMenuListStringContext('phone', phone),
        ...getBoundedUseMenuListStringContext('timeZone', timeZone),
        hasWorkingHours: Boolean(workingHours),
        isClosedToday: todayResult.isClosed,
        templateCount: templates.length,
    }), [address, businessCategory, businessType, diagnosticContext, menuLink, phone, storeName, templates.length, timeZone, todayResult.isClosed, workingHours]);

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
                        diagnosticContext={communicationDiagnosticContext}
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
    diagnosticContext?: UseMenuListLogContext;
    template: MessageTemplate;
    themeToken: any;
    whatsappMessage: string;
}

function MessageCard({ copyMessage, diagnosticContext, template, themeToken, whatsappMessage }: MessageCardProps) {
    const [copied, setCopied] = useState(false);

    const buildCommunicationKitLogContext = (action: 'copy' | 'whatsapp_open'): UseMenuListLogContext => ({
        ...diagnosticContext,
        ...getBoundedUseMenuListStringContext('templateId', template.id),
        ...getBoundedUseMenuListStringContext('templateTitle', template.title),
        action,
        copyMessageLength: copyMessage.length,
        whatsappMessageLength: whatsappMessage.length,
    });

    const handleCopy = async () => {
        try {
            await copyUseMenuListCommunicationKitMessage(copyMessage);
            setCopied(true);
            message.success('Message copied');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            logUseMenuListFailure('use_menulist_communication_kit_copy_failed', error, {
                ...buildCommunicationKitLogContext('copy'),
                hasClipboardWrite: hasUseMenuListCommunicationKitClipboardWrite(),
                hasCopyFallback: hasUseMenuListCommunicationKitCopyFallback(),
            });
            message.error('Failed to copy');
        }
    };

    const handleWhatsApp = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
        try {
            const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('use_menulist_communication_kit_whatsapp_open_blocked');
            }
        } catch (error) {
            logUseMenuListFailure('use_menulist_communication_kit_whatsapp_open_failed', error, {
                ...buildCommunicationKitLogContext('whatsapp_open'),
                whatsappUrlLength: whatsappUrl.length,
            });
            message.error('Failed to open WhatsApp');
        }
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
