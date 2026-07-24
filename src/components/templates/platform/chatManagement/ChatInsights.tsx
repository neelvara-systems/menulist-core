/**
 * Insights Dashboard Template
 * Unified Intelligence Hub for platform owners
 */

'use client';

import {
  DashboardOutlined,
  HeartOutlined,
  LineChartOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { REFRESH_INTERVALS } from '@constant/metrics';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { getAIIntelligence, getDashboardData, type AIIntelligenceData, type DashboardData, type DateRange } from '@lib/analytics/dal';
import { getLastAnalyticsUpdate } from '@database/chatAnalytics';
import { Alert, Button, Col, Divider, Row, Space, Typography } from 'antd';
import { Suspense, lazy, useState } from 'react';
import { LuAlertTriangle, LuCheckCircle, LuRefreshCw } from 'react-icons/lu';
import ChatAnalyticsProvider, { useAnalytics, useAsyncAction } from 'src/contexts/AnalyticsContext';
import useSWR from 'swr';
import {
  DateRangeSelector,
  FeedbackIntelligenceCard,
  LoadingSkeleton,
  SummarySection,
  WeeklySummaryCard,
  type MetricCardProps,
  type StatCardProps
} from '../../../analytics';

// Lazy load heavy sections for better performance
const TopicsGapsSection = lazy(() => import('../../../analytics/TopicsGapsSection'));
const FeedbackInsightsSection = lazy(() => import('../../../analytics/FeedbackInsightsSection'));

const { Title, Text } = Typography;

const getDefaultAnalyticsDateRange = (): DateRange => {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return { start, end };
};

// ================================================================
// MAIN COMPONENT (Wrapped with Context)
// ================================================================

function InsightsContent() {
  const session = useClientAuthSession();
  const { state, markRefreshed } = useAnalytics();
  const executeWithState = useAsyncAction();

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultAnalyticsDateRange);
  const analyticsScope = resolveAnswerlatticeSessionScope(session);

  // ================================================================
  // DATA FETCHING WITH SWR
  // ================================================================

  // Generate cache key for SWR
  const cacheKey = analyticsScope
    ? `dashboard-${analyticsScope.tenantId}-${analyticsScope.storeId}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`
    : null;

  // Fetch dashboard data with SWR (automatic caching & deduplication)
  const { data: dashboardData, error, mutate } = useSWR<DashboardData | null>(
    cacheKey,
    async () => {
      if (!session) return null;
      return await getDashboardData(dateRange, session);
    },
    {
      dedupingInterval: REFRESH_INTERVALS.SWR_DEDUPE,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Fetch AI intelligence data (less frequently updated)
  const { data: aiData } = useSWR<AIIntelligenceData | null>(
    analyticsScope ? `ai-${analyticsScope.tenantId}-${analyticsScope.storeId}` : null,
    async () => {
      if (!session) return null;
      return await getAIIntelligence(session);
    },
    {
      dedupingInterval: REFRESH_INTERVALS.AI_INTELLIGENCE,
      revalidateOnFocus: false,
    }
  );

  // Fetch last analytics update timestamp (for data freshness banner)
  const { data: lastUpdateTimestamp } = useSWR<Date | null>(
    analyticsScope ? `last-update-${analyticsScope.tenantId}-${analyticsScope.storeId}` : null,
    async () => {
      if (!session) return null;
      return await getLastAnalyticsUpdate(session);
    },
    {
      dedupingInterval: 60000, // Check every minute
      revalidateOnFocus: true,
    }
  );

  // Transform data for UI components
  const summaryMetrics: MetricCardProps[] = dashboardData ? [
    {
      title: 'Total Chats',
      value: dashboardData.summary.totalChats,
      suffix: '',
      trend: {
        value: dashboardData.summary.trends.chatsChange,
        isPositive: dashboardData.summary.trends.chatsChange > 0,
        label: 'vs last period'
      },
      icon: <MessageOutlined />,
    },
    {
      title: 'Positive Feedback Share',
      value: dashboardData.summary.satisfactionRate,
      suffix: '%',
      trend: {
        value: dashboardData.summary.trends.satisfactionChange,
        isPositive: dashboardData.summary.trends.satisfactionChange > 0,
        label: 'of recorded feedback'
      },
      icon: <HeartOutlined />,
    },
    {
      title: 'Avg Messages/Chat',
      value: dashboardData.summary.avgMessagesPerChat,
      suffix: '',
      icon: <MessageOutlined />,
    },
    {
      title: 'Knowledge Gaps',
      value: dashboardData.summary.knowledgeGaps,
      suffix: '',
      icon: <LineChartOutlined />,
    },
  ] : [];

  const feedbackStats: StatCardProps[] = dashboardData ? [
    {
      title: 'Positive Feedback',
      value: dashboardData.feedback.positive,
      total: dashboardData.feedback.total,
      showProgress: true,
      status: 'success',
    },
    {
      title: 'Negative Feedback',
      value: dashboardData.feedback.negative,
      total: dashboardData.feedback.total,
      showProgress: true,
      status: 'exception',
    },
  ] : [];

  // Loading state
  const isLoading = !dashboardData && !error;

  // ================================================================
  // DATA FRESHNESS TRACKING
  // ================================================================

  // Calculate data freshness from actual chatAnalytics documents (not metadata)
  // This reflects manual backfills as well as scheduled aggregations
  const lastRun = lastUpdateTimestamp;
  
  const hoursSinceLastRun = lastRun
    ? Math.floor((Date.now() - lastRun.getTime()) / 3600000)
    : null;

  const isStale = hoursSinceLastRun === null || hoursSinceLastRun > 26;

  // ================================================================
  // EVENT HANDLERS
  // ================================================================

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    // SWR will automatically refetch with new cache key
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    await executeWithState(
      async () => {
        await mutate(); // Revalidate SWR cache
        markRefreshed();
      },
      'Data refreshed successfully'
    );
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Header */}
        <Space
          style={{
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Space direction="vertical" size={4}>
            <Title level={2} style={{ margin: 0 }}>
              <DashboardOutlined style={{ marginRight: 12 }} />
              Insights Dashboard
            </Title>
            <Text type="secondary">
              Generated insights for your help center
            </Text>
          </Space>

          {/* Date Range Selector */}
          <DateRangeSelector
            value={dateRange}
            onChange={handleDateRangeChange}
            maxDays={90}
            showPresets
          />
        </Space>

        <Divider style={{ margin: '12px 0' }} />

        {/* Data Freshness Banner */}
        {(() => {
          if (dashboardData?.summary.isPartial) {
            return (
              <Alert
                type="warning"
                message="Some analytics are partial"
                description="This workspace exceeded the bounded daily analytics window. Counts shown here exclude records beyond the safety limit."
                showIcon
                icon={<LuAlertTriangle />}
              />
            );
          }

          if (isStale) {
            return (
              <Alert
                type="warning"
                message="Historical data may be outdated"
                description={`Last update: ${hoursSinceLastRun}h ago. Refresh this view to check for a newer completed summary.`}
                showIcon
                icon={<LuAlertTriangle />}
                action={
                  <Button
                    size="small"
                    onClick={handleRefresh}
                    icon={<LuRefreshCw />}
                  >
                    Refresh
                  </Button>
                }
              />
            );
          }

          // Fresh data
          if (hoursSinceLastRun !== null) {
            return (
              <Alert
                type="success"
                message={`Historical data: Updated ${hoursSinceLastRun}h ago`}
                description="Today's bounded activity is included directly; prior days use nightly summaries."
                showIcon
                icon={<LuCheckCircle />}
              />
            );
          }

          return null;
        })()}

        {/* AI Intelligence Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <WeeklySummaryCard data={aiData?.weeklySummary} loading={isLoading} />
          </Col>
          <Col xs={24} xl={12}>
            <FeedbackIntelligenceCard data={aiData?.feedbackIntelligence} loading={isLoading} />
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* Summary Section */}
        <SummarySection
          title="Overview"
          metrics={summaryMetrics}
          loading={isLoading}
          onRefresh={handleRefresh}
        />

        <Divider style={{ margin: '12px 0' }} />

        {/* Topics & Knowledge Gaps - Lazy Loaded */}
        <Suspense fallback={<LoadingSkeleton type="section" />}>
          <TopicsGapsSection
            title="Topics & Knowledge Gaps"
            topQuestionsData={dashboardData?.topQuestions || []}
            knowledgeGapsData={dashboardData?.knowledgeGaps || []}
            loading={isLoading}
            onRefresh={handleRefresh}
          />
        </Suspense>

        <Divider style={{ margin: '12px 0' }} />

        {/* Feedback Insights - Lazy Loaded */}
        <Suspense fallback={<LoadingSkeleton type="section" />}>
          <FeedbackInsightsSection
            title="Recorded Feedback"
            feedbackStats={feedbackStats}
            feedbackData={dashboardData?.feedback.recent || []}
            loading={isLoading}
            onRefresh={handleRefresh}
          />
        </Suspense>

      </Space>
    </div>
  );
}

// ================================================================
// EXPORTED COMPONENT (With Context Provider)
// ================================================================

export default function ChatInsightsTemplate() {
  return (
    <ChatAnalyticsProvider>
      <InsightsContent />
    </ChatAnalyticsProvider>
  );
}
