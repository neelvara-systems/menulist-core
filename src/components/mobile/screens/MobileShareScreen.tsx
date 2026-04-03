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
import { useTranslations } from 'next-intl';
import { QRCodeCanvas } from 'qrcode.react';
import { useContext, useEffect, useState } from 'react';
import { LuCopy, LuDownload, LuFileText, LuGlobe, LuMapPin, LuMessageCircle, LuPackage, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, NavBar, Space, Text, Title, Toast } from '../antd';
import MobileCommunicationKit from '../components/CommunicationKit';
import MobilePresenceMonitor from '../components/PresenceMonitor';

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

function downloadCanvasAsPng(canvasId: string, filename: string, successMessage: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    Toast.show({ content: successMessage, duration: 1000 });
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
        getScreenState()
            .then((state) => {
                if (state?.screenToken) setHasScreen(true);
            })
            .catch(() => undefined);
    }, []);

    const menuUrl = generateProjectUrl(
        storeDetails?.subdomain,
        storeDetails?.customDomain,
        undefined,
        true
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
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCopyShareMessage = async () => {
        try {
            await navigator.clipboard.writeText(`${labels.shareMessagePrefix}\n${menuUrl}`);
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
            const actionMap: Record<number, 'share_instagram' | 'share_whatsapp' | 'share_google_maps'> = {
                5: 'share_instagram',
                6: 'share_whatsapp',
                7: 'share_google_maps',
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
                return;
            }
            return;
        }
        await handleCopyLink();
    };

    const handleDownloadPdf = async () => {
        setGeneratingPdf(true);
        try {
            const result = await getProjectsList();
            const projects = result?.projects || [];
            const defaultProject = projects.find((project: any) => project.isDefault) || projects[0];
            if (!defaultProject?.projectId) {
                Toast.show({ content: t('noMenuFound'), duration: 2000 });
                return;
            }

            const fullProject: any = await getProjectData(defaultProject.projectId);
            const items = fullProject?.files?.flatMap((file: any) => file.extractedData?.data?.items || []) || [];
            const categories = fullProject?.files?.flatMap((file: any) => file.extractedData?.data?.categories || []) || [];
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
    };

    const obpUrl = FEATURE_FLAGS.ENABLE_OBP && storeDetails?.subdomain
        ? generateOBPUrl(storeDetails.subdomain, storeDetails.customDomain)
        : null;

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack}>
                {t('title')}
            </NavBar>

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                {storeDetails ? (
                    <MobilePresenceMonitor
                        hasFeedbackEnabled={storeDetails.feedbackEnabled !== false}
                        hasPublishedMenu={!!menuUrl}
                        hasScreen={hasScreen}
                        menuLink={menuUrl}
                        storeDetails={storeDetails}
                    />
                ) : null}

                {obpUrl ? (
                    <Card>
                        <Flex align="center" gap={16} vertical>
                            <Flex align="center" gap={8}>
                                <LuGlobe color="#1677ff" size={16} />
                                <Title level={5} style={{ margin: 0 }}>
                                    {t('officialBusinessLink')}
                                </Title>
                            </Flex>
                            <Card size="small">
                                <QRCodeCanvas
                                    id="obp-qr-code"
                                    includeMargin={false}
                                    level="H"
                                    size={140}
                                    value={obpUrl}
                                />
                            </Card>
                            <Text style={{ textAlign: 'center', wordBreak: 'break-all' }}>{obpUrl}</Text>
                            <Flex gap={8}>
                                <Button
                                    color="primary"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(obpUrl);
                                            Toast.show({ content: t('linkCopied'), duration: 1500 });
                                        } catch {
                                            Toast.show({ content: t('couldNotCopy'), duration: 1500 });
                                        }
                                    }}
                                    size="small"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuCopy size={14} />
                                        <Text>{t('copy')}</Text>
                                    </Flex>
                                </Button>
                                <Button
                                    fill="outline"
                                    onClick={() => downloadCanvasAsPng('obp-qr-code', `${storeDetails?.name || 'business'}-qr.png`, t('qrDownloaded'))}
                                    size="small"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuDownload size={14} />
                                        <Text>QR</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                {FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES ? t('obpNudgeHint') : t('obpShareHint')}
                            </Text>
                        </Flex>
                    </Card>
                ) : null}

                <Card>
                    <Flex align="center" gap={16} vertical>
                        <Card size="small">
                            <QRCodeCanvas
                                id="mobile-qr-code"
                                includeMargin={false}
                                level="H"
                                size={192}
                                value={menuUrl}
                            />
                        </Card>
                        <Text style={{ textAlign: 'center' }}>
                            {FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES ? t('menuNudgeHint') : t('menuScanHint')}
                        </Text>
                        <Text style={{ textAlign: 'center', wordBreak: 'break-all' }}>{menuUrl}</Text>
                        <Button
                            fill="outline"
                            onClick={() => downloadCanvasAsPng('mobile-qr-code', `${storeDetails?.name || 'menu'}-qr.png`, t('qrDownloaded'))}
                            size="small"
                        >
                            <Flex align="center" gap={6}>
                                <LuDownload size={14} />
                                <Text>{t('saveQrImage')}</Text>
                            </Flex>
                        </Button>
                    </Flex>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex gap={4} vertical>
                            <Text strong>{t('menuPdf')}</Text>
                            <Text type="secondary">{t('menuPdfDesc')}</Text>
                        </Flex>
                        <Button fill="outline" loading={generatingPdf} onClick={handleDownloadPdf} size="small">
                            <Flex align="center" gap={6}>
                                <LuFileText size={14} />
                                <Text>{t('download')}</Text>
                            </Flex>
                        </Button>
                    </Flex>
                </Card>

                {FEATURE_FLAGS.ENABLE_MENU_KIT ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" gap={8}>
                                <LuPackage color="#6b7280" size={16} />
                                <Text strong>{`${labels.offeringTitle} Kit`}</Text>
                            </Flex>
                            <Text type="secondary">Share print-ready and social-ready assets directly.</Text>

                            {supportsNativeShare ? (
                                <Space size={[8, 8]} wrap>
                                    <Button fill="outline" loading={generatingKit} onClick={() => handleShareMenuKitAsset(5, 'Instagram Story')} size="small">
                                        <Flex align="center" gap={6}>
                                            <LuShare2 size={12} />
                                            <Text>Instagram</Text>
                                        </Flex>
                                    </Button>
                                    <Button fill="outline" loading={generatingKit} onClick={() => handleShareMenuKitAsset(6, 'WhatsApp Status')} size="small">
                                        <Flex align="center" gap={6}>
                                            <LuShare2 size={12} />
                                            <Text>WA Status</Text>
                                        </Flex>
                                    </Button>
                                    <Button fill="outline" loading={generatingKit} onClick={() => handleShareMenuKitAsset(7, 'Google Maps')} size="small">
                                        <Flex align="center" gap={6}>
                                            <LuShare2 size={12} />
                                            <Text>Google Maps</Text>
                                        </Flex>
                                    </Button>
                                </Space>
                            ) : null}

                            <Button fill="outline" onClick={handleCopyShareMessage} size="small">
                                <Flex align="center" gap={6}>
                                    <LuCopy size={14} />
                                    <Text>Copy share message</Text>
                                </Flex>
                            </Button>

                            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                                <Flex align="flex-start" gap={8}>
                                    <LuMapPin color="#94a3b8" size={14} />
                                    <Text type="secondary">
                                        {`Add your ${labels.gbpLabel} link to Google Maps: find your business, edit the menu or website field, and paste your link.`}
                                    </Text>
                                </Flex>
                            </Card>
                        </Flex>
                    </Card>
                ) : null}

                {FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT && storeDetails ? (
                    <MobileCommunicationKit
                        address={buildMobileStoreAddress(storeDetails)}
                        businessType={storeDetails.businessType || ''}
                        menuLink={menuUrl}
                        phone={storeDetails.phoneNumber || undefined}
                        storeName={storeDetails.name || 'Your Business'}
                        timeZone={storeDetails.timeZone}
                        workingHours={storeDetails.workingHours}
                    />
                ) : null}

                <Flex gap={12} vertical>
                    <Button block color="primary" onClick={handleCopyLink} size="large">
                        <Flex align="center" gap={8} justify="center">
                            <LuCopy size={16} />
                            <Text>{t('copyLink')}</Text>
                        </Flex>
                    </Button>

                    <Button
                        block
                        color="success"
                        onClick={handleShareWhatsApp}
                        size="large"
                        style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                    >
                        <Flex align="center" gap={8} justify="center">
                            <LuMessageCircle size={16} />
                            <Text>{t('shareWhatsApp')}</Text>
                        </Flex>
                    </Button>

                    {supportsNativeShare ? (
                        <Button block fill="outline" onClick={handleNativeShare} size="large">
                            <Flex align="center" gap={8} justify="center">
                                <LuShare2 size={16} />
                                <Text>{t('moreOptions')}</Text>
                            </Flex>
                        </Button>
                    ) : null}
                </Flex>
            </Flex>
        </Flex>
    );
}
