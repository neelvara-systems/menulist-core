'use client'

/**
 * Canonica — Coverage KPI Card
 * 
 * Displays canonical hit/miss ratio from nightly aggregation.
 * Feature-flagged: only renders when ENABLE_CANONICA_CANONICAL_ANSWERS is true.
 * 
 * Data source: platformSummary/coverage_{tId}_{sId} (1 Firestore read)
 * Written by: canonicaNightly → aggregateCoverageKPI
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md (canonical coverage is THE KPI)
 */

import { FEATURE_FLAGS } from '@config/features';
import { CanonicaCoverageData, getCanonicaCoverage } from '@database/canonica/coverageKPI';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { Card, Progress, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Text } = Typography;

export default function CanonicaCoverageKPI() {
    const session = useClientAuthSession();
    const [data, setData] = useState<CanonicaCoverageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_CANONICAL_ANSWERS || !session?.tId || !session?.sId) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const result = await getCanonicaCoverage(session.tId, session.sId);
                setData(result);
            } catch {
                // Silent fail — KPI card is informational only
            } finally {
                setLoading(false);
            }
        })();
    }, [session?.tId, session?.sId]);

    // Feature flag gate — don't render if Canonica answers not enabled
    if (!FEATURE_FLAGS.ENABLE_CANONICA_CANONICAL_ANSWERS) return null;

    if (loading) {
        return (
            <Card size="small" style={{ minWidth: 200 }}>
                <Spin size="small" />
            </Card>
        );
    }

    const coverage = data?.coverage;
    if (!coverage) {
        return (
            <Card size="small" style={{ minWidth: 200 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Canonical Coverage</Text>
                <br />
                <Text type="secondary">No data yet</Text>
            </Card>
        );
    }

    const rate = coverage.rate || 0;
    const strokeColor = rate >= 50 ? '#52c41a' : rate >= 20 ? '#faad14' : '#ff4d4f';

    return (
        <Card size="small" style={{ minWidth: 200 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Canonical Coverage
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Progress
                    type="circle"
                    percent={rate}
                    size={48}
                    strokeColor={strokeColor}
                    format={(pct) => `${pct}%`}
                />
                <div>
                    <Text strong style={{ fontSize: 14 }}>{coverage.hits} hits</Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {coverage.misses} misses / {coverage.total} total
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {coverage.date}
                    </Text>
                </div>
            </div>
        </Card>
    );
}
