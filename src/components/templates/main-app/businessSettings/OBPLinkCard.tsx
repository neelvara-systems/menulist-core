'use client';

import { FEATURE_FLAGS } from '@config/features';
import { trackOBPShare } from '@lib/analytics/unified';
import { generateMenuUrl, generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { StoreDataType } from '@type/platform/store';
import { Button, Card, Flex, Segmented, Typography, message } from 'antd';
import { QRCodeCanvas } from 'qrcode.react';
import { useRef, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuMessageCircle, LuQrCode } from 'react-icons/lu';

const { Text, Title } = Typography;

interface OBPLinkCardProps {
    storeDetails: StoreDataType;
}

export default function OBPLinkCard({ storeDetails }: OBPLinkCardProps) {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [qrType, setQrType] = useState<'share' | 'menu'>('share');
    const qrRef = useRef<HTMLDivElement>(null);

    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const obpUrl = generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain);
    const menuUrl = generateMenuUrl(storeDetails?.subdomain, storeDetails?.customDomain);

    if (!obpUrl) return null;

    const storeId = storeDetails?.storeId;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(obpUrl);
            setCopied(true);
            message.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
            if (storeId) trackOBPShare(storeId, 'copy_link').catch(() => { });
        } catch {
            message.error('Could not copy link');
        }
    };

    const handleCopyMessage = async () => {
        const msg = `Here's our menu, timings & location:\n${obpUrl}`;
        try {
            await navigator.clipboard.writeText(msg);
            message.success('Message copied — paste it in WhatsApp or anywhere');
            if (storeId) trackOBPShare(storeId, 'copy_message').catch(() => { });
        } catch {
            message.error('Could not copy message');
        }
    };

    const handleWhatsAppShare = () => {
        const storeName = storeDetails?.name || 'our business';
        const msg = `${storeName} — menu, timings & contact:\n${obpUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        if (storeId) trackOBPShare(storeId, 'whatsapp').catch(() => { });
    };

    const handleOpen = () => {
        window.open(obpUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadQr = () => {
        const canvas = qrRef.current?.querySelector('canvas');
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `${storeDetails?.name || 'business'}-${qrType}-qr.png`;
        a.click();
    };

    const activeQrUrl = qrType === 'menu' ? menuUrl : obpUrl;

    return (
        <Card
            size="small"
            style={{ marginBottom: 16 }}
        >
            <Flex align="center" gap={12}>
                <Flex
                    align="center"
                    justify="center"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#f0f5ff',
                        flexShrink: 0,
                    }}
                >
                    <LuGlobe size={20} style={{ color: '#1677ff' }} />
                </Flex>

                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                        Your Official Business Link
                    </Title>
                    <Text
                        type="secondary"
                        style={{
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {obpUrl}
                    </Text>
                </Flex>

                <Flex gap={8} wrap="wrap">
                    <Button
                        icon={<LuMessageCircle size={14} />}
                        onClick={handleWhatsAppShare}
                        size="small"
                        type="primary"
                        style={{ background: '#25D366', borderColor: '#25D366' }}
                    >
                        Send via WhatsApp
                    </Button>
                    <Button
                        icon={copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                        onClick={handleCopy}
                        type={copied ? 'primary' : 'default'}
                        size="small"
                    >
                        {copied ? 'Copied' : 'Copy Link'}
                    </Button>
                    <Button
                        onClick={handleCopyMessage}
                        size="small"
                    >
                        Copy Message
                    </Button>
                    <Button
                        icon={<LuExternalLink size={14} />}
                        onClick={handleOpen}
                        size="small"
                    >
                        Open
                    </Button>
                    <Button
                        icon={<LuQrCode size={14} />}
                        onClick={() => setShowQr(!showQr)}
                        size="small"
                        type={showQr ? 'primary' : 'default'}
                    >
                        QR
                    </Button>
                </Flex>
            </Flex>

            {showQr && (
                <Flex vertical align="center" gap={12} style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                    <Segmented
                        size="small"
                        value={qrType}
                        onChange={(val) => setQrType(val as 'share' | 'menu')}
                        options={[
                            { label: 'Share QR (Business Page)', value: 'share' },
                            { label: 'Menu QR (Direct Menu)', value: 'menu' },
                        ]}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {qrType === 'share'
                            ? 'For Instagram bio, packaging, business cards'
                            : 'For table tents, dine-in QR codes'
                        }
                    </Text>
                    <div ref={qrRef}>
                        <QRCodeCanvas
                            value={activeQrUrl}
                            size={180}
                            level="M"
                            includeMargin
                        />
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{activeQrUrl}</Text>
                    <Button size="small" onClick={handleDownloadQr}>
                        Download QR
                    </Button>
                </Flex>
            )}

            <Text
                type="secondary"
                style={{ fontSize: 12, marginTop: 8, display: 'block' }}
            >
                This is the one link you send to every customer. Add it to your Google Business Profile (Website field), Instagram bio, and packaging.
            </Text>
        </Card>
    );
}
