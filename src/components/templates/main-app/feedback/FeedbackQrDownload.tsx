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
    generateFeedbackQrCode,
    getFeedbackUrl,
    getQrCodeFilename,
} from '@lib/utils/feedbackQrCode';
import { Button, Modal, Spin, message } from 'antd';
import React, { useState } from 'react';
import { LuDownload, LuQrCode } from 'react-icons/lu';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleOpenModal = async () => {
        setIsModalOpen(true);

        if (!qrDataUrl) {
            setIsGenerating(true);
            try {
                const dataUrl = await generateFeedbackQrCode(projectId);
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

    return (
        <>
            <Button
                icon={<LuQrCode />}
                onClick={handleOpenModal}
            >
                Download QR Code
            </Button>

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
                            <p className="mt-4 text-gray-500">Generating QR code...</p>
                        </div>
                    ) : qrDataUrl ? (
                        <>
                            {/* QR Code Preview */}
                            <div className="bg-white p-4 rounded-lg inline-block shadow-sm border">
                                <img
                                    src={qrDataUrl}
                                    alt="Feedback QR Code"
                                    className="w-48 h-48 mx-auto"
                                />
                            </div>

                            {/* Instructions */}
                            <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">
                                    How to use
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Print and place on tables</li>
                                    <li>• Add to receipts</li>
                                    <li>• Display at reception</li>
                                </ul>
                            </div>

                            {/* URL Preview */}
                            <div className="mt-4 text-xs text-gray-400 break-all">
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
