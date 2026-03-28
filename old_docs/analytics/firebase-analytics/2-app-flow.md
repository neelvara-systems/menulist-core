# MenuListAI Firebase Analytics - App Flow Documentation

## Overview
This document outlines the flow of analytics data through the MenuListAI application, from event capture to dashboard display. It details how analytics events are tracked, processed, stored, and visualized.

## Analytics Data Flow

### 1. Event Capture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Menu View   │     │ Item Click  │     │ Other User  │
│ Event       │     │ Event       │     │ Interactions│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┴───────────┬──────┘
                   │                   │
         ┌─────────▼─────────┐ ┌──────▼─────────┐
         │ Client-side       │ │ Session ID     │
         │ Event Collection  │ │ Management     │
         └─────────┬─────────┘ └────────────────┘
                   │
         ┌─────────▼─────────┐
         │ API Route         │
         │ /api/analytics    │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │ Server-side       │
         │ Event Processing  │
         └─────────┬─────────┘
                   │
                   ▼
```

### 2. Data Processing & Storage
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────────┐     ┌─────────────┐                │
│  │ Date/Time   │     │ Device Info │                │
│  │ Processing  │     │ Extraction  │                │
│  └──────┬──────┘     └──────┬──────┘                │
│         │                   │                       │
│         └───────────┬───────┘                       │
│                     │                               │
│           ┌─────────▼─────────┐                     │
│           │ Location Info     │                     │
│           │ (IP → Geo)        │                     │
│           └─────────┬─────────┘                     │
│                     │                               │
│           ┌─────────▼─────────┐                     │
│           │ Daily Document    │                     │
│           │ Aggregation       │                     │
│           └─────────┬─────────┘                     │
│                     │                               │
│                     ▼                               │
│   ┌─────────────────────────────────────┐          │
│   │           Firestore                 │          │
│   │                                     │          │
│   │  /tenants/{tenantId}/              │          │
│   │    stores/{storeId}/               │          │
│   │      dailyAnalytics/{YYYY-MM-DD}   │          │
│   │                                     │          │
│   └─────────────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3. Periodic Aggregation (Cloud Function)
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────────────┐                                │
│  │ Scheduled       │                                │
│  │ Cloud Function  │                                │
│  │ (Daily at 00:05)│                                │
│  └────────┬────────┘                                │
│           │                                         │
│  ┌────────▼────────┐     ┌────────────────┐        │
│  │ Read Previous   │     │ Read Yesterday's│        │
│  │ Summary Document│     │ Daily Document  │        │
│  └────────┬────────┘     └────────┬────────┘        │
│           │                       │                 │
│           └───────────┬───────────┘                 │
│                       │                             │
│             ┌─────────▼─────────┐                   │
│             │ Merge & Calculate │                   │
│             │ Updated Totals    │                   │
│             └─────────┬─────────┘                   │
│                       │                             │
│                       ▼                             │
│   ┌─────────────────────────────────────┐          │
│   │           Firestore                 │          │
│   │                                     │          │
│   │  /tenants/{tenantId}/              │          │
│   │    stores/{storeId}/               │          │
│   │      analyticsOverall/summary      │          │
│   │                                     │          │
│   └─────────────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4. Dashboard Data Access
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────────────┐     ┌────────────────┐        │
│  │ Dashboard       │     │ Date Range     │        │
│  │ Component Load  │     │ Selection      │        │
│  └────────┬────────┘     └────────┬────────┘        │
│           │                       │                 │
│           └───────────┬───────────┘                 │
│                       │                             │
│             ┌─────────▼─────────┐                   │
│             │ Firestore Queries │                   │
│             └─────────┬─────────┘                   │
│                       │                             │
│                       ▼                             │
│   ┌─────────────────────────────────────┐          │
│   │           Firestore                 │          │
│   │                                     │          │
│   │  - Summary document (lifetime)      │          │
│   │  - Daily documents (date range)     │          │
│   │                                     │          │
│   └─────────────────┬───────────────────┘          │
│                     │                              │
│           ┌─────────▼─────────┐                    │
│           │ Data Processing   │                    │
│           │ & Formatting      │                    │
│           └─────────┬─────────┘                    │
│                     │                              │
│           ┌─────────▼─────────┐                    │
│           │ Visualization     │                    │
│           │ Components        │                    │
│           └───────────────────┘                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Detailed Process Flow

### 1. Event Capture Process

#### Menu View Event
1. User navigates to a store's menu page
2. `useEffect` hook in the `ClientMenuRenderer` component fires once on mount
3. Client checks for existing `sessionId` in sessionStorage
   - If none exists, generates a new UUID and stores it
4. Client collects basic information:
   - Event type: `menuView`
   - Store ID from URL or props
   - Tenant ID from context or props
   - Device information from User-Agent
5. Client sends data to `/api/analytics/track` endpoint

#### Item Click Event
1. User clicks on a menu item
2. onClick handler in the menu item component fires
3. Client collects information:
   - Event type: `itemClick`
   - Store ID and Tenant ID
   - Menu item ID and name
   - Session ID (same as used for menu view)
   - Device information
4. Client sends data to `/api/analytics/track` endpoint

### 2. Server-Side Processing

#### API Route Handler
```typescript
// Example: /api/analytics/track.ts
export default async function handler(req, res) {
  try {
    const { 
      eventType, 
      tenantId, 
      storeId, 
      sessionId, 
      menuItemId, 
      menuItemName, 
      deviceInfo 
    } = req.body;
    
    // Validate required fields
    if (!eventType || !tenantId || !storeId || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get date in YYYY-MM-DD format (UTC)
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const hour = now.getUTCHours().toString().padStart(2, '0');
    
    // Get IP and determine location
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket.remoteAddress;
    const locationInfo = await getLocationFromIp(ip);
    
    // Create location key
    const locationKey = locationInfo.country && locationInfo.city
      ? `${locationInfo.country}_${locationInfo.city}`
      : locationInfo.country || 'unknown';
    
    // Create device key
    const deviceKey = deviceInfo.type || 'unknown';
    
    // Prepare update data with increments
    const updateData = {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add appropriate increments based on event type
    if (eventType === 'menuView') {
      updateData.totalViews = admin.firestore.FieldValue.increment(1);
      updateData[`viewsByDevice.${deviceKey}`] = admin.firestore.FieldValue.increment(1);
      updateData[`viewsByLocation.${locationKey}`] = admin.firestore.FieldValue.increment(1);
      updateData[`hourlyViews.${hour}`] = admin.firestore.FieldValue.increment(1);
    } else if (eventType === 'itemClick' && menuItemId) {
      updateData.totalClicks = admin.firestore.FieldValue.increment(1);
      updateData[`clicksByDevice.${deviceKey}`] = admin.firestore.FieldValue.increment(1);
      updateData[`clicksByLocation.${locationKey}`] = admin.firestore.FieldValue.increment(1);
      updateData[`clicksByItem.${menuItemId}`] = admin.firestore.FieldValue.increment(1);
      updateData[`hourlyClicks.${hour}`] = admin.firestore.FieldValue.increment(1);
      
      // Store item name if provided (only once per day)
      if (menuItemName) {
        updateData[`itemNames.${menuItemId}`] = menuItemName;
      }
    }
    
    // Update Firestore document
    const dailyDocRef = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('stores')
      .doc(storeId)
      .collection('dailyAnalytics')
      .doc(dateString);
    
    await dailyDocRef.set(updateData, { merge: true });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 3. Periodic Aggregation Process

#### Cloud Function
```typescript
// Example: Cloud Function for daily aggregation
export const aggregateDailyAnalytics = functions.pubsub
  .schedule('every day 00:05')
  .timeZone('UTC')
  .onRun(async (context) => {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];
    
    // Get all tenants
    const tenantsSnapshot = await admin.firestore()
      .collection('tenants')
      .get();
    
    // Process each tenant
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      
      // Get all stores for this tenant
      const storesSnapshot = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('stores')
        .get();
      
      // Process each store
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;
        
        try {
          // Get yesterday's analytics
          const yesterdayDocRef = admin.firestore()
            .collection('tenants')
            .doc(tenantId)
            .collection('stores')
            .doc(storeId)
            .collection('dailyAnalytics')
            .doc(dateString);
          
          const yesterdayDoc = await yesterdayDocRef.get();
          
          if (!yesterdayDoc.exists) {
            console.log(`No analytics for ${tenantId}/${storeId} on ${dateString}`);
            continue;
          }
          
          const yesterdayData = yesterdayDoc.data();
          
          // Get current summary
          const summaryRef = admin.firestore()
            .collection('tenants')
            .doc(tenantId)
            .collection('stores')
            .doc(storeId)
            .collection('analyticsOverall')
            .doc('summary');
          
          const summaryDoc = await summaryRef.get();
          const summaryExists = summaryDoc.exists;
          const summaryData = summaryExists ? summaryDoc.data() : {};
          
          // Prepare updated summary
          const newSummary = {
            lifetimeTotalViews: admin.firestore.FieldValue.increment(yesterdayData.totalViews || 0),
            lifetimeTotalClicks: admin.firestore.FieldValue.increment(yesterdayData.totalClicks || 0),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            lastAggregatedDate: dateString
          };
          
          // Process top items
          if (yesterdayData.clicksByItem) {
            // Complex logic to merge and limit top items
            // (Simplified for this example)
            const topItems = processTopItems(
              summaryData.topItems || [],
              yesterdayData.clicksByItem,
              yesterdayData.itemNames || {}
            );
            
            newSummary.topItems = topItems;
          }
          
          // Update summary document
          await summaryRef.set(newSummary, { merge: true });
          
          console.log(`Updated summary for ${tenantId}/${storeId}`);
        } catch (error) {
          console.error(`Error processing ${tenantId}/${storeId}:`, error);
        }
      }
    }
    
    return null;
  });

// Helper function to process top items
function processTopItems(existingTopItems, newClicksByItem, newItemNames) {
  // Merge existing and new items
  const mergedItems = [...existingTopItems];
  
  // Process new clicks
  Object.entries(newClicksByItem).forEach(([itemId, clicks]) => {
    const existingIndex = mergedItems.findIndex(item => item.menuItemId === itemId);
    
    if (existingIndex >= 0) {
      // Update existing item
      mergedItems[existingIndex].totalClicks += clicks;
      mergedItems[existingIndex].lastClicked = new Date().toISOString();
    } else {
      // Add new item
      mergedItems.push({
        menuItemId: itemId,
        name: newItemNames[itemId] || itemId,
        totalClicks: clicks,
        lastClicked: new Date().toISOString()
      });
    }
  });
  
  // Sort by clicks descending and limit to top 50
  return mergedItems
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 50);
}
```

### 4. Dashboard Data Access Process

#### Dashboard Component
```typescript
// Example: Analytics Dashboard Component
const AnalyticsDashboard = ({ tenantId, storeId }) => {
  const [dateRange, setDateRange] = useState({ start: '2025-03-01', end: '2025-04-06' });
  const [summaryData, setSummaryData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
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
        
        if (summaryDoc.exists) {
          setSummaryData(summaryDoc.data());
        }
        
        // Fetch daily data for selected range
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
        
        const dailyDataArray = dailyDocs.docs.map(doc => ({
          date: doc.id,
          ...doc.data()
        }));
        
        setDailyData(dailyDataArray);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tenantId, storeId, dateRange]);
  
  // Render dashboard with data
  return (
    <div className="analytics-dashboard">
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <OverallMetrics 
            summaryData={summaryData} 
            dailyData={dailyData} 
          />
          
          <TrendCharts 
            dailyData={dailyData} 
          />
          
          <TopItemsSection 
            topItems={summaryData?.topItems || []} 
            dailyData={dailyData} 
          />
          
          <DeviceBreakdown 
            dailyData={dailyData} 
          />
          
          <LocationInsights 
            dailyData={dailyData} 
          />
        </>
      )}
    </div>
  );
};
```

## Integration Points

### 1. Client Website Integration
- Add tracking to `ClientMenuRenderer` component
- Add tracking to menu item click handlers
- Ensure session management is consistent

### 2. Dashboard Integration
- Create new analytics tab in store settings
- Implement visualization components
- Add date range selection

### 3. Firebase Integration
- Set up Firestore collections and security rules
- Deploy Cloud Functions for aggregation
- Configure proper indexes for queries

## Error Handling & Recovery

### Client-Side Errors
- Failed tracking requests should be logged but not block user experience
- Implement retry logic for critical events

### Server-Side Errors
- Log all errors with context for debugging
- Implement monitoring for API route failures

### Aggregation Errors
- Cloud Function should handle partial failures gracefully
- Track last successful aggregation date for recovery

## Testing Strategy
- Unit tests for tracking functions
- Integration tests for API routes
- Load testing for high-volume scenarios
- Dashboard component tests
