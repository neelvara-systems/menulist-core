'use client'

import { downloadQrCode, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuCopy, LuDownload, LuX } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, NavBar, Popup, Text, Toast } from '../antd';

interface MobileQrCodeSheetProps {
    activePlanType?: string | null;
    brandColor?: string;
    copyErrorMessage: string;
    copySuccessMessage: string;
    downloadSuccessMessage: string;
    filename: string;
    generatingLabel: string;
    helperText?: string;
    imageAlt: string;
    logoUrl?: string | null;
    onClose: () => void;
    onDownload?: () => void;
    qrErrorMessage: string;
    storeName?: string;
    title: string;
    url: string;
    visible: boolean;
}

export default function MobileQrCodeSheet({
    activePlanType,
    brandColor,
    copyErrorMessage,
    copySuccessMessage,
    downloadSuccessMessage,
    filename,
    generatingLabel,
    helperText,
    imageAlt,
    logoUrl,
    onClose,
    onDownload,
    qrErrorMessage,
    storeName,
    title,
    url,
    visible,
}: MobileQrCodeSheetProps) {
    const common = useTranslations('Common');
    const [isLoading, setIsLoading] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            setIsLoading(false);
        }
        setQrDataUrl(null);
    }, [url, visible]);

    useEffect(() => {
        if (!visible || !url) return;

        let cancelled = false;

        const generate = async () => {
            setIsLoading(true);
            try {
                const dataUrl = await generateBrandedQrCodeDataUrl(url, {
                    brandColor,
                    footer: url.replace(/^https?:\/\//, ''),
                    logoUrl,
                    storeName,
                    subtitle: helperText,
                    title,
                    activePlanType,
                });
                if (!cancelled) {
                    setQrDataUrl(dataUrl);
                }
            } catch {
                if (!cancelled) {
                    Toast.show({ content: qrErrorMessage, duration: 1500 });
                    onClose();
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void generate();

        return () => {
            cancelled = true;
        };
    }, [activePlanType, brandColor, helperText, logoUrl, storeName, title, visible, url, qrErrorMessage, onClose]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            Toast.show({ content: copySuccessMessage, duration: 1500 });
        } catch {
            Toast.show({ content: copyErrorMessage, duration: 1500 });
        }
    };

    const handleDownload = () => {
        if (!qrDataUrl) return;
        downloadQrCode(qrDataUrl, filename);
        Toast.show({ content: downloadSuccessMessage, duration: 1500 });
        onDownload?.();
    };

    return (
        <Popup
            bodyStyle={{ maxHeight: '94vh', overflow: 'hidden', padding: 0 }}
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex style={{ height: '100%', maxHeight: '94vh' }} vertical>
                <NavBar backIcon={<LuX size={20} />} onBack={onClose}>
                    {title}
                </NavBar>

                <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                    {isLoading ? (
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">{generatingLabel}</Text>
                        </Flex>
                    ) : qrDataUrl ? (
                        <Flex align="center" gap={12} vertical>
                            <Card size="small" style={{ width: '100%' }}>
                                <Image
                                    alt={imageAlt}
                                    preview={false}
                                    src={qrDataUrl}
                                    style={{ display: 'block', height: 'auto', width: '100%' }}
                                />
                            </Card>
                            {helperText ? <Text type="secondary">{helperText}</Text> : null}
                            <Text type="secondary" style={{ wordBreak: 'break-all' }}>{url}</Text>
                            <Flex gap={8}>
                                <Button block fill="outline" onClick={handleCopy}>
                                    <Flex align="center" gap={6}>
                                        <LuCopy size={14} />
                                        <Text>{common('copy')}</Text>
                                    </Flex>
                                </Button>
                                <Button block onClick={handleDownload}>
                                    <Flex align="center" gap={6}>
                                        <LuDownload size={14} />
                                        <Text>{common('download')}</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        </Flex>
                    ) : null}
                </Flex>
            </Flex>
        </Popup>
    );
}
