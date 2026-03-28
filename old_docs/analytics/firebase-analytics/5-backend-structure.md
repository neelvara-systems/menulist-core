# MenuListAI Firebase Analytics - Backend Structure

## Overview
This document outlines the server-side implementation of the Firebase Analytics system for MenuListAI. It covers API routes, Firestore data structure, and Cloud Functions for data aggregation.

## API Routes

### Analytics Tracking Endpoint

```typescript
// src/pages/api/analytics/track.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { admin } from '@/lib/firebase/admin';
import { getLocationFromIp } from '@/lib/analytics/geo';
import { parseUserAgent } from '@/lib/analytics/device';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      eventType,
      tenantId,
      storeId,
      sessionId,
      menuItemId,
      menuItemName,
      deviceInfo,
      userAgent
    } = req.body;

    // Validate required fields
    if (!eventType || !tenantId || !storeId || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get current date in YYYY-MM-DD format (UTC)
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

    // Create device key from provided info or parse from user agent
    const deviceKey = deviceInfo?.type || 
                     (userAgent ? parseUserAgent(userAgent).type : 'unknown');

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
    } else {
      return res.status(400).json({ error: 'Invalid event type or missing data' });
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

### Analytics Reports Endpoint

```typescript
// src/pages/api/analytics/reports.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { admin } from '@/lib/firebase/admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenantId, storeId, startDate, endDate } = req.query;

    // Validate required fields
    if (!tenantId || !storeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get summary data
    const summaryDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantId as string)
      .collection('stores')
      .doc(storeId as string)
      .collection('analyticsOverall')
      .doc('summary')
      .get();

    // Get daily data if date range provided
    let dailyData = [];
    if (startDate && endDate) {
      const dailyDocs = await admin.firestore()
        .collection('tenants')
        .doc(tenantId as string)
        .collection('stores')
        .doc(storeId as string)
        .collection('dailyAnalytics')
        .where(admin.firestore.FieldPath.documentId(), '>=', startDate)
        .where(admin.firestore.FieldPath.documentId(), '<=', endDate)
        .orderBy(admin.firestore.FieldPath.documentId())
        .get();

      dailyData = dailyDocs.docs.map(doc => ({
        date: doc.id,
        ...doc.data()
      }));
    }

    res.status(200).json({
      summary: summaryDoc.exists ? summaryDoc.data() : null,
      daily: dailyData
    });
  } catch (error) {
    console.error('Analytics reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Helper Libraries

### Geolocation Utility

```typescript
// src/lib/analytics/geo.ts
import axios from 'axios';

interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Cache for IP lookups to reduce API calls
const geoCache: Record<string, LocationInfo> = {};

export async function getLocationFromIp(ip: string): Promise<LocationInfo> {
  // Skip localhost/internal IPs
  if (!ip || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.')) {
    return { country: 'unknown' };
  }

  // Check cache first
  if (geoCache[ip]) {
    return geoCache[ip];
  }

  try {
    // Using free IP-API service (consider rate limits for production)
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=country,regionName,city,lat,lon`);
    
    if (response.data && response.data.country) {
      const locationInfo: LocationInfo = {
        country: response.data.country,
        region: response.data.regionName,
        city: response.data.city,
        latitude: response.data.lat,
        longitude: response.data.lon
      };
      
      // Cache the result
      geoCache[ip] = locationInfo;
      
      return locationInfo;
    }
    
    return { country: 'unknown' };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return { country: 'unknown' };
  }
}
```

### User Agent Parser

```typescript
// src/lib/analytics/device.ts
import UAParser from 'ua-parser-js';

interface DeviceInfo {
  type: string;
  browser?: string;
  os?: string;
}

export function parseUserAgent(userAgent: string): DeviceInfo {
  if (!userAgent) {
    return { type: 'unknown' };
  }

  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    // Determine device type
    let type = 'desktop';
    if (result.device && result.device.type) {
      if (result.device.type === 'mobile' || result.device.type === 'tablet') {
        type = result.device.type;
      }
    }
    
    return {
      type,
      browser: result.browser.name,
      os: result.os.name
    };
  } catch (error) {
    console.error('Error parsing user agent:', error);
    return { type: 'unknown' };
  }
}
```

## Firestore Data Structure

### Collections and Documents

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

### Daily Analytics Document Schema

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
  lastUpdated: Timestamp;
}
```

### Summary Document Schema

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

## Cloud Functions

### Daily Aggregation Function

```typescript
// functions/src/analytics/aggregateDailyAnalytics.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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
            const topItems = processTopItems(
              summaryData.topItems || [],
              yesterdayData.clicksByItem,
              yesterdayData.itemNames || {}
            );
            
            newSummary.topItems = topItems;
          }
          
          // Update rolling periods (last 7 days, last 30 days)
          // This would require additional queries to calculate accurately
          
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

## Firestore Security Rules

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Base rules
    match /{document=**} {
      allow read, write: if false; // Default deny
    }
    
    // Tenant-level rules
    match /tenants/{tenantId} {
      // Allow tenant admins to read their tenant
      allow read: if isAuthenticated() && (isTenantAdmin(tenantId) || isPlatformAdmin());
      
      // Store-level rules
      match /stores/{storeId} {
        // Allow store owners and tenant admins to read store data
        allow read: if isAuthenticated() && 
          (isStoreOwner(tenantId, storeId) || isTenantAdmin(tenantId) || isPlatformAdmin());
        
        // Analytics rules
        match /dailyAnalytics/{date} {
          // Allow read for store owners and above
          allow read: if isAuthenticated() && 
            (isStoreOwner(tenantId, storeId) || isTenantAdmin(tenantId) || isPlatformAdmin());
          
          // Only allow server to write (via API routes)
          allow write: if false;
        }
        
        match /analyticsOverall/{docId} {
          // Allow read for store owners and above
          allow read: if isAuthenticated() && 
            (isStoreOwner(tenantId, storeId) || isTenantAdmin(tenantId) || isPlatformAdmin());
          
          // Only allow server to write (via Cloud Functions)
          allow write: if false;
        }
      }
    }
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isPlatformAdmin() {
      return request.auth.token.role == 'admin';
    }
    
    function isTenantAdmin(tenantId) {
      return request.auth.token.tenantId == tenantId && request.auth.token.role == 'tenantAdmin';
    }
    
    function isStoreOwner(tenantId, storeId) {
      return request.auth.token.tenantId == tenantId && 
             request.auth.token.storeIds is list && 
             storeId in request.auth.token.storeIds;
    }
  }
}
```

## Performance Considerations

### Firestore Optimization
- Create appropriate indexes for queries
- Use atomic operations for counters
- Monitor document sizes to prevent hitting 1MB limit
- Consider data retention policies for older analytics data

### Cloud Function Optimization
- Use batched writes when updating multiple documents
- Implement error handling and retries for resilience
- Add logging for monitoring and debugging
- Consider regional deployment for reduced latency

## Security Considerations

### API Route Protection
- Validate request origin and parameters
- Implement rate limiting to prevent abuse
- Sanitize and validate all user inputs
- Use secure headers and CORS policies

### Data Privacy
- Do not store raw IP addresses
- Anonymize user data where possible
- Comply with relevant privacy regulations (GDPR, CCPA)
- Implement appropriate data retention policies

## Deployment Checklist
- [ ] Deploy API routes with Next.js application
- [ ] Deploy Cloud Functions to Firebase
- [ ] Create necessary Firestore indexes
- [ ] Set up Firestore security rules
- [ ] Configure monitoring and alerting
- [ ] Test end-to-end flow with sample data
