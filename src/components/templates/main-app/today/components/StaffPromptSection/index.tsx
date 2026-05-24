"use client";

import { StaffPrompt } from "@type/campaigns";
import { Card, Typography, theme } from "antd";
import { LuMessageCircle } from "react-icons/lu";

const { Text, Title } = Typography;

interface StaffPromptSectionProps {
    staffPrompt: StaffPrompt | undefined;
}

/**
 * Staff Prompt Section
 * Per spec: Read-only, no buttons, no settings
 * Appears only when eligible
 * 
 * Copy structure is LOCKED:
 * - "Staff prompt for today"
 * - "Say this when customers ask:"
 * - "{prompt text}"
 * - "Applies today"
 */
export default function StaffPromptSection({
    staffPrompt,
}: StaffPromptSectionProps) {
    const { token } = theme.useToken();

    // Don't render if not eligible
    if (!staffPrompt?.eligible) return null;

    return (
        <Card
            size="small"
            style={{
                marginTop: 16,
                background: token.colorFillAlter,
                borderLeft: `3px solid ${token.colorPrimary}`,
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <LuMessageCircle
                    size={20}
                    style={{ color: token.colorPrimary, marginTop: 2 }}
                />
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Staff prompt for today
                    </Text>
                    <Title level={5} style={{ margin: "4px 0 0 0" }}>
                        Say this when customers ask:
                    </Title>
                    <Text
                        strong
                        style={{
                            fontSize: 16,
                            display: "block",
                            marginTop: 8,
                            fontStyle: "italic",
                        }}
                    >
                        &quot;{staffPrompt.text}&quot;
                    </Text>
                    <Text
                        type="secondary"
                        style={{ fontSize: 11, marginTop: 8, display: "block" }}
                    >
                        Applies today
                    </Text>
                </div>
            </div>
        </Card>
    );
}
