# Google Analytics Implementation

This document outlines the implementation of Google Analytics (GA4) in the MenuListAI platform.

## Overview

The analytics implementation consists of two main parts:
1. Data Collection (Client Website)
2. Data Visualization (Dashboard)

## Client Website Components

### Base Analytics (`GoogleAnalytics.tsx`)
```typescript
interface GoogleAnalyticsProps {
    storeDetails?: StoreDataType;
}
```
- Initializes GA4 with store's measurement ID
- Loads gtag.js script with 'afterInteractive' strategy
- Provides utility functions:
  ```typescript
  trackPageView(url: string)
  trackEvent(action: string, category: string, label: string, value?: number)
  ```

### Store Configuration
```typescript
analytics: {
    googleAnalyticsId: string;      // GA4 Measurement ID
    googleSearchConsole?: string;    // Search Console verification ID
    facebookPixelId?: string;       // Facebook Pixel ID
    enhancedEcommerce?: boolean;    // Enable enhanced ecommerce
    trackMenuViews?: boolean;       // Track menu item views
    trackLocation?: boolean;        // Track user location
    dashboardPreferences?: {        // User dashboard settings
        dateRange?: string;         // Default date range
    };
}
```

## Dashboard Components

### Quick Stats (`QuickStats.tsx`)
```typescript
interface QuickStatsProps {
    propertyId: string;
    dateRange: { startDate: string; endDate: string; };
}
```
Displays:
- Active users (real-time)
- Total visitors
- Total orders
- Total revenue

### Trend Analysis (`TrendAnalysis.tsx`)
```typescript
interface TrendAnalysisProps {
    propertyId: string;
    dateRange: { startDate: string; endDate: string; };
}
```
Charts using @ant-design/plots:
- Visitors over time
- Page views over time
- Revenue over time

### Location Insights (`LocationInsights.tsx`)
```typescript
interface LocationInsightsProps {
    propertyId: string;
    dateRange: { startDate: string; endDate: string; };
}

interface LocationData {
    country: string;
    city: string;
    visitors: number;
    views: number;
    revenue: number;
    percentage: number;
}
```

### Menu Performance (`MenuPerformance.tsx`)
```typescript
interface MenuPerformanceProps {
    propertyId: string;
    dateRange: { startDate: string; endDate: string; };
}

interface MenuItem {
    name: string;
    category: string;
    views: number;
    revenue: number;
    orders: number;
}
```

### Date Range Selector (`DateRangeSelector.tsx`)
```typescript
interface DateRangeSelectorProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}
```
Preset ranges:
- Today
- Last 7 Days
- Last 30 Days
- Last 90 Days
- Custom date range

## API Routes

### Real-time Data
```typescript
GET /api/analytics/realtime?propertyId={GA4_ID}
// Returns: active users, current page views
```

### Historical Reports
```typescript
GET /api/analytics/reports?propertyId={GA4_ID}&startDate={START}&endDate={END}
// Returns: visitors, page views, orders, revenue by date
```

### Location Data
```typescript
GET /api/analytics/locations?propertyId={GA4_ID}&startDate={START}&endDate={END}
// Returns: visitors, views, revenue by country and city
```

### Menu Performance
```typescript
GET /api/analytics/menu?propertyId={GA4_ID}&startDate={START}&endDate={END}
// Returns: views, orders, revenue by menu item and category
```

## Data Flow

1. **Collection Layer**
   - Client website components track user interactions
   - Events are sent to GA4 using gtag.js
   - Enhanced events (menu views, orders) include custom dimensions

2. **Storage Layer**
   - Data is stored in GA4's data warehouse
   - Historical data available for up to 14 months
   - Real-time data has ~1 minute delay

3. **API Layer**
   - Dashboard components fetch data via Next.js API routes
   - API routes use GA4 Data API with service account
   - Rate limiting and caching implemented

4. **Visualization Layer**
   - Components receive processed data
   - Charts and tables render insights
   - Real-time updates for active metrics

## API Routes

### `/api/analytics/realtime`
```typescript
// Fetches current active users and page views
GET /api/analytics/realtime?propertyId={GA4_ID}
```

### `/api/analytics/reports`
```typescript
// Fetches historical metrics for date range
GET /api/analytics/reports?propertyId={GA4_ID}&startDate={START}&endDate={END}
```

### `/api/analytics/locations`
```typescript
// Fetches visitor location data
GET /api/analytics/locations?propertyId={GA4_ID}&startDate={START}&endDate={END}
```

### `/api/analytics/menu`
```typescript
// Fetches menu item performance
GET /api/analytics/menu?propertyId={GA4_ID}&startDate={START}&endDate={END}
```

## Features

### Data Collection
1. **Automatic Initialization**
   - Loads GA script with proper timing (after interactive)
   - Configures GA4 with the store's measurement ID
   - Initializes enhanced ecommerce if enabled

2. **Event Tracking**
   - Page views and navigation
   - Menu item views and interactions
   - Order transactions and revenue
   - User location data (if enabled)

### Data Visualization
1. **Real-time Stats**
   - Active users count
   - Current page views
   - Live order tracking

2. **Historical Analytics**
   - Visitor trends over time
   - Revenue and order analytics
   - Geographic distribution
   - Menu item performance

3. **Analytics Dashboard Components**
   - `QuickStats`: Real-time users, total visitors, orders, revenue
   - `TrendAnalysis`: Visitor trends, page views, revenue (using @ant-design/plots)
   - `LocationInsights`: Visitor location data
   - `MenuPerformance`: Menu item views, orders, revenue tracking

4. **Environment Configuration**
```bash
# Required Environment Variables (.env.local)
GA_PROJECT_ID="properties/412846872"  # Your GA4 property ID
GA_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GA_PRIVATE_KEY="your-private-key"
GA_ID_TEST="G-8QJNFHDGNL"  # Test measurement ID
```

5. **API Endpoints**
```typescript
// Get analytics data
GET /api/analytics/reports?propertyId=412846872

// Optional parameters
&startDate=7daysAgo  // Default
&endDate=today       // Default
```

6. **Event Tracking Utilities**
```typescript
// Client-side tracking
import { trackPageView, trackEvent } from '@lib/analytics';

// Page view tracking
trackPageView('/menu');

// Custom event tracking
trackEvent('view_item', 'menu', 'Burger Classic', 12.99);
```

7. **Required Permissions**
- Google Cloud Console:
  - BigQuery Data Viewer
  - Analytics Viewer
- GA4 Property:
  - Service account needs Viewer access
  - Enable Google Analytics Data API

### Tracking Custom Events
```typescript
import { trackEvent } from './GoogleAnalytics';

// Track a menu item view
trackEvent('view_item', 'menu', 'burger', 1);

// Track a category view
trackEvent('view_category', 'menu', 'main_course');
```

## Testing Setup

1. **Development Environment**
   - Local: http://localhost:3000
   - Test Routes:
     - /dashboard (analytics dashboard)
     - /business-settings (GA4 configuration)
     - /menu/[projectId] (menu view tracking)

2. **Test GA4 Property**
   - Measurement ID: G-8QJNFHDGNL (currently hardcoded for testing)
   - Property ID: properties/412846872

3. **Test Data Flow**
   ```typescript
   // 1. Client-side tracking (GoogleAnalytics.tsx)
   window.gtag('config', 'G-8QJNFHDGNL', {
     page_path: '/menu'
   });

   // 2. Server-side data retrieval
   const response = await fetch('/api/analytics/reports?propertyId=412846872');
   const data = await response.json();
   // {
   //   report: { rows: [...] },     // Historical data
   //   realtime: { rows: [...] }    // Real-time data
   // }
   ```

4. **Test Metrics**
   - Page Views
   - Active Users
   - Menu Item Views
   - Orders
   - Revenue

> Note: The GA4 Measurement ID is temporarily hardcoded for testing. For production:
> 1. Remove hardcoded GA4 ID
> 2. Restore dynamic GA4 ID from store settings
> 3. Implement proper validation
> 4. Add proper error handling

## Best Practices

1. **Event Naming**
   - Use consistent event names across the application
   - Follow GA4 recommended event names when possible
   - Use clear and descriptive category and label names

2. **Performance**
   - The script is loaded with `strategy="afterInteractive"` to optimize page load
   - GA is only initialized if a valid GA ID is present

3. **Error Handling**
   - The component safely handles missing GA IDs
   - Tracking functions check for GA availability before execution

## Debugging

1. Check if GA is properly initialized:
   ```javascript
   // In browser console
   window.dataLayer  // Should be an array
   window.gtag      // Should be a function
   ```

2. Use Google Analytics Debug View to verify events are being received

## Related Components

- `AnalyticsTab.tsx`: Business settings component for configuring GA ID
- `ClientMenuRenderer`: Root component that integrates GA tracking
