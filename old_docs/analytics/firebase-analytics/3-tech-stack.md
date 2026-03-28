# MenuListAI Firebase Analytics - Tech Stack Documentation

## Overview
This document outlines the technology stack used for implementing the Firebase Analytics system in the MenuListAI platform. It details the frameworks, libraries, and services used for event tracking, data storage, processing, and visualization.

## Core Technologies

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.5 | React framework for the application |
| React | 18.3.1 | UI library for building components |
| TypeScript | 5.x | Type-safe JavaScript superset |
| Ant Design | 5.20.2 | UI component library for dashboard |
| @ant-design/plots | 1.2.5 | Data visualization components |
| Framer Motion | 10.16.4 | Animation library for UI transitions |
| Redux Toolkit | 1.9.7 | State management for dashboard |
| Redux Persist | 6.0.0 | Persistence layer for Redux state |
| UUID | 9.0.0 | Generation of unique session IDs |
| UAParser.js | 1.0.35 | User-agent parsing for device detection |

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Firebase | 10.5.0 | Backend-as-a-Service platform |
| Firestore | - | NoSQL database for analytics data |
| Firebase Admin SDK | 11.x | Server-side Firebase operations |
| Firebase Cloud Functions | - | Scheduled tasks and data processing |
| Next.js API Routes | - | Server-side endpoints for event tracking |
| Node.js | 18.x | JavaScript runtime for server functions |

### Analytics & Data Processing
| Technology | Purpose |
|------------|---------|
| IP-API | Geolocation service for IP addresses |
| Firestore Transactions | Atomic updates for analytics counters |
| Firestore Batch Operations | Efficient bulk updates |
| Firestore Aggregation | Server-side data aggregation |

## Architecture Components

### 1. Event Tracking Module
```
├── src/
│   ├── lib/
│   │   ├── analytics/
│   │   │   ├── client.ts         # Client-side tracking functions
│   │   │   ├── session.ts        # Session management utilities
│   │   │   ├── types.ts          # TypeScript interfaces for analytics
│   │   │   └── constants.ts      # Event types and configuration
```

The Event Tracking Module is responsible for:
- Capturing user interactions on the client side
- Managing session identifiers
- Sending events to the API endpoints
- Handling retry logic and error cases

### 2. Analytics API Module
```
├── src/
│   ├── pages/api/analytics/      # Next.js API Routes
│   │   ├── track.ts              # Event tracking endpoint
│   │   ├── reports.ts            # Data retrieval endpoint
│   │   └── utils/
│   │       ├── geo.ts            # IP geolocation utilities
│   │       ├── device.ts         # User-agent parsing utilities
│   │       └── firestore.ts      # Firestore helper functions
```

The Analytics API Module is responsible for:
- Receiving tracking events from clients
- Enriching events with server-side data (location)
- Validating and processing incoming data
- Updating Firestore with aggregated metrics
- Providing endpoints for dashboard data retrieval

### 3. Firestore Data Structure
```
tenants/
├── {tenantId}/
│   ├── stores/
│   │   ├── {storeId}/
│   │   │   ├── dailyAnalytics/
│   │   │   │   ├── 2025-04-01    # Daily document
│   │   │   │   ├── 2025-04-02
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── analyticsOverall/
│   │   │       └── summary       # Summary document
```

Each daily document (`2025-04-01`) contains:
```typescript
interface DailyAnalytics {
  // Core metrics
  totalViews: number;
  totalClicks: number;
  
  // Device breakdowns
  viewsByDevice: {
    mobile: number;
    desktop: number;
    tablet: number;
    unknown: number;
  };
  clicksByDevice: {
    mobile: number;
    desktop: number;
    tablet: number;
    unknown: number;
  };
  
  // Location breakdowns
  viewsByLocation: {
    [locationKey: string]: number;  // e.g., "US_NewYork": 5
  };
  clicksByLocation: {
    [locationKey: string]: number;
  };
  
  // Item breakdowns
  clicksByItem: {
    [menuItemId: string]: number;  // e.g., "item_123": 10
  };
  itemNames: {
    [menuItemId: string]: string;  // e.g., "item_123": "Margherita Pizza"
  };
  
  // Hourly breakdowns
  hourlyViews: {
    "00": number;
    "01": number;
    // ... through "23"
  };
  hourlyClicks: {
    "00": number;
    "01": number;
    // ... through "23"
  };
  
  // Metadata
  date: Timestamp;  // Start of day
  lastUpdated: Timestamp;
}
```

The summary document contains:
```typescript
interface AnalyticsSummary {
  // Lifetime totals
  lifetimeTotalViews: number;
  lifetimeTotalClicks: number;
  
  // Top items (limited to prevent document size issues)
  topItems: Array<{
    menuItemId: string;
    name: string;
    totalClicks: number;
    lastClicked: string;  // ISO date string
  }>;
  
  // Rolling periods
  last7Days: {
    totalViews: number;
    totalClicks: number;
    startDate: string;
    endDate: string;
  };
  last30Days: {
    totalViews: number;
    totalClicks: number;
    startDate: string;
    endDate: string;
  };
  
  // Metadata
  lastUpdated: Timestamp;
  lastAggregatedDate: string;  // YYYY-MM-DD
}
```

### 4. Cloud Functions
```
functions/
├── src/
│   ├── analytics/
│   │   ├── aggregateDailyAnalytics.ts  # Daily aggregation function
│   │   ├── processTopItems.ts          # Helper for top items processing
│   │   └── cleanupOldData.ts           # Optional data retention function
```

Cloud Functions are responsible for:
- Running scheduled aggregation tasks
- Updating summary documents with latest metrics
- Calculating rolling period statistics
- Managing data retention policies

### 5. Dashboard Components
```
├── src/
│   ├── components/
│   │   ├── templates/
│   │   │   ├── analytics/
│   │   │   │   ├── AnalyticsDashboard.tsx    # Main dashboard container
│   │   │   │   ├── OverallMetrics.tsx        # Summary metrics display
│   │   │   │   ├── TrendCharts.tsx           # Time-series visualizations
│   │   │   │   ├── TopItemsSection.tsx       # Popular items display
│   │   │   │   ├── DeviceBreakdown.tsx       # Device usage charts
│   │   │   │   ├── LocationInsights.tsx      # Geographic data display
│   │   │   │   └── DateRangePicker.tsx       # Date range selection
```

Dashboard Components are responsible for:
- Fetching and displaying analytics data
- Providing interactive visualizations
- Enabling date range filtering
- Formatting data for presentation

## Integration with Existing Systems

### Google Analytics Integration
The Firebase Analytics system operates in parallel with the existing Google Analytics implementation:

- If a store has configured Google Analytics (GA4):
  - Both tracking systems operate simultaneously
  - The dashboard displays a toggle to switch between data sources
  - GA4 data is fetched via the Google Analytics Data API

- If a store has not configured Google Analytics:
  - Only Firebase Analytics data is collected and displayed
  - The dashboard automatically uses Firebase data without requiring setup

### Authentication & Authorization
- Analytics data access is restricted based on user roles
- Store owners can only view analytics for their own stores
- Tenant admins can view analytics for all stores under their tenant
- Platform admins can view all analytics

## Development Tools

### Local Development
- Firebase Emulator Suite for local testing
- Jest for unit testing
- React Testing Library for component tests
- Cypress for end-to-end testing

### Deployment & CI/CD
- GitHub Actions for automated testing and deployment
- Firebase CLI for Cloud Functions deployment
- Vercel for Next.js application deployment

## Performance Considerations

### Firestore Optimization
- Appropriate indexes for efficient queries
- Batched writes for bulk operations
- Document size monitoring to prevent hitting 1MB limit

### Client-Side Optimization
- Asynchronous tracking to prevent impact on page load
- Debounced event handlers to prevent excessive tracking
- Lazy loading of analytics components

### Cost Optimization
- Daily aggregation to minimize document count
- Scheduled cleanup of old raw data (optional)
- Query optimization to reduce read operations

## Security Considerations

### Data Privacy
- No storage of personally identifiable information (PII)
- IP addresses used only for geolocation, then discarded
- Compliance with GDPR and other privacy regulations

### Access Control
- Firestore Security Rules to restrict access to analytics data
- API route authentication to prevent unauthorized tracking
- Role-based access control for dashboard views

## Monitoring & Logging
- Error logging for tracking failures
- Performance monitoring for API routes
- Usage metrics for Firestore operations
- Alert system for aggregation failures
