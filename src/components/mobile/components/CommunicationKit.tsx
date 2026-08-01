'use client';

import { withAnalyticsSource, type AnalyticsEntrySource } from '@lib/analytics/sourceAttribution';
import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuMessageCircle, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, Text, Toast } from '../antd';
import type { StoreSpecialHours } from '@type/platform/store';
import {
    getBoundedMobileOwnerStringContext,
    logMobileOwnerFailure,
    type MobileOwnerLogContext,
} from '../utils/mobileOwnerDiagnostics';

const MOBILE_COMMUNICATION_KIT_COPY_UNAVAILABLE = 'mobile_communication_kit_copy_unavailable';
const MOBILE_COMMUNICATION_KIT_COPY_FALLBACK_FAILED = 'mobile_communication_kit_copy_fallback_failed';

interface MobileCommunicationKitProps {
    storeName: string;
    businessType: string;
    businessCategory?: string;
    menuLink: string;
    obpLink?: string;
    projectName?: string;
    activeProjects?: Array<{
        name: string;
        url: string;
    }>;
    address?: string;
    phone?: string;
    workingHours?: Record<string, string>;
    specialHours?: StoreSpecialHours;
    timeZone?: string;
    diagnosticContext?: MobileOwnerLogContext;
}

function hasMobileCommunicationKitClipboardWrite(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}

function hasMobileCommunicationKitCopyFallback(): boolean {
    return typeof document !== 'undefined'
        && Boolean(document.body)
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function';
}

async function copyMobileCommunicationKitMessage(copyMessage: string): Promise<void> {
    let clipboardWriteError: unknown;

    if (hasMobileCommunicationKitClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(copyMessage);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasMobileCommunicationKitCopyFallback()) {
        throw Object.assign(new Error(MOBILE_COMMUNICATION_KIT_COPY_UNAVAILABLE), {
            code: MOBILE_COMMUNICATION_KIT_COPY_UNAVAILABLE,
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
            throw Object.assign(new Error(MOBILE_COMMUNICATION_KIT_COPY_FALLBACK_FAILED), {
                code: MOBILE_COMMUNICATION_KIT_COPY_FALLBACK_FAILED,
            });
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

export default function MobileCommunicationKit({
    activeProjects,
    address,
    businessType,
    businessCategory,
    menuLink,
    obpLink,
    projectName,
    phone,
    storeName,
    timeZone,
    workingHours,
    specialHours,
    diagnosticContext,
}: MobileCommunicationKitProps) {
    const t = useTranslations('MobileCommunicationKit');
    const todayResult = useMemo(
        () => getTodayHours(workingHours, timeZone, specialHours),
        [specialHours, timeZone, workingHours],
    );

    const input: MessageTemplateInput = useMemo(() => ({
        activeProjects,
        address,
        businessType,
        businessCategory,
        isClosedToday: todayResult.isClosed,
        menuLink,
        obpLink,
        phone,
        projectName,
        storeName,
        todayHours: todayResult.hours,
    }), [activeProjects, address, businessType, businessCategory, menuLink, obpLink, phone, projectName, storeName, todayResult]);

    const templates = useMemo(() => generateMessageTemplates(input), [input]);
    const copyTemplates = useMemo(() => generateMessageTemplates(withSource(input, 'copy_link')), [input]);
    const nativeShareTemplates = useMemo(() => generateMessageTemplates(withSource(input, 'native_share')), [input]);
    const whatsappTemplates = useMemo(() => generateMessageTemplates(withSource(input, 'whatsapp')), [input]);

    return (
        <Flex gap={10} vertical>
            <Flex gap={4} vertical>
                <Text strong style={{ fontSize: 15 }}>{t('title')}</Text>
                <Text type="secondary">{t('subtitle')}</Text>
            </Flex>
            <Flex gap={12} vertical>
                {templates.map((template) => (
                    <MobileMessageCard
                        key={template.id}
                        copyMessage={copyTemplates.find((entry) => entry.id === template.id)?.message || template.message}
                        diagnosticContext={diagnosticContext}
                        nativeShareMessage={nativeShareTemplates.find((entry) => entry.id === template.id)?.message || template.message}
                        template={template}
                        whatsappMessage={whatsappTemplates.find((entry) => entry.id === template.id)?.message || template.message}
                    />
                ))}
            </Flex>
        </Flex>
    );
}

function withSource(input: MessageTemplateInput, source: AnalyticsEntrySource): MessageTemplateInput {
    return {
        ...input,
        menuLink: withAnalyticsSource(input.menuLink, source),
        obpLink: input.obpLink ? withAnalyticsSource(input.obpLink, source) : undefined,
        activeProjects: input.activeProjects?.map((project) => ({
            ...project,
            url: withAnalyticsSource(project.url, source),
        })),
    };
}

function MobileMessageCard({
    copyMessage,
    diagnosticContext,
    nativeShareMessage,
    template,
    whatsappMessage,
}: {
    copyMessage: string;
    diagnosticContext?: MobileOwnerLogContext;
    nativeShareMessage: string;
    template: MessageTemplate;
    whatsappMessage: string;
}) {
    const t = useTranslations('MobileCommunicationKit');
    const { token } = theme.useToken();
    const [copied, setCopied] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const buildCommunicationKitLogContext = (action: 'copy' | 'native_share' | 'whatsapp_open') => ({
        ...diagnosticContext,
        ...getBoundedMobileOwnerStringContext('templateId', template.id),
        ...getBoundedMobileOwnerStringContext('templateTitle', template.title),
        action,
        copyMessageLength: copyMessage.length,
        nativeShareMessageLength: nativeShareMessage.length,
        supportsNativeShare,
        whatsappMessageLength: whatsappMessage.length,
    });

    const handleCopy = async () => {
        try {
            await copyMobileCommunicationKitMessage(copyMessage);
            setCopied(true);
            Toast.show({ content: t('messageCopied'), duration: 1500 });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            logMobileOwnerFailure('mobile_communication_kit_copy_failed', error, {
                ...buildCommunicationKitLogContext('copy'),
                hasClipboardWrite: hasMobileCommunicationKitClipboardWrite(),
                hasCopyFallback: hasMobileCommunicationKitCopyFallback(),
            });
            Toast.show({ content: t('copyFailed'), duration: 1500 });
        }
    };

    const handleShare = async () => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({
                text: nativeShareMessage,
                title: template.title,
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            logMobileOwnerFailure('mobile_communication_kit_native_share_failed', error, buildCommunicationKitLogContext('native_share'));
            Toast.show({ content: t('copyFailed'), duration: 1500 });
        }
    };

    const handleWhatsAppOpen = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
        try {
            const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('mobile_communication_kit_whatsapp_open_blocked');
            }
        } catch (error) {
            logMobileOwnerFailure('mobile_communication_kit_whatsapp_open_failed', error, {
                ...buildCommunicationKitLogContext('whatsapp_open'),
                whatsappUrlLength: whatsappUrl.length,
            });
            Toast.show({ content: t('copyFailed'), duration: 1500 });
        }
    };

    return (
        <Card style={{ borderRadius: 20 }}>
            <Flex gap={14} vertical>
                <Flex gap={4} vertical>
                    <Text strong>{template.title}</Text>
                    <Text type="secondary">{template.description}</Text>
                </Flex>
                <Card
                    size="small"
                    style={{
                        backgroundColor: token.colorFillAlter,
                        borderColor: token.colorBorderSecondary,
                        borderRadius: 16,
                    }}
                >
                    <Text>{template.message}</Text>
                </Card>
                <Flex gap={10}>
                    <ActionTile
                        icon={copied ? <LuCheck size={18} /> : <LuCopy size={18} />}
                        onClick={() => void handleCopy()}
                    />
                    {supportsNativeShare ? (
                        <ActionTile
                            icon={<LuShare2 size={18} />}
                            onClick={() => void handleShare()}
                        />
                    ) : null}
                    <ActionTile
                        iconColor={token.colorSuccess}
                        icon={<LuMessageCircle size={18} />}
                        onClick={handleWhatsAppOpen}
                    />
                </Flex>
            </Flex>
        </Card>
    );
}

function ActionTile({ icon, iconColor, onClick }: { icon: React.ReactNode; iconColor?: string; onClick: () => void }) {
    const { token } = theme.useToken();

    return (
        <Button
            fill="outline"
            onClick={onClick}
            size="small"
            style={{
                borderColor: token.colorBorderSecondary,
                borderRadius: 16,
                flex: 1,
                minHeight: 48,
                minWidth: 0,
                paddingBlock: 0,
                paddingInline: 0,
            }}
        >
            <Flex align="center" justify="center" style={{ color: iconColor || token.colorText, minHeight: 20 }}>
                {icon}
            </Flex>
        </Button>
    );
}
