'use client';

import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { secureError } from '@lib/security/secureLogger';
import { Button, Card, Flex, Typography, message, theme } from 'antd';
import { LuClipboard, LuCopy, LuExternalLink, LuMessageCircle } from 'react-icons/lu';

const { Text } = Typography;

type ShareLinkCardLogContext = Record<string, boolean | number | string | null | undefined>;
type ShareLinkAction = 'copy' | 'copy_message' | 'whatsapp' | 'open';

const SHARE_LINK_CARD_COPY_UNAVAILABLE = 'share_link_card_copy_unavailable';
const SHARE_LINK_CARD_COPY_FALLBACK_FAILED = 'share_link_card_copy_fallback_failed';
const SHARE_LINK_CARD_MESSAGE_COPY_UNAVAILABLE = 'share_link_card_message_copy_unavailable';
const SHARE_LINK_CARD_MESSAGE_COPY_FALLBACK_FAILED = 'share_link_card_message_copy_fallback_failed';

const hasShareLinkCardClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasShareLinkCardCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyShareLinkCardTextToClipboard = async (
    value: string,
    unavailableCode: string,
    fallbackFailureCode: string,
): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasShareLinkCardClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasShareLinkCardCopyFallback()) {
        throw clipboardWriteError || new Error(unavailableCode);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(fallbackFailureCode);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const getBoundedShareLinkStringContext = (label: string, value: unknown): ShareLinkCardLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getShareLinkErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getShareLinkErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const logShareLinkCardFailure = (
    failureCode: string,
    error: unknown,
    context: ShareLinkCardLogContext,
) => {
    secureError('[Share Link Card] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getShareLinkErrorName(error),
        sourceErrorCode: getShareLinkErrorCode(error),
    });
};

interface ShareLinkCardProps {
    title: string;
    description: string;
    url: string;
    shortUrl?: string;
    sharePrefix: string;
    copySuccessLabel?: string;
    onGuide?: () => void;
    onShareAction?: (action: 'copy' | 'copy_message' | 'whatsapp') => void;
    diagnosticContext?: ShareLinkCardLogContext;
}

export default function ShareLinkCard({
    title,
    description,
    url,
    shortUrl,
    sharePrefix,
    copySuccessLabel = 'Link',
    onGuide,
    onShareAction,
    diagnosticContext,
}: ShareLinkCardProps) {
    const { token } = theme.useToken();

    const withSrc = (src: 'copy' | 'whatsapp' | 'direct') => (
        withAnalyticsSource(url, src === 'copy' ? 'copy_link' : src)
    );

    const buildShareLinkLogContext = (
        action: ShareLinkAction,
        metadata: ShareLinkCardLogContext = {},
    ): ShareLinkCardLogContext => ({
        ...diagnosticContext,
        ...getBoundedShareLinkStringContext('title', title),
        ...getBoundedShareLinkStringContext('description', description),
        ...getBoundedShareLinkStringContext('url', url),
        ...getBoundedShareLinkStringContext('shortUrl', shortUrl),
        ...getBoundedShareLinkStringContext('sharePrefix', sharePrefix),
        ...getBoundedShareLinkStringContext('copySuccessLabel', copySuccessLabel),
        action,
        hasGuide: Boolean(onGuide),
        hasShareAction: Boolean(onShareAction),
        ...metadata,
    });

    const handleCopy = async () => {
        const copyUrl = withSrc('copy');
        try {
            await copyShareLinkCardTextToClipboard(
                copyUrl,
                SHARE_LINK_CARD_COPY_UNAVAILABLE,
                SHARE_LINK_CARD_COPY_FALLBACK_FAILED,
            );
            message.success(`${copySuccessLabel} copied`);
            onShareAction?.('copy');
        } catch (error) {
            logShareLinkCardFailure('share_link_card_copy_failed', error, buildShareLinkLogContext('copy', {
                copyUrlLength: copyUrl.length,
                hasClipboardWrite: hasShareLinkCardClipboardWrite(),
                hasCopyFallback: hasShareLinkCardCopyFallback(),
            }));
            message.error('Could not copy link');
        }
    };

    const handleWhatsApp = () => {
        const msg = `${sharePrefix}\n${withSrc('whatsapp')}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        try {
            const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('share_link_card_whatsapp_open_blocked');
            }
            onShareAction?.('whatsapp');
        } catch (error) {
            logShareLinkCardFailure('share_link_card_whatsapp_open_failed', error, buildShareLinkLogContext('whatsapp', {
                whatsappMessageLength: msg.length,
                whatsappUrlLength: whatsappUrl.length,
            }));
            message.error('Could not open WhatsApp');
        }
    };

    const handleCopyMessage = async () => {
        const msg = `${sharePrefix}\n${withSrc('copy')}`;
        try {
            await copyShareLinkCardTextToClipboard(
                msg,
                SHARE_LINK_CARD_MESSAGE_COPY_UNAVAILABLE,
                SHARE_LINK_CARD_MESSAGE_COPY_FALLBACK_FAILED,
            );
            message.success('Message copied — paste it in WhatsApp or anywhere');
            onShareAction?.('copy_message');
        } catch (error) {
            logShareLinkCardFailure('share_link_card_copy_message_failed', error, buildShareLinkLogContext('copy_message', {
                copyMessageLength: msg.length,
                hasClipboardWrite: hasShareLinkCardClipboardWrite(),
                hasCopyFallback: hasShareLinkCardCopyFallback(),
            }));
            message.error('Could not copy message');
        }
    };

    const handleOpen = () => {
        const directUrl = withSrc('direct');
        try {
            const opened = window.open(directUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('share_link_card_open_blocked');
            }
        } catch (error) {
            logShareLinkCardFailure('share_link_card_open_failed', error, buildShareLinkLogContext('open', {
                directUrlLength: directUrl.length,
            }));
            message.error('Could not open link');
        }
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
                        icon={<LuMessageCircle size={14} />}
                        onClick={handleWhatsApp}
                        style={{ color: token.colorTextLightSolid, background: token.colorSuccess, borderColor: token.colorSuccess }}
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
