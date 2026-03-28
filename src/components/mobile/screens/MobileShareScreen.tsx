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
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} className="border-b border-gray-200 dark:border-gray-700">
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
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
                        <Card className="rounded-xl">
                            <div className="flex flex-col items-center py-4 gap-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <LuGlobe size={16} className="text-blue-500" />
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('officialBusinessLink')}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl">
                                    <QRCodeCanvas
                                        value={obpUrl}
                                        size={140}
                                        level="H"
                                        includeMargin={false}
                                        id="obp-qr-code"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 text-center break-all px-4">
                                    {obpUrl}
                                </p>
                                <div className="flex gap-2">
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
                                        <LuCopy size={14} className="inline mr-1" />
                                        {t('copy')}
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
                                        <LuDownload size={14} className="inline mr-1" />
                                        QR
                                    </Button>
                                </div>
                                <p className="text-[11px] text-gray-400 text-center">
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
                <Card className="rounded-xl">
                    <div className="flex flex-col items-center py-6 gap-4">
                        <div className="bg-white p-4 rounded-xl">
                            <QRCodeCanvas
                                value={menuUrl}
                                size={192}
                                level="H"
                                includeMargin={false}
                                id="mobile-qr-code"
                            />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            {FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
                                ? t('menuNudgeHint')
                                : t('menuScanHint')
                            }
                        </p>
                        <p className="text-xs text-gray-400 text-center break-all px-4">
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
                            <LuDownload size={14} className="inline mr-1" />
                            {t('saveQrImage')}
                        </Button>
                    </div>
                </Card>

                {/* PDF Download */}
                <Card className="rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{t('menuPdf')}</p>
                            <p className="text-xs text-gray-500">{t('menuPdfDesc')}</p>
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
                            <LuFileText size={14} className="inline mr-1" />
                            {t('download')}
                        </Button>
                    </div>
                </Card>

                {/* Menu Kit — Print + Social assets (mobile-optimized individual share) */}
                {FEATURE_FLAGS.ENABLE_MENU_KIT && (
                    <Card className="rounded-xl">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <LuPackage size={16} className="text-gray-600" />
                                <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{labels.offeringTitle} Kit</p>
                            </div>
                            <p className="text-xs text-gray-500">Share print-ready and social-ready assets directly.</p>
                            {supportsNativeShare && (
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        size="mini"
                                        fill="outline"
                                        loading={generatingKit}
                                        onClick={() => handleShareMenuKitAsset(5, 'Instagram Story')}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuShare2 size={12} className="inline mr-1" />
                                        Instagram
                                    </Button>
                                    <Button
                                        size="mini"
                                        fill="outline"
                                        loading={generatingKit}
                                        onClick={() => handleShareMenuKitAsset(6, 'WhatsApp Status')}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuShare2 size={12} className="inline mr-1" />
                                        WA Status
                                    </Button>
                                    <Button
                                        size="mini"
                                        fill="outline"
                                        loading={generatingKit}
                                        onClick={() => handleShareMenuKitAsset(7, 'Google Maps')}
                                        style={{ minHeight: '36px' }}
                                    >
                                        <LuShare2 size={12} className="inline mr-1" />
                                        Google Maps
                                    </Button>
                                </div>
                            )}
                            <Button
                                size="small"
                                fill="outline"
                                onClick={handleCopyShareMessage}
                                style={{ minHeight: '36px' }}
                            >
                                <LuCopy size={14} className="inline mr-1" />
                                Copy share message
                            </Button>
                            {/* GBP Hint */}
                            <div className="flex gap-2 items-start bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                                <LuMapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-gray-400">
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
                <div className="space-y-3">
                    <Button
                        block
                        color="primary"
                        fill="solid"
                        size="large"
                        onClick={handleCopyLink}
                        style={{ minHeight: '44px' }}
                    >
                        <LuCopy size={16} className="inline mr-2" />
                        {t('copyLink')}
                    </Button>

                    <Button
                        block
                        color="success"
                        fill="solid"
                        size="large"
                        onClick={handleShareWhatsApp}
                        style={{ minHeight: '44px', backgroundColor: '#25D366', borderColor: '#25D366' }}
                    >
                        <LuMessageCircle size={16} className="inline mr-2" />
                        {t('shareWhatsApp')}
                    </Button>

                    {supportsNativeShare && (
                        <Button
                            block
                            fill="outline"
                            size="large"
                            onClick={handleNativeShare}
                            style={{ minHeight: '44px' }}
                        >
                            <LuShare2 size={16} className="inline mr-2" />
                            {t('moreOptions')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
