'use client';

import { withAnalyticsSource, type AnalyticsEntrySource } from '@lib/analytics/sourceAttribution';
import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuMessageCircle, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, Text, Toast } from '../antd';

interface MobileCommunicationKitProps {
    storeName: string;
    businessType: string;
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
    timeZone?: string;
}

export default function MobileCommunicationKit({
    activeProjects,
    address,
    businessType,
    menuLink,
    obpLink,
    projectName,
    phone,
    storeName,
    timeZone,
    workingHours,
}: MobileCommunicationKitProps) {
    const t = useTranslations('MobileCommunicationKit');
    const todayResult = useMemo(() => getTodayHours(workingHours, timeZone), [workingHours, timeZone]);

    const input: MessageTemplateInput = useMemo(() => ({
        activeProjects,
        address,
        businessType,
        isClosedToday: todayResult.isClosed,
        menuLink,
        obpLink,
        phone,
        projectName,
        storeName,
        todayHours: todayResult.hours,
    }), [activeProjects, address, businessType, menuLink, obpLink, phone, projectName, storeName, todayResult]);

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
    nativeShareMessage,
    template,
    whatsappMessage,
}: {
    copyMessage: string;
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

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(copyMessage);
            setCopied(true);
            Toast.show({ content: t('messageCopied'), duration: 1500 });
            setTimeout(() => setCopied(false), 2000);
        } catch {
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
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank')}
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
