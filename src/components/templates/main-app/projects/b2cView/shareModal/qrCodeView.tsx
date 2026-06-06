import { LOGO_SMALL } from '@constant/common';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { buildQrCodeFilename, downloadQrCode, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import { Button, Checkbox, ColorPicker, Flex, QRCode, Typography, message } from 'antd';
import { useState } from 'react';
import { LuDownload } from 'react-icons/lu';

const { Text } = Typography;

interface QRCodeViewProps {
    activePlanType?: string | null;
    brandColor?: string;
    logoUrl?: string;
    shareUrl: string;
    storeName?: string;
}

function withQrEntrySource(url: string): string {
    return withAnalyticsSource(url, 'qr');
}

function QRCodeView({ activePlanType, brandColor, logoUrl, shareUrl, storeName = 'menu' }: QRCodeViewProps) {
    const labels = useOfferingLabels();
    // QR code customization states
    const [qrSize, setQrSize] = useState<number>(200);
    const [qrColor, setQrColor] = useState<string>('#000000');
    const [qrBgColor, setQrBgColor] = useState<string>('#ffffff');
    const [showLogo, setShowLogo] = useState<boolean>(true);
    const qrShareUrl = withQrEntrySource(shareUrl);

    const handleDownloadQRCode = async () => {
        try {
            const dataUrl = await generateBrandedQrCodeDataUrl(qrShareUrl, {
                brandColor,
                darkColor: qrColor,
                footer: qrShareUrl.replace(/^https?:\/\//, ''),
                lightColor: qrBgColor,
                logoUrl: showLogo ? logoUrl : undefined,
                storeName,
                subtitle: labels.scanToView,
                title: labels.printCardTitle,
                activePlanType,
            });
            downloadQrCode(dataUrl, buildQrCodeFilename(`${storeName}-menu`, 'qr'));
            message.success('QR code downloaded successfully!');
        } catch {
            message.error('Failed to download QR code');
        }
    };

    return (
        <Flex vertical gap={24} align="center">
            <Text strong style={{ marginBottom: '12px' }}>
                Scan this QR code to view the menu on any device:
            </Text>
            <div id="menu-qrcode" style={{ background: qrBgColor }}>
                <QRCode
                    value={qrShareUrl}
                    size={qrSize}
                    errorLevel={"H"}
                    color={qrColor}
                    bgColor={qrBgColor}
                    icon={showLogo ? (logoUrl || LOGO_SMALL) : undefined}
                    iconSize={showLogo ? qrSize / 3 : undefined}
                    style={{ margin: '16px' }}
                />
            </div>

            <Flex gap={12} style={{ width: '100%' }} justify='center'>
                <Flex align="center" justify="space-between" gap={10}>
                    <Text>QR Code Color:</Text>
                    <ColorPicker value={qrColor} onChange={(color) => setQrColor(color.toHexString())} />
                </Flex>

                <Flex align="center" justify="space-between" gap={10}>
                    <Text>Background:</Text>
                    <ColorPicker value={qrBgColor} onChange={(color) => setQrBgColor(color.toHexString())} />
                </Flex>

                <Flex align="center" justify="space-between" gap={10}>
                    <Text>Show Logo:</Text>
                    <Checkbox checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />
                </Flex>
            </Flex>

            <Flex gap={12}>
                <Button
                    icon={<LuDownload />}
                    onClick={handleDownloadQRCode}
                    type="primary"
                >
                    Download QR Code
                </Button>
            </Flex>

            <Text type="secondary" style={{ textAlign: 'center' }}>
                Print this QR code and place it on your table or counter for easy menu access
            </Text>
        </Flex>
    );
}

export default QRCodeView;
