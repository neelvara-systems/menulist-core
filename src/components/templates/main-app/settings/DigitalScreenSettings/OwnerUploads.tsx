/**
 * Owner Uploads Section
 * Per spec: Owner can upload custom images (max 3)
 * Per spec: Auto-expire after 14 days
 * 
 * Follows existing pattern: Client-side upload via DAL, not API route
 */

import { ClockCircleOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { removePinnedSlide, uploadScreenSlide } from "@database/campaigns";
import { ScreenSlide } from "@type/campaigns";
import { getBase64 } from "@util/utils";
import { Button, List, Popconfirm, Typography, Upload, message } from "antd";
import { useState } from "react";

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
    const [uploading, setUploading] = useState(false);

    const canUpload = pinnedSlides.length < maxUploads;

    const handleUpload = async (file: File) => {
        if (!canUpload) {
            message.error(`Maximum ${maxUploads} custom slides allowed`);
            return false;
        }

        setUploading(true);

        try {
            // Convert file to base64 using existing utility
            const base64Url = await getBase64(file);
            const caption = file.name.replace(/\.[^/.]+$/, ""); // Use filename without extension

            // Upload via DAL (follows existing pattern from projects/tickets)
            await uploadScreenSlide(
                { url: base64Url, type: file.type, uid: `slide-${Date.now()}` },
                caption
            );

            message.success(`Slide uploaded! Will expire in ${uploadExpiryDays} days`);
            onSlideUploaded();

        } catch (error: any) {
            message.error(error.message || 'Failed to upload slide');
        } finally {
            setUploading(false);
        }

        return false; // Prevent default upload behavior
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

                <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={handleUpload}
                    disabled={!canUpload || uploading}
                >
                    <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        loading={uploading}
                        disabled={!canUpload}
                    >
                        Upload Image
                    </Button>
                </Upload>
            </div>

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
                                        title="Remove this slide?"
                                        onConfirm={() => handleDelete(slide.id)}
                                        okText="Remove"
                                        cancelText="Cancel"
                                    >
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
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
                                                background: '#f0f0f0',
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
                                            <ClockCircleOutlined style={{ marginRight: 4 }} />
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
        </div>
    );
}

