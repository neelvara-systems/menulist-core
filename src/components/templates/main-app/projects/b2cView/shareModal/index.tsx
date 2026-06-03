import { FEATURE_FLAGS } from '@config/features';
import { LOGO_SMALL } from '@constant/common';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { resolveMenuKitBrandTokens } from '@lib/menu-kit/brandTokens';
import { buildQrCodeFilename, downloadQrCode, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import type { ExtractedDataCategory, ExtractedDataItem } from '@template/main-app/projects/types/extractedData.types';
import { downloadMenuData } from '@template/main-app/projects/utils/excelUtils';
import { generateProjectUrl, slugify } from '@lib/utils/slugify';
import { Button, Card, Checkbox, ColorPicker, Divider, Flex, message, Modal, QRCode, theme, Tooltip, Typography } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa6';
import { LuAlertTriangle, LuCopy, LuDownload, LuExternalLink, LuFileJson, LuFileText, LuSheet } from 'react-icons/lu';
import MenuKitSection from './MenuKitSection';

const { Text, Title } = Typography;

interface ShareModalProps {
    open: boolean;
    onClose: () => void;
    projectId: string;
    projectName?: string;     // Project name for slug generation
    isDefaultProject?: boolean; // If true, uses root URL without slug
    storeName?: string;
    storeDescription?: string;
    storeLogo?: string;
    storeData?: Record<string, any>;
    // Multi-tenant domain settings
    subdomain?: string;       // e.g., "joespizza" → joespizza.menulist.ai
    customDomain?: string;    // e.g., "joespizza.com"
    // PDF freshness awareness (Pricing Integrity)
    menuModifiedOn?: Timestamp | null;
    // BusinessType for category-aware labels
    businessType?: string;
    // PDF Export data
    items?: ExtractedDataItem[];
    categories?: ExtractedDataCategory[];
    language?: string;
    languages?: string[];
    currency?: string;
    currencyCode?: string;
    businessCategory?: string;
    brandColor?: string;
}

// Calculate color contrast ratio (WCAG formula)
function getContrastRatio(hex1: string, hex2: string): number {
    const getLuminance = (hex: string) => {
        const rgb = parseInt(hex.slice(1), 16);
        const r = ((rgb >> 16) & 0xff) / 255;
        const g = ((rgb >> 8) & 0xff) / 255;
        const b = (rgb & 0xff) / 255;
        const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Minimum contrast for QR readability
const MIN_QR_CONTRAST = 4.5;

function withEntrySource(url: string, source: 'copy_link' | 'direct' | 'facebook' | 'instagram' | 'qr' | 'whatsapp'): string {
    return withAnalyticsSource(url, source);
}

function ShareModal({
    open,
    onClose,
    projectId,
    projectName,
    isDefaultProject,
    storeName = 'Your Menu',
    storeDescription,
    storeLogo,
    storeData,
    subdomain,
    customDomain,
    items = [],
    categories = [],
    language = 'en',
    languages = [],
    currency = '',
    currencyCode,
    menuModifiedOn,
    businessType,
    businessCategory,
    brandColor,
}: ShareModalProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const brandTokens = useMemo(() => resolveMenuKitBrandTokens(brandColor), [brandColor]);
    const activePlanType = storeData?.activePlanType || storeData?.publicPresence?.activePlanType || null;

    // PDF freshness: Check if menu was modified since last PDF download
    const PDF_DOWNLOAD_KEY = `menulist_last_pdf_download_${projectId}`;
    const isMenuUpdatedSincePdf = useMemo(() => {
        if (!menuModifiedOn || typeof window === 'undefined') return false;
        const lastDownload = localStorage.getItem(PDF_DOWNLOAD_KEY);
        if (!lastDownload) return false; // First download — no warning needed
        const lastDownloadMs = parseInt(lastDownload, 10);
        const modifiedMs = menuModifiedOn instanceof Timestamp
            ? menuModifiedOn.toMillis()
            : (menuModifiedOn as any)?.seconds ? (menuModifiedOn as any).seconds * 1000 : 0;
        return modifiedMs > lastDownloadMs;
    }, [menuModifiedOn, PDF_DOWNLOAD_KEY]);

    // Generate share URL based on domain settings
    // Priority: customDomain → subdomain → fallback to path-based (localhost only)
    // URL structure: subdomain.menulist.ai/{project-slug} or root for default
    const getShareUrl = () => {
        // R5 link-emitter audit (§9 PUBLIC-ROUTING-DOCTRINE): share URL is the
        // real canonical slug URL for every project — default or not. Under
        // R5 the default project's canonical URL is its real slug, not /menu.
        if (customDomain || subdomain) {
            return generateProjectUrl(
                subdomain,
                customDomain,
                projectName,
                false
            );
        }
        // Fallback for localhost/development or stores without domain setup
        const slug = projectName ? slugify(projectName) : projectId;
        return `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${slug}`;
    };
    const shareUrl = getShareUrl();
    const qrShareUrl = withEntrySource(shareUrl, 'qr');

    const [copied, setCopied] = useState(false);

    // QR customization (hidden by default)
    const [qrColor, setQrColor] = useState(brandTokens.qrDark);
    const [qrBgColor, setQrBgColor] = useState(brandTokens.qrLight);
    const [showLogo, setShowLogo] = useState(true);

    useEffect(() => {
        setQrColor(brandTokens.qrDark);
        setQrBgColor(brandTokens.qrLight);
    }, [brandTokens.qrDark, brandTokens.qrLight]);

    // Auto-correct QR contrast if too low (impossibility-by-design)
    useEffect(() => {
        const contrast = getContrastRatio(qrColor, qrBgColor);
        if (contrast < MIN_QR_CONTRAST) {
            // Silently reset to safe defaults
            setQrColor('#000000');
            setQrBgColor('#ffffff');
        }
    }, [qrColor, qrBgColor]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(withEntrySource(shareUrl, 'copy_link'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            message.error('Failed to copy link');
        }
    };

    const handleDownloadQR = async () => {
        try {
            const dataUrl = await generateBrandedQrCodeDataUrl(qrShareUrl, {
                brandColor,
                darkColor: qrColor,
                footer: qrShareUrl.replace(/^https?:\/\//, ''),
                lightColor: qrBgColor,
                logoUrl: showLogo ? storeLogo : undefined,
                storeName,
                subtitle: `Scan to view ${labels.offeringLower}`,
                title: 'Menu QR',
                activePlanType,
            });
            downloadQrCode(dataUrl, buildQrCodeFilename(`${storeName}-menu`, 'qr'));
            message.success('QR code downloaded');
        } catch {
            message.error('Failed to download QR code');
        }
    };

    const handleShare = (platform: 'whatsapp' | 'facebook' | 'instagram') => {
        const urlWithUTM = withEntrySource(shareUrl, platform);
        const urls = {
            whatsapp: `https://wa.me/?text=${encodeURIComponent(
                FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
                    ? `Here is ${labels.yourLatest}:\n${urlWithUTM}\n(Always updated)`
                    : `Check out our ${labels.offeringLower}: ${urlWithUTM}`
            )}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlWithUTM)}`,
            instagram: urlWithUTM, // Instagram copies to clipboard
        };

        if (platform === 'instagram') {
            navigator.clipboard.writeText(urlWithUTM);
            message.success('Link copied! Paste it in your Instagram bio or story');
        } else {
            window.open(urls[platform], '_blank');
        }
    };

    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<'json' | 'xlsx' | null>(null);

    const exportFilenameBase = useMemo(() => {
        const source = projectName || storeName || 'menu_data';
        return source.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').trim().replace(/\s+/g, '_') || 'menu_data';
    }, [projectName, storeName]);

    const handleStructuredExport = async (type: 'json' | 'xlsx') => {
        if (items.length === 0 && categories.length === 0) {
            message.warning(`No ${labels.offeringLower} data to export`);
            return;
        }

        setExportingFormat(type);
        try {
            await downloadMenuData(
                {
                    items,
                    categories,
                    languages: languages.length > 0 ? languages : (language ? [language] : []),
                },
                type,
                { filenameBase: exportFilenameBase },
            );
            message.success(type === 'xlsx' ? 'Excel export downloaded' : 'JSON export downloaded');
        } catch (error) {
            console.error('[ShareModal] Structured export failed:', error);
            message.error(`Failed to export ${type.toUpperCase()}`);
        } finally {
            setExportingFormat(null);
        }
    };

    const handleDownloadPdf = async () => {
        if (items.length === 0) {
            message.warning(`No ${labels.itemsPlural} to export`);
            return;
        }

        setGeneratingPdf(true);
        try {
            const { generateMenuPdf, downloadPdf } = await import('@lib/export/menuPdfGenerator');
            const pdfResult = await generateMenuPdf({
                projectName: projectName || projectId,
                storeName,
                language,
                menuUrl: shareUrl,
                currency,
                currencyCode,
                storeData,
                logoUrl: storeLogo,
                businessType,
                businessCategory,
                activePlanType,
                brandColor,
                showDescriptions: true,
                items,
                categories,
            });
            downloadPdf(pdfResult);
            // Track PDF download time for freshness detection (Pricing Integrity FR-7.3)
            localStorage.setItem(PDF_DOWNLOAD_KEY, Date.now().toString());
            // Store version hash for pricing audit trail
            if (pdfResult.snapshotHash) {
                localStorage.setItem(`menulist_last_pdf_version_${projectId}`, pdfResult.snapshotHash);
            }
            message.success(`${labels.offeringTitle} PDF downloaded`);
        } catch (error) {
            console.error('[ShareModal] PDF generation failed:', error);
            message.error('Failed to generate PDF');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleOpenMenuCardExport = () => {
        window.location.href = `/use-menulist/menu-card-export?projectId=${encodeURIComponent(projectId)}`;
    };

    return (
        <Modal
            title={null}
            open={open}
            onCancel={onClose}
            footer={null}
            width={480}
        >
            <Flex vertical gap={24} style={{ maxHeight: '70vh', overflow: 'auto', paddingRight: 8 }}>
                {/* Header */}
                <Flex vertical gap={4}>
                    <Title level={4} style={{ margin: 0 }}>{labels.shareTitle}</Title>
                    <Text type="secondary">
                        {FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
                            ? labels.shareSubtitle
                            : 'Works everywhere — WhatsApp, Instagram, QR, any browser'
                        }
                    </Text>
                </Flex>

                {/* Share Preview Confidence - WhatsApp-style unfurl */}
                <Card size="small" style={{ background: token.colorBgLayout }} styles={{ body: { padding: 12 } }}>
                    <Flex gap={12} align="center">
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            background: token.colorBgContainer,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={storeLogo || LOGO_SMALL}
                                alt={storeName}
                                style={{ width: storeLogo ? 48 : 32, height: storeLogo ? 48 : 32, objectFit: 'cover' }}
                            />
                        </div>
                        <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>How your {labels.offeringLower} appears when shared</Text>
                            <Text strong style={{ fontSize: 14 }}>{storeName}</Text>
                            <Text type="secondary" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {storeDescription || `View our ${labels.offeringLower} online`}
                            </Text>
                        </Flex>
                    </Flex>
                </Card>

                <Divider style={{ margin: '8px 0' }} />

                {/* QR Code Section - Full width layout */}
                <Card size="small" styles={{ body: { padding: 16 } }}>
                    <Flex vertical gap={12}>
                        <Flex gap={16} align="flex-start">
                            <div id="share-qrcode" style={{ background: qrBgColor, borderRadius: 8, padding: 8 }}>
                                <QRCode
                                    value={qrShareUrl}
                                    size={160}
                                    errorLevel="H"
                                    color={qrColor}
                                    bgColor={qrBgColor}
                                    icon={showLogo ? (storeLogo || LOGO_SMALL) : undefined}
                                    iconSize={showLogo ? 28 : undefined}
                                />
                            </div>
                            <Flex vertical gap={8} style={{ flex: 1 }}>
                                <Flex gap={8}>
                                    <Tooltip title={isMenuUpdatedSincePdf ? 'Menu updated since last PDF download' : undefined}>
                                        <Button
                                            icon={isMenuUpdatedSincePdf ? <LuAlertTriangle style={{ color: token.colorWarning }} /> : <LuFileText />}
                                            onClick={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? handleOpenMenuCardExport : handleDownloadPdf}
                                            loading={generatingPdf}
                                            disabled={items.length === 0}
                                        >
                                            {FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? 'Print Menu' : 'Menu PDF'}
                                        </Button>
                                    </Tooltip>
                                    <Button
                                        icon={<LuDownload />}
                                        onClick={handleDownloadQR}
                                    >
                                        Download QR
                                    </Button>
                                </Flex>
                            </Flex>
                        </Flex>
                        {/* QR Customization - inline, full width */}
                        <Flex gap={16} justify="space-between" align="center" style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 }}>
                            <Flex align="center" gap={8}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Color:</Text>
                                <ColorPicker size="small" value={qrColor} onChange={(c) => setQrColor(c.toHexString())} />
                            </Flex>
                            <Flex align="center" gap={8}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Background:</Text>
                                <ColorPicker size="small" value={qrBgColor} onChange={(c) => setQrBgColor(c.toHexString())} />
                            </Flex>
                            <Flex align="center" gap={8}>
                                <Checkbox checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Show logo</Text>
                                </Checkbox>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>

                {/* Social Sharing - Priority: WhatsApp (primary) > Instagram > Facebook */}
                <Flex gap={12}>
                    <Button
                        block
                        size="large"
                        type="primary"
                        icon={<FaWhatsapp />}
                        onClick={() => handleShare('whatsapp')}
                        style={{ background: '#25D366', borderColor: '#25D366' }}
                    >
                        WhatsApp
                    </Button>
                    <Button
                        block
                        size="large"
                        icon={<FaInstagram />}
                        onClick={() => handleShare('instagram')}
                    >
                        Instagram
                    </Button>
                    <Button
                        block
                        size="large"
                        icon={<FaFacebook />}
                        onClick={() => handleShare('facebook')}
                    >
                        Facebook
                    </Button>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', marginTop: -8 }}>
                    {FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
                        ? labels.shareStaffHint
                        : 'We auto-optimize previews for each platform'
                    }
                </Text>

                <Card size="small" styles={{ body: { padding: 16 } }}>
                    <Flex vertical gap={12}>
                        <Flex vertical gap={2}>
                            <Text strong>Export Data</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Download the current {labels.offeringLower} structure for backup, migration, or spreadsheet editing.
                            </Text>
                        </Flex>
                        <Flex gap={12}>
                            <Button
                                block
                                icon={<LuSheet />}
                                onClick={() => handleStructuredExport('xlsx')}
                                loading={exportingFormat === 'xlsx'}
                            >
                                Export XLSX
                            </Button>
                            <Button
                                block
                                icon={<LuFileJson />}
                                onClick={() => handleStructuredExport('json')}
                                loading={exportingFormat === 'json'}
                            >
                                Export JSON
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                {/* Menu Kit — Print + Social asset pack */}
                {FEATURE_FLAGS.ENABLE_MENU_KIT && (
                    <MenuKitSection
                        storeName={storeName}
                        menuUrl={shareUrl}
                        shortLink={shareUrl.replace(/^https?:\/\//, '')}
                        logoUrl={storeLogo}
                        menuModifiedOn={menuModifiedOn}
                        businessType={businessType}
                        businessCategory={businessCategory}
                        brandColor={brandColor}
                        activePlanType={activePlanType}
                    />
                )}

                {/* Bottom row: Analytics + More options inline */}
                <Flex justify="space-between" align="center">
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        We track scans and opens so you can see what works
                    </Text>
                    <Flex gap={8}>
                        <Button size="small" type="text" icon={<LuExternalLink />} onClick={() => window.location.assign(withEntrySource(shareUrl, 'direct'))}>
                            Open
                        </Button>
                        <Button size="small" type="text" icon={<LuCopy />} onClick={() => { navigator.clipboard.writeText(withEntrySource(shareUrl, 'copy_link')); message.success('URL copied'); }}>
                            Copy URL
                        </Button>
                    </Flex>
                </Flex>
            </Flex>
        </Modal>
    );
}

export default ShareModal;
