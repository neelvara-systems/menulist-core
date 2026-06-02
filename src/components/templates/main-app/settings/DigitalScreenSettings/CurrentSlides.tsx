"use client";

/**
 * Current Slides Display
 * Per spec: Owner sees what's showing (read-only)
 * Shows labels: "Today", "Popular", "Always shown", "Your upload"
 */

import { ScreenSlide } from "@type/campaigns";
import { normalizeOwnerSlideCaption } from "@lib/screen/screenContent";
import { Empty, List, Tag, Typography, theme } from "antd";
import { LuImage } from "react-icons/lu";

const { Text } = Typography;

interface CurrentSlidesProps {
    ownerOverrideEnabled?: boolean;
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
            return { text: "Custom slide", color: "blue" };
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

export default function CurrentSlides({ ownerOverrideEnabled, pinnedSlides }: CurrentSlidesProps) {
    const { token } = theme.useToken();
    const displaySlides: ScreenSlide[] = [...pinnedSlides];

    if (displaySlides.length === 0) {
        return (
            <div className="current-slides-section">
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    Highlights content
                </Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {ownerOverrideEnabled
                        ? 'Only custom slides is on. Add a custom slide for Highlights.'
                        : 'Menu highlights are added automatically. Custom slides appear here when uploaded.'}
                </Text>
                <Empty
                    description="No custom slides"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </div>
        );
    }

    return (
        <div className="current-slides-section">
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
                Highlights content
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                {ownerOverrideEnabled
                    ? 'Highlights is using custom slides only.'
                    : 'These custom slides are mixed into automatic menu highlights.'}
            </Text>

            <List
                size="small"
                dataSource={displaySlides}
                renderItem={(slide) => {
                    const label = getSlideLabel(slide);
                    return (
                        <List.Item style={{ padding: '8px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {slide.imageUrl ? (
                                    <img
                                        src={slide.imageUrl}
                                        alt={slide.itemName || normalizeOwnerSlideCaption(slide.caption)}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            objectFit: 'cover',
                                            borderRadius: 4
                                        }}
                                    />
                                ) : (
                                    <span
                                        className="slide-thumb-fallback"
                                        style={{
                                            background: token.colorFillSecondary,
                                            color: token.colorTextTertiary,
                                        }}
                                    >
                                        <LuImage size={20} />
                                    </span>
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <Text>{slide.source === 'pinned' ? normalizeOwnerSlideCaption(slide.caption) : (slide.itemName || normalizeOwnerSlideCaption(slide.caption))}</Text>
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
                .slide-thumb-fallback {
                    width: 48px;
                    height: 48px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
            `}</style>
        </div>
    );
}
