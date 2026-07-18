'use client';

/**
 * Menu Kit Section — Share Modal Integration
 *
 * Downloads a ZIP bundle of print-ready + social-ready assets.
 * 100% client-side generation — zero Firebase cost.
 * BusinessType-aware: labels adapt to store category (menu/services/catalog).
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 * @see __docs__/menu-kit/_archive/chatgpt-review.md
 */

import { trackMenuKitDownload } from '@lib/analytics/unified';
import {
    copyExportTextToClipboard,
    getBoundedExportStringContext,
    hasExportClipboardWrite,
    hasExportCopyFallback,
    logExportFailure,
} from '@lib/export/exportDiagnostics';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob, generateMenuKit, generateMenuKitAsset, type MenuKitAssetKey, shareBlob } from '@lib/menu-kit/menuKitGenerator';
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

    const getMenuKitExportLogContext = () => ({
        ...getBoundedExportStringContext('storeName', storeName),
        ...getBoundedExportStringContext('menuUrl', menuUrl),
        ...getBoundedExportStringContext('shortLink', shortLink),
        ...getBoundedExportStringContext('businessType', businessType),
        ...getBoundedExportStringContext('businessCategory', businessCategory),
        ...getBoundedExportStringContext('locale', locale),
        hasLogo: Boolean(logoUrl),
        hasBrandColor: Boolean(brandColor),
        hasActivePlanType: Boolean(activePlanType),
        hasMenuModifiedOn: Boolean(menuModifiedOn),
    });

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

            downloadBlob(result.zipBlob, result.zipFilename);
            trackMenuKitDownload('zip_download');
            message.success('Menu Kit downloaded');
        } catch (error) {
            logExportFailure('project_share_menu_kit_generation_failed', error, getMenuKitExportLogContext());
            message.error('Failed to generate Menu Kit. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleShareAsset = async (assetKey: MenuKitAssetKey, label: string) => {
        try {
            const asset = await generateMenuKitAsset({
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
            }, assetKey);
            const shareResult = await shareBlob(asset.blob, asset.filename, label);
            if (shareResult === 'cancelled') return;
            // Track individual asset share/download
            const actionMap: Partial<Record<MenuKitAssetKey, 'share_instagram' | 'share_whatsapp' | 'share_google_maps'>> = {
                google_maps: 'share_google_maps',
                instagram_story: 'share_instagram',
                whatsapp_status: 'share_whatsapp',
            };
            if (actionMap[assetKey]) trackMenuKitDownload(actionMap[assetKey]!);
            if (shareResult === 'shared') {
                message.success(`${label} shared`);
            } else {
                downloadBlob(asset.blob, asset.filename);
                message.success(`${label} downloaded`);
            }
        } catch (error) {
            logExportFailure('project_share_menu_kit_asset_generation_failed', error, {
                ...getMenuKitExportLogContext(),
                assetKey,
            });
            message.error('Failed to generate asset');
        }
    };

    const handleCopyShareMessage = async () => {
        const msg = `${labels.shareMessagePrefix}\n${menuUrl}`;
        try {
            await copyExportTextToClipboard(msg);
            message.success('Share message copied');
        } catch (error) {
            logExportFailure('project_share_menu_kit_message_copy_failed', error, {
                ...getMenuKitExportLogContext(),
                messageLength: msg.length,
                hasClipboardWrite: hasExportClipboardWrite(),
                hasCopyFallback: hasExportCopyFallback(),
            });
            message.error('Failed to copy');
        }
    };

    const handleCopyStaffScript = async () => {
        try {
            await copyExportTextToClipboard(labels.staffScript);
            message.success('Staff line copied');
        } catch (error) {
            logExportFailure('project_share_menu_kit_staff_script_copy_failed', error, {
                ...getMenuKitExportLogContext(),
                staffScriptLength: labels.staffScript.length,
                hasClipboardWrite: hasExportClipboardWrite(),
                hasCopyFallback: hasExportCopyFallback(),
            });
            message.error('Failed to copy');
        }
    };

    const handleWhatsAppShare = () => {
        const msg = `${labels.shareMessagePrefix}\n${menuUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        try {
            const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('project_share_menu_kit_whatsapp_open_blocked');
            }
        } catch (error) {
            logExportFailure('project_share_menu_kit_whatsapp_open_failed', error, {
                ...getMenuKitExportLogContext(),
                messageLength: msg.length,
                whatsappUrlLength: whatsappUrl.length,
            });
            message.error('Failed to open WhatsApp');
        }
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
                        <Button size="small" icon={<LuShare2 size={14} />} onClick={() => handleShareAsset('instagram_story', 'Instagram Story')}>
                            Instagram
                        </Button>
                        <Button size="small" icon={<LuShare2 size={14} />} onClick={() => handleShareAsset('whatsapp_status', 'WhatsApp Status')}>
                            WA Status
                        </Button>
                        <Button size="small" icon={<LuShare2 size={14} />} onClick={() => handleShareAsset('google_maps', 'Google Maps')}>
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
