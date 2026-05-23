'use client';

/**
 * Health Signal Cards — Trust (P4), Loyalty (P5), Business Health (P6)
 *
 * Single calm indicators for business owners:
 * - "Customer Trust: Strong / Stable / Weak"
 * - "Customer Loyalty: Strong / Stable / Weak"
 * - "Business Health: Stable / Watch / At Risk"
 *
 * Only visible when Cloud Function has computed signals with sufficient data.
 * Feature-flag gated per signal.
 *
 * @see __docs__/trust-health-signal/trust-health-signal_impl.md
 * @see __docs__/loyalty-health-signal/loyalty-health-signal_impl.md
 * @see __docs__/risk-decline-detection/risk-decline-detection_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { Card, Flex, Typography, theme } from 'antd';
import { LuHeart, LuShield, LuTrendingDown } from 'react-icons/lu';

const { Text, Title } = Typography;
const { useToken } = theme;

// ================================================================
// TYPES
// ================================================================

interface HealthSignals {
    trust?: {
        state: 'strong' | 'stable' | 'weak';
        computedAt: string;
        dataPoints: number;
        visible: boolean;
    };
    loyalty?: {
        state: 'strong' | 'stable' | 'weak';
        computedAt: string;
        dataPoints: number;
        visible: boolean;
    };
    risk?: {
        state: 'stable' | 'watch' | 'at_risk';
        computedAt: string;
        visible: boolean;
        consecutiveWeakWeeks: number;
    };
}

interface HealthSignalCardsProps {
    healthSignals?: HealthSignals;
}

type SignalTone = 'success' | 'primary' | 'warning' | 'error';

interface SignalConfig {
    tone: SignalTone;
    label: string;
}

// ================================================================
// STATE CONFIGS
// ================================================================

const TRUST_STATE_CONFIG: Record<string, SignalConfig> = {
    strong: { tone: 'success', label: 'Strong' },
    stable: { tone: 'primary', label: 'Stable' },
    weak: { tone: 'warning', label: 'Weak' },
};

const LOYALTY_STATE_CONFIG: Record<string, SignalConfig> = {
    strong: { tone: 'success', label: 'Strong' },
    stable: { tone: 'primary', label: 'Stable' },
    weak: { tone: 'warning', label: 'Weak' },
};

const RISK_STATE_CONFIG: Record<string, SignalConfig> = {
    stable: { tone: 'success', label: 'Stable' },
    watch: { tone: 'warning', label: 'Watch' },
    at_risk: { tone: 'error', label: 'At Risk' },
};

const resolveSignalColor = (token: ReturnType<typeof useToken>['token'], tone: SignalTone) => {
    if (tone === 'success') return token.colorSuccess;
    if (tone === 'warning') return token.colorWarning;
    if (tone === 'error') return token.colorError;
    return token.colorPrimary;
};

// ================================================================
// INDIVIDUAL CARDS
// ================================================================

function TrustHealthCard({ trust }: { trust: HealthSignals['trust'] }) {
    const { token } = useToken();
    if (!FEATURE_FLAGS.ENABLE_TRUST_HEALTH_SIGNAL) return null;
    if (!trust?.visible) return null;

    const config = TRUST_STATE_CONFIG[trust.state] || TRUST_STATE_CONFIG.stable;
    const signalColor = resolveSignalColor(token, config.tone);

    return (
        <Card size="small" style={{ flex: 1, minWidth: 160 }}>
            <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                <LuShield size={14} style={{ color: signalColor }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Customer Trust</Text>
            </Flex>
            <Title level={4} style={{ color: signalColor, margin: 0, fontSize: 18 }}>
                {config.label}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>Based on visitor trends</Text>
        </Card>
    );
}

function LoyaltyHealthCard({ loyalty }: { loyalty: HealthSignals['loyalty'] }) {
    const { token } = useToken();
    if (!FEATURE_FLAGS.ENABLE_LOYALTY_HEALTH_SIGNAL) return null;
    if (!loyalty?.visible) return null;

    const config = LOYALTY_STATE_CONFIG[loyalty.state] || LOYALTY_STATE_CONFIG.stable;
    const signalColor = resolveSignalColor(token, config.tone);

    return (
        <Card size="small" style={{ flex: 1, minWidth: 160 }}>
            <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                <LuHeart size={14} style={{ color: signalColor }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Customer Loyalty</Text>
            </Flex>
            <Title level={4} style={{ color: signalColor, margin: 0, fontSize: 18 }}>
                {config.label}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>Based on return patterns</Text>
        </Card>
    );
}

function BusinessHealthCard({ risk }: { risk: HealthSignals['risk'] }) {
    const { token } = useToken();
    if (!FEATURE_FLAGS.ENABLE_RISK_DECLINE_DETECTION) return null;
    if (!risk?.visible) return null;

    const config = RISK_STATE_CONFIG[risk.state] || RISK_STATE_CONFIG.stable;
    const signalColor = resolveSignalColor(token, config.tone);

    return (
        <Card size="small" style={{ flex: 1, minWidth: 160 }}>
            <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                <LuTrendingDown size={14} style={{ color: signalColor }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Business Health</Text>
            </Flex>
            <Title level={4} style={{ color: signalColor, margin: 0, fontSize: 18 }}>
                {config.label}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>Based on overall trends</Text>
        </Card>
    );
}

// ================================================================
// COMPOSITE EXPORT
// ================================================================

/**
 * Renders all visible health signal cards in a horizontal row.
 * Returns null if no signals are visible.
 */
export default function HealthSignalCards({ healthSignals }: HealthSignalCardsProps) {
    if (!healthSignals) return null;

    const { trust, loyalty, risk } = healthSignals;
    const anyVisible =
        (FEATURE_FLAGS.ENABLE_TRUST_HEALTH_SIGNAL && trust?.visible) ||
        (FEATURE_FLAGS.ENABLE_LOYALTY_HEALTH_SIGNAL && loyalty?.visible) ||
        (FEATURE_FLAGS.ENABLE_RISK_DECLINE_DETECTION && risk?.visible);

    if (!anyVisible) return null;

    return (
        <Flex gap={12} wrap="wrap">
            <TrustHealthCard trust={trust} />
            <LoyaltyHealthCard loyalty={loyalty} />
            <BusinessHealthCard risk={risk} />
        </Flex>
    );
}
