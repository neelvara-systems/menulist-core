'use client';

import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { LuCheck, LuCopy, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, Text, Toast } from '../antd';

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
        <Flex gap={10} vertical>
            <Flex gap={4} vertical>
                <Text strong style={{ fontSize: 15 }}>{t('title')}</Text>
                <Text type="secondary">{t('subtitle')}</Text>
            </Flex>
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
                        iconColor={token.colorSuccess}
                        icon={<FaWhatsapp size={18} />}
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(template.message)}`, '_blank')}
                    />
                    {supportsNativeShare ? (
                        <ActionTile
                            icon={<LuShare2 size={18} />}
                            onClick={() => void handleShare()}
                        />
                    ) : null}
                    <ActionTile
                        icon={copied ? <LuCheck size={18} /> : <LuCopy size={18} />}
                        onClick={() => void handleCopy()}
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
