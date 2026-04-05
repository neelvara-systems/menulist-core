'use client';

import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuMessageSquare } from 'react-icons/lu';
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
    const [copied, setCopied] = useState(false);

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

    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex gap={4} vertical>
                    <Text strong>{template.title}</Text>
                    <Text type="secondary">{template.description}</Text>
                </Flex>
                <Card style={{ backgroundColor: '#fafafa' }}>
                    <Text>{template.message}</Text>
                </Card>
                <Flex gap={8}>
                    <Button
                        block
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(template.message)}`, '_blank')}
                        size="small"
                        style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                    >
                        <Flex align="center" gap={6}>
                            <LuMessageSquare size={14} />
                            <Text style={{ color: '#fff' }}>{t('whatsApp')}</Text>
                        </Flex>
                    </Button>
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
