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
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import type { ExtractionCostMetrics } from '@lib/ops/extractionTypes';
import { formatInrPaise } from '@util/formatters';
import { Card, Empty, Spin, Statistic, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';

const { Text } = Typography;
const EXTRACTION_COST_MONITOR_LOAD_FAILED = 'extraction_cost_monitor_load_failed';

interface CostMonitorProps {
    cost?: ExtractionCostMetrics | null;
    refreshTrigger?: number;
}

export default function CostMonitor({ cost: externalCost, refreshTrigger }: CostMonitorProps) {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(true);
    const [cost, setCost] = useState<ExtractionCostMetrics | null>(null);
    const [costLoadFailed, setCostLoadFailed] = useState(false);

    useEffect(() => {
        if (externalCost !== undefined) {
            setCost(externalCost);
            setCostLoadFailed(false);
            setLoading(false);
            return;
        }
        let mounted = true;
        setLoading(true);
        setCostLoadFailed(false);
        getExtractionCostMetrics()
            .then(data => {
                if (!mounted) return;
                setCost(data);
                setCostLoadFailed(false);
            })
            .catch((error) => {
                logOpsFailure(EXTRACTION_COST_MONITOR_LOAD_FAILED, error, {
                    ...getBoundedOpsStringContext('refreshTrigger', refreshTrigger),
                    externalCostProvided: false,
                });
                if (!mounted) return;
                setCost(null);
                setCostLoadFailed(true);
            })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [externalCost, refreshTrigger]);

    if (loading) {
        return (
            <Card size="small" title="Cost Monitor (Today)" style={{ marginBottom: 24 }}>
                <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            </Card>
        );
    }

    if (costLoadFailed) {
        return (
            <Card size="small" title="Cost Monitor (Today)" style={{ marginBottom: 24 }}>
                <Empty description="Cost metrics unavailable" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Text type="secondary">Refresh the monitor.</Text>
                </Empty>
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
                    value={formatInrPaise(cost.avgCostPerExtraction, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    })}
                />
                <Statistic
                    title="Daily Spend"
                    value={formatInrPaise(cost.dailySpend, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    })}
                    valueStyle={{ color: cost.dailySpend > 10000 ? token.colorError : undefined }}
                />
                <Statistic
                    title="Most Expensive"
                    value={formatInrPaise(cost.mostExpensiveJobCost, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    })}
                />
            </div>
            <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Data from MENULIST_AI_OPERATIONS collection (Cloud Function writes). Stored as paise and shown as INR here.
                </Text>
            </div>
        </Card>
    );
}
