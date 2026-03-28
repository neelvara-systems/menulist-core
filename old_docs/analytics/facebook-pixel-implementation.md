# Facebook Pixel Implementation

This document outlines the implementation of Facebook Pixel in the MenuListAI menu website.

## Overview

Facebook Pixel is a tracking tool that helps you measure the effectiveness of your Facebook advertising by understanding the actions people take on your menu website.

## Setup Process

1. **Get Facebook Pixel ID**:
   - Go to [Facebook Business Manager](https://business.facebook.com/)
   - Navigate to Events Manager
   - Create a new Pixel or use an existing one
   - Copy the Pixel ID

2. **Configure in Dashboard**:
   - Go to Business Settings > Analytics tab
   - Find "Facebook Pixel ID" field
   - Paste your Pixel ID

## Component Structure

### Location
```
src/components/templates/website/clientWebsite/FacebookPixel.tsx
```

### Integration
The component is integrated into the menu website's root component:
```tsx
import FacebookPixel from './FacebookPixel';

function ClientMenuRenderer({ projectData }) {
    const storeDetails = projectData?.storeDetails;
    return (
        <>
            <FacebookPixel storeDetails={storeDetails} />
            {/* Rest of the application */}
        </>
    );
}
```

## Features

1. **Automatic Event Tracking**:
   - PageView events on every page load
   - Supports standard Facebook Pixel events
   - Handles script loading and initialization

2. **E-commerce Event Utilities**:
   ```typescript
   // View menu item
   trackViewContent({
       content_name: 'Burger',
       content_category: 'Main Course',
       content_ids: ['burger-001'],
       value: 12.99,
       currency: 'USD'
   });

   // Add to cart
   trackAddToCart({
       content_name: 'Burger',
       content_ids: ['burger-001'],
       value: 12.99,
       currency: 'USD',
       contents: [{ id: 'burger-001', quantity: 1 }]
   });

   // Start checkout
   trackInitiateCheckout({
       value: 12.99,
       currency: 'USD',
       content_ids: ['burger-001'],
       contents: [{ id: 'burger-001', quantity: 1 }]
   });

   // Purchase completed
   trackPurchase({
       value: 12.99,
       currency: 'USD',
       content_ids: ['burger-001'],
       contents: [{ id: 'burger-001', quantity: 1 }],
       transaction_id: 'ORDER123'
   });
   ```

## Best Practices

1. **Event Naming**:
   - Use standard Facebook events when possible
   - Include all relevant parameters
   - Always include currency for monetary values
   - Use consistent content_ids across events

2. **Performance**:
   - Script loads after page becomes interactive
   - Events are queued if pixel isn't ready
   - Fallback tracking for users with JavaScript disabled

3. **Data Quality**:
   - Validate Pixel ID format
   - Test events in Facebook Event Manager
   - Monitor event delivery in real-time

## Testing

1. Install the Facebook Pixel Helper browser extension
2. Visit your menu website
3. Verify that:
   - Pixel is loading correctly
   - Events are being fired
   - Parameters are correctly formatted

## Troubleshooting

If events aren't tracking:
1. Check if Pixel ID is correctly entered
2. Use Facebook Pixel Helper to debug
3. Verify script loading in browser console
4. Check for any JavaScript errors
5. Validate event parameters

## Related Components

- `AnalyticsTab.tsx`: Business settings component for configuring Pixel ID
- `ClientMenuRenderer`: Root component that integrates the Pixel tracking
