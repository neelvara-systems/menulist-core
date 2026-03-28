# Enhanced E-commerce Implementation

This document outlines the implementation of Enhanced E-commerce tracking in the MenuListAI menu website.

## Overview

Enhanced E-commerce provides detailed tracking of customer interactions with menu items, including viewing items, adding to cart, and completing orders. This data helps understand customer behavior and optimize your menu and pricing.

## Setup Process

1. **Enable Enhanced E-commerce**:
   - Go to Business Settings > Analytics tab
   - Enable the "Enable Enhanced E-commerce" switch
   - Make sure Google Analytics is properly configured

## Component Structure

### Location
```
src/components/templates/website/clientWebsite/EnhancedEcommerce.tsx
```

### Integration
```tsx
import EnhancedEcommerce from './EnhancedEcommerce';

function ClientMenuRenderer({ projectData }) {
    const storeDetails = projectData?.storeDetails;
    return (
        <>
            <EnhancedEcommerce storeDetails={storeDetails} />
            {/* Rest of the application */}
        </>
    );
}
```

## Features

### 1. Menu Item Performance
```typescript
interface MenuItem {
    name: string;      // Item name
    category: string;  // Item category
    views: number;     // Number of views
    revenue: number;   // Total revenue
    orders: number;    // Number of orders
}

// Fetch menu item performance data
const response = await fetchMenuItemStats(propertyId, dateRange);
const items = response?.rows?.map(row => ({
    name: row.dimensionValues[0].value,
    category: row.dimensionValues[1].value,
    views: parseInt(row.metricValues[0].value),
    revenue: parseFloat(row.metricValues[1].value),
    orders: parseInt(row.metricValues[2].value)
}));
```

### 2. Enhanced Ecommerce Events
```typescript
// These events are automatically tracked by GA4
const events = {
    view_item: 'When a customer views a menu item',
    view_item_list: 'When viewing a category or list',
    add_to_cart: 'When items are added to cart',
    begin_checkout: 'When checkout starts',
    purchase: 'When an order is completed'
};

// Event data is collected automatically
// We fetch and analyze it through the GA4 API
const response = await fetchDateRangeStats(propertyId, dateRange);

// Process metrics like:
// - Item views
// - Cart additions
// - Conversion rates
// - Revenue per item
```

### 3. Cart Tracking
```typescript
// Add to cart
trackAddToCart({
    currency: 'USD',
    value: 12.99,
    items: [{
        item_id: 'burger-001',
        item_name: 'Classic Burger',
        item_category: 'Main Course',
        price: 12.99,
        quantity: 1
    }]
});

// Remove from cart
trackRemoveFromCart({
    currency: 'USD',
    value: 12.99,
    items: [{
        item_id: 'burger-001',
        item_name: 'Classic Burger',
        quantity: 1
    }]
});
```

### 4. Checkout Tracking
```typescript
trackBeginCheckout({
    currency: 'USD',
    value: 25.98,
    items: [/* cart items */]
});
```

### 5. Purchase Tracking
```typescript
trackPurchase({
    transaction_id: 'ORDER123',
    currency: 'USD',
    value: 25.98,
    items: [/* purchased items */]
});
```

## Benefits

1. **Menu Insights**:
   - Most viewed items
   - Items frequently added to cart
   - Abandoned cart items
   - Popular item combinations

2. **Customer Behavior**:
   - Shopping patterns
   - Category preferences
   - Price sensitivity
   - Order values

3. **Business Optimization**:
   - Menu layout optimization
   - Pricing strategy
   - Category performance
   - Promotion effectiveness

## Best Practices

1. **Data Quality**:
   - Use consistent item IDs
   - Include all relevant item details
   - Set correct currency codes
   - Track quantities accurately

2. **Event Implementation**:
   - Track all key customer interactions
   - Include proper value calculations
   - Maintain consistent category names
   - Use meaningful list names

3. **Testing**:
   - Verify events in GA4 DebugView
   - Check data accuracy
   - Test all user flows
   - Monitor real-time reports

## Troubleshooting

1. **Events Not Showing**:
   - Verify Enhanced E-commerce is enabled
   - Check Google Analytics configuration
   - Inspect browser console for errors
   - Use GA4 DebugView

2. **Data Issues**:
   - Verify currency codes
   - Check value calculations
   - Validate item properties
   - Ensure consistent IDs

## Related Components

- `AnalyticsTab.tsx`: Settings for Enhanced E-commerce
- `GoogleAnalytics.tsx`: Base GA4 implementation
- Menu item components where tracking is implemented
