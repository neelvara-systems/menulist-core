'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getProjectsList } from '@database/projects';
import { isOBPAnalyticsEnabled } from '@lib/analytics/preferences';
import { trackOBPShare } from '@lib/analytics/unified';
import { generateOBPUrl, getDefaultProjectUrl } from '@lib/obp/generateOBPUrl';
import { slugify } from '@lib/utils/slugify';
import { StoreDataType } from '@type/platform/store';
import { Button, Card, Flex, Segmented, Typography, message } from 'antd';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuMessageCircle, LuQrCode } from 'react-icons/lu';

const { Text, Title } = Typography;

interface OBPLinkCardProps {
    storeDetails: StoreDataType;
}

export default function OBPLinkCard({ storeDetails }: OBPLinkCardProps) {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [qrType, setQrType] = useState<'share' | 'menu'>('share');
    const [defaultSlug, setDefaultSlug] = useState<string | undefined>(undefined);
    const qrRef = useRef<HTMLDivElement>(null);

    // R5 link-emitter audit (§9 PUBLIC-ROUTING-DOCTRINE): resolve the default
    // project's real canonical slug so the "Menu QR" points at the canonical
    // per-project URL (e.g., /food-menu), not the /menu alias. Falls back to
    // the alias while loading or when no default is available — Layer 2 still
    // resolves correctly in those cases.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await getProjectsList();
                const projects = result?.projects || [];
                const def = projects.find((p: any) => p.isDefault) || projects[0];
                if (!def || cancelled) return;
                const slug = def.slug || (def.name ? slugify(def.name) : undefined);
                setDefaultSlug(slug);
            } catch {
                // Silent fallback — Layer 2 handles the alias URL gracefully.
            }
        })();
        return () => { cancelled = true; };
    }, [storeDetails?.storeId]);

    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const obpUrl = generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain);
    const menuUrl = getDefaultProjectUrl(
        storeDetails?.subdomain,
        storeDetails?.customDomain,
        defaultSlug,
    );
    const obpTrackingEnabled = isOBPAnalyticsEnabled(storeDetails?.analytics);

    if (!obpUrl) return null;

    const storeId = storeDetails?.storeId;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(obpUrl);
            setCopied(true);
            message.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
            if (storeId && obpTrackingEnabled) trackOBPShare(storeId, 'copy_link', { storeTimeZone: storeDetails?.timeZone }).catch(() => { });
        } catch {
            message.error('Could not copy link');
        }
    };

    const handleCopyMessage = async () => {
        const msg = `Here's our menu, timings & location:\n${obpUrl}`;
        try {
            await navigator.clipboard.writeText(msg);
            message.success('Message copied — paste it in WhatsApp or anywhere');
            if (storeId && obpTrackingEnabled) trackOBPShare(storeId, 'copy_message', { storeTimeZone: storeDetails?.timeZone }).catch(() => { });
        } catch {
            message.error('Could not copy message');
        }
    };

    const handleWhatsAppShare = () => {
        const storeName = storeDetails?.name || 'our business';
        const msg = `${storeName} — menu, timings & contact:\n${obpUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        if (storeId && obpTrackingEnabled) trackOBPShare(storeId, 'whatsapp', { storeTimeZone: storeDetails?.timeZone }).catch(() => { });
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
        <Card style={{ marginBottom: 16 }}>
            <Flex vertical gap={14}>
                {/* Row 1: icon + title + url */}
                <Flex align="center" gap={14}>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: '#e6f4ff',
                            flexShrink: 0,
                        }}
                    >
                        <LuGlobe size={20} style={{ color: '#1677ff' }} />
                    </Flex>
                    <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 15 }}>Your Official Business Link</Text>
                        <Text
                            type="secondary"
                            style={{
                                fontSize: 12,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {obpUrl}
                        </Text>
                    </Flex>
                </Flex>

                {/* Row 2: primary action prominent, secondary actions smaller */}
                <Flex gap={8} wrap="wrap" align="center">
                    <Button
                        icon={<LuMessageCircle size={15} />}
                        onClick={handleWhatsAppShare}
                        type="primary"
                        style={{ background: '#25D366', borderColor: '#25D366' }}
                    >
                        Send via WhatsApp
                    </Button>
                    <Button
                        icon={copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                        onClick={handleCopy}
                        type={copied ? 'primary' : 'default'}
                    >
                        {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                    <Button onClick={handleCopyMessage}>Copy Message</Button>
                    <Button icon={<LuExternalLink size={14} />} onClick={handleOpen}>Open</Button>
                    <Button
                        icon={<LuQrCode size={14} />}
                        onClick={() => setShowQr(!showQr)}
                        type={showQr ? 'primary' : 'default'}
                    >
                        QR Code
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
                style={{ fontSize: 12, marginTop: 14, display: 'block', lineHeight: 1.6 }}
            >
                💡 Share this one link everywhere — Google Business Profile, Instagram bio, and packaging.
            </Text>
        </Card>
    );
}
