# MenuListAI Firebase Analytics - Frontend Guidelines

## Overview
This document provides guidelines for implementing the client-side components of the Firebase Analytics system in the MenuListAI platform. It covers best practices for event tracking, component integration, and dashboard development using Next.js, TypeScript, and Ant Design.

## Event Tracking Implementation

### Core Principles
1. **Non-blocking**: Analytics tracking should never block or delay the user experience
2. **Consistent**: Use standardized event naming and parameters
3. **Minimal**: Only track what's necessary for business insights
4. **Efficient**: Minimize network requests and client-side processing
5. **Privacy-compliant**: Respect user privacy and data regulations

### Session Management

#### Session ID Generation
```typescript
// src/lib/analytics/session.ts
import { v4 as uuidv4 } from 'uuid';

export const getSessionId = (): string => {
  // Check for existing session ID in sessionStorage
  let sessionId = typeof window !== 'undefined' 
    ? window.sessionStorage.getItem('menulist_session_id') 
    : null;
  
  // If no session ID exists, create and store a new one
  if (!sessionId) {
    sessionId = uuidv4();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('menulist_session_id', sessionId);
    }
  }
  
  return sessionId;
};
```

#### Usage in Components
```typescript
// Example usage in a component
import { useEffect } from 'react';
import { getSessionId } from '@/lib/analytics/session';
import { trackEvent } from '@/lib/analytics/client';

const MenuPage = ({ storeId, tenantId }) => {
  useEffect(() => {
    // Track page view once on component mount
    const sessionId = getSessionId();
    trackEvent('menuView', { storeId, tenantId, sessionId });
  }, [storeId, tenantId]);
  
  // Rest of component...
};
```

### Event Tracking Client

#### Event Types Definition
```typescript
// src/lib/analytics/types.ts
export type AnalyticsEventType = 'menuView' | 'itemClick';

export interface BaseEventData {
  storeId: string;
  tenantId: string;
  sessionId: string;
}

export interface MenuViewEventData extends BaseEventData {
  // Any additional menu view specific data
}

export interface ItemClickEventData extends BaseEventData {
  menuItemId: string;
  menuItemName?: string;
}

export type EventData = MenuViewEventData | ItemClickEventData;
```

#### Tracking Function
```typescript
// src/lib/analytics/client.ts
import UAParser from 'ua-parser-js';
import { AnalyticsEventType, EventData } from './types';

// Get device information from user agent
const getDeviceInfo = () => {
  if (typeof window === 'undefined') return { type: 'unknown' };
  
  const parser = new UAParser(window.navigator.userAgent);
  const result = parser.getResult();
  
  return {
    type: result.device.type || 'desktop', // Default to desktop if undefined
    browser: result.browser.name || 'unknown',
    os: result.os.name || 'unknown'
  };
};

// Main tracking function
export const trackEvent = async (
  eventType: AnalyticsEventType, 
  data: EventData
): Promise<void> => {
  try {
    // Get device info
    const deviceInfo = getDeviceInfo();
    
    // Prepare payload
    const payload = {
      eventType,
      ...data,
      deviceInfo,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
    };
    
    // Send to API endpoint (non-blocking)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Use keepalive to ensure the request completes even if page unloads
      keepalive: true
    }).catch(error => {
      // Silent fail - don't disrupt user experience
      console.error('Analytics tracking error:', error);
    });
  } catch (error) {
    // Catch any errors to prevent affecting the main application
    console.error('Failed to track event:', error);
  }
};
```

### Integration with Menu Components

#### Menu View Tracking
```typescript
// src/components/templates/website/clientWebsite/index.tsx
import { useEffect } from 'react';
import { getSessionId } from '@/lib/analytics/session';
import { trackEvent } from '@/lib/analytics/client';

export const ClientMenuRenderer: React.FC<{
  storeId: string;
  tenantId: string;
  // other props...
}> = ({ storeId, tenantId, ...props }) => {
  useEffect(() => {
    // Track menu view once when component mounts
    const sessionId = getSessionId();
    trackEvent('menuView', { storeId, tenantId, sessionId });
  }, [storeId, tenantId]);
  
  return (
    <div className="menu-container">
      {/* Menu rendering logic */}
    </div>
  );
};
```

#### Menu Item Click Tracking
```typescript
// src/components/templates/website/clientWebsite/MenuItem.tsx
import { getSessionId } from '@/lib/analytics/session';
import { trackEvent } from '@/lib/analytics/client';

export const MenuItem: React.FC<{
  item: {
    id: string;
    name: string;
    // other item properties...
  };
  storeId: string;
  tenantId: string;
  // other props...
}> = ({ item, storeId, tenantId, ...props }) => {
  
  const handleItemClick = () => {
    // Track item click
    const sessionId = getSessionId();
    trackEvent('itemClick', {
      storeId,
      tenantId,
      sessionId,
      menuItemId: item.id,
      menuItemName: item.name
    });
    
    // Continue with normal click handling
    // e.g., navigate to item detail, open modal, etc.
  };
  
  return (
    <div className="menu-item" onClick={handleItemClick}>
      {/* Item rendering logic */}
    </div>
  );
};
```

## Dashboard Implementation

### Dashboard Architecture
The analytics dashboard follows a modular component structure:

```
AnalyticsDashboard
├── DateRangePicker
├── OverallMetrics
├── TrendCharts
├── TopItemsSection
├── DeviceBreakdown
└── LocationInsights
```

### Data Fetching Pattern

#### Custom Hook for Analytics Data
```typescript
// src/hooks/useAnalyticsData.ts
import { useState, useEffect } from 'react';
import { firebase } from '@/lib/firebase';

export interface AnalyticsDateRange {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
}

export interface AnalyticsData {
  summary: any;   // Summary document data
  daily: any[];   // Array of daily documents
  loading: boolean;
  error: Error | null;
}

export const useAnalyticsData = (
  tenantId: string,
  storeId: string,
  dateRange: AnalyticsDateRange
): AnalyticsData => {
  const [data, setData] = useState<AnalyticsData>({
    summary: null,
    daily: [],
    loading: true,
    error: null
  });
  
  useEffect(() => {
    const fetchData = async () => {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        // Fetch summary data
        const summaryDoc = await firebase.firestore()
          .collection('tenants')
          .doc(tenantId)
          .collection('stores')
          .doc(storeId)
          .collection('analyticsOverall')
          .doc('summary')
          .get();
        
        // Fetch daily data for date range
        const dailyDocs = await firebase.firestore()
          .collection('tenants')
          .doc(tenantId)
          .collection('stores')
          .doc(storeId)
          .collection('dailyAnalytics')
          .where(firebase.firestore.FieldPath.documentId(), '>=', dateRange.start)
          .where(firebase.firestore.FieldPath.documentId(), '<=', dateRange.end)
          .orderBy(firebase.firestore.FieldPath.documentId())
          .get();
        
        const dailyData = dailyDocs.docs.map(doc => ({
          date: doc.id,
          ...doc.data()
        }));
        
        setData({
          summary: summaryDoc.exists ? summaryDoc.data() : null,
          daily: dailyData,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error')
        }));
      }
    };
    
    fetchData();
  }, [tenantId, storeId, dateRange.start, dateRange.end]);
  
  return data;
};
```

### Main Dashboard Component
```typescript
// src/components/templates/analytics/AnalyticsDashboard.tsx
import { useState } from 'react';
import { Card, Row, Col, Spin, Alert, Tabs } from 'antd';
import { useAnalyticsData, AnalyticsDateRange } from '@/hooks/useAnalyticsData';
import { DateRangePicker } from './DateRangePicker';
import { OverallMetrics } from './OverallMetrics';
import { TrendCharts } from './TrendCharts';
import { TopItemsSection } from './TopItemsSection';
import { DeviceBreakdown } from './DeviceBreakdown';
import { LocationInsights } from './LocationInsights';

interface AnalyticsDashboardProps {
  tenantId: string;
  storeId: string;
  hasGoogleAnalytics?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  tenantId,
  storeId,
  hasGoogleAnalytics = false
}) => {
  // Get current date and 30 days ago for default range
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    start: formatDate(thirtyDaysAgo),
    end: formatDate(today)
  });
  
  const [activeTab, setActiveTab] = useState('firebase');
  
  // Fetch data using our custom hook
  const { summary, daily, loading, error } = useAnalyticsData(
    tenantId,
    storeId,
    dateRange
  );
  
  // Handle date range changes
  const handleDateRangeChange = (newRange: AnalyticsDateRange) => {
    setDateRange(newRange);
  };
  
  // Render tabs if Google Analytics is also available
  const renderTabs = () => {
    if (!hasGoogleAnalytics) return null;
    
    return (
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'firebase',
            label: 'MenuList Analytics',
          },
          {
            key: 'google',
            label: 'Google Analytics',
          }
        ]}
      />
    );
  };
  
  return (
    <div className="analytics-dashboard">
      {renderTabs()}
      
      <Card className="date-range-card">
        <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
      </Card>
      
      {error && (
        <Alert
          message="Error loading analytics data"
          description={error.message}
          type="error"
          showIcon
        />
      )}
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>Loading analytics data...</p>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <OverallMetrics
              summary={summary}
              daily={daily}
              dateRange={dateRange}
            />
          </Col>
          
          <Col span={24}>
            <TrendCharts
              daily={daily}
              dateRange={dateRange}
            />
          </Col>
          
          <Col xs={24} lg={12}>
            <TopItemsSection
              summary={summary}
              daily={daily}
              dateRange={dateRange}
            />
          </Col>
          
          <Col xs={24} lg={12}>
            <DeviceBreakdown
              daily={daily}
              dateRange={dateRange}
            />
          </Col>
          
          <Col span={24}>
            <LocationInsights
              daily={daily}
              dateRange={dateRange}
            />
          </Col>
        </Row>
      )}
    </div>
  );
};
```

### Visualization Components

#### Overall Metrics Component
```typescript
// src/components/templates/analytics/OverallMetrics.tsx
import { Card, Row, Col, Statistic } from 'antd';
import { EyeOutlined, MouseOutlined, PercentageOutlined } from '@ant-design/icons';

interface OverallMetricsProps {
  summary: any;
  daily: any[];
  dateRange: { start: string; end: string };
}

export const OverallMetrics: React.FC<OverallMetricsProps> = ({
  summary,
  daily,
  dateRange
}) => {
  // Calculate totals from daily data
  const totalViews = daily.reduce((sum, day) => sum + (day.totalViews || 0), 0);
  const totalClicks = daily.reduce((sum, day) => sum + (day.totalClicks || 0), 0);
  
  // Calculate CTR (Click-Through Rate)
  const ctr = totalViews > 0 
    ? ((totalClicks / totalViews) * 100).toFixed(2) 
    : '0.00';
  
  // Get lifetime totals from summary
  const lifetimeTotalViews = summary?.lifetimeTotalViews || 0;
  const lifetimeTotalClicks = summary?.lifetimeTotalClicks || 0;
  
  return (
    <Card title="Overall Performance">
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="Total Views (Selected Period)"
            value={totalViews}
            prefix={<EyeOutlined />}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="Total Clicks (Selected Period)"
            value={totalClicks}
            prefix={<MouseOutlined />}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="Click-Through Rate"
            value={ctr}
            suffix="%"
            prefix={<PercentageOutlined />}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="Lifetime Total Views"
            value={lifetimeTotalViews}
            prefix={<EyeOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );
};
```

#### Trend Charts Component
```typescript
// src/components/templates/analytics/TrendCharts.tsx
import { Card, Tabs } from 'antd';
import { Line } from '@ant-design/plots';

interface TrendChartsProps {
  daily: any[];
  dateRange: { start: string; end: string };
}

export const TrendCharts: React.FC<TrendChartsProps> = ({
  daily,
  dateRange
}) => {
  // Prepare data for charts
  const viewsData = daily.map(day => ({
    date: day.date,
    value: day.totalViews || 0,
    type: 'Views'
  }));
  
  const clicksData = daily.map(day => ({
    date: day.date,
    value: day.totalClicks || 0,
    type: 'Clicks'
  }));
  
  // Combined data for multi-series chart
  const combinedData = [...viewsData, ...clicksData];
  
  // Line chart configuration
  const config = {
    data: combinedData,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    point: {
      size: 5,
      shape: 'diamond',
    },
  };
  
  return (
    <Card title="Performance Trends">
      <Tabs
        defaultActiveKey="combined"
        items={[
          {
            key: 'combined',
            label: 'Views & Clicks',
            children: <Line {...config} height={300} />
          },
          {
            key: 'views',
            label: 'Views Only',
            children: (
              <Line 
                {...config} 
                data={viewsData} 
                height={300}
                seriesField={undefined}
                color="#1890ff"
              />
            )
          },
          {
            key: 'clicks',
            label: 'Clicks Only',
            children: (
              <Line 
                {...config} 
                data={clicksData} 
                height={300}
                seriesField={undefined}
                color="#52c41a"
              />
            )
          }
        ]}
      />
    </Card>
  );
};
```

#### Top Items Component
```typescript
// src/components/templates/analytics/TopItemsSection.tsx
import { Card, Table, Tabs } from 'antd';
import { Column } from '@ant-design/plots';

interface TopItemsSectionProps {
  summary: any;
  daily: any[];
  dateRange: { start: string; end: string };
}

export const TopItemsSection: React.FC<TopItemsSectionProps> = ({
  summary,
  daily,
  dateRange
}) => {
  // Get top items from summary (all time)
  const allTimeTopItems = summary?.topItems || [];
  
  // Calculate top items for selected period
  const periodTopItems = calculatePeriodTopItems(daily);
  
  // Table columns
  const columns = [
    {
      title: 'Item',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Clicks',
      dataIndex: 'totalClicks',
      key: 'totalClicks',
      sorter: (a, b) => a.totalClicks - b.totalClicks,
      defaultSortOrder: 'descend',
    }
  ];
  
  // Prepare data for bar chart
  const chartData = periodTopItems.slice(0, 10).map(item => ({
    item: item.name,
    clicks: item.totalClicks
  }));
  
  // Bar chart configuration
  const config = {
    data: chartData,
    xField: 'clicks',
    yField: 'item',
    seriesField: 'item',
    legend: false,
    meta: {
      item: {
        alias: 'Menu Item',
      },
      clicks: {
        alias: 'Total Clicks',
      },
    },
  };
  
  return (
    <Card title="Top Menu Items">
      <Tabs
        defaultActiveKey="period"
        items={[
          {
            key: 'period',
            label: 'Selected Period',
            children: (
              <>
                <Column {...config} height={300} />
                <Table 
                  dataSource={periodTopItems.slice(0, 20)} 
                  columns={columns}
                  rowKey="menuItemId"
                  pagination={false}
                  size="small"
                />
              </>
            )
          },
          {
            key: 'allTime',
            label: 'All Time',
            children: (
              <Table 
                dataSource={allTimeTopItems} 
                columns={columns}
                rowKey="menuItemId"
                pagination={{ pageSize: 10 }}
              />
            )
          }
        ]}
      />
    </Card>
  );
};

// Helper function to calculate top items for selected period
function calculatePeriodTopItems(daily) {
  const itemClicks = {};
  const itemNames = {};
  
  // Aggregate clicks by item across all days
  daily.forEach(day => {
    if (day.clicksByItem) {
      Object.entries(day.clicksByItem).forEach(([itemId, clicks]) => {
        itemClicks[itemId] = (itemClicks[itemId] || 0) + Number(clicks);
        
        // Store item name if available
        if (day.itemNames && day.itemNames[itemId]) {
          itemNames[itemId] = day.itemNames[itemId];
        }
      });
    }
  });
  
  // Convert to array and sort
  return Object.entries(itemClicks)
    .map(([menuItemId, totalClicks]) => ({
      menuItemId,
      name: itemNames[menuItemId] || menuItemId,
      totalClicks
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks);
}
```

## Best Practices

### Performance Optimization
1. **Lazy Loading**: Load analytics components only when needed
   ```typescript
   import dynamic from 'next/dynamic';
   
   const AnalyticsDashboard = dynamic(
     () => import('@/components/templates/analytics/AnalyticsDashboard'),
     { loading: () => <p>Loading dashboard...</p> }
   );
   ```

2. **Memoization**: Use React.memo and useMemo for expensive calculations
   ```typescript
   // Memoize component
   export const DeviceBreakdown = React.memo(({ daily }) => {
     // Component logic
   });
   
   // Memoize calculations
   const topItems = useMemo(() => {
     return calculateTopItems(daily);
   }, [daily]);
   ```

3. **Debounced Tracking**: Prevent excessive tracking calls
   ```typescript
   import { debounce } from 'lodash';
   
   // Create debounced tracking function
   const debouncedTrackEvent = debounce(trackEvent, 300);
   ```

### Error Handling
1. **Silent Failures**: Analytics errors should not affect the user experience
   ```typescript
   try {
     await trackEvent('menuView', data);
   } catch (error) {
     // Log error but don't show to user
     console.error('Analytics error:', error);
   }
   ```

2. **Fallback UI**: Provide fallback UI for dashboard components
   ```typescript
   {error ? (
     <Card>
       <Empty description="Unable to load analytics data" />
       <Button onClick={retry}>Retry</Button>
     </Card>
   ) : (
     <TrendCharts data={data} />
   )}
   ```

### Accessibility
1. **Screen Reader Support**: Ensure charts have proper ARIA labels
   ```typescript
   <div 
     role="img" 
     aria-label="Chart showing menu views over time from April 1 to April 30"
   >
     <Line {...config} />
   </div>
   ```

2. **Keyboard Navigation**: Ensure dashboard is navigable via keyboard
   ```typescript
   <button 
     onClick={handleDateChange} 
     onKeyDown={(e) => e.key === 'Enter' && handleDateChange()}
     tabIndex={0}
   >
     Select Date Range
   </button>
   ```

### Testing
1. **Unit Tests**: Test tracking functions in isolation
   ```typescript
   // __tests__/analytics/client.test.ts
   describe('trackEvent', () => {
     beforeEach(() => {
       global.fetch = jest.fn();
     });
     
     it('should send event data to tracking endpoint', async () => {
       await trackEvent('menuView', { storeId: '123', tenantId: '456', sessionId: 'abc' });
       
       expect(global.fetch).toHaveBeenCalledWith(
         '/api/analytics/track',
         expect.objectContaining({
           method: 'POST',
           body: expect.stringContaining('menuView')
         })
       );
     });
   });
   ```

2. **Component Tests**: Test dashboard components with mock data
   ```typescript
   // __tests__/components/analytics/OverallMetrics.test.tsx
   import { render, screen } from '@testing-library/react';
   import { OverallMetrics } from '@/components/templates/analytics/OverallMetrics';
   
   describe('OverallMetrics', () => {
     it('should display correct totals', () => {
       const mockData = {
         summary: { lifetimeTotalViews: 1000 },
         daily: [{ totalViews: 50, totalClicks: 20 }],
         dateRange: { start: '2025-04-01', end: '2025-04-30' }
       };
       
       render(<OverallMetrics {...mockData} />);
       
       expect(screen.getByText('50')).toBeInTheDocument();
       expect(screen.getByText('20')).toBeInTheDocument();
       expect(screen.getByText('1000')).toBeInTheDocument();
     });
   });
   ```

## Integration Checklist

### Event Tracking Implementation
- [ ] Add session management to client website
- [ ] Implement menu view tracking in ClientMenuRenderer
- [ ] Add item click tracking to menu item components
- [ ] Test tracking with browser developer tools

### Dashboard Implementation
- [ ] Create analytics tab in store settings
- [ ] Implement date range selection
- [ ] Add all visualization components
- [ ] Test with sample data
- [ ] Optimize for performance

### Testing & Validation
- [ ] Verify events are being tracked correctly
- [ ] Confirm data appears in Firestore
- [ ] Test dashboard with various date ranges
- [ ] Validate calculations and aggregations
- [ ] Check responsive behavior on mobile devices
