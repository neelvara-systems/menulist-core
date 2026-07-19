'use client';

/**
 * Weekly Performance Digest Component
 * 
 * Displays the scoped weekly performance summary from Answerlattice Functions.
 * Reads from: insights/{tId}/stores/{sId}/ai/weekly
 */

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
  type AnswerlatticeWeeklySummary,
  getAnswerlatticeWeeklySummaryFreshness,
  parseAnswerlatticeWeeklySummary,
} from '@lib/answerlattice/analyticsIntelligenceContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Alert, Button, Card, Empty, message, Space, Spin, Statistic, Typography } from 'antd';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LuCalendar, LuDownload, LuRefreshCw, LuTrendingDown, LuTrendingUp } from 'react-icons/lu';

const WEEKLY_DIGEST_LOAD_FAILED_MESSAGE = 'Failed to load weekly digest. Please try again later';

// ================================================================
// COMPONENT
// ================================================================

export default function WeeklyDigest() {
  const session = useClientAuthSession();
  const [digest, setDigest] = useState<AnswerlatticeWeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch digest from Firestore
  const fetchDigest = async () => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) {
      setDigest(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const digestRef = doc(
        answerlatticeFirebaseClient,
        'insights',
        String(scope.tenantId),
        'stores',
        String(scope.storeId),
        'ai',
        'weekly'
      );

      const digestDoc = await getDoc(digestRef);

      if (digestDoc.exists()) {
        const parsed = parseAnswerlatticeWeeklySummary(digestDoc.data(), scope);
        if (!parsed) {
          throw new Error('answerlattice_weekly_digest_contract_invalid');
        }
        setDigest(parsed);
      } else {
        setDigest(null);
      }
    } catch (error) {
      logRuntimeFailure('platform_weekly_digest_load_failed', error);
      message.error(WEEKLY_DIGEST_LOAD_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  // Export as text
  const handleExport = () => {
    if (!digest) return;

    const text = `
Weekly Performance Digest
${digest.weekStart} to ${digest.weekEnd}

EXECUTIVE SUMMARY
${digest.narrative}

KEY HIGHLIGHTS
${digest.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}

RECOMMENDATIONS
${digest.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

KEY METRICS
- Conversation Volume: ${digest.sourceCompleteness.comparisonComplete
  ? `${digest.keyMetrics.volumeChange > 0 ? '+' : ''}${digest.keyMetrics.volumeChange.toFixed(1)}%`
  : 'Not available'}
- Recorded Feedback: ${digest.sourceCompleteness.comparisonComplete
  ? `${digest.keyMetrics.satisfactionChange > 0 ? '+' : ''}${digest.keyMetrics.satisfactionChange.toFixed(1)}%`
  : 'Not available'}
- Top Repeated Question: ${digest.keyMetrics.topCategory}
- Current Source Days: ${digest.sourceCompleteness.currentDays ?? 'Not recorded'}/7
- Comparison Source Days: ${digest.sourceCompleteness.previousDays ?? 'Not recorded'}/7

Generated: ${new Date(digest.generatedAt).toLocaleString()}
    `.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-digest-${digest.weekStart}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchDigest();
  }, [session]);

  // ================================================================
  // LOADING STATE
  // ================================================================

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#8c8c8c' }}>
          Loading weekly digest...
        </div>
      </div>
    );
  }

  // ================================================================
  // EMPTY STATE
  // ================================================================

  if (!digest) {
    return (
      <Empty
        description={
          <div>
            <div style={{ marginBottom: 8 }}>No weekly digest available yet</div>
            <div style={{ fontSize: 13, color: '#8c8c8c' }}>
              Weekly digests are prepared every Sunday UTC by the Answerlattice scheduler after analytics settle.
            </div>
          </div>
        }
        style={{ marginTop: 100 }}
      >
        <Button type="primary" icon={<LuRefreshCw />} onClick={fetchDigest}>Refresh</Button>
      </Empty>
    );
  }

  // ================================================================
  // MAIN CONTENT
  // ================================================================

  const freshness = getAnswerlatticeWeeklySummaryFreshness(digest);
  const comparisonComplete = digest.sourceCompleteness.comparisonComplete;

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <LuCalendar />
              Weekly Performance Digest
            </h2>
            <div style={{ marginTop: 4, fontSize: 14, color: '#8c8c8c' }}>
              {digest.weekStart} to {digest.weekEnd}
            </div>
          </div>
          <Space>
            <Button
              icon={<LuDownload />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button type="primary" icon={<LuRefreshCw />} onClick={fetchDigest}>Refresh</Button>
          </Space>
        </div>
      </Card>

      {freshness.state !== 'current' || !digest.sourceCompleteness.currentWeekComplete ? (
        <Alert
          type="warning"
          showIcon
          message={freshness.state === 'future'
            ? 'Weekly insight timestamp is invalid'
            : freshness.state === 'stale'
              ? 'Weekly insight needs refresh'
              : 'Weekly insight uses partial source days'}
          description={digest.sourceCompleteness.currentDays === null
            ? 'Source-completeness evidence was not recorded for this stored insight.'
            : `${digest.sourceCompleteness.currentDays}/7 current-week days and ${digest.sourceCompleteness.previousDays}/7 comparison days were admitted.`}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {/* Key Metrics */}
      <Card title="Key Metrics" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <Statistic
            title="Conversation volume change"
            value={comparisonComplete ? digest.keyMetrics.volumeChange : 'Not available'}
            precision={comparisonComplete ? 1 : undefined}
            suffix={comparisonComplete ? '%' : undefined}
            prefix={comparisonComplete
              ? digest.keyMetrics.volumeChange >= 0
                ? <LuTrendingUp style={{ color: '#52c41a' }} />
                : <LuTrendingDown style={{ color: '#ff4d4f' }} />
              : undefined}
            valueStyle={comparisonComplete
              ? { color: digest.keyMetrics.volumeChange >= 0 ? '#52c41a' : '#ff4d4f' }
              : undefined}
          />
          <Statistic
            title="Recorded feedback change"
            value={comparisonComplete ? digest.keyMetrics.satisfactionChange : 'Not available'}
            precision={comparisonComplete ? 1 : undefined}
            suffix={comparisonComplete ? '%' : undefined}
            prefix={comparisonComplete
              ? digest.keyMetrics.satisfactionChange >= 0
                ? <LuTrendingUp style={{ color: '#52c41a' }} />
                : <LuTrendingDown style={{ color: '#ff4d4f' }} />
              : undefined}
            valueStyle={comparisonComplete
              ? { color: digest.keyMetrics.satisfactionChange >= 0 ? '#52c41a' : '#ff4d4f' }
              : undefined}
          />
          <div>
            <Typography.Text type="secondary">Top repeated question</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Typography.Text strong style={{ overflowWrap: 'anywhere' }}>
                {digest.keyMetrics.topCategory}
              </Typography.Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Executive Summary */}
      <Card title="Executive Summary" style={{ marginBottom: 16 }}>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {digest.narrative}
        </div>
      </Card>

      {/* Highlights & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Card title="Key Highlights">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {digest.highlights.map((highlight, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{ marginBottom: 8 }}
              >
                {highlight}
              </motion.li>
            ))}
          </ul>
        </Card>

        <Card title="Recommendations">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {digest.recommendations.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{ marginBottom: 8 }}
              >
                {rec}
              </motion.li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Footer */}
      <Card size="small">
        <div style={{ fontSize: 13, color: '#8c8c8c', textAlign: 'center' }}>
          <DateTimeDisplay value={digest.generatedAt} mode="datetime" label="Generated" /> •
          Verified analytics summary
        </div>
      </Card>
    </div>
  );
}
