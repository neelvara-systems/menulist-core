'use client'

/**
 * Answerlattice — Coverage KPI Card
 * 
 * Displays canonical hit/miss ratio from nightly aggregation.
 * Feature-flagged: only renders when ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS is true.
 * 
 * Data source: platformSummary/coverage_{tId}_{sId} (1 Firestore read)
 * Written by: answerlatticeNightly → aggregateCoverageKPI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (canonical coverage is THE KPI)
 */

import { FEATURE_FLAGS } from '@config/features';
import { AnswerlatticeCoverageData, getAnswerlatticeCoverage } from '@database/answerlattice/coverageKPI';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { Card, Progress, Spin, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';

const { Text } = Typography;

export default function AnswerlatticeCoverageKPI() {
    const session = useClientAuthSession();
    const { token } = theme.useToken();
    const [data, setData] = useState<AnswerlatticeCoverageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS || !session?.tId || !session?.sId) {
            setLoading(false);
            return;
        }
        const tenantId = session.tId;
        const storeId = session.sId;

        (async () => {
            try {
                setLoadFailed(false);
                const result = await getAnswerlatticeCoverage(tenantId, storeId);
                setData(result);
            } catch {
                setLoadFailed(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [session?.tId, session?.sId]);

    // Feature flag gate — don't render if Answerlattice answers not enabled
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS) return null;

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
                <Text type="secondary" style={{ fontSize: 12 }}>Canonical Answer Coverage</Text>
                <br />
                <Text type={loadFailed ? 'danger' : 'secondary'}>
                    {loadFailed ? 'Could not load metrics' : 'No complete 24-hour window yet'}
                </Text>
            </Card>
        );
    }

    const rate = coverage.rate || 0;
    const strokeColor = rate >= 50 ? token.colorSuccess : rate >= 20 ? token.colorWarning : token.colorError;
    const lastUpdated = data?.lastUpdated as { toDate?: () => Date } | undefined;
    const updatedDate = lastUpdated?.toDate?.();
    const stale = Boolean(updatedDate && Date.now() - updatedDate.getTime() > 36 * 60 * 60 * 1000);

    if (coverage.total === 0) {
        return (
            <Card size="small" style={{ minWidth: 200 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Canonical Answer Coverage {stale ? '(stale)' : ''}
                </Text>
                <Text strong>No questions in this window</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    Complete rolling 24-hour window · {coverage.date}
                </Text>
            </Card>
        );
    }

    return (
        <Card size="small" style={{ minWidth: 200 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Canonical Answer Coverage {stale ? '(stale)' : ''}
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
                    <Text strong style={{ fontSize: 14 }}>{coverage.hits} approved serves</Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {coverage.misses} fallbacks / {coverage.total} questions
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        Complete rolling 24-hour window · {coverage.date}
                    </Text>
                </div>
            </div>
        </Card>
    );
}
