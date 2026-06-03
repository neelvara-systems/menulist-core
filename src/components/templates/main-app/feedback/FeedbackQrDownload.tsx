'use client';

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
import { Button, Card, Flex, Modal, Spin, Typography, message, theme } from 'antd';
import React, { useContext, useMemo, useState } from 'react';
import { LuCopy, LuClipboard, LuDownload, LuExternalLink, LuMessageCircle, LuQrCode } from 'react-icons/lu';

const { Text } = Typography;

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
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const storeBrandColor = useMemo(() => resolveStoreBrandColor(storeDetails as any), [storeDetails]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleOpenModal = async () => {
        setIsModalOpen(true);

        if (!qrDataUrl) {
            setIsGenerating(true);
            try {
                const dataUrl = await generateBrandedFeedbackQrCode(projectId, {
                    brandColor: storeBrandColor,
                    logoUrl: (storeDetails as any)?.logo || undefined,
                    storeName,
                    activePlanType: (storeDetails as any)?.activePlanType,
                });
                setQrDataUrl(dataUrl);
            } catch (error) {
                message.error('Failed to generate QR code');
                setIsModalOpen(false);
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleDownload = () => {
        if (qrDataUrl) {
            const filename = getQrCodeFilename(storeName);
            downloadQrCode(qrDataUrl, filename);
            message.success('QR code downloaded');
        }
    };

    const feedbackUrl = getFeedbackUrl(projectId, 'direct_link');
    const shortFeedbackUrl = feedbackUrl.replace(/^https?:\/\//, '');
    const withSrc = (src: 'copy' | 'direct' | 'whatsapp') =>
        feedbackUrl ? `${feedbackUrl}${feedbackUrl.includes('?') ? '&' : '?'}src=${src}` : feedbackUrl;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(withSrc('copy'));
            message.success('Feedback link copied');
        } catch {
            message.error('Failed to copy feedback link');
        }
    };

    const handleOpenLink = () => {
        window.open(withSrc('direct'), '_blank');
    };

    const handleWhatsApp = () => {
        const shareMessage = `Share your feedback for ${storeName}\n${withSrc('whatsapp')}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
    };

    const handleCopyMessage = async () => {
        const shareMessage = `Share your feedback for ${storeName}\n${withSrc('copy')}`;
        try {
            await navigator.clipboard.writeText(shareMessage);
            message.success('Message copied — paste it in WhatsApp or anywhere');
        } catch {
            message.error('Could not copy message');
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
