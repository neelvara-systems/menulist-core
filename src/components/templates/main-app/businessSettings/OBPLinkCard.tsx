'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getExistingProjectsListWithoutLoader } from '@database/projects';
import { isOBPAnalyticsEnabled } from '@lib/analytics/preferences';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { trackOBPShare } from '@lib/analytics/unified';
import { getBrandName, getStoreContextName } from '@lib/businessIdentity/names';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { generateOBPUrl, getDefaultProjectUrl } from '@lib/obp/generateOBPUrl';
import { buildQrCodeFilename, downloadQrCode, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import { slugify } from '@lib/utils/slugify';
import { StoreDataType } from '@type/platform/store';
import { Button, Card, Flex, Segmented, Typography, message, theme } from 'antd';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuMessageCircle, LuQrCode } from 'react-icons/lu';

const { Text, Title } = Typography;

interface OBPLinkCardProps {
    storeDetails: StoreDataType;
}

export default function OBPLinkCard({ storeDetails }: OBPLinkCardProps) {
    const { token } = theme.useToken();
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [qrType, setQrType] = useState<'share' | 'menu'>('share');
    const [defaultSlug, setDefaultSlug] = useState<string | undefined>(undefined);
    const storeBrandColor = resolveStoreBrandColor(storeDetails as any);
    const labels = getOfferingLabels((storeDetails as any)?.businessType, (storeDetails as any)?.businessCategory);

    // R5 link-emitter audit (§9 PUBLIC-ROUTING-DOCTRINE): resolve the default
    // project's real canonical slug so the "Menu QR" points at the canonical
    // per-project URL (e.g., /food-menu), not the /menu alias. Falls back to
    // the alias while loading or when no default is available — Layer 2 still
    // resolves correctly in those cases.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await getExistingProjectsListWithoutLoader();
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
    const obpCopyUrl = withAnalyticsSource(obpUrl, 'copy_link');
    const obpWhatsAppUrl = withAnalyticsSource(obpUrl, 'whatsapp');
    const obpOpenUrl = withAnalyticsSource(obpUrl, 'direct');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(obpCopyUrl);
            setCopied(true);
            message.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
            if (storeId && obpTrackingEnabled) trackOBPShare(storeId, 'copy_link', { storeTimeZone: storeDetails?.timeZone, businessDayEndTime: storeDetails?.businessDayEndTime }).catch(() => { });
        } catch {
            message.error('Could not copy link');
        }
    };

    const handleCopyMessage = async () => {
        const msg = `Here's our menu, timings & location:\n${obpCopyUrl}`;
        try {
            await navigator.clipboard.writeText(msg);
            message.success('Message copied — paste it in WhatsApp or anywhere');
            if (storeId && obpTrackingEnabled) trackOBPShare(storeId, 'copy_message', { storeTimeZone: storeDetails?.timeZone, businessDayEndTime: storeDetails?.businessDayEndTime }).catch(() => { });
        } catch {
            message.error('Could not copy message');
        }
    };

    const handleWhatsAppShare = () => {
        const storeName = getBrandName(storeDetails, 'our business');
        const msg = `${storeName} — menu, timings & contact:\n${obpWhatsAppUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        if (storeId && obpTrackingEnabled) trackOBPShare(storeId, 'whatsapp', { storeTimeZone: storeDetails?.timeZone, businessDayEndTime: storeDetails?.businessDayEndTime }).catch(() => { });
    };

    const handleOpen = () => {
        window.open(obpOpenUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadQr = async () => {
        const qrName = qrType === 'share'
            ? getBrandName(storeDetails, 'business')
            : getStoreContextName(storeDetails, 'business');
        try {
            const dataUrl = await generateBrandedQrCodeDataUrl(activeQrUrl, {
                brandColor: storeBrandColor,
                footer: activeQrUrl.replace(/^https?:\/\//, ''),
                logoUrl: (storeDetails as any)?.logo || undefined,
                storeName: qrName,
                subtitle: qrType === 'share' ? 'Scan to open our business page' : labels.scanToView,
                title: qrType === 'share' ? 'BUSINESS PROFILE' : labels.printCardTitle,
                activePlanType: (storeDetails as any)?.activePlanType,
            });
            downloadQrCode(dataUrl, buildQrCodeFilename(`${qrName}-${qrType}`, 'qr'));
            message.success('QR code downloaded');
        } catch {
            message.error('Could not download QR code');
        }
    };

    const activeQrUrl = withAnalyticsSource(qrType === 'menu' ? menuUrl : obpUrl, 'qr');

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
                            background: token.colorInfoBg,
                            flexShrink: 0,
                        }}
                    >
                        <LuGlobe size={20} style={{ color: token.colorInfoText }} />
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
                        style={{ background: token.colorSuccess, borderColor: token.colorSuccess }}
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
                <Flex vertical align="center" gap={12} style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${token.colorBorder}` }}>
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
                    <div>
                        <QRCodeCanvas
                            value={activeQrUrl}
                            size={240}
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
