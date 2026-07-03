'use client'

import { downloadQrCode, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuCopy, LuDownload, LuX } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, NavBar, Popup, Text, Toast } from '../antd';
import {
    getBoundedMobileOwnerStringContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

const MOBILE_QR_SHEET_COPY_UNAVAILABLE = 'mobile_qr_sheet_copy_unavailable';
const MOBILE_QR_SHEET_COPY_FALLBACK_FAILED = 'mobile_qr_sheet_copy_fallback_failed';

interface MobileQrCodeSheetProps {
    activePlanType?: string | null;
    brandColor?: string;
    copyErrorMessage: string;
    copySuccessMessage: string;
    diagnosticSource?: string;
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

function hasMobileQrSheetClipboardWrite(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}

function hasMobileQrSheetCopyFallback(): boolean {
    return typeof document !== 'undefined'
        && Boolean(document.body)
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function';
}

async function copyMobileQrSheetUrlToClipboard(url: string): Promise<void> {
    let clipboardWriteError: unknown;

    if (hasMobileQrSheetClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(url);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasMobileQrSheetCopyFallback()) {
        throw Object.assign(new Error(MOBILE_QR_SHEET_COPY_UNAVAILABLE), {
            code: MOBILE_QR_SHEET_COPY_UNAVAILABLE,
            clipboardWriteRejected: Boolean(clipboardWriteError),
        });
    }

    const textarea = document.createElement('textarea');
    textarea.value = url;
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
            throw Object.assign(new Error(MOBILE_QR_SHEET_COPY_FALLBACK_FAILED), {
                code: MOBILE_QR_SHEET_COPY_FALLBACK_FAILED,
            });
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

export default function MobileQrCodeSheet({
    activePlanType,
    brandColor,
    copyErrorMessage,
    copySuccessMessage,
    diagnosticSource = 'mobile_qr_code_sheet',
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

    const buildQrSheetLogContext = (
        action: 'copy' | 'download' | 'generate',
        metadata: Record<string, boolean | number | string | null | undefined> = {},
    ) => ({
        ...getBoundedMobileOwnerStringContext('diagnosticSource', diagnosticSource),
        ...getBoundedMobileOwnerStringContext('url', url),
        ...getBoundedMobileOwnerStringContext('filename', filename),
        ...getBoundedMobileOwnerStringContext('title', title),
        ...getBoundedMobileOwnerStringContext('helperText', helperText),
        ...getBoundedMobileOwnerStringContext('storeName', storeName),
        ...getBoundedMobileOwnerStringContext('activePlanType', activePlanType),
        action,
        hasBrandColor: Boolean(brandColor),
        hasLogoUrl: Boolean(logoUrl),
        hasQrDataUrl: Boolean(qrDataUrl),
        qrDataUrlLength: qrDataUrl?.length || 0,
        visible,
        ...metadata,
    });

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
            } catch (error) {
                if (!cancelled) {
                    logMobileOwnerFailure('mobile_qr_sheet_generate_failed', error, buildQrSheetLogContext('generate'));
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
    }, [activePlanType, brandColor, diagnosticSource, filename, helperText, logoUrl, storeName, title, visible, url, qrErrorMessage, onClose]);

    const handleCopy = async () => {
        try {
            await copyMobileQrSheetUrlToClipboard(url);
            Toast.show({ content: copySuccessMessage, duration: 1500 });
        } catch (error) {
            logMobileOwnerFailure('mobile_qr_sheet_copy_failed', error, buildQrSheetLogContext('copy', {
                hasClipboardWrite: hasMobileQrSheetClipboardWrite(),
                hasCopyFallback: hasMobileQrSheetCopyFallback(),
            }));
            Toast.show({ content: copyErrorMessage, duration: 1500 });
        }
    };

    const handleDownload = () => {
        if (!qrDataUrl) return;
        try {
            downloadQrCode(qrDataUrl, filename);
            Toast.show({ content: downloadSuccessMessage, duration: 1500 });
            onDownload?.();
        } catch (error) {
            logMobileOwnerFailure('mobile_qr_sheet_download_failed', error, buildQrSheetLogContext('download'));
            Toast.show({ content: qrErrorMessage, duration: 1500 });
        }
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
