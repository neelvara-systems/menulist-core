'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getScreenState } from '@database/campaigns';
import { getProjectData, getProjectsList } from '@database/projects';
import { trackMenuKitDownload } from '@lib/analytics/unified';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob, generateMenuKit, shareBlob } from '@lib/menu-kit/menuKitGenerator';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, NavBar, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { QRCodeCanvas } from 'qrcode.react';
import { useContext, useEffect, useState } from 'react';
import { LuCopy, LuDownload, LuFileText, LuGlobe, LuMapPin, LuMessageCircle, LuPackage, LuShare2 } from 'react-icons/lu';
import MobileCommunicationKit from '../components/CommunicationKit';
import MobilePresenceMonitor from '../components/PresenceMonitor';

/**
 * Build a readable address string from store fields.
 */
function buildMobileStoreAddress(store: any): string | undefined {
    const parts = [
        store.addressLine,
        store.area,
        store.city,
        store.state,
        store.postalCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
}

interface MobileShareScreenProps {
    onBack: () => void;
}

export default function MobileShareScreen({ onBack }: MobileShareScreenProps) {
    const t = useTranslations('MobileShare');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [generatingKit, setGeneratingKit] = useState(false);
    const [hasScreen, setHasScreen] = useState(false);
    const labels = getOfferingLabels(storeDetails?.businessType);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
        // Load screen state for presence monitor
        getScreenState().then(state => {
            if (state?.screenToken) setHasScreen(true);
        }).catch(() => { /* Screen not initialized — OK */ });
    }, []);

    // Build URL using same logic as desktop ShareModal
    const menuUrl = generateProjectUrl(
        storeDetails?.subdomain,
        storeDetails?.customDomain,
        undefined, // No specific project — share store root
        true       // isDefault = true → root URL
    );

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(menuUrl);
            Toast.show({ content: t('linkCopied'), duration: 1500 });
        } catch {
            Toast.show({ content: t('couldNotCopy'), duration: 1500 });
        }
    };

    const handleShareWhatsApp = () => {
        const msg = FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
            ? `${labels.shareMessagePrefix}\n${menuUrl}\n(Always updated)`
            : `${labels.shareMessagePrefix} ${menuUrl}`;
        const text = encodeURIComponent(msg);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleCopyShareMessage = async () => {
        try {
            const msg = `${labels.shareMessagePrefix}\n${menuUrl}`;
            await navigator.clipboard.writeText(msg);
            Toast.show({ content: t('shareMessageCopied'), duration: 1500 });
        } catch {
            Toast.show({ content: t('couldNotCopy'), duration: 1500 });
        }
    };

    const handleShareMenuKitAsset = async (assetIndex: number, label: string) => {
        setGeneratingKit(true);
        try {
            const shortLink = menuUrl.replace(/^https?:\/\//, '');
            const result = await generateMenuKit({
                storeName: storeDetails?.name || 'Menu',
                menuUrl,
                shortLink,
                logoUrl: storeDetails?.logo,
                businessType: storeDetails?.businessType,
                locale: storeDetails?.defaultLanguage,
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
                Toast.show({ content: `${label} downloaded`, duration: 1500 });
            }
        } catch {
            Toast.show({ content: 'Failed to generate asset', duration: 2000 });
        } finally {
            setGeneratingKit(false);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: storeDetails?.name || labels.offeringTitle,
                    text: `Check out our ${labels.offeringLower}`,
                    url: menuUrl,
                });
            } catch {
                // User cancelled or share failed silently
            }
        } else {
            handleCopyLink();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <NavBar onBack={onBack} style={{ borderBottom: '1px solid var(--adm-color-border, #e5e7eb)' }}>
                {t('title')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Menu Presence Monitor */}
                {storeDetails && (
                    <MobilePresenceMonitor
                        hasPublishedMenu={!!menuUrl}
                        hasScreen={hasScreen}
                        hasFeedbackEnabled={storeDetails.feedbackEnabled !== false}
                        storeDetails={storeDetails}
                        menuLink={menuUrl}
                    />
                )}

                {/* Official Business Link (OBP) */}
                {FEATURE_FLAGS.ENABLE_OBP && storeDetails?.subdomain && (() => {
                    const obpUrl = generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain);
                    if (!obpUrl) return null;
                    return (
                        <Card style={{ borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <LuGlobe size={16} color="#3b82f6" />
                                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{t('officialBusinessLink')}</p>
                                </div>
                                <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px' }}>
                                    <QRCodeCanvas
                                        value={obpUrl}
                                        size={140}
                                        level="H"
                                        includeMargin={false}
                                        id="obp-qr-code"
                                    />
                                </div>
                                <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', wordBreak: 'break-all', padding: '0 16px' }}>
                                    {obpUrl}
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        size="small"
                                        fill="solid"
                                        color="primary"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(obpUrl);
                                                Toast.show({ content: t('linkCopied'), duration: 1500 });
                                            } catch {
                                                Toast.show({ content: t('couldNotCopy'), duration: 1500 });
                                            }
                                        }}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuCopy size={14} style={{ display: 'inline', marginRight: '4px' }} /> {t('copy')}
                                    </Button>
                                    <Button
                                        size="small"
                                        fill="outline"
                                        onClick={() => {
                                            const canvas = document.getElementById('obp-qr-code') as HTMLCanvasElement;
                                            if (canvas) {
                                                const link = document.createElement('a');
                                                link.download = `${storeDetails?.name || 'business'}-qr.png`;
                                                link.href = canvas.toDataURL('image/png');
                                                link.click();
                                                Toast.show({ content: t('qrDownloaded'), duration: 1000 });
                                            }
                                        }}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuDownload size={14} style={{ display: 'inline', marginRight: '4px' }} /> QR
                                    </Button>
                                </div>
                                <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                                    {FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
                                        ? t('obpNudgeHint')
                                        : t('obpShareHint')
                                    }
                                </p>
                            </div>
                        </Card>
                    );
                })()}

                {/* Menu QR Code */}
                <Card style={{ borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '16px' }}>
                        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px' }}>
                            <QRCodeCanvas
                                value={menuUrl}
                                size={192}
                                level="H"
                                includeMargin={false}
                                id="mobile-qr-code"
                            />
                        </div>
                        <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                            {FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
                                ? t('menuNudgeHint')
                                : t('menuScanHint')
                            }
                        </p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', wordBreak: 'break-all', padding: '0 16px' }}>
                            {menuUrl}
                        </p>
                        <Button
                            size="small"
                            fill="outline"
                            onClick={() => {
                                const canvas = document.getElementById('mobile-qr-code') as HTMLCanvasElement;
                                if (canvas) {
                                    const link = document.createElement('a');
                                    link.download = `${storeDetails?.name || 'menu'}-qr.png`;
                                    link.href = canvas.toDataURL('image/png');
                                    link.click();
                                    Toast.show({ content: t('qrDownloaded'), duration: 1000 });
                                }
                            }}
                            style={{ minHeight: '36px' }}
                        >
                            <LuDownload size={14} style={{ display: 'inline', marginRight: '4px' }} /> {t('saveQrImage')}
                        </Button>
                    </div>
                </Card>

                {/* PDF Download */}
                <Card style={{ borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>{t('menuPdf')}</p>
                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('menuPdfDesc')}</p>
                        </div>
                        <Button
                            size="small"
                            fill="outline"
                            loading={generatingPdf}
                            onClick={async () => {
                                setGeneratingPdf(true);
                                try {
                                    const result = await getProjectsList();
                                    const projects = result?.projects || [];
                                    const defaultProject = projects.find((p: any) => p.isDefault) || projects[0];
                                    if (!defaultProject?.projectId) {
                                        Toast.show({ content: t('noMenuFound'), duration: 2000 });
                                        return;
                                    }
                                    const fullProject: any = await getProjectData(defaultProject.projectId);
                                    const items = fullProject?.files?.flatMap((f: any) => f.extractedData?.data?.items || []) || [];
                                    const categories = fullProject?.files?.flatMap((f: any) => f.extractedData?.data?.categories || []) || [];
                                    if (items.length === 0) {
                                        Toast.show({ content: t('noMenuItems'), duration: 2000 });
                                        return;
                                    }
                                    const { generateAndDownloadMenuPdf } = await import('@lib/export/menuPdfGenerator');
                                    await generateAndDownloadMenuPdf({
                                        projectName: fullProject?.name || defaultProject?.name || 'menu',
                                        storeName: storeDetails?.name || 'Menu',
                                        language: fullProject?.languages?.[0] || 'en',
                                        menuUrl,
                                        currency: storeDetails?.currencySymbol || '',
                                        showDescriptions: true,
                                        items,
                                        categories,
                                    });
                                    Toast.show({ content: t('pdfDownloaded'), duration: 1500 });
                                } catch {
                                    Toast.show({ content: t('pdfFailed'), duration: 2000 });
                                } finally {
                                    setGeneratingPdf(false);
                                }
                            }}
                            style={{ minHeight: '36px' }}
                        >
                            <LuFileText size={14} style={{ display: 'inline', marginRight: '4px' }} /> {t('download')}
                        </Button>
                    </div>
                </Card>

                {/* Menu Kit — Print + Social assets (mobile-optimized individual share) */}
                {FEATURE_FLAGS.ENABLE_MENU_KIT && (
                    <Card style={{ borderRadius: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LuPackage size={16} color="#6b7280" />
                                <p style={{ fontSize: '15px', fontWeight: 500, color: '#1f2937' }}>{labels.offeringTitle} Kit</p>
                            </div>
                            <p style={{ fontSize: '12px', color: '#6b7280' }}>Share print-ready and social-ready assets directly.</p>
                            {supportsNativeShare && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <Button
                                        size="mini"
                                        fill="outline"
                                        loading={generatingKit}
                                        onClick={() => handleShareMenuKitAsset(5, 'Instagram Story')}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuShare2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Instagram
                                    </Button>
                                    <Button
                                        size="mini"
                                        fill="outline"
                                        loading={generatingKit}
                                        onClick={() => handleShareMenuKitAsset(6, 'WhatsApp Status')}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuShare2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> WA Status
                                    </Button>
                                    <Button
                                        size="mini"
                                        fill="outline"
                                        loading={generatingKit}
                                        onClick={() => handleShareMenuKitAsset(7, 'Google Maps')}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuShare2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Google Maps
                                    </Button>
                                </div>
                            )}
                            <Button
                                size="small"
                                fill="outline"
                                onClick={handleCopyShareMessage}
                                style={{ minHeight: '36px' }}
                            >
                                <LuCopy size={14} style={{ display: 'inline', marginRight: '4px' }} /> Copy share message
                            </Button>
                            {/* GBP Hint */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '8px' }}>
                                <LuMapPin size={14} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                                    Add your {labels.gbpLabel} link to Google Maps: find your business → Edit → Menu/Website → paste your link.
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Customer Messages (Communication Kit) */}
                {FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT && storeDetails && (
                    <MobileCommunicationKit
                        storeName={storeDetails.name || 'Your Business'}
                        businessType={storeDetails.businessType || ''}
                        menuLink={menuUrl}
                        address={buildMobileStoreAddress(storeDetails)}
                        phone={storeDetails.phoneNumber || undefined}
                        workingHours={storeDetails.workingHours}
                        timeZone={storeDetails.timeZone}
                    />
                )}

                {/* Share Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Button
                        block
                        color="primary"
                        fill="solid"
                        size="large"
                        onClick={handleCopyLink}
                        style={{ minHeight: '44px' }}
                    >
                        <LuCopy size={16} style={{ display: 'inline', marginRight: '8px' }} /> {t('copyLink')}
                    </Button>

                    <Button
                        block
                        color="success"
                        fill="solid"
                        size="large"
                        onClick={handleShareWhatsApp}
                        style={{ minHeight: '44px', backgroundColor: '#25D366', borderColor: '#25D366' }}
                    >
                        <LuMessageCircle size={16} style={{ display: 'inline', marginRight: '8px' }} /> {t('shareWhatsApp')}
                    </Button>

                    {supportsNativeShare && (
                        <Button
                            block
                            fill="outline"
                            size="large"
                            onClick={handleNativeShare}
                            style={{ minHeight: '44px' }}
                        >
                            <LuShare2 size={16} style={{ display: 'inline', marginRight: '8px' }} /> {t('moreOptions')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
