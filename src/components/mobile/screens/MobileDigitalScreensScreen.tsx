'use client'

import { assertDigitalScreenMutationSucceeded, getScreenState, initializeScreenState, removePinnedSlide, updatePinnedSlideCaption, updateScreenSettings, uploadScreenSlide } from '@database/campaigns';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, toPreparedUploadName, type MediaImageCropIntent, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { normalizeOwnerSlideCaption } from '@lib/screen/screenContent';
import {
    copyScreenTextToClipboard,
    getBoundedScreenStringContext,
    hasScreenClipboardWrite,
    hasScreenCopyFallback,
    logScreenSettingsFailure,
} from '@lib/screen/screenDiagnostics';
import { buildScreenUrl } from '@lib/screen/utils';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { ScreenSlide } from '@type/campaigns';
import type { UserUploadedFileType } from '@type/common';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuMonitor, LuPencil, LuPlay, LuTrash2, LuWifi } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, Input, Switch, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileDigitalScreensScreenProps {
    onBack: () => void;
    onOpenDesignEditor?: () => void;
}

type AdjustableUploadedFile = UserUploadedFileType & {
    crop?: MediaImageCropIntent;
    prepared?: PreparedMediaImage;
    sourceDataUrl?: string;
    sourceName?: string;
};

type ScreenMode = 'menu' | 'highlights';

interface MobileScreenLinkCardProps {
    compactUrl: string;
    copied: boolean;
    description: string;
    icon: ReactNode;
    mode: ScreenMode;
    onCopy: () => void;
    onOpen: () => void;
    title: string;
}

const MAX_UPLOADS = 3;
const UPLOAD_EXPIRY_DAYS = 14;

function getDaysRemaining(validUntil?: any): number {
    if (!validUntil) return UPLOAD_EXPIRY_DAYS;
    const expiryMs = validUntil?.toMillis ? validUntil.toMillis() : validUntil;
    const daysMs = expiryMs - Date.now();
    return Math.max(0, Math.ceil(daysMs / (1000 * 60 * 60 * 24)));
}

function timestampToDate(value?: any): Date | null {
    if (!value) return null;
    try {
        if (typeof value.toDate === 'function') return value.toDate();
        if (typeof value.toMillis === 'function') return new Date(value.toMillis());
        if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
}

function formatLastSeen(value?: any): string {
    const date = timestampToDate(value);
    if (!date) return 'Waiting for first TV connection';

    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'Seen just now';
    if (minutes < 60) return `Seen ${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Seen ${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    return `Seen ${days} day${days === 1 ? '' : 's'} ago`;
}

function compactScreenUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.host}${parsed.pathname}${parsed.search}`;
    } catch {
        return url.replace(/^https?:\/\//, '');
    }
}

function MobileScreenPreview({ mode }: { mode: ScreenMode }) {
    if (mode === 'menu') {
        return (
            <div className="mobile-screen-preview menu" aria-hidden="true">
                <span className="preview-title" />
                <span className="preview-category" />
                <span className="preview-row" />
                <span className="preview-row short" />
                <span className="preview-row" />
            </div>
        );
    }

    return (
        <div className="mobile-screen-preview highlights" aria-hidden="true">
            <span className="preview-image" />
            <span className="preview-caption" />
            <span className="preview-price" />
        </div>
    );
}

function MobileScreenLinkCard({
    compactUrl,
    copied,
    description,
    icon,
    mode,
    onCopy,
    onOpen,
    title,
}: MobileScreenLinkCardProps) {
    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                        <span className="mobile-screen-icon">{icon}</span>
                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                            <Title level={5} style={{ margin: 0 }}>{title}</Title>
                            <Text type="secondary">{description}</Text>
                        </Flex>
                    </Flex>
                    <Button fill="none" onClick={onOpen} size="small" style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}>
                        <LuExternalLink size={17} />
                    </Button>
                </Flex>

                <MobileScreenPreview mode={mode} />

                <div className="mobile-screen-url">
                    <Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                        {compactUrl}
                    </Text>
                </div>

                <Flex gap={8}>
                    <Button block fill="outline" onClick={onCopy}>
                        <Flex align="center" gap={6} justify="center">
                            {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                            <Text>{copied ? 'Copied' : 'Copy link'}</Text>
                        </Flex>
                    </Button>
                    <Button block onClick={onOpen}>
                        Open
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}

export default function MobileDigitalScreensScreen({ onBack }: MobileDigitalScreensScreenProps) {
    const t = useTranslations('MobileDigitalScreens');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const publicBaseUrl = generateOBPUrl(
        storeDetails?.subdomain || '',
        storeDetails?.customDomain
    );
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [screenUrl, setScreenUrl] = useState('');
    const [screenLastSeenAt, setScreenLastSeenAt] = useState<any>(null);
    const [ownerOverride, setOwnerOverride] = useState(false);
    const [pinnedSlides, setPinnedSlides] = useState<ScreenSlide[]>([]);
    const [pendingSlide, setPendingSlide] = useState<AdjustableUploadedFile | null>(null);
    const [pendingSlideCaption, setPendingSlideCaption] = useState('');
    const [isPendingSlideAdjustOpen, setIsPendingSlideAdjustOpen] = useState(false);
    const [copiedMenu, setCopiedMenu] = useState(false);
    const [copiedHighlights, setCopiedHighlights] = useState(false);
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
    const [editingSlideCaption, setEditingSlideCaption] = useState('');
    const [savingCaptionId, setSavingCaptionId] = useState<string | null>(null);

    const highlightsUrl = screenUrl ? `${screenUrl}?mode=highlights` : '';
    const compactMenuUrl = useMemo(() => compactScreenUrl(screenUrl), [screenUrl]);
    const compactHighlightsUrl = useMemo(() => compactScreenUrl(highlightsUrl), [highlightsUrl]);
    const lastSeenLabel = useMemo(() => formatLastSeen(screenLastSeenAt), [screenLastSeenAt]);
    const hasSeenSignal = Boolean(timestampToDate(screenLastSeenAt));
    const canUpload = pinnedSlides.length < MAX_UPLOADS;
    const buildMobileDigitalScreenLogContext = (flow: string, metadata: Record<string, boolean | number | string | null | undefined> = {}) => ({
        surface: 'mobile_digital_screens',
        flow,
        hasScreenUrl: Boolean(screenUrl),
        ownerOverrideEnabled: ownerOverride,
        pinnedSlideCount: pinnedSlides.length,
        ...getBoundedScreenStringContext('publicBaseUrl', publicBaseUrl),
        ...getBoundedScreenStringContext('subdomain', storeDetails?.subdomain),
        hasCustomDomain: Boolean(storeDetails?.customDomain),
        ...metadata,
    });

    const handleOpenScreenLink = (url: string, type: ScreenMode) => {
        try {
            const opened = window.open(url, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('mobile_digital_screen_link_open_blocked');
            }
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_link_open_failed', error, buildMobileDigitalScreenLogContext('link_open', {
                mode: type,
                ...getBoundedScreenStringContext('screenOpenUrl', url),
            }));
            Toast.show({ content: 'Unable to open screen link' });
        }
    };

    const sortedSlides = useMemo(
        () => [...pinnedSlides].sort((left, right) => {
            const leftTime = left.validUntil?.toMillis ? left.validUntil.toMillis() : 0;
            const rightTime = right.validUntil?.toMillis ? right.validUntil.toMillis() : 0;
            return rightTime - leftTime;
        }),
        [pinnedSlides]
    );
    const infoContent = useMemo(() => (
        <Flex gap={8} style={{ maxWidth: 280 }} vertical>
            <Flex gap={2} vertical>
                <Text strong>{t('title')}</Text>
                <Text type="secondary">{t('setupTip')}</Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>How content works</Text>
                <Text type="secondary">
                    Menu Board follows your active store menu automatically. Highlights follows the same menu and rotates promoted items plus any custom slides you upload here.
                </Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>How to manage each screen</Text>
                <Text type="secondary">
                    Update your menu to change Menu Board. Upload or remove custom slides here to change Highlights.
                </Text>
            </Flex>
        </Flex>
    ), [t]);

    const fetchState = async () => {
        try {
            setLoading(true);
            let state = await getScreenState();
            if (!state) state = await initializeScreenState();
            setScreenUrl(buildScreenUrl(state.screenToken, publicBaseUrl));
            setScreenLastSeenAt(state.screenLastSeenAt || null);
            setOwnerOverride(state.ownerOverrideEnabled || false);
            setPinnedSlides(state.pinnedSlides || []);
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_state_load_failed', error, buildMobileDigitalScreenLogContext('load_state'));
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
            await copyScreenTextToClipboard(url);
            if (type === 'menu') {
                setCopiedMenu(true);
                setTimeout(() => setCopiedMenu(false), 2000);
            } else {
                setCopiedHighlights(true);
                setTimeout(() => setCopiedHighlights(false), 2000);
            }
            Toast.show({ content: t('linkCopied'), duration: 1500 });
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_link_copy_failed', error, buildMobileDigitalScreenLogContext('link_copy', {
                mode: type,
                hasSeenSignal,
                hasClipboardWrite: hasScreenClipboardWrite(),
                hasCopyFallback: hasScreenCopyFallback(),
                ...getBoundedScreenStringContext('screenCopyUrl', url),
            }));
            Toast.show({ content: t('failedToCopy'), duration: 2000 });
        }
    };

    const handleOverrideToggle = async (enabled: boolean) => {
        try {
            const updateResult = await updateScreenSettings({ ownerOverrideEnabled: enabled });
            assertDigitalScreenMutationSucceeded(
                updateResult,
                'mobile_digital_screen_override_update_rejected',
            );
            setOwnerOverride(enabled);
            Toast.show({ content: enabled ? t('uploadsPrioritized') : t('systemContentRestored'), duration: 1500 });
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_override_toggle_failed', error, buildMobileDigitalScreenLogContext('override_toggle', {
                desiredEnabled: enabled,
            }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const handleUploadSlide = async (file: AdjustableUploadedFile) => {
        if (!canUpload) {
            Toast.show({ content: `Maximum ${MAX_UPLOADS} custom slides allowed`, duration: 2000 });
            return;
        }

        setPendingSlide(file);
        setPendingSlideCaption(normalizeOwnerSlideCaption(file.sourceName?.replace(/\.[^/.]+$/, '') || file.name?.replace(/\.[^/.]+$/, '')));
        Toast.show({ content: 'Slide ready. Frame and save it.', duration: 1400 });
    };

    const handleSelectSlideFile = async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'digitalScreenSlide');
            await handleUploadSlide({
                blob: prepared.blob,
                crop: prepared.crop,
                mediaChecksum: prepared.checksum,
                mediaId: prepared.mediaId,
                mediaProfile: 'digitalScreenSlide',
                mediaVariant: prepared.primaryVariant,
                mediaVersion: prepared.version,
                name: toPreparedUploadName(file.name, prepared.mimeType, file.name),
                prepared,
                size: prepared.sizeBytes,
                sourceDataUrl: prepared.sourceDataUrl,
                sourceName: prepared.sourceName,
                type: prepared.mimeType,
                url: prepared.dataUrl,
            });
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_slide_prepare_failed', error, buildMobileDigitalScreenLogContext('slide_prepare', {
                fileSizeBytes: file.size,
                ...getBoundedScreenStringContext('fileType', file.type),
            }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const handleSavePendingSlide = async () => {
        if (!pendingSlide) return;
        setUploading(true);
        try {
            await uploadScreenSlide(pendingSlide, normalizeOwnerSlideCaption(pendingSlideCaption));
            Toast.show({ content: `Slide uploaded. Expires in ${UPLOAD_EXPIRY_DAYS} days.`, duration: 1800 });
            setPendingSlide(null);
            setPendingSlideCaption('');
            await fetchState();
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_slide_upload_failed', error, buildMobileDigitalScreenLogContext('slide_upload', {
                hasPendingSlide: Boolean(pendingSlide),
                ...getBoundedScreenStringContext('mediaProfile', pendingSlide.mediaProfile),
                ...getBoundedScreenStringContext('mediaVariant', pendingSlide.mediaVariant),
            }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setUploading(false);
        }
    };

    const handleSaveSlideCaption = async (slideId: string) => {
        setSavingCaptionId(slideId);
        try {
            const nextCaption = normalizeOwnerSlideCaption(editingSlideCaption);
            const updateResult = await updatePinnedSlideCaption(slideId, nextCaption);
            assertDigitalScreenMutationSucceeded(
                updateResult,
                'mobile_digital_screen_caption_update_rejected',
            );
            setPinnedSlides((previous) => previous.map((slide) => (
                slide.id === slideId ? { ...slide, caption: nextCaption } : slide
            )));
            setEditingSlideId(null);
            setEditingSlideCaption('');
            Toast.show({ content: 'Slide name updated', duration: 1500 });
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_caption_update_failed', error, buildMobileDigitalScreenLogContext('caption_update', {
                ...getBoundedScreenStringContext('slideId', slideId),
            }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setSavingCaptionId(null);
        }
    };

    const handleDeleteSlide = async (slideId: string) => {
        try {
            const deleteResult = await removePinnedSlide(slideId);
            assertDigitalScreenMutationSucceeded(
                deleteResult,
                'mobile_digital_screen_slide_delete_rejected',
            );
            setPinnedSlides((previous) => previous.filter((slide) => slide.id !== slideId));
            Toast.show({ content: 'Slide removed', duration: 1500 });
        } catch (error) {
            logScreenSettingsFailure('mobile_digital_screen_slide_delete_failed', error, buildMobileDigitalScreenLogContext('slide_delete', {
                ...getBoundedScreenStringContext('slideId', slideId),
            }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    if (loading) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('setupTip')}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex align="center" flex={1} justify="center">
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('setupTip')}
                infoContent={infoContent}
                onBack={onBack}
                title={t('title')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={10} style={{ minWidth: 0 }}>
                            <span className="mobile-screen-icon">
                                <LuWifi size={18} />
                            </span>
                            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                <Text strong>TV status</Text>
                                <Text type="secondary">{lastSeenLabel}</Text>
                            </Flex>
                        </Flex>
                        <Tag color={hasSeenSignal ? 'success' : 'default'}>
                            {hasSeenSignal ? 'Connected' : 'Not connected'}
                        </Tag>
                    </Flex>
                </Card>

                <MobileScreenLinkCard
                    compactUrl={compactMenuUrl}
                    copied={copiedMenu}
                    description={t('menuBoardDesc')}
                    icon={<LuMonitor color={token.colorPrimary} size={18} />}
                    mode="menu"
                    onCopy={() => void handleCopy(screenUrl, 'menu')}
                    onOpen={() => handleOpenScreenLink(screenUrl, 'menu')}
                    title={t('menuBoard')}
                />

                <MobileScreenLinkCard
                    compactUrl={compactHighlightsUrl}
                    copied={copiedHighlights}
                    description={t('highlightsDesc')}
                    icon={<LuPlay color={token.colorInfo} size={18} />}
                    mode="highlights"
                    onCopy={() => void handleCopy(highlightsUrl, 'highlights')}
                    onOpen={() => handleOpenScreenLink(highlightsUrl, 'highlights')}
                    title={t('highlights')}
                />

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex gap={2} vertical>
                            <Text strong>Only custom slides</Text>
                            <Text type="secondary">Highlights will show uploaded slides only. Menu Board is unchanged.</Text>
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
                        </Flex>

                        <MediaImageCard
                            accept={getMediaProfileAcceptAttribute('digitalScreenSlide')}
                            canAdjust={Boolean(pendingSlide?.sourceDataUrl)}
                            disabled={!canUpload || uploading}
                            helperText={pendingSlide ? 'Save it now, or adjust the framing first.' : 'Upload posters, offers, or brand slides. They will also appear in Highlights automatically.'}
                            imageType="digitalScreenSlide"
                            imageUrl={pendingSlide?.url}
                            isBusy={uploading}
                            onAdjust={() => setIsPendingSlideAdjustOpen(true)}
                            onRemove={pendingSlide ? () => {
                                setPendingSlide(null);
                                setPendingSlideCaption('');
                            } : undefined}
                            onSelectFile={(file) => { void handleSelectSlideFile(file); }}
                            placeholderDescription={canUpload ? 'Drop, paste, or choose a widescreen slide.' : `Maximum ${MAX_UPLOADS} slides reached`}
                            placeholderTitle={pendingSlide ? 'Slide ready' : 'Upload image'}
                        />
                        {pendingSlide ? (
                            <Flex gap={8} vertical>
                                <Input
                                    onChange={setPendingSlideCaption}
                                    placeholder="Slide name"
                                    value={pendingSlideCaption}
                                />
                                <Button block loading={uploading} onClick={() => void handleSavePendingSlide()} size="small">
                                    <Flex align="center" gap={6} justify="center">
                                        <LuCheck size={16} />
                                        <Text>Save</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        ) : null}

                        {sortedSlides.length > 0 ? (
                            <Flex gap={10} vertical>
                                {sortedSlides.map((slide) => (
                                    <div key={slide.id} className="mobile-slide-row">
                                        <Flex align="center" gap={12}>
                                            <img
                                                alt={normalizeOwnerSlideCaption(slide.caption)}
                                                src={slide.imageUrl}
                                                style={{
                                                    borderRadius: 8,
                                                    height: 56,
                                                    objectFit: 'cover',
                                                    width: 56,
                                                }}
                                            />
                                            {editingSlideId === slide.id ? (
                                                <Flex gap={6} style={{ flex: 1, minWidth: 0 }} vertical>
                                                    <Input
                                                        onChange={setEditingSlideCaption}
                                                        placeholder="Slide name"
                                                        value={editingSlideCaption}
                                                    />
                                                    <Flex gap={6}>
                                                        <Button
                                                            block
                                                            fill="outline"
                                                            onClick={() => {
                                                                setEditingSlideId(null);
                                                                setEditingSlideCaption('');
                                                            }}
                                                            size="small"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            block
                                                            loading={savingCaptionId === slide.id}
                                                            onClick={() => void handleSaveSlideCaption(slide.id)}
                                                            size="small"
                                                        >
                                                            Save
                                                        </Button>
                                                    </Flex>
                                                </Flex>
                                            ) : (
                                                <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                                    <Text strong>{normalizeOwnerSlideCaption(slide.caption)}</Text>
                                                    <Text type="secondary">{getDaysRemaining(slide.validUntil)} days remaining</Text>
                                                </Flex>
                                            )}
                                            {editingSlideId === slide.id ? null : (
                                                <Button
                                                    fill="none"
                                                    onClick={() => {
                                                        setEditingSlideId(slide.id);
                                                        setEditingSlideCaption(normalizeOwnerSlideCaption(slide.caption));
                                                    }}
                                                    size="small"
                                                    style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                                >
                                                    <LuPencil size={16} />
                                                </Button>
                                            )}
                                            <Button
                                                color="danger"
                                                fill="none"
                                                onClick={() => {
                                                    void Dialog.confirm({
                                                        cancelText: 'Cancel',
                                                        confirmText: 'Delete slide',
                                                        content: `Delete "${normalizeOwnerSlideCaption(slide.caption)}" from Highlights? This removes it from your custom slides list and it will stop showing on digital screens right away.`,
                                                        onConfirm: () => void handleDeleteSlide(slide.id),
                                                    });
                                                }}
                                                size="small"
                                                style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                            >
                                                <LuTrash2 size={16} />
                                            </Button>
                                        </Flex>
                                    </div>
                                ))}
                            </Flex>
                        ) : (
                            <div className="mobile-slide-empty">
                                <Flex gap={6} vertical>
                                    <Text strong>No custom slides yet</Text>
                                    <Text type="secondary">
                                        Upload posters, offers, or brand slides. They will also appear in Highlights automatically.
                                    </Text>
                                </Flex>
                            </div>
                        )}

                        {!canUpload ? (
                            <Tag color="warning">Maximum {MAX_UPLOADS} slides reached</Tag>
                        ) : null}
                    </Flex>
                </Card>
            </Flex>

            <style jsx global>{`
                .mobile-screen-icon {
                    display: inline-flex;
                    width: 36px;
                    height: 36px;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    border-radius: 8px;
                    background: ${token.colorFillAlter};
                    color: ${token.colorPrimary};
                }
                .mobile-screen-url {
                    min-height: 42px;
                    display: flex;
                    align-items: center;
                    min-width: 0;
                    padding: 9px 10px;
                    border: 1px solid ${token.colorBorderSecondary};
                    border-radius: 8px;
                    background: ${token.colorFillAlter};
                    overflow: hidden;
                }
                .mobile-screen-url span {
                    display: block;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .mobile-screen-preview {
                    position: relative;
                    height: 92px;
                    overflow: hidden;
                    border-radius: 8px;
                    background: #07101f;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .mobile-screen-preview.menu {
                    padding: 13px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .mobile-screen-preview .preview-title,
                .mobile-screen-preview .preview-category,
                .mobile-screen-preview .preview-row {
                    display: block;
                    border-radius: 4px;
                }
                .mobile-screen-preview .preview-title {
                    width: 46%;
                    height: 8px;
                    background: #ffffff;
                }
                .mobile-screen-preview .preview-category {
                    width: 34%;
                    height: 7px;
                    background: #fbbf24;
                }
                .mobile-screen-preview .preview-row {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.48);
                }
                .mobile-screen-preview .preview-row.short {
                    width: 72%;
                }
                .mobile-screen-preview.highlights {
                    background: linear-gradient(135deg, #111827 0%, #273449 100%);
                }
                .mobile-screen-preview .preview-image {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.54), rgba(96, 165, 250, 0.44));
                }
                .mobile-screen-preview .preview-caption {
                    position: absolute;
                    left: 14px;
                    right: 50px;
                    bottom: 25px;
                    height: 11px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.92);
                }
                .mobile-screen-preview .preview-price {
                    position: absolute;
                    left: 14px;
                    bottom: 11px;
                    width: 60px;
                    height: 8px;
                    border-radius: 4px;
                    background: #86efac;
                }
                .mobile-slide-row,
                .mobile-slide-empty {
                    padding: 12px;
                    border-radius: 8px;
                    background: ${token.colorFillAlter};
                    border: 1px solid ${token.colorBorderSecondary};
                }
            `}</style>

            <MediaImageAdjustModal
                fileName={pendingSlide?.sourceName || pendingSlide?.name}
                imageType="digitalScreenSlide"
                initialCrop={pendingSlide?.crop}
                onApply={(prepared) => {
                    setPendingSlide((current) => current ? ({
                        ...current,
                        blob: prepared.blob,
                        crop: prepared.crop,
                        mediaChecksum: prepared.checksum,
                        mediaId: prepared.mediaId,
                        mediaProfile: 'digitalScreenSlide',
                        mediaVariant: prepared.primaryVariant,
                        mediaVersion: prepared.version,
                        name: prepared.sourceName || current.name,
                        prepared,
                        size: prepared.sizeBytes,
                        sourceDataUrl: prepared.sourceDataUrl || current.sourceDataUrl,
                        sourceName: prepared.sourceName || current.sourceName,
                        type: prepared.mimeType,
                        url: prepared.dataUrl,
                    }) : current);
                }}
                onClose={() => setIsPendingSlideAdjustOpen(false)}
                open={isPendingSlideAdjustOpen}
                sourceDataUrl={pendingSlide?.sourceDataUrl}
            />
        </Flex>
    );
}
