'use client';

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

/**
 * FeedbackQrDownload Component
 * 
 * Allows owners to download QR code for feedback collection.
 * High-resolution PNG suitable for printing.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import {
    downloadQrCode,
    generateBrandedFeedbackQrCode,
    getFeedbackUrl,
    getQrCodeFilename,
} from '@lib/utils/feedbackQrCode';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, Flex, Modal, Spin, Typography, App, theme } from 'antd';
import React, { useContext, useMemo, useState } from 'react';
import { LuCopy, LuClipboard, LuDownload, LuExternalLink, LuMessageCircle, LuQrCode } from 'react-icons/lu';
import { getBoundedFeedbackInboxStringContext, logFeedbackInboxFailure } from './feedbackInboxDiagnostics';

const { Text } = Typography;

const DESKTOP_FEEDBACK_LINK_COPY_UNAVAILABLE = 'desktop_feedback_link_copy_unavailable';
const DESKTOP_FEEDBACK_LINK_COPY_FALLBACK_FAILED = 'desktop_feedback_link_copy_fallback_failed';
const DESKTOP_FEEDBACK_MESSAGE_COPY_UNAVAILABLE = 'desktop_feedback_message_copy_unavailable';
const DESKTOP_FEEDBACK_MESSAGE_COPY_FALLBACK_FAILED = 'desktop_feedback_message_copy_fallback_failed';

interface FeedbackQrDownloadProps {
    /** Project ID for QR code URL */
    projectId: string;
    /** Store name for filename */
    storeName?: string;
}

export const FeedbackQrDownload: React.FC<FeedbackQrDownloadProps> = ({
    projectId,
    storeName = 'store',
}) => {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const storeBrandColor = useMemo(() => resolveStoreBrandColor(storeDetails as any), [storeDetails]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const feedbackQrSubtitle = storeName && storeName !== 'store'
        ? `Scan to leave private feedback for ${storeName}`
        : 'Scan to leave private feedback';
    const feedbackUrl = getFeedbackUrl(projectId, 'direct_link');
    const shortFeedbackUrl = feedbackUrl.replace(/^https?:\/\//, '');
    const withSrc = (src: 'copy' | 'direct' | 'whatsapp') =>
        feedbackUrl ? `${feedbackUrl}${feedbackUrl.includes('?') ? '&' : '?'}src=${src}` : feedbackUrl;

    const hasFeedbackClipboardWrite = () =>
        typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

    const hasFeedbackCopyFallback = () =>
        typeof document !== 'undefined'
        && Boolean(document.body)
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function';

    const copyFeedbackTextToClipboard = async (
        value: string,
        unavailableCode: string,
        fallbackFailureCode: string,
    ) => {
        let clipboardWriteError: unknown;

        if (hasFeedbackClipboardWrite()) {
            try {
                await navigator.clipboard.writeText(value);
                return;
            } catch (error) {
                clipboardWriteError = error;
            }
        }

        if (!hasFeedbackCopyFallback()) {
            throw Object.assign(new Error(unavailableCode), {
                code: unavailableCode,
                clipboardWriteRejected: Boolean(clipboardWriteError),
            });
        }

        const textarea = document.createElement('textarea');
        textarea.value = value;
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
                throw Object.assign(new Error(fallbackFailureCode), {
                    code: fallbackFailureCode,
                });
            }
        } finally {
            document.body.removeChild(textarea);
        }
    };

    const buildFeedbackQrLogContext = (
        action: string,
        metadata: Record<string, boolean | number | string | null | undefined> = {},
    ) => ({
        action,
        hasQrDataUrl: Boolean(qrDataUrl),
        isModalOpen,
        qrDataUrlLength: qrDataUrl?.length || 0,
        ...getBoundedFeedbackInboxStringContext('projectId', projectId),
        ...getBoundedFeedbackInboxStringContext('storeName', storeName),
        ...getBoundedFeedbackInboxStringContext('feedbackUrl', feedbackUrl),
        ...metadata,
    });

    const handleOpenModal = async () => {
        setIsModalOpen(true);

        if (!qrDataUrl) {
            setIsGenerating(true);
            try {
                const dataUrl = await generateBrandedFeedbackQrCode(projectId, {
                    brandColor: storeBrandColor,
                    logoUrl: (storeDetails as any)?.logo || undefined,
                    storeName,
                    subtitle: feedbackQrSubtitle,
                    title: 'Feedback QR',
                    activePlanType: (storeDetails as any)?.activePlanType,
                });
                setQrDataUrl(dataUrl);
            } catch (error) {
                logFeedbackInboxFailure('desktop_feedback_qr_generate_failed', error, buildFeedbackQrLogContext('generate_qr', {
                    hasLogoUrl: Boolean((storeDetails as any)?.logo),
                    ...getBoundedFeedbackInboxStringContext('activePlanType', (storeDetails as any)?.activePlanType),
                }));
                messageApi.error('Failed to generate QR code');
                setIsModalOpen(false);
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleDownload = () => {
        if (qrDataUrl) {
            const filename = getQrCodeFilename(storeName);
            try {
                downloadQrCode(qrDataUrl, filename);
                messageApi.success('QR code downloaded');
            } catch (error) {
                logFeedbackInboxFailure('desktop_feedback_qr_download_failed', error, buildFeedbackQrLogContext('download_qr', {
                    ...getBoundedFeedbackInboxStringContext('filename', filename),
                }));
                messageApi.error('Could not download QR code');
            }
        }
    };

    const handleCopyLink = async () => {
        const copyUrl = withSrc('copy');
        try {
            await copyFeedbackTextToClipboard(
                copyUrl,
                DESKTOP_FEEDBACK_LINK_COPY_UNAVAILABLE,
                DESKTOP_FEEDBACK_LINK_COPY_FALLBACK_FAILED,
            );
            messageApi.success('Feedback link copied');
        } catch (error) {
            logFeedbackInboxFailure('desktop_feedback_link_copy_failed', error, buildFeedbackQrLogContext('copy_link', {
                ...getBoundedFeedbackInboxStringContext('copyUrl', copyUrl),
                hasClipboardWrite: hasFeedbackClipboardWrite(),
                hasCopyFallback: hasFeedbackCopyFallback(),
            }));
            messageApi.error('Failed to copy feedback link');
        }
    };

    const handleOpenLink = () => {
        const directUrl = withSrc('direct');
        try {
            openIsolatedBrowserUrl(directUrl);
        } catch (error) {
            logFeedbackInboxFailure('desktop_feedback_link_open_failed', error, buildFeedbackQrLogContext('open_link', {
                ...getBoundedFeedbackInboxStringContext('directUrl', directUrl),
            }));
            messageApi.error('Could not open feedback link');
        }
    };

    const handleWhatsApp = () => {
        const shareMessage = `Share your feedback for ${storeName}\n${withSrc('whatsapp')}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        try {
            openIsolatedBrowserUrl(whatsappUrl);
        } catch (error) {
            logFeedbackInboxFailure('desktop_feedback_whatsapp_open_failed', error, buildFeedbackQrLogContext('open_whatsapp', {
                shareMessageLength: shareMessage.length,
                whatsappUrlLength: whatsappUrl.length,
            }));
            messageApi.error('Could not open WhatsApp');
        }
    };

    const handleCopyMessage = async () => {
        const shareMessage = `Share your feedback for ${storeName}\n${withSrc('copy')}`;
        try {
            await copyFeedbackTextToClipboard(
                shareMessage,
                DESKTOP_FEEDBACK_MESSAGE_COPY_UNAVAILABLE,
                DESKTOP_FEEDBACK_MESSAGE_COPY_FALLBACK_FAILED,
            );
            messageApi.success('Message copied — paste it in WhatsApp or anywhere');
        } catch (error) {
            logFeedbackInboxFailure('desktop_feedback_message_copy_failed', error, buildFeedbackQrLogContext('copy_message', {
                shareMessageLength: shareMessage.length,
                hasClipboardWrite: hasFeedbackClipboardWrite(),
                hasCopyFallback: hasFeedbackCopyFallback(),
            }));
            messageApi.error('Could not copy message');
        }
    };

    return (
        <>
            <Card size="small" styles={{ body: { padding: 16 } }} style={{ width: '100%', maxWidth: 360 }}>
                <Flex vertical gap={10}>
                    <Text strong>Feedback Link</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Share this with guests when you want private feedback directly
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
                            {shortFeedbackUrl}
                        </Text>
                    </Card>
                    <Flex gap={6} align="center" wrap="wrap">
                        <Button size="small" type="primary" icon={<LuClipboard size={14} />} onClick={handleCopyLink}>
                            Copy Link
                        </Button>
                        <Button
                            size="small"
                            icon={<LuMessageCircle size={14} />}
                            onClick={handleWhatsApp}
                            style={{ color: token.colorSuccess, borderColor: token.colorSuccess }}
                        >
                            WhatsApp
                        </Button>
                        <Button size="small" icon={<LuCopy size={14} />} onClick={handleCopyMessage}>
                            Copy Message
                        </Button>
                        <Button size="small" type="text" icon={<LuExternalLink size={14} />} onClick={handleOpenLink}>
                            Open
                        </Button>
                    </Flex>
                    <Button size="small" type="link" style={{ fontSize: 12, padding: 0, height: 'auto', width: 'fit-content' }} icon={<LuQrCode size={14} />} onClick={handleOpenModal}>
                        Download QR Code
                    </Button>
                </Flex>
            </Card>

            <Modal
                title="Feedback QR Code"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setIsModalOpen(false)}>
                        Close
                    </Button>,
                    <Button
                        key="download"
                        type="primary"
                        icon={<LuDownload />}
                        onClick={handleDownload}
                        disabled={!qrDataUrl}
                    >
                        Download PNG
                    </Button>,
                ]}
                centered
                width={400}
            >
                <div className="text-center py-4">
                    {isGenerating ? (
                        <div className="py-8">
                            <Spin size="large" />
                            <p className="mt-4" style={{ color: token.colorTextSecondary }}>Generating QR code...</p>
                        </div>
                    ) : qrDataUrl ? (
                        <>
                            {/* QR Code Preview */}
                            <div className="p-4 rounded-lg inline-block shadow-sm border" style={{ backgroundColor: token.colorBgContainer }}>
                                <img
                                    src={qrDataUrl}
                                    alt="Feedback QR Code"
                                    className="mx-auto"
                                    style={{ height: 240, width: 240 }}
                                />
                            </div>

                            {/* Instructions */}
                            <div className="mt-6 text-left rounded-lg p-4" style={{ backgroundColor: token.colorFillSecondary }}>
                                <h4 className="font-medium mb-2" style={{ color: token.colorText }}>
                                    How to use
                                </h4>
                                <ul className="text-sm space-y-1" style={{ color: token.colorTextSecondary }}>
                                    <li>• Print and place on tables</li>
                                    <li>• Add to receipts</li>
                                    <li>• Display at reception</li>
                                </ul>
                            </div>

                            {/* URL Preview */}
                            <div className="mt-4 text-xs break-all" style={{ color: token.colorTextTertiary }}>
                                {feedbackUrl}
                            </div>
                        </>
                    ) : null}
                </div>
            </Modal>
        </>
    );
};

export default FeedbackQrDownload;
