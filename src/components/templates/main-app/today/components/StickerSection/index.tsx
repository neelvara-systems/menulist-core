"use client";

import { generateStickerPNG } from "@lib/physical-surfaces/stickerGenerator";
import { PhysicalSurfaceEligibility } from "@type/campaigns";
import { Button, Card, notification, Space, Typography } from "antd";
import { useState } from "react";
import { LuDownload, LuSticker } from "react-icons/lu";

const { Text } = Typography;

interface StickerSectionProps {
    activePlanType?: string | null;
    brandColor?: string;
    brandName?: string;
    logoUrl?: string;
    sticker: NonNullable<PhysicalSurfaceEligibility["counterSticker"]>;
}

/**
 * Counter Sticker Section
 * Per spec: Read-only, download only, no editing
 * Appears only when eligible (confidence ≥ 0.8 + 7 days stability)
 * Higher stakes than tent cards — permanent + every customer sees
 */
export default function StickerSection({ activePlanType, brandColor, brandName, logoUrl, sticker }: StickerSectionProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        const itemName = sticker.itemName || "Item";

        setDownloading(true);
        try {
            const blob = await generateStickerPNG({
                activePlanType,
                brandColor,
                brandName,
                itemName,
                logoUrl,
                templateId: sticker.templateId,
                qrUrl: sticker.qrUrl,
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "counter-sticker.png";
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            notification.error({
                message: "Download failed",
                description: "Could not generate sticker. Please try again.",
            });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Card size="small" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LuSticker size={20} />
                    <Text strong>Counter sticker is ready</Text>
                </div>

                <Text type="secondary">Recommended for billing counter</Text>

                {/* Size shown as info */}
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Size: 8cm × 8cm
                </Text>

                <Button
                    type="primary"
                    icon={<LuDownload />}
                    onClick={handleDownload}
                    loading={downloading}
                    block
                >
                    Download sticker
                </Button>
            </Space>
        </Card>
    );
}
