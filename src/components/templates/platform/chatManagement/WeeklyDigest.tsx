'use client';

/**
 * Weekly Performance Digest Component
 * 
 * Displays AI-generated weekly performance summaries from Cloud Functions
 * Reads from: insights/{tId}/stores/{sId}/ai/weekly
 */

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
  type AnswerlatticeWeeklySummary,
  parseAnswerlatticeWeeklySummary,
} from '@lib/answerlattice/analyticsIntelligenceContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { Alert, Button, Card, Empty, message, Space, Spin, Statistic } from 'antd';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LuCalendar, LuDownload, LuRefreshCw, LuSparkles, LuTrendingDown, LuTrendingUp } from 'react-icons/lu';

// ================================================================
// TYPES
// ================================================================

type SentimentType = 'positive' | 'neutral' | 'concerning';
const WEEKLY_DIGEST_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const WEEKLY_DIGEST_GENERATE_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
  cache: 'no-store',
  credentials: 'same-origin',
  redirect: 'manual',
};
const WEEKLY_DIGEST_GENERATE_FAILED_MESSAGE = 'Generation failed. Please try again later';
const WEEKLY_DIGEST_LOAD_FAILED_MESSAGE = 'Failed to load weekly digest. Please try again later';
const WEEKLY_DIGEST_NO_DATA_MESSAGE = 'No analytics data found for the past week. Please run daily aggregation first.';

type WeeklyDigestNoDataResponse = {
  status: 'no_data';
  message?: string;
};

type WeeklyDigestGenerateSuccessResponse = {
  success: true;
  message?: string;
  data: {
    weekStart: string;
    weekEnd: string;
    narrativeLength: number;
    highlightsCount: number;
  };
};

type WeeklyDigestGenerateResponse = WeeklyDigestNoDataResponse | WeeklyDigestGenerateSuccessResponse;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isWeeklyDigestNoDataResponse = (value: unknown): value is WeeklyDigestNoDataResponse => (
  isRecord(value)
  && value.status === 'no_data'
  && (value.message === undefined || typeof value.message === 'string')
);

const isWeeklyDigestGenerateSuccessResponse = (
  value: unknown,
): value is WeeklyDigestGenerateSuccessResponse => (
  isRecord(value)
  && value.success === true
  && isRecord(value.data)
  && typeof value.data.weekStart === 'string'
  && typeof value.data.weekEnd === 'string'
  && isFiniteNumber(value.data.narrativeLength)
  && isFiniteNumber(value.data.highlightsCount)
);

const isWeeklyDigestGenerateResponse = (value: unknown): value is WeeklyDigestGenerateResponse => (
  isWeeklyDigestNoDataResponse(value) || isWeeklyDigestGenerateSuccessResponse(value)
);

const getWeeklyDigestResponseLogContext = (response: Response) => ({
  ...getBoundedRuntimeStringContext('responseKind', 'weekly_digest_generate'),
  responseOk: response.ok,
  responseStatus: response.status,
});

const readWeeklyDigestGenerateResponse = async (response: Response): Promise<WeeklyDigestGenerateResponse> => {
  let payload: unknown = null;
  try {
    payload = await readJsonResponseWithLimit<unknown>(response, WEEKLY_DIGEST_RESPONSE_JSON_MAX_BYTES);
  } catch (error) {
    logRuntimeFailure(
      'platform_weekly_digest_generate_response_parse_failed',
      error,
      getWeeklyDigestResponseLogContext(response),
    );
    throw new Error(WEEKLY_DIGEST_GENERATE_FAILED_MESSAGE);
  }

  if (!response.ok) {
    logRuntimeFailure(
      'platform_weekly_digest_generate_response_rejected',
      undefined,
      getWeeklyDigestResponseLogContext(response),
    );
    throw new Error(WEEKLY_DIGEST_GENERATE_FAILED_MESSAGE);
  }

  if (!isWeeklyDigestGenerateResponse(payload)) {
    logRuntimeFailure(
      'platform_weekly_digest_generate_response_invalid',
      undefined,
      getWeeklyDigestResponseLogContext(response),
    );
    throw new Error(WEEKLY_DIGEST_GENERATE_FAILED_MESSAGE);
  }

  return payload;
};

// ================================================================
// COMPONENT
// ================================================================

export default function WeeklyDigest() {
  const session = useClientAuthSession();
  const [digest, setDigest] = useState<AnswerlatticeWeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

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

  // Manual regeneration (local generation without Cloud Function)
  const handleRegenerate = async () => {
    try {
      setRegenerating(true);

      // Use local generation endpoint (no Cloud Function required)
      const response = await fetch('/api/analytics/weekly-narrative/generate-local', {
        ...WEEKLY_DIGEST_GENERATE_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await readWeeklyDigestGenerateResponse(response);

      if ('status' in result && result.status === 'no_data') {
        message.warning(WEEKLY_DIGEST_NO_DATA_MESSAGE);
        return;
      }

      message.success(digest ? 'Weekly digest refreshed.' : 'Weekly digest generated.');
      await fetchDigest();
    } catch (error) {
      logRuntimeFailure('platform_weekly_digest_generate_failed', error);
      message.error(WEEKLY_DIGEST_GENERATE_FAILED_MESSAGE);
    } finally {
      setRegenerating(false);
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
- Volume Change: ${digest.keyMetrics.volumeChange > 0 ? '+' : ''}${digest.keyMetrics.volumeChange.toFixed(1)}%
- Satisfaction Change: ${digest.keyMetrics.satisfactionChange > 0 ? '+' : ''}${digest.keyMetrics.satisfactionChange.toFixed(1)}%
- Top Category: ${digest.keyMetrics.topCategory}

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

  // Determine sentiment
  const getSentiment = (): SentimentType => {
    if (!digest) return 'neutral';

    const { volumeChange, satisfactionChange } = digest.keyMetrics;

    if (volumeChange < -10 || satisfactionChange < -5) return 'concerning';
    if (volumeChange > 5 && satisfactionChange > 2) return 'positive';
    return 'neutral';
  };

  const sentiment = digest ? getSentiment() : 'neutral';

  const sentimentConfig = {
    positive: {
      color: '#52c41a',
      label: 'Positive Performance',
      description: 'Your metrics are trending in the right direction',
    },
    neutral: {
      color: '#1890ff',
      label: 'Steady Performance',
      description: 'Metrics are stable with room for optimization',
    },
    concerning: {
      color: '#ff4d4f',
      label: 'Needs Attention',
      description: 'Some metrics require immediate review',
    },
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
              Weekly digests are automatically generated every Sunday by Cloud Functions.
              <br />
              Or you can generate one manually right now.
            </div>
          </div>
        }
        style={{ marginTop: 100 }}
      >
        <Space>
          <Button
            type="primary"
            icon={<LuSparkles />}
            onClick={handleRegenerate}
            loading={regenerating}
          >
            Generate Now
          </Button>
          <Button icon={<LuRefreshCw />} onClick={fetchDigest}>
            Refresh
          </Button>
        </Space>
      </Empty>
    );
  }

  // ================================================================
  // MAIN CONTENT
  // ================================================================

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
            <Button
              type="primary"
              icon={<LuRefreshCw />}
              onClick={handleRegenerate}
              loading={regenerating}
            >
              Regenerate
            </Button>
          </Space>
        </div>
      </Card>

      {/* Sentiment Alert */}
      <Alert
        type={sentiment === 'positive' ? 'success' : sentiment === 'concerning' ? 'warning' : 'info'}
        message={sentimentConfig[sentiment].label}
        description={sentimentConfig[sentiment].description}
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Key Metrics */}
      <Card title="Key Metrics" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <Statistic
            title="Volume Change"
            value={digest.keyMetrics.volumeChange}
            precision={1}
            suffix="%"
            prefix={digest.keyMetrics.volumeChange >= 0 ? <LuTrendingUp style={{ color: '#52c41a' }} /> : <LuTrendingDown style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: digest.keyMetrics.volumeChange >= 0 ? '#52c41a' : '#ff4d4f' }}
          />
          <Statistic
            title="Satisfaction Change"
            value={digest.keyMetrics.satisfactionChange}
            precision={1}
            suffix="%"
            prefix={digest.keyMetrics.satisfactionChange >= 0 ? <LuTrendingUp style={{ color: '#52c41a' }} /> : <LuTrendingDown style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: digest.keyMetrics.satisfactionChange >= 0 ? '#52c41a' : '#ff4d4f' }}
          />
          <Statistic
            title="Top Category"
            value={digest.keyMetrics.topCategory}
          />
        </div>
      </Card>

      {/* Executive Summary */}
      <Card title="Executive Summary" style={{ marginBottom: 16 }}>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {digest.narrative}
        </div>
      </Card>

      {/* Highlights & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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
