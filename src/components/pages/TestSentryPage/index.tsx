'use client';

import ErrorReportButton from '@/components/shared/debug/ErrorReportButton';
import { logger, trackUserAction, trackAPICall, trackBusinessEvent } from '@lib/monitoring/logger';
import { isSentryMonitoringEnabled, monitoringDsn, monitoringEnvironment, monitoringRelease } from '@lib/monitoring/sentryShared';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';
import { Button, Card, Flex, Space, Typography } from 'antd';
import { useState } from 'react';

const { Title, Text, Paragraph } = Typography;

const TEST_USER_CONTEXT = getBoundedRuntimeStringContext('testUserId', 'sentry-test-user');
const TEST_PRODUCT_CONTEXT = getBoundedRuntimeStringContext('testProductId', 'sentry-test-product');

/**
 * Sentry Testing Dashboard Component
 * 
 * Provides UI to test different Sentry log levels and error scenarios
 * - Local/QA: QA Sentry project when ENABLE_SENTRY and the scoped DSN are configured
 * - Production: Production Sentry project from the Production-scoped DSN
 * 
 * Usage: Mount under /platform/test-sentry for authenticated testing
 */
export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const clientDsnConfigured = Boolean(monitoringDsn.client);
  const serverDsnConfigured = Boolean(monitoringDsn.server);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test 1: Debug log (dev-only)
  const testDebugLog = () => {
    logger.debug('Test debug message', { testData: 'This should only appear in dev console' });
    addResult('✅ Debug log triggered (check console in dev, silent in prod)');
  };

  // Test 2: Info log
  const testInfoLog = () => {
    logger.info('Test info message', { ...TEST_USER_CONTEXT, action: 'button-click' });
    addResult('✅ Info log triggered (console in dev, Sentry breadcrumb in prod)');
  };

  // Test 3: Warning
  const testWarning = () => {
    logger.warn('Test warning message', { reason: 'This is a test warning' });
    addResult('⚠️ Warning triggered (Sentry event in prod)');
  };

  // Test 4: Error (without throwing)
  const testError = () => {
    // Track user action before error
    trackUserAction('Button Clicked', { button: 'Test Error', page: 'test-sentry' });
    
    const testError = new Error('Test error - This is intentional!');
    logger.error('Test error occurred', testError, { 
      context: 'Sentry test page',
      ...TEST_USER_CONTEXT,
    });
    addResult('❌ Error logged (should appear in Sentry dashboard in prod)');
  };

  // Test 5: Throw error (triggers error boundary)
  const testThrowError = () => {
    throw new Error('Test thrown error - This should be caught by error boundary!');
  };

  // Test 6: Async error
  const testAsyncError = async () => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test async error')), 100);
      });
    } catch (error) {
      logger.error('Async operation failed', error, { operation: 'test-async' });
      addResult('❌ Async error logged');
    }
  };

  // Test 7: API call tracking
  const testAPITracking = async () => {
    const startTime = Date.now();
    
    // Simulate successful API call
    trackAPICall('/api/products', 'GET', 200, Date.now() - startTime);
    addResult('✅ Successful API call tracked');
    
    // Simulate failed API call
    setTimeout(() => {
      trackAPICall('/api/products', 'POST', 500, 250);
      addResult('❌ Failed API call tracked');
    }, 500);
  };

  // Test 8: User action tracking
  const testUserActionTracking = () => {
    trackUserAction('Form Submitted', { form: 'contact', fields: 5 });
    trackUserAction('Product Added to Cart', { ...TEST_PRODUCT_CONTEXT, price: 29.99 });
    trackUserAction('Page Scrolled', { scrollDepth: '75%' });
    addResult('✅ User actions tracked (3 events)');
  };

  // Test 9: Business event tracking
  const testBusinessEvent = () => {
    trackBusinessEvent('Subscription Upgraded', { 
      from: 'free', 
      to: 'premium', 
      revenue: 49.99 
    });
    addResult('💼 Business event tracked');
  };

  return (
    <Flex 
      vertical 
      gap={24} 
      style={{ 
        maxWidth: 800, 
        margin: '40px auto', 
        padding: '0 20px' 
      }}
    >
      <Card>
        <Title level={2}>🧪 Sentry Testing Dashboard</Title>
        <Paragraph>
          Test your Sentry integration by triggering different types of logs.
        </Paragraph>
        <Paragraph type="secondary">
          <strong>Dev Mode:</strong> Dev Sentry project when enabled and configured, otherwise console only<br />
          <strong>Production:</strong> Logs sent to production Sentry dashboard when the production DSN is configured
        </Paragraph>
        <Paragraph type="warning" style={{ marginTop: 16 }}>
          ⚠️ <strong>Note:</strong> Make sure you&apos;re logged in to see full tenant/store context in Sentry!
        </Paragraph>
      </Card>

      <Card title="Runtime Status">
        <Space direction="vertical">
          <Text>
            <strong>Sentry enabled:</strong> {isSentryMonitoringEnabled ? 'Yes' : 'No'}
          </Text>
          <Text>
            <strong>Environment:</strong> {monitoringEnvironment}
          </Text>
          <Text>
            <strong>Release:</strong> {monitoringRelease}
          </Text>
          <Text>
            <strong>Client DSN:</strong> {clientDsnConfigured ? 'Configured' : 'Missing'}
          </Text>
          <Text>
            <strong>Server DSN:</strong> {serverDsnConfigured ? 'Configured' : 'Missing'}
          </Text>
        </Space>
      </Card>

      <Card title="📊 Test Actions">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Basic Logging:</Text>
            <Flex gap={12} wrap="wrap" style={{ marginTop: 8 }}>
              <Button type="default" onClick={testDebugLog}>
                🐛 Test Debug Log
              </Button>
              <Button type="primary" onClick={testInfoLog}>
                ℹ️ Test Info Log
              </Button>
              <Button type="default" onClick={testWarning} style={{ borderColor: '#faad14', color: '#faad14' }}>
                ⚠️ Test Warning
              </Button>
            </Flex>
          </div>

          <div>
            <Text strong>Error Testing:</Text>
            <Flex gap={12} wrap="wrap" style={{ marginTop: 8 }}>
              <Button danger onClick={testError}>
                ❌ Test Error (Logged)
              </Button>
              <Button danger type="primary" onClick={testThrowError}>
                💥 Throw Error (Error Boundary)
              </Button>
              <Button danger onClick={testAsyncError}>
                ⏱️ Test Async Error
              </Button>
            </Flex>
          </div>

          <div>
            <Text strong>Failure Screen Diagnostics:</Text>
            <Flex align="center" gap={12} wrap="wrap" style={{ marginTop: 8 }}>
              <ErrorReportButton
                error={new Error('Platform Sentry diagnostic test')}
                label="Send Diagnostic Report"
                source="platform-sentry-test"
              />
              <Text type="secondary">
                Sends the same payload used by broken-screen report buttons, including report ID, build, URL, and copy fallback.
              </Text>
            </Flex>
          </div>

          <div>
            <Text strong>Breadcrumb Tracking:</Text>
            <Flex gap={12} wrap="wrap" style={{ marginTop: 8 }}>
              <Button type="default" onClick={testAPITracking}>
                🔌 Test API Tracking
              </Button>
              <Button type="default" onClick={testUserActionTracking}>
                👤 Test User Actions
              </Button>
              <Button type="default" onClick={testBusinessEvent}>
                💼 Test Business Event
              </Button>
            </Flex>
          </div>
        </Space>
      </Card>

      <Card title="📝 Test Results" style={{ minHeight: 200 }}>
        {testResults.length === 0 ? (
          <Text type="secondary">No tests run yet. Click buttons above to test.</Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {testResults.map((result, index) => (
              <Text key={index} code style={{ display: 'block' }}>
                {result}
              </Text>
            ))}
          </Space>
        )}
        {testResults.length > 0 && (
          <Button 
            size="small" 
            style={{ marginTop: 16 }} 
            onClick={() => setTestResults([])}
          >
            Clear Results
          </Button>
        )}
      </Card>

      <Card title="✅ Verification Checklist">
        <Space direction="vertical">
          <Text><strong>In Development:</strong></Text>
          <Text>• Open browser console (F12)</Text>
          <Text>• Login to your account first</Text>
          <Text>• Click test buttons</Text>
          <Text>• Verify styled logs appear in console</Text>
          <Text>• If `ENABLE_SENTRY` and the environment-scoped DSN are configured, check the QA Sentry dashboard</Text>
          <Text>• Check for user context log after login</Text>
          <Text>• Test breadcrumb tracking (user actions, API calls)</Text>
          
          <Text strong style={{ marginTop: 16, display: 'block' }}>
            <strong>In Production:</strong>
          </Text>
          <Text>• Build: <code>npm run build &amp;&amp; npm start</code></Text>
          <Text>• Login to your account</Text>
          <Text>• Click &quot;Test Error&quot; button</Text>
          <Text>• Check Sentry dashboard</Text>
          <Text>• Error should appear within 1-2 seconds</Text>
          <Text>• Verify tenant/store context is visible</Text>
          <Text>• Check subscription plan/status in tags</Text>
          <Text>• View breadcrumbs (user actions before error)</Text>
          <Text>• Check release tracking (deployment version)</Text>
        </Space>
      </Card>

      <Card title="🔗 Sentry Dashboards">
        <Space direction="vertical">
          <Text type="secondary">
            <strong>Development Project:</strong>{' '}
            <a 
              href="https://sentry.io/organizations/test-dev-vw/projects/javascript-nextjs-dev/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Open Dev Dashboard
            </a>
          </Text>
          <Text type="secondary">
            <strong>Production Project:</strong>{' '}
            <a 
              href="https://sentry.io/organizations/test-dev-vw/projects/javascript-nextjs/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Open Prod Dashboard
            </a>
          </Text>
        </Space>
      </Card>

      <Card title="💡 What to Look For in Sentry">
        <Space direction="vertical">
          <Text type="secondary">
            <strong>📧 Email Notifications:</strong> Username shows as &quot;Your Name | Tenant Name | Store Name&quot; for instant identification!
          </Text>
          <Text type="secondary">
            <strong>User Context:</strong> Email, ID, formatted username (with tenant/store)
          </Text>
          <Text type="secondary">
            <strong>Client Context:</strong> Tenant name/ID, Store name/ID, Subscription plan/status
          </Text>
          <Text type="secondary">
            <strong>Tags (Searchable):</strong> tenant_id, store_id, user_role, subscription_plan
          </Text>
          <Text type="secondary">
            <strong>Breadcrumbs:</strong> User actions, API calls, navigation events
          </Text>
          <Text type="secondary">
            <strong>Release:</strong> Deployment version (e.g., menulist-ai@abc1234)
          </Text>
          <Text type="secondary">
            <strong>Performance:</strong> Page load times, API response times
          </Text>
        </Space>
      </Card>
    </Flex>
  );
}
