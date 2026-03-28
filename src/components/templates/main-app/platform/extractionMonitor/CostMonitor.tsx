'use client';

/**
 * Cost Monitor — AI extraction cost panel
 * 
 * Shows daily Gemini API spend from extractions:
 * - Calls today
 * - Avg cost per extraction
 * - Daily spend
 * - Most expensive job
 * 
 * @see __docs__/ai-extraction-monitoring/
 */

import { getExtractionCostMetrics } from '@database/ops/extraction';
import type { ExtractionCostMetrics } from '@lib/ops/extractionTypes';
import { Card, Empty, Spin, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Text } = Typography;

interface CostMonitorProps {
    refreshTrigger?: number;
}

export default function CostMonitor({ refreshTrigger }: CostMonitorProps) {
    const [loading, setLoading] = useState(true);
    const [cost, setCost] = useState<ExtractionCostMetrics | null>(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getExtractionCostMetrics()
            .then(data => { if (mounted) setCost(data); })
            .catch(() => { if (mounted) setCost(null); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [refreshTrigger]);

    if (loading) {
        return (
            <Card size="small" title="Cost Monitor (Today)" style={{ marginBottom: 24 }}>
                <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            </Card>
        );
    }

    if (!cost || cost.callsToday === 0) {
        return (
            <Card size="small" title="Cost Monitor (Today)" style={{ marginBottom: 24 }}>
                <Empty description="No extraction calls today" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </Card>
        );
    }

    return (
        <Card size="small" title="Cost Monitor (Today)" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <Statistic title="Gemini Calls" value={cost.callsToday} />
                <Statistic
                    title="Avg Cost/Extraction"
                    value={cost.avgCostPerExtraction}
                    suffix="paise"
                />
                <Statistic
                    title="Daily Spend"
                    value={cost.dailySpend}
                    suffix="paise"
                    valueStyle={{ color: cost.dailySpend > 10000 ? '#ff4d4f' : undefined }}
                />
                <Statistic
                    title="Most Expensive"
                    value={cost.mostExpensiveJobCost}
                    suffix="paise"
                />
            </div>
            <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Data from MENULIST_AI_OPERATIONS collection (Cloud Function writes).
                </Text>
            </div>
        </Card>
    );
}
