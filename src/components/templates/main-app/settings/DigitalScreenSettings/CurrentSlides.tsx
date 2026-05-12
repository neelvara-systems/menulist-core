"use client";

/**
 * Current Slides Display
 * Per spec: Owner sees what's showing (read-only)
 * Shows labels: "Today", "Popular", "Always shown", "Your upload"
 */

import { ScreenSlide } from "@type/campaigns";
import { Empty, List, Tag, Typography } from "antd";

const { Text } = Typography;

interface CurrentSlidesProps {
    pinnedSlides: ScreenSlide[];
    onSlideDeleted?: (slideId: string) => void;
}

/**
 * Get display label for slide source
 * Per spec: Labels like "Today", "Popular", "Always shown", "Your upload"
 */
function getSlideLabel(slide: ScreenSlide): { text: string; color: string } {
    switch (slide.source) {
        case "pinned":
            return { text: "Your Upload", color: "blue" };
        case "campaign":
            return { text: "Today", color: "gold" };
        case "evergreen":
            if (slide.type === "brand_fallback") {
                return { text: "Always Shown", color: "default" };
            }
            return { text: "Popular", color: "green" };
        default:
            return { text: "Menu Item", color: "default" };
    }
}

export default function CurrentSlides({ pinnedSlides }: CurrentSlidesProps) {
    // Combine system slides (mocked for now) with owner uploads
    const displaySlides: ScreenSlide[] = [
        // Owner pinned slides
        ...pinnedSlides,
        // In production, these would come from the API
        // For now, show placeholder evergreen
    ];

    if (displaySlides.length === 0) {
        return (
            <div className="current-slides-section">
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    Currently Showing
                </Text>
                <Empty
                    description="Your screen will show menu highlights automatically"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </div>
        );
    }

    return (
        <div className="current-slides-section">
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
                Currently Showing
            </Text>

            <List
                size="small"
                dataSource={displaySlides}
                renderItem={(slide) => {
                    const label = getSlideLabel(slide);
                    return (
                        <List.Item style={{ padding: '8px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {slide.imageUrl && !slide.imageUrl.startsWith('data:') && (
                                    <img
                                        src={slide.imageUrl}
                                        alt={slide.itemName || 'Slide'}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            objectFit: 'cover',
                                            borderRadius: 4
                                        }}
                                    />
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <Text>{slide.source === 'pinned' ? (slide.caption || 'Custom Slide') : (slide.itemName || slide.caption || 'Custom Slide')}</Text>
                                    <br />
                                    <Tag color={label.color}>{label.text}</Tag>
                                </div>
                            </div>
                        </List.Item>
                    );
                }}
            />

            <style jsx>{`
                .current-slides-section {
                    padding: 0;
                }
            `}</style>
        </div>
    );
}
