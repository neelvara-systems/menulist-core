'use client';

import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuMessageSquare, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, Text, Title, Toast } from '../antd';

interface MobileCommunicationKitProps {
    storeName: string;
    businessType: string;
    menuLink: string;
    address?: string;
    phone?: string;
    workingHours?: Record<string, string>;
    timeZone?: string;
}

export default function MobileCommunicationKit({
    address,
    businessType,
    menuLink,
    phone,
    storeName,
    timeZone,
    workingHours,
}: MobileCommunicationKitProps) {
    const t = useTranslations('MobileCommunicationKit');
    const todayResult = useMemo(() => getTodayHours(workingHours, timeZone), [workingHours, timeZone]);

    const input: MessageTemplateInput = useMemo(() => ({
        address,
        businessType,
        isClosedToday: todayResult.isClosed,
        menuLink,
        phone,
        storeName,
        todayHours: todayResult.hours,
    }), [address, businessType, menuLink, phone, storeName, todayResult]);

    const templates = useMemo(() => generateMessageTemplates(input), [input]);

    return (
        <Flex gap={12} vertical>
            <Flex align="center" gap={8}>
                <LuMessageSquare size={16} />
                <Title level={5} style={{ margin: 0 }}>{t('title')}</Title>
            </Flex>
            <Text type="secondary">{t('subtitle')}</Text>
            <Flex gap={12} vertical>
                {templates.map((template) => (
                    <MobileMessageCard key={template.id} template={template} />
                ))}
            </Flex>
        </Flex>
    );
}

function MobileMessageCard({ template }: { template: MessageTemplate }) {
    const t = useTranslations('MobileCommunicationKit');
    const { token } = theme.useToken();
    const [copied, setCopied] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(template.message);
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
                text: template.message,
                title: template.title,
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            Toast.show({ content: t('copyFailed'), duration: 1500 });
        }
    };

    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex gap={4} vertical>
                    <Text strong>{template.title}</Text>
                    <Text type="secondary">{template.description}</Text>
                </Flex>
                <Card style={{ backgroundColor: token.colorFillAlter }}>
                    <Text>{template.message}</Text>
                </Card>
                <Flex gap={8} wrap="wrap">
                    <Button
                        block
                        color="success"
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(template.message)}`, '_blank')}
                        size="small"
                    >
                        <Flex align="center" gap={6}>
                            <LuMessageSquare size={14} />
                            <Text>{t('whatsApp')}</Text>
                        </Flex>
                    </Button>
                    {supportsNativeShare ? (
                        <Button block fill="outline" onClick={() => void handleShare()} size="small">
                            <Flex align="center" gap={6}>
                                <LuShare2 size={14} />
                                <Text>Share</Text>
                            </Flex>
                        </Button>
                    ) : null}
                    <Button block fill="outline" onClick={() => void handleCopy()} size="small">
                        <Flex align="center" gap={6}>
                            {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                            <Text>{copied ? t('copied') : t('copy')}</Text>
                        </Flex>
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
