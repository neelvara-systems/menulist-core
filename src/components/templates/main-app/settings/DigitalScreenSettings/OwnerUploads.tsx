/**
 * Owner Uploads Section
 * Per spec: Owner can upload custom images (max 3)
 * Per spec: Auto-expire after 14 days
 * 
 * Follows existing pattern: Client-side upload via DAL, not API route
 */

import { removePinnedSlide, uploadScreenSlide } from "@database/campaigns";
import { getMediaProfileAcceptAttribute } from "@lib/media/imageProfiles";
import { prepareMediaImage, toPreparedUploadName, type PreparedMediaImage } from "@lib/media/prepareMediaImage";
import MediaImageCard from "@/components/shared/media/MediaImageCard";
import MediaImageAdjustModal from "@/components/shared/media/MediaImageAdjustModal";
import { ScreenSlide } from "@type/campaigns";
import { Button, Flex, List, Popconfirm, theme, Typography, message } from "antd";
import { useState } from "react";
import { LuCheck, LuClock, LuTrash2 } from "react-icons/lu";

const { Text } = Typography;

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
    const { token } = theme.useToken();
    const [uploading, setUploading] = useState(false);
    const [pendingSlide, setPendingSlide] = useState<{
        fileName: string;
        prepared: PreparedMediaImage;
    } | null>(null);
    const [isPendingSlideAdjustOpen, setIsPendingSlideAdjustOpen] = useState(false);

    const canUpload = pinnedSlides.length < maxUploads;

    const handleUpload = async (file: File) => {
        if (!canUpload) {
            message.error(`Maximum ${maxUploads} custom slides allowed`);
            return false;
        }

        setUploading(true);

        try {
            const prepared = await prepareMediaImage(file, 'digitalScreenSlide');
            setPendingSlide({
                fileName: file.name,
                prepared,
            });
            message.success('Slide ready. Review and save it.');

        } catch (error: any) {
            message.error(error.message || 'Failed to upload slide');
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
            const caption = preparedName.replace(/\.[^/.]+$/, "");

            // Upload via DAL (follows existing pattern from projects/tickets)
            await uploadScreenSlide(
                {
                    name: preparedName,
                    size: prepared.sizeBytes,
                    type: prepared.mimeType,
                    uid: `slide-${Date.now()}`,
                    url: prepared.dataUrl,
                },
                caption
            );

            message.success(`Slide uploaded! Will expire in ${uploadExpiryDays} days`);
            setPendingSlide(null);
            onSlideUploaded();
        } catch (error: any) {
            message.error(error.message || 'Failed to upload slide');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (slideId: string) => {
        try {
            // Delete via DAL (follows existing pattern)
            await removePinnedSlide(slideId);

            message.success('Slide removed');
            onSlideDeleted(slideId);

        } catch (error) {
            message.error('Failed to remove slide');
        }
    };

    const getDaysRemaining = (validUntil?: any): number => {
        if (!validUntil) return uploadExpiryDays;
        const expiryMs = validUntil.toMillis ? validUntil.toMillis() : validUntil;
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
                    onRemove={pendingSlide ? () => setPendingSlide(null) : undefined}
                    onSelectFile={(file) => { void handleUpload(file); }}
                    placeholderDescription={canUpload ? 'Drop, paste, or choose a widescreen slide.' : `Maximum ${maxUploads} custom slides allowed.`}
                    placeholderTitle={pendingSlide ? 'Slide ready' : 'Upload image'}
                />
                {pendingSlide ? (
                    <Button icon={<LuCheck />} loading={uploading} onClick={() => void handleSavePendingSlide()} type="primary">
                        Save slide
                    </Button>
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
                                    <Popconfirm
                                        key="delete"
                                        title="Delete this custom slide?"
                                        description={`"${slide.caption || 'Custom Slide'}" will be removed from Highlights and will stop showing on your digital screens immediately.`}
                                        onConfirm={() => handleDelete(slide.id)}
                                        okText="Delete slide"
                                        cancelText="Cancel"
                                    >
                                        <Button
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
                                                alt="Slide"
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
                                                📷
                                            </div>
                                        )
                                    }
                                    title={slide.caption || 'Custom Slide'}
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
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16 }}>
                    No custom slides uploaded
                </Text>
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
