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
import { getAIIntelligence, getDashboardData, type AIIntelligenceData, type DashboardData, type DateRange } from '@lib/analytics/dal';
import { getLastAnalyticsUpdate } from '@database/chatAnalytics';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Button, Col, Divider, Row, Space, Spin, Typography } from 'antd';
import { Suspense, lazy, useContext, useState } from 'react';
import { LuAlertCircle, LuAlertTriangle, LuCheckCircle, LuRefreshCw } from 'react-icons/lu';
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
const SystemHealthSection = lazy(() => import('../../../analytics/SystemHealthSection'));

const { Title, Text } = Typography;

// ================================================================
// MAIN COMPONENT (Wrapped with Context)
// ================================================================

function InsightsContent() {
  const session = useClientAuthSession();
  const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
  const { state, markRefreshed } = useAnalytics();
  const executeWithState = useAsyncAction();

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date(),
  });

  // ================================================================
  // DATA FETCHING WITH SWR
  // ================================================================

  // Generate cache key for SWR
  const cacheKey = session?.sId
    ? `dashboard-${session.tId}-${session.sId}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`
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
    session?.sId ? `ai-${session.tId}-${session.sId}` : null,
    async () => {
      if (!session) return null;
      return await getAIIntelligence(session.tId.toString(), session.sId.toString());
    },
    {
      dedupingInterval: REFRESH_INTERVALS.AI_INTELLIGENCE,
      revalidateOnFocus: false,
    }
  );

  // Fetch last analytics update timestamp (for data freshness banner)
  const { data: lastUpdateTimestamp } = useSWR<Date | null>(
    session?.sId ? `last-update-${session.tId}-${session.sId}` : null,
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
      title: 'Satisfaction Rate',
      value: dashboardData.summary.satisfactionRate,
      suffix: '%',
      trend: {
        value: dashboardData.summary.trends.satisfactionChange,
        isPositive: dashboardData.summary.trends.satisfactionChange > 0,
        label: 'vs last period'
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
      trend: {
        value: -10,
        isPositive: true,
        label: 'vs last period'
      },
      icon: <LineChartOutlined />,
    },
  ] : [];

  const satisfactionStats: StatCardProps[] = dashboardData ? [
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
    {
      title: 'Response Rate',
      value: 88,
      suffix: '%',
      status: 'success',
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
  
  // Fallback to store metadata for processing status (only Cloud Function updates this)
  const analyticsMetadata = storeDetails?.chatAnalytics;
  const status = analyticsMetadata?.lastStatus;

  const hoursSinceLastRun = lastRun
    ? Math.floor((Date.now() - lastRun.getTime()) / 3600000)
    : null;

  const isStale = hoursSinceLastRun === null || hoursSinceLastRun > 26;
  const isProcessing = status === 'IN_PROGRESS';
  const hasFailed = status === 'FAILED';

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
          if (isProcessing) {
            return (
              <Alert
                type="info"
                message="Updating analytics data..."
                description="This will take 1-2 minutes. Dashboard will refresh automatically when complete."
                showIcon
                icon={<Spin size="small" />}
              />
            );
          }

          if (hasFailed) {
            return (
              <Alert
                type="error"
                message="Data update failed"
                description={analyticsMetadata?.lastError || 'Unknown error occurred during aggregation.'}
                showIcon
                icon={<LuAlertCircle />}
                action={
                  <Button
                    size="small"
                    danger
                    onClick={handleRefresh}
                    icon={<LuRefreshCw />}
                  >
                    Retry
                  </Button>
                }
              />
            );
          }

          if (isStale) {
            return (
              <Alert
                type="warning"
                message="Historical data may be outdated"
                description={`Last update: ${hoursSinceLastRun}h ago. Click refresh to update analytics data.`}
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
                description="Today's stats are always live and up-to-date."
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
            title="Feedback & Satisfaction"
            satisfactionStats={satisfactionStats}
            feedbackData={dashboardData?.feedback.recent || []}
            loading={isLoading}
            onRefresh={handleRefresh}
          />
        </Suspense>

        <Divider style={{ margin: '12px 0' }} />

        {/* System Health - Lazy Loaded */}
        <Suspense fallback={<LoadingSkeleton type="section" />}>
          <SystemHealthSection
            title="System Health"
            metrics={dashboardData?.health || []}
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
