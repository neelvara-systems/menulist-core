'use client';

/**
 * Weekly Performance Digest Component
 * 
 * Displays AI-generated weekly performance summaries from Cloud Functions
 * Reads from: insights/{tId}/stores/{sId}/ai/weekly
 */

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { Alert, Button, Card, Empty, message, Space, Spin, Statistic } from 'antd';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LuCalendar, LuDownload, LuRefreshCw, LuSparkles, LuTrendingDown, LuTrendingUp } from 'react-icons/lu';

// ================================================================
// TYPES
// ================================================================

interface WeeklyNarrative {
  tId: string;
  sId: string;
  weekStart: string;
  weekEnd: string;
  narrative: string;
  highlights: string[];
  recommendations: string[];
  keyMetrics: {
    volumeChange: number;
    satisfactionChange: number;
    topCategory: string;
  };
  generatedAt: Timestamp;
  promptVersion: string;
}

type SentimentType = 'positive' | 'neutral' | 'concerning';

// ================================================================
// COMPONENT
// ================================================================

export default function WeeklyDigest() {
  const session = useClientAuthSession();
  const [digest, setDigest] = useState<WeeklyNarrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // Fetch digest from Firestore
  const fetchDigest = async () => {
    if (!session?.tId || !session?.sId) return;

    try {
      setLoading(true);

      const digestRef = doc(
        firebaseClient,
        'insights',
        String(session.tId),
        'stores',
        String(session.sId),
        'ai',
        'weekly'
      );

      const digestDoc = await getDoc(digestRef);

      if (digestDoc.exists()) {
        setDigest(digestDoc.data() as WeeklyNarrative);
      } else {
        setDigest(null);
      }
    } catch (error) {
      message.error('Failed to load weekly digest. Please try again later');
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Generation failed');
      }

      const result = await response.json();

      if (result.data?.status === 'no_data') {
        message.warning('No analytics data found for the past week. Please run daily aggregation first.');
        return;
      }

      message.success(digest ? 'Regenerating weekly digest...' : 'Generating weekly digest...');

      // Wait a bit for Cloud Function to complete
      setTimeout(fetchDigest, 5000);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Generation failed. Please try again later');
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

Generated: ${digest.generatedAt.toDate().toLocaleString()}
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
          AI Powered by Gemini 2.5 Flash •
          Version {digest.promptVersion}
        </div>
      </Card>
    </div>
  );
}
