'use client'

import ImageUploadInput from '@atoms/imageUploadInput';
import { getScreenState, initializeScreenState, removePinnedSlide, updateScreenSettings, uploadScreenSlide } from '@database/campaigns';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { buildScreenUrl } from '@lib/screen/utils';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { ScreenSlide } from '@type/campaigns';
import type { UserUploadedFileType } from '@type/common';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuImagePlus, LuMonitor, LuPlay, LuTrash2 } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, NavBar, Switch, Tag, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileDigitalScreensScreenProps {
    onBack: () => void;
}

const MAX_UPLOADS = 3;
const UPLOAD_EXPIRY_DAYS = 14;

function getDaysRemaining(validUntil?: any): number {
    if (!validUntil) return UPLOAD_EXPIRY_DAYS;
    const expiryMs = validUntil?.toMillis ? validUntil.toMillis() : validUntil;
    const daysMs = expiryMs - Date.now();
    return Math.max(0, Math.ceil(daysMs / (1000 * 60 * 60 * 24)));
}

export default function MobileDigitalScreensScreen({ onBack }: MobileDigitalScreensScreenProps) {
    const t = useTranslations('MobileDigitalScreens');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const publicBaseUrl = generateOBPUrl(
        storeDetails?.subdomain || '',
        storeDetails?.customDomain
    );
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [screenUrl, setScreenUrl] = useState('');
    const [ownerOverride, setOwnerOverride] = useState(false);
    const [pinnedSlides, setPinnedSlides] = useState<ScreenSlide[]>([]);
    const [copiedMenu, setCopiedMenu] = useState(false);
    const [copiedHighlights, setCopiedHighlights] = useState(false);

    const highlightsUrl = screenUrl ? `${screenUrl}?mode=highlights` : '';
    const canUpload = pinnedSlides.length < MAX_UPLOADS;
    const sortedSlides = useMemo(
        () => [...pinnedSlides].sort((left, right) => {
            const leftTime = left.validUntil?.toMillis ? left.validUntil.toMillis() : 0;
            const rightTime = right.validUntil?.toMillis ? right.validUntil.toMillis() : 0;
            return rightTime - leftTime;
        }),
        [pinnedSlides]
    );

    const fetchState = async () => {
        try {
            setLoading(true);
            let state = await getScreenState();
            if (!state) state = await initializeScreenState();
            setScreenUrl(buildScreenUrl(state.screenToken, publicBaseUrl));
            setOwnerOverride(state.ownerOverrideEnabled || false);
            setPinnedSlides(state.pinnedSlides || []);
        } catch {
            Toast.show({ content: t('failedToLoad'), duration: 2000 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchState();
    }, [publicBaseUrl]);

    const handleCopy = async (url: string, type: 'menu' | 'highlights') => {
        try {
            await navigator.clipboard.writeText(url);
            if (type === 'menu') {
                setCopiedMenu(true);
                setTimeout(() => setCopiedMenu(false), 2000);
            } else {
                setCopiedHighlights(true);
                setTimeout(() => setCopiedHighlights(false), 2000);
            }
            Toast.show({ content: t('linkCopied'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToCopy'), duration: 2000 });
        }
    };

    const handleOverrideToggle = async (enabled: boolean) => {
        try {
            await updateScreenSettings({ ownerOverrideEnabled: enabled });
            setOwnerOverride(enabled);
            Toast.show({ content: enabled ? t('uploadsPrioritized') : t('systemContentRestored'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const handleUploadSlide = async (file: UserUploadedFileType) => {
        if (!canUpload) {
            Toast.show({ content: `Maximum ${MAX_UPLOADS} custom slides allowed`, duration: 2000 });
            return;
        }

        setUploading(true);
        try {
            await uploadScreenSlide(file, file.name?.replace(/\.[^/.]+$/, '') || 'Custom Slide');
            Toast.show({ content: `Slide uploaded. Expires in ${UPLOAD_EXPIRY_DAYS} days.`, duration: 1800 });
            await fetchState();
        } catch (error: any) {
            Toast.show({ content: error?.message || t('failedToUpdate'), duration: 2000 });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteSlide = async (slideId: string) => {
        try {
            await removePinnedSlide(slideId);
            setPinnedSlides((previous) => previous.filter((slide) => slide.id !== slideId));
            Toast.show({ content: 'Slide removed', duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    if (loading) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" flex={1} justify="center">
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('setupTip')}
                    title={t('title')}
                />

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>How content works</Text>
                        <Text type="secondary">
                            Menu Board always shows your live menu. Highlights rotates promoted items and any custom slides you upload here.
                        </Text>
                        <Card size="small" style={{ background: token.colorFillAlter }}>
                            <Flex gap={6} vertical>
                                <Text strong>How to manage each screen</Text>
                                <Text type="secondary">Update your menu to change Menu Board. Upload or remove custom slides below to change Highlights.</Text>
                            </Flex>
                        </Card>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuMonitor color={token.colorPrimary} size={18} />
                                <Title level={5} style={{ margin: 0 }}>{t('menuBoard')}</Title>
                            </Flex>
                            <Button fill="none" onClick={() => window.open(screenUrl, '_blank', 'noopener,noreferrer')} size="small" style={{ minHeight: 36, minWidth: 36, paddingInline: 0 }}>
                                <LuExternalLink size={16} />
                            </Button>
                        </Flex>
                        <Text type="secondary">{t('menuBoardDesc')}</Text>
                        <Card size="small" style={{ background: token.colorFillAlter }}>
                            <Text style={{ wordBreak: 'break-all' }}>{screenUrl}</Text>
                        </Card>
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => void handleCopy(screenUrl, 'menu')}>
                                <Flex align="center" gap={6}>
                                    {copiedMenu ? <LuCheck size={14} /> : <LuCopy size={14} />}
                                    <Text>{copiedMenu ? t('copied') : t('copyLink')}</Text>
                                </Flex>
                            </Button>
                            <Button block onClick={() => window.open(screenUrl, '_blank', 'noopener,noreferrer')}>
                                Open
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuPlay color={token.colorInfo} size={18} />
                                <Title level={5} style={{ margin: 0 }}>{t('highlights')}</Title>
                            </Flex>
                            <Button fill="none" onClick={() => window.open(highlightsUrl, '_blank', 'noopener,noreferrer')} size="small" style={{ minHeight: 36, minWidth: 36, paddingInline: 0 }}>
                                <LuExternalLink size={16} />
                            </Button>
                        </Flex>
                        <Text type="secondary">{t('highlightsDesc')}</Text>
                        <Card size="small" style={{ background: token.colorFillAlter }}>
                            <Text style={{ wordBreak: 'break-all' }}>{highlightsUrl}</Text>
                        </Card>
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => void handleCopy(highlightsUrl, 'highlights')}>
                                <Flex align="center" gap={6}>
                                    {copiedHighlights ? <LuCheck size={14} /> : <LuCopy size={14} />}
                                    <Text>{copiedHighlights ? t('copied') : t('copyLink')}</Text>
                                </Flex>
                            </Button>
                            <Button block onClick={() => window.open(highlightsUrl, '_blank', 'noopener,noreferrer')}>
                                Open
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex gap={2} vertical>
                            <Text strong>{t('useMyDesignsOnly')}</Text>
                            <Text type="secondary">{t('useMyDesignsOnlyDesc')}</Text>
                        </Flex>
                        <Switch checked={ownerOverride} onChange={(value) => void handleOverrideToggle(value)} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex gap={2} vertical>
                                <Text strong>Your Custom Slides</Text>
                                <Text type="secondary">{pinnedSlides.length}/{MAX_UPLOADS} used</Text>
                            </Flex>
                            <Button
                                disabled={!canUpload || uploading}
                                onClick={() => fileInputRef.current?.click()}
                                size="small"
                            >
                                <Flex align="center" gap={6}>
                                    <LuImagePlus size={16} />
                                    <Text>{uploading ? 'Uploading…' : 'Upload Image'}</Text>
                                </Flex>
                            </Button>
                        </Flex>

                        {sortedSlides.length > 0 ? (
                            <Flex gap={10} vertical>
                                {sortedSlides.map((slide) => (
                                    <Card key={slide.id} size="small" style={{ background: token.colorBgContainer }}>
                                        <Flex align="center" gap={12}>
                                            <img
                                                alt={slide.caption || 'Custom slide'}
                                                src={slide.imageUrl}
                                                style={{
                                                    borderRadius: 10,
                                                    height: 56,
                                                    objectFit: 'cover',
                                                    width: 56,
                                                }}
                                            />
                                            <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                                <Text strong>{slide.caption || 'Custom Slide'}</Text>
                                                <Text type="secondary">{getDaysRemaining(slide.validUntil)} days remaining</Text>
                                            </Flex>
                                            <Button
                                                color="danger"
                                                fill="none"
                                                onClick={() => void handleDeleteSlide(slide.id)}
                                                size="small"
                                                style={{ minHeight: 36, minWidth: 36, paddingInline: 0 }}
                                            >
                                                <LuTrash2 size={16} />
                                            </Button>
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>
                        ) : (
                            <Card size="small" style={{ background: token.colorFillAlter }}>
                                <Flex gap={6} vertical>
                                    <Text strong>No custom slides yet</Text>
                                    <Text type="secondary">
                                        Upload posters, offers, or brand slides. They will also appear in Highlights automatically.
                                    </Text>
                                </Flex>
                            </Card>
                        )}

                        {!canUpload ? (
                            <Tag color="warning">Maximum {MAX_UPLOADS} slides reached</Tag>
                        ) : null}
                    </Flex>
                </Card>
            </Flex>

            <ImageUploadInput
                fileInputRef={fileInputRef}
                onUploadFile={(file: UserUploadedFileType) => void handleUploadSlide(file)}
            />
        </Flex>
    );
}
