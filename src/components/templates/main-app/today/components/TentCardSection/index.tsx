"use client";

import { PhysicalSurfaceEligibility } from "@type/campaigns";
import { Button, Card, notification, Space, Typography } from "antd";
import { useState } from "react";
import { LuDownload, LuPrinter } from "react-icons/lu";

const { Text } = Typography;

interface TentCardSectionProps {
    tentCard: NonNullable<PhysicalSurfaceEligibility["tentCard"]>;
    brandName?: string;
}

/**
 * System-decided size selection
 * Per spec: Owner never chooses, system decides
 * Tables → A6 (standard), Counters → A5 (visibility)
 */
function getSystemSize(placementHint?: "table" | "counter"): "A6" | "A5" {
    return placementHint === "counter" ? "A5" : "A6";
}

/**
 * Tent Card Section
 * Per spec: Read-only, download only, no editing
 * Appears only when eligible (confidence ≥ 0.7)
 */
export default function TentCardSection({
    tentCard,
    brandName,
}: TentCardSectionProps) {
    const [downloading, setDownloading] = useState(false);

    // System-decided size (no owner selection)
    const size = getSystemSize("table");

    const handleDownload = async () => {
        const itemName = tentCard.itemName || "Item";

        setDownloading(true);
        try {
            const { generateTentCardPDF } = await import("@lib/physical-surfaces/tentCardGenerator");
            const blob = await generateTentCardPDF({
                itemName,
                templateId: tentCard.templateId,
                qrUrl: tentCard.qrUrl,
                size,
                brandName,
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tent-card-${size.toLowerCase()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            notification.error({
                message: "Download failed",
                description: "Could not generate tent card. Please try again.",
            });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Card size="small" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LuPrinter size={20} />
                    <Text strong>Table tent is ready</Text>
                </div>

                <Text type="secondary">Best for walk-in customers today</Text>

                {/* Size shown as info, not selection */}
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Size: {size} (recommended for tables)
                </Text>

                <Button
                    type="primary"
                    icon={<LuDownload />}
                    onClick={handleDownload}
                    loading={downloading}
                    block
                >
                    Download tent card
                </Button>
            </Space>
        </Card>
    );
}
