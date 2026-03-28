'use client';

/**
 * ReputationGuard — Passive warning notice for review risk states
 *
 * Minimal UI: shows only when block or escalation state is active.
 * No dashboard, no list, no analytics — just a calm notice.
 * Warnings auto-expire after 24h (no dismiss button needed).
 *
 * @see __docs__/reviews-reputation/reviews-reputation_impl.md §5
 */

import { FEATURE_FLAGS } from '@config/features';
import { Alert, Card, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { LuShield } from 'react-icons/lu';

const { Text } = Typography;

interface ReputationState {
    hasBlockActive: boolean;
    hasEscalationActive: boolean;
}

export default function ReputationGuard() {
    const [state, setState] = useState<ReputationState | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchState = useCallback(async () => {
        try {
            const res = await fetch('/api/reviews/states');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setState(data.data);
                }
            }
        } catch {
            // Fail silently — this is a passive notice
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION) return;
        fetchState();
    }, [fetchState]);

    // Don't render if feature is off, still loading, or no active states
    if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION) return null;
    if (loading || !state) return null;
    if (!state.hasBlockActive && !state.hasEscalationActive) return null;

    return (
        <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {state.hasBlockActive && (
                    <Alert
                        type="error"
                        showIcon
                        icon={<LuShield size={16} />}
                        message="A recent review needs careful handling"
                        description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                It&apos;s better not to respond to this publicly. This notice will auto-expire.
                            </Text>
                        }
                        style={{ borderRadius: 8 }}
                    />
                )}
                {state.hasEscalationActive && (
                    <Alert
                        type="warning"
                        showIcon
                        icon={<LuShield size={16} />}
                        message="A recent review may need careful handling"
                        description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Consider responding privately if needed. This notice will auto-expire.
                            </Text>
                        }
                        style={{ borderRadius: 8 }}
                    />
                )}
            </Space>
        </Card>
    );
}
