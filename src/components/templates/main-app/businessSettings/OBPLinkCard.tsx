'use client';

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

import { FEATURE_FLAGS } from '@config/features';
import { getExistingProjectsListWithoutLoader } from '@database/projects';
import { getBoundedStoreStringContext, logStoreDataFailure } from '@database/stores/storeDiagnostics';
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

const { Text } = Typography;
type OBPShareMethod = 'copy_link' | 'copy_message' | 'whatsapp';

const OBP_LINK_CARD_COPY_UNAVAILABLE = 'obp_link_card_copy_unavailable';
const OBP_LINK_CARD_COPY_FALLBACK_FAILED = 'obp_link_card_copy_fallback_failed';
const OBP_LINK_CARD_MESSAGE_COPY_UNAVAILABLE = 'obp_link_card_message_copy_unavailable';
const OBP_LINK_CARD_MESSAGE_COPY_FALLBACK_FAILED = 'obp_link_card_message_copy_fallback_failed';

const hasOBPLinkCardClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasOBPLinkCardCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyOBPLinkCardText = async (
    value: string,
    unavailableCode: string,
    fallbackFailureCode: string,
): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasOBPLinkCardClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasOBPLinkCardCopyFallback()) {
        throw clipboardWriteError || new Error(unavailableCode);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(fallbackFailureCode);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

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
            } catch (error) {
                logStoreDataFailure('obp_link_card_default_project_load_failed', error, {
                    surface: 'obp_link_card',
                    action: 'load_default_project',
                    ...getBoundedStoreStringContext('storeId', storeDetails?.storeId),
                    ...getBoundedStoreStringContext('tenantId', (storeDetails as any)?.tenantId),
                });
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
    const activeQrUrl = withAnalyticsSource(qrType === 'menu' ? menuUrl : obpUrl, 'qr');
    const buildOBPLinkCardLogContext = (
        action: string,
        metadata: Record<string, boolean | number | string | undefined> = {},
    ) => ({
        surface: 'obp_link_card',
        action,
        hasDefaultSlug: Boolean(defaultSlug),
        hasLogo: Boolean((storeDetails as any)?.logo),
        obpTrackingEnabled,
        qrType,
        ...getBoundedStoreStringContext('storeId', storeDetails?.storeId),
        ...getBoundedStoreStringContext('tenantId', (storeDetails as any)?.tenantId),
        ...getBoundedStoreStringContext('obpUrl', obpUrl),
        ...getBoundedStoreStringContext('menuUrl', menuUrl),
        ...metadata,
    });
    const recordOBPShare = (shareMethod: OBPShareMethod, action: string) => {
        if (!storeId || !obpTrackingEnabled) return;
        trackOBPShare(storeId, shareMethod, {
            storeTimeZone: storeDetails?.timeZone,
            businessDayEndTime: storeDetails?.businessDayEndTime,
        }).catch((error) => {
            logStoreDataFailure('obp_link_card_share_tracking_failed', error, buildOBPLinkCardLogContext(action, {
                shareMethod,
            }));
        });
    };

    const handleCopy = async () => {
        try {
            await copyOBPLinkCardText(
                obpCopyUrl,
                OBP_LINK_CARD_COPY_UNAVAILABLE,
                OBP_LINK_CARD_COPY_FALLBACK_FAILED,
            );
            setCopied(true);
            message.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
            recordOBPShare('copy_link', 'track_copy_link');
        } catch (error) {
            logStoreDataFailure('obp_link_card_copy_failed', error, buildOBPLinkCardLogContext('copy_link', {
                ...getBoundedStoreStringContext('copyUrl', obpCopyUrl),
                hasClipboardWrite: hasOBPLinkCardClipboardWrite(),
                hasCopyFallback: hasOBPLinkCardCopyFallback(),
            }));
            message.error('Could not copy link');
        }
    };

    const handleCopyMessage = async () => {
        const msg = `Here's our menu, timings & location:\n${obpCopyUrl}`;
        try {
            await copyOBPLinkCardText(
                msg,
                OBP_LINK_CARD_MESSAGE_COPY_UNAVAILABLE,
                OBP_LINK_CARD_MESSAGE_COPY_FALLBACK_FAILED,
            );
            message.success('Message copied — paste it in WhatsApp or anywhere');
            recordOBPShare('copy_message', 'track_copy_message');
        } catch (error) {
            logStoreDataFailure('obp_link_card_copy_message_failed', error, buildOBPLinkCardLogContext('copy_message', {
                copyMessageLength: msg.length,
                hasClipboardWrite: hasOBPLinkCardClipboardWrite(),
                hasCopyFallback: hasOBPLinkCardCopyFallback(),
            }));
            message.error('Could not copy message');
        }
    };

    const handleWhatsAppShare = () => {
        const storeName = getBrandName(storeDetails, 'our business');
        const msg = `${storeName} — menu, timings & contact:\n${obpWhatsAppUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        try {
            openIsolatedBrowserUrl(whatsappUrl);
            recordOBPShare('whatsapp', 'track_whatsapp');
        } catch (error) {
            logStoreDataFailure('obp_link_card_whatsapp_open_failed', error, buildOBPLinkCardLogContext('whatsapp_open', {
                whatsappMessageLength: msg.length,
                whatsappUrlLength: whatsappUrl.length,
            }));
            message.error('Could not open WhatsApp');
        }
    };

    const handleOpen = () => {
        try {
            openIsolatedBrowserUrl(obpOpenUrl);
        } catch (error) {
            logStoreDataFailure('obp_link_card_open_failed', error, buildOBPLinkCardLogContext('open_link', {
                ...getBoundedStoreStringContext('openUrl', obpOpenUrl),
            }));
            message.error('Could not open link');
        }
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
        } catch (error) {
            logStoreDataFailure('obp_link_card_qr_download_failed', error, buildOBPLinkCardLogContext('download_qr', {
                ...getBoundedStoreStringContext('qrUrl', activeQrUrl),
            }));
            message.error('Could not download QR code');
        }
    };

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
