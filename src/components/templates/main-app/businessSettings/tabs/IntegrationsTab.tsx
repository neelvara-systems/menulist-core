/**
 * Integrations Tab - Google Business Profile Connection
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Phase 0 UI Stub: Shows "Not connected" state with feature flag gate.
 * Full implementation in Phase 1 after GBP API access approved.
 *
 * @see __docs__/gbp-sync/GBP_SYNC_impl.md
 * @see __docs__/gbp-sync/GBP_SYNC_spec.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { Alert, Badge, Button, Card, Divider, Flex, Typography, theme } from "antd";
import { LuLink, LuMapPin, LuStore } from "react-icons/lu";

const { Title, Text, Paragraph } = Typography;

interface IntegrationsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: {
        gbp?: {
            isConnected: boolean;
            locationName?: string;
            locationAddress?: string;
            menuLinkMode?: "MANAGED" | "OFF";
        };
        gbpState?: {
            linkStatus?: "OK" | "MISSING" | "WRONG" | "UNKNOWN" | "NOT_WRITABLE";
            hoursStatus?: "OK" | "MISMATCH" | "UNKNOWN" | "NOT_WRITABLE";
        };
    };
}

const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
    scrollRef,
    storeDetails,
}) => {
    const { token } = theme.useToken();
    const gbpEnabled = FEATURE_FLAGS.ENABLE_GBP_SYNC;
    const gbp = storeDetails?.gbp;
    const gbpState = storeDetails?.gbpState;
    const isConnected = gbp?.isConnected ?? false;

    // Feature flag gate - hide entirely if disabled
    if (!gbpEnabled) {
        return null;
    }

    return (
        <Card size="small" ref={scrollRef}>
            <Flex align="center" gap={8}>
                <LuStore size={20} style={{ color: token.colorPrimary }} />
                <Title level={5} style={{ margin: "unset" }}>
                    Google Business Profile
                </Title>
            </Flex>
            <Divider />

            {isConnected ? (
                // Connected State
                <Flex vertical gap={16}>
                    <Flex align="center" gap={8}>
                        <Badge status="success" />
                        <Text strong>Connected</Text>
                    </Flex>

                    {gbp?.locationName && (
                        <Flex align="center" gap={8}>
                            <LuMapPin />
                            <Text>{gbp.locationName}</Text>
                            {gbp.locationAddress && (
                                <Text type="secondary">— {gbp.locationAddress}</Text>
                            )}
                        </Flex>
                    )}

                    <Divider style={{ margin: "8px 0" }} />

                    {/* Menu Link Status */}
                    <Flex justify="space-between" align="center">
                        <Flex align="center" gap={8}>
                            <LuLink />
                            <Text>Menu link</Text>
                        </Flex>
                        <Badge
                            status={gbpState?.linkStatus === "OK" ? "success" : "warning"}
                            text={gbp?.menuLinkMode === "MANAGED" ? "Managed" : "Off"}
                        />
                    </Flex>

                    {/* Hours Status */}
                    <Flex justify="space-between" align="center">
                        <Text>Hours</Text>
                        <Badge
                            status={gbpState?.hoursStatus === "OK" ? "success" : "warning"}
                            text={gbpState?.hoursStatus === "OK" ? "Synced" : "Not synced"}
                        />
                    </Flex>

                    {/* Apply Hours Button (shown when mismatch) */}
                    {gbpState?.hoursStatus === "MISMATCH" && (
                        <Button type="primary" disabled style={{ marginTop: 8 }}>
                            Apply MenuList hours to Google
                        </Button>
                    )}

                    <Divider style={{ margin: "8px 0" }} />

                    <Button danger type="text" disabled>
                        Disconnect
                    </Button>
                </Flex>
            ) : (
                // Not Connected State (Phase 0 Stub)
                <Flex vertical gap={16} align="center" style={{ padding: "24px 0" }}>
                    <LuStore size={48} style={{ color: token.colorTextTertiary }} />

                    <Paragraph
                        type="secondary"
                        style={{ textAlign: "center", marginBottom: 0 }}
                    >
                        Connect your Google Business Profile to keep your menu link and
                        hours accurate.
                    </Paragraph>

                    <Alert
                        type="info"
                        showIcon
                        message="Coming Soon"
                        description="Google Business Profile sync is not yet available. We're waiting for API access approval."
                        style={{ width: "100%" }}
                    />

                    <Button
                        type="primary"
                        icon={<LuStore />}
                        disabled
                        size="large"
                    >
                        Connect Google
                    </Button>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Keeps Google aligned with your MenuList menu and hours.
                    </Text>
                </Flex>
            )}
        </Card>
    );
};

export default IntegrationsTab;
