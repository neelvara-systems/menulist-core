# Menu Item View Tracking Implementation

This document outlines the implementation of menu item view tracking in the MenuListAI menu website.

## Overview

Menu item view tracking provides detailed insights into which menu items customers are viewing, helping you understand customer interests and optimize your menu layout.

## Setup Process

1. **Enable Menu Item Tracking**:
   - Go to Business Settings > Analytics tab
   - Enable the "Track Menu Item Views" switch
   - Make sure Google Analytics and/or Facebook Pixel are configured

## Component Structure

### Location
```
src/components/templates/website/clientWebsite/MenuItemTracking.tsx
```

### Integration
```tsx
import MenuItemTracking from './MenuItemTracking';

function ClientMenuRenderer({ projectData }) {
    const storeDetails = projectData?.storeDetails;
    return (
        <>
            <MenuItemTracking storeDetails={storeDetails} />
            {/* Rest of the application */}
        </>
    );
}
```

## Usage

### Menu Performance Interface
```typescript
interface MenuPerformanceProps {
    propertyId: string;  // GA4 Measurement ID
    dateRange: {
        startDate: string;
        endDate: string;
    };
}

interface MenuItem {
    name: string;      // Item name
    category: string;  // Item category
    views: number;     // View count
    revenue: number;   // Total revenue
    orders: number;    // Order count
}
```

### Data Fetching
```typescript
// Fetch menu item performance data
const fetchData = async () => {
    try {
        const response = await fetchMenuItemStats(propertyId, dateRange);

        const items = response?.rows?.map(row => ({
            name: row.dimensionValues[0].value,
            category: row.dimensionValues[1].value,
            views: parseInt(row.metricValues[0].value),
            revenue: parseFloat(row.metricValues[1].value),
            orders: parseInt(row.metricValues[2].value)
        })) || [];

        // Sort by views (most viewed first)
        return items.sort((a, b) => b.views - a.views);
    } catch (error) {
        console.error('Error fetching menu stats:', error);
        return [];
    }
};
```

## Implementation Examples

### In Menu Item Component
```tsx
const MenuItem = ({ item }) => {
    useEffect(() => {
        // Track view when item is rendered
        trackMenuItem({
            itemId: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            currency: item.currency
        });
    }, [item]);

    return (
        // Menu item UI
    );
};
```

### In Modal or Detailed View
```tsx
const MenuItemDetail = ({ item }) => {
    useEffect(() => {
        // Track detailed view
        trackMenuItem({
            itemId: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            currency: item.currency,
            attributes: {
                view_type: 'detailed'
            }
        });
    }, [item]);

    return (
        // Detailed view UI
    );
};
```

## Analytics Integration

### Google Analytics
- Events appear as "menu_item_view"
- Includes item details as event parameters
- Can be used to create custom reports
- Supports audience segmentation

### Facebook Pixel
- Events appear as "ViewContent"
- Helps with ad targeting
- Supports custom audiences creation
- Enables retargeting campaigns

## Benefits

1. **Menu Optimization**:
   - Identify most viewed items
   - Understand category popularity
   - Optimize item placement
   - Improve menu layout

2. **Customer Insights**:
   - Track browsing patterns
   - Identify interest trends
   - Understand preferences
   - Monitor seasonal changes

3. **Marketing Benefits**:
   - Target ads based on viewed items
   - Create look-alike audiences
   - Optimize promotions
   - Improve email campaigns

## Best Practices

1. **Implementation**:
   - Track views consistently
   - Include all relevant data
   - Use consistent IDs
   - Add meaningful attributes

2. **Data Quality**:
   - Validate tracking setup
   - Monitor event frequency
   - Check data accuracy
   - Update attributes as needed

3. **Analysis**:
   - Review view patterns
   - Compare with orders
   - Look for trends
   - Act on insights

## Troubleshooting

1. **Events Not Tracking**:
   - Verify tracking is enabled
   - Check analytics configuration
   - Inspect browser console
   - Test event triggers

2. **Data Issues**:
   - Validate item data
   - Check currency codes
   - Verify attributes
   - Test tracking calls

## Related Components

- `AnalyticsTab.tsx`: Settings for menu item tracking
- `GoogleAnalytics.tsx`: GA4 integration
- `FacebookPixel.tsx`: FB Pixel integration
- Menu item components where tracking is implemented
