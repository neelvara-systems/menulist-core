/**
 * Owner Uploads Section
 * Per spec: Owner can upload custom images (max 3)
 * Per spec: Auto-expire after 14 days
 * 
 * Follows existing pattern: Client-side upload via DAL, not API route
 */

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { assertDigitalScreenMutationSucceeded, removePinnedSlide, updatePinnedSlideCaption, uploadScreenSlide } from "@database/campaigns";
import { getMediaProfileAcceptAttribute } from "@lib/media/imageProfiles";
import { prepareMediaImage, toPreparedUploadName, type PreparedMediaImage } from "@lib/media/prepareMediaImage";
import { normalizeOwnerSlideCaption } from "@lib/screen/screenContent";
import { getBoundedScreenStringContext, logScreenSettingsFailure } from "@lib/screen/screenDiagnostics";
import { screenTimestampToMillis } from "@lib/screen/screenTimestamp";
import MediaImageCard from "@/components/shared/media/MediaImageCard";
import MediaImageAdjustModal from "@/components/shared/media/MediaImageAdjustModal";
import { ScreenSlide } from "@type/campaigns";
import { App, Button, Flex, Input, List, Popconfirm, Space, theme, Typography } from "antd";
import { useState } from "react";
import { LuCheck, LuClock, LuImage, LuPencil, LuTrash2 } from "react-icons/lu";

const { Text } = Typography;
const SCREEN_SLIDE_PREPARE_FAILED_MESSAGE = 'Could not prepare slide image. Use a JPG, PNG, or WebP image under the slide size limit.';
const SCREEN_SLIDE_UPLOAD_FAILED_MESSAGE = 'Failed to upload slide';

interface OwnerUploadsProps {
    pinnedSlides: ScreenSlide[];
    maxUploads: number;
    uploadExpiryDays: number;
    onSlideUploaded: () => void;
    onSlideDeleted: (slideId: string) => void;
}

export default function OwnerUploads({
    pinnedSlides,
    maxUploads,
    uploadExpiryDays,
    onSlideUploaded,
    onSlideDeleted
}: OwnerUploadsProps) {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const [uploading, setUploading] = useState(false);
    const [pendingSlide, setPendingSlide] = useState<{
        fileName: string;
        prepared: PreparedMediaImage;
    } | null>(null);
    const [pendingSlideCaption, setPendingSlideCaption] = useState('');
    const [isPendingSlideAdjustOpen, setIsPendingSlideAdjustOpen] = useState(false);
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
    const [editingSlideCaption, setEditingSlideCaption] = useState('');
    const [savingCaptionId, setSavingCaptionId] = useState<string | null>(null);

    const canUpload = pinnedSlides.length < maxUploads;

    const handleUpload = async (file: File) => {
        if (!canUpload) {
            messageApi.error(`Maximum ${maxUploads} custom slides allowed`);
            return false;
        }

        setUploading(true);

        try {
            const prepared = await prepareMediaImage(file, 'digitalScreenSlide');
            setPendingSlide({
                fileName: file.name,
                prepared,
            });
            setPendingSlideCaption(normalizeOwnerSlideCaption(file.name.replace(/\.[^/.]+$/, "")));
            messageApi.success('Slide ready. Frame and save it.');

        } catch (error) {
            logScreenSettingsFailure('desktop_digital_screen_slide_prepare_failed', error, {
                ...getBoundedScreenStringContext('fileName', file.name),
                fileSizeBytes: file.size,
            });
            messageApi.error(SCREEN_SLIDE_PREPARE_FAILED_MESSAGE);
        } finally {
            setUploading(false);
        }

        return false; // Prevent default upload behavior
    };

    const handleSavePendingSlide = async () => {
        if (!pendingSlide) return;

        setUploading(true);
        try {
            const { fileName, prepared } = pendingSlide;
            const preparedName = toPreparedUploadName(fileName, prepared.mimeType, fileName);
            const caption = normalizeOwnerSlideCaption(pendingSlideCaption || preparedName.replace(/\.[^/.]+$/, ""));

            // Upload via DAL (follows existing pattern from projects/tickets)
            await uploadScreenSlide(
                {
                    blob: prepared.blob,
                    mediaChecksum: prepared.checksum,
                    mediaId: prepared.mediaId,
                    mediaProfile: 'digitalScreenSlide',
                    mediaVariant: prepared.primaryVariant,
                    mediaVersion: prepared.version,
                    name: preparedName,
                    preparedMedia: prepared,
                    size: prepared.sizeBytes,
                    type: prepared.mimeType,
                    uid: `slide-${Date.now()}`,
                    url: prepared.dataUrl,
                },
                caption
            );

            messageApi.success(`Slide uploaded! Will expire in ${uploadExpiryDays} days`);
            setPendingSlide(null);
            setPendingSlideCaption('');
            onSlideUploaded();
        } catch (error) {
            logScreenSettingsFailure('desktop_digital_screen_slide_upload_failed', error, {
                ...getBoundedScreenStringContext('fileName', pendingSlide.fileName),
                ...getBoundedScreenStringContext('caption', pendingSlideCaption),
                fileSizeBytes: pendingSlide.prepared.sizeBytes,
            });
            messageApi.error(SCREEN_SLIDE_UPLOAD_FAILED_MESSAGE);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveSlideCaption = async (slideId: string) => {
        setSavingCaptionId(slideId);
        try {
            const updateResult = await updatePinnedSlideCaption(slideId, normalizeOwnerSlideCaption(editingSlideCaption));
            assertDigitalScreenMutationSucceeded(
                updateResult,
                'desktop_digital_screen_caption_update_rejected',
            );
            messageApi.success('Slide name updated');
            setEditingSlideId(null);
            setEditingSlideCaption('');
            onSlideUploaded();
        } catch (error) {
            logScreenSettingsFailure('desktop_digital_screen_caption_update_failed', error, {
                ...getBoundedScreenStringContext('slideId', slideId),
                ...getBoundedScreenStringContext('caption', editingSlideCaption),
            });
            messageApi.error('Failed to update slide name');
        } finally {
            setSavingCaptionId(null);
        }
    };

    const handleDelete = async (slideId: string) => {
        try {
            // Delete via DAL (follows existing pattern)
            const deleteResult = await removePinnedSlide(slideId);
            assertDigitalScreenMutationSucceeded(
                deleteResult,
                'desktop_digital_screen_slide_delete_rejected',
            );

            messageApi.success('Slide removed');
            onSlideDeleted(slideId);

        } catch (error) {
            logScreenSettingsFailure('desktop_digital_screen_slide_delete_failed', error, {
                ...getBoundedScreenStringContext('slideId', slideId),
            });
            messageApi.error('Failed to remove slide');
        }
    };

    const getDaysRemaining = (validUntil: ScreenSlide["validUntil"]): number => {
        if (!validUntil) return uploadExpiryDays;
        const expiryMs = screenTimestampToMillis(validUntil);
        if (expiryMs === null) return 0;
        const daysMs = expiryMs - Date.now();
        return Math.max(0, Math.ceil(daysMs / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="owner-uploads-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <Text strong>Your Custom Slides</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {pinnedSlides.length}/{maxUploads} used · Expires in {uploadExpiryDays} days
                    </Text>
                </div>

            </div>

            <Flex gap={12} style={{ marginBottom: 16 }} vertical>
                <MediaImageCard
                    accept={getMediaProfileAcceptAttribute('digitalScreenSlide')}
                    canAdjust={Boolean(pendingSlide?.prepared.sourceDataUrl)}
                    disabled={!canUpload || uploading}
                    helperText={pendingSlide ? 'Save it now, or adjust the framing first.' : 'Upload posters, offers, or brand slides for Highlights.'}
                    imageType="digitalScreenSlide"
                    imageUrl={pendingSlide?.prepared.dataUrl}
                    isBusy={uploading}
                    onAdjust={() => setIsPendingSlideAdjustOpen(true)}
                    onRemove={pendingSlide ? () => {
                        setPendingSlide(null);
                        setPendingSlideCaption('');
                    } : undefined}
                    onSelectFile={(file) => { void handleUpload(file); }}
                    placeholderDescription={canUpload ? 'Drop, paste, or choose a widescreen slide.' : `Maximum ${maxUploads} custom slides allowed.`}
                    placeholderTitle={pendingSlide ? 'Slide ready' : 'Upload image'}
                />
                {pendingSlide ? (
                    <Flex gap={8} vertical>
                        <Input
                            onChange={(event) => setPendingSlideCaption(event.target.value)}
                            placeholder="Slide name"
                            value={pendingSlideCaption}
                        />
                        <Button icon={<LuCheck />} loading={uploading} onClick={() => void handleSavePendingSlide()} type="primary">
                            Save slide
                        </Button>
                    </Flex>
                ) : null}
            </Flex>

            {pinnedSlides.length > 0 ? (
                <List
                    size="small"
                    dataSource={pinnedSlides}
                    renderItem={(slide) => {
                        const daysRemaining = getDaysRemaining(slide.validUntil);
                        return (
                            <List.Item
                                actions={[
                                    editingSlideId === slide.id ? null : (
                                        <Button
                                            aria-label={`Edit ${normalizeOwnerSlideCaption(slide.caption)}`}
                                            key="edit"
                                            type="text"
                                            icon={<LuPencil />}
                                            size="small"
                                            onClick={() => {
                                                setEditingSlideId(slide.id);
                                                setEditingSlideCaption(normalizeOwnerSlideCaption(slide.caption));
                                            }}
                                        />
                                    ),
                                    <Popconfirm
                                        key="delete"
                                        title="Delete this custom slide?"
                                        description={`"${normalizeOwnerSlideCaption(slide.caption)}" will be removed from Highlights after the screen refreshes.`}
                                        onConfirm={() => handleDelete(slide.id)}
                                        okText="Delete slide"
                                        cancelText="Cancel"
                                    >
                                        <Button
                                            aria-label={`Delete ${normalizeOwnerSlideCaption(slide.caption)}`}
                                            type="text"
                                            danger
                                            icon={<LuTrash2 />}
                                            size="small"
                                        />
                                    </Popconfirm>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        slide.imageUrl && !slide.imageUrl.startsWith('data:') ? (
                                            <img
                                                src={slide.imageUrl}
                                                alt={normalizeOwnerSlideCaption(slide.caption)}
                                                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 48,
                                                height: 48,
                                                background: token.colorFillAlter,
                                                borderRadius: 4,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <LuImage size={20} />
                                            </div>
                                        )
                                    }
                                    title={editingSlideId === slide.id ? (
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Input
                                                onChange={(event) => setEditingSlideCaption(event.target.value)}
                                                placeholder="Slide name"
                                                value={editingSlideCaption}
                                            />
                                            <Button
                                                loading={savingCaptionId === slide.id}
                                                onClick={() => void handleSaveSlideCaption(slide.id)}
                                                type="primary"
                                            >
                                                Save
                                            </Button>
                                            <Button onClick={() => {
                                                setEditingSlideId(null);
                                                setEditingSlideCaption('');
                                            }}>
                                                Cancel
                                            </Button>
                                        </Space.Compact>
                                    ) : normalizeOwnerSlideCaption(slide.caption)}
                                    description={
                                        <span style={{ fontSize: 12 }}>
                                            <LuClock style={{ marginRight: 4 }} />
                                            {daysRemaining} days remaining
                                        </span>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            ) : (
                <Flex
                    align="center"
                    gap={8}
                    style={{
                        background: token.colorFillAlter,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadiusLG,
                        padding: '20px 16px',
                        textAlign: 'center',
                    }}
                    vertical
                >
                    <ContextualStateIllustration
                        color={token.colorPrimary}
                        size={96}
                        style={{ opacity: 0.78 }}
                        treatment="softHalo"
                        variant="uploadContext"
                    />
                    <Text strong>No custom slides yet</Text>
                    <Text type="secondary">Upload a poster, offer, or brand slide when you are ready.</Text>
                </Flex>
            )}

            <style jsx>{`
                .owner-uploads-section {
                    padding: 0;
                }
            `}</style>
            <MediaImageAdjustModal
                fileName={pendingSlide?.fileName}
                imageType="digitalScreenSlide"
                initialCrop={pendingSlide?.prepared.crop}
                onApply={(prepared) => {
                    setPendingSlide((current) => current ? ({
                        ...current,
                        prepared,
                    }) : current);
                }}
                onClose={() => setIsPendingSlideAdjustOpen(false)}
                open={isPendingSlideAdjustOpen}
                sourceDataUrl={pendingSlide?.prepared.sourceDataUrl}
            />
        </div>
    );
}
