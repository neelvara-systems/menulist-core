'use client';

/**
 * Menu Kit Section — Share Modal Integration
 *
 * Downloads a ZIP bundle of 6 print-ready + social-ready assets.
 * 100% client-side generation — zero Firebase cost.
 * BusinessType-aware: labels adapt to store category (menu/services/catalog).
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 * @see __docs__/menu-kit/_archive/chatgpt-review.md
 */

import { trackMenuKitDownload } from '@lib/analytics/unified';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob, generateMenuKit, shareBlob } from '@lib/menu-kit/menuKitGenerator';
import { secureError } from '@lib/security/secureLogger';
import { Button, Card, Flex, message, theme, Tooltip, Typography } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { LuCopy, LuDownload, LuMapPin, LuMessageCircle, LuPackage, LuShare2 } from 'react-icons/lu';

const { Text } = Typography;

interface MenuKitSectionProps {
    storeName: string;
    menuUrl: string;
    shortLink: string;
    logoUrl?: string;
    menuModifiedOn?: Timestamp | null;
    businessType?: string;
    businessCategory?: string;
    activePlanType?: string | null;
    brandColor?: string;
    locale?: string;
}

export default function MenuKitSection({
    storeName,
    menuUrl,
    shortLink,
    logoUrl,
    menuModifiedOn,
    businessType,
    businessCategory,
    activePlanType,
    brandColor,
    locale,
}: MenuKitSectionProps) {
    const { token } = theme.useToken();
    const [generating, setGenerating] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const labels = getOfferingLabels(businessType, businessCategory);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
    }, []);

    const parseTimestamp = (ts: Timestamp | null | undefined): Date | undefined => {
        if (!ts) return undefined;
        if (ts instanceof Timestamp) return ts.toDate();
        if ((ts as any)?.seconds) return new Date((ts as any).seconds * 1000);
        return undefined;
    };

    const handleDownloadKit = async () => {
        setGenerating(true);
        try {
            const result = await generateMenuKit({
                storeName,
                menuUrl,
                shortLink,
                logoUrl,
                brandColor,
                lastPublishedAt: parseTimestamp(menuModifiedOn),
                businessType,
                businessCategory,
                activePlanType,
                locale,
            });

            const safeName = storeName
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .trim()
                .replace(/\s+/g, '_') || 'Menu';

            downloadBlob(result.zipBlob, `${safeName}_MenuKit.zip`);
            trackMenuKitDownload('zip_download');
            message.success('Menu Kit downloaded');
        } catch (error) {
            secureError('[MenuKit] Generation failed', error instanceof Error ? error : new Error(String(error)));
            message.error('Failed to generate Menu Kit. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleShareAsset = async (assetIndex: number, label: string) => {
        try {
            const result = await generateMenuKit({
                storeName,
                menuUrl,
                shortLink,
                logoUrl,
                brandColor,
                lastPublishedAt: parseTimestamp(menuModifiedOn),
                businessType,
                businessCategory,
                activePlanType,
                locale,
            });
            const asset = result.assets[assetIndex];
            if (!asset) return;
            const shared = await shareBlob(asset.blob, asset.filename, label);
            // Track individual asset share/download
            const actionMap: Record<number, 'share_instagram' | 'share_whatsapp' | 'share_google_maps'> = {
                5: 'share_instagram', 6: 'share_whatsapp', 7: 'share_google_maps',
            };
            if (actionMap[assetIndex]) trackMenuKitDownload(actionMap[assetIndex]);
            if (!shared) {
                downloadBlob(asset.blob, asset.filename);
                message.success(`${label} downloaded`);
            }
        } catch {
            message.error('Failed to generate asset');
        }
    };

    const handleCopyShareMessage = async () => {
        try {
            const msg = `${labels.shareMessagePrefix}\n${menuUrl}`;
            await navigator.clipboard.writeText(msg);
            message.success('Share message copied');
        } catch {
            message.error('Failed to copy');
        }
    };

    const handleCopyStaffScript = async () => {
        try {
            await navigator.clipboard.writeText(labels.staffScript);
            message.success('Staff line copied');
        } catch {
            message.error('Failed to copy');
        }
    };

    const handleWhatsAppShare = () => {
        const msg = `${labels.shareMessagePrefix}\n${menuUrl}\n(Always updated)`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <Card size="small" styles={{ body: { padding: 16 } }}>
            <Flex vertical gap={12}>
                <Flex gap={8} align="center">
                    <LuPackage size={18} />
                    <Text strong>Menu Kit</Text>
                </Flex>

                <Text type="secondary" style={{ fontSize: 12 }}>
                    Print files, social images, and placement guide — all in one download.
                </Text>

                {/* Primary download — ZIP bundle (best for desktop) */}
                <Button
                    type="primary"
                    icon={<LuDownload />}
                    onClick={handleDownloadKit}
                    loading={generating}
                    block
                >
                    {generating ? 'Generating...' : 'Download Menu Kit'}
                </Button>

                {/* Mobile-optimized: individual share buttons via Web Share API */}
                {supportsNativeShare && (
                    <Flex gap={8} wrap="wrap">
                        <Button size="small" icon={<LuShare2 size={14} />} onClick={() => handleShareAsset(5, 'Instagram Story')}>
                            Instagram
                        </Button>
                        <Button size="small" icon={<LuShare2 size={14} />} onClick={() => handleShareAsset(6, 'WhatsApp Status')}>
                            WA Status
                        </Button>
                        <Button size="small" icon={<LuShare2 size={14} />} onClick={() => handleShareAsset(7, 'Google Maps')}>
                            Google Maps
                        </Button>
                    </Flex>
                )}

                <Text type="secondary" style={{ fontSize: 11 }}>
                    Includes: Table tent · Single table/counter card · Counter sticker · Entrance poster · Delivery bag sticker · Takeaway card · Instagram story · WhatsApp status · Google Maps image · Placement guide · Print instructions
                </Text>

                {/* Copy share message + WhatsApp quick share */}
                <Flex
                    gap={8}
                    align="center"
                    style={{
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        paddingTop: 10,
                    }}
                >
                    <Tooltip title={`${labels.shareMessagePrefix}\n${menuUrl}`}>
                        <Button size="small" icon={<LuCopy size={14} />} onClick={handleCopyShareMessage}>
                            Copy share message
                        </Button>
                    </Tooltip>
                    <Button size="small" icon={<LuMessageCircle size={14} />} onClick={handleWhatsAppShare} style={{ color: '#25D366' }}>
                        WhatsApp
                    </Button>
                </Flex>

                {/* Google Business Profile hint */}
                <Flex gap={6} align="flex-start" style={{ background: token.colorBgLayout, borderRadius: 6, padding: '8px 10px' }}>
                    <LuMapPin size={14} style={{ flexShrink: 0, marginTop: 2, color: token.colorTextSecondary }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        Add your {labels.gbpLabel} link to Google Maps: find your business → Edit → Menu/Website → paste your link.
                    </Text>
                </Flex>

                {/* Staff Script */}
                <Flex
                    gap={8}
                    align="center"
                    justify="space-between"
                    style={{
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        paddingTop: 10,
                    }}
                >
                    <Flex vertical gap={2} style={{ flex: 1 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Staff line:
                        </Text>
                        <Text style={{ fontSize: 12 }} italic>
                            &ldquo;{labels.staffScript}&rdquo;
                        </Text>
                    </Flex>
                    <Button
                        size="small"
                        type="text"
                        icon={<LuCopy size={14} />}
                        onClick={handleCopyStaffScript}
                    />
                </Flex>
            </Flex>
        </Card>
    );
}
