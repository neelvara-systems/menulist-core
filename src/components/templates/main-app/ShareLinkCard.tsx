'use client';

import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { Button, Card, Flex, Typography, message, theme } from 'antd';
import { FaWhatsapp } from 'react-icons/fa6';
import { LuClipboard, LuCopy, LuExternalLink } from 'react-icons/lu';

const { Text } = Typography;

interface ShareLinkCardProps {
    title: string;
    description: string;
    url: string;
    shortUrl?: string;
    sharePrefix: string;
    copySuccessLabel?: string;
    onGuide?: () => void;
}

export default function ShareLinkCard({
    title,
    description,
    url,
    shortUrl,
    sharePrefix,
    copySuccessLabel = 'Link',
    onGuide,
}: ShareLinkCardProps) {
    const { token } = theme.useToken();

    const withSrc = (src: 'copy' | 'whatsapp' | 'direct') => (
        withAnalyticsSource(url, src === 'copy' ? 'copy_link' : src)
    );

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(withSrc('copy'));
            message.success(`${copySuccessLabel} copied`);
        } catch {
            message.error('Could not copy link');
        }
    };

    const handleWhatsApp = () => {
        const msg = `${sharePrefix}\n${withSrc('whatsapp')}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCopyMessage = async () => {
        const msg = `${sharePrefix}\n${withSrc('copy')}`;
        try {
            await navigator.clipboard.writeText(msg);
            message.success('Message copied — paste it in WhatsApp or anywhere');
        } catch {
            message.error('Could not copy message');
        }
    };

    const handleOpen = () => {
        window.open(withSrc('direct'), '_blank', 'noopener,noreferrer');
    };

    return (
        <Card size="small" styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
            <Flex vertical gap={10}>
                <Text strong>{title}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {description}
                </Text>
                <Card
                    size="small"
                    styles={{ body: { padding: '6px 10px' } }}
                    style={{
                        backgroundColor: token.colorFillAlter,
                        borderColor: token.colorBorderSecondary,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                        }}
                    >
                        {shortUrl || url.replace(/^https?:\/\//, '')}
                    </Text>
                </Card>
                <Flex gap={6} align="center" wrap="wrap">
                    <Button size="small" type="primary" icon={<LuClipboard size={14} />} onClick={handleCopy}>
                        Copy Link
                    </Button>
                    <Button
                        size="small"
                        icon={<FaWhatsapp size={14} />}
                        onClick={handleWhatsApp}
                        style={{ color: '#25D366', borderColor: '#25D366' }}
                    >
                        WhatsApp
                    </Button>
                    <Button size="small" icon={<LuCopy size={14} />} onClick={handleCopyMessage}>
                        Copy Message
                    </Button>
                    <Button size="small" type="text" icon={<LuExternalLink size={14} />} onClick={handleOpen}>
                        Open
                    </Button>
                </Flex>
                {onGuide ? (
                    <Button
                        size="small"
                        type="link"
                        style={{ fontSize: 12, padding: 0, height: 'auto' }}
                        onClick={onGuide}
                    >
                        Where should I share this?
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}
